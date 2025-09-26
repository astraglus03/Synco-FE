<template>
  <v-dialog v-model="isOpen" max-width="800" persistent class="auth-modal">
    <v-card class="modal-card">
      <!-- 모달 헤더 -->
      <div class="modal-header">
        <v-btn
          icon
          variant="text"
          @click="closeModal"
          class="close-button"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="tab-navigation">
        <div class="tab-container">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            :class="['tab-button', { active: activeTab === tab.value }]"
            @click="activeTab = tab.value"
          >
            <v-icon :class="['tab-icon', { active: activeTab === tab.value }]">
              {{ tab.icon }}
            </v-icon>
            <span class="tab-text">{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <!-- 탭 컨텐츠 -->
      <div class="tab-content">
        <div class="content-wrapper">
          <!-- 로그인 -->
          <div v-if="activeTab === 'login'" class="tab-panel">
            <LoginForm
              @switch-to-signup="activeTab = 'signup'"
              @switch-to-find="activeTab = 'find'"
              @login-success="handleLoginSuccess"
            />
          </div>

          <!-- 회원가입 -->
          <div v-if="activeTab === 'signup'" class="tab-panel">
            <SignUpForm
              @switch-to-login="activeTab = 'login'"
              @signup-success="handleSignupSuccess"
            />
          </div>

          <!-- ID 찾기 -->
          <div v-if="activeTab === 'find-id'" class="tab-panel">
            <FindIdForm
              @switch-to-login="activeTab = 'login'"
            />
          </div>

          <!-- 비밀번호 찾기 -->
          <div v-if="activeTab === 'find-password'" class="tab-panel">
            <FindPasswordForm
              @switch-to-login="activeTab = 'login'"
            />
          </div>

          <!-- 계정 찾기 메뉴 -->
          <div v-if="activeTab === 'find'" class="tab-panel find-menu">
            <div class="find-menu-container">
              <div class="find-menu-header">
                <div class="icon-wrapper">
                  <v-icon size="48" color="primary">mdi-account-search</v-icon>
                </div>
                <h2 class="menu-title">계정 찾기</h2>
                <p class="menu-subtitle">어떤 도움이 필요하신가요?</p>
              </div>

              <div class="find-options">
                <button
                  class="find-option"
                  @click="activeTab = 'find-id'"
                >
                  <div class="option-icon">
                    <v-icon size="32" color="primary">mdi-account-search</v-icon>
                  </div>
                  <div class="option-content">
                    <h3 class="option-title">ID 찾기</h3>
                    <p class="option-description">이름과 이메일로 회원ID를 찾아보세요</p>
                  </div>
                  <v-icon class="option-arrow">mdi-chevron-right</v-icon>
                </button>

                <button
                  class="find-option"
                  @click="activeTab = 'find-password'"
                >
                  <div class="option-icon">
                    <v-icon size="32" color="primary">mdi-lock-reset</v-icon>
                  </div>
                  <div class="option-content">
                    <h3 class="option-title">비밀번호 찾기</h3>
                    <p class="option-description">회원ID로 임시 비밀번호를 발송받으세요</p>
                  </div>
                  <v-icon class="option-arrow">mdi-chevron-right</v-icon>
                </button>
              </div>

              <div class="back-to-login">
                <v-btn
                  variant="text"
                  color="primary"
                  @click="activeTab = 'login'"
                  class="back-button"
                >
                  <v-icon left>mdi-arrow-left</v-icon>
                  로그인으로 돌아가기
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import LoginForm from './LoginForm.vue'
import SignUpForm from './SignUpForm.vue'
import FindIdForm from './FindIdForm.vue'
import FindPasswordForm from './FindPasswordForm.vue'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialView: {
    type: String,
    default: 'login',
    validator: (value) => ['login', 'signup', 'find'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'login-success', 'signup-success'])

// Reactive data
const isOpen = ref(props.modelValue)
const activeTab = ref(props.initialView)

// 탭 정의
const tabs = [
  { value: 'login', label: '로그인', icon: 'mdi-login' },
  { value: 'signup', label: '회원가입', icon: 'mdi-account-plus' },
  { value: 'find', label: '계정 찾기', icon: 'mdi-account-search' }
]

// Watchers
watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue
})

watch(() => props.initialView, (newValue) => {
  activeTab.value = newValue
})

watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
})

// ESC key handler
const handleKeydown = (event) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeModal()
  }
}

// Add event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Methods
const closeModal = () => {
  isOpen.value = false
  // 모달이 닫힐 때 초기 뷰로 리셋
  activeTab.value = props.initialView
}

const handleLoginSuccess = (userData) => {
  emit('login-success', userData)
  closeModal()
}

const handleSignupSuccess = (userData) => {
  emit('signup-success', userData)
  closeModal()
}
</script>

<style scoped>
.auth-modal {
  z-index: 9999;
}

.modal-card {
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  background: white;
}

/* 모달 헤더 */
.modal-header {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem 0;
}

.close-button {
  color: #9ca3af;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #6b7280;
}

/* 탭 네비게이션 */
.tab-navigation {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 1.5rem;
}

.tab-container {
  display: flex;
  gap: 0.25rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  font-weight: 600;
  color: #6b7280;
}

.tab-button:hover {
  background: rgba(59, 130, 246, 0.05);
  color: #3b82f6;
}

.tab-button.active {
  background: white;
  color: #3b82f6;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px 1px 0 0;
}

.tab-icon {
  transition: all 0.2s ease;
}

.tab-icon.active {
  color: #3b82f6;
}

.tab-text {
  font-size: 0.875rem;
  white-space: nowrap;
}

/* 탭 컨텐츠 */
.tab-content {
  min-height: 500px;
  background: white;
}

.content-wrapper {
  height: 100%;
}

.tab-panel {
  height: 100%;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 계정 찾기 메뉴 */
.find-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.find-menu-container {
  width: 100%;
  max-width: 400px;
}

.find-menu-header {
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

.menu-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.menu-subtitle {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

.find-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.find-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.find-option:hover {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.option-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.25rem 0;
}

.option-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.option-arrow {
  color: #9ca3af;
  transition: all 0.2s ease;
}

.find-option:hover .option-arrow {
  color: #3b82f6;
  transform: translateX(4px);
}

.back-to-login {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.back-button {
  font-weight: 600;
  text-decoration: none;
}

/* 반응형 */
@media (max-width: 768px) {
  .modal-card {
    border-radius: 16px;
  }
  
  .tab-navigation {
    padding: 0 1rem;
  }
  
  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
  
  .tab-text {
    display: none;
  }
  
  .find-menu {
    padding: 1rem;
  }
  
  .find-option {
    padding: 1rem;
  }
  
  .option-title {
    font-size: 1rem;
  }
  
  .option-description {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .tab-container {
    gap: 0.25rem;
  }
  
  .tab-button {
    padding: 0.5rem 0.75rem;
    min-width: 60px;
  }
  
  .find-option {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .option-content {
    order: 2;
  }
  
  .option-arrow {
    order: 3;
  }
}
</style>
