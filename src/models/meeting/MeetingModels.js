// 화상회의 관련 모델 정의 (백엔드 DTO 기반)

// 백엔드 enum 상수들
export const RoomStatus = {
  WAITING: 'WAITING',
  IN_SESSION: 'IN_SESSION',
  ENDED: 'ENDED'
}

export const RecordingStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
}

export const Authority = {
  SUPER: 'SUPER',
  MANAGER: 'MANAGER',
  PARTICIPANT: 'PARTICIPANT'
}

export const ActiveStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  AWAY: 'AWAY'
}

// ==================== 요청 DTO ====================

// 화상회의 방 생성 요청 DTO
export class RoomCreateReqDto {
  constructor(workSpaceSeq, roomName, description = '', alarmMemberList = []) {
    this.workSpaceSeq = workSpaceSeq
    this.roomName = roomName
    this.description = description
    this.alarmMemberList = alarmMemberList
  }
}

// 채팅 메시지 요청 DTO
export class ChatMessageReq {
  constructor(senderId, name, content) {
    this.senderId = senderId
    this.name = name
    this.content = content
  }
}

// 채널 생성 요청 DTO
export class ChannelCreateReqDto {
  constructor(workSpaceSeq, memberSeq, memberList = []) {
    this.workSpaceSeq = workSpaceSeq
    this.memberSeq = memberSeq
    this.memberList = memberList
  }
}

// 채널 멤버 초대 요청 DTO
export class ChannelInviteReqDto {
  constructor(workSpaceSeq, memberList) {
    this.workSpaceSeq = workSpaceSeq
    this.memberList = memberList
  }
}

// 권한 변경 요청 DTO
export class GrantAuthorityReqDto {
  constructor(workSpaceSeq, grantMemberSeq, channelSeq, authority) {
    this.workSpaceSeq = workSpaceSeq
    this.grantMemberSeq = grantMemberSeq
    this.channelSeq = channelSeq
    this.authority = authority
  }
}

// SUPER 권한 위임 요청 DTO
export class DelegateSuperAuthorityReqDto {
  constructor(workSpaceSeq, delegateMemberSeq) {
    this.workSpaceSeq = workSpaceSeq
    this.delegateMemberSeq = delegateMemberSeq
  }
}

// 멤버 강제 탈퇴 요청 DTO
export class KickMemberFromWorkSpaceReqDto {
  constructor(workSpaceSeq, memberSeq) {
    this.workSpaceSeq = workSpaceSeq
    this.memberSeq = memberSeq
  }
}

// ==================== 응답 DTO ====================

// 화상회의 세션 응답 DTO
export class RoomSessionResDto {
  constructor(data) {
    this.roomId = data.roomId
    this.token = data.token
  }

  get livekitToken() {
    return this.token
  }

  get livekitRoomName() {
    return this.roomId.toString()
  }
}

// 활성 회의 목록 DTO
export class RoomActiveListDto {
  constructor(data) {
    this.roomId = data.roomId
    this.roomName = data.roomName
    this.roomDescription = data.roomDescription
    this.activeUserCount = data.activeUserCount
    this.hostId = data.hostId
  }

  get isActive() {
    return this.activeUserCount > 0
  }

  get formattedDescription() {
    return this.roomDescription || '설명 없음'
  }
}

// 채팅 메시지 응답 DTO
export class ChatMessageRes {
  constructor(data) {
    this.id = data.id
    this.senderId = data.senderId
    this.name = data.name
    this.content = data.content
    this.createdAt = data.createdAt
  }

  get formattedCreatedAt() {
    return new Date(this.createdAt).toLocaleString('ko-KR')
  }

