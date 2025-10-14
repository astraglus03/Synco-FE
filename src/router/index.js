import { createRouter, createWebHistory } from 'vue-router'
// import { useAuthStore } from '@/store/authStore'

// View 컴포넌트들
import LandingPage from '@/views/landing/LandingPage.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import GoogleRedirect from '@/views/auth/GoogleRedirect.vue'
import KakaoRedirect from '@/views/auth/KakaoRedirect.vue'
import NaverRedirect from '@/views/auth/NaverRedirect.vue'
import SocialMemberId from '@/views/auth/SocialMemberId.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
    meta: { requiresAuth: false },
  },
  {
    path: '/workspace',
    redirect: '/workspace/personal/dashboard'
  },
  {
    path: '/workspace/:workspaceId/:channel/:subChannel?',
    name: 'Workspace',
    component: MainLayout,
  },
  {
    path: "/oauth/google/redirect",
    name: "GoogleOAuthRedirect",
    component: GoogleRedirect,
    meta: { requiresAuth: false },
  },
  {
    path: "/oauth/kakao/redirect",
    name: "KakaoOAuthRedirect",
    component: KakaoRedirect,
    meta: { requiresAuth: false },
  },
  {
    path: "/oauth/naver/redirect",
    name: "NaverOAuthRedirect",
    component: NaverRedirect,
    meta: { requiresAuth: false },
  },
  {
    path: "/oauth/member-id",
    name: "SocialMemberId",
    component: SocialMemberId,
    meta: { requiresAuth: false },
  },
  

]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

//// 네비게이션 가드 (토큰 관련 제약 주석처리)
// router.beforeEach((to, from, next) => {
//   const authStore = useAuthStore()
//   const isAuthenticated = authStore.isAuthenticated

//   // 기본값: requiresAuth가 명시되지 않으면 true로 간주
//   const requiresAuth = to.meta.requiresAuth !== false
  
//   if (requiresAuth && !isAuthenticated) {
//     next({ name: 'Landing' })
//   } else {
//     next()
//   }
// })

export default router