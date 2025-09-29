<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  isDark: Boolean,
  currentWorkspace: Object,
  memberSidebarVisible: Boolean
})

const emit = defineEmits(['toggle-theme', 'toggle-member-sidebar', 'toggle-notification-sidebar'])

// 알림 사이드바 상태
const notificationSidebarVisible = ref(false)
const activeFilter = ref('all')

// 프로필 메뉴 상태
const profileMenuOpen = ref(false)

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
    },
    { 
      id: 6, 
    type: 'personal_achievement', 
    message: '새로운 개인 성과를 달성했습니다!', 
    time: '1일 전', 
      read: true,
    priority: 'low',
    achievement: { title: '일주일 연속 로그인', points: 100 }
  },
  { 
    id: 7, 
    type: 'friend_request', 
    message: '최수진님이 친구 요청을 보냈습니다', 
    time: '3시간 전', 
    read: false,
    priority: 'normal',
    user: { name: '최수진', avatar: '최', status: 'online' }
  },
  { 
    id: 8, 
    type: 'personal_task_assigned', 
    message: '새로운 개인 업무가 할당되었습니다', 
    time: '4시간 전', 
    read: false,
    priority: 'medium',
    task: { 
      title: '포트폴리오 업데이트', 
      priority: 'medium', 
      dueDate: '2024-01-18' 
    }
  },
  { 
    id: 9, 
    type: 'personal_message', 
    message: '새로운 개인 메시지가 도착했습니다', 
    time: '5시간 전', 
    read: true,
    priority: 'normal',
    user: { name: '정민호', avatar: '정', status: 'away' }
  },
  { 
    id: 10, 
    type: 'personal_achievement', 
    message: '새로운 개인 성과를 달성했습니다!', 
    time: '6시간 전', 
    read: true,
    priority: 'low',
    achievement: { title: '첫 프로젝트 완료', points: 200 }
  },
  { 
    id: 11, 
    type: 'personal_task_due_soon', 
    message: '개인 업무 마감이 임박했습니다', 
    time: '7시간 전', 
    read: false,
    priority: 'high',
    task: { 
      title: '자기소개서 작성', 
      priority: 'high', 
      dueDate: '2024-01-16' 
    }
  },
  { 
    id: 12, 
    type: 'friend_request', 
    message: '한지영님이 친구 요청을 보냈습니다', 
    time: '8시간 전', 
    read: true,
    priority: 'normal',
    user: { name: '한지영', avatar: '한', status: 'offline' }
  },
  { 
    id: 13, 
    type: 'personal_message', 
    message: '새로운 개인 메시지가 도착했습니다', 
    time: '9시간 전', 
    read: false,
    priority: 'normal',
    user: { name: '송지훈', avatar: '송', status: 'online' }
  },
  { 
    id: 14, 
    type: 'personal_task_assigned', 
    message: '새로운 개인 업무가 할당되었습니다', 
    time: '10시간 전', 
    read: true,
    priority: 'low',
    task: { 
      title: '독서 목표 설정', 
      priority: 'low', 
      dueDate: '2024-01-25' 
    }
  },
  { 
    id: 15, 
    type: 'personal_achievement', 
    message: '새로운 개인 성과를 달성했습니다!', 
    time: '12시간 전', 
    read: true,
    priority: 'low',
    achievement: { title: '한 달 연속 학습', points: 150 }
  },
  { 
    id: 16, 
    type: 'personal_message', 
    message: '새로운 개인 메시지가 도착했습니다', 
    time: '1일 전', 
    read: true,
    priority: 'normal',
    user: { name: '강민수', avatar: '강', status: 'offline' }
  }
])

