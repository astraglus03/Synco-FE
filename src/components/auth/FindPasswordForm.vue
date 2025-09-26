<template>
  <div class="find-password-container">
    <!-- 헤더 -->
    <div class="find-password-header">
      <div class="icon-wrapper">
        <v-icon size="48" color="primary">mdi-lock-reset</v-icon>
      </div>
      <h1 class="title">비밀번호 찾기</h1>
      <p class="subtitle">회원ID로 임시 비밀번호를 발송받으세요</p>
    </div>

    <!-- 비밀번호 찾기 폼 -->
    <v-form ref="findPasswordForm" v-model="isFormValid" @submit.prevent="handleFindPassword" class="find-password-form">
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

      <!-- 비밀번호 찾기 버튼 -->
      <v-btn
        type="submit"
        size="x-large"
        block
        :loading="isLoading"
        :disabled="!isFormValid"
        color="primary"
        class="find-button"
        elevation="0"
      >
        <v-icon left>mdi-email-send</v-icon>
        임시 비밀번호 발송
      </v-btn>
    </v-form>

    <!-- 결과 섹션 -->
    <div v-if="passwordSent" class="result-section">
      <div class="result-card">
        <div class="result-icon">
          <v-icon size="48" color="success">mdi-email-check</v-icon>
        </div>
        <h3 class="result-title">임시 비밀번호가 발송되었습니다!</h3>
        <div class="result-content">
          <p class="result-text">
            등록된 이메일로 임시 비밀번호를 발송했습니다.<br>
            이메일을 확인해주세요.
          </p>
          <div class="password-info">
            <div class="info-item">
              <v-icon color="info" size="20">mdi-information</v-icon>
              <span>임시 비밀번호는 영대문자 6자리입니다</span>
            </div>
            <div class="info-item">
              <v-icon color="warning" size="20">mdi-alert</v-icon>
              <span>보안을 위해 로그인 후 비밀번호를 변경해주세요</span>
            </div>
          </div>
        </div>
        <div class="result-actions">
          <v-btn
            color="primary"
            variant="outlined"
            @click="resetForm"
            class="reset-button"
          >
            다시 찾기
          </v-btn>
          <v-btn
            color="primary"
            @click="$emit('switch-to-login')"
            class="login-button"
          >
            로그인하기
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 안내 메시지 -->
    <div v-if="!passwordSent && !isLoading" class="info-section">
      <div class="info-card">
        <v-icon color="info" class="info-icon">mdi-information</v-icon>
        <div class="info-content">
          <h4 class="info-title">비밀번호를 찾을 수 없나요?</h4>
          <p class="info-text">
            입력하신 회원ID가 정확한지 확인해보세요.<br>
            여전히 문제가 있다면 고객센터로 문의해주세요.
          </p>
        </div>
      </div>
    </div>

    <!-- 이메일 확인 안내 -->
    <div v-if="passwordSent" class="email-guide">
      <div class="guide-card">
        <v-icon color="primary" class="guide-icon">mdi-email-outline</v-icon>
        <div class="guide-content">
          <h4 class="guide-title">이메일을 확인해주세요</h4>
          <p class="guide-text">
            임시 비밀번호가 포함된 이메일을 발송했습니다.<br>
            스팸 폴더도 확인해보세요.
          </p>
          <div class="guide-actions">
            <v-btn
              variant="text"
              color="primary"
              size="small"
              @click="resendEmail"
              :loading="resending"
              class="resend-button"
            >
              <v-icon left>mdi-refresh</v-icon>
              다시 발송
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- 로그인 링크 -->
    <div class="back-link">
      <v-btn
        variant="text"
        color="primary"
        @click="$emit('switch-to-login')"
        class="back-button"
      >
        <v-icon left>mdi-arrow-left</v-icon>
        로그인으로 돌아가기
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Props & Emits
const emit = defineEmits(['switch-to-login'])

// Reactive data
const findPasswordForm = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const passwordSent = ref(false)
const resending = ref(false)

const formData = ref({
  userId: ''
})

// Validation rules
const userIdRules = [
  v => !!v || '회원ID를 입력해주세요',
  v => (v && v.length >= 3) || '회원ID는 3자 이상이어야 합니다'
]

// Methods
const handleFindPassword = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    passwordSent.value = true
  } catch (error) {
    console.error('비밀번호 찾기 실패:', error)
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  passwordSent.value = false
  formData.value = {
    userId: ''
  }
  findPasswordForm.value?.reset()
}

const resendEmail = async () => {
  resending.value = true
  try {
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 재발송 성공 알림 (실제로는 토스트 메시지 등 사용)
    console.log('이메일이 다시 발송되었습니다.')
  } catch (error) {
    console.error('재발송 실패:', error)
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.find-password-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
}

/* 헤더 */
.find-password-header {
  text-align: center;
  margin-bottom: 2rem;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

/* 폼 */
.find-password-form {
  margin-bottom: 2rem;
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

/* 찾기 버튼 */
.find-button {
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

.find-button:hover {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
  color: white !important;
}

/* 결과 섹션 */
.result-section {
  margin-bottom: 2rem;
}

.result-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #22c55e;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
}

.result-icon {
  margin-bottom: 1rem;
}

.result-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 1rem 0;
}

.result-content {
  margin-bottom: 1.5rem;
}

.result-text {
  color: #166534;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.password-info {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  text-align: left;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #166534;
}

.info-item:last-child {
  margin-bottom: 0;
}

.result-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.reset-button,
.login-button {
  border-radius: 8px;
  font-weight: 600;
  text-transform: none;
}

/* 안내 메시지 */
.info-section {
  margin-bottom: 2rem;
}

.info-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.info-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.info-content {
  flex: 1;
}

.info-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.info-text {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

/* 이메일 확인 안내 */
.email-guide {
  margin-bottom: 2rem;
}

.guide-card {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.guide-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.guide-content {
  flex: 1;
}

.guide-title {
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
}

.guide-text {
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.guide-actions {
  display: flex;
  gap: 0.5rem;
}

.resend-button {
  font-size: 0.875rem;
  text-transform: none;
}

/* 뒤로가기 링크 */
.back-link {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.back-button {
  font-weight: 600;
  text-decoration: none;
}

/* 반응형 */
@media (max-width: 480px) {
  .find-password-container {
    padding: 1rem;
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .reset-button,
  .login-button {
    width: 100%;
  }
  
  .guide-actions {
    flex-direction: column;
  }
  
  .resend-button {
    width: 100%;
  }
}
</style>
