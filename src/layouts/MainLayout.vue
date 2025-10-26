<script setup>
import { computed, watch, onMounted } from 'vue'
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

// URL에서 받은 ID를 내부 형식으로 변환 (4 → workspace_4, 8 → chat_8)
const convertToInternalId = (urlId, prefix) => {
  if (!urlId) return urlId
  // 숫자만 있으면 접두사 추가
  if (/^\d+$/.test(urlId)) {
    return `${prefix}_${urlId}`
  }
  // 이미 접두사가 있거나 특수 ID (personal, dashboard 등)는 그대로
  return urlId
}

// 채널 타입을 단수형으로 변환 (chats → chat, meetings → meeting)
const singularizeChannel = (channelType) => {
  if (!channelType) return channelType
  // 복수형이면 단수형으로 변환
  if (channelType.endsWith('s')) {
    return channelType.slice(0, -1)
  }
  return channelType
}

// URL 파라미터 기반 초기화
const initializeFromRoute = async () => {
  const urlWorkspaceId = route.params.workspaceId || 'personal'
  const urlChannel = route.params.channel || 'dashboard'
  const urlSubChannel = route.params.subChannel || ''
  
  // URL ID를 내부 형식으로 변환
  const workspaceId = convertToInternalId(urlWorkspaceId, 'workspace')
  const channel = singularizeChannel(urlChannel)
  const subChannel = urlSubChannel ? convertToInternalId(urlSubChannel, channel) : ''
  
  // 워크스페이스 ID로 직접 찾기
  const workspace = workspaceStore.workspaces.find(w => w.id === workspaceId)
  if (workspace) {
    await workspaceStore.selectWorkspace(workspace.id)
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

// 앱 초기화
onMounted(async () => {
  // 워크스페이스 목록 로드
  await workspaceStore.loadMyWorkspaces()
  
  // 라우트 초기화
  await initializeFromRoute()
})

// URL 변경 감지
watch(() => route.params, async () => {
  await initializeFromRoute()
}, { deep: true })

// ID에서 접두사 제거 (workspace_4 → 4, chat_8 → 8)
const extractId = (fullId) => {
  if (!fullId) return fullId
  // workspace_4, chat_8 등의 형식에서 숫자만 추출
  const match = fullId.match(/_(\d+)$/)
  if (match) {
    return match[1]
  }
  // 접두사가 없으면 그대로 반환 (personal 등)
  return fullId
}

// 채널 타입을 복수형으로 변환 (chat → chats, meeting → meetings)
const pluralizeChannel = (channelType) => {
  if (!channelType) return channelType
  // 이미 복수형이면 그대로 반환
  if (channelType.endsWith('s')) return channelType
  // 복수형으로 변환
  return channelType + 's'
}

// 워크스페이스 선택 (URL 업데이트 포함)
const selectWorkspace = (workspaceId) => {
  const workspace = workspaceStore.workspaces.find(w => w.id === workspaceId)
  
  if (workspace) {
    // 워크스페이스 변경 시 멤버 사이드바 닫기
    uiStore.memberSidebarVisible = false
    
    // URL 업데이트 (workspace_4 → 4)
    const cleanId = extractId(workspace.id)
    router.push(`/workspaces/${cleanId}/dashboard`)
  }
}

// 채널 선택 (URL 업데이트 포함)
const selectChannel = (channelId) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  if (currentWorkspace) {
    const cleanWorkspaceId = extractId(currentWorkspace.id)
    const cleanChannelId = pluralizeChannel(channelId)
    router.push(`/workspaces/${cleanWorkspaceId}/${cleanChannelId}`)
  }
}

// 하위 채널 선택 (URL 업데이트 포함)
const selectSubChannel = (parentId, subChannelId) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  if (currentWorkspace) {
    // 하위 채널의 경우 URL에 subChannel 정보 포함
    router.push(`/workspace/${currentWorkspace.id}/${parentId}/${subChannelId}`)
    
    // MainContent에 하위 채널 선택 이벤트 전달
    if (parentId === 'schedule') {
      window.dispatchEvent(new CustomEvent('select-schedule-channel', { 
        detail: { subChannelId } 
      }))
    }
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
