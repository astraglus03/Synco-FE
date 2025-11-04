<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useWorkspaceMemberStore } from '@/store/workspaceMemberStore'
import { useNotificationStore } from '@/store/notificationStore'
import { Authority } from '@/models/workspace/WorkspaceModels'
import { getWorkspaceMembers, updateWorkspace, delegateSuperAuthority, deleteWorkspace, inviteWorkspaceMembers, kickWorkspaceMember, getFriendList, searchMembers } from '@/api/workspace/workSpaceApi'
import { acceptFriendRequest, rejectFriendRequest } from '@/api/friend/friend'
import * as authApi from '@/api/member/auth'

const props = defineProps({
  isDark: Boolean,
  currentWorkspace: Object,
  memberSidebarVisible: Boolean
})

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const workspaceMemberStore = useWorkspaceMemberStore()
const notificationStore = useNotificationStore()
const router = useRouter()

const emit = defineEmits(['toggle-theme', 'toggle-member-sidebar', 'toggle-notification-sidebar'])

// 알림 스토어에서 알림 데이터 가져오기
const notifications = computed(() => notificationStore.notifications)
const filteredNotifications = computed(() => notificationStore.filteredNotifications)
const notificationCount = computed(() => notificationStore.notificationCount)
const activeFilter = computed({
  get: () => notificationStore.activeFilter,
  set: (value) => notificationStore.setActiveFilter(value)
})
const notificationSidebarVisible = computed({
  get: () => notificationStore.notificationSidebarVisible,
  set: (value) => notificationStore.notificationSidebarVisible = value
})

// 알림 사이드바 열릴 때 body 스크롤 방지
watch(notificationSidebarVisible, (isVisible) => {
  if (isVisible) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// 프로필 메뉴 상태
const profileMenuOpen = ref(false)
// 친구 요청 액션 로딩 상태 (알림별)
const friendActionLoading = ref({})

// 사용자 프로필 정보 (authStore에서 가져옴)
const profileImageUrl = ref('')
const userName = ref('')

// ===== 더미 알림 데이터 제거 (실제 SSE를 통해 수신) =====
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

// 프로젝트 스페이스용 알림 데이터
const projectNotifications = ref([
  { 
    id: 7, 
    type: 'project_task_assigned', 
    message: '팀 업무가 할당되었습니다', 
    time: '3분 전', 
    read: false,
    priority: 'high',
    task: { 
      title: '팀 프로젝트 기획서 작성', 
      priority: 'high', 
      dueDate: '2024-01-20',
      project: '개발팀'
    }
  },
  { 
    id: 8, 
    type: 'project_meeting_reminder', 
    message: '팀 회의가 30분 후에 시작됩니다', 
    time: '5분 전', 
    read: false,
    priority: 'high',
    meeting: { 
      title: '주간 스프린트 리뷰', 
      time: '14:00',
      project: '개발팀'
    }
  },
  { 
    id: 9, 
    type: 'project_message', 
    message: '팀 채널에 새로운 메시지가 있습니다', 
    time: '15분 전', 
    read: false,
    priority: 'normal',
    channel: { name: '개발팀', type: 'text' },
    user: { name: '김개발', avatar: '김', status: 'online' }
  },
  { 
    id: 10, 
    type: 'project_file_shared', 
    message: '팀 파일이 공유되었습니다', 
    time: '1시간 전', 
    read: false,
    priority: 'normal',
    file: { 
      name: '프로젝트_요구사항.pdf', 
      size: '2.3MB',
      project: '개발팀'
    }
  },
  { 
    id: 11, 
    type: 'project_member_joined', 
    message: '새로운 팀원이 합류했습니다', 
    time: '2시간 전', 
    read: true,
    priority: 'normal',
    user: { name: '이신입', avatar: '이', status: 'online' },
    project: '디자인팀'
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
      project: '개발팀'
    }
  },
  { 
    id: 13, 
    type: 'project_task_assigned', 
    message: '새로운 팀 업무가 할당되었습니다', 
    time: '4시간 전', 
    read: false,
    priority: 'medium',
    task: { 
      title: 'API 문서 작성', 
      priority: 'medium', 
      dueDate: '2024-01-22',
      project: '개발팀'
    }
  },
  { 
    id: 14, 
    type: 'project_meeting_reminder', 
    message: '팀 회의가 1시간 후에 시작됩니다', 
    time: '5시간 전', 
    read: false,
    priority: 'normal',
    meeting: { 
      title: '디자인 리뷰', 
      time: '15:00',
      project: '디자인팀'
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
      project: '디자인팀'
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
    project: '개발팀'
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
      project: '개발팀'
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
      project: '개발팀'
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
      project: '개발팀'
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
      project: '마케팅팀'
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

// NotificationStore를 사용하므로 더 이상 필요 없음
// 현재 워크스페이스에 따른 알림 데이터는 상단에서 computed로 정의됨

// 개인 스페이스용 필터 옵션
const personalFilters = ref([
  { key: 'all', label: '전체', icon: 'mdi-bell', alarmType: null },
  { key: 'friend', label: '친구 요청', icon: 'mdi-account-plus', alarmType: 'alarm-friend' },
  { key: 'task', label: '개인 업무', icon: 'mdi-clipboard-list', alarmType: 'alarm-task' },
  { key: 'project', label: '프로젝트', icon: 'mdi-folder-account', alarmType: 'alarm-project' }
])

// 프로젝트 스페이스용 필터 옵션
const projectFilters = ref([
  { key: 'all', label: '모든 알림', icon: 'mdi-bell', alarmType: null }, // 모든 프로젝트 포함
  { key: 'workspace', label: '프로젝트', icon: 'mdi-folder', alarmType: null }, // 현재 프로젝트 전체 알림
  { key: 'task', label: '프로젝트 업무', icon: 'mdi-clipboard-list', alarmType: 'alarm-task' },
  { key: 'meeting', label: '회의', icon: 'mdi-calendar-clock', alarmType: 'alarm-meeting' },
  { key: 'drive', label: '파일 공유', icon: 'mdi-file-upload', alarmType: 'alarm-drive' }
])

// 현재 워크스페이스에 따른 필터 옵션
const notificationFilters = computed(() => {
  if (props.currentWorkspace?.type === 'project') {
    return projectFilters.value
  } else {
    return personalFilters.value
  }
})

// NotificationStore에서 이미 정의되어 있으므로 제거

// 필터 개수는 notificationStore에서 자동으로 계산되므로 별도 함수 불필요

// 필터 변경 (프론트엔드 필터링)
const setActiveFilter = (filterKey) => {
  notificationStore.setActiveFilter(filterKey)
  // console.log('[AppHeader] 필터 변경:', filterKey)
}

// 알림 클릭 처리
const handleNotificationClick = async (notification) => {
  try {
    // 1) 공통: 읽음 처리
    if (!notification.read) {
      await notificationStore.markAsRead(notification.id)
    }

    const data = notification.data || {}
    const type = notification.type

    // 2) 라우팅 분기
    if (type === 'alarm-friend') {
      // 친구 요청은 카드 내 버튼으로 처리. 클릭 시 친구 페이지로 이동만 수행
      router.push('/workspaces/personal/friends')
      return
    }

    if (type === 'alarm-project') {
      // 워크스페이스 초대 → 목록 최신화 후 해당 워크스페이스 대시보드로 이동
      const workSpaceSeq = data.workSpaceSeq || notification.workSpaceSeq
      if (workSpaceSeq) {
        try {
          await workspaceStore.loadMyWorkspaces()
        } catch {}
        await router.push(`/workspaces/${workSpaceSeq}/dashboard`)
      }
      return
    }

    if (type === 'alarm-task') {
      // 업무 등록/댓글 → 팀 일정으로 이동 후 상세 모달 오픈
      const workSpaceSeq = data.workSpaceSeq || data.workspaceSeq || data.projectSeq || notification.workSpaceSeq
      const channelSeq = data.channelSeq || data.scheduleChannelSeq || data.channel?.channelSeq
      const taskSeq = data.taskSeq || data.targetSeq || data.taskId || data.id || data.task?.taskSeq || channelSeq
      console.log('[알림 네비] alarm-task payload:', { workSpaceSeq, taskSeq, channelSeq, raw: data })
      if (workSpaceSeq) {
        // 요구사항: /workspaces/{seq}/schedules/team-schedule 로 이동
        const path = `/workspaces/${workSpaceSeq}/schedules/team-schedule`
        router.push(path).then(() => {
          if (taskSeq) {
            try {
              sessionStorage.setItem('openTaskDetailTaskSeq', String(taskSeq))
            } catch {}
            // 일정 시간 동안 재시도 (뷰 마운트 타이밍 보정)
            let attempts = 0
            const maxAttempts = 10
            const timer = setInterval(() => {
              console.log('[알림 네비] dispatch open-task-detail attempt', attempts + 1, 'taskSeq=', taskSeq)
              attempts++
              window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskSeq } }))
              if (attempts >= maxAttempts) {
                clearInterval(timer)
              }
            }, 150)
          }
        })
      }
      return
    }

    // 워크스페이스 강제 탈퇴(추정): 읽음 처리만
    const isKick = data?.subType === 'KICK' || /강제\s*탈퇴/.test(notification.message || '')
    if (isKick) {
      return
    }
  } catch (e) {
    console.error('[알림 클릭 처리 실패]:', e)
  }
}

// 친구 요청 수락/거절
const handleAcceptFriend = async (notification) => {
  try {
    friendActionLoading.value[notification.id] = true
    const friendSeq = notification.data?.friendSeq || notification.data?.targetSeq
    if (friendSeq) {
      await acceptFriendRequest(friendSeq)
    }
  } catch (e) {
    console.error('친구 요청 수락 실패:', e)
  } finally {
    await notificationStore.markAsRead(notification.id)
    router.push('/workspaces/personal/friends')
    friendActionLoading.value[notification.id] = false
  }
}

const handleRejectFriend = async (notification) => {
  try {
    friendActionLoading.value[notification.id] = true
    const friendSeq = notification.data?.friendSeq || notification.data?.targetSeq
    if (friendSeq) {
      await rejectFriendRequest(friendSeq)
    }
  } catch (e) {
    console.error('친구 요청 거절 실패:', e)
  } finally {
    await notificationStore.markAsRead(notification.id)
    router.push('/workspaces/personal/friends')
    friendActionLoading.value[notification.id] = false
  }
}

// 알림 읽음 처리 (notificationStore로 위임)
const markAsRead = async (notificationId) => {
  // console.log('[AppHeader] 🔄 단건 읽음 처리 호출:', notificationId)
  await notificationStore.markAsRead(notificationId)
  // console.log('[AppHeader] ✅ 단건 읽음 처리 완료')
}

// 모든 알림 읽음 처리 (notificationStore로 위임)
const markAllAsRead = async () => {
  // console.log('[AppHeader] 🔄 전체 읽음 처리 호출')
  await notificationStore.markAllAsRead()
  // console.log('[AppHeader] ✅ 전체 읽음 처리 완료')
}

// 알림 삭제 (notificationStore로 위임)
const deleteNotification = async (notificationId) => {
  // console.log('[AppHeader] 🗑️ 단건 삭제 호출:', notificationId)
  await notificationStore.deleteNotification(notificationId)
  // console.log('[AppHeader] ✅ 단건 삭제 완료')
}

// 전체 알림 삭제 (notificationStore로 위임)
const clearAllNotifications = async () => {
  // console.log('[AppHeader] 🗑️ 전체 삭제 호출')
  await notificationStore.clearAllNotifications()
  // console.log('[AppHeader] ✅ 전체 삭제 완료')
}

// 타입별 알림 삭제 (notificationStore로 위임)
const deleteFilterNotifications = async (alarmType) => {
  // console.log('[AppHeader] 🗑️ 타입별 삭제 호출:', alarmType)
  await notificationStore.deleteFilterNotifications(alarmType)
  // console.log('[AppHeader] ✅ 타입별 삭제 완료')
}

// 모든 알림 보기
const viewAllNotifications = () => {
  console.log('모든 알림 보기')
  notificationMenuOpen.value = false
}

// 알림 아이콘 가져오기
const getNotificationIcon = (type) => {
  const icons = {
    // 신규 알림 타입 (백엔드 기준)
    'alarm-friend': 'mdi-account-plus',
    'alarm-task': 'mdi-clipboard-text',
    'alarm-project': 'mdi-folder-account',
    'alarm-meeting': 'mdi-video',
    'alarm-drive': 'mdi-file-upload',

    // 레거시/더미 타입 호환
    friend_request: 'mdi-account-plus',
    personal_task_assigned: 'mdi-clipboard-plus',
    personal_task_due_soon: 'mdi-clock-alert',
    personal_message: 'mdi-message',
    personal_achievement: 'mdi-trophy',
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
    // 신규 알림 타입 (백엔드 기준)
    'alarm-friend': 'blue',
    'alarm-task': 'orange',
    'alarm-project': 'purple',
    'alarm-meeting': 'indigo',
    'alarm-drive': 'cyan',

    // 레거시/더미 타입 호환
    friend_request: 'blue',
    personal_task_assigned: 'orange',
    personal_task_due_soon: 'red',
    personal_message: 'green',
    personal_achievement: 'amber',
    team_task_assigned: 'purple',
    team_meeting_reminder: 'indigo',
    team_message: 'teal',
    team_file_shared: 'cyan',
    team_member_joined: 'lime',
    team_project_update: 'pink'
  }
  return colors[type] || 'primary'
}

// 알림 타입 텍스트
const getNotificationTypeText = (type) => {
  const map = {
    'alarm-friend': '친구',
    'alarm-task': '업무',
    'alarm-project': '프로젝트',
    'alarm-meeting': '회의',
    'alarm-drive': '파일'
  }
  return map[type] || '알림'
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
const settingsTab = ref('info') // 'info', 'invite', 'permissions'
const isWorkspaceOwner = ref(true)
// 제거: expandedChannels (사용하지 않음)

// 팀명 (실제 워크스페이스 이름 사용)
const teamName = ref('')
const projectStartDate = ref('') // yyyy-MM-dd
const projectEndDate = ref('')   // yyyy-MM-dd

// 썸네일 이미지
const thumbnailImage = ref(null)
const thumbnailPreview = ref('')

// 변경사항 추적
const hasChanges = computed(() => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  if (!currentWorkspace) return false
  
  // 팀명 변경 확인
  const nameChanged = teamName.value !== currentWorkspace.name
  
  // 썸네일 변경 확인
  const thumbnailChanged = thumbnailImage.value !== null
  
  return nameChanged || thumbnailChanged
})

// 워크스페이스 변경 시 팀명 업데이트
watch(() => workspaceStore.currentWorkspaceInfo, (newWorkspace) => {
  if (newWorkspace) {
    teamName.value = newWorkspace.name || '워크스페이스'
    thumbnailPreview.value = newWorkspace.profile || ''
    // 날짜 초기화 (백엔드 LocalDateTime → yyyy-MM-dd)
    const start = newWorkspace.startDate || newWorkspace.projectStartDate
    const end = newWorkspace.endDate || newWorkspace.projectEndDate
    projectStartDate.value = start ? new Date(start).toISOString().split('T')[0] : ''
    projectEndDate.value = end ? new Date(end).toISOString().split('T')[0] : ''
  }
}, { immediate: true })

// 커스텀 토스트 시스템
const showToast = ref(false)
const toastMessage = ref('')
const toastTitle = ref('')
const toastType = ref('success') // success, error, warning

const showCustomToast = (title, message, type = 'success') => {
  toastTitle.value = title
  toastMessage.value = message
  toastType.value = type
  showToast.value = true

  // 5초 후 자동으로 닫기
  setTimeout(() => {
    showToast.value = false
  }, 5000)
}

// 현재 로그인한 사용자 ID (authStore에서 가져옴)
const currentUserId = computed(() => {
  // authStore.memberSeq가 없으면 이름으로 매칭해서 찾기
  if (authStore.memberSeq) {
    return authStore.memberSeq
  }
  
  // 임시 해결책: 이름으로 매칭
  const currentUserMember = teamMembers.value.find(member => member.name === authStore.user?.name)
  return currentUserMember?.memberSeq
})

// 팀원 데이터 (API에서 로드)
const teamMembers = ref([])
const isLoadingMembers = ref(false)

// 정렬된 팀 멤버 목록 (SUPER 최상위, 나머지 알파벳순)
const sortedTeamMembers = computed(() => {
  return [...teamMembers.value].sort((a, b) => {
    // SUPER 권한자를 최상위로
    if (a.authority === Authority.SUPER && b.authority !== Authority.SUPER) {
      return -1
    }
    if (a.authority !== Authority.SUPER && b.authority === Authority.SUPER) {
      return 1
    }
    
    // 나머지는 이름 알파벳순으로 정렬
    return (a.name || '').localeCompare(b.name || '')
  })
})

// 현재 사용자가 SUPER 권한을 가지고 있는지 확인
const isCurrentUserSuper = computed(() => {
  // authStore.memberSeq가 있으면 사용, 없으면 이름으로 매칭
  let memberSeq = authStore.memberSeq
  if (!memberSeq) {
    const currentUserMember = teamMembers.value.find(member => member.name === authStore.user?.name)
    memberSeq = currentUserMember?.memberSeq
  }
  
  const currentUserMember = teamMembers.value.find(member => member.memberSeq == memberSeq)
  return currentUserMember?.authority === Authority.SUPER
})

// 사이드바 기능 목록 (프로젝트만 권한 관리)
const sidebarFeatures = ref([
  { key: 'project', name: '프로젝트', icon: 'mdi-view-dashboard' }
])

// 프로젝트 팀원 권한 (API에서 로드)
const memberPermissions = ref({
  project: {}
})


// 멤버 목록 로드
const loadMembers = async () => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  
  // personal 워크스페이스는 멤버 목록이 없음
  if (!currentWorkspace || currentWorkspace.type === 'personal') {
    teamMembers.value = []
    memberPermissions.value.project = {}
    return
  }

  try {
    isLoadingMembers.value = true
    const members = await getWorkspaceMembers(currentWorkspace.workSpaceSeq)
    
    // 멤버 데이터 매핑 (권한 정보 포함)
    teamMembers.value = members.map(member => ({
      id: member.memberSeq,
      memberSeq: member.memberSeq,
      name: member.name,
      profileImageUrl: member.profileImageUrl,
      avatar: member.avatarText,
      status: member.uiStatus,
      authority: member.authority
    }))
    
    // 권한 데이터 매핑 (API에서 받은 권한 정보 사용)
    const permissions = {}
    members.forEach(member => {
      permissions[member.memberSeq] = member.authority
    })
    
    memberPermissions.value.project = permissions
    
  } catch (error) {
    console.error('멤버 목록 로딩 실패:', error)
    teamMembers.value = []
    memberPermissions.value.project = {}
  } finally {
    isLoadingMembers.value = false
  }
}

