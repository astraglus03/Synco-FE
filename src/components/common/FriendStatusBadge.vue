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
          <div class="status-dot" :class="statusColor" />
        </div>
      </template>
    </v-tooltip>

    <!-- 툴팁이 없을 때 -->
    <div v-else class="status-dot" :class="statusColor" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

// 현재 상태를 그대로 사용
const actualStatus = computed(() => {
  return props.currentStatus
})


// 상태에 따른 색상 (UserStatus와 동일한 매핑)
const statusColor = computed(() => {
  const colorMap = {
    'ONLINE': 'success',     // 초록색
    'OFFLINE': 'error',      // 빨간색
    'AWAY': 'warning'        // 노란색
  }
  return colorMap[actualStatus.value] || 'error'
})

// 툴팁 텍스트
const tooltipText = computed(() => {
  const statusText = getStatusText(actualStatus.value)
  return `${props.friendName}: ${statusText}`
})

// 상태 텍스트 변환 함수 (백엔드 ActiveStatus enum 매핑)
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
}

.tooltip-target {
  cursor: pointer;
}

/* 상태점 스타일 (UserStatus와 동일) */
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
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

.tooltip-target:hover .status-dot {
  transform: scale(1.1);
}
</style>
