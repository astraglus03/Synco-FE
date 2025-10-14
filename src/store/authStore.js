import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // 토큰
  const accessToken = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)
  
  // 사용자 정보
  const user = ref(null)
  const userString = localStorage.getItem('user')
  if (userString) {
    try {
      user.value = JSON.parse(userString)
    } catch (e) {
      console.error('Failed to parse user data:', e)
    }
  }

  // 로그인 여부
  const isAuthenticated = computed(() => !!accessToken.value)

  // 액세스 토큰 설정
  const setAccessToken = (token) => {
    accessToken.value = token
    if (token) {
      localStorage.setItem('accessToken', token)
    } else {
      localStorage.removeItem('accessToken')
    }
  }

  // 리프레시 토큰 설정
  const setRefreshToken = (token) => {
    refreshToken.value = token
    if (token) {
      localStorage.setItem('refreshToken', token)
    } else {
      localStorage.removeItem('refreshToken')
    }
  }

  // 사용자 정보 설정
  const setUser = (userData) => {
    user.value = userData
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }

  // 로그인
  const login = (tokens, userData) => {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setUser(userData)
  }

  // 로그아웃
  const logout = () => {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }

  // 토큰 초기화 (앱 시작 시)
  const initializeAuth = () => {
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user')

    if (storedAccessToken) {
      accessToken.value = storedAccessToken
    }
    if (storedRefreshToken) {
      refreshToken.value = storedRefreshToken
    }
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }

  return {
    // State
    accessToken,
    refreshToken,
    user,
    
    // Getters
    isAuthenticated,
    
    // Actions
    setAccessToken,
    setRefreshToken,
    setUser,
    login,
    logout,
    initializeAuth
  }
})