// 팀 스페이스용 알림 데이터
const teamNotifications = ref([
  { 
    id: 7, 
    type: 'team_task_assigned', 
    message: '팀 업무가 할당되었습니다', 
    time: '3분 전', 
    read: false,
    priority: 'high',
    task: { 
      title: '팀 프로젝트 기획서 작성', 
      priority: 'high', 
      dueDate: '2024-01-20',
      team: '개발팀'
    }
  },
  { 
    id: 8, 
    type: 'team_meeting_reminder', 
    message: '팀 회의가 30분 후에 시작됩니다', 
    time: '5분 전', 
    read: false,
    priority: 'high',
    meeting: { 
      title: '주간 스프린트 리뷰', 
      time: '14:00',
      team: '개발팀'
    }
  },
  { 
    id: 9, 
    type: 'team_message', 
    message: '팀 채널에 새로운 메시지가 있습니다', 
    time: '15분 전', 
    read: false,
    priority: 'normal',
    channel: { name: '개발팀', type: 'text' },
    user: { name: '김개발', avatar: '김', status: 'online' }
  },
  { 
    id: 10, 
    type: 'team_file_shared', 
    message: '팀 파일이 공유되었습니다', 
    time: '1시간 전', 
    read: false,
    priority: 'normal',
    file: { 
      name: '프로젝트_요구사항.pdf', 
      size: '2.3MB',
      team: '개발팀'
    }
  },
  { 
    id: 11, 
    type: 'team_member_joined', 
    message: '새로운 팀원이 합류했습니다', 
    time: '2시간 전', 
    read: true,
    priority: 'normal',
    user: { name: '이신입', avatar: '이', status: 'online' },
    team: '디자인팀'
  },
  { 
    id: 12, 
    type: 'team_project_update', 
    message: '프로젝트 진행상황이 업데이트되었습니다', 
    time: '3시간 전', 
    read: true,
    priority: 'low',
    project: { 
      name: 'Synco 플랫폼 개발', 
      progress: 75,
      team: '개발팀'
    }
  },
  { 
    id: 13, 
    type: 'team_task_assigned', 
    message: '새로운 팀 업무가 할당되었습니다', 
    time: '4시간 전', 
    read: false,
    priority: 'medium',
    task: { 
      title: 'API 문서 작성', 
      priority: 'medium', 
      dueDate: '2024-01-22',
      team: '개발팀'
    }
  },
  { 
    id: 14, 
    type: 'team_meeting_reminder', 
    message: '팀 회의가 1시간 후에 시작됩니다', 
    time: '5시간 전', 
    read: false,
    priority: 'normal',
    meeting: { 
      title: '디자인 리뷰', 
      time: '15:00',
      team: '디자인팀'
    }
  },
  { 
    id: 15, 
    type: 'team_message', 
    message: '팀 채널에 새로운 메시지가 있습니다', 
    time: '6시간 전', 
    read: true,
    priority: 'normal',
    channel: { name: '마케팅팀', type: 'text' },
    user: { name: '이마케팅', avatar: '이', status: 'online' }
  },
  { 
    id: 16, 
    type: 'team_file_shared', 
    message: '팀 파일이 공유되었습니다', 
    time: '7시간 전', 
    read: false,
    priority: 'normal',
    file: { 
      name: '디자인_가이드라인.pdf', 
      size: '5.2MB',
      team: '디자인팀'
    }
  },
  { 
    id: 17, 
    type: 'team_member_joined', 
    message: '새로운 팀원이 합류했습니다', 
    time: '8시간 전', 
    read: true,
    priority: 'normal',
    user: { name: '김신입', avatar: '김', status: 'online' },
    team: '개발팀'
  },
  { 
    id: 18, 
    type: 'team_task_due_soon', 
    message: '팀 업무 마감이 임박했습니다', 
    time: '9시간 전', 
    read: false,
    priority: 'high',
    task: { 
      title: '데이터베이스 설계', 
      priority: 'high', 
      dueDate: '2024-01-17',
      team: '개발팀'
    }
  },
  { 
    id: 19, 
    type: 'team_project_update', 
    message: '프로젝트 진행상황이 업데이트되었습니다', 
    time: '10시간 전', 
    read: true,
    priority: 'low',
    project: { 
      name: '모바일 앱 개발', 
      progress: 45,
      team: '개발팀'
    }
  },
  { 
    id: 20, 
    type: 'team_meeting_reminder', 
    message: '팀 회의가 내일 오전에 예정되어 있습니다', 
    time: '12시간 전', 
    read: true,
    priority: 'low',
    meeting: { 
      title: '주간 스프린트 계획', 
      time: '09:00',
      team: '개발팀'
    }
  },
  { 
    id: 21, 
    type: 'team_file_shared', 
    message: '팀 파일이 공유되었습니다', 
    time: '1일 전', 
    read: false,
    priority: 'normal',
    file: { 
      name: '사용자_피드백_정리.xlsx', 
      size: '1.8MB',
      team: '마케팅팀'
    }
  },
  { 
    id: 22, 
    type: 'team_message', 
    message: '팀 채널에 새로운 메시지가 있습니다', 
    time: '1일 전', 
    read: true,
    priority: 'normal',
    channel: { name: '일반', type: 'text' },
    user: { name: '박팀장', avatar: '박', status: 'away' }
  }
])

// 현재 워크스페이스에 따른 알림 데이터
const notifications = computed(() => {
  if (props.currentWorkspace?.type === 'team') {
    return teamNotifications.value
  } else {
    return personalNotifications.value
  }
})

// 개인 스페이스용 필터 옵션
const personalFilters = ref([
  { key: 'all', label: '전체', icon: 'mdi-bell', count: 0 },
  { key: 'unread', label: '읽지 않음', icon: 'mdi-bell-ring', count: 0 },
  { key: 'friend_request', label: '친구 요청', icon: 'mdi-account-plus', count: 0 },
  { key: 'personal_task', label: '개인 업무', icon: 'mdi-clipboard-list', count: 0 },
  { key: 'personal_message', label: '개인 메시지', icon: 'mdi-message', count: 0 },
  { key: 'personal_achievement', label: '성과', icon: 'mdi-trophy', count: 0 }
])

