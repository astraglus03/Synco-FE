<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: Boolean
})

// 팀 멤버 목록 (임시 데이터)
const teamMembers = ref([
  { 
    id: 1, 
    name: '김민수', 
    role: '프로젝트 매니저', 
    status: 'online',
    avatar: '김'
  },
  { 
    id: 2, 
    name: '이지현', 
    role: '마케팅 전문가', 
    status: 'online',
    avatar: '이'
  },
  { 
    id: 3, 
    name: '박준영', 
    role: '개발자', 
    status: 'away',
    avatar: '박'
  },
  { 
    id: 4, 
    name: '최수진', 
    role: '디자이너', 
    status: 'online',
    avatar: '최'
  },
  { 
    id: 5, 
    name: '정현우', 
    role: '데이터 분석가', 
    status: 'busy',
    avatar: '정'
  },
  { 
    id: 6, 
    name: '장서연', 
    role: '운영 관리자', 
    status: 'online',
    avatar: '장'
  }
])

// 상태별 색상
const getStatusColor = (status) => {
  switch (status) {
    case 'online': return 'success'
    case 'away': return 'warning'
    case 'busy': return 'error'
    case 'offline': return 'grey'
    default: return 'grey'
  }
}

// 상태별 라벨
const getStatusLabel = (status) => {
  switch (status) {
    case 'online': return '온라인'
    case 'away': return '자리 비움'
    case 'busy': return '방해 금지'
    case 'offline': return '오프라인'
    default: return '알 수 없음'
  }
}

// 멤버별 그룹핑
const onlineMembers = computed(() => 
  teamMembers.value.filter(member => member.status === 'online')
)

const awayMembers = computed(() => 
  teamMembers.value.filter(member => member.status === 'away')
)

const busyMembers = computed(() => 
  teamMembers.value.filter(member => member.status === 'busy')
)

const offlineMembers = computed(() => 
  teamMembers.value.filter(member => member.status === 'offline')
)
</script>

<template>
  <div 
    class="member-sidebar"
    :class="{ 'visible': visible }"
  >
    <div class="member-header">
      <h3>팀 멤버 ({{ teamMembers.length }}명)</h3>
      <v-btn 
        icon 
        size="small" 
        variant="text"
        @click="$emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <div class="member-content">
      <!-- 온라인 멤버 -->
      <div v-if="onlineMembers.length > 0" class="member-group">
        <div class="group-title">
          온라인 ({{ onlineMembers.length }})
        </div>
        <div class="member-list">
          <div
            v-for="member in onlineMembers"
            :key="member.id"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                {{ member.avatar }}
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-role">{{ member.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 자리 비움 멤버 -->
      <div v-if="awayMembers.length > 0" class="member-group">
        <div class="group-title">
          자리 비움 ({{ awayMembers.length }})
        </div>
        <div class="member-list">
          <div
            v-for="member in awayMembers"
            :key="member.id"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                {{ member.avatar }}
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-role">{{ member.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 방해 금지 멤버 -->
      <div v-if="busyMembers.length > 0" class="member-group">
        <div class="group-title">
          방해 금지 ({{ busyMembers.length }})
        </div>
        <div class="member-list">
          <div
            v-for="member in busyMembers"
            :key="member.id"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                {{ member.avatar }}
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-role">{{ member.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 오프라인 멤버 -->
      <div v-if="offlineMembers.length > 0" class="member-group">
        <div class="group-title">
          오프라인 ({{ offlineMembers.length }})
        </div>
        <div class="member-list">
          <div
            v-for="member in offlineMembers"
            :key="member.id"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                {{ member.avatar }}
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-role">{{ member.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.member-sidebar {
  position: fixed;
  right: 0;
  top: 60px;
  bottom: 0;
  width: 280px;
  background: rgba(var(--v-theme-surface), 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 98;
}

.member-sidebar.visible {
  transform: translateX(0);
}

.member-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.member-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.member-content {
  padding: 16px 0;
  overflow-y: auto;
  height: calc(100vh - 120px);
}

.member-group {
  margin-bottom: 24px;
}

.group-title {
  padding: 0 24px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.member-list {
  display: flex;
  flex-direction: column;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  transition: background 0.2s ease;
}

.member-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.member-avatar {
  position: relative;
  flex-shrink: 0;
}

.status-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgb(var(--v-theme-surface));
  box-shadow: 0 0 0 1px rgba(var(--v-theme-on-surface), 0.1);
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

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .member-sidebar {
    width: 240px;
  }
}
</style>
