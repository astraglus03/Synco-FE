<template>
  <div class="team-dashboard">
    <!-- 1. 대시보드 헤더 -->
    <div class="dashboard-header">
      <h1>팀 대시보드</h1>
      <p>{{ currentProject.name }} - {{ currentProject.description }}</p>
    </div>
    
    <!-- 2. 통계 카드 그리드 (4개 카드) -->
    <v-row class="stats-grid">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card stat-card-primary">
          <v-card-text class="d-flex align-center">
            <div class="stat-icon primary">
              <v-icon size="32" color="white">mdi-chart-timeline-variant</v-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">프로젝트 진행률</div>
              <div class="stat-value">{{ currentProject.progress }}%</div>
              <div class="stat-description">전체 진행률</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card stat-card-warning">
          <v-card-text class="d-flex align-center">
            <div class="stat-icon warning">
              <v-icon size="32" color="white">mdi-clipboard-check</v-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">진행중인 업무</div>
              <div class="stat-value">{{ inProgressTaskCount }}</div>
              <div class="stat-description">할 일 보드</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card stat-card-success">
          <v-card-text class="d-flex align-center">
            <div class="stat-icon success">
              <v-icon size="32" color="white">mdi-check-circle</v-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">완료된 업무</div>
              <div class="stat-value">{{ completedTaskCount }}</div>
              <div class="stat-description">완료 보드</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card stat-card-info">
          <v-card-text class="d-flex align-center">
            <div class="stat-icon info">
              <v-icon size="32" color="white">mdi-account-group</v-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">팀 멤버</div>
              <div class="stat-value">{{ activeTeamMemberCount }}</div>
              <div class="stat-description">활성 멤버</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 3. 프로젝트 진행 흐름 카드 -->
    <v-card class="progress-flow-card">
      <v-card-title class="flow-header">
        <div class="flow-title-section">
          <v-icon color="primary" size="28">mdi-chart-timeline-variant</v-icon>
          <div class="flow-title-text">
            <h3>프로젝트 진행 흐름</h3>
            <span class="flow-period">{{ formatProjectPeriod() }}</span>
          </div>
        </div>

        <div class="flow-controls">
          <v-btn-toggle v-model="timeFilter" mandatory density="compact" class="filter-toggle">
            <v-btn value="month" size="small">월</v-btn>
            <v-btn value="week" size="small">주</v-btn>
            <v-btn value="day" size="small">일</v-btn>
            <v-btn value="custom" size="small">사용자정의</v-btn>
          </v-btn-toggle>

          <div v-if="timeFilter === 'custom'" class="date-picker-group">
            <v-text-field
              v-model="customStartDate"
              type="date"
              label="시작일"
              density="compact"
              hide-details
              variant="outlined"
              class="date-input"
            />
            <v-text-field
              v-model="customEndDate"
              type="date"
              label="종료일"
              density="compact"
              hide-details
              variant="outlined"
              class="date-input"
            />
          </div>

          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color planned"></span>
              <span>계획</span>
            </div>
            <div class="legend-item">
              <span class="legend-color actual"></span>
              <span>실제</span>
            </div>
          </div>
        </div>
      </v-card-title>

      <v-card-text>
        <!-- 차트 영역 -->
        <div class="chart-container">
          <canvas ref="progressChart"></canvas>
        </div>

        <!-- 기간별 진행 현황 -->
        <div class="period-progress-section">
          <h4>{{ getPeriodProgressTitle() }}</h4>
          <v-row class="period-cards">
            <v-col
              v-for="period in periodData"
              :key="period.id"
              cols="12"
              sm="6"
              md="3"
            >
              <v-card class="period-card">
                <v-card-text>
                  <div class="period-name">{{ period.name }}</div>
                  <div class="period-phase">{{ period.phase }}</div>
                  <v-progress-linear
                    :model-value="period.progress"
                    :color="getPeriodColor(period.status)"
                    height="8"
                    rounded
                    class="period-progress"
                  />
                  <div class="period-info">
                    <span class="period-percentage">{{ period.progress }}%</span>
                    <v-chip
                      :color="getPeriodColor(period.status)"
                      size="small"
                      class="period-status"
                    >
                      {{ period.statusText }}
                    </v-chip>
                  </div>
                  <div class="period-tasks">
                    <span>{{ period.totalTasks }}개 업무</span>
                    <span class="completed-tasks">✔ {{ period.completedTasks }}개 완료</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <!-- 4. 하단 섹션 (2열 그리드) -->
    <v-row class="bottom-section">
      <!-- 좌측: 마감일 & 마일스톤 -->
        <v-col cols="12" md="6">
        <v-card class="deadline-card">
          <v-card-title class="section-title">
            <v-icon color="error" size="24">mdi-calendar-clock</v-icon>
            <span>마감일 & 마일스톤</span>
          </v-card-title>

          <v-card-text>
            <!-- 마감일 임박 업무 -->
            <div v-if="upcomingDeadlines.length > 0" class="deadlines-section">
              <h5>마감일 임박 업무</h5>
              <div
                v-for="task in upcomingDeadlines"
                :key="task.id"
                class="deadline-item"
              >
                <div class="deadline-marker" :style="{ backgroundColor: getPriorityColor(task.priority) }"></div>
                <div class="deadline-content">
                  <div class="deadline-header">
                    <span class="deadline-title">{{ task.title }}</span>
                    <v-chip
                      :color="getPriorityColor(task.priority)"
                      size="x-small"
                      class="priority-chip"
                    >
                      {{ getPriorityText(task.priority) }}
                    </v-chip>
                  </div>
                  <div class="deadline-meta">
                    <span class="assignee">{{ task.assignee }}</span>
                    <span class="remaining-time">{{ formatRemainingTime(task.endDate) }}</span>
                  </div>
                  <div class="board-label">{{ getBoardName(task.boardId) }}</div>
                </div>
              </div>
            </div>

            <v-divider class="my-4" />

            <!-- 다가오는 마일스톤 -->
            <div class="milestones-section">
              <h5>다가오는 마일스톤</h5>
              <div
                v-for="milestone in upcomingMilestones"
                :key="milestone.id"
                class="milestone-item"
              >
                <div class="milestone-content">
                  <div class="milestone-title">{{ milestone.title }}</div>
                  <div class="milestone-description">{{ milestone.description }}</div>
                  <div class="milestone-footer">
                    <span class="milestone-date">{{ formatRemainingTime(milestone.date) }}</span>
                    <v-chip
                      :color="getMilestoneColor(milestone.status)"
                      size="small"
                      class="milestone-status"
                    >
                      {{ getMilestoneStatusText(milestone.status) }}
                    </v-chip>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
        </v-col>
        
      <!-- 우측: 담당자별 업무 현황 -->
        <v-col cols="12" md="6">
        <v-card class="assignee-card">
          <v-card-title class="section-title">
            <v-icon color="info" size="24">mdi-account-group</v-icon>
            <span>담당자별 업무 현황</span>
            <v-spacer />
            <v-select
              v-model="selectedAssignee"
              :items="assigneeOptions"
              density="compact"
              variant="outlined"
              hide-details
              class="assignee-filter"
            />
          </v-card-title>

          <v-card-text>
            <div class="assignee-tasks">
              <div
                v-for="task in filteredTasksByAssignee"
                :key="task.id"
                class="assignee-task-item"
              >
                <div class="task-marker" :style="{ backgroundColor: getBoardColor(task.boardId) }"></div>
                <div class="task-content">
                  <div class="task-header">
                    <span class="task-title">{{ task.title }}</span>
                    <v-chip
                      :color="getBoardColor(task.boardId)"
                      size="x-small"
                      variant="flat"
                      class="board-chip"
                    >
                      {{ getBoardName(task.boardId) }}
                    </v-chip>
                  </div>
                  <div class="task-period">
                    {{ formatDateRange(task.startDate, task.endDate) }}
                  </div>
                  <div class="task-meta">
                    <v-chip
                      :color="getPriorityColor(task.priority)"
                      size="x-small"
                      class="priority-chip"
                    >
                      {{ getPriorityText(task.priority) }}
                    </v-chip>
                    <v-chip
                      :color="getProgressColor(task.progress)"
                      size="x-small"
                      variant="flat"
                      class="status-chip"
                    >
                      {{ getProgressStatusText(task.progress) }}
                    </v-chip>
                  </div>
                  <div class="task-progress-section">
                    <v-progress-linear
                      :model-value="task.progress"
                      :color="getProgressColor(task.progress)"
                      height="6"
                      rounded
                    />
                    <span class="progress-text">{{ task.progress }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
        </v-col>
      </v-row>

    <!-- 5. 최근 활동 카드 -->
    <v-card class="activity-card">
      <v-card-title class="section-title">
        <v-icon color="warning" size="24">mdi-lightning-bolt</v-icon>
        <span>최근 활동</span>
      </v-card-title>

      <v-card-text>
        <div class="activity-list" @scroll="handleActivityScroll">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="activity-item"
          >
            <v-avatar size="40" color="primary" class="activity-avatar">
              <span class="avatar-text">{{ activity.avatar }}</span>
            </v-avatar>
            <div class="activity-content">
              <div class="activity-text">
                <strong>{{ activity.user }}</strong>님이 {{ activity.action }}
              </div>
              <div class="activity-time">{{ formatRelativeTime(activity.timestamp) }}</div>
            </div>
          </div>

          <div v-if="isLoadingActivities" class="activity-loading">
            <v-progress-circular indeterminate color="primary" size="32" />
            <span>로딩 중...</span>
          </div>

          <div v-if="!hasMoreActivities && recentActivities.length > 0" class="activity-end">
            더 이상 활동이 없습니다.
          </div>
    </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useProjectScheduleStore } from '@/store/projectScheduleStore'

