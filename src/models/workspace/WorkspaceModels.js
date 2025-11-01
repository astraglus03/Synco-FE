// ----------------------
// 워크스페이스 생성 요청 DTO
// ----------------------
export class TeamWorkSpaceCreateReqDto {
  constructor(workSpaceName, workSpaceThumbnailImage, memberList, startDate, endDate) {
    this.workSpaceName = workSpaceName
    this.workSpaceThumbnailImage = workSpaceThumbnailImage
    this.memberList = memberList || []
    this.startDate = startDate
    this.endDate = endDate
  }

  toFormData() {
    const formData = new FormData()
    formData.append('workSpaceName', this.workSpaceName)
    if (this.startDate) {
      formData.append('startDate', this.startDate)
    }
    if (this.endDate) {
      formData.append('endDate', this.endDate)
    }
    
    if (this.workSpaceThumbnailImage instanceof File) {
      formData.append('workSpaceThumbnailImage', this.workSpaceThumbnailImage)
    }
    
    // memberList는 배열이므로 각각 추가
    this.memberList.forEach((memberSeq) => {
      formData.append('memberList', memberSeq)
    })
    
    return formData
  }
}

// ----------------------
// 워크스페이스 수정 요청 DTO
// ----------------------
export class TeamWorkSpaceEditReqDto {
  constructor(workSpaceSeq, workSpaceName, workSpaceThumbnailImage, startDate, endDate) {
    this.workSpaceSeq = workSpaceSeq
    this.workSpaceName = workSpaceName
    this.workSpaceThumbnailImage = workSpaceThumbnailImage
    this.startDate = startDate
    this.endDate = endDate
  }

  toFormData() {
    const formData = new FormData()
    formData.append('workSpaceSeq', this.workSpaceSeq)
    formData.append('workSpaceName', this.workSpaceName)
    if (this.startDate) {
      formData.append('startDate', this.startDate)
    }
    if (this.endDate) {
      formData.append('endDate', this.endDate)
    }
    
    // 썸네일 이미지가 File 객체일 때만 추가 (null이나 undefined는 추가하지 않음)
    if (this.workSpaceThumbnailImage instanceof File) {
      formData.append('workSpaceThumbnailImage', this.workSpaceThumbnailImage)
    }
    
    return formData
  }
}

// ----------------------
// 워크스페이스 응답 DTO
// ----------------------
export class WorkSpaceResDto {
  constructor(data) {
    this.workSpaceSeq = data.workSpaceSeq
    this.workSpaceName = data.workSpaceName
    this.workSpaceType = data.workSpaceType
    this.workSpaceOwner = data.workSpaceOwner
    this.workSpaceThumbnailImage = data.workSpaceThumbnailImage
    this.startDate = data.startDate || data.projectStartDate
    this.endDate = data.endDate || data.projectEndDate
  }

  static fromJson(json) {
    return new WorkSpaceResDto({
      workSpaceSeq: json.workSpaceSeq,
      workSpaceName: json.workSpaceName,
      workSpaceType: json.workSpaceType,
      workSpaceOwner: json.workSpaceOwner,
      workSpaceThumbnailImage: json.workSpaceThumbnailImage,
      startDate: json.startDate,
      endDate: json.endDate
    })
  }
}

// ----------------------
// 워크스페이스 목록 정보 응답 DTO
// ----------------------
export class WorkSpaceInfoResDto {
  constructor(data) {
    this.workSpaceSeq = data.workSpaceSeq
    this.workSpaceName = data.workSpaceName
    this.thumbnailImageUrl = data.thumbnailImageUrl
    this.workSpaceType = data.workSpaceType // TEAM or INDIVIDUAL
    this.isPersonal = data.isPersonal // Boolean 플래그
    this.startDate = data.startDate || data.projectStartDate
    this.endDate = data.endDate || data.projectEndDate
  }

  static fromJson(json) {
    return new WorkSpaceInfoResDto({
      workSpaceSeq: json.workSpaceSeq,
      workSpaceName: json.workSpaceName,
      thumbnailImageUrl: json.thumbnailImageUrl,
      workSpaceType: json.workSpaceType,
      isPersonal: json.isPersonal,
      startDate: json.startDate,
      endDate: json.endDate
    })
  }

  // UI용 아이콘 텍스트 생성 (첫 글자, 대문자로)
  get iconText() {
    if (!this.workSpaceName) return '?'
    const firstChar = this.workSpaceName.charAt(0)
    // 영문인 경우 대문자로, 한글 등은 그대로
    return /[a-zA-Z]/.test(firstChar) ? firstChar.toUpperCase() : firstChar
  }

  // 팀 워크스페이스인지 확인
  get isTeamWorkspace() {
    // 명시적으로 개인 워크스페이스로 표시된 경우
    if (this.isPersonal === true) return false
    if (this.workSpaceType === 'INDIVIDUAL') return false // 개인 워크스페이스 타입
    
    // 워크스페이스 이름으로 판단 (fallback)
    const personalNames = ['내 워크스페이스', '개인 워크스페이스', 'My Workspace', 'Personal Workspace']
    if (personalNames.includes(this.workSpaceName)) return false
    
    // 기본값: 팀 워크스페이스로 간주
    return true
  }
}

