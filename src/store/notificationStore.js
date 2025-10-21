import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  // 알림 사이드바 상태
  const notificationSidebarVisible = ref(false)
  const activeFilter = ref('all')

  // 개인 스페이스용 알림 데이터
  const personalNotifications = ref([
    { 
      id: 1, 
      type: 'friend_request', 
      message: '김민수가 친구 요청을 보냈습니다', 
      time: '5분 전', 
      read: false,
      priority: 'normal',
      user: { name: '김민수', avatar: '김', status: 'online' }
    },
    { 
      id: 2, 
      type: 'friend_request', 
      message: '이지현님이 친구 요청을 보냈습니다', 
      time: '1시간 전', 
      read: false,
      priority: 'normal',
      user: { name: '이지현', avatar: '이', status: 'away' }
    },
    { 
      id: 3, 
      type: 'personal_task_assigned', 
      message: '새로운 개인 업무가 할당되었습니다', 
      time: '10분 전', 
      read: false,
      priority: 'high',
      task: { 
        title: '개인 프로젝트 기획서 작성', 
        priority: 'high', 
        dueDate: '2024-01-15' 
      }
    },
    { 
      id: 4, 
      type: 'personal_task_due_soon', 
      message: '개인 업무 마감이 임박했습니다', 
      time: '30분 전', 
      read: false,
      priority: 'high',
      task: { 
        title: '개인 학습 계획 수립', 
        priority: 'medium', 
        dueDate: '2024-01-14' 
      }
    },
    { 
      id: 5, 
      type: 'personal_message', 
      message: '새로운 개인 메시지가 도착했습니다', 
      time: '2시간 전', 
      read: true,
      priority: 'normal',
      user: { name: '박준영', avatar: '박', status: 'offline' }
    }
  ])

  // 프로젝트 스페이스용 알림 데이터
  const projectNotifications = ref([
    { 
      id: 7, 
      type: 'project_task_assigned', 
      message: '프로젝트 업무가 할당되었습니다', 
      time: '3분 전', 
      read: false,
      priority: 'high',
      task: { 
        title: '팀 프로젝트 기획서 작성', 
        priority: 'high', 
        dueDate: '2024-01-20',
        project: '개발 프로젝트'
      }
    },
    { 
      id: 8, 
      type: 'project_meeting_reminder', 
      message: '프로젝트 회의가 30분 후에 시작됩니다', 
      time: '5분 전', 
      read: false,
      priority: 'high',
      meeting: { 
        title: '주간 스프린트 리뷰', 
        time: '14:00',
        project: '개발 프로젝트'
      }
    },
    { 
      id: 9, 
      type: 'project_message', 
      message: '프로젝트 채널에 새로운 메시지가 있습니다', 
      time: '15분 전', 
      read: false,
      priority: 'normal',
      channel: { name: '개발팀', type: 'text' },
      user: { name: '김개발', avatar: '김', status: 'online' }
    }
  ])

  // 현재 워크스페이스 타입 (외부에서 주입받을 예정)
  const currentWorkspaceType = ref('personal')

  // 현재 워크스페이스에 따른 알림 데이터
  const notifications = computed(() => {
    if (currentWorkspaceType.value === 'project') {
      return projectNotifications.value
    } else {
      return personalNotifications.value
    }
  })

  // 워크스페이스 타입 설정
  const setWorkspaceType = (type) => {
    currentWorkspaceType.value = type
  }

  // 알림 개수 계산
  const notificationCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  // 필터링된 알림 목록
  const filteredNotifications = computed(() => {
    let filtered = notifications.value
    
    if (activeFilter.value === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (activeFilter.value === 'personal_task') {
      filtered = filtered.filter(n => n.type.includes('personal_task'))
    } else if (activeFilter.value === 'project_task') {
      filtered = filtered.filter(n => n.type.includes('project_task'))
    } else if (activeFilter.value === 'project_meeting') {
      filtered = filtered.filter(n => n.type.includes('project_meeting'))
    } else if (activeFilter.value === 'project_file') {
      filtered = filtered.filter(n => n.type.includes('project_file'))
    } else if (activeFilter.value === 'project_member') {
      filtered = filtered.filter(n => n.type.includes('project_member'))
    } else if (activeFilter.value === 'project_project') {
      filtered = filtered.filter(n => n.type.includes('project_project'))
    } else if (activeFilter.value !== 'all') {
      filtered = filtered.filter(n => n.type === activeFilter.value)
    }
    
    return filtered
  })

  // 필터 변경
  const setActiveFilter = (filterKey) => {
    activeFilter.value = filterKey
  }

  // 알림 읽음 처리
  const markAsRead = (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true)
  }

  // 알림 삭제
  const deleteNotification = (notificationId) => {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  return {
    // State
    notificationSidebarVisible,
    activeFilter,
    personalNotifications,
    projectNotifications,
    currentWorkspaceType,
    
    // Getters
    notifications,
    notificationCount,
    filteredNotifications,
    
    // Actions
    setActiveFilter,
    setWorkspaceType,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }
})
