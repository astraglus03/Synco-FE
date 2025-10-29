<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'

// 스토어 인스턴스 생성
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

// 앱 초기화
onMounted(async () => {
  // authStore 초기화
  authStore.initializeAuth()
  
  // 이미 로그인되어 있으면 SSE 연결
  if (authStore.memberSeq) {
    console.log('[App] 로그인 상태 확인 - SSE 연결 시작')
    notificationStore.connectSSE()
    notificationStore.requestNotificationPermission()
  }
})

// authStore의 memberSeq 감시 - 로그인/로그아웃 감지
watch(() => authStore.memberSeq, (newMemberSeq, oldMemberSeq) => {
  if (newMemberSeq && !oldMemberSeq) {
    // 로그인됨
    console.log('[App] 로그인 감지 - SSE 연결 시작')
    notificationStore.connectSSE()
    notificationStore.requestNotificationPermission()
  } else if (!newMemberSeq && oldMemberSeq) {
    // 로그아웃됨
    console.log('[App] 로그아웃 감지 - SSE 연결 종료')
    notificationStore.disconnectSSE()
    notificationStore.clearAllNotifications()
  }
})

// 컴포넌트 언마운트 시 SSE 연결 종료
onUnmounted(() => {
  notificationStore.disconnectSSE()
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