// 팀 스페이스용 필터 옵션
const teamFilters = ref([
  { key: 'all', label: '전체', icon: 'mdi-bell', count: 0 },
  { key: 'unread', label: '읽지 않음', icon: 'mdi-bell-ring', count: 0 },
  { key: 'team_task', label: '팀 업무', icon: 'mdi-clipboard-list', count: 0 },
  { key: 'team_meeting', label: '회의', icon: 'mdi-calendar-clock', count: 0 },
  { key: 'team_message', label: '팀 메시지', icon: 'mdi-message', count: 0 },
  { key: 'team_file', label: '파일 공유', icon: 'mdi-file-share', count: 0 },
  { key: 'team_member', label: '팀원', icon: 'mdi-account-group', count: 0 },
  { key: 'team_project', label: '프로젝트', icon: 'mdi-chart-line', count: 0 }
])

// 현재 워크스페이스에 따른 필터 옵션
const notificationFilters = computed(() => {
  if (props.currentWorkspace?.type === 'team') {
    return teamFilters.value
  } else {
    return personalFilters.value
  }
})

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
  } else if (activeFilter.value === 'team_task') {
    filtered = filtered.filter(n => n.type.includes('team_task'))
  } else if (activeFilter.value === 'team_meeting') {
    filtered = filtered.filter(n => n.type.includes('team_meeting'))
  } else if (activeFilter.value === 'team_file') {
    filtered = filtered.filter(n => n.type.includes('team_file'))
  } else if (activeFilter.value === 'team_member') {
    filtered = filtered.filter(n => n.type.includes('team_member'))
  } else if (activeFilter.value === 'team_project') {
    filtered = filtered.filter(n => n.type.includes('team_project'))
  } else if (activeFilter.value !== 'all') {
    filtered = filtered.filter(n => n.type === activeFilter.value)
  }
  
  return filtered
})

// 필터별 개수 업데이트
const updateFilterCounts = () => {
  const currentFilters = notificationFilters.value
  const currentNotifications = notifications.value
  
  currentFilters.forEach(filter => {
    if (filter.key === 'unread') {
      filter.count = currentNotifications.filter(n => !n.read).length
    } else if (filter.key === 'all') {
      filter.count = currentNotifications.length
    } else if (filter.key === 'personal_task') {
      filter.count = currentNotifications.filter(n => n.type.includes('personal_task')).length
    } else if (filter.key === 'team_task') {
      filter.count = currentNotifications.filter(n => n.type.includes('team_task')).length
    } else if (filter.key === 'team_meeting') {
      filter.count = currentNotifications.filter(n => n.type.includes('team_meeting')).length
    } else if (filter.key === 'team_file') {
      filter.count = currentNotifications.filter(n => n.type.includes('team_file')).length
    } else if (filter.key === 'team_member') {
      filter.count = currentNotifications.filter(n => n.type.includes('team_member')).length
    } else if (filter.key === 'team_project') {
      filter.count = currentNotifications.filter(n => n.type.includes('team_project')).length
    } else {
      filter.count = currentNotifications.filter(n => n.type === filter.key).length
    }
  })
}

// 초기 필터 개수 업데이트
updateFilterCounts()

// 필터 변경
const setActiveFilter = (filterKey) => {
  activeFilter.value = filterKey
}

// 알림 클릭 처리
const handleNotificationClick = (notification) => {
  if (!notification.read) {
    markAsRead(notification.id)
  }
  // 알림 타입에 따른 추가 처리
  console.log('알림 클릭:', notification)
}

// 알림 읽음 처리
const markAsRead = (notificationId) => {
  const notification = notifications.value.find(n => n.id === notificationId)
  if (notification) {
  notification.read = true
    updateFilterCounts()
  }
}

// 모든 알림 읽음 처리
const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true)
  updateFilterCounts()
}

// 알림 삭제
const deleteNotification = (notificationId) => {
  const index = notifications.value.findIndex(n => n.id === notificationId)
  if (index > -1) {
    notifications.value.splice(index, 1)
    updateFilterCounts()
  }
}

// 모든 알림 보기
const viewAllNotifications = () => {
  console.log('모든 알림 보기')
  notificationMenuOpen.value = false
}

// 알림 아이콘 가져오기
const getNotificationIcon = (type) => {
  const icons = {
    // 개인 스페이스 아이콘
    friend_request: 'mdi-account-plus',
    personal_task_assigned: 'mdi-clipboard-plus',
    personal_task_due_soon: 'mdi-clock-alert',
    personal_message: 'mdi-message',
    personal_achievement: 'mdi-trophy',
    
    // 팀 스페이스 아이콘
    team_task_assigned: 'mdi-clipboard-multiple',
    team_meeting_reminder: 'mdi-calendar-clock',
    team_message: 'mdi-message-text',
    team_file_shared: 'mdi-file-share',
    team_member_joined: 'mdi-account-group-plus',
    team_project_update: 'mdi-chart-line'
  }
  return icons[type] || 'mdi-bell'
}

// 알림 색상 가져오기
const getNotificationColor = (type) => {
  const colors = {
    // 개인 스페이스 색상
    friend_request: 'blue',
    personal_task_assigned: 'orange',
    personal_task_due_soon: 'red',
    personal_message: 'green',
    personal_achievement: 'amber',
    
    // 팀 스페이스 색상
    team_task_assigned: 'purple',
    team_meeting_reminder: 'indigo',
    team_message: 'teal',
    team_file_shared: 'cyan',
    team_member_joined: 'lime',
    team_project_update: 'pink'
  }
  return colors[type] || 'primary'
}

