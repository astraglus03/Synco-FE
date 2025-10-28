<template>
  <div class="calendar-container">
    <!-- 캘린더 네비게이션 -->
    <div class="calendar-nav">
      <button @click="previousMonth" class="nav-button">
        <v-icon size="20">mdi-chevron-left</v-icon>
      </button>
      <div class="month-display">{{ currentMonthDisplay }}</div>
      <button @click="nextMonth" class="nav-button">
        <v-icon size="20">mdi-chevron-right</v-icon>
      </button>
      <v-btn 
        size="small" 
        variant="outlined" 
        @click="goToToday"
        class="today-btn"
      >
        오늘
      </v-btn>
    </div>

    <!-- 캘린더 그리드 -->
    <div class="calendar-grid">
      <!-- 요일 헤더 -->
      <div class="weekday-header">
        <div class="weekday-cell" v-for="day in weekdays" :key="day">
          {{ day }}
        </div>
      </div>

      <!-- 날짜 그리드 -->
      <div class="date-grid">
        <div 
          v-for="date in calendarDates" 
          :key="date.dateStr"
          :class="['date-cell', getDateCellClass(date)]"
          @click="selectDate(date)"
        >
          <div class="date-number">{{ date.date }}</div>
          
          <!-- 해당 날짜의 태스크들 -->
          <div class="task-list-container">
            <template v-for="(task, index) in getTasksForDate(date)" :key="task.id">
              <div
                v-if="index < 3"
                :class="['task-badge', getStatusClass(task.status)]"
                @click.stop="handleTaskClick(task)"
                :title="task.title"
              >
                <span class="task-icon">{{ getStatusIcon(task.status) }}</span>
                <span class="task-title">{{ task.title }}</span>
              </div>
            </template>
            
            <!-- 더 많은 태스크가 있을 경우 -->
            <div 
              v-if="getTaskCountForDate(date) > 3" 
              class="task-more-badge"
              @click.stop="openDateDetail(date)"
            >
              + {{ getTaskCountForDate(date) - 3 }}개
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 날짜 상세 모달 -->
  <v-dialog v-model="showDateDetailModal" max-width="600">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ selectedDateDetail?.dateStr }}</span>
        <v-btn icon variant="text" @click="showDateDetailModal = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div v-if="selectedDateDetail">
          <div
            v-for="task in getTasksForDate(selectedDateDetail)"
            :key="task.id"
            class="date-task-item"
            @click="handleTaskClick(task)"
          >
            <div :class="['task-status', getStatusClass(task.status)]">
              <span class="status-icon">{{ getStatusIcon(task.status) }}</span>
            </div>
            <div class="task-info">
              <div class="task-info-title">{{ task.title }}</div>
              <div class="task-info-assignee">{{ task.assignee }}</div>
            </div>
            <div class="task-date-range">
              {{ formatDateRange(task) }}
            </div>
          </div>
          
          <div v-if="getTaskCountForDate(selectedDateDetail) === 0" class="no-tasks">
            이 날짜에 예정된 업무가 없습니다.
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

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

// 현재 날짜
const currentDate = ref(new Date())
const selectedDateDetail = ref(null)
const showDateDetailModal = ref(false)

// 모든 태스크를 하나의 배열로 합치기
const allTasks = computed(() => {
  const tasks = []
  
  Object.values(props.kanbanTasks).forEach(statusTasks => {
    tasks.push(...statusTasks)
  })
  
  console.log('캘린더 전체 태스크:', tasks)
  
  return tasks
})

// 주의 시작 (일요일)
const weekdays = ['일', '월', '화', '수', '목', '금', '토']

// 현재 월 표시
const currentMonthDisplay = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  return `${year}년 ${month}월`
})

// 캘린더 날짜 배열 생성
const calendarDates = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // 해당 월의 첫 번째 날
  const firstDay = new Date(year, month, 1)
  // 해당 월의 마지막 날
  const lastDay = new Date(year, month + 1, 0)
  
  // 첫 번째 날의 요일 (0: 일요일)
  const firstDayOfWeek = firstDay.getDay()
  
  // 마지막 날의 날짜
  const lastDate = lastDay.getDate()
  
  const dates = []
  
  // 이전 달의 끝부분 추가
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i)
    dates.push({
      date: prevMonthLastDay - i,
      dateObj: date,
      dateStr: formatDate(date),
      isCurrentMonth: false,
      isToday: isTodayDate(date),
      isPast: isPastDate(date)
    })
  }
  
  // 현재 달의 날짜들
  for (let i = 1; i <= lastDate; i++) {
    const date = new Date(year, month, i)
    dates.push({
      date: i,
      dateObj: date,
      dateStr: formatDate(date),
      isCurrentMonth: true,
      isToday: isTodayDate(date),
      isPast: isPastDate(date)
    })
  }
  
  // 다음 달의 시작부분 추가 (6주를 채우기 위해)
  const totalCells = dates.length
  const remainingCells = 42 - totalCells // 6주 * 7일
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i)
    dates.push({
      date: i,
      dateObj: date,
      dateStr: formatDate(date),
      isCurrentMonth: false,
      isToday: isTodayDate(date),
      isPast: isPastDate(date)
    })
  }
  
  return dates
})

