import axios from '@/utils/api'

// API 엔드포인트 상수 (백엔드 컨트롤러 기반)
const API_ENDPOINTS = {
  // 화상회의 방 관련 (RoomController)
  CREATE_ROOM: '/task-service/rooms/create',
  JOIN_ROOM: (roomId) => `/task-service/rooms/${roomId}/join`,
  CANCEL_ROOM: (roomId) => `/task-service/rooms/${roomId}/cancel`,
  SEND_MESSAGE: (roomId) => `/task-service/rooms/${roomId}/messages`,
  GET_MESSAGES: (roomId) => `/task-service/rooms/${roomId}/messages`,
  START_RECORDING: (roomId) => `/task-service/rooms/${roomId}/recording/start`,
  
  // 가상회의 채널 관련 (VirtualMeetingController)
  CREATE_BASIC_CHANNEL: '/task-service/virtual-meeting/createBasicChannel',
  ADD_MEMBER: '/task-service/virtual-meeting/addMember',
  DELEGATE_SUPER_AUTHORITY: '/task-service/virtual-meeting/delegateSuperAuthority',
  GET_CHANNELS: (workSpaceSeq) => `/task-service/virtual-meeting/channels/${workSpaceSeq}`,
  DELETE_ALL_CHANNELS: (workSpaceSeq) => `/task-service/virtual-meeting/${workSpaceSeq}`,
  LEAVE_WORKSPACE: (workSpaceSeq) => `/task-service/virtual-meeting/leave/${workSpaceSeq}`,
  KICK_MEMBER: '/task-service/virtual-meeting/kick',
  CHANGE_CHANNEL_AUTHORITY: '/task-service/virtual-meeting/changeChannelAuthority',
  GET_ACTIVE_ROOMS: (channelSeq) => `/task-service/virtual-meeting/channel/${channelSeq}/rooms/active`,
  GET_ENDED_ROOMS: (channelSeq) => `/task-service/virtual-meeting/channel/${channelSeq}/rooms/ended`,
  GET_ROOM_DETAIL: (roomSeq) => `/task-service/virtual-meeting/rooms/${roomSeq}/summary`,
  GET_WORKSPACE_MEMBERS: (workSpaceSeq) => `/task-service/virtual-meeting/workspace/${workSpaceSeq}/members`,
}

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

