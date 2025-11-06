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
      <button @click="goToToday" class="today-btn">
        <v-icon size="16" class="today-icon">mdi-calendar-today</v-icon>
        오늘
      </button>
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

// removed currentView state

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
const calendarRef = ref(null)


// 모든 태스크를 하나의 배열로 합치기
const allTasks = computed(() => {
  const tasks = []
  
  Object.values(props.kanbanTasks).forEach(statusTasks => {
    tasks.push(...statusTasks)
  })
  
  console.log('캘린더 전체 태스크:', tasks)
  
  return tasks
})

// 상태별 색상 (타임라인과 동일하게)
function getEventColors(status) {
  const colorMap = {
    'TODO': { bg: '#e3f2fd', border: '#e3f2fd', text: '#1976d2' },
    'IN_PROGRESS': { bg: '#fff3e0', border: '#fff3e0', text: '#f57c00' },
    'COMPLETED': { bg: '#e8f5e8', border: '#e8f5e8', text: '#388e3c' },
  }
  return colorMap[status] || { bg: '#f5f5f5', border: '#f5f5f5', text: '#666666' }
}

// 날짜 유틸: YYYY-MM-DD 포맷으로 반환
function toDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateInput, days) {
  const d = new Date(dateInput)
  d.setDate(d.getDate() + days)
  // allDay 이벤트이므로 시간 제거
  d.setHours(0, 0, 0, 0)
  return toDateString(d)
}

// FullCalendar 이벤트 데이터 변환 (allDay는 end가 배타(exclusive)이므로 +1일 처리)
const calendarEvents = computed(() => {
  return allTasks.value.map(task => {
    const colors = getEventColors(task.status)
    return {
      id: task.id,
      title: task.title,
      start: toDateString(new Date(task.startDate)),
      end: addDays(task.endDate, 1), // 마감일 포함 표시
      allDay: true,
      display: 'block',
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      classNames: [`status-${String(task.status || '').toLowerCase()}`],
      extendedProps: {
        task,
        status: task.status,
      }
    }
  })
})

function updateCurrentDateFromApi() {
  if (!calendarRef.value) return
  const api = calendarRef.value.getApi()
  currentDate.value = api.getDate()
}

// FullCalendar 옵션
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth', // 초기 뷰 설정
  headerToolbar: false,
  locale: 'ko',
  firstDay: 0,
  fixedWeekCount: true,
  showNonCurrentDates: true,
  dayMaxEvents: 3,
  expandRows: true,
  height: 'auto',
  contentHeight: 'auto',
  events: calendarEvents.value,
  moreLinkContent: (args) => `+ ${args.num}개`,
  datesSet: () => updateCurrentDateFromApi(),
  eventClick: (info) => handleTaskClick(info.event.extendedProps?.task || info.event),
}))

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
  if (calendarRef.value) {
    calendarRef.value.getApi().prev()
    updateCurrentDateFromApi()
  }
}

// 다음 달
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

// 뷰 전환 (월/주)
function changeView(view) {
  if (!calendarRef.value) return
  const api = calendarRef.value.getApi()
  api.changeView(view)
  // currentView.value = view // Removed currentView state
  updateCurrentDateFromApi()
}

// 날짜 선택
function selectDate(dateInfo) {
  // 필요시 추가 로직
}

// 태스크 클릭
function handleTaskClick(task) {
  // 더보기(popover)에서 클릭한 경우 남아있는 팝오버를 닫아 사용자 경험 개선
  closeMorePopover()
  emit('open-task-detail', task)
}

// Vuetify 모달 제거로 관련 함수 삭제
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
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 8px;
  padding: 24px;
  height: auto; /* 한 달 전체가 보이도록 자동 높이 */
}

