<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import AppHeader from './AppHeader.vue'
import ServerSidebar from './ServerSidebar.vue'
import WorkspaceSidebar from './WorkspaceSidebar.vue'
import MainContent from './MainContent.vue'
import UserStatus from './UserStatus.vue'
import { usePermissions, PERMISSION_TYPES } from '@/composables/usePermissions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useUIStore } from '@/store/uiStore'
import { useNotificationStore } from '@/store/notificationStore'

// 라우터 사용
const route = useRoute()
const router = useRouter()

const theme = useTheme()

// Store 사용
const workspaceStore = useWorkspaceStore()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()

// 테마 토글 함수
const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

// 현재 테마 상태
const isDark = computed(() => theme.global.current.value.dark)

// 권한 시스템 초기화
const { setUserRole } = usePermissions()

// URL 파라미터 기반 초기화
const initializeFromRoute = () => {
  const workspaceId = route.params.workspaceId || 'personal'
  const channel = route.params.channel || 'dashboard'
  const subChannel = route.params.subChannel || ''
  
  // 워크스페이스 ID로 직접 찾기
  const workspace = workspaceStore.workspaces.find(w => w.id === workspaceId)
  if (workspace) {
    workspaceStore.selectWorkspace(workspace.id)
    workspaceStore.selectChannel(channel)
    workspaceStore.selectedSubChannel = subChannel
    
    // 멤버 사이드바는 기본적으로 닫혀있음 (버튼 클릭 시에만 열림)
    uiStore.memberSidebarVisible = false
    
    // 알림 store에 워크스페이스 타입 동기화
    notificationStore.setWorkspaceType(workspace.type)
    
    // 워크스페이스별 권한 설정 (테스트용)
    if (workspace.type === 'project') {
      setUserRole(PERMISSION_TYPES.MANAGER, workspace.id)
    } else {
      setUserRole(PERMISSION_TYPES.PARTICIPANT, workspace.id)
    }
  }
}

// 초기화 실행
initializeFromRoute()

// URL 변경 감지
watch(() => route.params, () => {
  initializeFromRoute()
}, { deep: true })

// 워크스페이스 선택 (URL 업데이트 포함)
const selectWorkspace = (workspaceId) => {
  const workspace = workspaceStore.workspaces.find(w => w.id === workspaceId)
  
  if (workspace) {
    // 워크스페이스 변경 시 멤버 사이드바 닫기
    uiStore.memberSidebarVisible = false
    
    // URL 업데이트
    router.push(`/workspace/${workspace.id}/dashboard`)
  }
}

// 채널 선택 (URL 업데이트 포함)
const selectChannel = (channelId) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  if (currentWorkspace) {
    router.push(`/workspace/${currentWorkspace.id}/${channelId}`)
  }
}

// 하위 채널 선택 (URL 업데이트 포함)
const selectSubChannel = (parentId, subChannelId) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  if (currentWorkspace) {
    // 하위 채널의 경우 URL에 subChannel 정보 포함
    router.push(`/workspace/${currentWorkspace.id}/${parentId}/${subChannelId}`)
  }
}

// MainContent에서 채널 변경 요청 처리
const handleNavigateToChannel = (channelId) => {
  selectChannel(channelId)
}
</script>

<template>
  <v-app>
    <!-- 헤더 -->
    <AppHeader 
      :is-dark="isDark"
      :current-workspace="workspaceStore.currentWorkspaceInfo"
      :member-sidebar-visible="uiStore.memberSidebarVisible"
      @toggle-theme="toggleTheme"
      @toggle-member-sidebar="uiStore.toggleMemberSidebar"
    />

    <!-- 메인 컨테이너 -->
    <v-main class="main-container">
      <!-- 서버 사이드바 -->
      <ServerSidebar 
        :collapsed="uiStore.serverSidebarCollapsed"
        :workspaces="workspaceStore.workspaces"
        :current-workspace="workspaceStore.currentWorkspace"
        @select-workspace="selectWorkspace"
      />

      <!-- 워크스페이스 사이드바 -->
      <WorkspaceSidebar 
        :collapsed="uiStore.workspaceSidebarCollapsed"
        :workspace-type="workspaceStore.currentWorkspaceInfo?.type"
        :current-channel="workspaceStore.currentChannel"
        :current-workspace-data="workspaceStore.currentWorkspaceInfo"
        :selected-sub-channel="workspaceStore.selectedSubChannel"
        @toggle="uiStore.toggleWorkspaceSidebar"
        @select-channel="selectChannel"
        @select-subchannel="selectSubChannel"
      />

      <!-- 메인 컨텐츠 -->
      <MainContent 
        :workspace-type="workspaceStore.currentWorkspaceInfo?.type"
        :current-channel="workspaceStore.currentChannel"
        :member-sidebar-visible="uiStore.memberSidebarVisible"
        :workspace-sidebar-collapsed="uiStore.workspaceSidebarCollapsed"
        @navigate-to-channel="handleNavigateToChannel"
      />

      <!-- 사용자 상태 (개인 워크스페이스일 때만 표시) -->
      <UserStatus 
        v-if="workspaceStore.currentWorkspaceInfo?.type === 'personal'"
        :collapsed="uiStore.workspaceSidebarCollapsed"
      />
    </v-main>
  </v-app>
</template>

<style scoped>
.main-container {
  display: flex;
  min-height: 100vh;
  padding-top: 60px; /* 헤더 높이만큼 패딩 */
  width: 100vw;
  overflow-x: hidden;
  overflow-y: visible;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .main-container {
    padding-top: 56px;
  }
}
</style>
