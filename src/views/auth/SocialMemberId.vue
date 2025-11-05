<template>
  <div class="social-member-id-container">
    <!-- 헤더 -->
    <div class="header">
      <div class="brand-logo">
        <img src="/synco_combined.png" alt="Synco" class="brand-logo-img" />
      </div>
      <p class="welcome-text">거의 다 왔어요!</p>
    </div>

    <!-- 추가 정보 입력 폼 -->
    <v-form ref="formRef" v-model="isFormValid" @submit.prevent="submit" class="member-id-form">
      <div class="info-box">
        <v-icon color="info" size="20">mdi-information</v-icon>
        <p class="info-text">
          다른 사용자가 나를 쉽게 찾을 수 있도록<br>
          사용할 아이디를 입력해주세요.
        </p>
      </div>

      <div class="form-group">
        <label class="form-label">회원 ID</label>
        <div class="input-wrapper">
          <v-icon class="input-icon">mdi-account</v-icon>
          <v-text-field
            v-model="memberId"
            placeholder="6~13자 영문/숫자"
            :rules="memberIdRules"
            variant="plain"
            hide-details="auto"
            class="custom-input"
            autofocus
          />
        </div>
      </div>

      <!-- 완료 버튼 -->
      <v-btn
        type="submit"
        size="x-large"
        block
        :loading="loading"
        :disabled="!isFormValid"
        color="primary"
        class="submit-button"
        elevation="0"
      >
        <v-icon left>mdi-check-circle</v-icon>
        완료하고 시작하기
      </v-btn>
    </v-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { apiPatch, decodeJWT } from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

// Reactive data
const formRef = ref(null)
const isFormValid = ref(false)
const memberId = ref('')
const loading = ref(false)

// Validation rules
const memberIdRules = [
  v => !!v || '아이디를 입력해 주세요',
  v => (v && v.length >= 6 && v.length <= 13) || '아이디는 6자 이상 13자 이하로 입력해야 합니다'
]

// Methods
const submit = async () => {
  if (!isFormValid.value) return

  loading.value = true

  try {
    const requestData = {
      memberId: memberId.value
    }

    const response = await apiPatch('/workspace-service/member/social/memberId', requestData)

    // API 응답에서 토큰이 있으면 업데이트
    const responseData = response?.data || response
    let memberSeqSet = false
    
    if (responseData?.accessToken) {
      authStore.setAccessToken(responseData.accessToken)
      // JWT 토큰에서 memberSeq 추출 및 설정
      const payload = decodeJWT(responseData.accessToken)
      if (payload?.sub) {
        const memberSeq = parseInt(payload.sub, 10)
        if (!Number.isNaN(memberSeq)) {
          authStore.setMemberSeq(memberSeq)
          memberSeqSet = true
        }
      }
    } else {
      // 응답에 토큰이 없으면 현재 토큰에서 memberSeq 추출 시도
      const currentToken = authStore.accessToken
      if (currentToken && !authStore.memberSeq) {
        const payload = decodeJWT(currentToken)
        if (payload?.sub) {
          const memberSeq = parseInt(payload.sub, 10)
          if (!Number.isNaN(memberSeq)) {
            authStore.setMemberSeq(memberSeq)
            memberSeqSet = true
          }
        }
      }
    }

    // memberSeq 설정 완료 (SSE 연결은 App.vue에서 처리하도록 페이지 이동만 수행)
    // window.location.href로 이동하면 App.vue의 onMounted에서 memberSeq 확인 후 SSE 연결 시도

    // 성공 시 대시보드 페이지로 이동 (강제 새로고침으로 App.vue 초기화 보장)
    window.location.href = '/workspaces/personal/dashboard'

  } catch (error) {
    console.error('회원 ID 등록 실패:', error)

    // 에러 메시지 추출 및 표시
    let errorMessage = 'ID 저장 중 오류가 발생했습니다.'

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }

    alert(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.social-member-id-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 헤더 */
.header {
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
.member-id-form {
  margin-bottom: 1.5rem;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-text {
  color: #1e40af;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
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

/* 완료 버튼 */
.submit-button {
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

.submit-button:hover {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
  color: white !important;
}

/* 반응형 */
@media (max-width: 480px) {
  .social-member-id-container {
    padding: 1rem;
  }
  
}
</style>
