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
      <!-- 회원ID와 이름 -->
      <div class="form-row">
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

      <!-- 이메일 -->
      <div class="form-group full-width">
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

      <!-- 비밀번호 -->
      <div class="form-group full-width">
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

      <!-- 비밀번호 확인 -->
      <div class="form-group full-width">
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

      <!-- 핸드폰 번호 -->
      <div class="form-group full-width">
        <label class="form-label">핸드폰 번호 (선택)</label>
        <div class="input-wrapper">
          <v-icon class="input-icon">mdi-phone</v-icon>
          <v-text-field
            v-model="formData.phone"
            placeholder="010-1234-5678"
            :rules="phoneRules"
            variant="plain"
            hide-details="auto"
            class="custom-input"
            @input="formatPhoneNumber"
            @keydown="handlePhoneKeydown"
            maxlength="13"
          />
        </div>
      </div>

      <!-- 프로필 이미지 -->
      <div class="form-group full-width">
        <label class="form-label">프로필 이미지 (선택)</label>
        <div class="profile-upload-container">
          <!-- 아바타 미리보기 -->
          <div class="avatar-wrapper" @click="triggerFileInput">
            <v-avatar size="100" class="profile-avatar">
              <v-img v-if="profileImagePreview" :src="profileImagePreview" alt="프로필 미리보기" />
              <v-icon v-else size="50" color="grey-lighten-1">mdi-account-circle</v-icon>
            </v-avatar>
            <div class="avatar-overlay">
              <v-icon color="white" size="30">mdi-camera</v-icon>
            </div>
          </div>
          
          <!-- 파일 입력 (숨김) -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            @change="handleImageChange"
            style="display: none"
          />
          
          <!-- 파일 선택 버튼 -->
          <v-btn
            variant="outlined"
            color="primary"
            @click="triggerFileInput"
            class="upload-button"
          >
            <v-icon left>mdi-upload</v-icon>
            이미지 선택
          </v-btn>
          
          <!-- 선택된 파일명 -->
          <div v-if="formData.profileImage" class="file-name">
            {{ formData.profileImage[0]?.name }}
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
          icon
          variant="outlined"
          size="large"
          @click="handleSocialSignUp('google')"
          :loading="socialLoading === 'google'"
          class="social-btn google-btn"
        >
          <img :src="googleLogo" alt="Google" class="social-logo" />
        </v-btn>
        <v-btn
          icon
          variant="outlined"
          size="large"
          @click="handleSocialSignUp('naver')"
          :loading="socialLoading === 'naver'"
          class="social-btn naver-btn"
        >
          <img :src="naverLogo" alt="Naver" class="social-logo" />
        </v-btn>
        <v-btn
          icon
          variant="outlined"
          size="large"
          @click="handleSocialSignUp('kakao')"
          :loading="socialLoading === 'kakao'"
          class="social-btn kakao-btn"
        >
          <img :src="kakaoLogo" alt="Kakao" class="social-logo" />
        </v-btn>
      </div>

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
import { createMember } from '@/api/member/auth'
import { redirectToGoogleOAuth, redirectToKakaoOAuth, redirectToNaverOAuth } from '@/utils/oauth'
import googleLogo from '@/assets/images/social/google.png'
import kakaoLogo from '@/assets/images/social/kakao.png'
import naverLogo from '@/assets/images/social/naver.png'

// Props & Emits
const emit = defineEmits(['switch-to-login', 'signup-success'])

// Reactive data
const signupForm = ref(null)
const fileInputRef = ref(null)
const isFormValid = ref(false)
const isLoading = ref(false)
const socialLoading = ref(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const currentSocialProvider = ref('')

const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  memberId: '',
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
  v => (v && v.length >= 11) || '비밀번호는 11자 이상이어야 합니다',
  v => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{11,}$/.test(v) || '비밀번호는 11자 이상이며, 영문, 숫자, 특수문자(!@#$%^&*)를 포함해야 합니다'
]

const confirmPasswordRules = [
  v => !!v || '비밀번호 확인을 입력해주세요',
  v => v === formData.value.password || '비밀번호가 일치하지 않습니다'
]

const memberIdRules = [
  v => !!v || '아이디를 입력해 주세요',
  v => (v && v.length >= 6 && v.length <= 13) || '아이디는 6자 이상 13자 이하로 입력해야 합니다'
]