// ----------------------
// 친구 목록 응답 DTO
// ----------------------
export class FriendResDto {
  constructor(data) {
    this.friendSeq = data.friendSeq
    this.memberSeq = data.memberSeq
    this.memberId = data.memberId
    this.name = data.name
    this.email = data.email
    this.profileImage = data.profileImage
    this.status = data.status
  }

  static fromJson(json) {
    return new FriendResDto({
      friendSeq: json.friendSeq,
      memberSeq: json.memberSeq,
      memberId: json.memberId,
      name: json.name,
      email: json.email,
      profileImage: json.profileImage,
      status: json.status
    })
  }

  // 아바타 텍스트 (이름 첫글자)
  get avatarText() {
    return this.name ? this.name.charAt(0) : '?'
  }
}

// ----------------------
// 회원 검색 응답 DTO
// ----------------------
export class MemberSearchResDto {
  constructor(data) {
    this.memberSeq = data.memberSeq
    this.memberId = data.memberId
    this.name = data.name
    this.email = data.email
    this.profileImage = data.profileImage
    this.isFriend = data.isFriend || false
  }

  static fromJson(json) {
    return new MemberSearchResDto({
      memberSeq: json.memberSeq,
      memberId: json.memberId,
      name: json.name,
      email: json.email,
      profileImage: json.profileImage,
      isFriend: json.isFriend
    })
  }

  // 아바타 텍스트 (이름 첫글자)
  get avatarText() {
    return this.name ? this.name.charAt(0) : '?'
  }
}

// ----------------------
// 워크스페이스 멤버 정보 응답 DTO
// ----------------------
export class WorkSpaceMemberInfoResDto {
  constructor(data) {
    this.memberSeq = data.memberSeq
    this.name = data.name
    this.profileImageUrl = data.profileImageUrl
    this.activeStatus = data.activeStatus
    this.authority = data.authority
  }

  static fromJson(json) {
    return new WorkSpaceMemberInfoResDto({
      memberSeq: json.memberSeq,
      name: json.name,
      profileImageUrl: json.profileImageUrl,
      activeStatus: json.activeStatus,
      authority: json.authority
    })
  }

  // 아바타 텍스트 (이름 첫글자)
  get avatarText() {
    return this.name ? this.name.charAt(0) : '?'
  }

  // UI용 상태로 변환 (ONLINE, AWAY, BUSY, OFFLINE -> online, away, busy, offline)
  get uiStatus() {
    if (!this.activeStatus) return 'offline'
    return this.activeStatus.toLowerCase()
  }
}

// ----------------------
// 워크스페이스 권한 타입 (Authority enum)
// ----------------------
export const Authority = {
  SUPER: 'SUPER',
  MANAGER: 'MANAGER',
  PARTICIPANT: 'PARTICIPANT'
}

// ----------------------
// Super 권한 위임 요청 DTO
// ----------------------
export class DelegateSuperAuthorityReqDto {
  constructor(delegateMemberSeq, workSpaceSeq) {
    this.delegateMemberSeq = delegateMemberSeq
    this.workSpaceSeq = workSpaceSeq
  }
}

// ----------------------
// 채널 권한 부여 요청 DTO
// ----------------------
export class GrantAuthorityReqDto {
  constructor(workSpaceSeq, grantMemberSeq, channelSeq, authority) {
    this.workSpaceSeq = workSpaceSeq
    this.grantMemberSeq = grantMemberSeq
    this.channelSeq = channelSeq
    this.authority = authority
  }
}

// ----------------------
// 채널 이름 수정 요청 DTO
// ----------------------
export class ChannelEditReqDto {
  constructor(channelSeq, channelName) {
    this.channelSeq = channelSeq
    this.channelName = channelName
  }
}

// ----------------------
// 채널 멤버 응답 DTO
// ----------------------
export class ChannelMemberResDto {
  constructor(memberSeq, authority, memberName, memberProfileUrl) {
    this.memberSeq = memberSeq
    this.authority = authority
    this.memberName = memberName
    this.memberProfileUrl = memberProfileUrl
  }

  static fromJson(json) {
    return new ChannelMemberResDto(
      json.memberSeq,
      json.authority,
      json.memberName,
      json.memberProfileUrl
    )
  }
}

// ----------------------
// 채널 정보 응답 DTO
// ----------------------
export class ChannelInfoResDto {
  constructor(channelSeq, workSpaceSeq, channelName, channelMemberList) {
    this.channelSeq = channelSeq
    this.workSpaceSeq = workSpaceSeq
    this.channelName = channelName
    this.channelMemberList = channelMemberList || []
  }

  static fromJson(json) {
    return new ChannelInfoResDto(
      json.channelSeq,
      json.workSpaceSeq,
      json.channelName,
      json.channelMemberList?.map(member => ChannelMemberResDto.fromJson(member)) || []
    )
  }
}

// ----------------------
// 채널 생성 요청 DTO
// ----------------------
export class ChannelCreateReqDto {
  constructor(channelName, workSpaceSeq) {
    this.channelName = channelName
    this.workSpaceSeq = workSpaceSeq
  }
}