// 특정 기능에서 SUPER 권한을 가진 멤버 ID 찾기
const findSuperMember = (featureKey) => {
  const permissions = memberPermissions.value[featureKey]
  for (const memberId in permissions) {
    if (permissions[memberId] === 'SUPER') {
      return parseInt(memberId)
    }
  }
  return null
}

// 권한 업데이트
const updatePermission = async (featureKey, memberId, newPermission) => {
  const currentPermission = memberPermissions.value[featureKey][memberId]
  const currentSuperMemberId = findSuperMember(featureKey)
  
  // 1. SUPER 사용자가 자신의 권한을 변경하려는 경우 막기
  if (memberId === currentUserId.value && currentPermission === 'SUPER') {
    showCustomToast('권한 변경 불가', 'SUPER 권한을 가진 사용자는 자신의 권한을 변경할 수 없습니다.', 'warning')
    return
  }
  
  
  // 3. 프로젝트에서 다른 사용자를 SUPER로 변경하려는 경우 (SUPER 권한 위임)
  if (newPermission === 'SUPER' && currentPermission !== 'SUPER' && featureKey === 'project') {
    const member = teamMembers.value.find(m => m.id === memberId)
    const confirmed = confirm(`해당 사용자에게 SUPER 권한을 위임하시겠습니까?\n\n${member.name}님에게 SUPER 권한을 위임하면 귀하의 권한은 참여자로 변경됩니다.`)
    
    if (!confirmed) {
      return
    }
    
    try {
      console.log('권한 위임 요청:', {
        delegateMemberSeq: member.memberSeq,
        workSpaceSeq: props.currentWorkspace.workSpaceSeq,
        member: member
      })
      
      // Super 권한 위임 API 호출
      await delegateSuperAuthority(member.memberSeq, props.currentWorkspace.workSpaceSeq)
      
      // 권한 위임 후 즉시 모달 닫기
      workspaceSettingsOpen.value = false
      
      // 워크스페이스 대시보드 새로고침
      await workspaceStore.loadMyWorkspaces()
      await loadMembers()
      
      // 모달 닫힌 후 토스트 표시
      setTimeout(() => {
        showCustomToast('권한 위임 완료', '프로젝트 SUPER 권한이 위임되었습니다.', 'success')
      }, 100)
    } catch (error) {
      console.error('권한 위임 실패:', error)
      showCustomToast('권한 위임 실패', '권한 위임에 실패했습니다.', 'error')
    }
  } else {
    // 일반 권한 변경 (PARTICIPANT ↔ MANAGER)
    memberPermissions.value[featureKey][memberId] = newPermission
  }
}

