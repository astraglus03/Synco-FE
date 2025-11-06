/**
 * SSE (Server-Sent Events) 연결 관리
 * - 백엔드에서 주기적으로 heartbeat (ping) 전송
 * - 로그인할 때만 연결
 * - 연결 실패 시 최대 1회만 자동 재시도 (그 이상은 재시도하지 않음)
 * - 헬스 체크는 5분마다 실행 (연결 상태 확인만, 재연결은 하지 않음)
 * - 500 에러 발생 시 재시도하지 않음
 */
import { EventSourcePolyfill } from 'event-source-polyfill'
import { useAuthStore } from '@/store/authStore'

class SSEConnection {
  constructor() {
    this.eventSource = null
    this.messageCallbacks = []
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 1 // 최대 재시도 횟수: 1회만
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

    // 이미 연결 중이거나 연결 중이면 무시 (재시도 중이 아닐 때만)
    if (this.eventSource) {
      const state = this.eventSource.readyState
      if (state === EventSource.OPEN || state === EventSource.CONNECTING) {
        return
      }
    }
    
    // 재시도 중이면 기존 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
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
        console.log('[SSE] 연결 성공')
        // 연결 성공 시 재시도 카운터 초기화
        this.reconnectAttempts = 0
        this.isManualDisconnect = false
        this.lastMessageTime = Date.now()
        // 헬스 체크 시작 (재연결은 하지 않고 상태만 확인)
        this.startHealthCheck()
        
        // 연결 상태 변화를 콜백에 알림
        this.notifyCallbacks({ type: 'sse-connected' })
      }

      // 연결 오류 - 최대 1회만 재시도
      this.eventSource.onerror = (error) => {
        console.warn('[SSE] 연결 오류 발생:', error)
        
        // 500 에러 등 서버 에러인 경우 재시도하지 않음
        if (error.status === 500) {
          console.error('[SSE] 서버 에러 (500): SSE 연결 실패. 재시도하지 않습니다.')
          this.notifyCallbacks({ type: 'sse-error', error: 'server-error' })
          // CLOSED 상태가 아니면 연결 닫기
          if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
            try {
              this.eventSource.close()
            } catch (e) {
              // 닫기 실패 무시
            }
            this.eventSource = null
          }
          return
        }
        
        // CLOSED 상태가 아니면 연결 닫기
        if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
          try {
            this.eventSource.close()
          } catch (e) {
            // 닫기 실패 무시
          }
          this.eventSource = null
        }

        // 수동 종료가 아니고, 재시도 횟수가 남아있으면 1회만 재시도
        if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.warn(`[SSE] 연결이 끊어졌습니다. 재시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
          
          // 약간의 지연 후 재연결 (1초)
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
          }, 1000)
        } else {
          // 재시도 횟수 초과 또는 수동 종료
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('[SSE] 최대 재시도 횟수에 도달했습니다. 더 이상 재시도하지 않습니다.')
          }
          this.notifyCallbacks({ type: 'sse-error', error: 'connection-failed' })
        }
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

      // 연결 오류는 위에서 이미 정의됨 (중복 제거)

    } catch (error) {
      console.error('[SSE] 연결 시도 중 오류 발생:', error)
      
      // 수동 종료가 아니고, 재시도 횟수가 남아있으면 1회만 재시도
      if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.warn(`[SSE] 연결 초기화 실패. 재시도 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
        
        // 약간의 지연 후 재연결 (1초)
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null
          this.connect()
        }, 1000)
      } else {
        // 재시도 횟수 초과 또는 수동 종료
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn('[SSE] 최대 재시도 횟수에 도달했습니다. 더 이상 재시도하지 않습니다.')
        }
        this.notifyCallbacks({ type: 'sse-error', error: 'connection-failed' })
      }
    }
  }

  /**
   * 재연결 스케줄링 (사용하지 않음 - 자동 재연결 제거)
   * 하트비트 신호를 수신하지 못해도 재연결하지 않도록 변경
   * 로그인할 때만 연결하도록 변경
   */
  scheduleReconnect() {
    console.warn('[SSE] scheduleReconnect는 더 이상 사용하지 않습니다. (자동 재연결 제거)')
    // 자동 재연결 제거: 하트비트 신호를 수신하지 못해도 재연결하지 않음
    // 로그인할 때만 연결하도록 변경
    return
  }

  /**
   * 연결 상태 헬스 체크 시작 (5분마다)
   * 연결 상태만 확인하고 로그를 남김 (재연결은 하지 않음)
   */
  startHealthCheck() {
    // 기존 헬스 체크 제거
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // 5분마다 연결 상태만 확인 (재연결은 하지 않음)
    // 백엔드 heartbeat: 15초 주기, 타임아웃: 10일
    this.healthCheckInterval = setInterval(() => {
      // 연결 상태 확인
      const isConnected = this.eventSource?.readyState === EventSource.OPEN

      if (!isConnected && !this.isManualDisconnect) {
        // 연결이 끊어진 경우 로그만 남기고 재연결하지 않음
        console.warn('[SSE] 헬스 체크: 연결이 끊어졌습니다. (재연결하지 않음, 로그인 시에만 연결)')
        console.warn('[SSE] 연결 상태:', this.getConnectionStatus())
      } else if (isConnected) {
        // 연결 정상 (로그는 필요 시에만 출력)
        // console.log('[SSE] 헬스 체크: 연결 정상')
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

// 브라우저 닫기/새로고침 시 서버에 정상 종료 알림
// sendBeacon을 사용하여 페이지가 닫히기 전에 서버에 알림 (비동기, 신뢰성 보장)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // 연결되어 있을 때만 서버에 알림
    if (sseConnection.isConnected()) {
      const authStore = useAuthStore()
      
      // 페이지가 닫히기 전에 서버에 정상 종료 알림 (fetch with keepalive 사용)
      if (authStore.memberSeq && authStore.accessToken) {
        try {
          const url = `${import.meta.env.VITE_API_URL}/workspace-service/alarms/sse/disconnect`
          
          // fetch with keepalive 옵션 사용 (페이지가 닫힌 후에도 요청 완료 보장)
          fetch(url, {
            method: 'GET',
            headers: {
              'X-Member-Seq': authStore.memberSeq.toString(),
              'Authorization': `Bearer ${authStore.accessToken}`
            },
            credentials: 'include',
            keepalive: true // 페이지가 닫힌 후에도 요청 완료 보장
          }).catch(() => {
            // 에러 무시 (페이지가 닫히는 중이므로)
          })
        } catch (error) {
          // 에러 무시 (페이지가 닫히는 중이므로)
        }
      }
      
      // 클라이언트 측 연결 정리 (서버 알림은 이미 보냄)
      sseConnection.isManualDisconnect = true
    }
  })
}

export default sseConnection
