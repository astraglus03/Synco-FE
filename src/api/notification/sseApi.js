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

    console.log('[SSE] 🔌 연결 시도 시작')
    console.log('[SSE] 📋 인증 정보:', {
      hasMemberSeq: !!authStore.memberSeq,
      memberSeq: authStore.memberSeq,
      hasAccessToken: !!authStore.accessToken,
      tokenLength: authStore.accessToken?.length || 0
    })

    // 인증 정보 확인
    if (!authStore.memberSeq) {
      console.error('[SSE] ❌ memberSeq가 없습니다!')
      return
    }

    if (!authStore.accessToken) {
      console.error('[SSE] ❌ accessToken이 없습니다!')
      return
    }

    // 이미 연결 중이면 무시
    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.log('[SSE] ✅ 이미 연결되어 있습니다')
      return
    }

    // 기존 연결 정리
    this.cleanup()

    // EventSource 생성
    // 상대 경로 사용으로 프록시/동일 출처 모두 호환
    const url = `http://localhost:8080/workspace-service/alarms/sse/connect`

    console.log('[SSE] 🌐 연결 URL:', url)
    console.log('[SSE] 🔑 헤더:', {
      'X-Member-Seq': authStore.memberSeq,
      'Authorization': `Bearer ${authStore.accessToken.substring(0, 20)}...`
    })
    console.log('[SSE] 🔄 재연결 시도 횟수:', this.reconnectAttempts + 1)

    try {
      console.log('[SSE] 📡 EventSource 객체 생성 중...')
      
      this.eventSource = new EventSourcePolyfill(url, {
        headers: {
          'X-Member-Seq': authStore.memberSeq.toString(),
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        heartbeatTimeout: 600000, // 10분 (백엔드 SseEmitter 타임아웃과 동일)
        withCredentials: true
      })

      console.log('[SSE] ✅ EventSource 객체 생성 완료')
      console.log('[SSE] 📊 초기 readyState:', this.eventSource.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSED)')

      // 연결 성공
      this.eventSource.onopen = () => {
        console.log('[SSE] 🎉 onopen 이벤트 발생!')
        console.log('[SSE] ✅ 연결 성공 (readyState:', this.eventSource.readyState, ')')
        this.reconnectAttempts = 0
        this.isManualDisconnect = false
        this.lastMessageTime = Date.now()
        this.startHealthCheck()
      }

      // 일반 메시지 수신
      this.eventSource.onmessage = (event) => {
        console.log('[SSE] 📨 메시지 수신:', event.data)
        this.lastMessageTime = Date.now()
        
        try {
          const data = JSON.parse(event.data)
          console.log('[SSE] 📦 파싱 완료, 콜백 실행 (콜백 수:', this.messageCallbacks.length, ')')
          this.notifyCallbacks(data)
        } catch (error) {
          console.error('[SSE] ❌ 메시지 파싱 실패:', error)
        }
      }

      // Heartbeat 이벤트 (백엔드 이벤트명이 ping/heartbeat 등 다를 수 있어 모두 수신)
      const onHeartbeat = () => {
        console.log('[SSE] 💓 heartbeat')
        this.lastMessageTime = Date.now()
      }
      this.eventSource.addEventListener('ping', onHeartbeat)
      this.eventSource.addEventListener('heartbeat', onHeartbeat)

      // 백엔드 일반 알림 이벤트 (event: alarm)
      this.eventSource.addEventListener('alarm', (event) => {
        console.log('[SSE] 🔔 alarm 이벤트 수신')
        this.lastMessageTime = Date.now()
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks(data)
        } catch (error) {
          console.error('[SSE] ❌ alarm 파싱 실패:', error)
        }
      })

      // 초기 연결 이벤트 (event: connect)
      this.eventSource.addEventListener('connect', (event) => {
        console.log('[SSE] ✅ connect 이벤트 수신')
        this.lastMessageTime = Date.now()
      })

      // 특정 알림 타입 이벤트 (예: FRIEND_REQUEST)
      this.eventSource.addEventListener('FRIEND_REQUEST', (event) => {
        console.log('[SSE] 👥 친구 요청 알림')
        this.lastMessageTime = Date.now()
        
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks({ type: 'FRIEND_REQUEST', ...data })
        } catch (error) {
          console.error('[SSE] ❌ 친구 요청 파싱 실패:', error)
        }
      })

      // 멤버 상태 변경 이벤트 (event: member-status)
      this.eventSource.addEventListener('member-status', (event) => {
        console.log('[SSE] 👤 member-status 이벤트 수신')
        this.lastMessageTime = Date.now()
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks({ type: 'member-status', ...data })
        } catch (error) {
          console.error('[SSE] ❌ member-status 파싱 실패:', error)
        }
      })

      // 연결 오류
      this.eventSource.onerror = (error) => {
        console.error('[SSE] ❌ onerror 이벤트 발생!')
        console.error('[SSE] 📋 에러 상세:', error)
        console.error('[SSE] 📊 readyState:', this.eventSource?.readyState)
        
        // 연결 닫기
        if (this.eventSource) {
          console.log('[SSE] 🔌 EventSource 닫는 중...')
          this.eventSource.close()
          this.eventSource = null
        }

        // 수동 종료가 아니면 자동 재연결
        if (!this.isManualDisconnect) {
          console.log('[SSE] ⏳ 자동 재연결 예약...')
          this.scheduleReconnect()
        } else {
          console.log('[SSE] 🛑 수동 종료 상태이므로 재연결 안 함')
        }
      }

      console.log('[SSE] 🎯 이벤트 핸들러 등록 완료')
      console.log('[SSE] ⏳ 연결 대기 중... (onopen 이벤트 대기)')

    } catch (error) {
      console.error('[SSE] ❌ EventSource 생성 중 예외 발생!')
      console.error('[SSE] 📋 예외 상세:', error)
      console.error('[SSE] 📋 예외 스택:', error.stack)
      this.scheduleReconnect()
    }
  }

  /**
   * 재연결 스케줄링 (무한 재연결, 최대 30초 간격)
   */
  scheduleReconnect() {
    if (this.isManualDisconnect) {
      console.log('[SSE] 수동 종료 상태, 재연결 안 함')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(2000 * this.reconnectAttempts, 30000) // 2초, 4초, 6초, ... 최대 30초
    
    console.log(`[SSE] 🔄 ${delay / 1000}초 후 재연결 (${this.reconnectAttempts}번째 시도)`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  /**
   * 연결 상태 헬스 체크 시작 (3분마다)
   */
  startHealthCheck() {
    // 기존 헬스 체크 제거
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // 3분마다 연결 상태 확인 (백엔드 heartbeat: 25초 주기)
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastMessage = now - this.lastMessageTime
      const maxIdleTime = 180000 // 3분

      if (timeSinceLastMessage > maxIdleTime) {
        console.warn('[SSE] ⚠️ 3분 동안 메시지 없음, 재연결 시도')
        
        if (this.eventSource) {
          console.log('[SSE] readyState:', this.eventSource.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSED)')
        }

        // 강제 재연결
        this.cleanup()
        this.connect()
      } else {
        console.log('[SSE] ✅ 연결 정상 (마지막 메시지:', Math.floor(timeSinceLastMessage / 1000), '초 전)')
      }
    }, 180000) // 3분
  }

  /**
   * 메시지 콜백 등록
   */
  onMessage(callback) {
    if (typeof callback === 'function') {
      // 중복 방지
      if (!this.messageCallbacks.includes(callback)) {
        this.messageCallbacks.push(callback)
        console.log('[SSE] 📝 콜백 등록, 총:', this.messageCallbacks.length)
      } else {
        console.log('[SSE] ⚠️ 이미 등록된 콜백')
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
      console.log('[SSE] 🗑️ 콜백 제거, 남은 콜백:', this.messageCallbacks.length)
    }
  }

  /**
   * 모든 콜백에 메시지 전달
   */
  notifyCallbacks(data) {
    console.log('[SSE] 🔔 콜백 실행 시작')
    console.log('[SSE] 📤 전달 데이터:', data)
    console.log('[SSE] 📋 등록된 콜백 수:', this.messageCallbacks.length)

    if (this.messageCallbacks.length === 0) {
      console.warn('[SSE] ⚠️ 등록된 콜백이 없습니다!')
      return
    }

    // 콜백 배열 복사본 사용 (반복 중 변경 방지)
    const callbacks = [...this.messageCallbacks]
    
    callbacks.forEach((callback, index) => {
      try {
        console.log(`[SSE] 🎯 콜백 #${index + 1} 실행`)
        callback(data)
        console.log(`[SSE] ✅ 콜백 #${index + 1} 성공`)
      } catch (error) {
        console.error(`[SSE] ❌ 콜백 #${index + 1} 실패:`, error)
      }
    })

    console.log('[SSE] 🎉 모든 콜백 실행 완료')
  }

  /**
   * SSE 연결 종료
   */
  disconnect() {
    console.log('[SSE] 🔌 연결 종료 요청')
    this.isManualDisconnect = true
    this.cleanup()
    console.log('[SSE] ✅ 연결 종료 완료')
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    console.log('[SSE] 🧹 리소스 정리 시작')

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
        this.eventSource.onopen = null
        this.eventSource.onmessage = null
        this.eventSource.onerror = null

        if (this.eventSource.readyState !== EventSource.CLOSED) {
          this.eventSource.close()
        }
      } catch (error) {
        console.error('[SSE] ❌ 정리 중 오류:', error)
      }

      this.eventSource = null
    }

    console.log('[SSE] ✅ 리소스 정리 완료')
  }

  /**
   * 재연결 카운터 초기화
   */
  resetReconnection() {
    console.log('[SSE] 🔄 재연결 카운터 초기화')
    this.reconnectAttempts = 0
    this.isManualDisconnect = false
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.eventSource?.readyState === EventSource.OPEN
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
