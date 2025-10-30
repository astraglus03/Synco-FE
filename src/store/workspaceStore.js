import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMyWorkspaces, getPersonalWorkspace } from '@/api/workspace/workSpaceApi'
import { Authority } from '@/models/workspace/WorkspaceModels'

export const useWorkspaceStore = defineStore('workspace', () => {
  // 현재 선택된 워크스페이스
  const currentWorkspace = ref('personal')
  const currentChannel = ref('dashboard')
  const selectedSubChannel = ref('')

  // 현재 워크스페이스의 권한 (SUPER or PARTICIPANT)
  const currentAuthority = ref(null)

  // 워크스페이스 목록
  const workspaces = ref([
    { id: 'personal', name: '내 워크스페이스', type: 'personal', icon: 'mdi-home' }
  ])

  // 현재 워크스페이스 정보
  const currentWorkspaceInfo = computed(() => {
    return workspaces.value.find(w => w.id === currentWorkspace.value)
  })

  // 워크스페이스 선택
  const selectWorkspace = async (workspaceId) => {
    currentWorkspace.value = workspaceId
    currentChannel.value = 'dashboard'
    selectedSubChannel.value = ''
    
    // 개인 워크스페이스인 경우 권한 초기화
    const workspace = workspaces.value.find(w => w.id === workspaceId)
    if (!workspace || workspace.type !== 'project') {
      currentAuthority.value = null
    }
    // 프로젝트 워크스페이스의 경우 권한은 멤버 목록에서 가져옴
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

  // 개인 워크스페이스 로드
  const loadPersonalWorkspace = async () => {
    try {
      const personalWorkspace = await getPersonalWorkspace()
      
      if (personalWorkspace) {
        console.log('✅ [개인WS Store] 로드 성공, Seq:', personalWorkspace.workSpaceSeq)
        
        // 기존 personal 워크스페이스 제거하고 새로 추가
        const projectWorkspaces = workspaces.value.filter(w => w.type === 'project')
        
        workspaces.value = [
          {
            id: 'personal',
            workSpaceSeq: personalWorkspace.workSpaceSeq,
            name: '내 워크스페이스',
            type: 'personal',
            icon: 'mdi-home'
          },
          ...projectWorkspaces
        ]
        
        return personalWorkspace
      } else {
        console.warn('⚠️ [개인WS Store] 응답이 null입니다')
      }
      
      return null
    } catch (error) {
      console.error('❌ [개인WS Store] 로딩 실패:', error.response?.data || error.message)
      return null
    }
  }

  // 내 워크스페이스 목록 로드
  const loadMyWorkspaces = async () => {
    try {
      // 1. 개인 워크스페이스 로드
      const personal = await loadPersonalWorkspace()
      
      // 2. 프로젝트 워크스페이스 목록 로드
      const workspaceList = await getMyWorkspaces()
      
      // 기존 personal 워크스페이스 유지
      const personalWorkspace = workspaces.value.find(w => w.type === 'personal')
      
      // API에서 가져온 워크스페이스를 모두 표시
      const apiWorkspaces = workspaceList.map(ws => ({
        id: `workspace_${ws.workSpaceSeq}`,
        workSpaceSeq: ws.workSpaceSeq,
        name: ws.workSpaceName,
        type: 'project',
        profile: ws.thumbnailImageUrl,
        icon: ws.iconText,
        startDate: ws.startDate || ws.projectStartDate,
        endDate: ws.endDate || ws.projectEndDate
      }))
      
      workspaces.value = personalWorkspace 
        ? [personalWorkspace, ...apiWorkspaces]
        : apiWorkspaces
        
      return workspaceList
    } catch (error) {
      console.error('워크스페이스 목록 로딩 실패:', error)
      return []
    }
  }


  return {
    // State
    currentWorkspace,
    currentChannel,
    selectedSubChannel,
    currentAuthority,
    workspaces,
    
    // Getters
    currentWorkspaceInfo,
    
    // Actions
    selectWorkspace,
    selectChannel,
    selectSubChannel,
    addWorkspace,
    loadPersonalWorkspace,
    loadMyWorkspaces
  }
})
