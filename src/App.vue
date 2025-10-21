<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/store/authStore'

// 스토어 인스턴스 생성
const authStore = useAuthStore()

// 앱 초기화
onMounted(async () => {
  // authStore 초기화
  authStore.initializeAuth()
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