// 멤버 강제 탈퇴
const handleKickMember = async (member) => {
  const confirmed = confirm(`${member.name}님을 워크스페이스에서 강제 탈퇴시키시겠습니까?\n\n이 작업은 취소할 수 없습니다.`)
  
  if (!confirmed) {
    return
  }
  
  try {
    const currentWorkspace = workspaceStore.currentWorkspaceInfo
    
    await kickWorkspaceMember(currentWorkspace.workSpaceSeq, member.memberSeq)
    
    // 멤버 목록 새로고침
    await loadMembers()
    
    // 워크스페이스 정보 최신화 (멤버 수 업데이트)
    await workspaceStore.loadMyWorkspaces()
    
    // 워크스페이스 멤버 스토어도 최신화
    console.log('🔄 워크스페이스 멤버 스토어 업데이트 시작 (강제탈퇴):', currentWorkspace.workSpaceSeq)
    if (workspaceMemberStore && workspaceMemberStore.loadWorkspaceMembers) {
      await workspaceMemberStore.loadWorkspaceMembers(currentWorkspace.workSpaceSeq)
    }
    
    showCustomToast('강제 탈퇴 완료', `${member.name}님이 워크스페이스에서 탈퇴되었습니다.`, 'success')
  } catch (error) {
    console.error('멤버 강제 탈퇴 실패:', error)
    showCustomToast('강제 탈퇴 실패', '멤버 강제 탈퇴에 실패했습니다.', 'error')
  }
}


// 워크스페이스 변경 감지
watch(() => workspaceStore.currentWorkspace, () => {
  loadMembers()
})

// props.currentWorkspace 변경 감지
watch(() => props.currentWorkspace, () => {
  loadMembers()
}, { immediate: true })


// 워크스페이스 설정 모달 열릴 때 멤버 목록 로드
watch(() => workspaceSettingsOpen.value, (newValue) => {
  if (newValue) {
    loadMembers()
    // 멤버 초대 탭을 위한 친구 목록 로드
    loadInviteFriends()
  } else {
    // 다이얼로그가 닫힐 때 초대 목록 초기화
    invitedMembers.value = []
    inviteSearchQuery.value = ''
    inviteSearchResults.value = []
  }
})

// 새로고침 시 모달창 닫기 함수
const handleBeforeUnload = () => {
  workspaceSettingsOpen.value = false
}

// 창 크기 변경 시 알림 사이드바 강제 닫기 (해상도와 무관하게 항상 닫힘 보장)
const handleWindowResize = () => {
  notificationSidebarVisible.value = false
}

// 초기 로드
onMounted(async () => {
  // 워크스페이스 목록 로드
  await workspaceStore.loadMyWorkspaces()
  // 멤버 목록 로드
  loadMembers()
  
  // 새로고침 시 모달창 닫기
  window.addEventListener('beforeunload', handleBeforeUnload)

  // 해상도 변경 시 알림 사이드바 항상 닫기
  window.addEventListener('resize', handleWindowResize)
})

// 컴포넌트 언마운트 시 이벤트 리스너 정리
onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('resize', handleWindowResize)
})

// 썸네일 이미지 선택
const handleThumbnailChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    thumbnailImage.value = file
    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      thumbnailPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 워크스페이스 업데이트
const updateWorkspaceInfo = async () => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  if (!currentWorkspace || currentWorkspace.type !== 'project') {
    return
  }

  try {
    // 썸네일 이미지를 변경하지 않았으면 null 대신 undefined 전달
    const thumbnailToSend = thumbnailImage.value instanceof File ? thumbnailImage.value : undefined
    // LocalDateTime 문자열로 변환 (00:00:00 고정)
    const startDateToSend = projectStartDate.value ? `${projectStartDate.value}T00:00:00` : undefined
    const endDateToSend = projectEndDate.value ? `${projectEndDate.value}T23:59:59` : undefined
    
    const updatedWorkspace = await updateWorkspace(
      currentWorkspace.workSpaceSeq,
      teamName.value,
      thumbnailToSend,
      startDateToSend,
      endDateToSend
    )
    
    // 워크스페이스 목록 새로고침
    await workspaceStore.loadMyWorkspaces()
    
    // 현재 워크스페이스 다시 선택하여 업데이트된 정보 반영
    const currentWorkspaceId = workspaceStore.currentWorkspace
    await workspaceStore.selectWorkspace(currentWorkspaceId)
    
  } catch (error) {
    console.error('워크스페이스 수정 실패:', error)
  }
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
const saveWorkspaceSettings = async () => {
  await updateWorkspaceInfo()
  // 변경사항 초기화
  thumbnailImage.value = null
  workspaceSettingsOpen.value = false
}

// 워크스페이스 삭제 관련
const deleteConfirmDialog = ref(false)
const deleteConfirmText = ref('')
const isDeletingWorkspace = ref(false)

// 멤버 초대 관련
const inviteFriends = ref([])
const inviteSearchQuery = ref('')
const inviteSearchResults = ref([])
const invitedMembers = ref([])
const isLoadingInviteFriends = ref(false)
const isLoadingInviteSearch = ref(false)

// 친구 목록 로드 (초대용)
const loadInviteFriends = async () => {
  try {
    isLoadingInviteFriends.value = true
    const response = await getFriendList('', 0, 50)
    
    const friendList = Array.isArray(response) ? response : (response.content || [])
    
    inviteFriends.value = friendList.map(friend => ({
      id: friend.memberId || friend.id,
      memberSeq: friend.memberSeq || friend.friendSeq,
      name: friend.name,
      email: friend.email,
      profileImage: friend.profileImage,
      avatarText: friend.name ? friend.name.charAt(0) : '?',
      isFriend: true
    }))
  } catch (error) {
    // 에러 무시
  } finally {
    isLoadingInviteFriends.value = false
  }
}

// 회원 검색 (초대용)
const searchInviteMembers = ref(null)
watch(inviteSearchQuery, (newValue) => {
  if (searchInviteMembers.value) {
    clearTimeout(searchInviteMembers.value)
  }
  
  if (!newValue.trim()) {
    inviteSearchResults.value = []
    return
  }
  
  searchInviteMembers.value = setTimeout(async () => {
    try {
      isLoadingInviteSearch.value = true
      const response = await searchMembers(newValue, 0, 20)
      
      const memberList = Array.isArray(response) ? response : (response.content || [])
      
      inviteSearchResults.value = memberList.map(member => ({
        id: member.memberId || member.id,
        memberSeq: member.memberSeq,
        name: member.name,
        email: member.email,
        profileImage: member.profileImage,
        avatarText: member.name ? member.name.charAt(0) : '?',
        isFriend: member.isFriend || false
      }))
    } catch (error) {
      inviteSearchResults.value = []
    } finally {
      isLoadingInviteSearch.value = false
    }
  }, 300)
})

// 초대 목록에 추가
const addToInviteList = (user) => {
  if (!isInvited(user.memberSeq || user.id)) {
    invitedMembers.value.push(user)
  }
}

// 초대 목록에서 제거
const removeFromInviteList = (userSeq) => {
  const index = invitedMembers.value.findIndex(member => (member.memberSeq || member.id) === userSeq)
  if (index > -1) {
    invitedMembers.value.splice(index, 1)
  }
}

// 초대 목록 토글 (추가/제거)
const toggleInviteList = (user) => {
  const userSeq = user.memberSeq || user.id
  
  // 이미 워크스페이스 멤버인지 확인
  if (isAlreadyMember(userSeq)) {
    return // 이미 멤버면 토글 불가
  }
  
  if (isInvited(userSeq)) {
    removeFromInviteList(userSeq)
  } else {
    addToInviteList(user)
  }
}

// 초대되었는지 확인
const isInvited = (userSeq) => {
  return invitedMembers.value.some(member => (member.memberSeq || member.id) === userSeq)
}

// 이미 워크스페이스 멤버인지 확인
const isAlreadyMember = (userSeq) => {
  return teamMembers.value.some(member => member.memberSeq == userSeq || member.id == userSeq)
}

// 멤버 초대 처리
const handleInviteMembers = async () => {
  if (invitedMembers.value.length === 0) {
    showCustomToast('멤버 선택 필요', '초대할 멤버를 선택해주세요.', 'warning')
    return
  }
  
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  const inviteCount = invitedMembers.value.length
  
  try {
    const memberList = invitedMembers.value.map(member => member.memberSeq)
    
    await inviteWorkspaceMembers(currentWorkspace.workSpaceSeq, memberList, null)
    
    // 초대 목록 초기화
    invitedMembers.value = []
    inviteSearchQuery.value = ''
    inviteSearchResults.value = []
    
    // 멤버 목록 새로고침
    await loadMembers()
    
    // 워크스페이스 정보 최신화 (멤버 수 업데이트)
    await workspaceStore.loadMyWorkspaces()
    
    // 워크스페이스 멤버 스토어도 최신화
    console.log('🔄 워크스페이스 멤버 스토어 업데이트 시작 (초대):', currentWorkspace.workSpaceSeq)
    if (workspaceMemberStore && workspaceMemberStore.loadWorkspaceMembers) {
      await workspaceMemberStore.loadWorkspaceMembers(currentWorkspace.workSpaceSeq)
    }
    
    // 모달 닫기
    workspaceSettingsOpen.value = false
    
    // 성공 메시지 (모달 닫힌 후 표시)
    setTimeout(() => {
      showCustomToast('멤버 초대 완료', `${inviteCount}명의 멤버를 초대했습니다.`, 'success')
    }, 100)
    
  } catch (error) {
    console.error('멤버 초대 실패:', error)
    showCustomToast('멤버 초대 실패', '멤버 초대에 실패했습니다.', 'error')
  }
}

// 워크스페이스 삭제 확인 다이얼로그 열기
const openDeleteConfirmDialog = () => {
  deleteConfirmText.value = ''
  deleteConfirmDialog.value = true
}

// 워크스페이스 삭제 처리
const handleDeleteWorkspace = async () => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  
  // 확인 텍스트 검증
  if (deleteConfirmText.value !== currentWorkspace.name) {
    showCustomToast('이름 불일치', '워크스페이스 이름이 일치하지 않습니다.', 'warning')
    return
  }
  
  try {
    isDeletingWorkspace.value = true
    
    // API 호출
    await deleteWorkspace(currentWorkspace.workSpaceSeq)
    
    // 워크스페이스 목록 새로고침
    await workspaceStore.loadMyWorkspaces()
    
    // 다이얼로그 닫기
    deleteConfirmDialog.value = false
    workspaceSettingsOpen.value = false
    
    // 개인 워크스페이스로 리다이렉트
    await router.push('/workspaces/personal/dashboard')
    
    // 성공 메시지 (이동 후 표시)
    setTimeout(() => {
      showCustomToast('워크스페이스 삭제 완료', `워크스페이스 "${currentWorkspace.name}"가 삭제되었습니다.`, 'success')
    }, 300)
    
  } catch (error) {
    showCustomToast('워크스페이스 삭제 실패', '워크스페이스 삭제에 실패했습니다.', 'error')
  } finally {
    isDeletingWorkspace.value = false
  }
}

