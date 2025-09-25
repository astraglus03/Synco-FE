import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store/authStore'

// View 컴포넌트들
// import HomeView from '@/views/HomeView.vue'
// import LoginView from '@/views/LoginView.vue'
// import UserListView from '@/views/UserListView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    // component: HomeView,
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'Login',
    // component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/users',
    name: 'UserList',
    // component: UserListView,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 네비게이션 가드
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router