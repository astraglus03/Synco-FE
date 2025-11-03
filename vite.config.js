import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'


export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server:{
    port: 3000,
    proxy: {
      // 백엔드 게이트웨이로 프록시 (개발 환경)
      '/workspace-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/drive-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
      '/document-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/meeting-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/notification-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/task-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/chat-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true, // WebSocket 지원
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  define:{
    global: 'globalThis',
  }
})