// 알림 사이드바 토글
const toggleNotificationSidebar = async () => {
  // 모든 화면에서 알림 사이드바 토글 가능
  notificationSidebarVisible.value = !notificationSidebarVisible.value
  emit('toggle-notification-sidebar', notificationSidebarVisible.value)
  
  // 사이드바가 열릴 때 알림 목록 불러오기 (1회만)
  if (notificationSidebarVisible.value && notifications.value.length === 0) {
    // console.log('[AppHeader] 알림 사이드바 열림, 알림 불러오기')
    await notificationStore.fetchNotifications()
  }
}

// 워크스페이스 변경 시 필터 초기화 및 워크스페이스 정보 설정
const resetFiltersOnWorkspaceChange = () => {
  notificationStore.setActiveFilter('all')
  
  // 워크스페이스 타입과 번호 설정 (프론트엔드 필터링용)
  const type = props.currentWorkspace?.type || 'personal'
  const workspaceSeq = type === 'project' ? props.currentWorkspace?.workSpaceSeq : null
  notificationStore.setWorkspace(type, workspaceSeq)
  
  // console.log('[AppHeader] 워크스페이스 변경:', { type, workspaceSeq })
}

// 워크스페이스 변경 감지
watch(() => props.currentWorkspace, () => {
  resetFiltersOnWorkspaceChange()
}, { deep: true })

// 사용자 프로필 정보 조회
const fetchUserInfo = async () => {
  try {
    const data = await authApi.getMyPage()
    profileImageUrl.value = data.profileImageUrl || ''
    userName.value = data.name || ''
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error)
  }
}

// 프로필 이미지 표시 (authStore 우선, 없으면 API 데이터)
const displayProfileImage = computed(() => {
  // authStore에 user가 있고 profileImageUrl이 명시적으로 설정된 경우 (null 포함)
  if (authStore.user && 'profileImageUrl' in authStore.user) {
    return authStore.user.profileImageUrl
  }
  // 그렇지 않으면 API 데이터 사용
  return profileImageUrl.value
})

// 사용자 이름 첫 글자 (authStore 우선, 없으면 API 데이터)
const userInitial = computed(() => {
  const name = authStore.user?.name || userName.value
  return name ? name.charAt(0) : 'U'
})

// 마이페이지로 이동 (SPA 라우팅)
const goToMyPage = () => {
  profileMenuOpen.value = false
  router.push('/workspaces/personal/profile')
}

// 로그아웃
const logout = async () => {
  profileMenuOpen.value = false
  try {
    await authApi.logout()
    
    // authStore 초기화
    authStore.logout()
    
    // 랜딩 페이지로 이동
    window.location.href = '/'
  } catch (error) {
    console.error('로그아웃 실패:', error)
    // 실패해도 로컬 로그아웃 처리
    authStore.logout()
    window.location.href = '/'
  }
}

