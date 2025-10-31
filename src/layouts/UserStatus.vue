<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/store/authStore'
import * as authApi from '@/api/member/auth'

const props = defineProps({
  collapsed: Boolean
})

const authStore = useAuthStore()

// 사용자 상태
const userStatus = ref('OFFLINE')
const userName = ref('')
const profileImageUrl = ref('')
const loading = ref(false)

// 상태 옵션들 (백엔드 ActiveStatus 매핑)
const statusOptions = [
  { value: 'ONLINE', label: '온라인', color: 'success' },
  { value: 'AWAY', label: '자리비움', color: 'warning' },
  { value: 'OFFLINE', label: '오프라인', color: 'error' }
]

// 상태 메뉴 표시 여부
const statusMenuOpen = ref(false)

// 마이페이지 정보 조회
const fetchUserInfo = async () => {
  try {
    const data = await authApi.getMyPage()
    userName.value = data.name || '사용자'
    userStatus.value = data.activeStatus || 'OFFLINE'
    profileImageUrl.value = data.profileImageUrl || ''
    
    // authStore에도 저장
    authStore.setUser({
      ...authStore.user,
      name: data.name,
      profileImageUrl: data.profileImageUrl,
      activeStatus: data.activeStatus,
      socialType: data.socialType
    })
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error)
  }
}

// 상태 변경 함수
const changeStatus = async (status) => {
  if (loading.value) return
  
  const previousStatus = userStatus.value
  
  try {
    loading.value = true
    userStatus.value = status
    
    // 백엔드 API 호출
    await authApi.updateActiveStatus(status)
    
    statusMenuOpen.value = false
  } catch (error) {
    console.error('상태 변경 실패:', error)
    // 실패 시 이전 상태로 복구
    userStatus.value = previousStatus
  } finally {
    loading.value = false
  }
}

// 현재 상태 정보
const currentStatus = computed(() => {
  return statusOptions.find(option => option.value === userStatus.value) || statusOptions[2]
})

// 사용자 이름 표시 (authStore 우선, 없으면 API 데이터)
const displayName = computed(() => {
  return authStore.user?.name || userName.value || '사용자'
})

// 프로필 이미지 표시 (authStore 우선, 없으면 API 데이터)
const displayProfileImage = computed(() => {
  // authStore에 user가 있고 profileImageUrl이 명시적으로 설정된 경우 (null 포함)
  if (authStore.user && 'profileImageUrl' in authStore.user) {
    return authStore.user.profileImageUrl
  }
  // 그렇지 않으면 API 데이터 사용
  return profileImageUrl.value
})

// 사용자 이름 첫 글자
const userInitial = computed(() => {
  return displayName.value.charAt(0)
})

// 컴포넌트 마운트 시 사용자 정보 로드
onMounted(() => {
  fetchUserInfo()
})
</script>

<template>
  <div 
    class="user-status"
    :class="{ 'collapsed': collapsed }"
  >
    <!-- 상태 메뉴 -->
    <v-menu 
      v-model="statusMenuOpen"
      :close-on-content-click="false"
      :location="collapsed ? 'right' : 'top'"
      :offset="collapsed ? 8 : 8"
    >
      <template v-slot:activator="{ props: menuProps }">
        <div 
          class="user-info"
          v-bind="menuProps"
        >
          <div class="avatar-wrapper">
            <v-avatar :size="36" color="primary">
              <v-img 
                v-if="displayProfileImage" 
                :src="displayProfileImage"
                cover
              />
              <span v-else class="text-white font-weight-bold">{{ userInitial }}</span>
            </v-avatar>
            <div 
              class="status-dot"
              :class="currentStatus.color"
            />
          </div>
          
          <div v-if="!collapsed" class="user-details">
            <div class="user-name">{{ displayName }}</div>
            <div class="user-status-text">{{ currentStatus.label }}</div>
          </div>
        </div>
      </template>

      <v-card class="status-menu" min-width="200">
        <v-list>
          <v-list-item
            v-for="option in statusOptions"
            :key="option.value"
            :class="{ 'active': userStatus === option.value }"
            :disabled="loading"
            @click="changeStatus(option.value)"
          >
            <template v-slot:prepend>
              <div 
                class="status-indicator"
                :class="option.color"
              />
            </template>
            <v-list-item-title>{{ option.label }}</v-list-item-title>
            <template v-slot:append v-if="loading && userStatus === option.value">
              <v-progress-circular
                indeterminate
                size="20"
                width="2"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<style scoped>
/* 디스코드 스타일 - 메인 컨테이너 (기존 배경색 유지) */
.user-status {
  position: fixed;
  bottom: 0;
  left: 72px;
  width: 220px;
  background: rgb(var(--v-theme-surface));
  backdrop-filter: blur(6px);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: 0 -1px 0 rgba(var(--v-theme-on-surface), 0.04);
  padding: 8px;
  z-index: 101;
  height: 60px;
  transition: all 0.3s ease;
}

.user-status.collapsed {
  width: 72px;
  left: 72px;
  padding: 6px;
}

.user-status.collapsed .user-info {
  justify-content: center;
  padding: 4px;
}

.user-status.collapsed .avatar-wrapper {
  margin: 0 auto;
}

/* 디스코드 스타일 - 사용자 정보 영역 */
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 8px;
  transition: all 0.15s ease;
  background: transparent;
  height: 44px;
}

.user-info:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.user-info:active {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

/* 디스코드 스타일 - 아바타 래퍼 */
.avatar-wrapper {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

/* 디스코드 스타일 - 상태 점 (기존 색상 유지) */
.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border: 2px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  z-index: 1;
  box-shadow: none;
}

.status-dot.success {
  background: rgb(var(--v-theme-success));
}

.status-dot.warning {
  background: rgb(var(--v-theme-warning));
}

.status-dot.error {
  background: rgb(var(--v-theme-error));
}

/* 디스코드 스타일 - 사용자 상세 정보 */
.user-details {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 1px;
}

.user-status-text {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}

/* 디스코드 스타일 - 상태 메뉴 (밝은 회색) */
.status-menu {
  border-radius: 10px;
  background: rgb(var(--v-theme-surface)) !important;
  backdrop-filter: blur(6px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  overflow: hidden;
}

.status-menu .v-list {
  background: transparent !important;
  padding: 6px 8px !important;
}

.status-menu .v-list-item {
  border-radius: 8px;
  min-height: 40px !important;
  padding: 8px 10px !important;
  margin-bottom: 4px;
  color: rgb(var(--v-theme-on-surface)) !important;
  font-size: 14px;
  transition: all 0.15s ease;
}

.status-menu .v-list-item:last-child {
  margin-bottom: 0;
}

.status-menu .v-list-item:hover {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.status-menu .v-list-item.active {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.status-menu .v-list-item-title {
  font-weight: 500;
  font-size: 14px;
}

/* 디스코드 스타일 - 상태 인디케이터 (기존 색상 유지) */
.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-indicator.success {
  background: rgb(var(--v-theme-success));
}

.status-indicator.warning {
  background: rgb(var(--v-theme-warning));
}

.status-indicator.error {
  background: rgb(var(--v-theme-error));
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .user-status {
    left: 60px;
    width: 200px;
  }
}
</style>
