import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { meetingApi } from '@/api/meeting/meetingApi'
import { 
  RoomStatus, 
  Authority,
  RoomCreateReqDto,
  ChatMessageReq,
  RoomSessionResDto,
  RoomActiveListDto,
  ChatMessageRes,
  ChannelInfoResDto,
  MemberInfoDto,
  PermissionUtils,
  StatusUtils
} from '@/models/meeting/MeetingModels'

export const useMeetingStore = defineStore('meeting', () => {
  // 상태
  const channels = ref([])
  const activeRooms = ref([])
  const currentChannel = ref(null)
  const currentRoom = ref(null)
  const channelMembers = ref([])
  const workSpaceMembers = ref([])
  const chatMessages = ref([])
  
  // 현재 미팅 상태
  const isCurrentlyInMeeting = ref(false)
  const currentMeetingData = ref(null)
  const livekitToken = ref(null)
  const livekitRoomName = ref(null)
  
  // 현재 사용자 정보
  const currentMemberSeq = ref(null)
  const currentAuthority = ref(null)
  const currentWorkSpaceSeq = ref(null)
  
  // 로딩 상태
  const isLoading = ref(false)
  const isJoining = ref(false)
  const isCreating = ref(false)
  
  // 에러 상태
  const error = ref(null)

  // 계산된 속성
  const currentChannelMembers = computed(() => {
    if (!currentChannel.value) return []
    return channelMembers.value.filter(member => 
      member.channelSeq === currentChannel.value.channelSeq
    )
  })
  
  const canCreateRoom = computed(() => {
    return PermissionUtils.canCreateRoom(currentAuthority.value)
  })
  
  const canManageMembers = computed(() => {
    return PermissionUtils.canManageMembers(currentAuthority.value)
  })
  
  const canChangeAuthority = computed(() => {
    return PermissionUtils.canChangeAuthority(currentAuthority.value)
  })
  
  const canJoinRoom = computed(() => {
    return PermissionUtils.canJoinRoom(currentAuthority.value) && !isCurrentlyInMeeting.value
  })
  
  const canSendMessage = computed(() => {
    return PermissionUtils.canSendMessage(currentAuthority.value)
  })
  
  const activeRoomsInCurrentChannel = computed(() => {
    if (!currentChannel.value) return []
    return activeRooms.value.filter(room => 
      room.channelSeq === currentChannel.value.channelSeq
    )
  })

  // 액션
  const setCurrentUser = (memberSeq, authority, workSpaceSeq) => {
    currentMemberSeq.value = memberSeq
    currentAuthority.value = authority
    currentWorkSpaceSeq.value = workSpaceSeq
  }

  const loadChannels = async (workSpaceSeq) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await meetingApi.getChannels(workSpaceSeq)
      channels.value = response.data.map(channel => new ChannelInfoResDto(channel))
      
      return channels.value
    } catch (err) {
      error.value = err.message || '채널 목록을 불러오는데 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const loadActiveRooms = async (channelSeq) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await meetingApi.getActiveRooms(channelSeq, currentMemberSeq.value)
      activeRooms.value = response.data.content.map(room => new RoomActiveListDto(room))
      
      return activeRooms.value
    } catch (err) {
      error.value = err.message || '활성 회의 목록을 불러오는데 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const loadWorkSpaceMembers = async (workSpaceSeq) => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await meetingApi.getWorkSpaceMembers(workSpaceSeq)
      workSpaceMembers.value = response.data.map(member => new MemberInfoDto(member))
      
      return workSpaceMembers.value
    } catch (err) {
      error.value = err.message || '워크스페이스 멤버 목록을 불러오는데 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createRoom = async (roomName, description = '', alarmMemberList = []) => {
    try {
      isCreating.value = true
      error.value = null
      
      const roomCreateReqDto = new RoomCreateReqDto(roomName, description, alarmMemberList)
      const response = await meetingApi.createRoom(currentMemberSeq.value, roomCreateReqDto)
      const roomSession = new RoomSessionResDto(response.data)
      
      // 현재 미팅 상태 설정
      isCurrentlyInMeeting.value = true
      currentMeetingData.value = {
        roomId: roomSession.roomId,
        roomName: roomName,
        description: description,
        isHost: true
      }
      
      // LiveKit 토큰 저장
      livekitToken.value = roomSession.livekitToken
      livekitRoomName.value = roomSession.livekitRoomName
      
      // 새 탭에서 미팅 열기
      openMeetingInNewTab({
        roomId: roomSession.roomId,
        roomName: roomName,
        livekitToken: roomSession.livekitToken,
        livekitRoomName: roomSession.livekitRoomName,
        isHost: true
      })
      
      return roomSession
    } catch (err) {
      error.value = err.message || '화상회의 생성에 실패했습니다.'
      throw err
    } finally {
      isCreating.value = false
    }
  }

  const joinRoom = async (roomId) => {
    try {
      isJoining.value = true
      error.value = null
      
      const response = await meetingApi.joinRoom(currentMemberSeq.value, roomId)
      const roomSession = new RoomSessionResDto(response.data)
      
      // 현재 미팅 상태 설정
      isCurrentlyInMeeting.value = true
      currentMeetingData.value = {
        roomId: roomSession.roomId,
        isHost: false
      }
      
      // LiveKit 토큰 저장
      livekitToken.value = roomSession.livekitToken
      livekitRoomName.value = roomSession.livekitRoomName
      
      // 새 탭에서 미팅 참여
      openMeetingInNewTab({
        roomId: roomSession.roomId,
        livekitToken: roomSession.livekitToken,
        livekitRoomName: roomSession.livekitRoomName,
        isHost: false
      })
      
      return roomSession
    } catch (err) {
      error.value = err.message || '화상회의 참여에 실패했습니다.'
      throw err
    } finally {
      isJoining.value = false
    }
  }

  const cancelRoom = async (roomId) => {
    try {
      error.value = null
      
      await meetingApi.cancelRoom(currentMemberSeq.value, roomId)
      
      // 현재 미팅 상태 초기화
      isCurrentlyInMeeting.value = false
      currentMeetingData.value = null
      livekitToken.value = null
      livekitRoomName.value = null
      
      return true
    } catch (err) {
      error.value = err.message || '화상회의 취소에 실패했습니다.'
      throw err
    }
  }

  const loadChatMessages = async (roomId, page = 0, size = 10) => {
    try {
      const response = await meetingApi.getMessages(currentMemberSeq.value, roomId, page, size)
      chatMessages.value = response.data.content.map(message => new ChatMessageRes(message))
      
      return chatMessages.value
    } catch (err) {
      console.error('채팅 메시지 로드 실패:', err)
      return []
    }
  }

  const sendChatMessage = async (roomId, content) => {
    try {
      error.value = null
      
      const chatMessageReq = new ChatMessageReq(
        currentMemberSeq.value.toString(),
        '사용자', // 실제로는 사용자 이름을 가져와야 함
        content
      )
      
      await meetingApi.sendMessage(currentMemberSeq.value, roomId, chatMessageReq)
      
      return true
    } catch (err) {
      error.value = err.message || '메시지 전송에 실패했습니다.'
      throw err
    }
  }

  const addMemberToChannel = async (memberList) => {
    try {
      error.value = null
      
      const channelInviteReqDto = new ChannelInviteReqDto(currentWorkSpaceSeq.value, memberList)
      const response = await meetingApi.addMember(currentMemberSeq.value, channelInviteReqDto)
      
      // 채널 멤버 목록 새로고침
      await loadChannels(currentWorkSpaceSeq.value)
      
      return response.data
    } catch (err) {
      error.value = err.message || '멤버 추가에 실패했습니다.'
      throw err
    }
  }

  const changeChannelAuthority = async (grantMemberSeq, authority) => {
    try {
      error.value = null
      
      const grantAuthorityReqDto = new GrantAuthorityReqDto(
        currentWorkSpaceSeq.value,
        grantMemberSeq,
        currentChannel.value?.channelSeq,
        authority
      )
      
      const response = await meetingApi.changeChannelAuthority(currentMemberSeq.value, grantAuthorityReqDto)
      
      // 채널 멤버 목록 새로고침
      await loadChannels(currentWorkSpaceSeq.value)
      
      return response.data
    } catch (err) {
      error.value = err.message || '권한 변경에 실패했습니다.'
      throw err
    }
  }

  const delegateSuperAuthority = async (delegateMemberSeq) => {
    try {
      error.value = null
      
      const delegateSuperAuthorityReqDto = new DelegateSuperAuthorityReqDto(
        currentWorkSpaceSeq.value,
        delegateMemberSeq
      )
      
      const response = await meetingApi.delegateSuperAuthority(currentMemberSeq.value, delegateSuperAuthorityReqDto)
      
      // 채널 멤버 목록 새로고침
      await loadChannels(currentWorkSpaceSeq.value)
      
      return response.data
    } catch (err) {
      error.value = err.message || 'SUPER 권한 위임에 실패했습니다.'
      throw err
    }
  }

  const kickMemberFromWorkSpace = async (memberSeq) => {
    try {
      error.value = null
      
      const kickMemberFromWorkSpaceReqDto = new KickMemberFromWorkSpaceReqDto(
        currentWorkSpaceSeq.value,
        memberSeq
      )
      
      await meetingApi.kickMember(kickMemberFromWorkSpaceReqDto)
      
      // 채널 멤버 목록 새로고침
      await loadChannels(currentWorkSpaceSeq.value)
      
      return true
    } catch (err) {
      error.value = err.message || '멤버 강제 탈퇴에 실패했습니다.'
      throw err
    }
  }

  const leaveWorkSpace = async () => {
    try {
      error.value = null
      
      await meetingApi.leaveWorkSpace(currentWorkSpaceSeq.value, currentMemberSeq.value)
      
      // 상태 초기화
      reset()
      
      return true
    } catch (err) {
      error.value = err.message || '워크스페이스 탈퇴에 실패했습니다.'
      throw err
    }
  }

  // 새 탭에서 미팅 열기
  const openMeetingInNewTab = (meetingData) => {
    const meetingUrl = `/meeting/${meetingData.roomId}`
    const newWindow = window.open(meetingUrl, '_blank', 'width=1200,height=800')
    
    if (!newWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.')
      return false
    }
    
    return true
  }

  // 미팅 종료 (Store에서만 호출)
  const endMeetingFromStore = () => {
    isCurrentlyInMeeting.value = false
    currentMeetingData.value = null
    livekitToken.value = null
    livekitRoomName.value = null
  }

  // 채널 선택
  const selectChannel = (channel) => {
    currentChannel.value = channel
    // 활성 회의 목록 로드
    if (channel) {
      loadActiveRooms(channel.channelSeq)
    }
  }

  // 에러 초기화
  const clearError = () => {
    error.value = null
  }

  // 상태 초기화
  const reset = () => {
    channels.value = []
    activeRooms.value = []
    currentChannel.value = null
    currentRoom.value = null
    channelMembers.value = []
    workSpaceMembers.value = []
    chatMessages.value = []
    isCurrentlyInMeeting.value = false
    currentMeetingData.value = null
    livekitToken.value = null
    livekitRoomName.value = null
    currentMemberSeq.value = null
    currentAuthority.value = null
    currentWorkSpaceSeq.value = null
    isLoading.value = false
    isJoining.value = false
    isCreating.value = false
    error.value = null
  }

  return {
    // 상태
    channels,
    activeRooms,
    currentChannel,
    currentRoom,
    channelMembers,
    workSpaceMembers,
    chatMessages,
    isCurrentlyInMeeting,
    currentMeetingData,
    livekitToken,
    livekitRoomName,
    currentMemberSeq,
    currentAuthority,
    currentWorkSpaceSeq,
    isLoading,
    isJoining,
    isCreating,
    error,
    
    // 계산된 속성
    currentChannelMembers,
    canCreateRoom,
    canManageMembers,
    canChangeAuthority,
    canJoinRoom,
    canSendMessage,
    activeRoomsInCurrentChannel,
    
    // 액션
    setCurrentUser,
    loadChannels,
    loadActiveRooms,
    loadWorkSpaceMembers,
    createRoom,
    joinRoom,
    cancelRoom,
    loadChatMessages,
    sendChatMessage,
    addMemberToChannel,
    changeChannelAuthority,
    delegateSuperAuthority,
    kickMemberFromWorkSpace,
    leaveWorkSpace,
    openMeetingInNewTab,
    endMeetingFromStore,
    selectChannel,
    clearError,
    reset
  }
})