// 컴포넌트 마운트 시 사용자 정보 로드
onMounted(() => {
  fetchUserInfo()
})
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
        <GlobalSearch 
          placeholder="검색"
          search-scope="current-workspace"
          :search-types="['messages', 'files', 'users', 'channels']"
          :auto-navigate="true"
          :debounce-ms="300"
        />
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

      <!-- 프로젝트 설정 버튼 (프로젝트 워크스페이스이고 SUPER 권한일 때만 표시) -->
      <v-btn 
        v-if="props.currentWorkspace?.type === 'project' && isCurrentUserSuper"
        icon 
        variant="text"
        @click="workspaceSettingsOpen = true"
        class="project-settings-btn"
      >
        <v-icon>mdi-cog</v-icon>
        <v-tooltip activator="parent" location="bottom">프로젝트 설정</v-tooltip>
      </v-btn>

      <!-- 멤버 목록 토글 (프로젝트 워크스페이스일 때만 표시) -->
      <v-btn 
        v-if="props.currentWorkspace?.type === 'project'"
        icon 
        variant="text"
        :color="memberSidebarVisible ? 'primary' : ''"
        @click="emit('toggle-member-sidebar')"
      >
        <v-icon>mdi-account-group</v-icon>
        <v-tooltip activator="parent" location="bottom">프로젝트 멤버 목록</v-tooltip>
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
              <v-img 
                v-if="displayProfileImage"
                :src="displayProfileImage"
                alt="프로필"
                cover
              />
              <span v-else class="text-white font-weight-bold" style="text-transform: none !important;">{{ userInitial }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-card class="profile-menu" min-width="200">
          <v-list>
            <v-list-item @click="goToMyPage">
              <template v-slot:prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>마이페이지</v-list-item-title>
            </v-list-item>
            <v-list-item @click="logout">
              <template v-slot:prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>로그아웃</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </div>
  </v-app-bar>

  <!-- 프로젝트 설정 다이얼로그 - 새로운 디자인 -->
  <v-dialog v-model="workspaceSettingsOpen" max-width="900" scrollable>
    <v-card class="modern-settings-dialog">
      <!-- 모던한 헤더 -->
      <div class="modern-header">
        <div class="header-gradient"></div>
        <div class="header-content-wrapper">
          <div class="header-left-section">
            <div class="icon-badge">
              <v-icon size="28">mdi-cog-outline</v-icon>
            </div>
            <div class="title-section">
              <h1 class="main-title">프로젝트 설정</h1>
              <p class="subtitle">{{ props.currentWorkspace?.name || '워크스페이스' }}</p>
            </div>
        </div>
        <v-btn 
            icon
          variant="text" 
          @click="workspaceSettingsOpen = false"
            class="modern-close-btn"
            size="large"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- 탭 네비게이션 - 카드 스타일 -->
      <div class="tabs-container">
        <div class="tab-pills">
          <button
            :class="['tab-pill', { active: settingsTab === 'info' }]"
            @click="settingsTab = 'info'"
          >
            <v-icon size="20">mdi-information-outline</v-icon>
            <span>프로젝트 정보</span>
          </button>
          <button
            v-if="isCurrentUserSuper"
            :class="['tab-pill', { active: settingsTab === 'invite' }]"
            @click="settingsTab = 'invite'"
          >
            <v-icon size="20">mdi-account-multiple-plus</v-icon>
            <span>멤버 초대</span>
          </button>
          <button
            :class="['tab-pill', { active: settingsTab === 'permissions' }]"
            @click="settingsTab = 'permissions'"
          >
            <v-icon size="20">mdi-account-cog</v-icon>
            <span>멤버 관리</span>
          </button>
        </div>
      </div>

      <!-- 탭 컨텐츠 -->
      <v-card-text class="modern-content">
        <v-window v-model="settingsTab" class="settings-window">
          <!-- 팀 정보 탭 -->
          <v-window-item value="info">
            <div class="content-section">
              <!-- 프로젝트 프로필 카드 -->
              <div class="profile-card">
                <div class="card-label">
                  <v-icon size="18">mdi-image-edit</v-icon>
                  <span>프로젝트 아이덴티티</span>
        </div>
        
                <div class="profile-content">
                  <div class="avatar-section">
                    <div class="avatar-wrapper" @click="$refs.thumbnailInput.click()">
                      <v-avatar size="120" class="project-avatar" color="primary">
              <v-img 
                v-if="thumbnailPreview"
                :src="thumbnailPreview"
                          alt="프로젝트 썸네일"
                cover
              />
                        <span v-else class="avatar-text">
                {{ teamName.charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
                      <div class="avatar-overlay">
                        <v-icon size="32" color="white">mdi-camera</v-icon>
                        <span class="overlay-text">변경</span>
                      </div>
                    </div>
                    <p class="avatar-hint">클릭하여 프로젝트 이미지 변경</p>
          </div>
          
                  <div class="name-section">
                    <label class="field-label">프로젝트 이름</label>
          <v-text-field
            v-model="teamName"
                      placeholder="프로젝트 이름을 입력하세요"
                      variant="solo-filled"
                      flat
            density="comfortable"
                      hide-details
                      class="modern-input"
          />
                  </div>

                  <div class="date-section">
                    <label class="field-label">프로젝트 기간</label>
                    <div class="date-row">
                      <v-text-field
                        v-model="projectStartDate"
                        type="date"
                        label="시작일"
                        variant="solo-filled"
                        flat
                        density="comfortable"
                        hide-details
                        class="modern-input"
                        :max="projectEndDate || undefined"
                        required
                      />
                      <v-text-field
                        v-model="projectEndDate"
                        type="date"
                        label="종료일"
                        variant="solo-filled"
                        flat
                        density="comfortable"
                        hide-details
                        class="modern-input"
                        :min="projectStartDate || undefined"
                      />
                    </div>
                  </div>
          
          <input
            type="file"
            accept="image/*"
            @change="handleThumbnailChange"
            style="display: none"
            ref="thumbnailInput"
          />
                </div>
        </div>
        
              <!-- 위험 영역 -->
              <div class="danger-card" v-if="isCurrentUserSuper">
                <div class="card-label danger">
                  <v-icon size="18" color="error">mdi-alert-octagon</v-icon>
                  <span>위험 영역</span>
          </div>
          
                <div class="danger-content">
                  <div class="warning-box">
                    <v-icon size="48" color="error" class="mb-3">mdi-delete-alert</v-icon>
                    <h4 class="warning-title">프로젝트 삭제</h4>
                    <p class="warning-text">
                      프로젝트를 삭제하면 모든 데이터(채팅, 파일, 일정, 회의 기록 등)가<br>
                      <strong>영구적으로 삭제</strong>되며 복구할 수 없습니다.
                    </p>
          <v-btn
            color="error"
                      variant="flat"
            prepend-icon="mdi-delete-forever"
            @click="openDeleteConfirmDialog"
                      size="large"
                      class="mt-4"
          >
                      프로젝트 영구 삭제
          </v-btn>
                  </div>
                </div>
        </div>
      </div>
        </v-window-item>

        <!-- 멤버 초대 탭 -->
        <v-window-item value="invite">
          <!-- 검색바 (상단 고정) -->
          <div class="invite-search-header">
            <v-text-field
              v-model="inviteSearchQuery"
              placeholder="이름 또는 이메일로 검색"
              variant="solo-filled"
              flat
              density="comfortable"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details
              class="modern-search"
            />
          </div>

          <div class="invite-layout" :class="{ 'has-search': inviteSearchQuery }">
            <!-- 왼쪽: 친구 목록 -->
            <div class="invite-panel">
              <div class="area-header">
                <v-icon size="18">mdi-account-heart</v-icon>
                <span>친구 목록</span>
              </div>
              
              <div class="invite-members-area">
                <div v-if="isLoadingInviteFriends" class="modern-loading">
                  <v-progress-circular indeterminate color="primary" size="32" />
                  <p>친구 목록을 불러오는 중...</p>
                </div>
                
                <div v-else-if="inviteFriends.length === 0" class="modern-empty">
                  <v-icon size="48" color="grey-lighten-1">mdi-account-off-outline</v-icon>
                  <h4>친구가 없습니다</h4>
                  <p>친구를 추가한 후 프로젝트에 초대할 수 있습니다</p>
                </div>
                
                <div v-else class="invite-member-list">
                  <div
                    v-for="friend in inviteFriends"
                    :key="friend.memberSeq"
                    class="invite-member-item"
                    :class="{ 
                      selected: isInvited(friend.memberSeq),
                      disabled: isAlreadyMember(friend.memberSeq)
                    }"
                    @click="toggleInviteList(friend)"
                  >
                    <v-avatar size="40" color="primary">
                      <v-img v-if="friend.profileImage" :src="friend.profileImage" />
                      <span v-else>{{ friend.avatarText }}</span>
                    </v-avatar>
                    <div class="member-info">
                      <p class="member-name">
                        {{ friend.name }}
                        <v-chip 
                          v-if="isAlreadyMember(friend.memberSeq)"
                          size="x-small"
                          color="success"
                          variant="flat"
                          class="ml-2"
                        >
                          멤버
                        </v-chip>
                      </p>
                      <p class="member-email">{{ friend.email }}</p>
                    </div>
                    <v-icon 
                      v-if="isAlreadyMember(friend.memberSeq)"
                      color="success"
                      size="24"
                    >
                      mdi-account-check
                    </v-icon>
                    <v-icon 
                      v-else-if="isInvited(friend.memberSeq)"
                      color="primary"
                      size="24"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                </div>
              </div>
            </div>

            <!-- 가운데: 검색 결과 (검색 중일 때만 표시) -->
            <div v-if="inviteSearchQuery" class="invite-panel search-panel">
              <div class="area-header">
                <v-icon size="18">mdi-account-search</v-icon>
                <span>검색 결과</span>
              </div>
              
              <div class="invite-members-area">
                <div v-if="isLoadingInviteSearch" class="modern-loading">
                  <v-progress-circular indeterminate color="primary" size="32" />
                  <p>검색 중...</p>
                </div>
                
                <div v-else-if="inviteSearchResults.length === 0" class="modern-empty">
                  <v-icon size="48" color="grey-lighten-1">mdi-account-question-outline</v-icon>
                  <h4>검색 결과 없음</h4>
                  <p>다른 이름이나 이메일로 검색해보세요</p>
                </div>
                
                <div v-else class="invite-member-list">
                  <div
                    v-for="member in inviteSearchResults"
                    :key="member.memberSeq"
                    class="invite-member-item"
                    :class="{ 
                      selected: isInvited(member.memberSeq),
                      disabled: isAlreadyMember(member.memberSeq)
                    }"
                    @click="toggleInviteList(member)"
                  >
                    <v-avatar size="40" color="primary">
                      <v-img v-if="member.profileImage" :src="member.profileImage" />
                      <span v-else>{{ member.avatarText }}</span>
                    </v-avatar>
                    <div class="member-info">
                      <p class="member-name">
                        {{ member.name }}
                        <v-chip 
                          v-if="isAlreadyMember(member.memberSeq)"
                          size="x-small"
                          color="success"
                          variant="flat"
                          class="ml-2"
                        >
                          멤버
                        </v-chip>
                      </p>
                      <p class="member-email">{{ member.email }}</p>
                    </div>
                    <v-icon 
                      v-if="isAlreadyMember(member.memberSeq)"
                      color="success"
                      size="24"
                    >
                      mdi-account-check
                    </v-icon>
                    <v-icon 
                      v-else-if="isInvited(member.memberSeq)"
                      color="primary"
                      size="24"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                </div>
              </div>
            </div>

            <!-- 오른쪽: 초대 목록 -->
            <div class="invite-panel invite-list-panel">
              <div class="area-header">
                <v-icon size="18">mdi-account-multiple-plus</v-icon>
                <span>초대 목록 ({{ invitedMembers.length }}명)</span>
              </div>

              <div class="invite-list-area">
                <div v-if="invitedMembers.length === 0" class="modern-empty">
                  <v-icon size="64" color="grey-lighten-1">mdi-account-plus-outline</v-icon>
                  <h4>초대할 멤버를 선택하세요</h4>
                  <p>왼쪽에서 친구를 클릭하여 추가</p>
                </div>

                <div v-else class="invited-member-list">
                  <div
                    v-for="member in invitedMembers"
                    :key="member.memberSeq || member.id"
                    class="invited-member-item"
                  >
                    <v-avatar size="40" color="primary">
                      <v-img v-if="member.profileImage" :src="member.profileImage" />
                      <span v-else>{{ member.avatarText }}</span>
                    </v-avatar>
                    <div class="member-info">
                      <p class="member-name">{{ member.name }}</p>
                      <p class="member-email">{{ member.email }}</p>
                    </div>
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="removeFromInviteList(member.memberSeq || member.id)"
                    >
                      <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-window-item>

        <!-- 멤버 권한 관리 탭 -->
        <v-window-item value="permissions">
          <div class="content-section">
            <!-- 권한 안내 -->
            <div class="info-banner">
              <v-icon color="primary" size="20">mdi-information</v-icon>
              <div class="info-text">
                <strong>권한 관리 안내</strong>
                <p>프로젝트 멤버의 권한을 관리할 수 있습니다. SUPER 권한자만 다른 멤버의 권한을 변경할 수 있습니다.</p>
              </div>
        </div>
        
            <!-- 권한 범례 -->
            <div class="permission-legend-card">
              <div class="legend-item-modern">
                <div class="legend-badge super">
                  <v-icon size="16">mdi-shield-crown</v-icon>
              </div>
                <div class="legend-info">
                  <strong>소유자 (SUPER)</strong>
                  <p>프로젝트의 모든 권한을 가지며 멤버 관리 및 프로젝트 삭제 가능</p>
            </div>
                  </div>
              <div class="legend-item-modern">
                <div class="legend-badge participant">
                  <v-icon size="16">mdi-account</v-icon>
                </div>
                <div class="legend-info">
                  <strong>참여자 (PARTICIPANT)</strong>
                  <p>프로젝트의 일반 기능을 사용할 수 있는 멤버</p>
                  </div>
                </div>
              </div>
              
            <!-- 멤버 권한 목록 -->
            <div class="members-card">
              <div class="card-label">
                <v-icon size="18">mdi-account-group</v-icon>
                <span>팀원 목록 ({{ teamMembers.length }}명)</span>
              </div>
              
              <div class="members-content">
                <!-- 로딩 상태 -->
                <div v-if="isLoadingMembers" class="modern-loading">
                  <v-progress-circular indeterminate size="32" color="primary" />
                  <p>멤버 목록을 불러오는 중...</p>
                </div>
                
                <!-- 멤버 목록이 없는 경우 -->
                <div v-else-if="teamMembers.length === 0" class="modern-empty">
                  <v-icon size="64" color="grey-lighten-1">mdi-account-group-outline</v-icon>
                  <h4>멤버가 없습니다</h4>
                </div>
                
                <!-- 멤버 목록 -->
                <div v-else class="permission-member-list">
                <div 
                  v-for="member in sortedTeamMembers" 
                  :key="member.id"
                    class="permission-member-item"
                >
                    <div class="member-left">
                      <v-avatar size="48" color="primary">
                      <span class="text-white font-weight-bold">{{ member.avatar }}</span>
                    </v-avatar>
                      <div class="member-info">
                        <div class="member-name-row">
                          <p class="member-name">{{ member.name }}</p>
                        <v-chip 
                          v-if="Number(member.id) === Number(currentUserId)"
                          size="x-small"
                          color="primary"
                            variant="tonal"
                        >
                            나
                        </v-chip>
                      </div>
                        <div class="member-status">
                      <div 
                            class="status-indicator"
                        :class="getStatusColor(member.status)"
                      ></div>
                          <span class="status-text">{{ member.status === 'online' ? '온라인' : member.status === 'away' ? '자리비움' : '오프라인' }}</span>
                        </div>
                    </div>
                  </div>
                  
                    <div class="permission-control">
                      <!-- SUPER 권한을 가진 사용자가 다른 멤버를 관리하는 경우 -->
                      <div v-if="isCurrentUserSuper && Number(member.memberSeq) !== Number(currentUserId)" class="unified-permission-group">
                        <!-- 소유자 버튼 -->
                        <v-btn
                          :class="['unified-btn', 'unified-btn-left', 'super-btn', { 'active': memberPermissions['project'][member.id] === 'SUPER' }]"
                          @click="updatePermission('project', member.id, 'SUPER')"
                        >
                          <v-icon size="16">mdi-shield-crown</v-icon>
                          <span>소유자</span>
                        </v-btn>
                        
                        <!-- 참여자 버튼 -->
                        <v-btn
                          :class="[
                            'unified-btn', 
                            'participant-btn', 
                            { 'active': memberPermissions['project'][member.id] === 'PARTICIPANT' },
                            { 'unified-btn-right': memberPermissions['project'][member.id] === 'SUPER' },
                            { 'unified-btn-middle': memberPermissions['project'][member.id] === 'PARTICIPANT' }
                          ]"
                          @click="updatePermission('project', member.id, 'PARTICIPANT')"
                        >
                          <v-icon size="16">mdi-account</v-icon>
                          <span>참여자</span>
                        </v-btn>
                        
                        <!-- 강제 탈퇴 버튼 (PARTICIPANT인 경우만) -->
                        <v-btn
                          v-if="memberPermissions['project'][member.id] === 'PARTICIPANT'"
                          class="unified-btn unified-btn-right kick-btn-unified"
                          @click="handleKickMember(member)"
                        >
                          <v-icon size="16">mdi-account-remove</v-icon>
                          <span>강제 탈퇴</span>
                        </v-btn>
                      </div>
                      
                      <!-- 본인이거나 권한 변경 불가능한 경우 현재 권한만 표시 -->
                      <v-chip 
                        v-else
                        :color="memberPermissions['project'][member.id] === 'SUPER' ? 'error' : 'primary'"
                        variant="flat"
                        class="permission-display-chip"
                      >
                        <v-icon 
                          start
                          size="16" 
                          :icon="memberPermissions['project'][member.id] === 'SUPER' ? 'mdi-shield-crown' : 'mdi-account'"
                        ></v-icon>
                        <span>{{ memberPermissions['project'][member.id] === 'SUPER' ? '소유자' : '참여자' }}</span>
                      </v-chip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </v-window-item>
        </v-window>
      </v-card-text>
      
      <!-- 모던한 하단 액션 버튼 -->
      <div class="modern-actions">
        <v-btn
          variant="text"
          size="large"
          @click="workspaceSettingsOpen = false"
          class="cancel-btn"
        >
          취소
        </v-btn>
        <v-btn
          v-if="settingsTab === 'info'"
          color="primary"
          variant="flat"
          size="large"
          @click="saveWorkspaceSettings"
          prepend-icon="mdi-content-save"
          :disabled="!hasChanges"
          class="save-btn"
        >
          변경사항 저장
        </v-btn>
        <v-btn
          v-if="settingsTab === 'invite'"
          color="primary"
          variant="flat"
          size="large"
          @click="handleInviteMembers"
          prepend-icon="mdi-send"
          :disabled="invitedMembers.length === 0"
          class="invite-btn"
        >
          {{ invitedMembers.length > 0 ? `${invitedMembers.length}명 초대하기` : '초대하기' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- 워크스페이스 삭제 확인 다이얼로그 -->
  <v-dialog v-model="deleteConfirmDialog" max-width="560" persistent>
    <v-card class="delete-confirm-card">
      <div class="delete-header">
        <div class="delete-header-left">
          <div class="delete-icon">
            <v-icon size="28">mdi-alert-octagon</v-icon>
          </div>
          <div class="delete-header-text">
            <h3 class="delete-title">워크스페이스 삭제</h3>
            <p class="delete-subtitle">이 작업은 되돌릴 수 없습니다</p>
          </div>
        </div>
        <v-chip size="small" color="error" variant="flat" class="delete-chip">위험 작업</v-chip>
      </div>

      <v-card-text class="delete-body">
        <div class="delete-warning">
          <v-icon size="20" color="error">mdi-alert</v-icon>
          <div class="warning-text">
            <p>
              워크스페이스 <strong>"{{ props.currentWorkspace?.name }}"</strong> 을(를)
              삭제하면 다음 데이터가 <strong>영구적으로 삭제</strong>됩니다.
            </p>
            <ul>
              <li>채팅/메시지 기록</li>
              <li>공유 파일 및 폴더</li>
              <li>일정/회의 기록</li>
              <li>채널 및 멤버 설정</li>
            </ul>
          </div>
        </div>

        <div class="confirm-input">
          <label>계속하려면 아래 입력창에 워크스페이스 이름을 입력하세요.</label>
          <v-text-field
            v-model="deleteConfirmText"
            :placeholder="props.currentWorkspace?.name"
            variant="outlined"
            density="comfortable"
            :error="deleteConfirmText && deleteConfirmText !== props.currentWorkspace?.name"
            :error-messages="deleteConfirmText && deleteConfirmText !== props.currentWorkspace?.name ? '워크스페이스 이름이 일치하지 않습니다' : ''"
            autofocus
            class="name-input"
            hide-details="auto"
          />
        </div>
      </v-card-text>

      <div class="delete-actions">
        <v-btn
          variant="text"
          class="btn-cancel"
          @click="deleteConfirmDialog = false"
          :disabled="isDeletingWorkspace"
        >
          취소
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          class="btn-delete"
          prepend-icon="mdi-delete-forever"
          @click="handleDeleteWorkspace"
          :disabled="deleteConfirmText !== props.currentWorkspace?.name"
          :loading="isDeletingWorkspace"
        >
          영구 삭제
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- 알림 사이드바 -->
  <v-navigation-drawer
    v-if="notificationSidebarVisible"
    v-model="notificationSidebarVisible"
    location="right"
    width="400"
    temporary
    :permanent="false"
    :rail="false"
    class="notification-sidebar"
    :scrim="true"
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
            variant="outlined"
            size="small" 
            color="error"
            @click="clearAllNotifications"
            :disabled="filteredNotifications.length === 0"
            class="clear-all-button"
          >
            <v-icon left size="16">mdi-delete-sweep</v-icon>
            모두 삭제
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
          <v-avatar size="28" :color="getNotificationColor(notification.type)" class="type-avatar">
            <v-icon size="18" color="white">{{ getNotificationIcon(notification.type) }}</v-icon>
          </v-avatar>
          <span v-if="!notification.read" class="unread-dot"></span>
        </div>

        <div class="notification-body">
          <div class="notification-header-row">
            <v-chip
              size="x-small"
              :color="getNotificationColor(notification.type)"
              variant="tonal"
              class="type-chip"
            >
              {{ getNotificationTypeText(notification.type) }}
            </v-chip>
            <span class="notification-time">{{ notification.time }}</span>
          </div>
          <p class="notification-text">{{ notification.message }}</p>
          <div class="notification-footer">
            <div v-if="notification.priority" class="priority-badge">
              {{ getPriorityText(notification.priority) }}
            </div>
            <div
              v-if="
                !notification.read &&
                (notification.type === 'alarm-friend' || /friend/i.test(notification.type || '')) &&
                (
                  notification.data?.subType === 'FRIEND_REQUEST' ||
                  /요청/i.test(notification.message || '') ||
                  /request/i.test(notification.type || '')
                ) &&
                !(/accept|accepted|approve|approved|수락|승인/i.test(notification.data?.subType || '')) &&
                !(/수락|승인|accepted|approve/i.test(notification.message || ''))
              "
              class="friend-actions"
            >
              <v-btn
                size="small"
                color="primary"
                variant="elevated"
                prepend-icon="mdi-check"
                :loading="friendActionLoading[notification.id] === true"
                :disabled="friendActionLoading[notification.id] === true"
                class="friend-action-btn accept"
                @click.stop="handleAcceptFriend(notification)"
              >
                수락
              </v-btn>
              <v-btn
                size="small"
                color="error"
                variant="tonal"
                prepend-icon="mdi-close"
                :loading="friendActionLoading[notification.id] === true"
                :disabled="friendActionLoading[notification.id] === true"
                class="friend-action-btn reject"
                @click.stop="handleRejectFriend(notification)"
              >
                거절
              </v-btn>
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

  <!-- 커스텀 토스트 메시지 -->
  <div v-if="showToast" :class="['custom-toast', `toast-${toastType}`]">
    <div class="toast-content">
      <div class="toast-icon">
        <v-icon color="white" size="24">
          {{ toastType === 'success' ? 'mdi-check-circle' : toastType === 'error' ? 'mdi-alert-circle' : 'mdi-alert' }}
        </v-icon>
      </div>
      <div class="toast-message">
        <p class="toast-title">{{ toastTitle }}</p>
        <p class="toast-text">{{ toastMessage }}</p>
      </div>
      <v-btn
        icon
        size="small"
        variant="text"
        class="toast-close"
        @click="showToast = false"
      >
        <v-icon color="white" size="20">mdi-close</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  background: rgb(var(--v-theme-surface)) !important; /* 라이트 모드: 프로젝트 톤과 일관 */
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: 0 1px 0 rgba(var(--v-theme-on-surface), 0.04);
  height: 60px !important;
  z-index: 1005 !important;
}

.dark-header {
  background: rgba(0, 0, 0, 0.4) !important; /* 다크 모드는 기존 느낌 유지 */
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: auto;
  flex-shrink: 0;
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: auto;
  justify-content: flex-end;
  padding-right: 16px;
  flex-shrink: 0;
  flex-wrap: nowrap;
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
  max-width: 300px;
  min-width: 150px;
  z-index: 1008;
  flex-shrink: 1;
}

/* =====================================================
   프로젝트 설정 모달 - 모던한 새 디자인
   ===================================================== */

.modern-settings-dialog {
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.16) !important;
}

