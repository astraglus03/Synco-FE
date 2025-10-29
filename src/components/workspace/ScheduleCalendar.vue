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
  background: white;
  border-radius: 8px;
  padding: 24px;
  height: auto; /* 한 달 전체가 보이도록 자동 높이 */
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
  height: auto; /* 내부 스크롤 제거 */
}

/* 요일 헤더를 기존 스타일과 동일하게 */
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

/* 날짜 그리드 간격/경계선 느낌 - 더 깔끔하게 */
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
  padding: 40px 8px 0 8px; /* 날짜와 업무 사이 여백 소폭 추가 */
  position: relative;
  display: flex;           /* 셀 내부 배치를 위한 플렉스 레이아웃 */
  flex-direction: column;
}

/* 다른 달 날짜는 회색 */
:deep(.fc-day-other .fc-daygrid-day-frame) {
  background: #f5f5f5;
}

/* 날짜 숫자 스타일 */
:deep(.fc-daygrid-day-number) {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
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
  background: #f8f9fa;
}

/* 다른 달 셀 호버 */
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

/* 이벤트(업무) 바를 기존 badge 느낌으로 */
:deep(.fc-daygrid-event) {
  margin-top: 4px;
}

/* 이벤트 바 - 테두리/그림자 정리 */
:deep(.fc-event) {
  border-radius: 6px;
  padding: 2px 6px; /* 바 두께 살짝 얇게 */
  font-size: 11px; /* 텍스트도 약간 작게 */
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.03);
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
  background-color: #f3f4f6;
  color: #6b7280;
  border-radius: 6px;
  padding: 2px 8px;
  margin-top: 6px;
  margin-bottom: 0; /* 음수 마진 금지 */
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
}

:deep(.fc-more-link:hover) {
  background-color: #e5e7eb;
  color: #374151;
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
</style>

