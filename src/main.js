import './assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { useAuthStore } from './store/authStore'
import axios from 'axios'

// 전역 컴포넌트 import
import GlobalSearch from '@/components/common/GlobalSearch.vue'

// ===== 콘솔 로그 필터링 설정 =====
// SSE 및 알림 관련 로그만 표시하고 나머지는 비활성화
const originalConsoleLog = console.log
console.log = function(...args) {
  // 첫 번째 인자를 문자열로 변환하여 체크
  const firstArg = String(args[0] || '')
  
  // SSE 또는 알림 관련 키워드가 있으면 로그 표시
  const allowedKeywords = [
    '[SSE]',
    '[알림',
    'SSE 연결',
    'SSE 메시지',
    '알림 수신',
    '알림 Store',
    '[App] 로그인',
    '[App] 로그아웃'
  ]
  
  const shouldLog = allowedKeywords.some(keyword => firstArg.includes(keyword))
  
  if (shouldLog) {
    originalConsoleLog.apply(console, args)
  }
}

// console.warn 비활성화 (임시)
const originalConsoleWarn = console.warn
console.warn = function(...args) {
  const firstArg = String(args[0] || '')
  
  // SSE 관련 경고만 표시
  if (firstArg.includes('[SSE]')) {
    originalConsoleWarn.apply(console, args)
  }
  // 나머지 경고는 무시
}

const app = createApp(App)

// Vue 경고 메시지 비활성화 (임시)
app.config.warnHandler = () => {}

// Vue 에러 핸들러 (SSE 관련만 표시)
app.config.errorHandler = (err, instance, info) => {
  const errorMsg = String(err?.message || err || '')
  if (errorMsg.includes('SSE') || errorMsg.includes('알림')) {
    console.error('[Vue Error]', err, info)
  }
  // 나머지 에러는 조용히 무시
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(vuetify)

// 전역 컴포넌트 등록
app.component('GlobalSearch', GlobalSearch)

// 앱 시작 시 토큰 확인 및 갱신
const authStore = useAuthStore()

const checkAndRefreshToken = async () => {
  const token = localStorage.getItem('accessToken')
  
  if (token) {
    try {
      // JWT 디코딩으로 만료 시간 확인
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      const expiryTime = payload.exp
      const timeLeft = expiryTime - currentTime
      
      // 이미 만료되었거나 5분 이내 만료 예정이면 갱신
      if (expiryTime <= currentTime || timeLeft < 300) {
        const baseUrl = (import.meta.env.VITE_API_URL).replace(/\/+$/, '')
        const { data } = await axios.post(
          `${baseUrl}/workspace-service/member/refreshAt`,
          {},
          { withCredentials: true }
        )
        
        const newAccessToken = data?.data?.accessToken || data?.accessToken
        authStore.setAccessToken(newAccessToken)
      }
    } catch (error) {
      authStore.logout()
    }
  }
}

// 앱 마운트 전에 토큰 체크
checkAndRefreshToken().finally(() => {
  app.mount('#app')
})

