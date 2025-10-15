import { apiGet, apiPost, apiPatch, apiDelete, apiPostModelAttr, apiPatchModelAttr } from '@/utils/api'

// ----------------------
// 회원가입 API
// ----------------------
export const createMember = async (memberData) => {
  return await apiPostModelAttr('/workspace-service/member/create', memberData)
}

// ----------------------
// 로그인 API
// ----------------------
export const doLogin = async (loginData) => {
  return await apiPost('/workspace-service/member/doLogin', loginData)
}

// ----------------------
// ID 찾기 API
// ----------------------
export const findMemberId = async (findIdData) => {
  return await apiPost('/workspace-service/member/findId', findIdData)
}

// ----------------------
// 비밀번호 찾기 API
// ----------------------
export const findPassword = async (findPasswordData) => {
  return await apiPost('/workspace-service/member/findPassword', findPasswordData)
}

// ----------------------
// 토큰 갱신 API (RT는 Cookie로 자동 전송)
// ----------------------
export const refreshAccessToken = async () => {
  return await apiPost('/workspace-service/member/refreshAt', {})
}

// ----------------------
// 마이페이지 조회 API
// ----------------------
export const getMyPage = async () => {
  return await apiGet('/workspace-service/member/myPage')
}

// ----------------------
// 회원 정보 수정 API
// ----------------------
export const updateMember = async (memberData) => {
  return await apiPatchModelAttr('/workspace-service/member/update', memberData)
}

// ----------------------
// 회원 탈퇴 API
// ----------------------
export const deleteMember = async () => {
  return await apiDelete('/workspace-service/member/delete')
}

// ----------------------
// 비밀번호 변경 API
// ----------------------
export const changePassword = async (passwordData) => {
  return await apiPatch('/workspace-service/member/changePassword', passwordData)
}

// ----------------------
// 로그아웃 API
// ----------------------
export const logout = async () => {
  return await apiPost('/workspace-service/member/logout', {})
}

// ----------------------
// 사용자 상태 변경 API
// ----------------------
export const updateActiveStatus = async (activeStatus) => {
  return await apiPatch('/workspace-service/member/updateActiveStatus', { activeStatus })
}