/* 네비게이션 */
.calendar-nav {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.nav-button {
  background: rgb(var(--v-theme-schedule-card-bg));
  border: 1px solid rgb(var(--v-theme-schedule-border));
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background: rgb(var(--v-theme-schedule-hover-bg));
  border-color: #f25f39;
}

.month-display {
  font-size: 20px;
  font-weight: 600;
  min-width: 120px;
  text-align: center;
  color: rgb(var(--v-theme-schedule-text));
}

.today-btn {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #f25f39 0%, #e5492d 100%);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(242, 95, 57, 0.25);
}

.today-btn:hover {
  background: linear-gradient(135deg, #e5492d 0%, #d63c21 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(242, 95, 57, 0.35);
}

.today-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(242, 95, 57, 0.25);
}

.today-icon {
  color: white;
}

/* FullCalendar 컨테이너 */
.fullcalendar-container {
  height: auto; /* 내부 스크롤 제거 */
}

/* 캘린더 외곽 테두리를 셀 경계선과 동일하게 */
:deep(.fc-theme-standard .fc-scrollgrid) {
  border: 1px solid rgb(var(--v-theme-schedule-border));
}

/* 모든 셀/헤더 경계선 색 통일 (세로/가로 구분선 포함) */
:deep(.fc-theme-standard td),
:deep(.fc-theme-standard th) {
  border-color: rgb(var(--v-theme-schedule-border));
}

/* 요일 헤더를 기존 스타일과 동일하게 */
:deep(.fc-col-header) {
  margin-bottom: 8px;
  background: rgb(var(--v-theme-schedule-header-bg)) !important;
}

:deep(.fc-col-header thead),
:deep(.fc-col-header tr),
:deep(.fc-col-header-cell) {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  color: rgb(var(--v-theme-schedule-text)) !important;
  background: rgb(var(--v-theme-schedule-header-bg)) !important;
  background-color: rgb(var(--v-theme-schedule-header-bg)) !important;
  border-bottom: 2px solid rgb(var(--v-theme-schedule-border)) !important;
}

:deep(.fc-col-header-cell-cushion) {
  color: rgb(var(--v-theme-schedule-text)) !important;
}

:deep(.fc-scrollgrid-section-header),
:deep(.fc-scrollgrid-section-header > *),
:deep(.fc-scrollgrid-section-header td) {
  background: rgb(var(--v-theme-schedule-header-bg)) !important;
  background-color: rgb(var(--v-theme-schedule-header-bg)) !important;
}

/* 날짜 그리드 간격/경계선 느낌 - 더 깔끔하게 */
:deep(.fc-daygrid-body) {
  background: transparent;
}

:deep(.fc-daygrid-day) {
  background: rgb(var(--v-theme-schedule-card-bg));
  border: 1px solid rgb(var(--v-theme-schedule-border));
}

:deep(.fc-daygrid-day-frame) {
  background: rgb(var(--v-theme-schedule-card-bg));
  min-height: 120px;
  padding: 40px 8px 0 8px; /* 날짜와 업무 사이 여백 소폭 추가 */
  position: relative;
  display: flex;           /* 셀 내부 배치를 위한 플렉스 레이아웃 */
  flex-direction: column;
}

/* 다른 달 날짜는 회색 */
:deep(.fc-day-other .fc-daygrid-day-frame) {
  background: rgba(var(--v-theme-schedule-hover-bg), 0.5);
}

/* 날짜 숫자 스타일 */
:deep(.fc-daygrid-day-number) {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-schedule-text-secondary));
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 3;
  pointer-events: none;
  white-space: nowrap; /* 숫자 줄바꿈 방지 */
}

/* 오늘 날짜 숫자 배지 */
:deep(.fc-day-today .fc-daygrid-day-number) {
  background: #2196f3;
  color: white;
  border-radius: 50%;
  min-width: 24px; /* 고정 최소 크기 */
  height: 24px;
  padding: 0 6px; /* 숫자가 2자리일 때도 원형/알약 형태 유지 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  line-height: 24px;
  position: absolute; /* 오늘 배지도 절대 위치로 고정 */
}

/* 셀 호버 */
:deep(.fc-daygrid-day-frame:hover) {
  background: rgb(var(--v-theme-schedule-hover-bg));
}

/* 다른 달 셀 호버 */
:deep(.fc-day-other .fc-daygrid-day-frame:hover) {
  background: rgba(var(--v-theme-schedule-hover-bg), 0.8);
}

/* 다른 달 날짜 흐리게 */
:deep(.fc-day-other) {
  background: rgba(var(--v-theme-schedule-hover-bg), 0.5);
}

:deep(.fc-day-other .fc-daygrid-day-number) {
  color: rgb(var(--v-theme-schedule-text-tertiary));
}

/* 이벤트(업무) 바를 기존 badge 느낌으로 */
:deep(.fc-daygrid-event) {
  margin-top: 4px;
}

/* 이벤트 바 - PersonalCalendar 스타일 */
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

