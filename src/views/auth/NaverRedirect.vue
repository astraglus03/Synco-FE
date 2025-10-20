<template>
  <div class="oauth-redirect-page naver">
    <div class="redirect-container">
      <!-- 브랜드 로고 -->
      <div class="brand-section">
        <h1 class="brand-name">Synco</h1>
      </div>

      <!-- 소셜 아이콘 -->
      <div class="social-icon-wrapper">
        <img :src="naverLogo" alt="Naver" class="social-icon" />
      </div>

      <!-- 로딩 스피너 -->
      <div class="loading-section">
        <v-progress-circular
          :size="60"
          :width="5"
          color="#03C75A"
          indeterminate
          class="loading-spinner"
        ></v-progress-circular>
      </div>

      <!-- 메시지 -->
      <div class="message-section">
        <h2 class="main-message">Naver 로그인 진행 중</h2>
        <p class="sub-message">잠시만 기다려주세요...</p>
      </div>

      <!-- 점 애니메이션 -->
      <div class="dots-loading">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import naverLogo from '@/assets/images/social/naver.png'

const authStore = useAuthStore()

const sendCodeToServer = async (code, state) => {
    if (!code) {
        window.location.href = "/"
        return
    }
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
    const payload = { code }
    if (state) payload.state = state
    const { data } = await axios.post(
        `${baseUrl}/workspace-service/member/naver/doLogin`, 
        payload,
        { withCredentials: true } // ✅ 쿠키 수신 활성화
    )
    const body = data?.data ?? data
    // 토큰 저장 (AT만, RT는 HttpOnly Cookie로 자동 관리)
    if (body.accessToken) authStore.setAccessToken(body.accessToken)
    if (body.user) authStore.setUser(body.user)
    if (body.needMemberId) {
        window.location.href = '/oauth/member-id'
        return
    }
    window.location.href = '/workspace/personal/dashboard'
}

onMounted(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    sendCodeToServer(code, state)
})
</script>

<style scoped>
.oauth-redirect-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9ca3af;
  position: relative;
  overflow: hidden;
}

/* 배경 애니메이션 */
.oauth-redirect-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: backgroundMove 20s linear infinite;
}

@keyframes backgroundMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.redirect-container {
  background: white;
  border-radius: 24px;
  padding: 3rem 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  text-align: center;
  min-width: 400px;
  position: relative;
  z-index: 1;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 브랜드 섹션 */
.brand-section {
  margin-bottom: 2rem;
}

.brand-name {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

/* 소셜 아이콘 */
.social-icon-wrapper {
  margin-bottom: 2rem;
  animation: bounceIn 0.8s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.social-icon {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

/* 로딩 섹션 */
.loading-section {
  margin-bottom: 2rem;
}

.loading-spinner {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 메시지 섹션 */
.message-section {
  margin-bottom: 1.5rem;
}

.main-message {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.sub-message {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

/* 점 애니메이션 */
.dots-loading {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #03C75A;
  animation: dotBounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dotBounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 반응형 */
@media (max-width: 480px) {
  .redirect-container {
    min-width: auto;
    width: 90%;
    padding: 2rem 1.5rem;
  }

  .brand-name {
    font-size: 2rem;
  }

  .social-icon {
    width: 60px;
    height: 60px;
  }

  .main-message {
    font-size: 1.25rem;
  }
}
</style>