/* 모던한 헤더 */
.modern-header {
  position: relative;
  padding: 32px 32px 24px;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-primary), 0.85) 100%);
  color: white;
}

.header-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="rgba(255,255,255,0.1)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
  background-size: cover;
  opacity: 0.4;
}

.header-content-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-badge {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.main-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  font-weight: 500;
}

.modern-close-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
}

.modern-close-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: rotate(90deg);
}

/* 탭 네비게이션 */
.tabs-container {
  padding: 20px 32px 0;
  background: rgb(var(--v-theme-surface));
}

.tab-pills {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid rgba(var(--v-theme-on-surface), 0.08);
}

.tab-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 12px 12px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border-bottom: 3px solid transparent;
}

.tab-pill:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

.tab-pill.active {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  border-bottom-color: rgb(var(--v-theme-primary));
}

/* 컨텐츠 영역 */
.modern-content {
  padding: 0 !important;
  max-height: 60vh;
  overflow-y: auto;
}

.settings-window {
  min-height: 400px;
}

.content-section {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 카드 공통 스타일 */
.profile-card,
.danger-card,
.members-card,
.invite-queue-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.profile-card:hover,
.members-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.08);
}

.card-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.card-label.danger {
  background: rgba(var(--v-theme-error), 0.05);
  color: rgb(var(--v-theme-error));
}

/* 프로필 섹션 */
.profile-content {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.avatar-wrapper:hover {
  transform: scale(1.05);
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.project-avatar {
  border: 4px solid rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.avatar-text {
  font-size: 48px;
  font-weight: 700;
  color: white;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.overlay-text {
  color: white;
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
}

.avatar-hint {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
}

.name-section {
  flex: 1;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.8);
  margin-bottom: 8px;
}

.modern-input :deep(.v-field) {
  border-radius: 12px;
  font-size: 16px;
}

/* 위험 영역 */
.danger-card {
  border-color: rgba(var(--v-theme-error), 0.3);
}

.danger-content {
  padding: 24px;
}

.warning-box {
  text-align: center;
  padding: 24px;
  background: rgba(var(--v-theme-error), 0.05);
  border-radius: 12px;
}

.warning-title {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-error));
  margin: 12px 0 8px;
}

.warning-text {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.6;
  margin: 0;
}

/* 멤버 초대 레이아웃 */
.invite-search-header {
  padding: 24px 32px 16px;
  background: rgb(var(--v-theme-surface));
}

.invite-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 0 32px 24px;
  min-height: 500px;
  transition: grid-template-columns 0.3s ease;
}

.invite-layout.has-search {
  grid-template-columns: 1fr 1fr 1fr;
}

.invite-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  padding: 20px;
  min-width: 0;
}

.invite-panel.search-panel {
  border: 2px solid rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.02);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.invite-members-area,
.invite-list-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.invite-members-area::-webkit-scrollbar,
.invite-list-area::-webkit-scrollbar {
  width: 6px;
}

.invite-members-area::-webkit-scrollbar-track,
.invite-list-area::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 10px;
}

.invite-members-area::-webkit-scrollbar-thumb,
.invite-list-area::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 10px;
}

.invite-members-area::-webkit-scrollbar-thumb:hover,
.invite-list-area::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.area-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 12px;
}

/* 멤버 목록 스타일 */
.invite-member-list,
.invited-member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-member-item,
.invited-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.5);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 10px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.invited-member-item {
  cursor: default;
}

.invite-member-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
  transform: translateX(4px);
}

.invite-member-item.selected {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.invite-member-item.selected:hover {
  background: rgba(var(--v-theme-primary), 0.15);
}

.invite-member-item.disabled {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-color: rgba(var(--v-theme-on-surface), 0.08);
  cursor: not-allowed;
  opacity: 0.6;
}

.invite-member-item.disabled:hover {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-color: rgba(var(--v-theme-on-surface), 0.08);
  transform: none;
}

.invited-member-item:hover {
  background: rgba(var(--v-theme-surface), 0.8);
}


.member-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.member-name {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.member-email {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
}

.modern-search :deep(.v-field) {
  border-radius: 12px;
}

.modern-loading,
.modern-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
}

.modern-empty h4 {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.modern-empty p {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
}

/* 권한 관리 스타일 */
.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(var(--v-theme-primary), 0.08);
  border-left: 4px solid rgb(var(--v-theme-primary));
  border-radius: 12px;
}

.info-text {
  flex: 1;
}

.info-text strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
  color: rgb(var(--v-theme-on-surface));
}

