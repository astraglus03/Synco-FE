<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  collapsed: Boolean
})

// 사용자 상태
const userStatus = ref('online')
const userName = ref('사용자')

// 상태 옵션들
const statusOptions = [
  { value: 'online', label: '온라인', color: 'success' },
  { value: 'away', label: '자리 비움', color: 'warning' },
  { value: 'offline', label: '오프라인 표시', color: 'grey' }
]

// 상태 메뉴 표시 여부
const statusMenuOpen = ref(false)

// 상태 변경 함수
const changeStatus = (status) => {
  userStatus.value = status
  statusMenuOpen.value = false
}

// 현재 상태 정보
const currentStatus = computed(() => {
  return statusOptions.find(option => option.value === userStatus.value)
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
      location="top"
      offset="8"
    >
      <template v-slot:activator="{ props: menuProps }">
        <div 
          class="user-info"
          v-bind="menuProps"
        >
          <v-avatar size="40" color="primary">
            <span class="text-white font-weight-bold">A</span>
            <div 
              class="status-dot"
              :class="currentStatus.color"
            />
          </v-avatar>
          
          <div class="user-details">
            <div class="user-name">{{ userName }}</div>
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
            @click="changeStatus(option.value)"
          >
            <template v-slot:prepend>
              <div 
                class="status-indicator"
                :class="option.color"
              />
            </template>
            <v-list-item-title>{{ option.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<style scoped>
.user-status {
  position: fixed;
  bottom: 0;
  left: 72px;
  width: 260px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  z-index: 101;
  height: 80px;
  transition: transform 0.3s ease;
}

.user-status.collapsed {
  transform: translateX(-260px);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  border-radius: 8px;
  padding: 4px;
  transition: background 0.2s ease;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.05);
}

.status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border: 2px solid rgb(var(--v-theme-background));
  border-radius: 50%;
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

.status-dot.grey {
  background: rgb(var(--v-theme-grey));
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.user-status-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.status-menu {
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
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

.status-indicator.grey {
  background: rgb(var(--v-theme-grey));
}

.active {
  background: rgba(var(--v-theme-primary), 0.2);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .user-status {
    left: 60px;
    width: 240px;
  }
}
</style>
