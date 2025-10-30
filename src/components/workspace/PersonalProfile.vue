<template>
  <div class="personal-profile" :class="{ 'dark-mode': $vuetify.theme.global.current.dark }">
    <!-- 헤더 -->
    <div class="profile-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">마이페이지</h1>
          <p class="page-subtitle">개인 정보와 활동을 확인하세요</p>
        </div>
        <div class="header-right">
          <v-btn
            color="primary"
            variant="outlined"
            @click="doLogout"
            :loading="loading"
            class="logout-btn"
          >
            <v-icon left>mdi-logout</v-icon>
            로그아웃
          </v-btn>
        </div>
      </div>
    </div>
    
    <div class="profile-content">
      <!-- 프로필 카드 -->
      <v-card class="profile-card" elevation="0">
        <div class="profile-banner">
          <div class="banner-gradient"></div>
          <div class="profile-info">
            <div class="profile-avatar">
              <v-avatar size="120" color="primary" class="avatar-shadow">
                <v-img 
                  v-if="editMode ? editForm.profileImageUrl : userInfo.profileImageUrl" 
                  :src="editMode ? editForm.profileImageUrl : userInfo.profileImageUrl"
                  cover
                />
                <span v-else class="text-white font-weight-bold text-h3">
                  {{ userInfo.name ? userInfo.name.charAt(0) : 'U' }}
                </span>
              </v-avatar>
              
              <!-- 편집 모드 버튼들 -->
              <div v-if="editMode" class="avatar-buttons">
                <v-btn
                  icon="mdi-camera"
                  size="x-small"
                  color="white"
                  class="edit-avatar-btn camera-btn"
                  @click="$refs.fileInput.click()"
                />
                <v-btn
                  v-if="editForm.profileImageUrl"
                  icon="mdi-delete"
                  size="x-small"
                  color="red"
                  class="edit-avatar-btn remove-btn"
                  @click="removeProfileImage"
                />
              </div>
              
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onProfileImageChange"
              />
            </div>
            
            <div class="profile-details">
              <div v-if="!editMode" class="profile-display">
                <h2 class="profile-name">{{ userInfo.name }}</h2>
                <p class="profile-id">@{{ userInfo.userId }}</p>
                <div class="status-message">
                  <v-icon size="16">mdi-message-text</v-icon>
                  <span>{{ userInfo.statusMessage }}</span>
                </div>
                <div class="profile-meta">
                  <div class="meta-item">
                    <v-icon size="16">mdi-email</v-icon>
                    <span>{{ userInfo.email }}</span>
                  </div>
                  <div class="meta-item">
                    <v-icon size="16">mdi-phone</v-icon>
                    <span>{{ userInfo.phone }}</span>
                  </div>
                  <div class="meta-item">
                    <v-icon size="16">mdi-calendar</v-icon>
                    <span>가입일: {{ userInfo.joinDate }}</span>
                  </div>
                </div>
              </div>
              
              <div v-else class="profile-edit">
                <v-text-field
                  v-model="editForm.name"
                  label="이름"
                  variant="outlined"
                  class="mb-3"
                  hint="2자 이상 8자 이하"
                  counter="8"
                />
                <v-text-field
                  v-model="editForm.userId"
                  label="사용자 ID"
                  variant="outlined"
                  class="mb-3"
                  hint="6자 이상 13자 이하"
                  counter="13"
                />
                <v-text-field
                  v-model="editForm.email"
                  label="이메일"
                  type="email"
                  variant="outlined"
                  class="mb-3"
                  :readonly="isSocialAccount"
                  :hint="isSocialAccount ? '소셜 로그인 계정은 이메일을 수정할 수 없습니다' : ''"
                  persistent-hint
                />
                <v-text-field
                  v-model="editForm.phone"
                  label="전화번호"
                  variant="outlined"
                  class="mb-3"
                  placeholder="010-0000-0000"
                  persistent-hint
                  @input="formatPhoneNumber"
                  @keydown="handlePhoneKeydown"
                  maxlength="13"
                />
                <v-text-field
                  v-model="editForm.birthDate"
                  label="생년월일"
                  type="date"
                  variant="outlined"
                  class="mb-3"
                />
                <v-text-field
                  v-model="editForm.statusMessage"
                  label="상태메시지"
                  variant="outlined"
                  placeholder="상태메시지를 입력하세요"
                  counter="50"
                  maxlength="50"
                />
              </div>
            </div>
          </div>
          
          <div class="profile-actions">
            <v-btn
              v-if="!editMode"
              color="primary"
              variant="outlined"
              @click="editMode = true"
              class="edit-btn"
            >
              <v-icon left>mdi-account-edit</v-icon>
              프로필 수정
            </v-btn>
            <div v-else class="edit-actions">
              <v-btn
                color="primary"
                @click="saveProfile"
                :loading="loading"
                class="save-btn"
              >
                <v-icon left>mdi-check</v-icon>
                저장
              </v-btn>
              <v-btn
                variant="outlined"
                @click="cancelEdit"
                :disabled="loading"
                class="cancel-btn"
              >
                <v-icon left>mdi-close</v-icon>
                취소
              </v-btn>
            </div>
          </div>
        </div>
      </v-card>


      <!-- 설정 카드들 -->
      <div class="settings-grid">
        <!-- 알림 설정 -->
        <v-card class="setting-card" elevation="0">
          <div class="setting-header">
            <div class="setting-icon">
              <v-icon size="24" color="primary">mdi-bell</v-icon>
            </div>
            <div class="setting-info">
              <h3>알림 설정</h3>
              <p>알림 수신 여부를 설정하세요</p>
            </div>
          </div>
          <div class="setting-content">
            <v-switch
              v-model="allNotifications"
              label="전체 알림"
              color="primary"
              hide-details
            />
          </div>
        </v-card>

        <!-- 보안 설정 (소셜 계정은 숨김) -->
        <v-card v-if="!isSocialAccount" class="setting-card" elevation="0">
          <div class="setting-header">
            <div class="setting-icon">
              <v-icon size="24" color="warning">mdi-shield</v-icon>
            </div>
            <div class="setting-info">
              <h3>보안 설정</h3>
              <p>계정 보안을 관리하세요</p>
            </div>
          </div>
          <div class="setting-content">
            <v-btn
              color="primary"
              variant="outlined"
              @click="passwordDialog = true"
              class="setting-btn"
            >
              <v-icon left>mdi-key</v-icon>
              비밀번호 변경
            </v-btn>
          </div>
        </v-card>

        <!-- 계정 관리 -->
        <v-card class="setting-card" elevation="0">
          <div class="setting-header">
            <div class="setting-icon">
              <v-icon size="24" color="error">mdi-account-cog</v-icon>
            </div>
            <div class="setting-info">
              <h3>계정 관리</h3>
              <p>계정 관련 설정을 관리하세요</p>
            </div>
          </div>
          <div class="setting-content">
            <v-btn
              color="error"
              variant="outlined"
              @click="deleteAccountDialog = true"
              class="setting-btn"
            >
              <v-icon left>mdi-delete</v-icon>
              회원탈퇴
            </v-btn>
          </div>
        </v-card>
      </div>
    </div>

    <!-- 비밀번호 변경 다이얼로그 -->
    <v-dialog v-model="passwordDialog" max-width="500">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">
          <v-icon left color="primary">mdi-key</v-icon>
          비밀번호 변경
        </v-card-title>
        <v-card-text class="dialog-content">
          <v-alert
            v-if="passwordError"
            type="error"
            density="compact"
            class="mb-4"
          >
            {{ passwordError }}
          </v-alert>
          <v-text-field
            v-model="passwordForm.currentPassword"
            label="현재 비밀번호"
            type="password"
            variant="outlined"
            class="mb-4"
            prepend-inner-icon="mdi-lock"
            :disabled="loading"
          />
          <v-text-field
            v-model="passwordForm.newPassword"
            label="새 비밀번호"
            type="password"
            variant="outlined"
            class="mb-4"
            prepend-inner-icon="mdi-lock-plus"
            :disabled="loading"
            hint="11자 이상, 영문, 숫자, 특수문자 포함"
          />
          <v-text-field
            v-model="passwordForm.confirmPassword"
            label="새 비밀번호 확인"
            type="password"
            variant="outlined"
            prepend-inner-icon="mdi-lock-check"
            :disabled="loading"
          />
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn 
            variant="outlined" 
            @click="passwordDialog = false" 
            :disabled="loading"
            class="cancel-btn"
          >
            취소
          </v-btn>
          <v-btn 
            color="primary" 
            @click="changePasswordSubmit" 
            :loading="loading"
            class="confirm-btn"
          >
            <v-icon left>mdi-check</v-icon>
            변경
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 회원탈퇴 다이얼로그 -->
    <v-dialog v-model="deleteAccountDialog" max-width="500">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title text-error">
          <v-icon left color="error">mdi-delete</v-icon>
          회원탈퇴
        </v-card-title>
        <v-card-text class="dialog-content">
          <div class="warning-message">
            <v-icon color="error" size="48" class="warning-icon">mdi-alert-circle</v-icon>
            <h3>정말로 회원탈퇴를 하시겠습니까?</h3>
            <p>이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.</p>
    </div>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn 
            variant="outlined" 
            @click="deleteAccountDialog = false"
            :disabled="loading" 
            class="cancel-btn"
          >
            취소
          </v-btn>
          <v-btn 
            color="error" 
            @click="deleteAccount"
            :loading="loading" 
            class="confirm-btn"
          >
            <v-icon left>mdi-delete</v-icon>
            탈퇴
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 스낵바 -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      top
    >
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar = false"
        >
          닫기
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import * as authApi from '@/api/member/auth'

