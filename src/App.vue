<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { useSSEStore } from '@/store/sseStore'

// 스토어 인스턴스 생성
const authStore = useAuthStore()
const sseStore = useSSEStore()

// 앱 초기화 시 SSE 연결 설정
onMounted(async () => {
  // 1. authStore 초기화
  authStore.initializeAuth()
  
  // 2. 인증된 사용자라면 SSE 연결
  if (authStore.isAuthenticated) {
    try {
      sseStore.initializeSSE()
    } catch (error) {
      console.error('SSE 연결 초기화 실패:', error)
    }
  }
})
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
