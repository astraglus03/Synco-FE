<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'

// 스토어 인스턴스 생성
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const router = useRouter()

// 해상도 변화나 회전 시 알림 사이드바 강제 닫기 (모바일~태블릿 포함)
const closeNotificationSidebar = () => {
  notificationStore.notificationSidebarVisible = false
}

// 앱 초기화
onMounted(async () => {
  // authStore 초기화
  authStore.initializeAuth()
  
  // 이미 로그인되어 있으면 사용자 정보 조회 및 SSE 연결
  if (authStore.memberSeq) {
    // console.log('[App] 로그인 상태 확인 - SSE 연결 및 알림 불러오기 시작')
    
    // 사용자 정보 조회 (ynAlarmOffSet 포함)
    try {
      const { getMyPage } = await import('@/api/member/auth')
      const userData = await getMyPage()
      authStore.setUser({
        ...authStore.user,
        ...userData,
        ynAlarmOffSet: userData.ynAlarmOffSet || 'Y'
      })
      console.log('[App] 사용자 정보 로드 완료, ynAlarmOffSet:', userData.ynAlarmOffSet)
    } catch (error) {
      console.error('[App] 사용자 정보 조회 실패:', error)
    }
    
    // SSE 재연결 카운터 초기화 (새로고침 시)
    notificationStore.resetSSEReconnection()
    
    // SSE 연결
    notificationStore.connectSSE()
    notificationStore.requestNotificationPermission()
    
    // 기존 알림 목록 불러오기
    try {
      await notificationStore.fetchNotifications()
      // console.log('[App] 기존 알림 목록 불러오기 완료')
    } catch (error) {
      // console.error('[App] 기존 알림 목록 불러오기 실패:', error)
    }
    
    // 알림 사이드바는 항상 닫혀있어야 함
    notificationStore.notificationSidebarVisible = false
  }
  window.addEventListener('resize', closeNotificationSidebar)
  window.addEventListener('orientationchange', closeNotificationSidebar)
})

// authStore의 memberSeq 감시 - 로그인/로그아웃 감지
watch(() => authStore.memberSeq, async (newMemberSeq, oldMemberSeq) => {
  if (newMemberSeq && !oldMemberSeq) {
    // 로그인됨
    // console.log('[App] 로그인 감지 - SSE 연결 및 알림 불러오기 시작')
    
    // SSE 재연결 카운터 초기화 (새로 로그인 시)
    notificationStore.resetSSEReconnection()
    
    // SSE 연결
    notificationStore.connectSSE()
    notificationStore.requestNotificationPermission()
    
    // 기존 알림 목록 불러오기
    try {
      await notificationStore.fetchNotifications()
      // console.log('[App] 로그인 후 알림 목록 불러오기 완료')
    } catch (error) {
      // console.error('[App] 로그인 후 알림 목록 불러오기 실패:', error)
    }
    
    // 알림 사이드바는 항상 닫혀있어야 함
    notificationStore.notificationSidebarVisible = false
  } else if (!newMemberSeq && oldMemberSeq) {
    // 로그아웃됨
    // console.log('[App] 로그아웃 감지 - SSE 연결 종료')
    notificationStore.disconnectSSE()
    // 로컬 상태만 초기화 (API 호출 안 함)
    notificationStore.notifications = []
  }
})

// 컴포넌트 언마운트 시 SSE 연결 종료
onUnmounted(() => {
  notificationStore.disconnectSSE()
  // 전역 리스너 해제
  window.removeEventListener('resize', closeNotificationSidebar)
  window.removeEventListener('orientationchange', closeNotificationSidebar)
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