const nameRules = [
  v => !!v || '이름을 입력해 주세요',
  v => (v && v.length >= 2 && v.length <= 8) || '이름은 2자 이상 8자 이하로 입력해야 합니다'
]

const phoneRules = [
  v => !v || /^010-\d{4}-\d{4}$/.test(v) || '전화번호는 010-0000-0000 형식으로 입력해야 합니다'
]

// 전화번호 포맷팅 함수
const formatPhoneNumber = (event) => {
  let value = event.target.value.replace(/[^\d]/g, '') // 숫자만 추출
  
  // 숫자가 11자리를 초과하지 않도록 제한
  if (value.length > 11) {
    value = value.slice(0, 11)
  }
  
  // 포맷팅 적용 - 정확한 길이에 따라 처리
  if (value.length >= 7) {
    value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11)
  } else if (value.length >= 3) {
    value = value.slice(0, 3) + '-' + value.slice(3)
  }
  
  formData.value.phone = value
}

// 전화번호 키 입력 처리 함수
const handlePhoneKeydown = (event) => {
  const { key, target } = event
  const currentValue = target.value
  const cursorPosition = target.selectionStart
  
  // 백스페이스 키 처리
  if (key === 'Backspace') {
    // 하이픈 바로 앞에 커서가 있으면 하이픈과 함께 앞의 숫자도 삭제
    if (cursorPosition > 0 && currentValue[cursorPosition - 1] === '-') {
      event.preventDefault()
      const newValue = currentValue.slice(0, cursorPosition - 2) + currentValue.slice(cursorPosition)
      formData.value.phone = newValue
      
      // 커서 위치 조정
      setTimeout(() => {
        target.setSelectionRange(cursorPosition - 2, cursorPosition - 2)
      }, 0)
      return
    }
  }
  
  // 숫자와 필요한 키만 허용
  if (!/[\d]/.test(key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(key)) {
    event.preventDefault()
  }
}

// Methods
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleImageChange = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    formData.value.profileImage = files
    const reader = new FileReader()
    reader.onload = (e) => {
      profileImagePreview.value = e.target.result
    }
    reader.readAsDataURL(files[0])
  } else {
    formData.value.profileImage = null
    profileImagePreview.value = null
  }
}

const handleSignUp = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    // 백엔드 DTO에 맞춰 데이터 변환
    const memberData = {
      name: formData.value.name,
      id: formData.value.memberId, // memberId를 id로 매핑
      email: formData.value.email,
      password: formData.value.password,
      telNo: formData.value.phone || undefined, // phone을 telNo로 매핑 (빈 값일 경우 전송 안 함)
      profileImage: formData.value.profileImage?.[0] || null // 파일 배열의 첫 번째 요소
    }
    
    // API 호출
    const response = await createMember(memberData)
    
    // 성공 메시지 표시
    alert('회원가입이 완료되었습니다! 로그인해주세요.')
    
    // 성공 시 부모 컴포넌트에 알림
    emit('signup-success', {
      message: '회원가입이 완료되었습니다!',
      data: response
    })
    
    // 폼 초기화
    formData.value = {
      email: '',
      password: '',
      confirmPassword: '',
      memberId: '',
      name: '',
      phone: '',
      profileImage: null
    }
    profileImagePreview.value = null
    
  } catch (error) {
    console.error('회원가입 실패:', error)
    
    // 에러 메시지 추출 및 표시
    let errorMessage = '회원가입 중 오류가 발생했습니다.'
    
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

const handleSocialSignUp = async (provider) => {
  socialLoading.value = provider
  currentSocialProvider.value = provider
  
  try {
    // 소셜 회원가입도 OAuth 리다이렉트 사용 (로그인과 동일한 프로세스)
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
    throw new Error('아직 지원되지 않는 소셜 로그인입니다')
  } catch (error) {
    console.error('소셜 회원가입 실패:', error)
    alert(error.message)
  } finally {
    socialLoading.value = null
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
  margin-bottom: 0.5rem;
}

.form-group.full-width {
  width: 100%;
  margin-bottom: 1rem;
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
  padding: 0.75rem;
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

/* 프로필 업로드 */
.profile-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-wrapper:hover {
  transform: scale(1.05);
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.profile-avatar {
  border: 3px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease;
}

.avatar-wrapper:hover .profile-avatar {
  border-color: #3b82f6;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.upload-button {
  min-width: 150px;
  text-transform: none;
  font-weight: 600;
}

.file-name {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