.info-text p {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
  line-height: 1.5;
}

.permission-legend-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  padding: 20px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
}

.legend-item-modern {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.legend-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.legend-badge.super {
  background: rgba(var(--v-theme-error), 0.15);
  color: rgb(var(--v-theme-error));
}

.legend-badge.participant {
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
}

.legend-info {
  flex: 1;
}

.legend-info strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
  color: rgb(var(--v-theme-on-surface));
}

.legend-info p {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
  line-height: 1.4;
}

.permission-member-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.permission-member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #ffffff;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
  gap: 16px;
}

.permission-member-item:hover {
  background: rgba(var(--v-theme-primary), 0.02);
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.member-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.green {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-indicator.orange {
  background: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.status-indicator.grey {
  background: #6b7280;
}

.status-text {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.permission-control {
  flex-shrink: 0;
}

/* 통합 권한 그룹 */
.unified-permission-group {
  display: inline-flex;
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 8px;
  overflow: hidden;
  height: 40px;
}

.unified-btn {
  height: 40px !important;
  min-width: 100px !important;
  padding: 0 16px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  border-radius: 0 !important;
  border: none !important;
  transition: all 0.2s ease !important;
  background: transparent !important;
  box-shadow: none !important;
}

.unified-btn .v-icon {
  margin-right: 6px;
}

/* 왼쪽 버튼 (소유자) - 항상 오른쪽 border */
.unified-btn-left {
  border-right: 1.5px solid rgba(var(--v-theme-on-surface), 0.15) !important;
}

/* 가운데 버튼 (참여자) - 강제탈퇴 버튼이 있을 때만 오른쪽 border */
.unified-btn-middle {
  border-right: 1.5px solid rgba(var(--v-theme-on-surface), 0.15) !important;
}

/* 오른쪽 버튼 (마지막 버튼) - border 없음 */
.unified-btn-right {
  border-right: none !important;
}

/* 강제탈퇴 버튼 너비 */
.unified-btn.kick-btn-unified {
  min-width: 120px !important;
}

/* 소유자 버튼 */
.unified-btn.super-btn {
  color: rgb(var(--v-theme-error)) !important;
}

.unified-btn.super-btn.active {
  background: rgb(var(--v-theme-error)) !important;
  color: white !important;
}

.unified-btn.super-btn:hover:not(.active):not(:disabled) {
  background: rgba(var(--v-theme-error), 0.1) !important;
}

/* 참여자 버튼 */
.unified-btn.participant-btn {
  color: rgb(var(--v-theme-primary)) !important;
}

.unified-btn.participant-btn.active {
  background: rgb(var(--v-theme-primary)) !important;
  color: white !important;
}

.unified-btn.participant-btn:hover:not(.active):not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.1) !important;
}

/* 강제 탈퇴 버튼 */
.unified-btn.kick-btn-unified {
  color: rgb(var(--v-theme-error)) !important;
  font-weight: 600 !important;
}

.unified-btn.kick-btn-unified:hover {
  background: rgb(var(--v-theme-error)) !important;
  color: white !important;
}

.unified-btn.kick-btn-unified:active {
  background: rgba(var(--v-theme-error), 0.9) !important;
}

/* 비활성화 상태 */
.unified-btn:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.permission-display-chip {
  font-weight: 600;
}

/* 하단 액션 */
.modern-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  background: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.cancel-btn {
  font-weight: 600 !important;
  text-transform: none !important;
}

.save-btn {
  font-weight: 600 !important;
  text-transform: none !important;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3) !important;
}

.save-btn:hover {
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.4) !important;
  transform: translateY(-2px);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .modern-settings-dialog {
    margin: 8px;
    max-width: calc(100vw - 16px) !important;
  }
  
  .modern-header {
    padding: 24px 20px 20px;
  }
  
  .main-title {
    font-size: 24px;
  }
  
  .icon-badge {
    width: 50px;
    height: 50px;
  }
  
  .tabs-container {
    padding: 16px 20px 0;
  }
  
  .tab-pill {
    padding: 10px 16px;
    font-size: 14px;
  }
  
  .content-section {
    padding: 20px;
  }
  
  .profile-content {
    padding: 24px 20px;
  }
  
  .modern-actions {
    padding: 16px 20px;
    flex-direction: column;
  }
  
  .cancel-btn,
  .save-btn,
  .invite-btn {
    width: 100% !important;
  }
  
  .permission-member-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .permission-control {
    width: 100%;
  }
  
  .unified-permission-group {
    width: 100%;
  }
  
  .unified-btn {
    min-width: 80px !important;
    font-size: 12px !important;
    padding: 0 12px !important;
  }
  
  .unified-btn.kick-btn-unified {
    min-width: 100px !important;
  }

  /* 초대 레이아웃 모바일 */
  .invite-search-header {
    padding: 20px;
  }

  .invite-layout {
    grid-template-columns: 1fr;
    padding: 0 20px 20px;
    gap: 16px;
  }

  .invite-layout.has-search {
    grid-template-columns: 1fr;
  }

  .invite-panel {
    padding: 16px;
  }
}

/* 알림 사이드바 스타일 */
.notification-sidebar {
  background: #ffffff !important;
  border-left: 1px solid #e5e7eb !important;
}

/* 알림 사이드바 backdrop 고정 (스크롤 시에도 블러 유지) */
::v-deep(.v-navigation-drawer__scrim) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  background: rgba(0, 0, 0, 0.4) !important;
  z-index: 2399 !important;
}

