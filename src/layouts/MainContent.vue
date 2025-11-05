<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from '@/store/uiStore'
import { emitter } from "@/eventBus";
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
  workspaceSidebarCollapsed: Boolean,
  serverSidebarCollapsed: Boolean,
});

const emit = defineEmits(["navigate-to-channel"]);

// UI Store
const uiStore = useUIStore();

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

// 채널 선택 이벤트 리스너 (meeting 전용)
const handleChannelSelect = (event) => {
  selectedChannel.value = event.detail.subChannelId;
};

// 개인 드라이브로 이동하는 함수
const navigateToPersonalDrive = () => {
  emit("navigate-to-channel", "drive");
};

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
  // chat 채널은 props.selectedSubChannel로만 처리 (중복 방지)
  // WorkspaceSidebar에서 emit("select-subchannel") → MainLayout에서 URL 변경 → props.selectedSubChannel 변경 → initializeFromProps에서 selectedChannel 업데이트
})

onUnmounted(() => {
  window.removeEventListener('select-schedule-channel', handleScheduleSelect)
  window.removeEventListener('select-meeting-channel', handleChannelSelect)
  window.removeEventListener('select-chat-channel', handleChannelSelect)
  window.removeEventListener('resize', handleResize)
})

// 현재 표시할 컴포넌트 결정
const currentComponent = computed(() => {
  if (props.workspaceType === "personal") {
    switch (props.currentChannel) {
      case 'dashboard': return PersonalDashboard
      case 'friends': return PersonalFriends
      case 'drive': return PersonalDrive
      case 'calendar': return PersonalKanbanBoard
      case 'profile': return PersonalProfile
      // case '1-1-chat': return PersonalChat // 1:1 채팅
      case 'chat' : return Chat
      // case '1-1-chat' : return Chat // 없어도 될듯
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
});

// 컨텐츠 영역 스타일
const contentStyle = computed(() => {
  // windowWidth.value를 사용하여 반응형 계산 (화면 크기 변경 감지)
  const screenWidth = windowWidth.value
  let serverSidebarWidth = 72
  let workspaceSidebarWidth = 220
  
  // ServerSidebar가 collapsed 상태이면 너비 0
  if (props.serverSidebarCollapsed) {
    serverSidebarWidth = 0
  }
  
  // 개인 워크스페이스는 항상 펼침, 프로젝트는 collapsed 상태 확인
  if (props.workspaceType === 'personal') {
    workspaceSidebarWidth = 220
  } else if (props.workspaceSidebarCollapsed) {
    // collapsed 상태에서는 72px 너비 유지 (아이콘만 표시)
    workspaceSidebarWidth = 72
  }
  
  // 태블릿 이하에서는 사이드바 너비 조정 (개인 워크스페이스 동작 방식 참고)
  if (screenWidth <= 1024) {
    // ServerSidebar가 collapsed가 아닐 때만 너비 설정
    if (!props.serverSidebarCollapsed) {
      serverSidebarWidth = 60
    }
    if (props.workspaceType === 'personal') {
      workspaceSidebarWidth = 60
    } else if (props.workspaceSidebarCollapsed) {
      // collapsed 상태일 때도 반응형에서는 최소 너비 유지 (아이콘만 표시)
      workspaceSidebarWidth = 60
    } else {
      workspaceSidebarWidth = 60
    }
  }
  if (screenWidth <= 768) {
    // ServerSidebar가 collapsed가 아닐 때만 너비 설정
    if (!props.serverSidebarCollapsed) {
      serverSidebarWidth = 56
    }
    if (props.workspaceType === 'personal') {
      workspaceSidebarWidth = 56
    } else if (props.workspaceSidebarCollapsed) {
      // collapsed 상태일 때도 반응형에서는 최소 너비 유지
      workspaceSidebarWidth = 56
    } else {
      workspaceSidebarWidth = 56
    }
  }
  if (screenWidth <= 480) {
    // ServerSidebar가 collapsed가 아닐 때만 너비 설정
    if (!props.serverSidebarCollapsed) {
      serverSidebarWidth = 52
    }
    if (props.workspaceType === 'personal') {
      workspaceSidebarWidth = 52
    } else if (props.workspaceSidebarCollapsed) {
      // collapsed 상태일 때도 반응형에서는 최소 너비 유지
      workspaceSidebarWidth = 52
    } else {
      workspaceSidebarWidth = 52
    }
  }
  
  const memberSidebarWidth = props.memberSidebarVisible ? 280 : 0
  
  // 모든 화면 크기에서 사이드바 왼쪽 여백 없음
  const sidebarLeftPadding = 0
  
  return {
    marginLeft: `${sidebarLeftPadding + serverSidebarWidth + workspaceSidebarWidth}px`,
    marginRight: `${memberSidebarWidth}px`,
    transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
    width: `calc(100vw - ${sidebarLeftPadding + serverSidebarWidth + workspaceSidebarWidth + memberSidebarWidth}px)`,
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
      :workspace-type="workspaceType"
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