const props = defineProps({
  currentChannel: String
})

const router = useRouter()
const authStore = useAuthStore()

// 사용자 정보
const userInfo = ref({
  name: '',
  userId: '',
  email: '',
  phone: '',
  profileImage: null,
  profileImageUrl: '',
  joinDate: '',
  statusMessage: '',
  birthDate: '',
  activeStatus: 'OFFLINE'
})

// 로딩 상태
const loading = ref(false)

// 알림 설정 (전체 알림만)
const allNotifications = ref(true)

// 프로필 수정 모드
const editMode = ref(false)
const editForm = ref({ ...userInfo.value })

// 프로필 이미지 파일
const profileImageFile = ref(null)

// 비밀번호 변경 다이얼로그
const passwordDialog = ref(false)
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 비밀번호 에러 메시지
const passwordError = ref('')

// 회원탈퇴 다이얼로그
const deleteAccountDialog = ref(false)

// 스낵바
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// 소셜 계정 여부 (NORMAL 이외는 소셜)
const isSocialAccount = computed(() => {
  return authStore.user?.socialType && authStore.user.socialType !== 'NORMAL'
})

const showSnackbar = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

// 날짜 포맷팅 함수 (시간 제거)
const formatDateOnly = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

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
  
  editForm.value.phone = value
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
      editForm.value.phone = newValue
      
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

