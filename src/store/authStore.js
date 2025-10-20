import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // 토큰 (AT만 localStorage)
  const accessToken = ref(localStorage.getItem('accessToken') || null)
  
  // 사용자 정보
  const user = ref(null)
  const userString = localStorage.getItem('user')
  if (userString) {
    try {
      user.value = JSON.parse(userString)
    } catch (e) {
      // 파싱 실패 시 무시
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

  // 사용자 정보 설정
  const setUser = (userData) => {
    // 강제로 반응성 트리거
    user.value = null
    user.value = userData
    
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
    
    // 디버깅용 로그
    console.log('authStore setUser:', userData)
  }

  // 로그인 (RT는 Cookie로 관리되므로 제외)
  const login = (tokens, userData) => {
    setAccessToken(tokens.accessToken)
    setUser(userData)
  }

  // 로그아웃
  const logout = () => {
    setAccessToken(null)
    setUser(null)
    
    // localStorage의 모든 인증 관련 데이터 삭제
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    
    // RT는 서버에서 Cookie 삭제 처리
  }

  // 토큰 초기화 (앱 시작 시)
  const initializeAuth = () => {
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')


    if (storedAccessToken) {
      accessToken.value = storedAccessToken
    }
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        // 파싱 실패 시 무시
      }
    }
  }

  return {
    // State
    accessToken,
    user,
    
    // Getters
    isAuthenticated,
    
    // Actions
    setAccessToken,
    setUser,
    login,
    logout,
    initializeAuth
  }
})

