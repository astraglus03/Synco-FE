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

const app = createApp(App)

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
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
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

