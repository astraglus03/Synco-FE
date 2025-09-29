import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // 사이드바 상태
  const serverSidebarCollapsed = ref(false)
  const workspaceSidebarCollapsed = ref(false)
  const memberSidebarVisible = ref(false)
  const notificationSidebarVisible = ref(false)

  // 사이드바 토글 함수들
  const toggleServerSidebar = () => {
    serverSidebarCollapsed.value = !serverSidebarCollapsed.value
  }

  const toggleWorkspaceSidebar = () => {
    workspaceSidebarCollapsed.value = !workspaceSidebarCollapsed.value
  }

  const toggleMemberSidebar = () => {
    memberSidebarVisible.value = !memberSidebarVisible.value
  }

  const toggleNotificationSidebar = () => {
    notificationSidebarVisible.value = !notificationSidebarVisible.value
  }

  return {
    // State
    serverSidebarCollapsed,
    workspaceSidebarCollapsed,
    memberSidebarVisible,
    notificationSidebarVisible,
    
    // Actions
    toggleServerSidebar,
    toggleWorkspaceSidebar,
    toggleMemberSidebar,
    toggleNotificationSidebar
  }
})
