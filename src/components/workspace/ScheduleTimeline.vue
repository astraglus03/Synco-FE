<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <div class="view-toggle">
        <button 
          v-for="unit in timeUnits" 
          :key="unit.value"
          :class="['unit-button', { active: selectedTimeUnit === unit.value }]"
          @click="selectedTimeUnit = unit.value"
        >
          {{ unit.label }}
        </button>
      </div>
      <div class="navigation-buttons">
          <button @click="previousPeriod" class="nav-btn">
            <v-icon>mdi-chevron-left</v-icon>
          </button>
          <div class="period-display">
            {{ currentPeriodDisplay }}
          </div>
          <button @click="nextPeriod" class="nav-btn">
            <v-icon>mdi-chevron-right</v-icon>
          </button>
        </div>
        <div class="nav-label">
          {{ getNavLabel() }}
        </div>
    </div>

    <div class="timeline-content">
      <!-- 왼쪽: 업무 목록 -->
      <div class="task-list">
        <div class="task-list-header">
          <h3>업무</h3>
        </div>
        <div class="task-items" ref="taskItemsRef">
          <div 
            v-for="task in allTasks" 
            :key="task.id"
            :class="['task-item', { active: selectedTaskId === task.id }]"
            @click="selectedTaskId = task.id"
          >
            <div class="task-title">{{ task.title }}</div>
            <div class="task-assignee">{{ task.assignee }}</div>
          </div>
        </div>
      </div>

      <!-- 오른쪽: 타임라인 그리드 -->
      <div class="timeline-grid" ref="timelineGridRef">
        <div class="grid-header">
          <div 
            v-for="date in visibleDates" 
            :key="date.dateStr"
            class="grid-date-column"
          >
            <div class="date-label">{{ date.label }}</div>
            <div class="date-marker"></div>
          </div>
        </div>

        <div class="grid-body">
          <div 
            v-for="task in allTasks" 
            :key="task.id"
            class="grid-row"
          >
            <div 
              v-for="date in visibleDates" 
              :key="date.dateStr"
              class="grid-cell"
            >
            </div>
            <!-- 태스크 막대는 행 전체에 걸쳐서 연속적으로 표시 -->
            <div 
              v-if="isTaskInRange(task)"
              :class="['task-bar-row', getStatusClass(task.status)]"
              :style="getTaskBarRowStyle(task)"
              @click="handleTaskClick(task)"
              :title="`${task.title} - ${task.assignee}`"
            >
              <span class="status-badge">{{ getStatusLabel(task.status) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  kanbanTasks: {
    type: Object,
    required: true
  },
  workspaceMembers: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['open-task-detail'])

// 시간 단위 선택
const selectedTimeUnit = ref('week')
const timeUnits = [
  { label: '월', value: 'month' },
  { label: '주', value: 'week' },
  { label: '일', value: 'day' }
]

// 현재 기간
const currentDate = ref(new Date())
const selectedTaskId = ref(null)

// 스크롤 동기화 참조
const taskItemsRef = ref(null)
const timelineGridRef = ref(null)
let isSyncingScroll = false

// 모든 태스크를 하나의 배열로 합치기
const allTasks = computed(() => {
  const tasks = []
  
  Object.values(props.kanbanTasks).forEach(statusTasks => {
    tasks.push(...statusTasks)
  })
  
  // startDate 기준으로 정렬
  return tasks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
})

// 현재 기간 표시
const currentPeriodDisplay = computed(() => {
  if (selectedTimeUnit.value === 'month') {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth() + 1
    return `${year}년 ${month}월`
  } else if (selectedTimeUnit.value === 'week') {
    const weekStart = getWeekStart(currentDate.value)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`
  } else {
    return formatDate(currentDate.value)
  }
})

// 표시할 날짜 배열
const visibleDates = computed(() => {
  const dates = []
  
  if (selectedTimeUnit.value === 'month') {
    // 월 단위: 월 단위로 표시 (1월, 2월, 3월...)
    const year = currentDate.value.getFullYear()
    const currentMonth = currentDate.value.getMonth()
    
    // 현재부터 3개월 후까지 표시
    for (let i = 0; i < 4; i++) {
      const month = (currentMonth + i) % 12
      const displayYear = month < currentMonth ? year + 1 : year
      const date = new Date(displayYear, month, 1)
      
      dates.push({
        date: new Date(date),
        label: `${month + 1}월`,
        dateStr: `${displayYear}-${String(month + 1).padStart(2, '0')}`
      })
    }
  } else if (selectedTimeUnit.value === 'week') {
    // 주 단위: 주 단위로 표시 (현재 주를 기준으로)
    const currentWeekStart = getWeekStart(currentDate.value)
    
    for (let i = 0; i < 4; i++) {
      const weekDate = new Date(currentWeekStart)
      weekDate.setDate(weekDate.getDate() + i * 7)
      
      // 해당 주의 첫 날
      const weekStart = getWeekStart(weekDate)
      
      dates.push({
        date: new Date(weekStart),
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        dateStr: `week-${formatDate(weekStart)}`
      })
    }
  } else {
    // 일 단위: 일 단위로 표시 (특정 일의 날짜)
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate.value)
      date.setDate(date.getDate() + i)
      dates.push({
        date: new Date(date),
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        dateStr: formatDate(date)
      })
    }
  }
  
  return dates
})

// 날짜 유틸리티 함수들
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

// 태스크가 날짜 범위에 있는지 확인
function isTaskInDateRange(task, dateRange) {
  const taskStart = new Date(task.startDate)
  const taskEnd = new Date(task.endDate)
  taskEnd.setDate(taskEnd.getDate() + 1) // 종료일 포함
  
  const rangeStart = new Date(dateRange)
  const rangeEnd = getRangeEnd(dateRange)
  
  // 범위가 겹치는지 확인
  return taskStart < rangeEnd && taskEnd > rangeStart
}

// 범위의 끝 날짜 계산
function getRangeEnd(dateRange) {
  const unit = selectedTimeUnit.value
  const endDate = new Date(dateRange)
  
  if (unit === 'month') {
    endDate.setMonth(endDate.getMonth() + 1)
  } else if (unit === 'week') {
    endDate.setDate(endDate.getDate() + 7)
  } else {
    endDate.setDate(endDate.getDate() + 1)
  }
  
  return endDate
}

// 태스크가 현재 표시 범위에 있는지 확인
function isTaskInRange(task) {
  const taskStart = new Date(task.startDate)
  const taskEnd = new Date(task.endDate)
  taskEnd.setDate(taskEnd.getDate() + 1)
  
  const firstDate = visibleDates.value[0]?.date
  const lastDate = visibleDates.value[visibleDates.value.length - 1]?.date
  
  if (!firstDate || !lastDate) return false
  
  const rangeEnd = new Date(lastDate)
  
  // 단위에 따라 범위 끝 계산
  if (selectedTimeUnit.value === 'month') {
    rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  } else if (selectedTimeUnit.value === 'week') {
    rangeEnd.setDate(rangeEnd.getDate() + 7)
  } else {
    rangeEnd.setDate(rangeEnd.getDate() + 1)
  }
  
  return taskStart < rangeEnd && taskEnd > firstDate
}

// 태스크 막대 스타일 (행 전체에 걸쳐서 연속적으로)
function getTaskBarRowStyle(task) {
  const taskStart = new Date(task.startDate)
  const taskEnd = new Date(task.endDate)
  taskEnd.setDate(taskEnd.getDate() + 1) // 종료일 포함
  
  const firstDate = visibleDates.value[0]?.date
  const lastDate = visibleDates.value[visibleDates.value.length - 1]?.date
  
  if (!firstDate || !lastDate) return { display: 'none' }
  
  // 범위 끝 계산
  const rangeEnd = new Date(lastDate)
  if (selectedTimeUnit.value === 'month') {
    rangeEnd.setMonth(rangeEnd.getMonth() + 1)
  } else if (selectedTimeUnit.value === 'week') {
    rangeEnd.setDate(rangeEnd.getDate() + 7)
  } else {
    rangeEnd.setDate(rangeEnd.getDate() + 1)
  }
  
  // 시작 위치 계산 (백분율)
  let startPercent = 0
  if (taskStart < firstDate) {
    startPercent = 0
  } else {
    const totalRange = rangeEnd - firstDate
    const taskOffset = taskStart - firstDate
    startPercent = (taskOffset / totalRange) * 100
  }
  
  // 끝 위치 계산 (백분율)
  let endPercent = 100
  if (taskEnd > rangeEnd) {
    endPercent = 100
  } else {
    const totalRange = rangeEnd - firstDate
    const taskOffset = taskEnd - firstDate
    endPercent = (taskOffset / totalRange) * 100
  }
  
  const width = endPercent - startPercent
  
  return {
    left: `${startPercent}%`,
    width: `${width}%`
  }
}

// 상태별 클래스
function getStatusClass(status) {
  return {
    'status-todo': status === 'TODO',
    'status-progress': status === 'IN_PROGRESS',
    'status-completed': status === 'COMPLETED'
  }
}

// 상태 라벨
function getStatusLabel(status) {
  const labels = {
    'TODO': '할 일',
    'IN_PROGRESS': '진행중',
    'COMPLETED': '완료'
  }
  return labels[status] || status
}

// 이전 기간
function previousPeriod() {
  if (selectedTimeUnit.value === 'month') {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
  } else if (selectedTimeUnit.value === 'week') {
    // 이전 주로 이동 (새로운 객체 생성)
    const newDate = new Date(currentDate.value)
    newDate.setDate(newDate.getDate() - 7)
    currentDate.value = newDate
  } else {
    // 이전 일로 이동 (새로운 객체 생성)
    const newDate = new Date(currentDate.value)
    newDate.setDate(newDate.getDate() - 1)
    currentDate.value = newDate
  }
}

// 다음 기간
function nextPeriod() {
  if (selectedTimeUnit.value === 'month') {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
  } else if (selectedTimeUnit.value === 'week') {
    // 다음 주로 이동 (새로운 객체 생성)
    const newDate = new Date(currentDate.value)
    newDate.setDate(newDate.getDate() + 7)
    currentDate.value = newDate
  } else {
    // 다음 일로 이동 (새로운 객체 생성)
    const newDate = new Date(currentDate.value)
    newDate.setDate(newDate.getDate() + 1)
    currentDate.value = newDate
  }
}

// 태스크 클릭
function handleTaskClick(task) {
  emit('open-task-detail', task)
}

// 네비게이션 라벨
function getNavLabel() {
  if (selectedTimeUnit.value === 'month') {
    return '이전 월 / 다음 월'
  } else if (selectedTimeUnit.value === 'week') {
    return '이전 주 / 다음 주'
  } else {
    return '이전 일 / 다음 일'
  }
}

watch(selectedTimeUnit, () => {
  currentDate.value = new Date()
})

// 스크롤 동기화 핸들러
// 좌측 영역에서 마우스 휠을 굴리면 우측 타임라인을 스크롤
function onTaskWheel(e) {
  if (!timelineGridRef.value) return
  e.preventDefault()
  timelineGridRef.value.scrollTop += e.deltaY
}

function onGridScroll() {
  if (!taskItemsRef.value || !timelineGridRef.value) return
  if (isSyncingScroll) return
  isSyncingScroll = true
  taskItemsRef.value.scrollTop = timelineGridRef.value.scrollTop
  requestAnimationFrame(() => { isSyncingScroll = false })
}

onMounted(() => {
  if (taskItemsRef.value) {
    taskItemsRef.value.addEventListener('wheel', onTaskWheel, { passive: false })
  }
  if (timelineGridRef.value) {
    timelineGridRef.value.addEventListener('scroll', onGridScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (taskItemsRef.value) {
    taskItemsRef.value.removeEventListener('wheel', onTaskWheel)
  }
  if (timelineGridRef.value) {
    timelineGridRef.value.removeEventListener('scroll', onGridScroll)
  }
})
</script>

<style scoped>
.timeline-container {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 8px;
  overflow: hidden;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgb(var(--v-theme-schedule-border));
}

.nav-label {
  font-size: 12px;
  color: rgb(var(--v-theme-schedule-text-secondary));
  margin-left: 16px;
}

.view-toggle {
  display: flex;
  gap: 4px;
}

.unit-button {
  padding: 8px 16px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  background: rgb(var(--v-theme-schedule-card-bg));
  color: rgb(var(--v-theme-schedule-text));
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.unit-button.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.navigation-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.period-display {
  font-size: 14px;
  font-weight: 500;
  min-width: 150px;
  text-align: center;
  color: rgb(var(--v-theme-schedule-text));
}

.timeline-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 왼쪽: 업무 목록 */
.task-list {
  width: 250px;
  border-right: 1px solid rgb(var(--v-theme-schedule-border));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-list-header {
  padding: 8px;
  border-bottom: 2px solid rgb(var(--v-theme-schedule-border)); /* 그리드 헤더와 두께 맞춤 */
  background: rgb(var(--v-theme-schedule-header-bg));
}

.task-list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-schedule-text));
}

.task-items {
  flex: 1;
  overflow-y: hidden; /* 좌측 스크롤 숨김: 우측만 스크롤 표시 */
  padding: 2px 6px 6px 6px; /* 상단 여백 살짝 추가하여 라인 미세 조정 */
}

.task-item {
  display: flex;              /* 세로 중앙 정렬 */
  align-items: center;        /* 세로 중앙 정렬 */
  min-height: 40px;           /* 타임라인 행과 동일 높이 */
  padding: 8px 10px;          /* 패딩 축소 */
  margin-bottom: 0;           /* 간격 제거: 구분선과 정렬 */
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

/* 업무 항목 구분선 - 타임라인 행의 구분선과 색상/두께를 맞춤 */
.task-items .task-item:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-theme-schedule-border), 0.5);
}

.task-item:hover {
  background: rgb(var(--v-theme-schedule-hover-bg));
}

.task-item.active {
  background: rgba(33, 150, 243, 0.1);
  border-color: #2196f3;
}

.task-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 0;            /* 한 줄 정렬 */
  color: rgb(var(--v-theme-schedule-text));
}

.task-assignee {
  font-size: 12px;
  color: rgb(var(--v-theme-schedule-text-secondary));
  margin-left: 8px;            /* 제목과 간격 */
}

/* 오른쪽: 타임라인 그리드 */
.timeline-grid {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.grid-header {
  display: flex;
  border-bottom: 2px solid rgb(var(--v-theme-schedule-border));
  background: rgb(var(--v-theme-schedule-header-bg));
  position: sticky;
  top: 0;
  z-index: 10;
}

.grid-date-column {
  flex: 1;
  min-width: 120px;
  padding: 8px;
  text-align: center;
}

.date-label {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  color: rgb(var(--v-theme-schedule-text));
}

.date-marker {
  height: 2px;
  background: #2196f3;
  width: 100%;
}

.grid-body {
  flex: 1;
}

.grid-row {
  display: flex;
  border-bottom: 1px solid rgba(var(--v-theme-schedule-border), 0.5);
  position: relative;
  min-height: 40px; /* 행 높이 축소 */
}

.grid-cell {
  flex: 1;
  min-width: 120px;
  min-height: 40px; /* 셀 높이 축소 */
  border-right: 1px solid rgba(var(--v-theme-schedule-border), 0.5);
  position: relative;
  padding: 4px;
}

.task-bar-row {
  position: absolute;
  top: 6px; /* 위 여백 축소 */
  bottom: 6px; /* 아래 여백 축소 */
  height: calc(100% - 12px);
  border-radius: 4px;
  padding: 4px 6px; /* 내부 패딩 축소 */
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  margin: 1px 4px; /* 위아래 마진 약간 축소 */
}

.task-bar-row:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.task-label {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-schedule-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(var(--v-theme-schedule-card-bg), 0.9);
  color: rgb(var(--v-theme-schedule-text));
  font-weight: 500;
  margin-left: 6px;
  flex-shrink: 0;
}

/* 상태별 색상 */
.status-todo {
  background: rgba(33, 150, 243, 0.15);
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.status-todo .status-badge {
  color: #1976d2;
}

.status-progress {
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.status-progress .status-badge {
  color: #f57c00;
}

.status-completed {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-completed .status-badge {
  color: #388e3c;
}

/* 스크롤바 스타일 */
.task-items::-webkit-scrollbar,
.timeline-grid::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.task-items::-webkit-scrollbar-track,
.timeline-grid::-webkit-scrollbar-track {
  background: rgb(var(--v-theme-schedule-hover-bg));
}

.task-items::-webkit-scrollbar-thumb,
.timeline-grid::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-schedule-text-secondary), 0.4);
  border-radius: 3px;
}

.task-items::-webkit-scrollbar-thumb:hover,
.timeline-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-schedule-text-secondary), 0.6);
}

</style>

