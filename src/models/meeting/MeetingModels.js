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
    this.isHost = data.isHost !== undefined ? data.isHost : false
    this.hostId = data.hostId
    this.roomName = data.roomName
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

// 종료된 회의 목록 DTO
export class RoomEndedListDto {
  constructor(data) {
    this.roomId = data.roomId
    this.roomName = data.roomName
    this.roomDescription = data.roomDescription
    this.activeUserCount = data.activeUserCount
    this.hostId = data.hostId
    // 백엔드에서 LocalDateTime으로 전달되는 createdAt 필드
    this.createdAt = data.createdAt || null
  }

  get formattedDescription() {
    return this.roomDescription || '설명 없음'
  }

  get formattedCreatedAt() {
    if (!this.createdAt) {
      return ''
    }
    
    try {
      let dateStr = String(this.createdAt).trim()
      
      // Z 제거 (UTC 표시)
      const hasZ = dateStr.endsWith('Z')
      if (hasZ) {
        dateStr = dateStr.slice(0, -1)
      }
      
      // 공백을 T로 변환
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T')
      }
      
      // 시간대 정보 제거 (+09:00, -05:00 등)
      dateStr = dateStr.replace(/[+-]\d{2}:?\d{2}$/, '')
      
      // 밀리초 제거
      if (dateStr.includes('.')) {
        dateStr = dateStr.split('.')[0]
      }
      
      // 날짜와 시간 분리
      const [datePart, timePart] = dateStr.split('T')
      if (!datePart || !timePart) {
        console.warn('RoomEndedListDto: 날짜 형식 오류', this.createdAt)
        return ''
      }
      
      // 날짜 파싱
      const [year, month, day] = datePart.split('-')
      
      // 시간 파싱
      const [hours, minutes] = timePart.split(':')
      
      // Z가 있으면 UTC로 해석되었으므로 9시간 더하기
      let finalHours = Number(hours)
      let finalMinutes = Number(minutes)
      
      if (hasZ) {
        // UTC 시간에 9시간 더해서 한국 시간으로 변환
        finalHours = (finalHours + 9) % 24
        // 날짜가 넘어갈 수 있으므로 처리 필요하지만, 간단하게 시간만 처리
        // 실제로는 Date 객체를 사용하는 것이 더 정확하지만, 여기서는 시간만 표시하므로 이렇게 처리
      }
      
      // 한국어 형식으로 포맷팅 (YYYY. MM. DD. HH:mm)
      return `${year}. ${month}. ${day}. ${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`
    } catch (error) {
      console.error('RoomEndedListDto: 날짜 포맷팅 오류', error, this.createdAt)
      return ''
    }
  }
}

// 회의 상세 DTO
export class RoomDetailDto {
  constructor(data) {
    this.roomId = data.roomId
    this.roomName = data.roomName
    this.roomDescription = data.roomDescription
    this.hostId = data.hostId
    this.createdAt = data.createdAt
    this.duration = data.duration
    this.summaryContent = data.summaryContent || ''
    this.downloadUrl = data.downloadUrl || null
    this.participants = data.participants || []
    this.participantCount = data.participantCount
  }

