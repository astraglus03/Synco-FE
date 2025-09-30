<template>
  <div class="login-container">
    <!-- 헤더 -->
    <div class="login-header">
      <div class="brand-logo">
        <h1 class="brand-name">Synco</h1>
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
            v-model="formData.userId"
            placeholder="회원ID를 입력하세요"
            :rules="userIdRules"
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

      <!-- 자동 로그인 -->
      <div class="remember-section">
        <v-checkbox
          v-model="formData.rememberMe"
          color="primary"
          hide-details
          class="remember-checkbox"
        >
          <template #label>
            <span class="remember-text">자동 로그인</span>
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
          variant="outlined"
          size="large"
          @click="handleSocialLogin('google')"
          :loading="socialLoading === 'google'"
          class="social-btn google-btn"
        >
          <v-icon left color="red">mdi-google</v-icon>
          Google
        </v-btn>
        <v-btn
          variant="outlined"
          size="large"
          @click="handleSocialLogin('naver')"
          :loading="socialLoading === 'naver'"
          class="social-btn naver-btn"
        >
          <v-icon left color="green">mdi-naver</v-icon>
          Naver
        </v-btn>
        <v-btn
          variant="outlined"
          size="large"
          @click="handleSocialLogin('kakao')"
          :loading="socialLoading === 'kakao'"
          class="social-btn kakao-btn"
        >
          <v-icon left color="yellow">mdi-chat</v-icon>
          Kakao
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

// Props & Emits
const emit = defineEmits(['switch-to-signup', 'switch-to-find', 'login-success'])

// Reactive data
const loginForm = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const socialLoading = ref(null)
const showPassword = ref(false)

const formData = ref({
  userId: '',
  password: '',
  rememberMe: false
})

// Validation rules
const userIdRules = [
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
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const userData = {
      id: 1,
      email: 'test@example.com',
      userId: formData.value.userId,
      name: '테스트 사용자',
      phone: '010-1234-5678',
      profileImage: null,
      socialProvider: null,
      createdAt: new Date().toISOString()
    }
    
    // 자동 로그인 설정
    if (formData.value.rememberMe) {
      localStorage.setItem('autoLogin', 'true')
      localStorage.setItem('userEmailOrId', formData.value.userId)
    }
    
    emit('login-success', userData)
  } catch (error) {
    console.error('로그인 실패:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSocialLogin = async (provider) => {
  socialLoading.value = provider
  
  try {
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const socialData = {
      id: 2,
      email: 'social@example.com',
      userId: 'socialuser',
      name: '소셜사용자',
      phone: null,
      profileImage: null,
      socialProvider: provider,
      createdAt: new Date().toISOString()
    }
    
    emit('login-success', socialData)
  } catch (error) {
    console.error('소셜 로그인 실패:', error)
  } finally {
    socialLoading.value = null
  }
}

// 자동 로그인 체크
const checkAutoLogin = () => {
  const autoLogin = localStorage.getItem('autoLogin')
  const userEmailOrId = localStorage.getItem('userEmailOrId')
  
  if (autoLogin === 'true' && userEmailOrId) {
    formData.value.userId = userEmailOrId
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

.brand-name {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
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
}

.custom-input :deep(.v-field) {
  background: transparent;
  box-shadow: none;
  border: none;
}

.custom-input :deep(.v-field__input) {
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
}

.custom-input :deep(.v-field__input::placeholder) {
  color: #9ca3af;
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
  flex-direction: column;
  gap: 0.75rem;
}

.social-btn {
  height: 48px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.025em;
  border: 2px solid #e5e7eb;
  background: white;
  color: #374151 !important;
  transition: all 0.2s ease;
}

.social-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.social-btn :deep(.v-btn__content) {
  color: #374151 !important;
  font-weight: 600;
}

.google-btn:hover {
  border-color: #db4437;
  color: #db4437;
}

.naver-btn:hover {
  border-color: #03c75a;
  color: #03c75a;
}

.kakao-btn:hover {
  border-color: #fee500;
  color: #fdd835;
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
  
  .brand-name {
    font-size: 1.75rem;
  }
  
  .social-buttons {
    gap: 0.5rem;
  }
}
</style>
