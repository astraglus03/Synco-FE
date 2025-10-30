import { apiGet, apiPost, apiPatch, apiDelete, apiPostFormData, apiPatchFormData } from '@/utils/api'
import { 
  TeamWorkSpaceCreateReqDto,
  TeamWorkSpaceEditReqDto,
  WorkSpaceResDto,
  WorkSpaceInfoResDto,
  WorkSpaceMemberInfoResDto,
  DelegateSuperAuthorityReqDto,
  GrantAuthorityReqDto,
  ChannelEditReqDto,
  ChannelCreateReqDto,
  ChannelInfoResDto,
  ChannelMemberResDto,
  Authority
} from '@/models/workspace/WorkspaceModels'
import { useNotificationStore } from '@/store/notificationStore'

// 알림 갱신 헬퍼 함수
const refreshNotifications = async () => {
  try {
    const notificationStore = useNotificationStore()
    await notificationStore.fetchNotifications()
  } catch (error) {
    console.error('[Workspace API] 알림 갱신 실패:', error)
  }
}

// ----------------------
// 워크스페이스 생성 API
// ----------------------
export const createWorkspace = async (workSpaceName, workSpaceThumbnailImage, memberList) => {
  const reqDto = new TeamWorkSpaceCreateReqDto(workSpaceName, workSpaceThumbnailImage, memberList)
  const formData = reqDto.toFormData()
  
  const res = await apiPostFormData('/workspace-service/workspace/create', formData)
  // 프로젝트 생성 시 알림 갱신 (백그라운드에서 실행, 실패해도 무시)
  refreshNotifications().catch(() => {})
  return WorkSpaceResDto.fromJson(res)
}

// ----------------------
// 개인 워크스페이스 조회 API
// ----------------------
export const getPersonalWorkspace = async () => {
  try {
    const res = await apiGet('/workspace-service/workspace/personal')
    console.log('📦 [개인WS API] 응답:', res)
    
    // 응답이 객체인 경우 DTO로 변환
    if (res && typeof res === 'object') {
      const dto = WorkSpaceInfoResDto.fromJson(res)
      console.log('✅ [개인WS API] Seq:', dto.workSpaceSeq)
      return dto
    }
    
    console.warn('⚠️ [개인WS API] 응답이 객체가 아닙니다')
    return null
  } catch (error) {
    console.error('❌ [개인WS API] 조회 실패:', error.response?.data || error.message)
    throw error
  }
}

// ----------------------
// 내 워크스페이스 목록 조회 API (프로젝트 워크스페이스)
// ----------------------
export const getMyWorkspaces = async () => {
  const res = await apiGet('/workspace-service/workspace/me')
  
  // 배열 응답 처리
  if (Array.isArray(res)) {
    return res.map(workspace => WorkSpaceInfoResDto.fromJson(workspace))
  }
  
  return []
}

// ----------------------
// 워크스페이스 멤버 목록 조회 API
// ----------------------
export const getWorkspaceMembers = async (workSpaceSeq) => {
  const res = await apiGet(`/workspace-service/workspace/${workSpaceSeq}/members`)
  
  // 배열 응답 처리
  if (Array.isArray(res)) {
    return res.map(member => WorkSpaceMemberInfoResDto.fromJson(member))
  }
  
  return []
}


// ----------------------
// 워크스페이스 수정 API
// ----------------------
export const updateWorkspace = async (workSpaceSeq, workSpaceName, workSpaceThumbnailImage) => {
  const reqDto = new TeamWorkSpaceEditReqDto(workSpaceSeq, workSpaceName, workSpaceThumbnailImage)
  const formData = reqDto.toFormData()
  
  const res = await apiPatchFormData('/workspace-service/workspace/edit', formData)
  return WorkSpaceResDto.fromJson(res)
}

// ----------------------
// 워크스페이스 삭제 API
// ----------------------
export const deleteWorkspace = async (workSpaceSeq) => {
  const res = await apiDelete(`/workspace-service/workspace/${workSpaceSeq}`)
  return res
}

// ----------------------
// 워크스페이스 멤버 초대 API
// ----------------------
export const inviteWorkspaceMembers = async (workSpaceSeq, memberList, channelSeq = null) => {
  const reqDto = {
    channelSeq: channelSeq,
    workSpaceSeq: workSpaceSeq,
    memberList: memberList
  }
  const res = await apiPost('/workspace-service/workspace/invite', reqDto)
  // 프로젝트 초대 시 알림 갱신 (백그라운드에서 실행, 실패해도 무시)
  refreshNotifications().catch(() => {})
  return res
}

