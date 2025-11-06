<template>
  <div class="find-id-container">
    <!-- 헤더 -->
    <div class="find-id-header">
      <div class="brand-logo">
        <img src="/synco_combined.png" alt="Synco" class="brand-logo-img" />
      </div>
      <p class="welcome-text">회원 ID를 찾아보세요</p>
    </div>

    <!-- ID 찾기 폼 -->
    <v-form ref="findIdForm" v-model="isFormValid" @submit.prevent="handleFindId" class="find-id-form">
      <div class="form-group">
        <label class="form-label">이름</label>
        <div class="input-wrapper">
          <v-icon class="input-icon">mdi-account-circle</v-icon>
          <v-text-field
            v-model="formData.name"
            placeholder="이름을 입력하세요"
            :rules="nameRules"
            variant="plain"
            hide-details="auto"
            class="custom-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">이메일</label>
        <div class="input-wrapper">
          <v-icon class="input-icon">mdi-email</v-icon>
          <v-text-field
            v-model="formData.email"
            placeholder="이메일을 입력하세요"
            :rules="emailRules"
            variant="plain"
            hide-details="auto"
            class="custom-input"
          />
        </div>
      </div>

      <!-- ID 찾기 버튼 -->
      <v-btn
        type="submit"
        size="x-large"
        block
        :loading="isLoading"
        :disabled="!isFormValid"
        color="primary"
        class="find-id-button"
        elevation="0"
      >
        <v-icon left>mdi-magnify</v-icon>
        ID 찾기
      </v-btn>
    </v-form>

    <!-- 결과 섹션 -->
    <div v-if="foundId" class="result-section">
      <div class="result-card">
        <div class="result-icon">
          <v-icon size="48" color="success">mdi-check-circle</v-icon>
        </div>
        <h3 class="result-title">ID를 찾았습니다!</h3>
        <div class="result-content">
          <p class="result-text">회원ID:</p>
          <div class="id-display">
            <span class="id-text">{{ foundId }}</span>
            <v-btn
              icon
              variant="text"
              size="small"
              @click="copyToClipboard"
              class="copy-button"
            >
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
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
    <div v-if="!foundId && !isLoading" class="info-section">
      <div class="info-card">
        <v-icon color="info" class="info-icon">mdi-information</v-icon>
        <div class="info-content">
          <h4 class="info-title">ID를 찾을 수 없나요?</h4>
          <p class="info-text">
            입력하신 정보가 정확한지 확인해보세요.<br>
            여전히 문제가 있다면 고객센터로 문의해주세요.
          </p>
        </div>
      </div>
    </div>

    <!-- 로그인 링크 -->
    <div class="login-link">
      <span class="login-text">로그인 페이지로</span>
      <v-btn
        variant="text"
        color="primary"
        @click="$emit('switch-to-login')"
        class="login-button"
      >
        돌아가기
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { findMemberId } from '@/api/member/auth'

// Props & Emits
const emit = defineEmits(['switch-to-login'])

// Reactive data
const findIdForm = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const foundId = ref('')

const formData = ref({
  name: '',
  email: ''
})

// Validation rules
const nameRules = [
  v => !!v || '이름을 입력해주세요',
  v => (v && v.length >= 2) || '이름은 2자 이상이어야 합니다'
]

const emailRules = [
  v => !!v || '이메일을 입력해주세요',
  v => /.+@.+\..+/.test(v) || '올바른 이메일 형식이 아닙니다'
]

// Methods
const handleFindId = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    const requestData = {
      name: formData.value.name,
      email: formData.value.email
    }
    
    const response = await findMemberId(requestData)
    
    // 응답에서 찾은 ID 설정
    foundId.value = response.memberId
    
  } catch (error) {
    console.error('ID 찾기 실패:', error)
    
    // 에러 메시지 추출 및 표시
    let errorMessage = 'ID를 찾을 수 없습니다.'
    
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

const resetForm = () => {
  foundId.value = ''
  formData.value = {
    name: '',
    email: ''
  }
  findIdForm.value?.reset()
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(foundId.value)
    // 복사 성공 알림 (실제로는 토스트 메시지 등 사용)
  } catch (error) {
    console.error('복사 실패:', error)
  }
}
</script>

<style scoped>
.find-id-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

/* 헤더 */
.find-id-header {
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
.find-id-form {
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

/* 찾기 버튼 */
.find-id-button {
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

.find-id-button:hover {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
  color: white !important;
}

/* 결과 섹션 */
.result-section {
  margin-bottom: 2rem;
}

.result-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
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
  color: #0c4a6e;
  margin: 0 0 1rem 0;
}

.result-content {
  margin-bottom: 1.5rem;
}

.result-text {
  color: #0c4a6e;
  font-size: 0.875rem;
  margin: 0 0 0.5rem 0;
}

.id-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: white;
  border: 2px solid #0ea5e9;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.id-text {
  font-family: 'Courier New', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  color: #0c4a6e;
  letter-spacing: 0.05em;
}

.copy-button {
  color: #0ea5e9;
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

/* 로그인 링크 */
.login-link {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.login-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-right: 0.5rem;
}

.login-button {
  font-weight: 600;
  text-decoration: none;
}

/* 반응형 */
@media (max-width: 480px) {
  .find-id-container {
    padding: 1rem;
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .reset-button,
  .login-button {
    width: 100%;
  }
}
</style>
