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

    <!-- FullCalendar -->
    <FullCalendar
      ref="calendarRef"
      class="fullcalendar-container"
      :options="calendarOptions"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

const props = defineProps({
  kanbanTasks: {
    type: Object,
    default: () => ({ TODO: [], IN_PROGRESS: [], COMPLETED: [] })
  }
})

const emit = defineEmits(['open-task-detail'])

// 현재 날짜 및 뷰
const currentDate = ref(new Date())
const calendarRef = ref(null)

// 모든 태스크를 하나의 배열로 합치기
const allTasks = computed(() => {
  const tasks = []
  
  Object.values(props.kanbanTasks).forEach(statusTasks => {
    tasks.push(...statusTasks)
  })
  
  return tasks
})

// 상태별 색상 (기존과 동일하게 유지)
function getEventColors(status) {
  const colorMap = {
    'TODO': { bg: '#e3f2fd', border: '#1976d2', text: '#1976d2' },
    'IN_PROGRESS': { bg: '#fff3e0', border: '#f57c00', text: '#f57c00' },
    'COMPLETED': { bg: '#e8f5e9', border: '#388e3c', text: '#388e3c' }
  }
  return colorMap[status] || { bg: '#f5f5f5', border: '#666666', text: '#666666' }
}

// 날짜 유틸
function toDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateInput, days) {
  const d = new Date(dateInput)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return toDateString(d)
}

// FullCalendar 이벤트 데이터 변환
const calendarEvents = computed(() => {
  return allTasks.value.map(task => {
    const colors = getEventColors(task.taskStatus)
    return {
      id: task.taskSeq,
      title: task.taskTitle,
      start: toDateString(new Date(task.startDate)),
      end: addDays(task.endDate, 1), // 마감일 포함 표시
      allDay: true,
      display: 'block',
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      classNames: [`status-${String(task.taskStatus || '').toLowerCase()}`],
      extendedProps: {
        task,
        status: task.taskStatus
      }
    }
  })
})

// currentDate 업데이트
function updateCurrentDateFromApi() {
  if (!calendarRef.value) return
  const api = calendarRef.value.getApi()
  currentDate.value = api.getDate()
}

// FullCalendar 옵션
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: false,
  locale: 'ko',
  firstDay: 0,
  fixedWeekCount: true,
  showNonCurrentDates: true,
  expandRows: true,
  height: 'auto',
  contentHeight: 'auto',
  dayMaxEvents: 3, // 3개까지만 표시, 나머지는 더보기
  events: calendarEvents.value,
  moreLinkContent: (args) => `+ ${args.num}개`,
  datesSet: () => updateCurrentDateFromApi(),
  eventClick: (info) => handleTaskClick(info.event.extendedProps?.task || info.event)
}))

// 현재 월 표시
const currentMonthDisplay = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  return `${year}년 ${month}월`
})

// 이전 달/주/일
function previousMonth() {
  if (calendarRef.value) {
    calendarRef.value.getApi().prev()
    updateCurrentDateFromApi()
  }
}

// 다음 달/주/일
function nextMonth() {
  if (calendarRef.value) {
    calendarRef.value.getApi().next()
    updateCurrentDateFromApi()
  }
}

// 오늘로 이동
function goToToday() {
  if (calendarRef.value) {
    calendarRef.value.getApi().today()
    updateCurrentDateFromApi()
  }
}

// 태스크 클릭
function handleTaskClick(task) {
  // 팝오버 닫기
  closeMorePopover()
  emit('open-task-detail', task)
}

// 팝오버 닫기
function closeMorePopover() {
  try {
    const popovers = document.querySelectorAll('.fc-popover')
    popovers.forEach((el) => el.parentElement && el.parentElement.removeChild(el))
  } catch (e) {
    // 안전하게 무시
  }
}
</script>

<style scoped>
.calendar-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  height: auto;
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

/* FullCalendar 컨테이너 */
.fullcalendar-container {
  height: auto;
}

/* 요일 헤더 스타일 */
:deep(.fc-col-header) {
  margin-bottom: 8px;
}

:deep(.fc-col-header-cell) {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: #666;
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
}

/* 날짜 그리드 */
:deep(.fc-daygrid-body) {
  background: transparent;
}

:deep(.fc-daygrid-day) {
  background: #ffffff;
  border: 1px solid #f0f2f5;
}

:deep(.fc-daygrid-day-frame) {
  background: #ffffff;
  min-height: 120px;
  padding: 40px 8px 0 8px;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 다른 달 날짜 스타일 */
:deep(.fc-day-other .fc-daygrid-day-frame) {
  background: #f5f5f5;
}

/* 날짜 숫자 */
:deep(.fc-daygrid-day-number) {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 3;
  pointer-events: none;
  white-space: nowrap;
}

/* 오늘 날짜 배지 */
:deep(.fc-day-today .fc-daygrid-day-number) {
  background: #2196f3;
  color: white;
  border-radius: 50%;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  line-height: 24px;
}

/* 셀 호버 */
:deep(.fc-daygrid-day-frame:hover) {
  background: #f8f9fa;
}

:deep(.fc-day-other .fc-daygrid-day-frame:hover) {
  background: #eeeeee;
}

/* 다른 달 날짜 흐리게 */
:deep(.fc-day-other) {
  background: #f7f7f7;
}

:deep(.fc-day-other .fc-daygrid-day-number) {
  color: #b3b3b3;
}

/* 이벤트(업무) 스타일 - 기존 색상 유지 */
:deep(.fc-event) {
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.2s;
}

:deep(.fc-event:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

:deep(.fc-daygrid-event) {
  margin-top: 4px;
}

:deep(.fc-daygrid-event-harness) {
  margin: 2px 0;
}

:deep(.fc-daygrid-day-events) {
  margin-top: 4px;
  margin-bottom: 0;
}

:deep(.fc-daygrid-day-bottom) {
  margin-top: 2px;
  padding-bottom: 0;
  margin-bottom: 0;
}

:deep(.fc-event-hidden) {
  display: none !important;
}

:deep(.fc-bg-event) {
  display: none;
}

:deep(.fc-daygrid-event) {
  min-height: 18px;
}

/* 더보기 링크 */
:deep(.fc-more-link) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  color: #6b7280;
  border-radius: 6px;
  padding: 2px 8px;
  margin-top: 6px;
  margin-bottom: 0;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
}

:deep(.fc-more-link:hover) {
  background-color: #e5e7eb;
  color: #374151;
}

/* 오늘 셀 하단 잔상 방지 */
:deep(.fc-day-today .fc-daygrid-day-bg),
:deep(.fc-day-today .fc-highlight) {
  display: none !important;
}

:deep(.fc-day-today .fc-daygrid-day-events) {
  margin-bottom: 0;
}

/* 상태별 색상 (기존과 동일) */
:deep(.status-todo) {
  background: #e3f2fd !important;
  border-color: #1976d2 !important;
  color: #1976d2 !important;
}

:deep(.status-in_progress) {
  background: #fff3e0 !important;
  border-color: #f57c00 !important;
  color: #f57c00 !important;
}

:deep(.status-completed) {
  background: #e8f5e9 !important;
  border-color: #388e3c !important;
  color: #388e3c !important;
}
</style>