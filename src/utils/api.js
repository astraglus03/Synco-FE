import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { handleApiResponse } from '@/models/common/ApiResponse'

// JWT 토큰에서 payload 추출 (디코딩)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('JWT 디코딩 실패:', error)
    return null
  }
}

// ----------------------
// Axios 인스턴스
// ----------------------
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  timeout: 30000, // 30초로 증가 (화상회의 방 생성은 시간이 오래 걸릴 수 있음)
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // ✅ 쿠키 전송 활성화
})

// 요청 인터셉터 (토큰 자동 주입)
// 모든 API 요청에 자동으로 Authorization 헤더 및 X-Member-Seq 헤더 추가
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  
  // 액세스 토큰이 있으면 Authorization 헤더에 추가
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
    
    // JWT에서 memberSeq 추출 (JWT 표준에서는 sub에 사용자 식별자 저장)
    const payload = decodeJWT(authStore.accessToken)
    
    // payload의 sub(subject)를 memberSeq로 사용
    if (payload && payload.sub) {
      const memberSeq = parseInt(payload.sub, 10) // 문자열을 숫자로 변환
      config.headers['X-Member-Seq'] = memberSeq
      
      // authStore에 memberSeq가 없으면 저장
      if (!authStore.memberSeq) {
        authStore.setMemberSeq(memberSeq)
      }
    }
  }
  
  return config
})

// 응답 인터셉터 (401 → refresh 토큰)
// 401 에러 시 자동으로 토큰 갱신 시도
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const authStore = useAuthStore()
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
        // ✅ RT는 Cookie로 자동 전송됨 (body 필요 없음)
        const { data } = await axios.post(
          `${baseUrl}/workspace-service/member/refreshAt`,
          {}, // body 비움
          { withCredentials: true } // 쿠키 전송
        )
        // 백엔드 ResponseDto 구조: data.data.accessToken
        const newAccessToken = data?.data?.accessToken || data?.accessToken
        authStore.setAccessToken(newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        authStore.logout()
        window.location.href = '/'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

// ----------------------
// CRUD + 자동 응답 처리
// ----------------------
export const apiGet = async (endpoint, params = null) => {
  const res = await apiClient.get(endpoint, { params })
  return handleApiResponse(res).getData()
}

export const apiPost = async (endpoint, data = null) => {
  const res = await apiClient.post(endpoint, data)
  return handleApiResponse(res).getData()
}

export const apiPatch = async (endpoint, data = null) => {
  const res = await apiClient.patch(endpoint, data)
  return handleApiResponse(res).getData()
}

export const apiPut = async (endpoint, data = null) => {
  const res = await apiClient.put(endpoint, data)
  return handleApiResponse(res).getData()
}

export const apiDelete = async (endpoint, data = null) => {
  const res = await apiClient.delete(endpoint, { data })
  return handleApiResponse(res).getData()
}

// ----------------------
// FormData 업로드
// ----------------------
export const apiPostFormData = async (endpoint, formData) => {
  const res = await apiClient.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return handleApiResponse(res).getData()
}

export const apiPutFormData = async (endpoint, formData) => {
  const res = await apiClient.put(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return handleApiResponse(res).getData()
}

export const apiPatchFormData = async (endpoint, formData) => {
  const res = await apiClient.patch(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return handleApiResponse(res).getData()
}

export const apiPatchModelAttr = async (endpoint, dataObj) => {
  const res = await apiClient.patch(endpoint, toFormData(dataObj), {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return handleApiResponse(res).getData()
}

// ----------------------
// ModelAttribute 변환 (자동 FormData 변환)
// ----------------------
const toFormData = (dataObj) => {
  const formData = new FormData()
  for (const key in dataObj) {
    if (dataObj[key] instanceof File || dataObj[key] instanceof Blob) {
      formData.append(key, dataObj[key])
    } else if (Array.isArray(dataObj[key])) {
      dataObj[key].forEach((item) => formData.append(key, item))
    } else if (dataObj[key] !== undefined && dataObj[key] !== null) {
      formData.append(key, dataObj[key])
    }
  }
  return formData
}

export const apiPostModelAttr = async (endpoint, dataObj) => {
  const res = await apiClient.post(endpoint, toFormData(dataObj), {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return handleApiResponse(res).getData()
}

export const apiPutModelAttr = async (endpoint, dataObj) => {
  const res = await apiClient.put(endpoint, toFormData(dataObj), {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return handleApiResponse(res).getData()
}

// 기본 axios 인스턴스 export (드라이브 API에서 사용)
export default apiClient