// 우선순위 색상 가져오기
const getPriorityColor = (priority) => {
  const colors = {
    high: 'red',
    medium: 'orange',
    normal: 'blue',
    low: 'grey'
  }
  return colors[priority] || 'grey'
}

// 우선순위 텍스트 가져오기
const getPriorityText = (priority) => {
  const texts = {
    high: '높음',
    medium: '보통',
    normal: '일반',
    low: '낮음'
  }
  return texts[priority] || '일반'
}

// 워크스페이스 설정 관련
const workspaceSettingsOpen = ref(false)
const isWorkspaceOwner = ref(true)
const expandedChannels = ref(new Set())

// 팀명
const teamName = ref('Synco 개발팀')

// 팀원 데이터
const teamMembers = ref([
  { id: 1, name: '김팀장', avatar: '김', status: 'online' },
  { id: 2, name: '이개발', avatar: '이', status: 'online' },
  { id: 3, name: '박디자인', avatar: '박', status: 'away' },
  { id: 4, name: '최마케팅', avatar: '최', status: 'offline' },
  { id: 5, name: '정신입', avatar: '정', status: 'online' }
])

// 사이드바 기능 목록
const sidebarFeatures = ref([
  { key: 'dashboard', name: '팀 대시보드', icon: 'mdi-view-dashboard', expanded: false },
  { key: 'chat', name: '팀 채팅', icon: 'mdi-message', expanded: false },
  { key: 'schedule', name: '팀 일정관리', icon: 'mdi-calendar', expanded: false },
  { key: 'drive', name: '팀 드라이브', icon: 'mdi-folder', expanded: false },
  { key: 'meeting', name: '팀 화상회의', icon: 'mdi-video', expanded: false }
])

// 각 기능별 팀원 권한
const memberPermissions = ref({
  dashboard: { 1: 'MANAGER', 2: 'PARTICIPANT', 3: 'PARTICIPANT', 4: 'PARTICIPANT', 5: 'PARTICIPANT' },
  chat: { 1: 'MANAGER', 2: 'MANAGER', 3: 'PARTICIPANT', 4: 'PARTICIPANT', 5: 'PARTICIPANT' },
  schedule: { 1: 'MANAGER', 2: 'PARTICIPANT', 3: 'MANAGER', 4: 'PARTICIPANT', 5: 'PARTICIPANT' },
  drive: { 1: 'MANAGER', 2: 'PARTICIPANT', 3: 'MANAGER', 4: 'PARTICIPANT', 5: 'PARTICIPANT' },
  meeting: { 1: 'MANAGER', 2: 'MANAGER', 3: 'PARTICIPANT', 4: 'PARTICIPANT', 5: 'PARTICIPANT' }
})

// 팀 채널 목록
const teamChannels = ref([
  { id: 1, name: '일반', type: 'text', memberCount: 12, unreadCount: 3 },
  { id: 2, name: '개발팀', type: 'text', memberCount: 8, unreadCount: 0 },
  { id: 3, name: '디자인팀', type: 'text', memberCount: 5, unreadCount: 1 },
  { id: 4, name: '마케팅팀', type: 'text', memberCount: 6, unreadCount: 0 },
  { id: 5, name: '회의실-1', type: 'voice', memberCount: 0, unreadCount: 0 },
  { id: 6, name: '회의실-2', type: 'voice', memberCount: 0, unreadCount: 0 }
])

// 채널 멤버 권한 설정
const channelMemberPermissions = ref({
  sendMessages: true,
  addReactions: true,
  useExternalEmojis: true,
  mentionEveryone: false,
  manageMessages: false
})

// 채널 펼치기/접기
const toggleChannel = (channelId) => {
  if (expandedChannels.value.has(channelId)) {
    expandedChannels.value.delete(channelId)
  } else {
    expandedChannels.value.add(channelId)
  }
}

// 채널이 펼쳐져 있는지 확인
const isChannelExpanded = (channelId) => {
  return expandedChannels.value.has(channelId)
}

// 기능 토글
const toggleFeature = (featureKey) => {
  const feature = sidebarFeatures.value.find(f => f.key === featureKey)
  if (feature) {
    feature.expanded = !feature.expanded
  }
}

// 권한 업데이트
const updatePermission = (featureKey, memberId, newPermission) => {
  memberPermissions.value[featureKey][memberId] = newPermission
}

// 팀명 업데이트
const updateTeamName = () => {
  console.log('팀명 변경:', teamName.value)
}

// 상태 색상 가져오기
const getStatusColor = (status) => {
  const colors = {
    'online': 'green',
    'away': 'orange',
    'offline': 'grey'
  }
  return colors[status] || 'grey'
}

// 워크스페이스 설정 저장
const saveWorkspaceSettings = () => {
  console.log('팀 설정 저장:', {
    teamName: teamName.value,
    permissions: memberPermissions.value
  })
  workspaceSettingsOpen.value = false
}

