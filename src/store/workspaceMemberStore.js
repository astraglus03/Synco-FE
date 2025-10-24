import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  getWorkspaceMembers,
  getChatChannels,
  getMeetingChannels,
  getScheduleChannels,
  changeChatChannelAuthority,
  changeScheduleChannelAuthority,
  changeMeetingChannelAuthority
} from '@/services/WorkspaceService'
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
      
      members.value = memberData || []
      currentWorkspaceSeq.value = workSpaceSeq
      
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

      // 각 채널을 개별적으로 로드
      const [chatData, meetingData, scheduleData] = await Promise.allSettled([
        getChatChannels(workSpaceSeq),
        getMeetingChannels(workSpaceSeq),
        getScheduleChannels(workSpaceSeq)
      ])

      // 채널 데이터 업데이트
      chatChannels.value = chatData.status === 'fulfilled' ? chatData.value : []
      meetingChannels.value = meetingData.status === 'fulfilled' ? meetingData.value : []
      scheduleChannels.value = scheduleData.status === 'fulfilled' ? scheduleData.value : []

    } catch (error) {
      console.error('채널 데이터 로드 실패:', error)
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
    clearMembers
  }
})