// 화상회의 API 서비스
export const meetingApi = {
  // ==================== 화상회의 방 관련 ====================
  
  // 화상회의 방 생성
  async createRoom(memberSeq, roomCreateReqDto) {
    try {
      const response = await axios.post(API_ENDPOINTS.CREATE_ROOM, roomCreateReqDto, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('화상회의 방 생성 실패:', error)
      throw error
    }
  },

  // 화상회의 방 참여
  async joinRoom(memberSeq, roomId) {
    try {
      const response = await axios.post(API_ENDPOINTS.JOIN_ROOM(roomId), {}, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('화상회의 방 참여 실패:', error)
      throw error
    }
  },

  // 화상회의 방 취소
  async cancelRoom(memberSeq, roomId) {
    try {
      const response = await axios.delete(API_ENDPOINTS.CANCEL_ROOM(roomId), {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('화상회의 방 취소 실패:', error)
      throw error
    }
  },

  // 채팅 메시지 전송
  async sendMessage(memberSeq, roomId, chatMessageReq) {
    try {
      const response = await axios.post(API_ENDPOINTS.SEND_MESSAGE(roomId), chatMessageReq, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('채팅 메시지 전송 실패:', error)
      throw error
    }
  },

  // 채팅 메시지 목록 조회
  async getMessages(memberSeq, roomId, page = 0, size = 10) {
    try {
      const response = await axios.get(API_ENDPOINTS.GET_MESSAGES(roomId), {
        headers: {
          'X-Member-Seq': memberSeq
        },
        params: {
          page,
          size,
          sort: 'createdAt,desc'
        }
      })
      return response.data
    } catch (error) {
      console.error('채팅 메시지 조회 실패:', error)
      throw error
    }
  },

  // 녹화 시작
  async startRecording(memberSeq, roomId) {
    try {
      const response = await axios.post(API_ENDPOINTS.START_RECORDING(roomId), {}, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('녹화 시작 실패:', error)
      throw error
    }
  },

  // 워크스페이스 멤버 목록 조회
  async getWorkSpaceMembers(workSpaceSeq) {
    try {
      const response = await axios.get(API_ENDPOINTS.GET_WORKSPACE_MEMBERS(workSpaceSeq))
      return response.data
    } catch (error) {
      console.error('워크스페이스 멤버 조회 실패:', error)
      throw error
    }
  },

  // ==================== 가상회의 채널 관련 ====================

  // 기본 채널 생성
  async createBasicChannel(channelCreateReqDto) {
    try {
      const response = await axios.post(API_ENDPOINTS.CREATE_BASIC_CHANNEL, channelCreateReqDto)
      return response.data
    } catch (error) {
      console.error('기본 채널 생성 실패:', error)
      throw error
    }
  },

  // 채널에 멤버 추가
  async addMember(memberSeq, channelInviteReqDto) {
    try {
      const response = await axios.post(API_ENDPOINTS.ADD_MEMBER, channelInviteReqDto, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('멤버 추가 실패:', error)
      throw error
    }
  },

  // SUPER 권한 위임
  async delegateSuperAuthority(memberSeq, delegateSuperAuthorityReqDto) {
    try {
      const response = await axios.post(API_ENDPOINTS.DELEGATE_SUPER_AUTHORITY, delegateSuperAuthorityReqDto, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('SUPER 권한 위임 실패:', error)
      throw error
    }
  },

  // 채널 목록 조회
  async getChannels(workSpaceSeq) {
    try {
      const response = await axios.get(API_ENDPOINTS.GET_CHANNELS(workSpaceSeq))
      return response.data
    } catch (error) {
      console.error('채널 목록 조회 실패:', error)
      throw error
    }
  },

  // 모든 채널 삭제
  async deleteAllChannels(workSpaceSeq) {
    try {
      const response = await axios.delete(API_ENDPOINTS.DELETE_ALL_CHANNELS(workSpaceSeq))
      return response.data
    } catch (error) {
      console.error('모든 채널 삭제 실패:', error)
      throw error
    }
  },

  // 워크스페이스 탈퇴
  async leaveWorkSpace(workSpaceSeq, memberSeq) {
    try {
      const response = await axios.delete(API_ENDPOINTS.LEAVE_WORKSPACE(workSpaceSeq), {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('워크스페이스 탈퇴 실패:', error)
      throw error
    }
  },

  // 멤버 강제 탈퇴
  async kickMember(kickMemberFromWorkSpaceReqDto) {
    try {
      const response = await axios.delete(API_ENDPOINTS.KICK_MEMBER, {
        data: kickMemberFromWorkSpaceReqDto
      })
      return response.data
    } catch (error) {
      console.error('멤버 강제 탈퇴 실패:', error)
      throw error
    }
  },

  // 채널 권한 변경
  async changeChannelAuthority(memberSeq, grantAuthorityReqDto) {
    try {
      const response = await axios.post(API_ENDPOINTS.CHANGE_CHANNEL_AUTHORITY, grantAuthorityReqDto, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      return response.data
    } catch (error) {
      console.error('채널 권한 변경 실패:', error)
      throw error
    }
  },

  // 활성 회의 목록 조회
  async getActiveRooms(workSpaceSeq, memberSeq, page = 0, size = 10) {
    try {
      const url = API_ENDPOINTS.GET_ACTIVE_ROOMS(workSpaceSeq)
      console.log('🔍 활성 회의 목록 API 호출:')
      console.log('  - URL:', url)
      console.log('  - workSpaceSeq:', workSpaceSeq)
      console.log('  - memberSeq:', memberSeq)
      
      // 백엔드 엔드포인트는 /channel/{channelSeq}이지만 실제로는 workSpaceSeq를 전달해야 함
      const response = await axios.get(url, {
        headers: {
          'X-Member-Seq': memberSeq
        },
        params: {
          page,
          size,
          sort: 'createdAt,desc'
        }
      })
      
      console.log('✅ API 응답:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ 활성 회의 목록 조회 실패:', error)
      if (error.response) {
        console.error('  - Status:', error.response.status)
        console.error('  - Data:', error.response.data)
      }
      throw error
    }
  },

  // 종료된 회의 목록 조회
  async getEndedRooms(workSpaceSeq, memberSeq, page = 0, size = 10) {
    try {
      const url = API_ENDPOINTS.GET_ENDED_ROOMS(workSpaceSeq)
      console.log('🔍 종료된 회의 목록 API 호출:')
      console.log('  - URL:', url)
      console.log('  - workSpaceSeq:', workSpaceSeq)
      console.log('  - memberSeq:', memberSeq)
      
      const response = await axios.get(url, {
        headers: {
          'X-Member-Seq': memberSeq
        },
        params: {
          page,
          size,
          sort: 'createdAt,desc'
        }
      })
      
      console.log('✅ API 응답:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ 종료된 회의 목록 조회 실패:', error)
      if (error.response) {
        console.error('  - Status:', error.response.status)
        console.error('  - Data:', error.response.data)
      }
      throw error
    }
  },

  // 회의 상세 정보 조회
  async getRoomDetail(roomSeq, memberSeq) {
    try {
      const url = API_ENDPOINTS.GET_ROOM_DETAIL(roomSeq)
      console.log('🔍 회의 상세 정보 API 호출:')
      console.log('  - URL:', url)
      console.log('  - roomSeq:', roomSeq)
      console.log('  - memberSeq:', memberSeq)
      
      const response = await axios.get(url, {
        headers: {
          'X-Member-Seq': memberSeq
        }
      })
      
      console.log('✅ API 응답:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ 회의 상세 정보 조회 실패:', error)
      if (error.response) {
        console.error('  - Status:', error.response.status)
        console.error('  - Data:', error.response.data)
      }
      throw error
    }
  }
}

export default meetingApi
