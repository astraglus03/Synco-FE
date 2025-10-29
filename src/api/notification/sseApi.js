/**
 * SSE (Server-Sent Events) 연결 관리 클래스
 * X-Member-Seq 헤더를 사용하여 인증
 */
import { EventSourcePolyfill } from 'event-source-polyfill'
import { useAuthStore } from '@/store/authStore'

class SSEConnection {
  constructor() {
    this.eventSource = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000 // 3초
    this.messageCallbacks = []
  }

  /**
   * SSE 연결 시작
   */
  connect() {
    const authStore = useAuthStore()
    
    if (!authStore.memberSeq) {
      console.error('[SSE] 연결 실패: memberSeq가 없습니다.')
      return
    }
    
    if (!authStore.accessToken) {
      console.error('[SSE] 연결 실패: accessToken이 없습니다.')
      return
    }

    // 이미 연결되어 있으면 종료
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      console.log('[SSE] 이미 연결되어 있습니다.')
      return
    }

    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
      const url = `${baseUrl}/workspace-service/sse/connect`
      
      console.log('[SSE] 연결 시도:', {
        url,
        memberSeq: authStore.memberSeq,
        hasAccessToken: !!authStore.accessToken
      })

      // EventSourcePolyfill을 사용하여 커스텀 헤더 전송
      // Authorization 헤더와 X-Member-Seq 헤더 모두 전송
      const headers = {
        'X-Member-Seq': authStore.memberSeq.toString()
      }
      
      // accessToken이 있으면 Authorization 헤더 추가
      if (authStore.accessToken) {
        headers['Authorization'] = `Bearer ${authStore.accessToken}`
      }
      
      this.eventSource = new EventSourcePolyfill(url, {
        headers,
        heartbeatTimeout: 120000, // 2분
        withCredentials: true // 쿠키 전송을 위해 true로 설정
      })

      // 연결 성공
      this.eventSource.onopen = () => {
        console.log('[SSE] ✅ 연결 성공')
        this.reconnectAttempts = 0
      }

      // 일반 메시지 수신
      this.eventSource.onmessage = (event) => {
        console.log('[SSE] 📨 메시지 수신:', event.data)
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks(data)
        } catch (error) {
          console.error('[SSE] 메시지 파싱 오류:', error)
        }
      }

      // 친구 초대 알림 이벤트 리스너
      this.eventSource.addEventListener('FRIEND_REQUEST', (event) => {
        console.log('[SSE] 👥 친구 초대 알림 수신:', event.data)
        try {
          const data = JSON.parse(event.data)
          this.notifyCallbacks({
            type: 'FRIEND_REQUEST',
            ...data
          })
        } catch (error) {
          console.error('[SSE] 친구 초대 알림 파싱 오류:', error)
        }
      })

      // 연결 오류
      this.eventSource.onerror = (error) => {
        console.error('[SSE] ❌ 연결 오류:', error)
        
        if (this.eventSource) {
          this.eventSource.close()
        }

        // 자동 재연결
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`[SSE] 🔄 재연결 시도 중... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          setTimeout(() => {
            this.connect()
          }, this.reconnectDelay)
        } else {
          console.error('[SSE] 최대 재연결 시도 횟수 초과')
        }
      }

    } catch (error) {
      console.error('[SSE] 연결 생성 실패:', error)
    }
  }

  /**
   * 메시지 수신 콜백 등록
   */
  onMessage(callback) {
    if (typeof callback === 'function') {
      this.messageCallbacks.push(callback)
    }
  }

  /**
   * 메시지 수신 콜백 제거
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
    this.messageCallbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('[SSE] 콜백 실행 오류:', error)
      }
    })
  }

  /**
   * SSE 연결 종료
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.reconnectAttempts = 0
      console.log('[SSE] 🔌 연결 종료')
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN
  }
}

// 싱글톤 인스턴스
const sseConnection = new SSEConnection()

export default sseConnection