// 알림 사이드바 토글
const toggleNotificationSidebar = () => {
  notificationSidebarVisible.value = !notificationSidebarVisible.value
  emit('toggle-notification-sidebar', notificationSidebarVisible.value)
}

// 워크스페이스 변경 시 필터 초기화 및 개수 업데이트
const resetFiltersOnWorkspaceChange = () => {
  activeFilter.value = 'all'
  updateFilterCounts()
}

// 워크스페이스 변경 감지
watch(() => props.currentWorkspace, () => {
  resetFiltersOnWorkspaceChange()
}, { deep: true })
</script>

<template>
  <v-app-bar 
    :elevation="0" 
    class="app-header"
    :class="{ 'dark-header': isDark }"
    fixed
  >
    <!-- 왼쪽 영역 -->
    <div class="header-left">
      <!-- 로고/서비스명 -->
      <v-btn 
        variant="text" 
        class="logo-btn"
        @click="$router.push('/')"
      >
        <span class="logo-text">synco</span>
      </v-btn>
    </div>

    <!-- 중앙 영역 -->
    <div class="header-center">
      <!-- 중앙 영역은 비워둠 -->
    </div>

    <!-- 오른쪽 영역 -->
    <div class="header-right">
      <!-- 검색바 (알림 바로 왼쪽) -->
      <div class="search-container">
        <div class="search-input-wrapper">
          <v-icon class="search-icon">mdi-magnify</v-icon>
          <input 
            type="text" 
            placeholder="검색" 
            class="search-input"
          />
        </div>
      </div>

      <!-- 알림 버튼 -->
      <v-btn 
        icon 
        variant="text"
        class="notification-btn"
        :color="notificationSidebarVisible ? 'primary' : ''"
        @click="toggleNotificationSidebar"
      >
        <v-badge 
          :content="notificationCount" 
          :model-value="notificationCount > 0"
          color="error"
        >
          <v-icon>mdi-bell</v-icon>
        </v-badge>
        <v-tooltip activator="parent" location="bottom">알림</v-tooltip>
      </v-btn>

      <!-- 팀 설정 버튼 (팀 워크스페이스일 때만 표시) -->
      <v-btn 
        v-if="currentWorkspace?.type === 'team'"
        icon 
        variant="text"
        @click="workspaceSettingsOpen = true"
        class="team-settings-btn"
      >
        <v-icon>mdi-cog</v-icon>
        <v-tooltip activator="parent" location="bottom">팀 설정</v-tooltip>
      </v-btn>

      <!-- 멤버 목록 토글 (팀 워크스페이스일 때만 표시) -->
      <v-btn 
        v-if="currentWorkspace?.type === 'team'"
        icon 
        variant="text"
        :color="memberSidebarVisible ? 'primary' : ''"
        @click="emit('toggle-member-sidebar')"
      >
        <v-icon>mdi-account-group</v-icon>
        <v-tooltip activator="parent" location="bottom">팀원 목록</v-tooltip>
      </v-btn>

      <!-- 테마 토글 -->
      <v-btn 
        icon 
        variant="text"
        @click="emit('toggle-theme')"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <!-- 프로필 메뉴 -->
      <v-menu 
        v-model="profileMenuOpen"
        location="bottom end"
        offset="8"
      >
        <template v-slot:activator="{ props }">
          <v-btn 
            icon 
            variant="text"
            v-bind="props"
            class="profile-btn"
          >
            <v-avatar size="32" color="primary">
              <span class="text-white font-weight-bold">U</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card class="profile-menu" min-width="200">
          <v-list>
            <v-list-item>
              <v-list-item-title>프로필</v-list-item-title>
              </v-list-item>
            <v-list-item>
              <v-list-item-title>설정</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item>
              <v-list-item-title>로그아웃</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </div>
  </v-app-bar>

  <!-- 팀 설정 다이얼로그 -->
  <v-dialog v-model="workspaceSettingsOpen" max-width="800" scrollable>
    <v-card class="team-settings-dialog">
      <!-- 헤더 -->
      <div class="dialog-header">
        <div class="header-content">
          <div class="header-left">
            <v-icon class="header-icon">mdi-cog</v-icon>
            <h2 class="dialog-title">팀 설정</h2>
        </div>
        <v-btn 
            icon
          variant="text" 
          @click="workspaceSettingsOpen = false"
            class="close-btn"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <v-divider />

      <!-- 팀명 설정 -->
      <div class="team-name-section">
        <div class="section-header">
          <v-icon class="section-icon">mdi-account-group</v-icon>
          <h3 class="section-title">팀 정보</h3>
        </div>
        <v-text-field
          v-model="teamName"
          label="팀명"
          variant="outlined"
          density="comfortable"
          class="team-name-field"
          @blur="updateTeamName"
        />
      </div>

      <v-divider />

      <!-- 기능별 권한 관리 -->
      <div class="permissions-section">
        <div class="section-header">
          <v-icon class="section-icon">mdi-shield-account</v-icon>
          <h3 class="section-title">기능별 권한 관리</h3>
        </div>
        
        <!-- 기능 목록 -->
        <div class="features-list">
          <div 
            v-for="feature in sidebarFeatures" 
            :key="feature.key"
            class="feature-card"
          >
            <!-- 기능 헤더 -->
            <div 
              class="feature-header"
              @click="toggleFeature(feature.key)"
            >
              <div class="feature-info">
                <v-icon class="feature-icon">{{ feature.icon }}</v-icon>
                <span class="feature-name">{{ feature.name }}</span>
              </div>
              <v-icon 
                class="toggle-icon"
                :class="{ 'expanded': feature.expanded }"
              >
                mdi-chevron-down
              </v-icon>
            </div>

            <!-- 팀원 목록 (토글) -->
            <v-expand-transition>
              <div v-if="feature.expanded" class="members-section">
                <div class="members-header">
                  <span class="members-title">팀원 권한</span>
                  <div class="permission-legend">
                    <div class="legend-item manager">
                      <v-icon size="14">mdi-shield</v-icon>
                      <span>MANAGER</span>
                    </div>
                    <div class="legend-item participant">
                      <v-icon size="14">mdi-account</v-icon>
                      <span>PARTICIPANT</span>
                    </div>
                  </div>
                </div>
                
                <div class="members-list">
                  <div 
                    v-for="member in teamMembers" 
                    :key="member.id"
                    class="member-item"
                  >
                    <div class="member-info">
                      <v-avatar size="32" color="primary">
                        <span class="text-white font-weight-bold">{{ member.avatar }}</span>
                      </v-avatar>
                      <div class="member-details">
                        <div class="member-name">{{ member.name }}</div>
                        <div 
                          class="status-dot"
                          :class="getStatusColor(member.status)"
                        ></div>
                      </div>
                    </div>
                    
                    <div class="permission-toggle">
                      <v-btn-toggle
                        :model-value="memberPermissions[feature.key][member.id]"
                        @update:model-value="updatePermission(feature.key, member.id, $event)"
                        mandatory
                        density="compact"
                        class="permission-buttons"
                      >
                        <v-btn value="PARTICIPANT" size="small" class="participant-btn">
                          <v-icon size="14">mdi-account</v-icon>
                          <span>참여</span>
                        </v-btn>
                        <v-btn value="MANAGER" size="small" class="manager-btn">
                          <v-icon size="14">mdi-shield</v-icon>
                          <span>관리</span>
                        </v-btn>
                      </v-btn-toggle>
                    </div>
                  </div>
                </div>
              </div>
            </v-expand-transition>
          </div>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="dialog-actions">
        <v-btn 
          variant="outlined"
          @click="workspaceSettingsOpen = false"
          class="cancel-btn"
        >
          취소
        </v-btn>
        <v-btn 
          color="primary" 
          @click="saveWorkspaceSettings"
          class="save-btn"
        >
          <v-icon left>mdi-content-save</v-icon>
          저장
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- 알림 사이드바 -->
  <v-navigation-drawer
    v-model="notificationSidebarVisible"
    location="right"
    width="400"
    temporary
    class="notification-sidebar"
  >
    <!-- 사이드바 헤더 -->
    <div class="notification-header">
      <div class="header-top">
        <div class="header-title-section">
          <h2 class="header-title">알림</h2>
          <span class="notification-count">{{ notificationCount }}</span>
        </div>
        <div class="header-actions">
          <v-btn 
            variant="outlined"
            size="small" 
            @click="markAllAsRead"
            :disabled="notificationCount === 0"
            class="mark-all-button"
          >
            <v-icon left size="16">mdi-check-all</v-icon>
            모두 읽음
          </v-btn>
          <v-btn 
            icon
            size="small"
            variant="text"
            @click="toggleNotificationSidebar"
            class="close-button"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
      
      <!-- 필터 탭 -->
      <div class="filter-container">
      <div class="filter-tabs">
          <button
          v-for="filter in notificationFilters"
          :key="filter.key"
            :class="['filter-tab', { 'active': activeFilter === filter.key }]"
          @click="setActiveFilter(filter.key)"
        >
            <v-icon size="16">{{ filter.icon }}</v-icon>
            <span>{{ filter.label }}</span>
            <span v-if="filter.count > 0" class="filter-count">{{ filter.count }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 알림 목록 -->
    <div class="notification-list">
      <div 
        v-for="notification in filteredNotifications" 
        :key="notification.id"
        :class="['notification-card', { 'unread': !notification.read }]"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-icon">
          <div :class="['icon-wrapper', getNotificationColor(notification.type)]">
            <v-icon size="18">{{ getNotificationIcon(notification.type) }}</v-icon>
          </div>
        </div>
        
        <div class="notification-body">
          <p class="notification-text">{{ notification.message }}</p>
          <div class="notification-footer">
            <span class="notification-time">{{ notification.time }}</span>
            <div v-if="notification.priority" class="priority-badge">
              {{ getPriorityText(notification.priority) }}
            </div>
          </div>
        </div>
        
        <div class="notification-actions">
          <button
            v-if="!notification.read"
            @click.stop="markAsRead(notification.id)"
            class="action-button mark-read"
            title="읽음 처리"
          >
            <v-icon size="14">mdi-check</v-icon>
          </button>
          <button
            @click.stop="deleteNotification(notification.id)"
            class="action-button delete"
            title="삭제"
          >
            <v-icon size="14">mdi-trash-can-outline</v-icon>
          </button>
        </div>
      </div>

      <!-- 빈 상태 -->
      <div v-if="filteredNotifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <v-icon size="48">mdi-bell-outline</v-icon>
      </div>
        <h3 class="empty-title">알림이 없습니다</h3>
        <p class="empty-description">새로운 알림이 오면 여기에 표시됩니다</p>
    </div>
    </div>

  </v-navigation-drawer>
</template>

<style scoped>
.app-header {
  background: rgba(0, 0, 0, 0.2) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: 60px !important;
}

.dark-header {
  background: rgba(0, 0, 0, 0.4) !important;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 300px;
  justify-content: flex-end;
  padding-right: 16px;
}

.logo-btn {
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary)) !important;
}

