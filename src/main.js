import './assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { useAuthStore } from './store/authStore'
import axios from 'axios'
import apiClient from '@/utils/api'

// 전역 컴포넌트 import
import GlobalSearch from '@/components/common/GlobalSearch.vue'

// ===== 콘솔 로그 필터링 설정 =====
// NOTE: 로컬에서 전체 로그를 보려면 localStorage.setItem('DEBUG_LOGS','1')
// const originalConsoleLog = console.log
// if (localStorage.getItem('DEBUG_LOGS') !== '1') {
//   // SSE 및 알림, 스케줄/워크스페이스 디버그 로그만 표시
//   console.log = function(...args) {
//     const firstArg = String(args[0] || '')
//     const allowedKeywords = [
//       '[SSE]',
//       '[알림',
//       'SSE 연결',
//       'SSE 메시지',
//       '알림 수신',
//       '알림 Store',
//       '[App] 로그인',
//       '[App] 로그아웃',
//       '[Schedule]',
//       '[WorkspaceMemberStore]',
//       '[Workspace]',
//       '[인터셉터]'
//     ]
//     const shouldLog = allowedKeywords.some(keyword => firstArg.includes(keyword))
//     if (shouldLog) {
//       originalConsoleLog.apply(console, args)
//     }
//   }
// }

// console.warn 비활성화 (임시)
// const originalConsoleWarn = console.warn
// if (localStorage.getItem('DEBUG_LOGS') !== '1') {
//   console.warn = function(...args) {
//     const firstArg = String(args[0] || '')
//     // SSE 및 스케줄/워크스페이스 관련 경고만 표시
//     if (firstArg.includes('[SSE]') || firstArg.includes('[Schedule]') || firstArg.includes('[Workspace')) {
//       originalConsoleWarn.apply(console, args)
//     }
//   }
// }

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
        const { data } = await apiClient.post(
          '/workspace-service/member/refreshAt',
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

