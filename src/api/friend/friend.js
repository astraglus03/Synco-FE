import { apiGet, apiPost, apiDelete } from '@/utils/api'
import { useNotificationStore } from '@/store/notificationStore'

// 알림 갱신 헬퍼 함수
const refreshNotifications = async () => {
  try {
    const notificationStore = useNotificationStore()
    await notificationStore.fetchNotifications()
  } catch (error) {
    console.error('[Friend API] 알림 갱신 실패:', error)
  }
}

// ----------------------
// 친구 목록 조회 및 검색 API
// ----------------------
export const getFriendList = async (keyword = '', page = 0, size = 20) => {
  const params = { page, size }
  if (keyword) {
    params.keyword = keyword
  }
  return await apiGet('/workspace-service/friend/list', params)
}

// ----------------------
// 받은 친구 요청 목록 조회 API
// ----------------------
export const getReceivedRequests = async (page = 0, size = 20) => {
  return await apiGet('/workspace-service/friend/received', { page, size })
}

// ----------------------
// 보낸 친구 요청 목록 조회 API
// ----------------------
export const getSentRequests = async (page = 0, size = 20) => {
  return await apiGet('/workspace-service/friend/sent', { page, size })
}

// ----------------------
// 친구 요청 보내기 API
// ----------------------
export const sendFriendRequest = async (friendMemberId) => {
  const result = await apiPost('/workspace-service/friend/request', { friendMemberId })
  // 친구 요청 보내기 성공 시 알림 갱신 (백그라운드에서 실행, 실패해도 무시)
  refreshNotifications().catch(() => {})
  return result
}

// ----------------------
// 친구 요청 수락 API
// ----------------------
export const acceptFriendRequest = async (friendSeq) => {
  try {
    console.log('[Friend API] 친구 요청 수락 시작:', friendSeq)
    const result = await apiPost(`/workspace-service/friend/accept/${friendSeq}`)
    console.log('[Friend API] 친구 요청 수락 성공:', result)
    
    // 친구 요청 수락 시 알림 갱신 (백그라운드에서 실행, 실패해도 무시)
    refreshNotifications().catch((error) => {
      console.warn('[Friend API] 알림 갱신 실패 (무시됨):', error)
    })
    
    return result
  } catch (error) {
    console.error('[Friend API] 친구 요청 수락 실패:', error)
    console.error('[Friend API] 에러 상세:', error.response?.data || error.message)
    throw error
  }
}

// ----------------------
// 친구 요청 거절 API
// ----------------------
export const rejectFriendRequest = async (friendSeq) => {
  return await apiDelete(`/workspace-service/friend/reject/${friendSeq}`)
}

// ----------------------
// 친구 요청 취소 API
// ----------------------
export const cancelFriendRequest = async (friendSeq) => {
  return await apiDelete(`/workspace-service/friend/cancel/${friendSeq}`)
}

// ----------------------
// 친구 삭제 API
// ----------------------
export const deleteFriend = async (friendMemberSeq) => {
  return await apiDelete(`/workspace-service/friend/${friendMemberSeq}`)
}

// ----------------------
// 회원 검색 API (친구 추가용)
// ----------------------
export const searchMembers = async (keyword, page = 0, size = 10) => {
  return await apiGet('/workspace-service/member/search', { keyword, page, size })
}

