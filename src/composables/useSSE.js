import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { EventSourcePolyfill } from 'event-source-polyfill'

export function useSSE() {
  const eventSource = ref(null)
  const isConnected = ref(false)
  const connectionError = ref(null)
  const authStore = useAuthStore()

  // SSE 연결
  const connect = async () => {
    if (!authStore.isAuthenticated) {
      console.error('인증되지 않은 사용자입니다.')
      return
    }

    try {
      // 기존 연결이 있다면 해제
      if (eventSource.value) {
        disconnect()
      }

      // EventSource로 SSE 연결
      // Gateway가 Authorization 헤더 검증 후 X-Member-Seq 헤더 추가
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
      const sseUrl = `${baseURL}/workspace-service/api/sse/connect`
      
      // EventSourcePolyfill로 Authorization 헤더 포함하여 연결
      eventSource.value = new EventSourcePolyfill(sseUrl, {
        headers: {
          'Authorization': `Bearer ${authStore.accessToken}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        heartbeatTimeout: 60000
      })

      // 연결 성공 이벤트
      eventSource.value.addEventListener('connect', () => {
        isConnected.value = true
        connectionError.value = null
      })

      // 친구 상태 변경 이벤트
      eventSource.value.addEventListener('STATUS_CHANGE', (event) => {
        try {
          const statusData = JSON.parse(event.data)
          
          // 상태가 실제로 변경된 경우에만 이벤트 발생
          if (statusData.previousStatus !== statusData.currentStatus) {
            window.dispatchEvent(new CustomEvent('friendStatusChange', {
              detail: {
                name: statusData.memberName,
                previousStatus: statusData.previousStatus,
                newStatus: statusData.currentStatus,
                timestamp: statusData.timestamp
              }
            }))
          }
        } catch (error) {
          console.error('상태 변경 데이터 파싱 오류:', error)
        }
      })

      // 연결 오류 이벤트
      eventSource.value.addEventListener('error', (event) => {
        // 타임아웃 오류는 무시 (EventSourcePolyfill이 자동 재연결)
        if (event.error && event.error.message && event.error.message.includes('No activity')) {
          return
        }
        
        connectionError.value = 'SSE 연결에 문제가 발생했습니다.'
        isConnected.value = false
        
        // 인증 오류인 경우 재시도하지 않음
        if (event.target?.readyState === EventSource.CLOSED) {
          return
        }
        
        // 연결 재시도 로직
        setTimeout(() => {
          if (!isConnected.value) {
            connect()
          }
        }, 5000)
      })

      // 연결이 닫힐 때
      eventSource.value.addEventListener('close', () => {
        isConnected.value = false
      })


    } catch (error) {
      connectionError.value = error.message
      isConnected.value = false
    }
  }

  // SSE 연결 해제
  const disconnect = async () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    
    isConnected.value = false
    connectionError.value = null

    // 백엔드에 연결 해제 알림
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
      await fetch(`${baseURL}/workspace-service/api/sse/disconnect`, {
        method: 'POST'
      })
    } catch (error) {
      // 연결 해제 실패는 무시
    }
  }

  // 컴포넌트 언마운트 시 연결 해제
  onUnmounted(() => {
    disconnect()
  })

  return {
    eventSource,
    isConnected,
    connectionError,
    connect,
    disconnect
  }
}
