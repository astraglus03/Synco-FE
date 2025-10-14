import { apiPost, apiPostModelAttr } from '@/utils/api'

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

