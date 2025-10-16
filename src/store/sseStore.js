import { defineStore } from 'pinia'
import { useSSE } from '@/composables/useSSE'
import { watch } from 'vue'

export const useSSEStore = defineStore('sse', {
  state: () => ({
    isConnected: false,
    connectionError: null,
    friendStatusUpdates: [] // 친구 상태 변경 이벤트 저장 (최신 상태만)
  }),

  getters: {
    // 연결 상태 확인
    connectionStatus: (state) => ({
      isConnected: state.isConnected,
      hasError: !!state.connectionError,
      errorMessage: state.connectionError
    }),

    // 특정 친구의 최근 상태 변경
    getFriendLastStatusUpdate: (state) => (friendName) => {
      return state.friendStatusUpdates
        .filter(update => update.name === friendName)
        .slice(-1)[0] || null
    }
  },

  actions: {
    // SSE 연결 초기화
    initializeSSE() {
      const { connect, disconnect, isConnected, connectionError } = useSSE()
      
      // 연결 상태 반응형 업데이트
      watch(isConnected, (newValue) => {
        this.isConnected = newValue
      })

      watch(connectionError, (newValue) => {
        this.connectionError = newValue
      })

      // 친구 상태 변경 이벤트 리스너 등록
      this.setupStatusChangeListener()

      // SSE 연결 시작
      connect()

      return { connect, disconnect }
    },

    // 친구 상태 변경 이벤트 리스너 설정
    setupStatusChangeListener() {
      const handleStatusChange = (event) => {
        const statusData = event.detail
        
        // 기존 상태 업데이트에서 같은 친구 찾기
        const existingIndex = this.friendStatusUpdates.findIndex(
          update => update.name === statusData.name
        )
        
        const newUpdate = {
          name: statusData.name,
          previousStatus: statusData.previousStatus,
          newStatus: statusData.newStatus,
          timestamp: statusData.timestamp || new Date().toISOString(),
          id: Date.now() + Math.random() // 고유 ID 생성
        }
        
        if (existingIndex >= 0) {
          // 기존 친구 상태 업데이트
          this.friendStatusUpdates[existingIndex] = newUpdate
        } else {
          this.friendStatusUpdates.push(newUpdate)
        }
      }

      // 전역 이벤트 리스너 등록
      window.addEventListener('friendStatusChange', handleStatusChange)

      // 컴포넌트 언마운트 시 리스너 제거를 위한 참조 저장
      this.statusChangeHandler = handleStatusChange
    },

    // SSE 연결 해제
    disconnectSSE() {
      if (this.statusChangeHandler) {
        window.removeEventListener('friendStatusChange', this.statusChangeHandler)
        this.statusChangeHandler = null
        console.log('🔌 SSE Store 이벤트 리스너 제거됨')
      }
    },

    // 상태 초기화
    resetSSEState() {
      this.isConnected = false
      this.connectionError = null
      this.friendStatusUpdates = []
      console.log('🔄 SSE Store 상태 초기화됨')
    }
  }
})
