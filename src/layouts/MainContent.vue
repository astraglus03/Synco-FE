<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from '@/store/uiStore'
import PersonalDashboard from '@/components/workspace/PersonalDashboard.vue'
import PersonalFriends from '@/components/workspace/PersonalFriends.vue'
import PersonalDrive from '@/components/workspace/PersonalDrive.vue'
import PersonalKanbanBoard from '@/components/workspace/PersonalKanbanBoard.vue'
import ScheduleBoard from '@/components/workspace/ScheduleBoard.vue'
import PersonalProfile from '@/components/workspace/PersonalProfile.vue'
import PersonalChat from '@/components/workspace/PersonalChat.vue'
import Dashboard from '@/components/workspace/Dashboard.vue'
import Chat from '@/components/workspace/Chat.vue'
import Schedule from '@/components/workspace/Schedule.vue'
import ProjectDrive from '@/components/workspace/ProjectDrive.vue'
import TeamMeeting from '@/components/workspace/TeamMeeting.vue'
import MemberSidebar from './MemberSidebar.vue'

const props = defineProps({
  workspaceType: String, // 'personal' 또는 'project'
  currentChannel: String,
  selectedSubChannel: String,
  memberSidebarVisible: Boolean,
  workspaceSidebarCollapsed: Boolean
})

const emit = defineEmits(['navigate-to-channel'])

// UI Store
const uiStore = useUIStore()

// 멤버 사이드바 닫기
const closeMemberSidebar = () => {
  uiStore.memberSidebarVisible = false
}

// 멤버 사이드바 토글
const toggleMemberSidebar = () => {
  uiStore.toggleMemberSidebar()
}

// 선택된 일정 정보
const selectedSchedule = ref('team-schedule')

// 선택된 채널 정보
const selectedChannel = ref('')

// URL에서 subChannel 정보를 읽어와서 초기화
const initializeFromProps = () => {
  if (props.selectedSubChannel) {
    if (props.currentChannel === 'schedule') {
      selectedSchedule.value = props.selectedSubChannel
    } else {
      selectedChannel.value = props.selectedSubChannel
    }
  }
}

// props 변경 감지하여 초기화
watch(() => props.selectedSubChannel, () => {
  initializeFromProps()
}, { immediate: true })

// 일정 선택 이벤트 리스너
const handleScheduleSelect = (event) => {
  selectedSchedule.value = event.detail.subChannelId
}

// 하위 채널 선택 이벤트 리스너
const handleSubChannelSelect = (parentId, subChannelId) => {
  if (parentId === 'schedule') {
    selectedSchedule.value = subChannelId
  }
}

// 채널 선택 이벤트 리스너
const handleChannelSelect = (event) => {
  selectedChannel.value = event.detail.subChannelId
}

// 개인 드라이브로 이동하는 함수
const navigateToPersonalDrive = () => {
  emit('navigate-to-channel', 'drive')
}

// 화면 크기 변경 감지
const windowWidth = ref(window.innerWidth)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('select-schedule-channel', handleScheduleSelect)
  window.addEventListener('select-meeting-channel', handleChannelSelect)
  window.addEventListener('select-chat-channel', handleChannelSelect)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('select-schedule-channel', handleScheduleSelect)
  window.removeEventListener('select-meeting-channel', handleChannelSelect)
  window.removeEventListener('select-chat-channel', handleChannelSelect)
  window.removeEventListener('resize', handleResize)
})

// 현재 표시할 컴포넌트 결정
const currentComponent = computed(() => {
  if (props.workspaceType === 'personal') {
    switch (props.currentChannel) {
      case 'dashboard': return PersonalDashboard
      case 'friends': return PersonalFriends
      case 'drive': return PersonalDrive
      case 'calendar': return PersonalKanbanBoard
      case 'profile': return PersonalProfile
      case '1-1-chat': return PersonalChat // 1:1 채팅
      default: return PersonalDashboard
    }
  } else {
    switch (props.currentChannel) {
      case 'dashboard': return Dashboard
      case 'chat': return Chat
      case 'schedule': 
        // 일정관리 하위 메뉴에 따라 다른 컴포넌트 반환
        if (selectedSchedule.value === 'personal-schedule') {
          return ScheduleBoard
        } else {
          return Schedule
        }
      case 'drive': return ProjectDrive
      case 'meeting': return TeamMeeting
      default: return Dashboard
    }
  }
})

// 컨텐츠 영역 스타일
const contentStyle = computed(() => {
  // windowWidth.value를 사용하여 반응형 계산 (화면 크기 변경 감지)
  const screenWidth = windowWidth.value
  let serverSidebarWidth = 72
  let workspaceSidebarWidth = (props.workspaceType === 'personal' || !props.workspaceSidebarCollapsed) ? 220 : 72
  
  // 태블릿 이하에서는 아이콘만 표시
  if (screenWidth <= 1024) {
    serverSidebarWidth = 60
    workspaceSidebarWidth = props.workspaceSidebarCollapsed ? 0 : 60
  }
  if (screenWidth <= 768) {
    serverSidebarWidth = 56
    workspaceSidebarWidth = props.workspaceSidebarCollapsed ? 0 : 56
  }
  if (screenWidth <= 480) {
    serverSidebarWidth = 52
    workspaceSidebarWidth = props.workspaceSidebarCollapsed ? 0 : 52
  }
  
  const memberSidebarWidth = props.memberSidebarVisible ? 280 : 0
  
  return {
    marginLeft: `${serverSidebarWidth + workspaceSidebarWidth}px`,
    marginRight: `${memberSidebarWidth}px`,
    transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
    width: `calc(100vw - ${serverSidebarWidth + workspaceSidebarWidth + memberSidebarWidth}px)`,
    minWidth: screenWidth <= 768 ? '200px' : '400px'
  }
})
</script>

<template>
  <div class="main-content" :style="contentStyle">
    <!-- 메인 컨텐츠 -->
    <component 
      :is="currentComponent" 
      :current-channel="currentChannel" 
      :selected-schedule="selectedSchedule"
      :selected-channel="selectedChannel"
      :navigate-to-personal-drive="navigateToPersonalDrive"
      @toggle-member-sidebar="toggleMemberSidebar"
    />
    
    <!-- 멤버 사이드바 (프로젝트 워크스페이스일 때만 표시) -->
    <MemberSidebar 
      v-if="workspaceType === 'project' && memberSidebarVisible"
      :visible="memberSidebarVisible"
      @close="closeMemberSidebar"
    />
  </div>
</template>

<style scoped>
.main-content {
  flex: 1;
  min-height: calc(100vh - 60px);
  transition: margin-left 0.3s ease, margin-right 0.3s ease, width 0.3s ease;
  position: relative;
  overflow-x: auto;
  overflow-y: visible;
}

/* 반응형 디자인 */
@media (max-width: 1024px) {
  .main-content {
    min-height: calc(100vh - 56px);
    min-width: 200px !important;
  }
}

@media (max-width: 768px) {
  .main-content {
    min-height: calc(100vh - 56px);
    min-width: 150px !important;
  }
}

@media (max-width: 480px) {
  .main-content {
    min-height: calc(100vh - 56px);
    min-width: 100px !important;
  }
}
</style>