// Props
const props = defineProps({
  currentProjectData: Object
})

// Store
const scheduleStore = useProjectScheduleStore()

// Refs
const progressChart = ref(null)
let chartInstance = null

const timeFilter = ref('month')
const customStartDate = ref('2025-09-01')
const customEndDate = ref('2025-12-31')
const selectedAssignee = ref('내 업무')
const isLoadingActivities = ref(false)
const hasMoreActivities = ref(true)

// Computed
const currentProject = computed(() => scheduleStore.getCurrentProject)
const inProgressTaskCount = computed(() => scheduleStore.getInProgressTaskCount)
const completedTaskCount = computed(() => scheduleStore.getCompletedTaskCount)
const activeTeamMemberCount = computed(() => scheduleStore.getActiveTeamMemberCount)
const upcomingDeadlines = computed(() => scheduleStore.getUpcomingDeadlines)
const upcomingMilestones = computed(() => scheduleStore.getUpcomingMilestones)
const recentActivities = computed(() => scheduleStore.getRecentActivities)

const assigneeOptions = computed(() => {
  const assignees = [...new Set(scheduleStore.tasks.map(t => t.assignee))]
  return ['내 업무', '전체', ...assignees]
})

const filteredTasksByAssignee = computed(() => {
  if (selectedAssignee.value === '내 업무') {
    // 실제로는 현재 로그인한 사용자의 업무를 반환
    return scheduleStore.getTasksByAssignee('김민수').slice(0, 3)
  }
  return scheduleStore.getTasksByAssignee(selectedAssignee.value).slice(0, 5)
})

