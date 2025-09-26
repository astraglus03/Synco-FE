import './assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
// import { apiClient } from './utils/api'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

// Interceptor 설정 (주석처리)
// app.config.globalProperties.$http = apiClient

app.mount('#app')