// 마이페이지 정보 조회
const fetchMyPage = async () => {
  try {
    loading.value = true
    const data = await authApi.getMyPage()
    
    userInfo.value = {
      name: data.name || '',
      userId: data.id || '',
      email: data.email || '',
      phone: data.telNo || '',
      profileImageUrl: data.profileImageUrl || '',
      statusMessage: data.statusMessage || '',
      birthDate: data.birthDate || '',
      activeStatus: data.activeStatus || 'OFFLINE',
      joinDate: data.createdAt ? formatDateOnly(data.createdAt) : ''
    }
    
    editForm.value = { ...userInfo.value }
  } catch (error) {
    console.error('마이페이지 정보 조회 실패:', error)
    showSnackbar('정보를 불러오는데 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 프로필 이미지 파일 선택
const onProfileImageChange = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    profileImageFile.value = file
    // 미리보기
    const reader = new FileReader()
    reader.onload = (e) => {
      editForm.value.profileImageUrl = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 프로필 이미지 제거
const removeProfileImage = () => {
  profileImageFile.value = null
  editForm.value.profileImageUrl = ''
  // 파일 input 초기화
  if (document.querySelector('input[type="file"]')) {
    document.querySelector('input[type="file"]').value = ''
  }
}

// 프로필 수정 저장
const saveProfile = async () => {
  try {
    loading.value = true
    
    // 필수 필드 검증
    if (!editForm.value.name || !editForm.value.userId || !editForm.value.email) {
      showSnackbar('이름, 아이디, 이메일은 필수 입력 항목입니다.', 'error')
      loading.value = false
      return
    }
    
    // 이름 길이 검증 (2-8자)
    if (editForm.value.name.length < 2 || editForm.value.name.length > 8) {
      showSnackbar('이름은 2자 이상 8자 이하로 입력해주세요.', 'error')
      loading.value = false
      return
    }
    
    // 아이디 길이 검증 (6-13자)
    if (editForm.value.userId.length < 6 || editForm.value.userId.length > 13) {
      showSnackbar('아이디는 6자 이상 13자 이하로 입력해주세요.', 'error')
      loading.value = false
      return
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editForm.value.email)) {
      showSnackbar('올바른 이메일 형식을 입력해주세요.', 'error')
      loading.value = false
      return
    }
    
    // 전화번호 형식 검증 (010-0000-0000)
    if (editForm.value.phone) {
      const phoneRegex = /^010-\d{4}-\d{4}$/
      if (!phoneRegex.test(editForm.value.phone)) {
        showSnackbar('전화번호는 010-0000-0000 형식으로 입력해주세요.', 'error')
        loading.value = false
        return
      }
    }
    
    // FormData 준비 (필수 필드만 포함, 빈 값은 제외)
    const memberData = {
      name: editForm.value.name,
      id: editForm.value.userId,
      email: editForm.value.email
    }
    
    // 프로필 이미지 삭제 요청 (기존 이미지가 있었는데 현재 없으면 삭제)
    if (!editForm.value.profileImageUrl && userInfo.value.profileImageUrl) {
      memberData.deleteProfileImage = true
    }
    // 새 프로필 이미지 업로드
    else if (profileImageFile.value) {
      memberData.profileImage = profileImageFile.value
    }
    
    // 선택 필드는 값이 있을 때만 추가
    if (editForm.value.statusMessage) {
      memberData.statusMessage = editForm.value.statusMessage
    }
    
    if (editForm.value.phone) {
      memberData.telNo = editForm.value.phone
    }
    
    if (editForm.value.birthDate) {
      memberData.birthDate = editForm.value.birthDate
    }
    
    const data = await authApi.updateMember(memberData)
    
    // 성공 시 사용자 정보 업데이트
    userInfo.value = {
      name: data.name || '',
      userId: data.id || '',
      email: data.email || '',
      phone: data.telNo || '',
      profileImageUrl: data.profileImageUrl || '',
      statusMessage: data.statusMessage || '',
      birthDate: data.birthDate || '',
      activeStatus: data.activeStatus || 'OFFLINE',
      joinDate: data.createdAt ? formatDateOnly(data.createdAt) : userInfo.value.joinDate
    }
    
    editMode.value = false
    profileImageFile.value = null
    showSnackbar('프로필이 성공적으로 수정되었습니다.')
    
    // authStore의 user 정보도 업데이트
    const updatedUser = {
      ...authStore.user,
      name: data.name,
      email: data.email,
      profileImageUrl: data.profileImageUrl
    }
    authStore.setUser(updatedUser)
    
    // 강제로 반응성 트리거
    nextTick(() => {
      authStore.setUser({ ...updatedUser })
    })
  } catch (error) {
    console.error('프로필 수정 실패:', error)
    showSnackbar('프로필 수정에 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 프로필 수정 취소
const cancelEdit = () => {
  editForm.value = { ...userInfo.value }
  editMode.value = false
  profileImageFile.value = null
  
  // 파일 input 초기화
  if (document.querySelector('input[type="file"]')) {
    document.querySelector('input[type="file"]').value = ''
  }
}

// 비밀번호 변경
const changePasswordSubmit = async () => {
  passwordError.value = ''
  
  // 유효성 검사
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    passwordError.value = '모든 필드를 입력해주세요.'
    return
  }
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = '새 비밀번호가 일치하지 않습니다.'
    return
  }
  
  // 비밀번호 규칙 검증 (11자 이상, 영문, 숫자, 특수문자 포함)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{11,}$/
  if (!passwordRegex.test(passwordForm.value.newPassword)) {
    passwordError.value = '비밀번호는 11자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다.'
    return
  }
  
  try {
    loading.value = true
    await authApi.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    
    passwordDialog.value = false
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    showSnackbar('비밀번호가 성공적으로 변경되었습니다.')
  } catch (error) {
    console.error('비밀번호 변경 실패:', error)
    passwordError.value = '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.'
  } finally {
    loading.value = false
  }
}

// 회원탈퇴
const deleteAccount = async () => {
  try {
    loading.value = true
    await authApi.deleteMember()
    
    deleteAccountDialog.value = false
    showSnackbar('회원탈퇴가 완료되었습니다.')
    
    // 로그아웃 처리
    authStore.logout()
    
    // 랜딩 페이지로 이동
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (error) {
    console.error('회원탈퇴 실패:', error)
    showSnackbar('회원탈퇴에 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 로그아웃
const doLogout = async () => {
  try {
    loading.value = true
    await authApi.logout()
    
    // authStore 초기화
    authStore.logout()
    
    // 랜딩 페이지로 이동
    window.location.href = '/'
  } catch (error) {
    console.error('로그아웃 실패:', error)
    // 실패해도 로컬 로그아웃 처리
    authStore.logout()
    window.location.href = '/'
  } finally {
    loading.value = false
  }
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  fetchMyPage()
})

</script>

<style scoped>
.personal-profile {
  padding: 24px;
  min-height: calc(100vh - 60px);
  background: rgb(var(--v-theme-background));
  transition: all 0.3s ease;
}

/* 다크모드 */
.personal-profile.dark-mode { background: rgb(var(--v-theme-background)); }

/* 헤더 */
.profile-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  color: rgb(var(--v-theme-on-surface));
  transition: color 0.3s ease;
}

.dark-mode .page-title { color: rgb(var(--v-theme-on-surface)); }

.page-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 16px;
  transition: color 0.3s ease;
}

.dark-mode .page-subtitle { color: rgba(var(--v-theme-on-surface), 0.7); }

.logout-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 프로필 카드 */
.profile-card {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.1);
  transition: all 0.3s ease;
  background: rgb(var(--v-theme-surface));
}

/* 입력 필드 다크모드 대응 */
.profile-card :deep(.v-field) {
  background: rgb(var(--v-theme-schedule-card-bg));
  border: 1px solid rgb(var(--v-theme-schedule-border));
  border-radius: 6px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.profile-card :deep(.v-field:hover) {
  border-color: rgb(var(--v-theme-schedule-border));
}
.profile-card :deep(.v-field--focused) {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
  background: rgb(var(--v-theme-schedule-card-bg));
}
.profile-card :deep(.v-field__input) { color: rgb(var(--v-theme-schedule-text)); }
.profile-card :deep(.v-field__input::placeholder) { color: rgb(var(--v-theme-schedule-placeholder)); opacity: 1; }

.profile-banner {
  position: relative;
  background: rgb(var(--v-theme-primary));
  padding: 40px 32px;
  color: white;
}

.banner-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-primary), 0.95);
}

.profile-info {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-shadow {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.avatar-buttons {
  position: absolute;
  bottom: -4px;
  right: -4px;
  display: flex;
  gap: 6px;
}

.edit-avatar-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px);
  border: 2px solid white;
  transition: all 0.2s ease;
}

.edit-avatar-btn:hover {
  transform: scale(1.1);
}

.camera-btn {
  background: rgba(59, 130, 246, 0.8) !important;
}

.remove-btn {
  background: rgba(239, 68, 68, 0.8) !important;
}

.profile-details {
  flex: 1;
}

.profile-name {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  color: white;
}

.profile-id {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 12px;
  color: white;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 16px;
  color: white;
  font-style: italic;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.9;
  color: white;
}

/* 다크모드 배너는 표면 계열로 톤 다운 */
.dark-mode .profile-banner {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.dark-mode .banner-gradient { background: rgba(var(--v-theme-on-surface), 0.04); }

.dark-mode .profile-name,
.dark-mode .profile-id,
.dark-mode .meta-item { color: rgb(var(--v-theme-on-surface)); }

.dark-mode .status-message {
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.profile-actions {
  position: relative;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.edit-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  border: 2px solid rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.8) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.edit-btn :deep(.v-icon) {
  color: white !important;
}

.save-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  background: white !important;
  color: #3b82f6 !important;
  border: 2px solid white !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 80px;
}

.save-btn:hover {
  background: #f8fafc !important;
  color: #2563eb !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.save-btn :deep(.v-icon) {
  color: #3b82f6 !important;
}

.save-btn:hover :deep(.v-icon) {
  color: #2563eb !important;
}

.cancel-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  border: 2px solid rgba(255, 255, 255, 0.5) !important;
  backdrop-filter: blur(10px);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.8) !important;
  transform: translateY(-1px);
}

.edit-actions {
  display: flex;
  gap: 12px;
}


/* 설정 그리드 */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.setting-card {
  border-radius: 12px;
  padding: 24px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(59, 130, 246, 0.1);
  transition: all 0.3s ease;
}

.dark-mode .setting-card { background: rgb(var(--v-theme-surface)); }

.setting-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.2);
}

.dark-mode .setting-card:hover {
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.3);
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.setting-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.setting-info h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: rgb(var(--v-theme-on-surface));
}

.dark-mode .setting-info h3 { color: rgb(var(--v-theme-on-surface)); }

.setting-info p {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
}

.dark-mode .setting-info p { color: rgba(var(--v-theme-on-surface), 0.7); }

.setting-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .personal-profile {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-end;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .profile-info {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .profile-banner {
    padding: 24px 20px;
  }
  
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  
  .setting-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  
  .profile-actions {
    flex-direction: column;
  }
  
  .edit-actions {
    flex-direction: column;
  }
}

/* 다이얼로그 스타일 */
.dialog-card {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  padding: 24px 24px 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-content {
  padding: 24px;
}

.dialog-actions {
  padding: 0 24px 24px 24px;
  gap: 12px;
}

.cancel-btn, .confirm-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  min-width: 100px;
}

.warning-message {
  text-align: center;
  padding: 20px 0;
}

.warning-icon {
  margin-bottom: 16px;
}

.warning-message h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1a1a1a;
}

.dark-mode .warning-message h3 {
  color: #ffffff;
}

.warning-message p {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.dark-mode .warning-message p {
  color: #ccc;
}
</style>
