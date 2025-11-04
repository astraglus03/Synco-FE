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
        return
      }
    }
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
        heartbeatTimeout: 864000000, // 10일 (백엔드 SseEmitter 타임아웃과 동일)
        withCredentials: true
      })

      // 연결 성공
      this.eventSource.onopen = () => {
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
      const onHeartbeat = (event) => {
        this.lastMessageTime = Date.now()
      }
      this.eventSource.addEventListener('ping', onHeartbeat)
      this.eventSource.addEventListener('heartbeat', onHeartbeat)

      // 백엔드 일반 알림 이벤트 (event: alarm)
      this.eventSource.addEventListener('alarm', (event) => {
        this.lastMessageTime = Date.now()
        try {
          const data = JSON.parse(event.data)
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
        // CLOSED 상태가 아니면 연결 닫기
        if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
          try {
            this.eventSource.close()
          } catch (e) {
            // 닫기 실패 무시
          }
          this.eventSource = null
        }

        // 수동 종료가 아니면 즉시 재연결
        if (!this.isManualDisconnect) {
          this.reconnectAttempts++
          // 기존 재연결 타이머가 있으면 취소
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
          }
          // 즉시 재연결
          this.connect()
        }
      }

    } catch (error) {
      // 수동 종료가 아니면 즉시 재연결
      if (!this.isManualDisconnect) {
        this.reconnectAttempts++
        // 기존 재연결 타이머가 있으면 취소
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        // 약간의 지연 후 재연결 (무한 루프 방지)
        setTimeout(() => {
          this.connect()
        }, 100)
      }
    }
  }

  /**
   * 재연결 스케줄링 (무한 재연결, 최대 30초 간격)
   */
  scheduleReconnect() {
    if (this.isManualDisconnect) {
      return
    }

    // 이미 재연결 예약되어 있으면 무시
    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(2000 * this.reconnectAttempts, 30000) // 2초, 4초, 6초, ... 최대 30초
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  /**
   * 연결 상태 헬스 체크 시작 (5분마다)
   */
  startHealthCheck() {
    // 기존 헬스 체크 제거
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // 5분마다 연결 상태만 확인 (메시지 시간 기반 체크 제거)
    // 백엔드 heartbeat: 25초 주기, 타임아웃: 10일
    // 메시지가 없어도 연결 상태만 확인하여 유지
    this.healthCheckInterval = setInterval(() => {
      // 연결 상태만 확인 (메시지 시간은 체크하지 않음)
      const isConnected = this.eventSource?.readyState === EventSource.OPEN

      if (!isConnected) {
        this.cleanup()
        if (!this.isManualDisconnect) {
          this.connect()
        }
      }
    }, 300000) // 5분마다 체크
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
        }
      } catch (error) {
        // 정리 중 오류 무시
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
    // 연결이 열려있고, 수동 종료가 아니면 연결된 것으로 간주
    // 메시지가 없어도 연결 상태는 유지 (백엔드 타임아웃: 10일)
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
