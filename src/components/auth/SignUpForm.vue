<template>
  <div class="signup-container">
    <!-- 헤더 -->
    <div class="signup-header">
      <div class="brand-logo">
        <h1 class="brand-name">Synco</h1>
      </div>
      <p class="welcome-text">새로운 계정을 만들어보세요!</p>
    </div>

    <!-- 회원가입 폼 -->
    <v-form ref="signupForm" v-model="isFormValid" @submit.prevent="handleSignUp" class="signup-form">
      <div class="form-row">
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
      </div>

      <div class="form-row">
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
        <div class="form-group">
          <label class="form-label">비밀번호 확인</label>
          <div class="input-wrapper">
            <v-icon class="input-icon">mdi-lock-check</v-icon>
            <v-text-field
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="비밀번호를 다시 입력하세요"
              :rules="confirmPasswordRules"
              variant="plain"
              hide-details="auto"
              class="custom-input"
            />
            <v-btn
              icon
              variant="text"
              size="small"
              @click="showConfirmPassword = !showConfirmPassword"
              class="password-toggle"
            >
              <v-icon>{{ showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
            </v-btn>
          </div>
        </div>
      </div>

      <div class="form-row">
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
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">핸드폰 번호</label>
          <div class="input-wrapper">
            <v-icon class="input-icon">mdi-phone</v-icon>
            <v-text-field
              v-model="formData.phone"
              placeholder="010-1234-5678"
              :rules="phoneRules"
              variant="plain"
              hide-details="auto"
              class="custom-input"
            />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">프로필 이미지</label>
          <div class="file-upload-wrapper">
            <v-file-input
              v-model="formData.profileImage"
              accept="image/*"
              prepend-icon=""
              variant="plain"
              hide-details="auto"
              @change="handleImageChange"
              class="file-input"
            >
              <template #prepend>
                <v-icon class="input-icon">mdi-camera</v-icon>
              </template>
            </v-file-input>
            <div v-if="profileImagePreview" class="image-preview">
              <v-avatar size="40">
                <v-img :src="profileImagePreview" alt="프로필 미리보기" />
              </v-avatar>
            </div>
          </div>
        </div>
      </div>


      <!-- 회원가입 버튼 -->
      <v-btn
        type="submit"
        size="x-large"
        block
        :loading="isLoading"
        :disabled="!isFormValid"
        color="primary"
        class="signup-button"
        elevation="0"
      >
        <v-icon left>mdi-account-plus</v-icon>
        회원가입
      </v-btn>
    </v-form>

    <!-- 구분선 -->
    <div class="divider">
      <span class="divider-text">또는</span>
    </div>

    <!-- 소셜 회원가입 -->
    <div class="social-signup">
      <div class="social-buttons">
        <v-btn
          variant="outlined"
          size="large"
          @click="handleSocialSignUp('google')"
          :loading="socialLoading === 'google'"
          class="social-btn google-btn"
        >
          <v-icon left color="red">mdi-google</v-icon>
          Google로 가입
        </v-btn>
        <v-btn
          variant="outlined"
          size="large"
          @click="handleSocialSignUp('naver')"
          :loading="socialLoading === 'naver'"
          class="social-btn naver-btn"
        >
          <v-icon left color="green">mdi-naver</v-icon>
          Naver로 가입
        </v-btn>
        <v-btn
          variant="outlined"
          size="large"
          @click="handleSocialSignUp('kakao')"
          :loading="socialLoading === 'kakao'"
          class="social-btn kakao-btn"
        >
          <v-icon left color="yellow">mdi-chat</v-icon>
          Kakao로 가입
        </v-btn>
      </div>

      <!-- 소셜 회원가입 시 추가 ID 입력 -->
      <v-dialog v-model="showSocialIdDialog" max-width="400" persistent>
        <v-card class="social-id-dialog">
          <v-card-title class="dialog-title">
            <v-icon left color="primary">mdi-account-plus</v-icon>
            추가 정보 입력
          </v-card-title>
          <v-card-text>
            <div class="form-group">
              <label class="form-label">친구 검색용 ID</label>
              <div class="input-wrapper">
                <v-icon class="input-icon">mdi-account</v-icon>
                <v-text-field
                  v-model="socialUserId"
                  placeholder="친구들이 찾을 수 있는 ID를 입력하세요"
                  :rules="[v => !!v || 'ID를 입력해주세요']"
                  variant="plain"
                  hide-details="auto"
                  class="custom-input"
                />
              </div>
            </div>
          </v-card-text>
          <v-card-actions class="dialog-actions">
            <v-btn @click="showSocialIdDialog = false" variant="outlined">
              취소
            </v-btn>
            <v-btn color="primary" @click="completeSocialSignUp" :disabled="!socialUserId">
              완료
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>

    <!-- 로그인 링크 -->
    <div class="login-link">
      <span class="login-text">이미 계정이 있으신가요?</span>
      <v-btn
        variant="text"
        color="primary"
        @click="$emit('switch-to-login')"
        class="login-button"
      >
        로그인
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props & Emits
const emit = defineEmits(['switch-to-login', 'signup-success'])

// Reactive data
const signupForm = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const socialLoading = ref(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showSocialIdDialog = ref(false)
const socialUserId = ref('')
const currentSocialProvider = ref('')

const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  userId: '',
  name: '',
  phone: '',
  profileImage: null
})

const profileImagePreview = ref(null)

// Validation rules
const emailRules = [
  v => !!v || '이메일을 입력해주세요',
  v => /.+@.+\..+/.test(v) || '올바른 이메일 형식이 아닙니다'
]

const passwordRules = [
  v => !!v || '비밀번호를 입력해주세요',
  v => (v && v.length >= 8) || '비밀번호는 8자 이상이어야 합니다',
  v => /^(?=.*[a-zA-Z])(?=.*\d)/.test(v) || '비밀번호는 영문과 숫자를 포함해야 합니다'
]

const confirmPasswordRules = [
  v => !!v || '비밀번호 확인을 입력해주세요',
  v => v === formData.value.password || '비밀번호가 일치하지 않습니다'
]

const userIdRules = [
  v => !!v || '회원ID를 입력해주세요',
  v => (v && v.length >= 3) || '회원ID는 3자 이상이어야 합니다',
  v => /^[a-zA-Z0-9_]+$/.test(v) || '회원ID는 영문, 숫자, 언더스코어만 사용 가능합니다'
]

const nameRules = [
  v => !!v || '이름을 입력해주세요',
  v => (v && v.length >= 2) || '이름은 2자 이상이어야 합니다'
]

const phoneRules = [
  v => !v || /^010-\d{4}-\d{4}$/.test(v) || '올바른 핸드폰 번호 형식이 아닙니다 (010-1234-5678)'
]

// Methods
const handleImageChange = (file) => {
  if (file && file.length > 0) {
    const reader = new FileReader()
    reader.onload = (e) => {
      profileImagePreview.value = e.target.result
    }
    reader.readAsDataURL(file[0])
  } else {
    profileImagePreview.value = null
  }
}

const handleSignUp = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const userData = {
      id: Date.now(),
      email: formData.value.email,
      userId: formData.value.userId,
      name: formData.value.name,
      phone: formData.value.phone,
      profileImage: formData.value.profileImage,
      socialProvider: null,
      createdAt: new Date().toISOString()
    }
    
    emit('signup-success', userData)
  } catch (error) {
    console.error('회원가입 실패:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSocialSignUp = async (provider) => {
  socialLoading.value = provider
  currentSocialProvider.value = provider
  
  try {
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // OAuth에서 받은 name을 기본값으로 설정
    formData.value.name = '소셜사용자'
    
    showSocialIdDialog.value = true
  } catch (error) {
    console.error('소셜 회원가입 실패:', error)
  } finally {
    socialLoading.value = null
  }
}

const completeSocialSignUp = async () => {
  if (!socialUserId.value) return
  
  try {
    // 임시 성공 처리 (UI 테스트용)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const socialData = {
      id: Date.now(),
      email: 'social@example.com',
      userId: socialUserId.value,
      name: formData.value.name,
      phone: null,
      profileImage: null,
      socialProvider: currentSocialProvider.value,
      createdAt: new Date().toISOString()
    }
    
    showSocialIdDialog.value = false
    emit('signup-success', socialData)
  } catch (error) {
    console.error('소셜 회원가입 실패:', error)
  }
}
</script>

<style scoped>
.signup-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

/* 헤더 */
.signup-header {
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
.signup-form {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
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

/* 파일 업로드 */
.file-upload-wrapper {
  position: relative;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-upload-wrapper:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white;
}

.file-input {
  flex: 1;
}

.file-input :deep(.v-field) {
  background: transparent;
  box-shadow: none;
  border: none;
}

.image-preview {
  flex-shrink: 0;
}

/* 약관 동의 */
.terms-section {
  margin-bottom: 1.5rem;
}

.terms-checkbox :deep(.v-label) {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.terms-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
}

.terms-link:hover {
  text-decoration: underline;
}

/* 회원가입 버튼 */
.signup-button {
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

.signup-button:hover {
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

/* 소셜 회원가입 */
.social-signup {
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

/* 소셜 ID 다이얼로그 */
.social-id-dialog {
  border-radius: 16px;
}

.dialog-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #374151;
}

.dialog-actions {
  justify-content: flex-end;
  gap: 0.5rem;
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
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .signup-container {
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
