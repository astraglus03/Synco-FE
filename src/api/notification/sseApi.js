/**
 * SSE (Server-Sent Events) 연결 관리
 * - 백엔드에서 주기적으로 heartbeat (ping) 전송
 * - 무한 재연결 지원
 * - 간단하고 명확한 구조
 */
import { EventSourcePolyfill } from 'event-source-polyfill'
import { useAuthStore } from '@/store/authStore'

class SSEConnection {
  constructor() {
    this.eventSource = null
    this.messageCallbacks = []
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.isManualDisconnect = false
    this.lastMessageTime = Date.now()
    this.healthCheckInterval = null
  }

  /**
   * SSE 연결 시작
   */
  connect() {
    const authStore = useAuthStore()

    // 인증 정보 확인
    if (!authStore.memberSeq) {
      return
    }

    if (!authStore.accessToken) {
      return
    }

    // 이미 연결 중이거나 연결 중이면 무시
    if (this.eventSource) {
      const state = this.eventSource.readyState
      if (state === EventSource.OPEN || state === EventSource.CONNECTING) {
        console.log('[SSE] ⚠️ 이미 연결 중이거나 연결 시도 중:', state === EventSource.OPEN ? 'OPEN' : 'CONNECTING')
        return
      }
    }

    console.log('[SSE] 🔌 연결 시작')
    // 기존 연결 정리
    this.cleanup()

    // EventSource 생성
    // 상대 경로 사용으로 프록시/동일 출처 모두 호환
    const url = `${import.meta.env.VITE_API_URL}/workspace-service/alarms/sse/connect`

    try {
      this.eventSource = new EventSourcePolyfill(url, {
        headers: {
          'X-Member-Seq': authStore.memberSeq.toString(),
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        heartbeatTimeout: 600000, // 10분 (백엔드 SseEmitter 타임아웃과 동일)
        withCredentials: true
      })

      // 연결 성공
      this.eventSource.onopen = () => {
        console.log('[SSE] ✅ 연결 성공')
        this.reconnectAttempts = 0
        this.isManualDisconnect = false
        this.lastMessageTime = Date.now()
        this.startHealthCheck()
        
        // 연결 상태 변화를 콜백에 알림
        this.notifyCallbacks({ type: 'sse-connected' })
      }

      // 일반 메시지 수신
      this.eventSource.onmessage = (event) => {
        this.lastMessageTime = Date.now()
        
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks(data)
        } catch (error) {
          // 파싱 실패 무시
        }
      }

      // Heartbeat 이벤트 (백엔드 이벤트명이 ping/heartbeat 등 다를 수 있어 모두 수신)
      let heartbeatCount = 0
      const onHeartbeat = (event) => {
        this.lastMessageTime = Date.now()
        heartbeatCount++
        // 10번에 한 번만 로그 출력 (너무 많이 찍지 않기 위해)
        if (heartbeatCount % 10 === 0) {
          console.log('[SSE] 💓 Heartbeat:', heartbeatCount + '번 수신')
        }
      }
      this.eventSource.addEventListener('ping', onHeartbeat)
      this.eventSource.addEventListener('heartbeat', onHeartbeat)

      // 백엔드 일반 알림 이벤트 (event: alarm)
      this.eventSource.addEventListener('alarm', (event) => {
        this.lastMessageTime = Date.now()
        try {
          const data = JSON.parse(event.data)
          console.log('[SSE] 📨 알림 수신:', data.alarmType || data.type)
          this.notifyCallbacks(data)
        } catch (error) {
          // 파싱 실패 무시
        }
      })

      // 초기 연결 이벤트 (event: connect)
      this.eventSource.addEventListener('connect', (event) => {
        this.lastMessageTime = Date.now()
      })

      // 특정 알림 타입 이벤트 (예: FRIEND_REQUEST)
      this.eventSource.addEventListener('FRIEND_REQUEST', (event) => {
        this.lastMessageTime = Date.now()
        
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks({ type: 'FRIEND_REQUEST', ...data })
        } catch (error) {
          // 파싱 실패 무시
        }
      })

      // 멤버 상태 변경 이벤트 (event: member-status)
      this.eventSource.addEventListener('member-status', (event) => {
        this.lastMessageTime = Date.now()
        try {
          const data = JSON.parse(event.data)
          const callbackData = { type: 'member-status', ...data }
          this.notifyCallbacks(callbackData)
        } catch (error) {
          // 파싱 실패 무시
        }
      })

      // 연결 오류
      this.eventSource.onerror = (error) => {
        const state = this.eventSource?.readyState
        console.log('[SSE] ❌ 연결 오류, 상태:', state === EventSource.CONNECTING ? 'CONNECTING' : state === EventSource.OPEN ? 'OPEN' : state === EventSource.CLOSED ? 'CLOSED' : 'UNKNOWN', '재연결 시도:', this.reconnectAttempts + 1)
        
        // CLOSED 상태가 아니면 연결 닫기
        if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
          try {
            this.eventSource.close()
          } catch (e) {
            // 닫기 실패 무시
          }
          this.eventSource = null
        }

        // 수동 종료가 아니면 자동 재연결
        if (!this.isManualDisconnect) {
          this.scheduleReconnect()
        } else {
          console.log('[SSE] 수동 종료로 인해 재연결하지 않음')
        }
      }

    } catch (error) {
      console.log('[SSE] ❌ 연결 생성 실패:', error.message)
      this.scheduleReconnect()
    }
  }

  /**
   * 재연결 스케줄링 (무한 재연결, 최대 30초 간격)
   */
  scheduleReconnect() {
    if (this.isManualDisconnect) {
      console.log('[SSE] 수동 종료 상태이므로 재연결하지 않음')
      return
    }

    // 이미 재연결 예약되어 있으면 무시
    if (this.reconnectTimer) {
      console.log('[SSE] 이미 재연결 예약됨')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(2000 * this.reconnectAttempts, 30000) // 2초, 4초, 6초, ... 최대 30초
    
    console.log('[SSE] 🔄 재연결 예약:', delay + 'ms 후')
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      console.log('[SSE] 🔄 재연결 시작')
      this.connect()
    }, delay)
  }

  /**
   * 연결 상태 헬스 체크 시작 (1분마다)
   */
  startHealthCheck() {
    // 기존 헬스 체크 제거
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // 1분마다 연결 상태 확인 (백엔드 heartbeat: 25초 주기, 타임아웃: 10분)
    // 1분 이상 heartbeat가 없으면 연결 끊어진 것으로 간주
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastMessage = now - this.lastMessageTime
      const maxIdleTime = 90000 // 90초 (heartbeat 25초 주기이므로 3-4번 정도는 받아야 함)

      // 연결 상태도 확인
      const isConnected = this.eventSource?.readyState === EventSource.OPEN

      if (!isConnected) {
        console.log('[SSE] ⚠️ 연결 상태가 OPEN이 아님, 재연결 시도')
        this.cleanup()
        if (!this.isManualDisconnect) {
          this.connect()
        }
      } else if (timeSinceLastMessage > maxIdleTime) {
        console.log('[SSE] ⚠️ Heartbeat 타임아웃:', timeSinceLastMessage, 'ms, 재연결 시도')
        // 강제 재연결
        this.cleanup()
        if (!this.isManualDisconnect) {
          this.connect()
        }
      }
    }, 60000) // 1분마다 체크
  }

  /**
   * 메시지 콜백 등록
   */
  onMessage(callback) {
    if (typeof callback === 'function') {
      // 중복 방지
      if (!this.messageCallbacks.includes(callback)) {
        this.messageCallbacks.push(callback)
      }
    }
  }

  /**
   * 메시지 콜백 제거
   */
  offMessage(callback) {
    const index = this.messageCallbacks.indexOf(callback)
    if (index > -1) {
      this.messageCallbacks.splice(index, 1)
    }
  }

  /**
   * 모든 콜백에 메시지 전달
   */
  notifyCallbacks(data) {
    if (this.messageCallbacks.length === 0) {
      return
    }

    // 콜백 배열 복사본 사용 (반복 중 변경 방지)
    const callbacks = [...this.messageCallbacks]
    
    callbacks.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        // 콜백 실행 실패 무시
      }
    })
  }