// ----------------------
// 워크스페이스 멤버 강제 탈퇴 API
// ----------------------
export const kickWorkspaceMember = async (workSpaceSeq, memberSeq) => {
  const reqDto = {
    workSpaceSeq: workSpaceSeq,
    memberSeq: memberSeq
  }
  const res = await apiDelete('/workspace-service/workspace/kick', reqDto)
  // 강제 탈퇴 시 알림 갱신 (백그라운드에서 실행, 실패해도 무시)
  refreshNotifications().catch(() => {})
  return res
}

// ----------------------
// 워크스페이스 탈퇴 API
// ----------------------
export const leaveWorkspace = async (workSpaceSeq) => {
  const res = await apiDelete(`/workspace-service/workspace/leave/${workSpaceSeq}`)
  return res
}

// ----------------------
// Super 권한 위임 API
// ----------------------
export const delegateSuperAuthority = async (delegateMemberSeq, workSpaceSeq) => {
  console.log('delegateSuperAuthority API 호출:', { delegateMemberSeq, workSpaceSeq })
  
  const reqDto = new DelegateSuperAuthorityReqDto(delegateMemberSeq, workSpaceSeq)
  console.log('요청 DTO:', reqDto)
  
  const res = await apiPost('/workspace-service/workspace/delegateSuperAuthority', reqDto)
  console.log('API 응답:', res)
  return res
}

// ----------------------
// 채널 목록 조회 API
// ----------------------
// 채팅 채널 목록 조회
// 주의: 기본 채널(첫 번째 채널)만 멤버 리스트를 포함하여 반환
// 나머지 채널은 channelMemberList가 빈 배열이거나 없음
export const getChatChannels = async (workSpaceSeq) => {
  const res = await apiGet(`/chat-service/chat/channels/${workSpaceSeq}`)
  return res.map(channel => ChannelInfoResDto.fromJson(channel))
}

export const getMeetingChannels = async (workSpaceSeq) => {
  const res = await apiGet(`/task-service/virtual-meeting/channels/${workSpaceSeq}`)
  return res.map(channel => ChannelInfoResDto.fromJson(channel))
}

export const getScheduleChannels = async (workSpaceSeq) => {
  const res = await apiGet(`/task-service/task/channels/${workSpaceSeq}`)
  // 일정관리는 List<ChannelMemberResDto>만 반환하므로 바로 반환
  return res.map(member => ChannelMemberResDto.fromJson(member))
}

// ----------------------
// 채팅 채널 생성 API
// ----------------------
export const createChatChannel = async (channelName, workSpaceSeq) => {
  const reqDto = new ChannelCreateReqDto(channelName, workSpaceSeq)
  const res = await apiPost('/chat-service/chat/createChannel', reqDto)
  return res
}

// ----------------------
// 채널 권한 변경 API
// ----------------------
export const changeChatChannelAuthority = async (workSpaceSeq, grantMemberSeq, channelSeq, authority) => {
  const reqDto = new GrantAuthorityReqDto(workSpaceSeq, grantMemberSeq, channelSeq, authority)
  return await apiPatch('/chat-service/chat/changeChannelAuthority', reqDto)
}

export const changeScheduleChannelAuthority = async (workSpaceSeq, grantMemberSeq, authority) => {
  // 일정관리는 channelSeq가 필요없지만 DTO 형식에 맞춰 null 전달
  const reqDto = new GrantAuthorityReqDto(workSpaceSeq, grantMemberSeq, null, authority)
  return await apiPatch('/task-service/task/changeChannelAuthority', reqDto)
}

export const changeMeetingChannelAuthority = async (workSpaceSeq, grantMemberSeq, authority) => {
  // 화상회의는 channelSeq가 필요없지만 DTO 형식에 맞춰 null 전달
  const reqDto = new GrantAuthorityReqDto(workSpaceSeq, grantMemberSeq, null, authority)
  return await apiPatch('/task-service/virtual-meeting/changeChannelAuthority', reqDto)
}

// ----------------------
// 채널 이름 변경 API
// ----------------------
export const renameChatChannel = async (channelSeq, channelName) => {
  const reqDto = new ChannelEditReqDto(channelSeq, channelName)
  return await apiPatch('/chat-service/chat/rename', reqDto)
}

export const renameMeetingChannel = async (channelSeq, channelName) => {
  const reqDto = new ChannelEditReqDto(channelSeq, channelName)
  return await apiPatch('/task-service/virtual-meeting/rename', reqDto)
}

// ----------------------
// 채널 삭제 API
// ----------------------
export const deleteChatChannel = async (channelSeq) => {
  return await apiDelete(`/chat-service/chat/channel/${channelSeq}`)
}

// ----------------------
// 친구 목록, 회원 검색 API는 friend.js에서 import하여 사용
// ----------------------
export { getFriendList, searchMembers } from '@/api/friend/friend'