const periodData = computed(() => {
  if (timeFilter.value === 'month') {
    return [
      {
        id: 1,
        name: '2025년 9월',
        phase: '기획 + 설계',
        progress: 25,
        status: 'completed',
        statusText: '완료',
        totalTasks: 4,
        completedTasks: 4
      },
      {
        id: 2,
        name: '2025년 10월',
        phase: '설계 + 개발',
        progress: 18,
        status: 'in-progress',
        statusText: '진행중',
        totalTasks: 6,
        completedTasks: 1
      },
      {
        id: 3,
        name: '2025년 11월',
        phase: '개발 + 테스트',
        progress: 0,
        status: 'pending',
        statusText: '대기',
        totalTasks: 6,
        completedTasks: 0
      },
      {
        id: 4,
        name: '2025년 12월',
        phase: '테스트 + 배포',
        progress: 0,
        status: 'pending',
        statusText: '대기',
        totalTasks: 6,
        completedTasks: 0
      }
    ]
  } else if (timeFilter.value === 'week') {
    return [
      {
        id: 1,
        name: '9/30주',
        phase: '기획 + 설계',
        progress: 6,
        status: 'completed',
        statusText: '완료',
        totalTasks: 7,
        completedTasks: 7
      },
      {
        id: 2,
        name: '10/7주',
        phase: '설계 + 개발',
        progress: 6,
        status: 'completed',
        statusText: '완료',
        totalTasks: 7,
        completedTasks: 7
      },
      {
        id: 3,
        name: '10/14주',
        phase: '설계 + 개발',
        progress: 6,
        status: 'completed',
        statusText: '완료',
        totalTasks: 3,
        completedTasks: 3
      },
      {
        id: 4,
        name: '10/21주',
        phase: '설계 + 개발',
        progress: 1,
        status: 'in-progress',
        statusText: '진행중',
        totalTasks: 6,
        completedTasks: 0
      }
    ]
  } else if (timeFilter.value === 'day') {
    return [
      {
        id: 1,
        name: '10/8',
        phase: '설계 + 개발',
        progress: 1,
        status: 'completed',
        statusText: '완료',
        totalTasks: 7,
        completedTasks: 7
      },
      {
        id: 2,
        name: '10/9',
        phase: '설계 + 개발',
        progress: 1,
        status: 'completed',
        statusText: '완료',
        totalTasks: 5,
        completedTasks: 5
      },
      {
        id: 3,
        name: '10/10',
        phase: '설계 + 개발',
        progress: 1,
        status: 'completed',
        statusText: '완료',
        totalTasks: 4,
        completedTasks: 4
      },
      {
        id: 4,
        name: '10/11',
        phase: '설계 + 개발',
        progress: 1,
        status: 'in-progress',
        statusText: '진행중',
        totalTasks: 4,
        completedTasks: 2
      }
    ]
  } else {
    // custom
    return [
      {
        id: 1,
        name: '2025년 9월',
        phase: '기획 + 설계',
        progress: 25,
        status: 'completed',
        statusText: '완료',
        totalTasks: 4,
        completedTasks: 4
      },
      {
        id: 2,
        name: '2025년 10월',
        phase: '설계 + 개발',
        progress: 18,
        status: 'in-progress',
        statusText: '진행중',
        totalTasks: 6,
        completedTasks: 1
      },
      {
        id: 3,
        name: '2025년 11월',
        phase: '개발 + 테스트',
        progress: 0,
        status: 'pending',
        statusText: '대기',
        totalTasks: 6,
        completedTasks: 0
      },
      {
        id: 4,
        name: '2025년 12월',
        phase: '테스트 + 배포',
        progress: 0,
        status: 'pending',
        statusText: '대기',
        totalTasks: 6,
        completedTasks: 0
      }
    ]
  }
})

