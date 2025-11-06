<template>
  <div class="login-container">
    <!-- 헤더 -->
    <div class="login-header">
      <div class="brand-logo">
        <img src="/synco_combined.png" alt="Synco" class="brand-logo-img" />
      </div>
      <p class="welcome-text">다시 오신 것을 환영합니다!</p>
    </div>

    <!-- 로그인 폼 -->
    <v-form ref="loginForm" v-model="isFormValid" @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label class="form-label">회원ID</label>
        <div class="input-wrapper">
          <v-icon class="input-icon">mdi-account</v-icon>
          <v-text-field
            v-model="formData.memberId"
            placeholder="회원ID를 입력하세요"
            :rules="memberIdRules"
            variant="plain"
            hide-details="auto"
            class="custom-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">비밀번호</label>
        <div class="input-wrapper">
          <v-icon class="input-icon">mdi-lock</v-icon>
          <v-text-field
            v-model="formData.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="비밀번호를 입력하세요"
            :rules="passwordRules"
            variant="plain"
            hide-details="auto"
            class="custom-input"
          />
          <v-btn
            icon
            variant="text"
            size="small"
            @click="showPassword = !showPassword"
            class="password-toggle"
          >
            <v-icon>{{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- 회원ID 기억하기 -->
      <div class="remember-section">
        <v-checkbox
          v-model="formData.rememberMe"
          color="primary"
          hide-details
          class="remember-checkbox"
        >
          <template #label>
            <span class="remember-text">회원ID 기억하기</span>
          </template>
        </v-checkbox>
        <v-btn
          variant="text"
          color="primary"
          size="small"
          @click="$emit('switch-to-find')"
          class="forgot-link"
        >
          비밀번호를 잊으셨나요?
        </v-btn>
      </div>

      <!-- 로그인 버튼 -->
      <v-btn
        type="submit"
        size="x-large"
        block
        :loading="isLoading"
        :disabled="!isFormValid"
        color="primary"
        class="login-button"
        elevation="0"
      >
        <v-icon left>mdi-login</v-icon>
        로그인
      </v-btn>
    </v-form>

    <!-- 구분선 -->
    <div class="divider">
      <span class="divider-text">또는</span>
    </div>

    <!-- 소셜 로그인 -->
    <div class="social-login">
      <div class="social-buttons">
        <v-btn
          icon
          variant="outlined"
          size="large"
          @click="handleSocialLogin('google')"
          :loading="socialLoading === 'google'"
          class="social-btn google-btn"
        >
          <img :src="googleLogo" alt="Google" class="social-logo" />
        </v-btn>
        <v-btn
          icon
          variant="outlined"
          size="large"
          @click="handleSocialLogin('naver')"
          :loading="socialLoading === 'naver'"
          class="social-btn naver-btn"
        >
          <img :src="naverLogo" alt="Naver" class="social-logo" />
        </v-btn>
        <v-btn
          icon
          variant="outlined"
          size="large"
          @click="handleSocialLogin('kakao')"
          :loading="socialLoading === 'kakao'"
          class="social-btn kakao-btn"
        >
          <img :src="kakaoLogo" alt="Kakao" class="social-logo" />
        </v-btn>
      </div>
    </div>

    <!-- 회원가입 링크 -->
    <div class="signup-link">
      <span class="signup-text">계정이 없으신가요?</span>
      <v-btn
        variant="text"
        color="primary"
        @click="$emit('switch-to-signup')"
        class="signup-button"
      >
        회원가입
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { doLogin } from '@/api/member/auth'
import { decodeJWT } from '@/utils/api'
import { useAuthStore } from '@/store/authStore'
import googleLogo from '@/assets/images/social/google.png'
import kakaoLogo from '@/assets/images/social/kakao.png'
import naverLogo from '@/assets/images/social/naver.png'

// Props & Emits
const emit = defineEmits(['switch-to-signup', 'switch-to-find', 'login-success'])

// Store
const authStore = useAuthStore()

// Reactive data
const loginForm = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const socialLoading = ref(null)
const showPassword = ref(false)

const formData = ref({
  memberId: '',
  password: '',
  rememberMe: false
})

// Validation rules
const memberIdRules = [
  v => !!v || '회원ID를 입력해주세요',
  v => (v && v.length >= 3) || '회원ID는 3자 이상이어야 합니다'
]

const passwordRules = [
  v => !!v || '비밀번호를 입력해주세요'
]

// Methods
const handleLogin = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    // 로그인 API 호출
    const loginData = {
      memberId: formData.value.memberId,
      password: formData.value.password
    }
    
    const response = await doLogin(loginData)
    
    // 토큰 저장 및 memberSeq 설정
    authStore.setAccessToken(response.accessToken)
    const payload = decodeJWT(response.accessToken)
    if (payload?.sub) {
      const memberSeq = parseInt(payload.sub, 10)
      if (!Number.isNaN(memberSeq)) {
        authStore.setMemberSeq(memberSeq)
      }
    }
    
    // 자동 로그인 설정
    if (formData.value.rememberMe) {
      localStorage.setItem('autoLogin', 'true')
      localStorage.setItem('userMemberId', formData.value.memberId)
    } else {
      localStorage.removeItem('autoLogin')
      localStorage.removeItem('userMemberId')
    }
    
    // 성공 알림
    emit('login-success', {
      message: '로그인이 완료되었습니다!',
      data: response
    })
    
    // 폼 초기화는 화면 전환 후에 이루어지도록 주석 처리
    // if (!formData.value.rememberMe) {
    //   formData.value.memberId = ''
    // }
    // formData.value.password = ''
    
  } catch (error) {
    console.error('로그인 실패:', error)
    
    // 에러 메시지 추출 및 표시
    let errorMessage = '로그인 중 오류가 발생했습니다.'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(errorMessage)
  } finally {
    isLoading.value = false
  }
}

