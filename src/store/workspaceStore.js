import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWorkspaceStore = defineStore('workspace', () => {
  // 현재 선택된 워크스페이스
  const currentWorkspace = ref('personal')
  const currentChannel = ref('dashboard')
  const selectedSubChannel = ref('')

  // 워크스페이스 목록
  const workspaces = ref([
    { id: 'personal', name: '내 워크스페이스', type: 'personal', icon: 'mdi-home' },
    { id: 'team1', name: '스타트업 팀', type: 'team', icon: 'S', members: 6 },
    { id: 'team2', name: '개발팀', type: 'team', icon: 'D', members: 8 },
    { id: 'team3', name: '디자인팀', type: 'team', icon: 'G', members: 4 }
  ])

  // 현재 워크스페이스 정보
  const currentWorkspaceInfo = computed(() => {
    return workspaces.value.find(w => w.id === currentWorkspace.value)
  })

  // 워크스페이스 선택
  const selectWorkspace = (workspaceId) => {
    currentWorkspace.value = workspaceId
    currentChannel.value = 'dashboard'
    selectedSubChannel.value = ''
  }

  // 채널 선택
  const selectChannel = (channelId) => {
    currentChannel.value = channelId
    selectedSubChannel.value = ''
  }

  // 하위 채널 선택
  const selectSubChannel = (parentId, subChannelId) => {
    selectedSubChannel.value = subChannelId
    
    // 팀 채팅의 하위 채널인 경우
    if (parentId === 'chat') {
      currentChannel.value = 'chat'
      window.dispatchEvent(new CustomEvent('select-chat-channel', { 
        detail: { parentId, subChannelId } 
      }))
    }
    // 팀 화상회의의 하위 채널인 경우
    else if (parentId === 'meeting') {
      currentChannel.value = 'meeting'
      window.dispatchEvent(new CustomEvent('select-meeting-channel', { 
        detail: { parentId, subChannelId } 
      }))
    }
    // 팀 일정관리의 하위 채널인 경우
    else if (parentId === 'schedule') {
      currentChannel.value = 'schedule'
      window.dispatchEvent(new CustomEvent('select-schedule-channel', { 
        detail: { parentId, subChannelId } 
      }))
    }
  }

  // 워크스페이스 추가
  const addWorkspace = (workspace) => {
    workspaces.value.push(workspace)
  }

  return {
    // State
    currentWorkspace,
    currentChannel,
    selectedSubChannel,
    workspaces,
    
    // Getters
    currentWorkspaceInfo,
    
    // Actions
    selectWorkspace,
    selectChannel,
    selectSubChannel,
    addWorkspace
  }
})