.logo-text {
  font-weight: 700;
}

.search-container {
  position: relative;
  width: 300px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.6);
  z-index: 2;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 8px 16px 8px 48px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 20px;
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 1);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* 팀 설정 버튼 */
.team-settings-btn {
  color: rgba(var(--v-theme-on-surface), 0.7) !important;
  transition: all 0.2s ease !important;
}

.team-settings-btn:hover {
  color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.08) !important;
}

/* 팀 설정 다이얼로그 */
.team-settings-dialog {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1) !important;
}

.dialog-header {
  padding: 24px 24px 16px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 24px;
  color: rgb(var(--v-theme-primary));
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.025em;
  color: rgb(var(--v-theme-on-surface));
}

.close-btn {
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
  background: rgba(var(--v-theme-on-surface), 0.08) !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

.close-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.12) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* 섹션 스타일 */
.team-name-section,
.permissions-section {
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.section-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.team-name-field {
  max-width: 400px;
  font-size: 16px;
}

/* 기능 목록 */
.features-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
  transition: all 0.2s ease;
}

.feature-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.08);
}

.feature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feature-header:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

.feature-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 20px;
}

.feature-name {
  font-size: 16px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.toggle-icon {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: transform 0.2s ease;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

/* 팀원 섹션 */
.members-section {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.3);
}

.members-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(var(--v-theme-surface), 0.5);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.members-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.permission-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.legend-item.manager {
  color: #f59e0b;
}

.legend-item.participant {
  color: #3b82f6;
}

.members-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition: all 0.2s ease;
}