// 날짜 포맷팅
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 오늘 날짜인지 확인
function isTodayDate(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// 과거 날짜인지 확인
function isPastDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate < today
}

// 특정 날짜의 태스크 가져오기
function getTasksForDate(dateInfo) {
  if (!dateInfo) return []
  
  const tasks = allTasks.value.filter(task => {
    const taskStart = new Date(task.startDate)
    taskStart.setHours(0, 0, 0, 0)
    
    const taskEnd = new Date(task.endDate)
    taskEnd.setHours(23, 59, 59, 999)
    
    const date = new Date(dateInfo.dateObj)
    date.setHours(0, 0, 0, 0)
    
    // 태스크가 해당 날짜와 겹치는지 확인
    const isMatch = date >= taskStart && date <= taskEnd
    
    return isMatch
  })
  
  return tasks
}

// 특정 날짜의 태스크 개수
function getTaskCountForDate(dateInfo) {
  return getTasksForDate(dateInfo).length
}

// 날짜 셀 클래스
function getDateCellClass(dateInfo) {
  return {
    'other-month': !dateInfo.isCurrentMonth,
    'today': dateInfo.isToday,
    'past': dateInfo.isPast
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

// 상태별 아이콘
function getStatusIcon(status) {
  const icons = {
    'TODO': '🔵',
    'IN_PROGRESS': '🟡',
    'COMPLETED': '🟢'
  }
  return icons[status] || '⚪'
}

// 이전 달
function previousMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

// 다음 달
function nextMonth() {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

// 오늘로 이동
function goToToday() {
  currentDate.value = new Date()
}

// 날짜 선택
function selectDate(dateInfo) {
  // 필요시 추가 로직
}

// 태스크 클릭
function handleTaskClick(task) {
  emit('open-task-detail', task)
}

// 날짜 상세 열기
function openDateDetail(dateInfo) {
  selectedDateDetail.value = dateInfo
  showDateDetailModal.value = true
}

// 날짜 범위 포맷
function formatDateRange(task) {
  const start = new Date(task.startDate)
  const end = new Date(task.endDate)
  const format = (d) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${format(start)} - ${format(end)}`
}
</script>

<style scoped>
.calendar-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  height: calc(100vh - 200px);
}

/* 네비게이션 */
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.nav-button {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background: #f5f5f5;
  border-color: #2196f3;
}

.month-display {
  font-size: 20px;
  font-weight: 600;
  min-width: 120px;
  text-align: center;
}

.today-btn {
  margin-left: 16px;
}

/* 캘린더 그리드 */
.calendar-grid {
  display: flex;
  flex-direction: column;
}

/* 요일 헤더 */
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 8px;
}

.weekday-cell {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: #666;
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
}

/* 날짜 그리드 */
.date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
}

.date-cell {
  min-height: 120px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  position: relative;
  background: white; /* 이번달 날짜는 흰색 */
}

/* 다른 달 날짜는 회색 */
.date-cell.other-month {
  background: #f5f5f5;
}

.date-cell.other-month .date-number {
  color: #999;
}

.date-cell:hover {
  background: #f8f9fa;
}

.date-cell.other-month:hover {
  background: #eeeeee;
}

.date-cell.today .date-number {
  background: #2196f3;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.date-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

/* 태스크 표시 */
.task-list-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.task-badge {
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
}

.task-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.task-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.task-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* 상태별 색상 */
.status-todo {
  background: #e3f2fd;
  color: #1976d2;
}

.status-progress {
  background: #fff3e0;
  color: #f57c00;
}

.status-completed {
  background: #e8f5e9;
  color: #388e3c;
}

.task-more-badge {
  padding: 4px 8px;
  background: #f5f5f5;
  color: #666;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.task-more-badge:hover {
  background: #e0e0e0;
}

/* 날짜 상세 모달 */
.date-task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e0e0;
}

.date-task-item:hover {
  background: #f5f5f5;
  border-color: #2196f3;
}

.task-status {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon {
  font-size: 16px;
}

.task-info {
  flex: 1;
}

.task-info-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.task-info-assignee {
  font-size: 12px;
  color: #666;
}

.task-date-range {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.no-tasks {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>