/**
 * SSE 연결 종료
 */
disconnect() {
  console.log('[SSE] 🔌 연결 종료')
  this.isManualDisconnect = true
  this.cleanup()
}

/**
 * 서버에 SSE 연결 종료 알림 (로그아웃 시 호출)
 */
async disconnectFromServer() {
  const authStore = useAuthStore()
  
  // 인증 정보가 없으면 서버 호출 불필요
  if (!authStore.memberSeq || !authStore.accessToken) {
    return
  }

  try {
    const response = await fetch('/workspace-service/alarms/sse/disconnect', {
      method: 'GET',
      headers: {
        'X-Member-Seq': authStore.memberSeq.toString(),
        'Authorization': `Bearer ${authStore.accessToken}`
      },
      credentials: 'include'
    })
  } catch (error) {
    // 로그아웃 흐름을 방해하지 않도록 에러를 무시
  }
}

  /**
   * 리소스 정리
   */
  cleanup() {
    // 재연결 타이머 제거
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // 헬스 체크 제거
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // EventSource 종료
    if (this.eventSource) {
      try {
        // 모든 이벤트 리스너 제거
        this.eventSource.onopen = null
        this.eventSource.onmessage = null
        this.eventSource.onerror = null
        
        // removeEventListener로 등록된 이벤트들도 제거하려고 시도
        // (하지만 EventSource는 removeEventListener를 지원하지 않을 수 있음)
        
        if (this.eventSource.readyState !== EventSource.CLOSED) {
          this.eventSource.close()
          console.log('[SSE] 연결 종료 완료')
        }
      } catch (error) {
        console.log('[SSE] 정리 중 오류:', error.message)
      }

      this.eventSource = null
    }
  }

  /**
   * 재연결 카운터 초기화
   */
  resetReconnection() {
    this.reconnectAttempts = 0
    this.isManualDisconnect = false
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    const isOpen = this.eventSource?.readyState === EventSource.OPEN
    // 연결이 열려있고, 수동 종료가 아니고, 최근 메시지를 받았으면 연결된 것으로 간주
    if (isOpen && !this.isManualDisconnect) {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime
      // 2분 이상 메시지가 없으면 연결 끊어진 것으로 간주
      if (timeSinceLastMessage > 120000) {
        console.log('[SSE] ⚠️ 오래된 메시지로 연결 끊김으로 간주:', timeSinceLastMessage, 'ms')
        return false
      }
    }
    return isOpen && !this.isManualDisconnect
  }

  /**
   * 연결 상태 문자열
   */
  getConnectionStatus() {
    if (!this.eventSource) return 'disconnected'
    
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING: return 'connecting'
      case EventSource.OPEN: return 'connected'
      case EventSource.CLOSED: return 'closed'
      default: return 'unknown'
    }
  }
}

// 싱글톤 인스턴스
const sseConnection = new SSEConnection()

// 브라우저 닫기/새로고침 시 연결 종료
window.addEventListener('beforeunload', () => {
  sseConnection.disconnect()
})

export default sseConnection
