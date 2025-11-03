import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import sseConnection from '@/api/notification/sseApi'

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

  // 사용자 ID (memberSeq)
  const memberSeq = ref(localStorage.getItem('memberSeq') || null)

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
  }

  // 사용자 ID 설정
  const setMemberSeq = (id) => {
    memberSeq.value = id
    if (id) {
      localStorage.setItem('memberSeq', id)
    } else {
      localStorage.removeItem('memberSeq')
    }
  }

  // 로그인 (RT는 Cookie로 관리되므로 제외)
  const login = (tokens, userData, memberSeqValue) => {
    setAccessToken(tokens.accessToken)
    setUser(userData)
    setMemberSeq(memberSeqValue)
  }

  // 로그아웃
  const logout = async () => {
    // SSE 서버 disconnect 요청 (인증 정보가 있을 때만)
    try {
      await sseConnection.disconnectFromServer()
    } catch (error) {
      console.error('SSE disconnect 실패:', error)
      // 로그아웃 흐름을 방해하지 않도록 에러를 무시
    }
    
    // SSE 클라이언트 연결 종료
    sseConnection.disconnect()
    
    setAccessToken(null)
    setUser(null)
    setMemberSeq(null)
    
    // localStorage의 모든 인증 관련 데이터 삭제
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('memberSeq')
    
    // RT는 서버에서 Cookie 삭제 처리
  }

  // 토큰 초기화 (앱 시작 시)
  const initializeAuth = () => {
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    const storedMemberSeq = localStorage.getItem('memberSeq')

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
    if (storedMemberSeq) {
      memberSeq.value = storedMemberSeq
    }
  }

  return {
    // State
    accessToken,
    user,
    memberSeq,
    
    // Getters
    isAuthenticated,
    
    // Actions
    setAccessToken,
    setUser,
    setMemberSeq,
    login,
    logout,
    initializeAuth
  }
})