// Methods
const formatProjectPeriod = () => {
  const start = new Date(currentProject.value.startDate)
  const end = new Date(currentProject.value.endDate)
  const months = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30))
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ~ ${end.getMonth() + 1}월 (${months}개월)`
}

const getPeriodProgressTitle = () => {
  const titles = {
    month: '월별 진행 현황',
    week: '주별 진행 현황',
    day: '일별 진행 현황',
    custom: '사용자 설정 기간 진행 현황'
  }
  return titles[timeFilter.value] || '진행 현황'
}

const getPeriodColor = (status) => {
  const colors = {
    completed: 'success',
    'in-progress': 'warning',
    pending: 'grey'
  }
  return colors[status] || 'grey'
}

const getPriorityColor = (priority) => {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  }
  return colors[priority] || '#6b7280'
}

const getPriorityText = (priority) => {
  const texts = {
    high: '높음',
    medium: '보통',
    low: '낮음'
  }
  return texts[priority] || priority
}

const getProgressColor = (progress) => {
  if (progress === 100) return 'success'
  if (progress > 0) return 'warning'
  return 'grey'
}

const getProgressStatusText = (progress) => {
  if (progress === 100) return '완료'
  if (progress > 0) return '진행중'
  return '할일'
}

const getBoardName = (boardId) => {
  const board = scheduleStore.boards.find(b => b.id === boardId)
  return board ? board.name : ''
}

const getBoardColor = (boardId) => {
  const board = scheduleStore.boards.find(b => b.id === boardId)
  return board ? board.color : '#6b7280'
}

const getMilestoneColor = (status) => {
  const colors = {
    completed: 'success',
    'in-progress': 'warning',
    pending: 'info'
  }
  return colors[status] || 'grey'
}

const getMilestoneStatusText = (status) => {
  const texts = {
    completed: '완료',
    'in-progress': '진행중',
    pending: '대기'
  }
  return texts[status] || status
}

const formatRemainingTime = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = date - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '내일'
  if (diffDays > 0) return `${diffDays}일 후`
  return `${Math.abs(diffDays)}일 전`
}

const formatDateRange = (startDate, endDate) => {
  return `${startDate} ~ ${endDate}`
}

const formatRelativeTime = (timestamp) => {
  const now = new Date()
  const diff = now - new Date(timestamp)
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return `${days}일 전`
}

const handleActivityScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target
  const threshold = 50

  if (scrollHeight - scrollTop <= clientHeight + threshold && !isLoadingActivities.value && hasMoreActivities.value) {
    loadMoreActivities()
  }
}

const loadMoreActivities = async () => {
  isLoadingActivities.value = true
  
  // 시뮬레이션: 1초 후 데이터 로드
  setTimeout(() => {
    scheduleStore.loadMoreActivities()
    isLoadingActivities.value = false
    
    // 시뮬레이션: 2번 로드 후 더 이상 없음
    if (recentActivities.value.length >= 10) {
      hasMoreActivities.value = false
    }
  }, 1000)
}

const createChart = async () => {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  if (!progressChart.value) return

  const ctx = progressChart.value.getContext('2d')

  const chartData = getChartData()

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + '%',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: {
              size: 11
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  })
}

const getChartData = () => {
  if (timeFilter.value === 'month') {
    return {
      labels: ['9월', '10월', '11월', '12월'],
      datasets: [
        {
          label: '계획된 진행률',
          data: [25, 50, 75, 100],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '실제 진행률',
          data: [20, 45, 60, 65],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    }
  } else if (timeFilter.value === 'week') {
    return {
      labels: ['9/30주', '10/7주', '10/14주', '10/21주'],
      datasets: [
        {
          label: '계획된 진행률',
          data: [25, 55, 80, 100],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '실제 진행률',
          data: [10, 20, 15, 5],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    }
  } else if (timeFilter.value === 'day') {
    return {
      labels: ['10/8', '10/9', '10/10', '10/11', '10/12', '10/13', '10/14', '10/15', '10/16', '10/17', '10/18', '10/19', '10/20', '10/21'],
      datasets: [
        {
          label: '계획된 진행률',
          data: [10, 20, 30, 40, 50, 60, 65, 70, 75, 80, 85, 90, 92, 95],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '실제 진행률',
          data: [5, 6, 7, 8, 9, 10, 9, 8, 9, 10, 11, 10, 9, 10],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    }
  } else {
    // custom
    return {
      labels: ['9월', '10월', '11월', '12월'],
      datasets: [
        {
          label: '계획된 진행률',
          data: [25, 50, 75, 100],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '실제 진행률',
          data: [20, 45, 60, 65],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    }
  }
}

const updateChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }
  createChart()
}

// Lifecycle
onMounted(async () => {
  await createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})

// Watch
watch(timeFilter, () => {
  updateChart()
})

watch([customStartDate, customEndDate], () => {
  if (timeFilter.value === 'custom') {
    updateChart()
  }
})
</script>

<style scoped>
.team-dashboard {
  padding: 24px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

/* 1. 대시보드 헤더 */
.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1e293b;
}

.dashboard-header p {
  font-size: 16px;
  color: #64748b;
}

/* 2. 통계 카드 그리드 */
.stats-grid {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card .v-card-text {
  padding: 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon.primary {
  background-color: #3b82f6;
}

.stat-icon.warning {
  background-color: #f59e0b;
}

.stat-icon.success {
  background-color: #22c55e;
}

.stat-icon.info {
  background-color: #3b82f6;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-description {
  font-size: 12px;
  color: #94a3b8;
}

/* 3. 프로젝트 진행 흐름 카드 */
.progress-flow-card {
  border-radius: 12px;
  margin-bottom: 24px;
}

.flow-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 24px;
}

.flow-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.flow-title-text h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.flow-period {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  display: block;
}

.flow-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-toggle {
  box-shadow: none;
}

.date-picker-group {
  display: flex;
  gap: 8px;
}

.date-input {
  width: 150px;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.legend-color {
  width: 16px;
  height: 4px;
  border-radius: 2px;
}

.legend-color.planned {
  background-color: #6366f1;
}

.legend-color.actual {
  background-color: #22c55e;
}

.chart-container {
  height: 220px;
  margin-bottom: 32px;
  padding: 0 8px;
}

.period-progress-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.period-cards {
  margin-top: 16px;
}

.period-card {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.period-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.period-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.period-phase {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}

.period-progress {
  margin-bottom: 12px;
}

.period-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.period-percentage {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.period-tasks {
  font-size: 12px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
}

.completed-tasks {
  color: #22c55e;
}

/* 4. 하단 섹션 */
.bottom-section {
  margin-bottom: 24px;
}

.deadline-card,
.assignee-card {
  border-radius: 12px;
  height: 100%;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  padding: 20px 24px;
}

.deadlines-section h5,
.milestones-section h5 {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.deadline-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  background-color: #f8f9fa;
  transition: background-color 0.2s ease;
}

.deadline-item:hover {
  background-color: #f1f3f5;
}

.deadline-marker {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.deadline-content {
  flex: 1;
}

.deadline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.deadline-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.deadline-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
}

.remaining-time {
  color: #ef4444;
  font-weight: 500;
}

.board-label {
  font-size: 11px;
  color: #94a3b8;
}

.milestone-item {
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
  margin-bottom: 12px;
  transition: background-color 0.2s ease;
}

.milestone-item:hover {
  background-color: #f1f3f5;
}

.milestone-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
}

.milestone-description {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
  line-height: 1.5;
}

.milestone-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.milestone-date {
  font-size: 12px;
  color: #64748b;
}

.assignee-filter {
  max-width: 150px;
}

.assignee-tasks {
  max-height: 500px;
  overflow-y: auto;
}

.assignee-task-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  background-color: #f8f9fa;
  transition: background-color 0.2s ease;
}

.assignee-task-item:hover {
  background-color: #f1f3f5;
}

.task-marker {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.task-content {
  flex: 1;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.task-period {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.task-progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-progress-section .v-progress-linear {
  flex: 1;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  min-width: 40px;
  text-align: right;
}

/* 5. 최근 활동 카드 */
.activity-card {
  border-radius: 12px;
}

.activity-list {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: background-color 0.2s ease;
}

.activity-item:hover {
  background-color: #f8f9fa;
}

.activity-avatar {
  flex-shrink: 0;
}

.avatar-text {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.5;
}

.activity-time {
  font-size: 12px;
  color: #94a3b8;
}

.activity-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: #64748b;
}

.activity-end {
  text-align: center;
  padding: 24px;
  font-size: 14px;
  color: #94a3b8;
}

/* 반응형 */
@media (max-width: 960px) {
  .flow-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .flow-controls {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .chart-container {
    height: 180px;
  }
}

@media (max-width: 600px) {
  .team-dashboard {
    padding: 16px;
  }

  .dashboard-header h1 {
    font-size: 24px;
  }

  .stat-value {
    font-size: 24px;
  }

  .chart-container {
    height: 150px;
  }
}
</style>