/* 알림 사이드바 자체도 고정 */
::v-deep(.notification-sidebar.v-navigation-drawer) {
  position: fixed !important;
  z-index: 2400 !important;
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

.mark-all-button,
.clear-all-button {
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
  position: relative;
}

.unread-dot {
  position: absolute;
  right: -2px;
  top: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.notification-body {
  flex: 1;
  min-width: 0;
  padding-right: 8px;
}

.notification-header-row { display: flex; align-items: center; justify-content: space-between; }
.type-chip { text-transform: none; }
.notification-text { font-size: 14px; font-weight: 500; color: #111827; line-height: 1.5; margin: 2px 0 6px 0; }

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

/* 친구 요청 액션 버튼 */
.friend-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.friend-action-btn.accept {
  border-radius: 8px;
}

.friend-action-btn.reject {
  border-radius: 8px;
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
  width: auto !important;
  min-width: 0 !important;
  text-transform: none !important;
  font-weight: 500 !important;
  padding-inline: 8px !important;
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

/* 반응형 - 개선된 버전 */
/* 큰 태블릿 */
@media (max-width: 1024px) {
  .search-container {
    width: 220px;
    max-width: 220px;
  }
  
  .header-left {
    gap: 12px;
  }
  
  .header-right {
    gap: 4px;
    padding-right: 12px;
  }
  
  .logo-btn {
    font-size: 18px;
  }
  
  /* 다이얼로그 최적화 */
  .modern-settings-dialog {
    max-width: 90vw !important;
  }
  
  .invite-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .invite-layout.has-search {
    grid-template-columns: 1fr;
  }
  
  .content-section {
    padding: 20px 24px;
  }
  
  .modern-header {
    padding: 24px 24px 20px;
  }
  
  .tabs-container {
    padding: 16px 24px 0;
  }
  
  /* 알림 사이드바 - 태블릿에서는 왼쪽 사이드바 제외한 전체 너비 */
  .notification-sidebar {
    width: calc(100vw - 120px) !important;
    margin-left: 120px !important;
  }
}

/* 태블릿 */
@media (max-width: 768px) {
  .app-header {
    height: 56px !important;
  }
  
  .search-container {
    width: 180px;
    max-width: 180px;
    min-width: 120px;
  }
  
  .header-left {
    gap: 8px;
    min-width: auto;
  }
  
  .header-right {
    gap: 2px;
    padding-right: 8px;
    min-width: auto;
  }
  
  .logo-btn {
    font-size: 16px;
    padding: 4px 8px !important;
    min-width: auto !important;
  }
  
  .notification-btn,
  .project-settings-btn,
  .profile-btn {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
  }
  
  /* 알림 사이드바 - 모바일에서는 왼쪽 사이드바 제외한 전체 너비 */
  .notification-sidebar {
    width: calc(100vw - 112px) !important;
    margin-left: 112px !important;
  }
  
  .notification-header {
    padding: 16px 12px 10px;
  }
  
  .header-title {
    font-size: 16px;
  }
  
  .notification-count {
    font-size: 10px;
    padding: 2px 6px;
  }
  
  .filter-tabs {
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .filter-tab {
    font-size: 11px;
    padding: 4px 8px;
    min-height: 28px;
  }
  
  .filter-tab span {
    font-size: 11px !important;
  }
  
  .notification-card {
    margin: 0 6px 4px;
    padding: 10px 12px;
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
  
  /* 다이얼로그 */
  .modern-settings-dialog {
    max-width: 95vw !important;
    margin: 12px;
  }
  
  .modern-header {
    padding: 20px 16px 16px;
  }
  
  .icon-badge {
    width: 48px;
    height: 48px;
  }
  
  .main-title {
    font-size: 22px;
  }
  
  .subtitle {
    font-size: 13px;
  }
  
  .tabs-container {
    padding: 12px 16px 0;
  }
  
  .tab-pill {
    padding: 10px 16px;
    font-size: 14px;
  }
  
  .content-section {
    padding: 16px 20px;
  }
  
  .profile-content {
    padding: 24px 20px;
  }
  
  .project-avatar {
    width: 100px !important;
    height: 100px !important;
  }
  
  .avatar-text {
    font-size: 40px;
  }
}

/* 모바일 */
@media (max-width: 480px) {
  .app-header {
    height: 56px !important;
  }
  
  .search-container {
    width: 100px;
    max-width: 100px;
    min-width: 70px;
  }
  
  .header-left {
    gap: 2px;
    min-width: auto;
  }
  
  .header-right {
    gap: 1px;
    padding-right: 2px;
    min-width: auto;
  }
  
  .logo-btn {
    font-size: 12px !important;
    padding: 2px 4px !important;
    min-width: auto !important;
  }
  
  .logo-text {
    display: inline-block;
    font-size: 12px !important;
  }
  
  .notification-btn,
  .project-settings-btn,
  .profile-btn {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
  }
  
  .profile-btn .v-avatar {
    width: 28px !important;
    height: 28px !important;
  }
  
  /* 알림 사이드바 - 모바일에서는 왼쪽 사이드바 제외한 전체 너비 */
  .notification-sidebar {
    width: calc(100vw - 104px) !important;
    margin-left: 104px !important;
  }
  
  .notification-header {
    padding: 12px 8px 8px;
  }
  
  .header-title {
    font-size: 14px;
  }
  
  .notification-count {
    font-size: 9px;
    padding: 2px 5px;
  }
  
  .mark-all-button,
  .clear-all-button {
    font-size: 10px !important;
    padding: 0 8px !important;
    height: 26px !important;
  }
  
  .mark-all-button .v-icon,
  .clear-all-button .v-icon {
    font-size: 12px !important;
  }
  
  .close-button {
    width: 26px !important;
    height: 26px !important;
    min-width: 26px !important;
  }
  
  .filter-tab {
    font-size: 10px;
    padding: 3px 6px;
    min-height: 24px;
    gap: 3px;
  }
  
  .filter-tab .v-icon {
    font-size: 12px !important;
  }
  
  .filter-tab span {
    font-size: 10px !important;
    white-space: nowrap;
  }
  
  .filter-count {
    font-size: 8px;
    padding: 1px 4px;
  }
  
  .notification-card {
    margin: 0 4px 3px;
    padding: 8px 10px;
  }
  
  .icon-wrapper {
    width: 24px;
    height: 24px;
  }
  
  .icon-wrapper .v-icon {
    font-size: 14px !important;
  }
  
  .notification-text {
    font-size: 11px;
    margin-bottom: 4px;
    line-height: 1.3;
  }
  
  .notification-time {
    font-size: 9px;
  }
  
  .priority-badge {
    font-size: 8px;
    padding: 1px 4px;
  }
  
  .action-button {
    width: 22px;
    height: 22px;
  }
  
  .action-button .v-icon {
    font-size: 12px !important;
  }
  
  .empty-state {
    padding: 20px 8px;
  }
  
  .empty-icon .v-icon {
    font-size: 36px !important;
  }
  
  .empty-title {
    font-size: 13px;
  }
  
  .empty-description {
    font-size: 11px;
  }
  
  /* 다이얼로그 */
  .modern-settings-dialog {
    max-width: 100vw !important;
    margin: 0;
    border-radius: 0 !important;
  }
  
  .modern-header {
    padding: 12px 10px 10px;
  }
  
  .header-left-section {
    gap: 8px;
  }
  
  .icon-badge {
    width: 36px;
    height: 36px;
  }
  
  .icon-badge .v-icon {
    font-size: 18px !important;
  }
  
  .main-title {
    font-size: 15px;
  }
  
  .subtitle {
    font-size: 11px;
  }
  
  .modern-close-btn {
    width: 32px !important;
    height: 32px !important;
  }
  
  .tabs-container {
    padding: 6px 10px 0;
  }
  
  .tab-pills {
    gap: 3px;
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab-pill {
    padding: 6px 10px;
    font-size: 11px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .tab-pill .v-icon {
    font-size: 14px !important;
  }
  
  .content-section {
    padding: 10px 12px;
  }
  
  .profile-content {
    padding: 16px 12px;
    gap: 16px;
  }
  
  .project-avatar {
    width: 70px !important;
    height: 70px !important;
  }
  
  .avatar-text {
    font-size: 28px;
  }
  
  .card-label {
    padding: 10px 12px;
    font-size: 12px;
  }
  
  .modern-input :deep(.v-field) {
    font-size: 13px;
  }
  
  .warning-box {
    padding: 16px 12px;
  }
  
  .warning-title {
    font-size: 14px;
  }
  
  .warning-text {
    font-size: 12px;
    line-height: 1.4;
  }
  
  .invite-search-header {
    padding: 12px 10px 10px;
  }
  
  .invite-layout {
    padding: 0 10px 12px;
    min-height: auto;
  }
  
  .invite-panel {
    padding: 12px;
    gap: 10px;
  }
  
  .panel-title {
    font-size: 13px;
  }
  
  .member-name {
    font-size: 12px;
  }
  
  .member-role {
    font-size: 10px;
  }
}

/* 아주 작은 화면 (초소형 모바일) */
@media (max-width: 360px) {
  .app-header {
    height: 52px !important;
  }
  
  .search-container {
    width: 80px;
    max-width: 80px;
    min-width: 60px;
  }
  
  .header-left {
    gap: 1px;
  }
  
  .header-right {
    gap: 0px;
    padding-right: 1px;
  }
  
  .logo-btn {
    font-size: 11px !important;
    padding: 1px 3px !important;
  }
  
  .logo-text {
    font-size: 11px !important;
  }
  
  .notification-btn,
  .project-settings-btn,
  .profile-btn {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
  }
  
  .notification-btn .v-icon,
  .project-settings-btn .v-icon {
    font-size: 18px !important;
  }
  
  .profile-btn .v-avatar {
    width: 24px !important;
    height: 24px !important;
  }
  
  /* 알림 사이드바 - 초소형 모바일에서는 왼쪽 사이드바 제외한 전체 너비 */
  .notification-sidebar {
    width: calc(100vw - 100px) !important;
    margin-left: 100px !important;
  }
  
  .notification-header {
    padding: 10px 6px 6px;
  }
  
  .header-title {
    font-size: 13px;
  }
  
  .notification-count {
    font-size: 8px;
    padding: 1px 4px;
  }
  
  .mark-all-button,
  .clear-all-button {
    font-size: 9px !important;
    padding: 0 6px !important;
    height: 24px !important;
  }
  
  .mark-all-button .v-icon,
  .clear-all-button .v-icon {
    font-size: 10px !important;
  }
  
  .close-button {
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
  }
  
  .filter-tabs {
    gap: 2px;
  }
  
  .filter-tab {
    font-size: 9px;
    padding: 2px 5px;
    min-height: 22px;
    gap: 2px;
  }
  
  .filter-tab .v-icon {
    font-size: 10px !important;
  }
  
  .filter-tab span {
    font-size: 9px !important;
  }
  
  .filter-count {
    font-size: 7px;
    padding: 1px 3px;
  }
  
  .notification-card {
    margin: 0 3px 2px;
    padding: 6px 8px;
  }
  
  .icon-wrapper {
    width: 20px;
    height: 20px;
  }
  
  .icon-wrapper .v-icon {
    font-size: 12px !important;
  }
  
  .notification-text {
    font-size: 10px;
    line-height: 1.2;
  }
  
  .notification-time {
    font-size: 8px;
  }
  
  .priority-badge {
    font-size: 7px;
    padding: 1px 3px;
  }
  
  .action-button {
    width: 20px;
    height: 20px;
  }
  
  .action-button .v-icon {
    font-size: 10px !important;
  }
  
  .empty-state {
    padding: 16px 6px;
  }
  
  .empty-icon .v-icon {
    font-size: 32px !important;
  }
  
  .empty-title {
    font-size: 12px;
  }
  
  .empty-description {
    font-size: 10px;
  }
  
  .tab-pill {
    padding: 5px 8px;
    font-size: 10px;
    gap: 3px;
  }
  
  .tab-pill .v-icon {
    font-size: 12px !important;
  }
  
  .main-title {
    font-size: 14px;
  }
  
  .subtitle {
    font-size: 10px;
  }
  
  /* 다이얼로그 최적화 */
  .modern-settings-dialog {
    max-width: 100vw !important;
  }
  
  .modern-header {
    padding: 10px 8px 8px;
  }
  
  .icon-badge {
    width: 32px;
    height: 32px;
  }
  
  .icon-badge .v-icon {
    font-size: 16px !important;
  }
  
  .modern-close-btn {
    width: 28px !important;
    height: 28px !important;
  }
  
  .content-section {
    padding: 8px 10px;
  }
  
  .profile-content {
    padding: 12px 10px;
  }
  
  .project-avatar {
    width: 60px !important;
    height: 60px !important;
  }
  
  .avatar-text {
    font-size: 24px;
  }
  
  .card-label {
    padding: 8px 10px;
    font-size: 11px;
  }
  
  .modern-input :deep(.v-field) {
    font-size: 12px;
  }
  
  .panel-title {
    font-size: 12px;
  }
  
  .member-name {
    font-size: 11px;
  }
  
  .member-role {
    font-size: 9px;
  }
  
  .warning-title {
    font-size: 13px;
  }
  
  .warning-text {
    font-size: 11px;
    line-height: 1.3;
  }
  
  .toast-content {
    min-width: 260px;
    gap: 10px;
    padding: 10px 14px;
  }
  
  .toast-icon {
    width: 36px;
    height: 36px;
  }
  
  .toast-title {
    font-size: 13px;
  }
  
  .toast-text {
    font-size: 11px;
  }
}

/* 토스트 반응형 추가 */
@media (max-width: 768px) {
  .custom-toast {
    bottom: 24px;
  }
  
  .toast-content {
    min-width: 320px;
    max-width: 85vw;
  }
}

@media (max-width: 480px) {
  .custom-toast {
    bottom: 20px;
  }
  
  .toast-content {
    min-width: 280px;
    max-width: 90vw;
    gap: 12px;
    padding: 14px 16px;
  }
  
  .toast-icon {
    width: 42px;
    height: 42px;
  }
  
  .toast-title {
    font-size: 15px;
  }
  
  .toast-text {
    font-size: 13px;
  }
}

/* 커스텀 토스트 스타일 */
.custom-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  animation: slideUpToast 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
}

@keyframes slideUpToast {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(100px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  min-width: 300px;
  max-width: 90vw;
  width: auto;
  position: relative;
  overflow: hidden;
  background-size: 200% 200%;
  animation: toastGradient 3s ease infinite;
}

.toast-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent);
  animation: toastShimmer 2s infinite;
}

@keyframes toastGradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes toastShimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.toast-success .toast-content {
  background: linear-gradient(135deg,
    #10b981 0%,
    #059669 50%,
    #047857 100%);
}

.toast-error .toast-content {
  background: linear-gradient(135deg,
    #ef4444 0%,
    #dc2626 50%,
    #b91c1c 100%);
}

.toast-warning .toast-content {
  background: linear-gradient(135deg,
    #f59e0b 0%,
    #d97706 50%,
    #b45309 100%);
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  position: relative;
  z-index: 1;
  animation: toastIconPulse 2s ease-in-out infinite;
}

@keyframes toastIconPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
}

.toast-message {
  flex: 1;
  position: relative;
  z-index: 1;
}

.toast-title {
  font-size: 16px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toast-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.toast-close:hover {
  opacity: 1;
  transform: rotate(90deg);
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 토스트 자동 닫기 효과 */
.custom-toast {
  animation: slideUpToast 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) both,
             fadeOutToast 0.3s ease 4.7s both;
}

@keyframes fadeOutToast {
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}

/* 삭제 확인 모달 - 모던 스타일 */
.delete-confirm-card {
  border-radius: 16px !important;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.delete-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.06));
  border-bottom: 1px solid rgba(239, 68, 68, 0.25);
}

.delete-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.delete-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.15);
  color: rgb(var(--v-theme-error));
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.delete-subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.delete-chip {
  font-weight: 700;
}

.delete-body {
  padding: 16px 20px 4px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.delete-warning {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 10px;
}

.delete-warning .warning-text {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.delete-warning ul {
  margin: 8px 0 0 18px;
}

.confirm-input label {
  display: block;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 6px;
}

.name-input :deep(.v-field) {
  border-radius: 10px;
}

.delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.btn-cancel {
  text-transform: none !important;
  font-weight: 600 !important;
}

.btn-delete {
  text-transform: none !important;
  font-weight: 700 !important;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.25) !important;
}

</style>