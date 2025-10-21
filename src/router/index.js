import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/authStore'

// View 컴포넌트들
import LandingPage from '@/views/landing/LandingPage.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import GoogleRedirect from '@/views/auth/GoogleRedirect.vue'
import KakaoRedirect from '@/views/auth/KakaoRedirect.vue'
import NaverRedirect from '@/views/auth/NaverRedirect.vue'
import SocialMemberId from '@/views/auth/SocialMemberId.vue'
import Chat from '@/components/workspace/Chat.vue'


const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
    meta: { requiresAuth: false },
  },
  {
    path: '/workspace',
    redirect: '/workspace/personal/dashboard',
    meta: { requiresAuth: true }, // 인증 필요
  },
  {
    path: '/workspace/:workspaceId/:channel/:subChannel?',
    name: 'Workspace',
    component: MainLayout,
    meta: { requiresAuth: true }, // 인증 필요
  },
  {
    path: '/chatpage/:channelSeq',
    name: 'Chat',
    component: Chat
  },
  {
    path: '/drive/:driveChannelSeq/documents/:documentSeq',
    name: 'DocumentEditor',
    component: () => import('@/components/workspace/SharedDocEditor.vue'),
    props: true,
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

// ----------------------
// 네비게이션 가드 (인증 체크)
// ----------------------
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  // 인증이 필요한 페이지인지 확인
  const requiresAuth = to.meta.requiresAuth === true
  
  if (requiresAuth && !isAuthenticated) {
    // 토큰 없이 인증 필요 페이지 접근 시도 → 랜딩 페이지로 리다이렉트
    next({ name: 'Landing' })
  } else if (to.name === 'Landing' && isAuthenticated) {
    // 이미 로그인한 사용자가 랜딩 페이지 접근 시도 → 워크스페이스로 리다이렉트
    next({ path: '/workspace/personal/dashboard' })
  } else {
    // 정상 접근
    next()
  }
})

export default router