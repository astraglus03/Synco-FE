// ----------------------
// 회원 응답 DTO
// ----------------------
export class MemberResDto {
  constructor(data) {
    this.memberSeq = data.memberSeq
    this.name = data.name
    this.id = data.id
    this.email = data.email
    this.telNo = data.telNo
    this.profileImageUrl = data.profileImageUrl
    this.statusMessage = data.statusMessage
    this.birthDate = data.birthDate
    this.activeStatus = data.activeStatus
    this.socialType = data.socialType
    this.createdAt = data.createdAt
    this.ynAlarmOffSet = data.ynAlarmOffSet
  }

  static fromJson(json) {
    return new MemberResDto({
      memberSeq: json.memberSeq,
      name: json.name,
      id: json.id,
      email: json.email,
      telNo: json.telNo,
      profileImageUrl: json.profileImageUrl,
      statusMessage: json.statusMessage,
      birthDate: json.birthDate,
      activeStatus: json.activeStatus,
      socialType: json.socialType,
      createdAt: json.createdAt,
      ynAlarmOffSet: json.ynAlarmOffSet
    })
  }

  // 알림 설정이 켜져 있는지 확인
  get isAlarmOn() {
    return this.ynAlarmOffSet === 'Y'
  }

  // 알림 설정이 꺼져 있는지 확인
  get isAlarmOff() {
    return this.ynAlarmOffSet === 'N'
  }
}

