<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/store/uiStore'
import PersonalDashboard from '@/components/workspace/PersonalDashboard.vue'
import PersonalFriends from '@/components/workspace/PersonalFriends.vue'
import PersonalDrive from '@/components/workspace/PersonalDrive.vue'
import PersonalCalendar from '@/components/workspace/PersonalCalendar.vue'
import PersonalSchedule from '@/components/workspace/PersonalSchedule.vue'
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

// 선택된 일정 정보
const selectedSchedule = ref('team-schedule')

// 선택된 채널 정보
const selectedChannel = ref('')

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

onMounted(() => {
  window.addEventListener('select-schedule-channel', handleScheduleSelect)
  window.addEventListener('select-meeting-channel', handleChannelSelect)
  window.addEventListener('select-chat-channel', handleChannelSelect)
})

onUnmounted(() => {
  window.removeEventListener('select-schedule-channel', handleScheduleSelect)
  window.removeEventListener('select-meeting-channel', handleChannelSelect)
  window.removeEventListener('select-chat-channel', handleChannelSelect)
})

// 현재 표시할 컴포넌트 결정
const currentComponent = computed(() => {
  if (props.workspaceType === 'personal') {
    switch (props.currentChannel) {
      case 'dashboard': return PersonalDashboard
      case 'friends': return PersonalFriends
      case 'drive': return PersonalDrive
      case 'calendar': return PersonalCalendar
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
          return PersonalSchedule
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
  const serverSidebarWidth = 72
  // 개인 워크스페이스일 때는 항상 확장된 상태로 계산
  const workspaceSidebarWidth = (props.workspaceType === 'personal' || !props.workspaceSidebarCollapsed) ? 260 : 72
  const memberSidebarWidth = props.memberSidebarVisible ? 280 : 0
  
  return {
    marginLeft: `${serverSidebarWidth + workspaceSidebarWidth}px`,
    marginRight: `${memberSidebarWidth}px`,
    transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
    width: `calc(100vw - ${serverSidebarWidth + workspaceSidebarWidth + memberSidebarWidth}px)`,
    minWidth: '400px'
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
@media (max-width: 1200px) {
  .main-content {
    margin-left: 72px !important;
    margin-right: 0 !important;
    width: calc(100vw - 72px) !important;
  }
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 60px !important;
    width: calc(100vw - 60px) !important;
  }
}
</style>
