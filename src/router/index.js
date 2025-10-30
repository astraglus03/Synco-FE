import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/authStore'

// View 컴포넌트들
import LandingPage from '@/views/landing/LandingPage.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import GoogleRedirect from '@/views/auth/GoogleRedirect.vue'
import KakaoRedirect from '@/views/auth/KakaoRedirect.vue'
import NaverRedirect from '@/views/auth/NaverRedirect.vue'
import SocialMemberId from '@/views/auth/SocialMemberId.vue'
import MeetingView from '@/views/MeetingView.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
    meta: { requiresAuth: false },
  },
  {
    path: '/workspace',
    redirect: '/workspaces/personal/dashboard',
    meta: { requiresAuth: true }, // 인증 필요
  },
  {
    path: '/workspaces',
    redirect: '/workspaces/personal/dashboard',
    meta: { requiresAuth: true }, // 인증 필요
  },
  {
    path: '/workspace/:workspaceId/:channel/:subChannel?',
    redirect: (to) => {
      // 기존 /workspace URL을 /workspaces로 리다이렉트
      return `/workspaces/${to.params.workspaceId}/${to.params.channel}${to.params.subChannel ? '/' + to.params.subChannel : ''}`
    },
    meta: { requiresAuth: true },
  },
  {
    path: '/workspaces/:workspaceId/:channel/:subChannel?',
    name: 'Workspace',
    component: MainLayout,
    meta: { requiresAuth: true }, // 인증 필요
  },
  {
    path: '/drive/:driveChannelSeq/documents/:documentSeq',
    name: 'DocumentEditor',
    component: () => import('@/components/workspace/SharedDocEditor.vue'),
    props: true,
  },
  {
    path: '/meeting/:roomId',
    name: 'MeetingView',
    component: MeetingView,
    props: true,
    meta: { requiresAuth: true },
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
    next({ path: '/workspaces/personal/dashboard' })
  } else {
    // 정상 접근
    next()
  }
})

export default router