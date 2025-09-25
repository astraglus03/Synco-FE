import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { handleApiResponse } from '@/models/common/ApiResponse'

// ----------------------
// Axios 인스턴스
// ----------------------
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 요청 인터셉터 (토큰 자동 주입)
// 모든 API 요청에 자동으로 Authorization 헤더 추가
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore?.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
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
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken: authStore.refreshToken }
        )
        authStore.setAccessToken(data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(originalRequest)
      } catch {
        authStore.logout()
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