.member-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.08);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.green {
  background: #10b981;
}

.status-dot.orange {
  background: #f59e0b;
}

.status-dot.grey {
  background: #6b7280;
}

.permission-toggle {
  display: flex;
  align-items: center;
}

.permission-buttons {
  border-radius: 8px !important;
  overflow: hidden;
}

.participant-btn {
  color: #3b82f6 !important;
  background: #eff6ff !important;
  border: 1px solid #dbeafe !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  min-width: 60px !important;
}

.participant-btn.v-btn--active {
  background: #3b82f6 !important;
  color: white !important;
  border-color: #3b82f6 !important;
}

.manager-btn {
  color: #f59e0b !important;
  background: #fffbeb !important;
  border: 1px solid #fed7aa !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  min-width: 60px !important;
}

.manager-btn.v-btn--active {
  background: #f59e0b !important;
  color: white !important;
  border-color: #f59e0b !important;
}

/* 다이얼로그 액션 */
.dialog-actions {
  padding: 20px 24px;
  background: rgba(var(--v-theme-surface), 0.5);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  text-transform: none !important;
  font-weight: 500 !important;
}

.save-btn {
  text-transform: none !important;
  font-weight: 600 !important;
  color: white !important;
}

/* 반응형 */
@media (max-width: 768px) {
  .team-settings-dialog {
    margin: 16px;
    max-width: calc(100vw - 32px) !important;
  }
  
  .dialog-header {
    padding: 20px 20px 12px;
  }
  
  .team-name-section,
  .permissions-section {
    padding: 20px;
  }
  
  .feature-header {
    padding: 14px 16px;
  }
  
  .members-header {
    padding: 10px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .members-list {
    padding: 12px 16px;
  }
  
  .member-item {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .permission-toggle {
    width: 100%;
    justify-content: center;
  }
  
  .dialog-actions {
    padding: 16px 20px;
    flex-direction: column;
  }
  
  .cancel-btn,
  .save-btn {
    width: 100%;
  }
}

/* 알림 사이드바 스타일 */
.notification-sidebar {
  background: #ffffff !important;
  border-left: 1px solid #e5e7eb !important;
}

/* 헤더 스타일 */
.notification-header {
  padding: 24px 20px 16px;
  background: #ffffff;
  border-bottom: 1px solid #f3f4f6;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  letter-spacing: -0.025em;
}

.notification-count {
  background: #3b82f6;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mark-all-button {
  text-transform: none !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  height: 32px !important;
  padding: 0 12px !important;
}

.close-button {
  color: #6b7280 !important;
  background: #f9fafb !important;
  border-radius: 8px !important;
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  transition: all 0.2s ease !important;
}

.close-button:hover {
  background: #f3f4f6 !important;
  color: #374151 !important;
}

/* 필터 컨테이너 */
.filter-container {
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: 36px;
}

.filter-tab:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.filter-tab.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.filter-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.filter-tab:not(.active) .filter-count {
  background: #dc2626;
  color: white;
}

/* 알림 목록 스타일 */
.notification-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
  margin: 0 12px 8px;
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.notification-card:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.notification-card.unread {
  background: #f0f9ff;
  border-color: #3b82f6;
  border-left: 4px solid #3b82f6;
}

.notification-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}

.icon-wrapper.blue { background: #3b82f6; }
.icon-wrapper.orange { background: #f59e0b; }
.icon-wrapper.red { background: #ef4444; }
.icon-wrapper.green { background: #10b981; }
.icon-wrapper.amber { background: #f59e0b; }
.icon-wrapper.purple { background: #8b5cf6; }
.icon-wrapper.indigo { background: #6366f1; }
.icon-wrapper.teal { background: #14b8a6; }
.icon-wrapper.cyan { background: #06b6d4; }
.icon-wrapper.lime { background: #84cc16; }
.icon-wrapper.pink { background: #ec4899; }

.notification-body {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.notification-text {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  line-height: 1.5;
  margin: 0 0 8px 0;
}

.notification-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notification-time {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.priority-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.priority-badge.high { background: #fef2f2; color: #dc2626; }
.priority-badge.medium { background: #fffbeb; color: #d97706; }
.priority-badge.normal { background: #eff6ff; color: #2563eb; }
.priority-badge.low { background: #f9fafb; color: #6b7280; }

.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transition: all 0.2s ease;
}

.notification-card:hover .notification-actions {
  opacity: 1;
}

.action-button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button.mark-read {
  background: #f0fdf4;
  color: #16a34a;
}

.action-button.mark-read:hover {
  background: #dcfce7;
  color: #15803d;
}

.action-button.delete {
  background: #fef2f2;
  color: #dc2626;
}

.action-button.delete:hover {
  background: #fee2e2;
  color: #b91c1c;
}

/* 빈 상태 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* 푸터 액션 */
.notification-actions-footer {
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
  background: #ffffff;
}

.mark-all-button {
  width: 100% !important;
  text-transform: none !important;
  font-weight: 500 !important;
}

/* 프로필 메뉴 */
.profile-menu {
  border-radius: 12px !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

/* 다크모드 지원 */
.dark-header .notification-sidebar {
  background: #1f2937 !important;
  border-left-color: #374151 !important;
}

.dark-header .notification-header {
  background: #1f2937;
  border-bottom-color: #374151;
}

.dark-header .header-title {
  color: #f9fafb;
}

.dark-header .notification-card {
  background: #374151;
  border-color: #4b5563;
}

.dark-header .notification-card:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.dark-header .notification-card.unread {
  background: #1e3a8a;
  border-color: #3b82f6;
}

.dark-header .notification-text {
  color: #f9fafb;
}

.dark-header .notification-time {
  color: #9ca3af;
}

.dark-header .empty-title {
  color: #f9fafb;
}

.dark-header .empty-description {
  color: #9ca3af;
}

.dark-header .notification-actions-footer {
  background: #1f2937;
  border-top-color: #374151;
}

/* 반응형 */
@media (max-width: 768px) {
  .search-container {
    width: 200px;
  }
  
  .header-right {
    min-width: 250px;
  }
  
  .notification-sidebar {
    width: 100vw !important;
  }
  
  .notification-header {
    padding: 20px 16px 12px;
  }
  
  .header-title {
    font-size: 18px;
  }
  
  .filter-tabs {
    gap: 6px;
  }
  
  .filter-tab {
    font-size: 12px;
    padding: 6px 10px;
    min-height: 32px;
  }
  
  .notification-card {
    margin: 0 8px 6px;
    padding: 14px 16px;
  }
  
  .icon-wrapper {
    width: 32px;
    height: 32px;
  }
  
  .notification-text {
    font-size: 13px;
}

.notification-time {
    font-size: 11px;
  }
  
  .empty-state {
    padding: 40px 16px;
  }
  
  .empty-title {
    font-size: 15px;
  }
  
  .empty-description {
    font-size: 13px;
  }
  
  .notification-actions-footer {
    padding: 12px 16px;
  }
}

@media (max-width: 480px) {
  .search-container {
    width: 150px;
  }
  
  .header-right {
    min-width: 200px;
    gap: 4px;
  }
  
  .notification-card {
    margin: 0 4px 4px;
    padding: 12px 14px;
  }
  
  .icon-wrapper {
    width: 28px;
    height: 28px;
  }
  
  .notification-text {
    font-size: 12px;
    margin-bottom: 6px;
  }
  
  .notification-time {
    font-size: 10px;
  }
  
  .action-button {
    width: 24px;
    height: 24px;
  }
  
  .empty-state {
    padding: 30px 12px;
  }
  
  .empty-title {
    font-size: 14px;
  }
  
  .empty-description {
    font-size: 12px;
  }
}
</style>