:deep(.fc-daygrid-event-harness) {
  margin: 2px 0;
}

/* 이벤트 영역을 셀 하단으로 밀어내기 (셀 높이 변경 없이) */
:deep(.fc-daygrid-day-events) {
  margin-top: 4px; /* 기본 쌓임 사용, 겹침 방지 */
  margin-bottom: 0;
}

/* 더보기 컨테이너를 셀의 맨 아래로 밀착 */
:deep(.fc-daygrid-day-bottom) {
  margin-top: 2px;
  padding-bottom: 0;
  margin-bottom: 0; /* 음수 마진 금지 */
}

/* 숨겨진 이벤트(더보기로 들어간 항목) 잔상 제거 */
:deep(.fc-event-hidden) {
  display: none !important;
}

/* 배경 이벤트가 있을 경우 얇은 바가 보이지 않도록 비활성화 */
:deep(.fc-bg-event) {
  display: none;
}

/* 이벤트 최소 높이 지정해 얇게 눌려 보이지 않도록 */
:deep(.fc-daygrid-event) {
  min-height: 18px; /* 바 높이 소폭 축소 */
}

/* 더보기 링크 버튼 */
:deep(.fc-more-link) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-schedule-border));
  color: rgb(var(--v-theme-schedule-text-secondary));
  border-radius: 6px;
  padding: 2px 8px;
  margin-top: 6px;
  margin-bottom: 0; /* 음수 마진 금지 */
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
}

:deep(.fc-more-link:hover) {
  background-color: rgb(var(--v-theme-schedule-hover-bg));
  color: rgb(var(--v-theme-schedule-text));
}

/* 기본 more popover 사용 (숨기지 않음) */

/* Vuetify 모달 관련 스타일 제거 */

/* 오늘 셀 하단에 잔상(옅은 바) 나타나는 현상 방지 */
::deep(.fc-day-today .fc-daygrid-day-bg),
::deep(.fc-day-today .fc-highlight) {
  display: none !important;
}

/* 오늘 셀 이벤트 영역 여백 보정 */
::deep(.fc-day-today .fc-daygrid-day-events) {
  margin-bottom: 0;
}

/* 상태별 색상 - PersonalCalendar와 동일 */
:deep(.status-todo) {
  background: rgba(33, 150, 243, 0.15) !important;
  border-color: #1976d2 !important;
  color: #1976d2 !important;
}

:deep(.status-in_progress) {
  background: rgba(255, 152, 0, 0.15) !important;
  border-color: #f57c00 !important;
  color: #f57c00 !important;
}

:deep(.status-completed) {
  background: rgba(76, 175, 80, 0.15) !important;
  border-color: #388e3c !important;
  color: #388e3c !important;
}

/* 더보기 팝오버 */
:deep(.fc-popover) {
  background: rgb(var(--v-theme-schedule-card-bg)) !important;
  border: 1px solid rgb(var(--v-theme-schedule-border)) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

:deep(.fc-popover-header) {
  background: rgb(var(--v-theme-schedule-header-bg)) !important;
  color: rgb(var(--v-theme-schedule-text)) !important;
  border-bottom: 1px solid rgb(var(--v-theme-schedule-border)) !important;
}

:deep(.fc-popover-title) {
  color: rgb(var(--v-theme-schedule-text)) !important;
}

:deep(.fc-popover-close) {
  color: rgb(var(--v-theme-schedule-text-secondary)) !important;
  opacity: 1 !important;
}

:deep(.fc-popover-close:hover) {
  color: rgb(var(--v-theme-schedule-text)) !important;
}

:deep(.fc-popover-body) {
  background: rgb(var(--v-theme-schedule-card-bg)) !important;
}

/* 다크모드에서 more 팝오버를 달리 보이도록 살짝 톤 차이 적용 */
:deep(.v-theme--dark) .calendar-container .fc-popover {
  background: rgba(var(--v-theme-on-surface), 0.12) !important; /* 더 진하게 */
  border-color: rgba(var(--v-theme-on-surface), 0.3) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35) !important;
  border-radius: 10px !important;
}

:deep(.v-theme--dark) .calendar-container .fc-popover-header {
  background: rgba(var(--v-theme-on-surface), 0.16) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.28) !important;
}

:deep(.v-theme--dark) .calendar-container .fc-popover-body {
  background: rgba(var(--v-theme-on-surface), 0.1) !important;
}
</style>