  get timeOnly() {
    return new Date(this.createdAt).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// 채널 정보 응답 DTO
export class ChannelInfoResDto {
  constructor(data) {
    this.channelSeq = data.channelSeq
    this.workSpaceSeq = data.workSpaceSeq
    this.channelName = data.channelName
    this.channelMemberList = data.channelMemberList || []
  }

  get memberCount() {
    return this.channelMemberList.length
  }

  get superMembers() {
    return this.channelMemberList.filter(member => member.authority === Authority.SUPER)
  }

  get managerMembers() {
    return this.channelMemberList.filter(member => member.authority === Authority.MANAGER)
  }

  get participantMembers() {
    return this.channelMemberList.filter(member => member.authority === Authority.PARTICIPANT)
  }
}

// 채널 멤버 응답 DTO
export class ChannelMemberResDto {
  constructor(data) {
    this.memberSeq = data.memberSeq
    this.authority = data.authority
    this.memberName = data.memberName
    this.memberProfileUrl = data.memberProfileUrl
  }

  get authorityText() {
    switch (this.authority) {
      case Authority.SUPER:
        return '방장'
      case Authority.MANAGER:
        return '매니저'
      case Authority.PARTICIPANT:
        return '참여자'
      default:
        return '알 수 없음'
    }
  }

  get authorityColor() {
    switch (this.authority) {
      case Authority.SUPER:
        return 'error'
      case Authority.MANAGER:
        return 'warning'
      case Authority.PARTICIPANT:
        return 'primary'
      default:
        return 'grey'
    }
  }

  get isSuper() {
    return this.authority === Authority.SUPER
  }

  get isManager() {
    return this.authority === Authority.MANAGER
  }

  get isParticipant() {
    return this.authority === Authority.PARTICIPANT
  }
}

// 멤버 정보 DTO
export class MemberInfoDto {
  constructor(data) {
    this.memberSeq = data.memberSeq
    this.name = data.name
    this.profileImageUrl = data.profileImageUrl
    this.activeStatus = data.activeStatus
  }

  get isOnline() {
    return this.activeStatus === ActiveStatus.ONLINE
  }

  get isAway() {
    return this.activeStatus === ActiveStatus.AWAY
  }

  get isOffline() {
    return this.activeStatus === ActiveStatus.OFFLINE
  }

  get statusText() {
    switch (this.activeStatus) {
      case ActiveStatus.ONLINE:
        return '온라인'
      case ActiveStatus.AWAY:
        return '자리비움'
      case ActiveStatus.OFFLINE:
        return '오프라인'
      default:
        return '알 수 없음'
    }
  }

  get statusColor() {
    switch (this.activeStatus) {
      case ActiveStatus.ONLINE:
        return 'success'
      case ActiveStatus.AWAY:
        return 'warning'
      case ActiveStatus.OFFLINE:
        return 'grey'
      default:
        return 'grey'
    }
  }

  get avatar() {
    return this.name ? this.name.charAt(0) : '?'
  }
}

// 권한 변경 응답 DTO
export class ChannelGrantResDto {
  constructor(data) {
    this.grantMemberSeq = data.grantMemberSeq
    this.grantMemberAuthority = data.grantMemberAuthority
    this.grantMemberName = data.grantMemberName
    this.grantMemberProfileUrl = data.grantMemberProfileUrl
    this.grantorMemberSeq = data.grantorMemberSeq
    this.grantorMemberAuthority = data.grantorMemberAuthority
    this.grantorMemberName = data.grantorMemberName
    this.grantorMemberProfileUrl = data.grantorMemberProfileUrl
  }

  get grantMemberAuthorityText() {
    switch (this.grantMemberAuthority) {
      case Authority.SUPER:
        return '방장'
      case Authority.MANAGER:
        return '매니저'
      case Authority.PARTICIPANT:
        return '참여자'
      default:
        return '알 수 없음'
    }
  }

  get grantorMemberAuthorityText() {
    switch (this.grantorMemberAuthority) {
      case Authority.SUPER:
        return '방장'
      case Authority.MANAGER:
        return '매니저'
      case Authority.PARTICIPANT:
        return '참여자'
      default:
        return '알 수 없음'
    }
  }
}

// ==================== 유틸리티 함수 ====================

// 권한 확인 함수들
export const PermissionUtils = {
  canCreateRoom: (authority) => {
    return authority === Authority.SUPER || authority === Authority.MANAGER
  },

  canManageMembers: (authority) => {
    return authority === Authority.SUPER || authority === Authority.MANAGER
  },

  canChangeAuthority: (authority) => {
    return authority === Authority.SUPER
  },

  canKickMembers: (authority) => {
    return authority === Authority.SUPER || authority === Authority.MANAGER
  },

  canJoinRoom: (authority) => {
    return true // 모든 권한의 사용자가 참여 가능
  },

  canSendMessage: (authority) => {
    return true // 모든 권한의 사용자가 메시지 전송 가능
  }
}

// 상태 변환 함수들
export const StatusUtils = {
  getRoomStatusText: (status) => {
    switch (status) {
      case RoomStatus.WAITING:
        return '대기 중'
      case RoomStatus.IN_SESSION:
        return '진행 중'
      case RoomStatus.ENDED:
        return '종료됨'
      default:
        return '알 수 없음'
    }
  },

  getRoomStatusColor: (status) => {
    switch (status) {
      case RoomStatus.WAITING:
        return 'warning'
      case RoomStatus.IN_SESSION:
        return 'success'
      case RoomStatus.ENDED:
        return 'grey'
      default:
        return 'grey'
    }
  },

  getRecordingStatusText: (status) => {
    switch (status) {
      case RecordingStatus.PENDING:
        return '대기 중'
      case RecordingStatus.PROCESSING:
        return '처리 중'
      case RecordingStatus.COMPLETED:
        return '완료'
      case RecordingStatus.FAILED:
        return '실패'
      default:
        return '알 수 없음'
    }
  },

  getRecordingStatusColor: (status) => {
    switch (status) {
      case RecordingStatus.PENDING:
        return 'warning'
      case RecordingStatus.PROCESSING:
        return 'info'
      case RecordingStatus.COMPLETED:
        return 'success'
      case RecordingStatus.FAILED:
        return 'error'
      default:
        return 'grey'
    }
  }
}

export default {
  RoomStatus,
  RecordingStatus,
  Authority,
  ActiveStatus,
  RoomCreateReqDto,
  ChatMessageReq,
  ChannelCreateReqDto,
  ChannelInviteReqDto,
  GrantAuthorityReqDto,
  DelegateSuperAuthorityReqDto,
  KickMemberFromWorkSpaceReqDto,
  RoomSessionResDto,
  RoomActiveListDto,
  ChatMessageRes,
  ChannelInfoResDto,
  ChannelMemberResDto,
  MemberInfoDto,
  ChannelGrantResDto,
  PermissionUtils,
  StatusUtils
}
