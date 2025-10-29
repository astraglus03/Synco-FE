import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import sseConnection from '@/api/notification/sseApi'

export const useNotificationStore = defineStore('notification', () => {
  // ===== 상태 =====
  
  // 알림 사이드바 표시 여부
  const notificationSidebarVisible = ref(false)
  
  // 현재 활성화된 필터
  const activeFilter = ref('all')
  
  // 알림 목록
  const notifications = ref([])
  
  // SSE 연결 상태
  const sseConnected = ref(false)
  
  // 현재 워크스페이스 타입 ('personal' | 'project')
  const currentWorkspaceType = ref('personal')

  // ===== Computed =====
  
  // 읽지 않은 알림 개수
  const notificationCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })
  
  // 필터링된 알림 목록
  const filteredNotifications = computed(() => {
    let filtered = notifications.value
    
    if (activeFilter.value === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (activeFilter.value === 'friend_request') {
      filtered = filtered.filter(n => n.type === 'FRIEND_REQUEST')
    } else if (activeFilter.value !== 'all') {
      filtered = filtered.filter(n => n.type === activeFilter.value)
    }
    
    return filtered
  })

  // ===== Actions =====
  
  /**
   * SSE 연결 시작
   */
  const connectSSE = () => {
    if (sseConnected.value) {
      console.log('[알림 Store] SSE가 이미 연결되어 있습니다.')
      return
    }

    console.log('[알림 Store] SSE 연결 시작...')
    
    // 메시지 수신 콜백 등록
    sseConnection.onMessage((data) => {
      console.log('[알림 Store] 📬 알림 수신:', data)
      handleNotification(data)
    })
    
    // SSE 연결
    sseConnection.connect()
    sseConnected.value = true
  }
  
  /**
   * SSE 연결 종료
   */
  const disconnectSSE = () => {
    console.log('[알림 Store] SSE 연결 종료...')
    sseConnection.disconnect()
    sseConnected.value = false
  }
  
  /**
   * 알림 처리
   */
  const handleNotification = (data) => {
    const notification = {
      id: Date.now(), // 임시 ID
      type: data.type || 'UNKNOWN',
      message: data.message || '새로운 알림이 있습니다',
      time: '방금 전',
      read: false,
      priority: data.priority || 'normal',
      data: data
    }
    
    // 친구 초대 알림 처리
    if (data.type === 'FRIEND_REQUEST') {
      notification.message = `${data.senderName || '누군가'}가 친구 요청을 보냈습니다`
      notification.user = {
        name: data.senderName || '알 수 없음',
        avatar: data.senderName?.charAt(0) || '?',
        status: 'online'
      }
    }
    
    // 알림 목록에 추가 (최신순)
    notifications.value.unshift(notification)
    
    console.log('[알림 Store] ✅ 알림 추가됨:', notification)
    
    // 브라우저 알림 표시 (권한이 있는 경우)
    showBrowserNotification(notification)
  }
  
  /**
   * 브라우저 알림 표시
   */
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Synco', {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }
  }
  
  /**
   * 브라우저 알림 권한 요청
   */
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      console.log('[알림 Store] 브라우저 알림 권한:', permission)
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }
  
  /**
   * 워크스페이스 타입 설정
   */
  const setWorkspaceType = (type) => {
    currentWorkspaceType.value = type
    console.log('[알림 Store] 워크스페이스 타입 변경:', type)
  }
  
  /**
   * 필터 변경
   */
  const setActiveFilter = (filterKey) => {
    activeFilter.value = filterKey
  }
  
  /**
   * 알림 읽음 처리
   */
  const markAsRead = (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      console.log('[알림 Store] 알림 읽음 처리:', notificationId)
    }
  }
  
  /**
   * 모든 알림 읽음 처리
   */
  const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true)
    console.log('[알림 Store] 모든 알림 읽음 처리')
  }
  
  /**
   * 알림 삭제
   */
  const deleteNotification = (notificationId) => {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index > -1) {
      notifications.value.splice(index, 1)
      console.log('[알림 Store] 알림 삭제:', notificationId)
    }
  }
  
  /**
   * 모든 알림 삭제
   */
  const clearAllNotifications = () => {
    notifications.value = []
    console.log('[알림 Store] 모든 알림 삭제')
  }

  return {
    // State
    notificationSidebarVisible,
    activeFilter,
    notifications,
    sseConnected,
    currentWorkspaceType,
    
    // Getters
    notificationCount,
    filteredNotifications,
    
    // Actions
    connectSSE,
    disconnectSSE,
    handleNotification,
    requestNotificationPermission,
    setWorkspaceType,
    setActiveFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  }
})
