<template>
  <div class="friend-status-badge">
    <!-- 툴팁이 있을 때 -->
    <v-tooltip 
      v-if="tooltip" 
      :text="tooltipText"
      location="top"
    >
      <template v-slot:activator="{ props: tooltipProps }">
        <div v-bind="tooltipProps" class="tooltip-target">
          <v-avatar 
            :size="size" 
            :color="statusColor"
            class="status-avatar"
          >
            <v-icon 
              :icon="statusIcon" 
              :color="iconColor"
              :size="iconSize"
            />
          </v-avatar>
        </div>
      </template>
    </v-tooltip>

    <!-- 툴팁이 없을 때 -->
    <v-avatar 
      v-else
      :size="size" 
      :color="statusColor"
      class="status-avatar"
    >
      <v-icon 
        :icon="statusIcon" 
        :color="iconColor"
        :size="iconSize"
      />
    </v-avatar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSSEStore } from '@/store/sseStore'

const props = defineProps({
  friendName: {
    type: String,
    required: true
  },
  currentStatus: {
    type: String,
    default: 'OFFLINE'
  },
  size: {
    type: [String, Number],
    default: 24
  },
  tooltip: {
    type: Boolean,
    default: true
  }
})

const sseStore = useSSEStore()

// 친구의 최근 상태 업데이트 가져오기
const lastStatusUpdate = computed(() => {
  return sseStore.getFriendLastStatusUpdate(props.friendName)
})

// 현재 상태 결정 (최근 업데이트가 있으면 그것을 사용, 없으면 기본값)
const actualStatus = computed(() => {
  if (lastStatusUpdate.value) {
    console.log(`🔄 ${props.friendName} 상태 업데이트: ${props.currentStatus} → ${lastStatusUpdate.value.newStatus}`)
    return lastStatusUpdate.value.newStatus
  }
  return props.currentStatus
})

// 상태에 따른 색상
const statusColor = computed(() => {
  const colorMap = {
    'ONLINE': 'success',     // 초록색
    'OFFLINE': 'error',      // 빨간색
    'AWAY': 'warning'        // 노란색
  }
  return colorMap[actualStatus.value] || 'grey'
})

// 상태에 따른 아이콘
const statusIcon = computed(() => {
  const iconMap = {
    'ONLINE': 'mdi-circle',
    'OFFLINE': 'mdi-circle-outline',
    'AWAY': 'mdi-clock-outline'
  }
  return iconMap[actualStatus.value] || 'mdi-circle-outline'
})

// 아이콘 색상
const iconColor = computed(() => {
  return actualStatus.value === 'ONLINE' ? 'white' : 'grey'
})

// 아이콘 크기
const iconSize = computed(() => {
  return typeof props.size === 'number' ? props.size * 0.6 : '14'
})

// 툴팁 텍스트
const tooltipText = computed(() => {
  const statusText = getStatusText(actualStatus.value)
  let text = `${props.friendName}: ${statusText}`
  
  if (lastStatusUpdate.value) {
    const updateTime = new Date(lastStatusUpdate.value.timestamp).toLocaleTimeString('ko-KR')
    const previousStatusText = getStatusText(lastStatusUpdate.value.previousStatus)
    const currentStatusText = getStatusText(lastStatusUpdate.value.newStatus)
    text += `\n${previousStatusText} → ${currentStatusText} (${updateTime})`
  }
  
  return text
})

// 상태 텍스트 변환 함수
const getStatusText = (status) => {
  const statusMap = {
    'ONLINE': '온라인',
    'OFFLINE': '오프라인',
    'AWAY': '자리비움'
  }
  return statusMap[status] || '알 수 없음'
}
</script>

<style scoped>
.friend-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status-avatar {
  position: relative;
}

.tooltip-target {
  cursor: pointer;
}

/* 상태 변경 애니메이션 */
.status-avatar {
  transition: all 0.3s ease;
}

.status-avatar:hover {
  transform: scale(1.1);
}
</style>
