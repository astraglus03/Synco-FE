import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  getWorkspaceMembers,
  getChatChannels,
  changeChatChannelAuthority,
  changeScheduleChannelAuthority,
  changeMeetingChannelAuthority
} from '@/api/workspace/workSpaceApi'
import { Authority } from '@/models/workspace/WorkspaceModels'

export const useWorkspaceMemberStore = defineStore('workspaceMember', () => {
  // State
  const members = ref([])
  const chatChannels = ref([])
  const meetingChannels = ref([])
  const scheduleChannels = ref([])
  const isLoading = ref(false)
  const currentWorkspaceSeq = ref(null)

  // Getters
  const memberCount = computed(() => members.value.length)
  
  const superMembers = computed(() => 
    members.value.filter(member => member.authority === Authority.SUPER)
  )
  
  const managerMembers = computed(() => 
    members.value.filter(member => member.authority === Authority.MANAGER)
  )
  
  const participantMembers = computed(() => 
    members.value.filter(member => member.authority === Authority.PARTICIPANT)
  )

  // 현재 사용자 권한 확인 함수
  const getCurrentUserAuthority = (authStore) => {
    if (!authStore?.memberSeq || !Array.isArray(members.value)) {
      return null
    }
    
    const currentUser = members.value.find(member => 
      Number(member.memberSeq) === Number(authStore.memberSeq)
    )
    return currentUser?.authority || null
  }
  
  // 권한 확인 함수들
  const isCurrentUserSuper = (authStore) => 
    getCurrentUserAuthority(authStore) === Authority.SUPER
  
  const isCurrentUserManager = (authStore) => 
    getCurrentUserAuthority(authStore) === Authority.MANAGER
  
  const isCurrentUserParticipant = (authStore) => 
    getCurrentUserAuthority(authStore) === Authority.PARTICIPANT

  // 권한 확인 computed
  const canCreateChannel = (authStore) => {
    const authority = getCurrentUserAuthority(authStore)
    return authority === Authority.SUPER || authority === Authority.MANAGER
  }

  const canManageChannel = (authStore) => {
    const authority = getCurrentUserAuthority(authStore)
    return authority === Authority.SUPER || authority === Authority.MANAGER
  }

  // Actions
  const loadWorkspaceMembers = async (workSpaceSeq) => {
    if (!workSpaceSeq) {
      console.error('워크스페이스 seq가 없습니다.')
      return
    }

    try {
      isLoading.value = true
      
      const memberData = await getWorkspaceMembers(workSpaceSeq)
      
      // 반응성을 확실하게 트리거하기 위해 새 배열로 할당
      members.value = Array.isArray(memberData) ? [...memberData] : []
      currentWorkspaceSeq.value = workSpaceSeq
      
      console.log('🔄 워크스페이스 멤버 스토어 업데이트:', members.value.length, '명')
      
    } catch (error) {
      console.error('워크스페이스 멤버 로드 실패:', error)
      members.value = []
    } finally {
      isLoading.value = false
    }
  }

  const loadChannels = async (workSpaceSeq) => {
    if (!workSpaceSeq) {
      console.error('워크스페이스 seq가 없습니다.')
      return
    }

    try {
      isLoading.value = true
      console.log('[WorkspaceMemberStore] loadChannels called with workSpaceSeq:', workSpaceSeq)

      // chat 채널만 로드 (task/channels, virtual-meeting/channels는 호출하지 않음)
      try {
        const chatData = await getChatChannels(workSpaceSeq)
        chatChannels.value = Array.isArray(chatData) ? chatData : []
        
        // 디버그 로그
        const chatCount = chatChannels.value.length
        const chatMemberCount = chatChannels.value?.[0]?.channelMemberList?.length || 0
        console.log('[WorkspaceMemberStore] chatChannels loaded:', { channels: chatCount, firstChannelMembers: chatMemberCount })
      } catch (error) {
        console.error('[WorkspaceMemberStore] chatChannels 로드 실패:', error)
        chatChannels.value = []
      }

      // meetingChannels와 scheduleChannels는 빈 배열로 유지 (API 호출하지 않음)
      meetingChannels.value = []
      scheduleChannels.value = []

    } catch (error) {
      console.error('채널 데이터 로드 실패:', error)
      chatChannels.value = []
    } finally {
      isLoading.value = false
    }
  }

  const updateMemberAuthority = (memberSeq, authority) => {
    if (!Array.isArray(members.value)) return
    
    const member = members.value.find(m => 
      Number(m.memberSeq) === Number(memberSeq)
    )
    if (member) {
      member.authority = authority
    }
  }

  const updateChannelMemberAuthority = async (channelType, workSpaceSeq, memberSeq, authority) => {
    try {
      let result
      
      switch (channelType) {
        case 'chat':
          // 채팅 채널의 경우 첫 번째 채널의 channelSeq 사용
          const channelSeq = chatChannels.value[0]?.channelSeq
          if (!channelSeq) throw new Error('채팅 채널을 찾을 수 없습니다.')
          result = await changeChatChannelAuthority(workSpaceSeq, memberSeq, channelSeq, authority)
          break
        case 'schedule':
          result = await changeScheduleChannelAuthority(workSpaceSeq, memberSeq, authority)
          break
        case 'meeting':
          result = await changeMeetingChannelAuthority(workSpaceSeq, memberSeq, authority)
          break
        default:
          throw new Error('지원하지 않는 채널 타입입니다.')
      }

      // 채널 데이터 새로고침 (각 채널별 멤버 권한이 업데이트됨)
      await loadChannels(workSpaceSeq)
      
      return result
    } catch (error) {
      console.error('채널 멤버 권한 변경 실패:', error)
      throw error
    }
  }

  const clearMembers = () => {
    members.value = []
    chatChannels.value = []
    meetingChannels.value = []
    scheduleChannels.value = []
    currentWorkspaceSeq.value = null
  }

  /**
   * 멤버 상태 업데이트 (SSE member-status 이벤트에서 호출)
   */
  const updateMemberStatus = (memberSeq, activeStatus) => {
    if (!Array.isArray(members.value)) return
    
    // 워크스페이스 멤버 목록에서 상태 업데이트
    const member = members.value.find(m => 
      Number(m.memberSeq) === Number(memberSeq)
    )
    
    if (member) {
      // activeStatus 직접 업데이트
      member.activeStatus = activeStatus
      
      // uiStatus는 activeStatus를 소문자로 변환한 값 (MemberSidebar에서 사용)
      member.uiStatus = activeStatus.toLowerCase()
      
      console.log('[WorkspaceMemberStore] ✅ 멤버 상태 업데이트:', {
        memberSeq,
        name: member.name,
        activeStatus,
        uiStatus: member.uiStatus
      })
    } else {
      console.log('[WorkspaceMemberStore] ℹ️ 상태 변경된 멤버가 현재 워크스페이스에 없음:', memberSeq)
    }
    
    // 채널 멤버 목록에서도 상태 업데이트 (chat 채널만 처리)
    const updateChannelMemberStatus = (channelList) => {
      if (!Array.isArray(channelList)) return
      
      channelList.forEach(channel => {
        if (channel.channelMemberList && Array.isArray(channel.channelMemberList)) {
          const channelMember = channel.channelMemberList.find(cm =>
            Number(cm.memberSeq) === Number(memberSeq)
          )
          if (channelMember) {
            channelMember.activeStatus = activeStatus
            // participantStatus도 업데이트 (회의 등에서 사용)
            if (channelMember.participantStatus !== undefined) {
              channelMember.participantStatus = activeStatus
            }
          }
        }
      })
    }
    
    // chat 채널만 업데이트 (meeting, schedule은 API 호출하지 않으므로 업데이트 안 함)
    updateChannelMemberStatus(chatChannels.value)
  }

  return {
    // State
    members,
    chatChannels,
    meetingChannels,
    scheduleChannels,
    isLoading,
    currentWorkspaceSeq,
    
    // Getters
    memberCount,
    superMembers,
    managerMembers,
    participantMembers,
    
    // Helper functions
    getCurrentUserAuthority,
    isCurrentUserSuper,
    isCurrentUserManager,
    isCurrentUserParticipant,
    canCreateChannel,
    canManageChannel,
    
    // Actions
    loadWorkspaceMembers,
    loadChannels,
    updateMemberAuthority,
    updateChannelMemberAuthority,
    clearMembers,
    updateMemberStatus
  }
})