import { redirectToGoogleOAuth, redirectToKakaoOAuth, redirectToNaverOAuth } from '@/utils/oauth'

const handleSocialLogin = async (provider) => {
  socialLoading.value = provider
  try {
    if (provider === 'google') {
      redirectToGoogleOAuth()
      return
    }
    if (provider === 'kakao') {
      redirectToKakaoOAuth()
      return
    }
    if (provider === 'naver') {
      redirectToNaverOAuth()
      return
    }
    // 다른 프로바이더는 준비되면 연결
    throw new Error('아직 지원되지 않는 소셜 로그인입니다')
  } catch (error) {
    console.error('소셜 로그인 실패:', error)
    alert(error.message)
  } finally {
    socialLoading.value = null
  }
}

// 자동 로그인 체크
const checkAutoLogin = () => {
  const autoLogin = localStorage.getItem('autoLogin')
  const userMemberId = localStorage.getItem('userMemberId')
  
  if (autoLogin === 'true' && userMemberId) {
    formData.value.memberId = userMemberId
    formData.value.rememberMe = true
  }
}

// 컴포넌트 마운트 시 자동 로그인 체크
checkAutoLogin()
</script>

<style scoped>
.login-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

/* 헤더 */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.brand-logo-img {
  height: 2.5rem;
  width: auto;
  object-fit: contain;
  display: block;
}

.welcome-text {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

/* 폼 */
.login-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.input-wrapper {
  position: relative;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
  min-height: 48px;
  display: flex;
  align-items: center;
  overflow: visible;
}

.input-wrapper:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 1;
  display: flex;
  align-items: center;
}

.custom-input {
  padding-left: 2rem;
  position: static;
  width: 100%;
}

.custom-input :deep(.v-field) {
  background: transparent;
  box-shadow: none;
  border: none;
  min-height: auto;
  height: auto;
  display: flex;
  align-items: center;
}

.custom-input :deep(.v-field__input) {
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.5 !important;
  min-height: auto;
  height: auto;
  padding: 0 !important;
  margin: 0 !important;
  opacity: 1 !important;
}

.custom-input :deep(.v-field__input::placeholder) {
  color: #9ca3af !important;
  opacity: 1 !important;
}

.custom-input :deep(.v-input__details) {
  position: absolute;
  left: 0;
  top: 100%;
  padding-top: 4px;
  padding-left: 0;
  margin: 0;
  width: 100%;
  text-align: right;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

/* 자동 로그인 섹션 */
.remember-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.remember-checkbox :deep(.v-label) {
  color: #6b7280;
  font-size: 0.875rem;
}

.forgot-link {
  font-size: 0.875rem;
  text-decoration: none;
}

/* 로그인 버튼 */
.login-button {
  height: 48px;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  color: white !important;
  text-transform: none;
  letter-spacing: 0.025em;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.login-button:hover {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
  color: white !important;
}

/* 구분선 */
.divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e5e7eb;
}

.divider-text {
  background: white;
  padding: 0 1rem;
  color: #9ca3af;
  font-size: 0.875rem;
  position: relative;
  z-index: 1;
}

/* 소셜 로그인 */
.social-login {
  margin-bottom: 1.5rem;
}

.social-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4.0rem;
}

.social-btn {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: white;
  transition: all 0.2s ease;
  padding: 0;
}

.social-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.social-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.google-btn:hover {
  border-color: #db4437;
  background: #fff5f5;
}

.naver-btn:hover {
  border-color: #03c75a;
  background: #f0fdf4;
}

.kakao-btn:hover {
  border-color: #fee500;
  background: #fefce8;
}

/* 회원가입 링크 */
.signup-link {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.signup-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-right: 0.5rem;
}

.signup-button {
  font-weight: 600;
  text-decoration: none;
}

/* 반응형 */
@media (max-width: 480px) {
  .login-container {
    padding: 1rem;
  }
  
  
  .social-buttons {
    gap: 0.5rem;
  }
}
</style>
