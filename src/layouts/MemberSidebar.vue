<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { getWorkspaceMembers } from '@/api/workspace/workSpaceApi'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close'])

// Store
const workspaceStore = useWorkspaceStore()

// 프로젝트 멤버 목록
const projectMembers = ref([])
const isLoading = ref(false)

// 멤버 목록 로드
const loadMembers = async () => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  
  // personal 워크스페이스는 멤버 목록이 없음
  if (!currentWorkspace || currentWorkspace.type === 'personal') {
    projectMembers.value = []
    return
  }

  try {
    isLoading.value = true
    const members = await getWorkspaceMembers(currentWorkspace.workSpaceSeq)
    
    // 멤버 데이터 매핑 (API의 activeStatus 사용)
    projectMembers.value = members.map(member => ({
      id: member.memberSeq,
      memberSeq: member.memberSeq,
      name: member.name,
      profileImageUrl: member.profileImageUrl,
      avatar: member.avatarText,
      status: member.uiStatus // API에서 받은 실제 상태 사용
    }))
  } catch (error) {
    console.error('멤버 목록 로딩 실패:', error)
    projectMembers.value = []
  } finally {
    isLoading.value = false
  }
}

// 워크스페이스 변경 감지
watch(() => workspaceStore.currentWorkspace, () => {
  loadMembers()
})

// 사이드바 표시 시 멤버 목록 로드
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    loadMembers()
  }
})

// 초기 로드
onMounted(() => {
  if (props.visible) {
    loadMembers()
  }
})

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
  projectMembers.value.filter(member => member.status === 'online')
)

const awayMembers = computed(() => 
  projectMembers.value.filter(member => member.status === 'away')
)

const offlineMembers = computed(() => 
  projectMembers.value.filter(member => member.status === 'offline' || member.status === 'busy')
)
</script>

<template>
  <div 
    class="member-sidebar"
    :class="{ 'visible': visible }"
  >
    <div class="member-header">
      <h3>프로젝트 멤버 ({{ projectMembers.length }}명)</h3>
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
      <!-- 로딩 중 -->
      <div v-if="isLoading" class="loading-state">
        <v-progress-circular indeterminate color="primary" size="32" />
        <p>멤버 목록 불러오는 중...</p>
      </div>

      <!-- 멤버 목록 -->
      <template v-else>
        <!-- 온라인 멤버 -->
        <div v-if="onlineMembers.length > 0" class="member-group">
        <div class="group-title">
          온라인 ({{ onlineMembers.length }})
        </div>
        <div class="member-list">
          <div
            v-for="member in onlineMembers"
            :key="member.memberSeq"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                <img v-if="member.profileImageUrl" :src="member.profileImageUrl" alt="Profile" />
                <span v-else>{{ member.avatar }}</span>
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
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
            :key="member.memberSeq"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                <img v-if="member.profileImageUrl" :src="member.profileImageUrl" alt="Profile" />
                <span v-else>{{ member.avatar }}</span>
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
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
            :key="member.memberSeq"
            class="member-item"
          >
            <div class="member-avatar">
              <v-avatar size="32" color="primary">
                <img v-if="member.profileImageUrl" :src="member.profileImageUrl" alt="Profile" />
                <span v-else>{{ member.avatar }}</span>
              </v-avatar>
              <div 
                class="status-dot"
                :class="getStatusColor(member.status)"
              />
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 멤버가 없을 때 -->
      <div v-if="!isLoading && projectMembers.length === 0" class="empty-state">
        <v-icon size="48" color="grey">mdi-account-group</v-icon>
        <p>프로젝트 멤버가 없습니다</p>
      </div>
      </template>
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

/* 로딩 상태 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
  gap: 12px;
}

.loading-state p {
  margin: 0;
  font-size: 14px;
}

/* 빈 상태 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

.empty-state p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

/* 프로필 이미지 */
.v-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .member-sidebar {
    width: 240px;
  }
}
</style>