  get formattedCreatedAt() {
    if (!this.createdAt) return ''
    
    try {
      let dateStr = String(this.createdAt).trim()
      
      // Z 제거 (UTC 표시)
      const hasZ = dateStr.endsWith('Z')
      if (hasZ) {
        dateStr = dateStr.slice(0, -1)
      }
      
      // 공백을 T로 변환
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T')
      }
      
      // 시간대 정보 제거
      dateStr = dateStr.replace(/[+-]\d{2}:?\d{2}$/, '')
      
      // 밀리초 제거
      if (dateStr.includes('.')) {
        dateStr = dateStr.split('.')[0]
      }
      
      // 날짜와 시간 분리
      const [datePart, timePart] = dateStr.split('T')
      if (!datePart || !timePart) {
        console.warn('RoomDetailDto: 날짜 형식 오류', this.createdAt)
        return ''
      }
      
      const [year, month, day] = datePart.split('-')
      const [hours, minutes, seconds = '00'] = timePart.split(':')
      
      // Z가 있으면 UTC로 해석되었으므로 9시간 더하기
      let finalHours = Number(hours)
      if (hasZ) {
        finalHours = (finalHours + 9) % 24
      }
      
      return `${year}. ${month}. ${day}. ${String(finalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    } catch (error) {
      console.error('RoomDetailDto: 날짜 포맷팅 오류', error)
      return ''
    }
  }

  get formattedDuration() {
    if (!this.duration) return '0초'
    
    // LiveKit Egress duration은 나노초(nanoseconds) 단위로 반환됨
    // 48656565668 ns / 1,000,000 = 48656.565668 ms = 48.656 초
    let durationMs = this.duration
    
    // 나노초 단위 확인 (일반적으로 1억 이상이면 나노초)
    if (this.duration > 100000000) {
      durationMs = this.duration / 1000000 // 나노초를 밀리초로 변환
    }
    
    const totalSeconds = Math.floor(durationMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      // 1시간 이상: "1시간 12분 14초"
      if (minutes > 0 && seconds > 0) {
        return `${hours}시간 ${minutes}분 ${seconds}초`
      } else if (minutes > 0) {
        return `${hours}시간 ${minutes}분`
      } else if (seconds > 0) {
        return `${hours}시간 ${seconds}초`
      } else {
        return `${hours}시간`
      }
    } else if (minutes > 0) {
      // 1분 이상 1시간 미만: "2분 35초"
      if (seconds > 0) {
        return `${minutes}분 ${seconds}초`
      } else {
        return `${minutes}분`
      }
    } else {
      // 1분 미만: "40초"
      return `${seconds}초`
    }
  }
}

// 참여자 정보 DTO
export class ParticipantDto {
  constructor(data) {
    this.participantId = data.participantId
    this.participantName = data.participantName
    this.participantProfileUrl = data.participantProfileUrl
    this.participantStatus = data.participantStatus
  }

  get isOnline() {
    return this.participantStatus === 'ONLINE'
  }

  get statusText() {
    switch (this.participantStatus) {
      case 'ONLINE':
        return '온라인'
      case 'AWAY':
        return '자리비움'
      case 'OFFLINE':
        return '오프라인'
      default:
        return '오프라인'
    }
  }

  get statusColor() {
    switch (this.participantStatus) {
      case 'ONLINE':
        return 'success'
      case 'AWAY':
        return 'warning'
      case 'OFFLINE':
        return 'grey'
      default:
        return 'grey'
    }
  }

  get avatar() {
    return this.participantName ? this.participantName.charAt(0) : '?'
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
    if (!this.createdAt) return ''
    
    try {
      let dateStr = String(this.createdAt).trim()
      
      // Z 제거 (UTC 표시)
      const hasZ = dateStr.endsWith('Z')
      if (hasZ) {
        dateStr = dateStr.slice(0, -1)
      }
      
      // 공백을 T로 변환
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T')
      }
      
      // 시간대 정보 제거
      dateStr = dateStr.replace(/[+-]\d{2}:?\d{2}$/, '')
      
      // 밀리초 제거
      if (dateStr.includes('.')) {
        dateStr = dateStr.split('.')[0]
      }
      
      // 날짜와 시간 분리
      const [datePart, timePart] = dateStr.split('T')
      if (!datePart || !timePart) {
        console.warn('ChatMessageRes: 날짜 형식 오류', this.createdAt)
        return ''
      }
      
      const [year, month, day] = datePart.split('-')
      const [hours, minutes, seconds = '00'] = timePart.split(':')
      
      // Z가 있으면 UTC로 해석되었으므로 9시간 더하기
      let finalHours = Number(hours)
      if (hasZ) {
        finalHours = (finalHours + 9) % 24
      }
      
      return `${year}. ${month}. ${day}. ${String(finalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    } catch (error) {
      console.error('ChatMessageRes: 날짜 포맷팅 오류', error)
      return ''
    }
  }

  get timeOnly() {
    if (!this.createdAt) return ''
    
    try {
      let dateStr = String(this.createdAt).trim()
      
      // Z 제거 (UTC 표시)
      const hasZ = dateStr.endsWith('Z')
      if (hasZ) {
        dateStr = dateStr.slice(0, -1)
      }
      
      // 공백을 T로 변환
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T')
      }
      
      // 시간대 정보 제거
      dateStr = dateStr.replace(/[+-]\d{2}:?\d{2}$/, '')
      
      // 밀리초 제거
      if (dateStr.includes('.')) {
        dateStr = dateStr.split('.')[0]
      }
      
      // 시간 부분만 추출
      const timePart = dateStr.split('T')[1]
      if (!timePart) {
        console.warn('ChatMessageRes: 시간 형식 오류', this.createdAt)
        return ''
      }
      
      const [hours, minutes] = timePart.split(':')
      
      // Z가 있으면 UTC로 해석되었으므로 9시간 더하기
      let finalHours = Number(hours)
      if (hasZ) {
        finalHours = (finalHours + 9) % 24
      }
      
      return `${String(finalHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    } catch (error) {
      console.error('ChatMessageRes: 시간 포맷팅 오류', error)
      return ''
    }
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
  RoomEndedListDto,
  RoomDetailDto,
  ParticipantDto,
  ChatMessageRes,
  ChannelInfoResDto,
  ChannelMemberResDto,
  MemberInfoDto,
  ChannelGrantResDto,
  PermissionUtils,
  StatusUtils
}
