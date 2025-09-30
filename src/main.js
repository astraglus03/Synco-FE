import './assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
// import { apiClient } from './utils/api'

// 전역 컴포넌트 import
import GlobalSearch from '@/components/common/GlobalSearch.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

// 전역 컴포넌트 등록
app.component('GlobalSearch', GlobalSearch)

// Interceptor 설정 (주석처리)
// app.config.globalProperties.$http = apiClient

app.mount('#app')
