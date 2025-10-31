<template>
  <div class="team-dashboard">
    <!-- 1. 대시보드 헤더 -->
    <div class="dashboard-header">
      <h1>{{ currentProject.name }}</h1>
    </div>
    
    <!-- 2. 통계 카드 그리드 (4개 카드) -->
    <v-row class="stats-grid">
      <v-col cols="12" sm="6" md="3" class="stat-col">
        <v-card class="stat-card stat-card-primary">
          <v-card-text class="d-flex align-center">
            <div class="stat-icon primary">
              <v-icon size="32" color="white">mdi-chart-timeline-variant</v-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">프로젝트 진행률</div>
              <div class="stat-value">{{ projectProgress }}%</div>
              <div class="stat-description">전체 진행률</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3" class="stat-col">
        <div 
          class="stat-card-wrapper"
          @mouseenter="showInProgressDropdown = true"
          @mouseleave="showInProgressDropdown = false"
        >
          <v-card class="stat-card stat-card-warning stat-card-with-dropdown">
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
          
          <!-- 진행중인 업무 드롭다운 -->
          <div v-if="showInProgressDropdown" class="task-dropdown">
            <v-list density="compact">
              <v-list-item
                v-for="task in inProgressTasks"
                :key="task.taskSeq"
                class="task-item-enhanced"
                @click="handleTaskClick(task.taskSeq)"
              >
                <div class="task-item-content">
                  <div class="task-item-header">
                    <span class="task-title">{{ task.taskTitle }}</span>
                    <v-chip size="x-small" color="warning" variant="flat">진행중</v-chip>
                  </div>
                  <div class="task-item-meta">
                    <span class="task-assignee">
                      <v-icon size="14">mdi-account</v-icon>
                      {{ getMemberName(task.picMemberSeq) }}
                    </span>
                    <span v-if="task.endDate" class="task-date">
                      <v-icon size="14">mdi-calendar</v-icon>
                      {{ task.endDate }}
                    </span>
                  </div>
                </div>
              </v-list-item>
              <v-list-item v-if="inProgressTasks.length === 0" class="empty-state">
                <div class="empty-text">진행중인 업무가 없습니다</div>
              </v-list-item>
            </v-list>
          </div>
        </div>
      </v-col>

      <v-col cols="12" sm="6" md="3" class="stat-col">
        <div 
          class="stat-card-wrapper"
          @mouseenter="showCompletedDropdown = true"
          @mouseleave="showCompletedDropdown = false"
        >
          <v-card class="stat-card stat-card-success stat-card-with-dropdown">
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
          
          <!-- 완료된 업무 드롭다운 -->
          <div v-if="showCompletedDropdown" class="task-dropdown">
            <v-list density="compact">
              <v-list-item
                v-for="task in completedTasks"
                :key="task.taskSeq"
                class="task-item-enhanced"
                @click="handleTaskClick(task.taskSeq)"
              >
                <div class="task-item-content">
                  <div class="task-item-header">
                    <span class="task-title">{{ task.taskTitle }}</span>
                    <v-chip size="x-small" color="success" variant="flat">완료</v-chip>
                  </div>
                  <div class="task-item-meta">
                    <span class="task-assignee">
                      <v-icon size="14">mdi-account</v-icon>
                      {{ getMemberName(task.picMemberSeq) }}
                    </span>
                    <span v-if="task.endDate" class="task-date">
                      <v-icon size="14">mdi-calendar</v-icon>
                      {{ task.endDate }}
                    </span>
                  </div>
                </div>
              </v-list-item>
              <v-list-item v-if="completedTasks.length === 0" class="empty-state">
                <div class="empty-text">완료된 업무가 없습니다</div>
              </v-list-item>
            </v-list>
          </div>
        </div>
      </v-col>

      <v-col cols="12" sm="6" md="3" class="stat-col">
        <v-card 
          class="stat-card stat-card-info clickable"
          @click="toggleMemberSidebar"
        >
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
              :min="customStartDateMin"
              :max="customStartDateMax"
            />
            <v-text-field
              v-model="customEndDate"
              type="date"
              label="종료일"
              density="compact"
              hide-details
              variant="outlined"
              class="date-input"
              :min="customEndDateMin"
              :max="customEndDateMax"
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

        <!-- 페이지네이션 버튼 -->
        <div v-if="showPagination" class="chart-pagination">
          <v-btn
            :disabled="currentPage === 0"
            @click="previousPage"
            size="small"
            variant="outlined"
            icon
          >
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <span class="page-info">{{ currentPage + 1 }} / {{ totalPages }}</span>
          <v-btn
            :disabled="currentPage >= totalPages - 1"
            @click="nextPage"
            size="small"
            variant="outlined"
            icon
          >
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
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
              <div 
                class="period-card-wrapper"
                @mouseenter="hoveredPeriodId = period.id"
                @mouseleave="hoveredPeriodId = null"
              >
                <v-card class="period-card period-card-with-dropdown">
                <v-card-text>
                  <div class="period-name">{{ period.name }}</div>
                  <div class="period-phase">{{ period.phase }}</div>
                  
                  <!-- 업무가 있을 때 -->
                  <div v-if="period.totalTasks > 0" class="period-content">
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
                  </div>
                  
                  <!-- 업무가 없을 때 -->
                  <div v-else class="no-tasks-card">
                    <v-icon size="40" color="grey-lighten-2">mdi-clipboard-text-off-outline</v-icon>
                    <span class="no-tasks-text">업무 없음</span>
                  </div>
                </v-card-text>
              </v-card>
                
                <!-- 기간별 업무 드롭다운 -->
                <div v-if="hoveredPeriodId === period.id" class="period-task-dropdown">
                  <div class="dropdown-header">
                    <strong>{{ period.name }} 업무 목록</strong>
                    <span class="task-count">{{ period.tasks?.length || 0 }}개</span>
                  </div>
                  <div v-if="period.tasks && period.tasks.length > 0" class="task-list">
                    <div
                      v-for="task in period.tasks"
                      :key="task.taskSeq"
                      class="period-task-item clickable"
                      @click="handleTaskClick(task.taskSeq)"
                    >
                      <div class="task-item-content">
                        <div class="task-item-header">
                          <span class="task-title">{{ task.taskTitle }}</span>
                          <v-chip
                            :color="getTaskStatusColor(task.taskStatus || task.status)"
                            size="x-small"
                            class="status-chip"
                          >
                            {{ getTaskStatusText(task.taskStatus || task.status) }}
                          </v-chip>
                        </div>
                        <div class="task-item-meta">
                          <span class="task-assignee">
                            <v-icon size="small">mdi-account</v-icon>
                            {{ getMemberName(task.picMemberSeq) || task.assigneeName || '미지정' }}
                          </span>
                          <span class="task-date">
                            <v-icon size="small">mdi-calendar</v-icon>
                            {{ task.endDate || '날짜 미정' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="empty-state">
                    <v-icon size="large" color="grey-lighten-1">mdi-clipboard-text-off-outline</v-icon>
                    <span class="empty-text">업무가 없습니다</span>
                  </div>
                </div>
              </div>
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
            <div class="deadlines-section">
              <h5>마감일 임박 업무 (5일 이내)</h5>
              <div v-if="upcomingDeadlines.length > 0" class="scrollable-list">
              <div
                v-for="task in upcomingDeadlines"
                :key="task.id"
                class="deadline-item clickable"
                @click="handleTaskClick(task.id)"
              >
                <div class="deadline-marker" :style="{ backgroundColor: getPriorityColor(task.priority) }"></div>
                <div class="deadline-content">
                  <div class="deadline-header">
                    <span class="deadline-title">{{ task.title }}</span>
                      <div class="deadline-chips">
                    <v-chip
                      :color="getPriorityColor(task.priority)"
                      size="x-small"
                      class="priority-chip"
                    >
                      {{ getPriorityText(task.priority) }}
                    </v-chip>
                        <v-chip
                          :color="getMilestoneColor(task.status)"
                          size="x-small"
                          class="status-chip"
                        >
                          {{ getMilestoneStatusText(task.status) }}
                    </v-chip>
                      </div>
                  </div>
                  <div class="deadline-meta">
                      <span class="assignee">
                        <v-icon size="small">mdi-account</v-icon>
                        {{ task.assignee }}
                      </span>
                      <span class="remaining-time">
                        <v-icon size="small">mdi-clock-outline</v-icon>
                        {{ formatRemainingTime(task.endDate) }}
                      </span>
                  </div>
                </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <v-icon size="large" color="grey-lighten-1">mdi-calendar-check</v-icon>
                <span class="empty-text">5일 이내 마감 업무가 없습니다</span>
              </div>
            </div>

            <v-divider class="my-4" />

            <!-- 다가오는 마일스톤 -->
            <div class="milestones-section">
              <h5>다가오는 마일스톤</h5>
              <div v-if="upcomingMilestones.length > 0" class="scrollable-list">
              <div
                v-for="milestone in upcomingMilestones"
                :key="milestone.id"
                class="milestone-item clickable"
                @click="handleTaskClick(milestone.id)"
              >
                  <div class="milestone-marker" :style="{ backgroundColor: getPriorityColor(milestone.priority) }"></div>
                <div class="milestone-content">
                    <div class="milestone-header">
                  <div class="milestone-title">{{ milestone.title }}</div>
                      <div class="milestone-chips">
                        <v-chip
                          :color="getPriorityColor(milestone.priority)"
                          size="x-small"
                          class="priority-chip"
                        >
                          {{ getPriorityText(milestone.priority) }}
                        </v-chip>
                    <v-chip
                      :color="getMilestoneColor(milestone.status)"
                          size="x-small"
                          class="status-chip"
                    >
                      {{ getMilestoneStatusText(milestone.status) }}
                    </v-chip>
                  </div>
                </div>
                    <div class="milestone-footer">
                      <span class="milestone-assignee">
                        <v-icon size="small">mdi-account</v-icon>
                        {{ milestone.assignee }}
                      </span>
                      <span class="milestone-date">
                        <v-icon size="small">mdi-calendar</v-icon>
                        {{ milestone.date }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <v-icon size="large" color="grey-lighten-1">mdi-flag-outline</v-icon>
                <span class="empty-text">예정된 마일스톤이 없습니다</span>
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
            <v-menu
              v-model="showAssigneeMenu"
              location="bottom end"
              :close-on-content-click="false"
              offset="8"
            >
              <template #activator="{ props }">
                <button class="assignee-filter-btn" v-bind="props">
                  <v-icon size="16" class="mr-2">mdi-account</v-icon>
                  <span class="label">{{ selectedAssigneeLabel }}</span>
                  <v-icon size="16" class="ml-3 chevron">mdi-chevron-down</v-icon>
                </button>
              </template>
              <v-card class="assignee-filter-menu" min-width="280">
                <div class="menu-header">
                  <v-icon size="18" color="primary">mdi-account-filter</v-icon>
                  <span>담당자 선택</span>
                </div>
                <div class="menu-search">
                  <v-text-field
                    v-model="assigneeSearch"
                    placeholder="담당자 검색"
                    prepend-inner-icon="mdi-magnify"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </div>
                <v-list density="comfortable" class="menu-list">
                  <v-list-item :active="selectedAssignee === '내 업무'" @click="selectAssignee('내 업무')">
                    <template #prepend>
                      <v-icon>mdi-account-circle</v-icon>
                    </template>
                    <v-list-item-title>내 업무</v-list-item-title>
                    <template #append>
                      <v-icon v-if="selectedAssignee === '내 업무'" color="primary">mdi-check</v-icon>
                    </template>
                  </v-list-item>
                  <v-list-item :active="selectedAssignee === '전체'" @click="selectAssignee('전체')">
                    <template #prepend>
                      <v-icon>mdi-infinity</v-icon>
                    </template>
                    <v-list-item-title>전체</v-list-item-title>
                    <template #append>
                      <v-icon v-if="selectedAssignee === '전체'" color="primary">mdi-check</v-icon>
                    </template>
                  </v-list-item>
                  <v-divider class="my-1" />
                  <v-list-item
                    v-for="m in filteredAssigneeOptions"
                    :key="m"
                    :active="selectedAssignee === m"
                    @click="selectAssignee(m)"
                  >
                    <template #prepend>
                      <v-avatar size="22" color="primary">
                        <span class="text-white" style="font-weight:700">{{ m.charAt(0) }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title>{{ m }}</v-list-item-title>
                    <template #append>
                      <v-icon v-if="selectedAssignee === m" color="primary">mdi-check</v-icon>
                    </template>
                  </v-list-item>
                  <div v-if="filteredAssigneeOptions.length === 0" class="menu-empty">
                    <v-icon size="22" color="grey">mdi-account-off</v-icon>
                    <span>검색 결과가 없습니다</span>
                  </div>
                </v-list>
                <div class="menu-actions">
                  <v-btn variant="text" size="small" @click="showAssigneeMenu = false">닫기</v-btn>
                </div>
              </v-card>
            </v-menu>
          </v-card-title>

          <v-card-text>
            <div v-if="filteredTasksByAssignee.length > 0" class="assignee-tasks scrollable-list">
              <div
                v-for="task in filteredTasksByAssignee"
                :key="task.id"
                class="assignee-task-item clickable"
                @click="handleTaskClick(task.id)"
              >
                <div class="task-marker" :style="{ backgroundColor: getPriorityColor(task.priority) }"></div>
                <div class="task-content">
                  <div class="task-header">
                    <span class="task-title">{{ task.title }}</span>
                    <div class="task-chips">
                    <v-chip
                      :color="getPriorityColor(task.priority)"
                      size="x-small"
                      class="priority-chip"
                    >
                      {{ getPriorityText(task.priority) }}
                    </v-chip>
                    <v-chip
                        :color="getMilestoneColor(task.status)"
                      size="x-small"
                      class="status-chip"
                    >
                        {{ getMilestoneStatusText(task.status) }}
                    </v-chip>
                  </div>
                  </div>
                  <div class="task-period">
                    <v-icon size="small">mdi-calendar-range</v-icon>
                    {{ formatDateRange(task.startDate, task.endDate) }}
                </div>
                  <div class="task-assignee-info">
                    <v-icon size="small">mdi-account</v-icon>
                    {{ task.assignee }}
              </div>
            </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <v-icon size="large" color="grey-lighten-1">mdi-clipboard-text-off-outline</v-icon>
              <span class="empty-text">담당 업무가 없습니다</span>
    </div>
      </v-card-text>
    </v-card>
        </v-col>
      </v-row>
  </div>

  <!-- 업무 상세 모달 -->
  <TaskDetailModal
    v-model="showTaskDetailModal"
    :taskData="selectedTask"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useProjectScheduleStore } from '@/store/projectScheduleStore'
import { useWorkspaceMemberStore } from '@/store/workspaceMemberStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { getProjectTasks, getTaskDetail } from '@/api/schedule/scheduleApi'
import { getWorkspaceMembers } from '@/api/workspace/workSpaceApi'
import TaskDetailModal from './TaskDetailModal.vue'

// Props
const props = defineProps({
  currentProjectData: Object
})

// Emits
const emit = defineEmits(['toggle-member-sidebar'])

// Store
const scheduleStore = useProjectScheduleStore()
const memberStore = useWorkspaceMemberStore()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()

// Refs
const progressChart = ref(null)
let chartInstance = null

const timeFilter = ref('month')
const customStartDate = ref('2025-09-01')
const customEndDate = ref('2025-12-31')
const selectedAssignee = ref('내 업무')
const showAssigneeMenu = ref(false)
const assigneeSearch = ref('')

// 대시보드 통계 관련 refs
const allTasks = ref([])
const inProgressTasks = ref([])
const completedTasks = ref([])
const teamMembers = ref([])
const showInProgressDropdown = ref(false)
const showCompletedDropdown = ref(false)
const isLoadingStats = ref(false)
const hoveredPeriodId = ref(null)

// 프로젝트 기간 관련
const projectStartDate = ref(null)
const projectEndDate = ref(null)
const currentPage = ref(0) // 페이지네이션용
const totalPages = ref(1) // 전체 페이지 수

// Computed
const currentProject = computed(() => scheduleStore.getCurrentProject)

// 사용자 정의 날짜 선택 범위 제한
const customStartDateMin = computed(() => {
  // 프로젝트 시작일 이전 선택 불가
  return projectStartDate.value ? projectStartDate.value.toISOString().split('T')[0] : null
})

const customStartDateMax = computed(() => {
  // 종료일보다 늦은 날짜 선택 불가
  const endDate = customEndDate.value
  const projectEnd = projectEndDate.value ? projectEndDate.value.toISOString().split('T')[0] : null
  
  if (endDate && projectEnd) {
    return endDate < projectEnd ? endDate : projectEnd
  }
  return endDate || projectEnd
})

const customEndDateMin = computed(() => {
  // 시작일보다 빠른 날짜 선택 불가
  const startDate = customStartDate.value
  const projectStart = projectStartDate.value ? projectStartDate.value.toISOString().split('T')[0] : null
  
  if (startDate && projectStart) {
    return startDate > projectStart ? startDate : projectStart
  }
  return startDate || projectStart
})

const customEndDateMax = computed(() => {
  // 프로젝트 종료일 이후 선택 불가
  return projectEndDate.value ? projectEndDate.value.toISOString().split('T')[0] : null
})

// 프로젝트 진행률: 전체 업무 중 완료된 업무 비율
const projectProgress = computed(() => {
  if (!Array.isArray(allTasks.value) || allTasks.value.length === 0) {
    return 0
  }
  const completedCount = allTasks.value.filter(task => {
    const status = task.taskStatus || task.status || task.taskStatusDescription
    return status === 'COMPLETED' || 
           status === '완료' ||
           status === 'DONE' ||
           status === 'FINISHED'
  }).length
  return Math.round((completedCount / allTasks.value.length) * 100)
})

// 진행중인 업무 개수
const inProgressTaskCount = computed(() => {
  return Array.isArray(inProgressTasks.value) ? inProgressTasks.value.length : 0
})

// 완료된 업무 개수  
const completedTaskCount = computed(() => {
  return Array.isArray(completedTasks.value) ? completedTasks.value.length : 0
})

// 팀 멤버 수
const activeTeamMemberCount = computed(() => {
  return Array.isArray(teamMembers.value) ? teamMembers.value.length : 0
})

// 페이지네이션 표시 여부
const showPagination = computed(() => {
  const { months } = calculateProjectDates()
  
  if (timeFilter.value === 'month') {
    return months > 3 // 4개월 이상일 때 페이지네이션 표시
  } else if (timeFilter.value === 'week') {
    const weeks = getWeeksInRange(projectStartDate.value, projectEndDate.value)
    return weeks > 4 // 5주 이상일 때 페이지네이션 표시
  } else if (timeFilter.value === 'day') {
    return true // 일 단위는 항상 페이지네이션 표시
  } else if (timeFilter.value === 'custom') {
    // 사용자 정의 기간도 7일 이상이면 페이지네이션 표시
    const customStart = new Date(customStartDate.value)
    const customEnd = new Date(customEndDate.value)
    const daysDiff = Math.floor((customEnd - customStart) / (24 * 60 * 60 * 1000))
    return daysDiff >= 7
  }
  
  return false
})

// 마감일 임박 업무 (5일 이내)
const upcomingDeadlines = computed(() => {
  if (!allTasks.value || allTasks.value.length === 0) return []
  
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  return allTasks.value
    .filter(task => {
      if (!task.endDate) return false
      const endDate = new Date(task.endDate)
      endDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000))
      return daysRemaining >= 0 && daysRemaining <= 5 // 오늘부터 5일 이내
    })
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
    .slice(0, 10) // 최대 10개
    .map(task => {
      const endDate = new Date(task.endDate)
      endDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000))
      
      // 남은 일수에 따라 우선순위 자동 설정
      let priority = 'high' // 기본값: 5일 이내
      if (daysRemaining >= 14) {
        priority = 'low' // 14일 이상
      } else if (daysRemaining >= 10) {
        priority = 'medium' // 10일 이상
      }
      
      return {
        id: task.taskSeq,
        title: task.taskTitle,
        endDate: task.endDate,
        assignee: getMemberName(task.picMemberSeq) || task.assigneeName || '미지정',
        priority: priority,
        daysRemaining: daysRemaining,
        boardId: task.boardId,
        status: task.taskStatus || task.status
      }
    })
})

// 다가오는 마일스톤 (오늘 기준 end_date가 있는 모든 업무)
const upcomingMilestones = computed(() => {
  if (!allTasks.value || allTasks.value.length === 0) return []
  
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  return allTasks.value
    .filter(task => {
      if (!task.endDate) return false
      const endDate = new Date(task.endDate)
      endDate.setHours(0, 0, 0, 0)
      return endDate >= now // 오늘 포함 이후
    })
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate)) // end_date 빠른 순
    .map(task => {
      const endDate = new Date(task.endDate)
      endDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000))
      
      // 남은 일수에 따라 우선순위 자동 설정
      let priority = 'high' // 기본값: 5일 미만
      if (daysRemaining >= 14) {
        priority = 'low' // 14일 이상
      } else if (daysRemaining >= 10) {
        priority = 'medium' // 10일 이상
      }
      
      return {
        id: task.taskSeq,
        title: task.taskTitle,
        date: task.endDate,
        assignee: getMemberName(task.picMemberSeq) || task.assigneeName || '미지정',
        status: task.taskStatus || task.status,
        priority: priority,
        daysRemaining: daysRemaining
      }
    })
})


// 담당자 옵션 (memberList에서 가져오기)
const assigneeOptions = computed(() => {
  if (!teamMembers.value || teamMembers.value.length === 0) return ['내 업무', '전체']
  
  const memberNames = teamMembers.value.map(member => member.name)
  return ['내 업무', '전체', ...memberNames]
})

const filteredAssigneeOptions = computed(() => {
  const q = (assigneeSearch.value || '').toLowerCase().trim()
  const base = (teamMembers.value || []).map(m => m.name)
  if (!q) return base
  return base.filter(n => (n || '').toLowerCase().includes(q))
})

const selectedAssigneeLabel = computed(() => selectedAssignee.value || '내 업무')

const selectAssignee = (v) => {
  selectedAssignee.value = v
  showAssigneeMenu.value = false
}

// 담당자별 업무 필터링
const filteredTasksByAssignee = computed(() => {
  if (!allTasks.value || allTasks.value.length === 0) return []
  
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  let filteredTasks = allTasks.value
  
  // 담당자 필터링
  if (selectedAssignee.value === '내 업무') {
    // 현재 로그인한 사용자의 업무만 표시
    const currentUserName = authStore.user?.name || authStore.user?.memberId
    filteredTasks = filteredTasks.filter(task => {
      const assigneeName = getMemberName(task.picMemberSeq) || task.assigneeName
      return assigneeName === currentUserName
    })
  } else if (selectedAssignee.value !== '전체') {
    // 특정 담당자의 업무만 표시
    filteredTasks = filteredTasks.filter(task => {
      const assigneeName = getMemberName(task.picMemberSeq) || task.assigneeName
      return assigneeName === selectedAssignee.value
    })
  }
  
  // 우선순위 및 날짜 정보 추가
  return filteredTasks
    .map(task => {
      const endDate = new Date(task.endDate)
      endDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000))
      
      // 남은 일수에 따라 우선순위 자동 설정
      let priority = 'high'
      if (daysRemaining >= 14) {
        priority = 'low'
      } else if (daysRemaining >= 10) {
        priority = 'medium'
      }
      
      return {
        id: task.taskSeq,
        title: task.taskTitle,
        startDate: task.startDate || task.endDate, // startDate가 없으면 endDate 사용
        endDate: task.endDate,
        priority: priority,
        progress: task.progress || 0,
        status: task.taskStatus || task.status,
        boardId: task.boardId,
        assignee: getMemberName(task.picMemberSeq) || task.assigneeName || '미지정'
      }
    })
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate)) // 마감일 빠른 순
})

const periodData = computed(() => {
  const { startDate, endDate, months } = calculateProjectDates()
  
  if (!startDate || !endDate) return []
  
  const result = []
  
  if (timeFilter.value === 'month') {
    const displayMonths = months <= 3 ? 3 : 4
    const startMonth = currentPage.value * 4
    
    for (let i = 0; i < displayMonths; i++) {
      const monthIndex = startMonth + i
      if (monthIndex >= months) break
      
      const periodStart = new Date(startDate)
      periodStart.setMonth(periodStart.getMonth() + monthIndex)
      periodStart.setDate(1)
      periodStart.setHours(0, 0, 0, 0)
      
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
      periodEnd.setHours(23, 59, 59, 999)
      
      const taskInfo = getPeriodTaskInfo(periodStart, periodEnd)
      
      result.push({
        id: i + 1,
        name: `${periodStart.getFullYear()}년 ${periodStart.getMonth() + 1}월`,
        phase: getPhaseText(taskInfo.status),
        progress: taskInfo.progress,
        status: taskInfo.status,
        statusText: getStatusText(taskInfo.status),
        totalTasks: taskInfo.totalTasks,
        completedTasks: taskInfo.completedTasks,
        tasks: taskInfo.tasks
      })
    }
    return result
  } else if (timeFilter.value === 'week') {
    const totalWeeks = getWeeksInRange(startDate, endDate)
    const displayWeeks = totalWeeks <= 4 ? 3 : 4
    const startWeek = currentPage.value * 4
    let currentWeekStart = getWeekStart(startDate)
    
    for (let i = 0; i < displayWeeks; i++) {
      const weekIndex = startWeek + i
      if (weekIndex >= totalWeeks) break
      
      const weekDate = new Date(currentWeekStart)
      weekDate.setDate(weekDate.getDate() + (weekIndex * 7))
      weekDate.setHours(0, 0, 0, 0)
      
      const weekEnd = getWeekEnd(weekDate)
      weekEnd.setHours(23, 59, 59, 999)
      
      const taskInfo = getPeriodTaskInfo(weekDate, weekEnd)
      
      result.push({
        id: i + 1,
        name: `${weekDate.getMonth() + 1}/${weekDate.getDate()}`,
        phase: getPhaseText(taskInfo.status),
        progress: taskInfo.progress,
        status: taskInfo.status,
        statusText: getStatusText(taskInfo.status),
        totalTasks: taskInfo.totalTasks,
        completedTasks: taskInfo.completedTasks,
        tasks: taskInfo.tasks
      })
    }
    return result
  } else if (timeFilter.value === 'day') {
    const totalDays = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1
    const totalWeeks = Math.ceil(totalDays / 7)
    const isLastPage = currentPage.value === totalWeeks - 1
    
    // 첫 번째 페이지는 프로젝트 시작일부터, 그 외에는 주 단위로 계산
    let weekStart
    if (currentPage.value === 0) {
      weekStart = new Date(startDate)
    } else {
      weekStart = getWeekStart(new Date(startDate.getTime() + (currentPage.value * 7 * 24 * 60 * 60 * 1000)))
    }
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart)
      currentDay.setDate(currentDay.getDate() + i)
      
      if (currentDay > endDate) break
      
      const dayEnd = new Date(currentDay)
      dayEnd.setHours(23, 59, 59, 999)
      
      const taskInfo = getPeriodTaskInfo(currentDay, dayEnd)
      
      result.push({
        id: i + 1,
        name: `${currentDay.getMonth() + 1}/${currentDay.getDate()}`,
        phase: getPhaseText(taskInfo.status),
        progress: taskInfo.progress,
        status: taskInfo.status,
        statusText: getStatusText(taskInfo.status),
        totalTasks: taskInfo.totalTasks,
        completedTasks: taskInfo.completedTasks,
        tasks: taskInfo.tasks
      })
    }
    
    // 마지막 페이지에서 종료일이 아직 포함되지 않았다면 추가
    if (isLastPage && result.length > 0) {
      const lastItem = result[result.length - 1]
      const endDateLabel = `${endDate.getMonth() + 1}/${endDate.getDate()}`
      
      // 마지막 항목이 종료일이 아니면 종료일 추가
      if (lastItem.name !== endDateLabel) {
        const dayEnd = new Date(endDate)
        dayEnd.setHours(23, 59, 59, 999)
        
        const taskInfo = getPeriodTaskInfo(endDate, dayEnd)
        
        result.push({
          id: result.length + 1,
          name: endDateLabel,
          phase: getPhaseText(taskInfo.status),
          progress: taskInfo.progress,
          status: taskInfo.status,
          statusText: getStatusText(taskInfo.status),
          totalTasks: taskInfo.totalTasks,
          completedTasks: taskInfo.completedTasks,
          tasks: taskInfo.tasks
        })
      }
    }
    
    return result
  } else {
    // custom - 사용자 정의 기간
    const customStart = new Date(customStartDate.value)
    const customEnd = new Date(customEndDate.value)
    
    const totalDays = Math.floor((customEnd - customStart) / (24 * 60 * 60 * 1000)) + 1
    const totalWeeks = Math.ceil(totalDays / 7)
    const isLastPage = currentPage.value === totalWeeks - 1
    
    // 첫 번째 페이지는 사용자 지정 시작일부터, 그 외에는 주 단위로 계산
    let weekStart
    if (currentPage.value === 0) {
      weekStart = new Date(customStart)
    } else {
      weekStart = getWeekStart(new Date(customStart.getTime() + (currentPage.value * 7 * 24 * 60 * 60 * 1000)))
    }
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart)
      currentDay.setDate(currentDay.getDate() + i)
      
      if (currentDay > customEnd) break
      
      const dayEnd = new Date(currentDay)
      dayEnd.setHours(23, 59, 59, 999)
      
      const taskInfo = getPeriodTaskInfo(currentDay, dayEnd)
      
      result.push({
        id: i + 1,
        name: `${currentDay.getMonth() + 1}/${currentDay.getDate()}`,
        phase: getPhaseText(taskInfo.status),
        progress: taskInfo.progress,
        status: taskInfo.status,
        statusText: getStatusText(taskInfo.status),
        totalTasks: taskInfo.totalTasks,
        completedTasks: taskInfo.completedTasks,
        tasks: taskInfo.tasks
      })
    }
    
    // 마지막 페이지에서 종료일이 아직 포함되지 않았다면 추가
    if (isLastPage && result.length > 0) {
      const lastItem = result[result.length - 1]
      const endDateLabel = `${customEnd.getMonth() + 1}/${customEnd.getDate()}`
      
      // 마지막 항목이 종료일이 아니면 종료일 추가
      if (lastItem.name !== endDateLabel) {
        const dayEnd = new Date(customEnd)
        dayEnd.setHours(23, 59, 59, 999)
        
        const taskInfo = getPeriodTaskInfo(customEnd, dayEnd)
        
        result.push({
          id: result.length + 1,
          name: endDateLabel,
          phase: getPhaseText(taskInfo.status),
          progress: taskInfo.progress,
          status: taskInfo.status,
          statusText: getStatusText(taskInfo.status),
          totalTasks: taskInfo.totalTasks,
          completedTasks: taskInfo.completedTasks,
          tasks: taskInfo.tasks
        })
      }
    }
    
    return result
  }
})

// 상태 텍스트 반환
const getStatusText = (status) => {
  const statusMap = {
    'completed': '완료',
    'in-progress': '진행중',
    'pending': '할일'
  }
  return statusMap[status] || '할일'
}

// 단계 텍스트 반환
const getPhaseText = (status) => {
  const phaseMap = {
    'completed': '완료됨',
    'in-progress': '진행중',
    'pending': '예정'
  }
  return phaseMap[status] || '예정'
}

// 업무 상태 색상 반환
const getTaskStatusColor = (status) => {
  const statusColorMap = {
    'COMPLETED': 'success',
    '완료': 'success',
    'DONE': 'success',
    'FINISHED': 'success',
    'IN_PROGRESS': 'warning',
    '진행중': 'warning',
    'PROGRESS': 'warning',
    'TODO': 'info',
    '할일': 'info',
    'PENDING': 'info'
  }
  return statusColorMap[status] || 'grey'
}

// 업무 상태 텍스트 반환
const getTaskStatusText = (status) => {
  const statusTextMap = {
    'COMPLETED': '완료',
    'DONE': '완료',
    'FINISHED': '완료',
    'IN_PROGRESS': '진행중',
    'PROGRESS': '진행중',
    'TODO': '할일',
    'PENDING': '할일'
  }
  return statusTextMap[status] || status || '할일'
}

// Methods
// 대시보드 데이터 초기화 함수
const clearDashboardData = () => {
  console.log('🧹 대시보드 데이터 초기화')
  allTasks.value = []
  inProgressTasks.value = []
  completedTasks.value = []
  teamMembers.value = []
  
  // 스토어 데이터도 초기화
  scheduleStore.clearStoreData()
  
  // 차트도 초기화
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

// 대시보드 통계 데이터 로드
const loadDashboardStats = async () => {
  // 컴포넌트가 언마운트되었으면 중단
  if (!isMounted.value) return
  
  // 프로젝트 ID 확인
  const projectId = currentProject.value?.id
  
  if (!projectId) {
    // 프로젝트 ID가 없어도 mock 데이터로 통계 표시
    const mockTasks = [
      { taskSeq: 1, taskTitle: '프로젝트 기획서 작성', taskStatus: 'COMPLETED', assigneeName: '김민수' },
      { taskSeq: 2, taskTitle: 'UI/UX 디자인', taskStatus: 'IN_PROGRESS', assigneeName: '이지은' },
      { taskSeq: 3, taskTitle: '백엔드 API 개발', taskStatus: 'IN_PROGRESS', assigneeName: '박준호' },
      { taskSeq: 4, taskTitle: '프론트엔드 개발', taskStatus: 'TODO', assigneeName: '최서연' },
      { taskSeq: 5, taskTitle: '테스트 케이스 작성', taskStatus: 'COMPLETED', assigneeName: '정우진' }
    ]
    
    if (!isMounted.value) return
    allTasks.value = mockTasks
    inProgressTasks.value = mockTasks.filter(task => task.taskStatus === 'IN_PROGRESS')
    completedTasks.value = mockTasks.filter(task => task.taskStatus === 'COMPLETED')
    
    // Mock 멤버 데이터
    teamMembers.value = [
      { memberSeq: 1, name: '김민수', role: 'Frontend Developer' },
      { memberSeq: 2, name: '이지은', role: 'UI/UX Designer' },
      { memberSeq: 3, name: '박준호', role: 'Backend Developer' },
      { memberSeq: 4, name: '최서연', role: 'Project Manager' },
      { memberSeq: 5, name: '정우진', role: 'QA Engineer' }
    ]
    return
  }
  
  try {
    if (!isMounted.value) return
    isLoadingStats.value = true
    
    console.log('📡 대시보드 통계 로딩 시작:', projectId)
    // 프로젝트의 모든 업무 조회
    const response = await getProjectTasks(projectId)
    console.log('📦 받은 응답:', response)
    
    // 컴포넌트가 언마운트되었으면 중단
    if (!isMounted.value) return
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 배열
    const tasks = response?.data || response
    
    // 안전하게 배열로 변환
    allTasks.value = Array.isArray(tasks) ? tasks : []
    console.log('✅ 받은 태스크 배열:', allTasks.value)
    
    // 중첩된 구조에서 실제 업무 데이터 추출
    let actualTasks = []
    allTasks.value.forEach(taskGroup => {
      if (taskGroup.taskResDtoList && Array.isArray(taskGroup.taskResDtoList)) {
        actualTasks = actualTasks.concat(taskGroup.taskResDtoList)
      } else if (taskGroup.taskStatus) {
        // 단일 업무인 경우
        actualTasks.push(taskGroup)
      }
    })
    
    if (!isMounted.value) return
    allTasks.value = actualTasks
    console.log('✅ 추출된 실제 태스크:', allTasks.value)
    
    // 진행중인 업무 필터링
    inProgressTasks.value = allTasks.value.filter(task => {
      const status = task.taskStatus || task.status || task.taskStatusDescription
      return status === 'IN_PROGRESS' || 
             status === '진행중' ||
             status === 'PROGRESS' ||
             status === 'DOING'
    })
    
    // 완료된 업무 필터링
    completedTasks.value = allTasks.value.filter(task => {
      const status = task.taskStatus || task.status || task.taskStatusDescription
      return status === 'COMPLETED' || 
             status === '완료' ||
             status === 'DONE' ||
             status === 'FINISHED'
    })
    
    // 팀 멤버 목록 조회
    try {
      console.log('📡 팀 멤버 조회 시작:', projectId)
      const memberResponse = await getWorkspaceMembers(projectId)
      console.log('📦 받은 멤버 응답:', memberResponse)
      
      if (!isMounted.value) return
      
      // 백엔드 응답 구조 처리: { success, data } 또는 직접 배열
      const members = memberResponse?.data || memberResponse
      teamMembers.value = Array.isArray(members) ? members : []
      console.log('✅ 팀 멤버 저장:', teamMembers.value)
    } catch (memberError) {
      console.warn('❌ 팀 멤버 조회 실패:', memberError)
      if (!isMounted.value) return
      teamMembers.value = []
    }
    
  } catch (error) {
    console.error('대시보드 통계 로드 실패:', error)
    
    // 컴포넌트가 언마운트되었으면 중단
    if (!isMounted.value) return
    
    // API 실패 시 mock 데이터 사용
    const mockTasks = [
      { taskSeq: 1, taskTitle: '프로젝트 기획서 작성', taskStatus: 'COMPLETED', assigneeName: '김민수' },
      { taskSeq: 2, taskTitle: 'UI/UX 디자인', taskStatus: 'IN_PROGRESS', assigneeName: '이지은' },
      { taskSeq: 3, taskTitle: '백엔드 API 개발', taskStatus: 'IN_PROGRESS', assigneeName: '박준호' },
      { taskSeq: 4, taskTitle: '프론트엔드 개발', taskStatus: 'TODO', assigneeName: '최서연' },
      { taskSeq: 5, taskTitle: '테스트 케이스 작성', taskStatus: 'COMPLETED', assigneeName: '정우진' }
    ]
    
    allTasks.value = mockTasks
    inProgressTasks.value = mockTasks.filter(task => task.taskStatus === 'IN_PROGRESS')
    completedTasks.value = mockTasks.filter(task => task.taskStatus === 'COMPLETED')
    
    // Mock 멤버 데이터
    teamMembers.value = [
      { memberSeq: 1, name: '김민수', role: 'Frontend Developer' },
      { memberSeq: 2, name: '이지은', role: 'UI/UX Designer' },
      { memberSeq: 3, name: '박준호', role: 'Backend Developer' },
      { memberSeq: 4, name: '최서연', role: 'Project Manager' },
      { memberSeq: 5, name: '정우진', role: 'QA Engineer' }
    ]
  } finally {
    if (isMounted.value) {
      isLoadingStats.value = false
    }
  }
}

// 멤버 사이드바 토글
const toggleMemberSidebar = () => {
  emit('toggle-member-sidebar')
}

// 페이지네이션 - 이전 페이지
const previousPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
    updateChart()
  }
}

// 페이지네이션 - 다음 페이지
const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
    updateChart()
  }
}

// 전체 페이지 수 계산
const calculateTotalPages = () => {
  const { months } = calculateProjectDates()
  
  if (timeFilter.value === 'month') {
    if (months <= 3) {
      totalPages.value = 1
    } else {
      totalPages.value = Math.ceil(months / 4)
    }
  } else if (timeFilter.value === 'week') {
    const weeks = getWeeksInRange(projectStartDate.value, projectEndDate.value)
    if (weeks <= 4) {
      totalPages.value = 1
    } else {
      totalPages.value = Math.ceil(weeks / 4)
    }
  } else if (timeFilter.value === 'day') {
    const totalDays = Math.floor((projectEndDate.value - projectStartDate.value) / (24 * 60 * 60 * 1000))
    totalPages.value = Math.ceil(totalDays / 7)
  } else if (timeFilter.value === 'custom') {
    // 사용자 정의 기간
    const customStart = new Date(customStartDate.value)
    const customEnd = new Date(customEndDate.value)
    const totalDays = Math.floor((customEnd - customStart) / (24 * 60 * 60 * 1000))
    
    if (totalDays < 7) {
      totalPages.value = 1
    } else {
      totalPages.value = Math.ceil(totalDays / 7)
    }
  } else {
    totalPages.value = 1
  }
}

// 멤버 이름 가져오기
const getMemberName = (memberSeq) => {
  if (!memberSeq) return '미지정'
  
  const member = memberStore.members?.find(m => m.memberSeq === memberSeq)
  return member?.name || '미지정'
}

// 프로젝트 기간 계산 (우선순위: 워크스페이스 start/end → 태스크 범위)
const calculateProjectDates = () => {
  // 1) 워크스페이스 정보 우선
  const wsInfo = workspaceStore.currentWorkspaceInfo
  const wsStart = wsInfo?.startDate || wsInfo?.projectStartDate
  const wsEnd = wsInfo?.endDate || wsInfo?.projectEndDate
  if (wsStart && wsEnd) {
    const startDate = new Date(wsStart)
    const endDate = new Date(wsEnd)
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1
      projectStartDate.value = startDate
      projectEndDate.value = endDate
      if (customStartDate.value === '2025-09-01' && customEndDate.value === '2025-12-31') {
        customStartDate.value = startDate.toISOString().split('T')[0]
        customEndDate.value = endDate.toISOString().split('T')[0]
      }
      return { startDate, endDate, months }
    }
  }

  // 2) 태스크 데이터로 계산 (fallback)
  if (!allTasks.value || allTasks.value.length === 0) {
    return { startDate: null, endDate: null, months: 0 }
  }

  const dates = allTasks.value
    .filter(task => task.startDate || task.endDate)
    .flatMap(task => [task.startDate, task.endDate].filter(Boolean))
    .map(date => new Date(date))
    .filter(date => !isNaN(date.getTime()))

  if (dates.length === 0) {
    return { startDate: null, endDate: null, months: 0 }
  }

  const startDate = new Date(Math.min(...dates))
  const endDate = new Date(Math.max(...dates))
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1
  projectStartDate.value = startDate
  projectEndDate.value = endDate
  if (customStartDate.value === '2025-09-01' && customEndDate.value === '2025-12-31') {
    customStartDate.value = startDate.toISOString().split('T')[0]
    customEndDate.value = endDate.toISOString().split('T')[0]
  }
  return { startDate, endDate, months }
}

// 주의 시작일(일요일) 찾기
const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

// 주의 종료일(토요일) 찾기
const getWeekEnd = (date) => {
  const weekStart = getWeekStart(date)
  return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
}

// 날짜 범위의 주 수 계산
const getWeeksInRange = (startDate, endDate) => {
  const weekStart = getWeekStart(startDate)
  const weekEnd = getWeekEnd(endDate)
  const diffTime = weekEnd.getTime() - weekStart.getTime()
  return Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000))
}

// 특정 날짜까지의 계획 진행률 계산 (마감일 기준)
const getPlannedProgressByDate = (targetDate) => {
  if (!allTasks.value || allTasks.value.length === 0) return 0
  
  // 해당 날짜 이전에 마감인 업무 개수
  const tasksBeforeDate = allTasks.value.filter(task => {
    if (!task.endDate) return false
    return new Date(task.endDate) <= targetDate
  })
  
  const progress = Math.round((tasksBeforeDate.length / allTasks.value.length) * 100)
  return Math.max(0, progress)
}

// 특정 기간의 업무 정보 계산
const getPeriodTaskInfo = (startDate, endDate) => {
  if (!allTasks.value || allTasks.value.length === 0) {
    return { totalTasks: 0, completedTasks: 0, progress: 0, status: 'pending', tasks: [] }
  }
  
  // 해당 기간에 마감인 업무들
  const periodTasks = allTasks.value.filter(task => {
    if (!task.endDate) return false
    const taskEnd = new Date(task.endDate)
    // 날짜만 비교 (시간 부분 제거)
    const taskEndDate = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate())
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    
    return taskEndDate >= startDateOnly && taskEndDate <= endDateOnly
  })
  
  const totalTasks = periodTasks.length
  const completedTasks = periodTasks.filter(task => {
    const status = task.taskStatus || task.status
    return status === 'COMPLETED' || status === '완료' || status === 'DONE' || status === 'FINISHED'
  }).length
  
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  let status = 'pending'
  if (completedTasks === totalTasks && totalTasks > 0) {
    status = 'completed'
  } else if (completedTasks > 0) {
    status = 'in-progress'
  }
  
  return { totalTasks, completedTasks, progress, status, tasks: periodTasks }
}

// 특정 날짜까지의 실제 진행률 계산 (완료된 업무 기준)
const getActualProgressByDate = (targetDate) => {
  if (!allTasks.value || allTasks.value.length === 0) return 0
  
  const now = new Date()
  const target = new Date(targetDate)
  
  // 미래 날짜인 경우: 현재까지 완료된 업무 비율로 고정
  if (target > now) {
    const completedTasks = allTasks.value.filter(task => {
      const status = task.taskStatus || task.status
      return status === 'COMPLETED' || status === '완료' || status === 'DONE' || status === 'FINISHED'
    })
    const progress = Math.round((completedTasks.length / allTasks.value.length) * 100)
    return Math.max(0, progress)
  }
  
  // 과거 날짜인 경우: 해당 날짜까지 마감이면서 완료된 업무의 비율
  const tasksUpToDate = allTasks.value.filter(task => {
    if (!task.endDate) return false
    return new Date(task.endDate) <= target
  })
  
  if (tasksUpToDate.length === 0) return 0
  
  const completedTasksUpToDate = tasksUpToDate.filter(task => {
    const status = task.taskStatus || task.status
    return status === 'COMPLETED' || status === '완료' || status === 'DONE' || status === 'FINISHED'
  })
  
  const progress = Math.round((completedTasksUpToDate.length / allTasks.value.length) * 100)
  return Math.max(0, progress)
}

// 월별 차트 데이터 생성
const getMonthChartData = (startDate, endDate, months) => {
  const labels = []
  const actualData = []
  const plannedData = []
  
  // 3개월 이하면 3개월만 표시
  const displayMonths = months <= 3 ? 3 : 4
  const startMonth = currentPage.value * 4
  
  for (let i = 0; i < displayMonths; i++) {
    const monthIndex = startMonth + i
    if (monthIndex >= months) break
    
    const currentDate = new Date(startDate)
    currentDate.setMonth(currentDate.getMonth() + monthIndex)
    
    // 월 마지막 날
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    labels.push(`${currentDate.getMonth() + 1}월`)
    actualData.push(getActualProgressByDate(lastDay))
    plannedData.push(getPlannedProgressByDate(lastDay))
  }
  
  return {
    labels,
    datasets: [
      {
        label: '계획된 진행률',
        data: plannedData,
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
        data: actualData,
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

// 주별 차트 데이터 생성
const getWeekChartData = (startDate, endDate) => {
  const labels = []
  const actualData = []
  const plannedData = []
  
  const totalWeeks = getWeeksInRange(startDate, endDate)
  const displayWeeks = totalWeeks <= 4 ? 3 : 4
  const startWeek = currentPage.value * 4
  
  let currentWeekStart = getWeekStart(startDate)
  
  for (let i = 0; i < displayWeeks; i++) {
    const weekIndex = startWeek + i
    if (weekIndex >= totalWeeks) break
    
    const weekDate = new Date(currentWeekStart)
    weekDate.setDate(weekDate.getDate() + (weekIndex * 7))
    const weekEnd = getWeekEnd(weekDate)
    
    labels.push(`${weekDate.getMonth() + 1}/${weekDate.getDate()}`)
    actualData.push(getActualProgressByDate(weekEnd))
    plannedData.push(getPlannedProgressByDate(weekEnd))
  }
  
  return {
    labels,
    datasets: [
      {
        label: '계획된 진행률',
        data: plannedData,
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
        data: actualData,
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

// 일별 차트 데이터 생성
const getDayChartData = (startDate, endDate) => {
  const labels = []
  const actualData = []
  const plannedData = []
  
  const totalDays = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1
  const totalWeeks = Math.ceil(totalDays / 7)
  const isLastPage = currentPage.value === totalWeeks - 1
  
  // 첫 번째 페이지는 시작일부터, 그 외에는 주 단위로 계산
  let weekStart
  if (currentPage.value === 0) {
    weekStart = new Date(startDate)
  } else {
    weekStart = getWeekStart(new Date(startDate.getTime() + (currentPage.value * 7 * 24 * 60 * 60 * 1000)))
  }
  
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart)
    currentDay.setDate(currentDay.getDate() + i)
    
    // 종료일을 넘어가면 중단
    if (currentDay > endDate) {
      break
    }
    
    labels.push(`${currentDay.getMonth() + 1}/${currentDay.getDate()}`)
    actualData.push(getActualProgressByDate(currentDay))
    plannedData.push(getPlannedProgressByDate(currentDay))
  }
  
  // 마지막 페이지에서 종료일이 아직 포함되지 않았다면 추가
  if (isLastPage && labels.length > 0) {
    const lastLabel = labels[labels.length - 1]
    const endDateLabel = `${endDate.getMonth() + 1}/${endDate.getDate()}`
    
    // 마지막 라벨이 종료일이 아니면 종료일 추가
    if (lastLabel !== endDateLabel) {
      labels.push(endDateLabel)
      actualData.push(getActualProgressByDate(endDate))
      plannedData.push(getPlannedProgressByDate(endDate))
    }
  }
  
  return {
    labels,
    datasets: [
      {
        label: '계획된 진행률',
        data: plannedData,
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
        data: actualData,
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
}

const formatProjectPeriod = () => {
  const { startDate, endDate, months } = calculateProjectDates()
  
  if (!startDate || !endDate) {
    return '프로젝트 기간 정보 없음'
  }
  
  return `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${startDate.getDate()}일 ~ ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월 ${endDate.getDate()}일 (${months}개월)`
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
    high: '#ef4444',      // 빨간색 (5일 미만)
    medium: '#f4b64c',    // 노란색 (10일 이상)
    low: '#4dc9a2'        // 초록색 (14일 이상)
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
    'COMPLETED': 'success',
    'IN_PROGRESS': 'warning',
    'TODO': 'info',
    'completed': 'success',
    'in-progress': 'warning',
    'pending': 'info'
  }
  return colors[status] || 'grey'
}

const getMilestoneStatusText = (status) => {
  const texts = {
    'COMPLETED': '완료',
    'IN_PROGRESS': '진행중',
    'TODO': '할일',
    'completed': '완료',
    'in-progress': '진행중',
    'pending': '할일'
  }
  return texts[status] || status
}

const formatRemainingTime = (dateString) => {
  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0) // 날짜의 시간도 0으로 설정
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
      clip: false,
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
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              return `${label}: ${value}%`
            }
          }
        }
      },
      elements: {
        point: {
          hoverRadius: 8,
          radius: 6
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grace: '5%',
          ticks: {
            callback: (value) => value + '%',
            font: {
              size: 11
            },
            values: [0, 20, 40, 60, 80, 100]
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
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 10,
          left: 10
        }
      }
    }
  })
}

const getChartData = () => {
  const { startDate, endDate, months } = calculateProjectDates()
  
  if (!startDate || !endDate) {
    // 데이터가 없을 때 기본값
    return {
      labels: [],
      datasets: []
    }
  }

  if (timeFilter.value === 'month') {
    return getMonthChartData(startDate, endDate, months)
  } else if (timeFilter.value === 'week') {
    return getWeekChartData(startDate, endDate)
  } else if (timeFilter.value === 'day') {
    return getDayChartData(startDate, endDate)
  } else {
    // custom - 사용자 정의 기간
    const customStart = new Date(customStartDate.value)
    const customEnd = new Date(customEndDate.value)
    
    return getDayChartData(customStart, customEnd)
  }
}

const updateChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }
  createChart()
}

// 컴포넌트 마운트 상태 추적
const isMounted = ref(false)

// 워크스페이스 변경 감지하여 데이터 다시 로드
watch(() => workspaceStore.currentWorkspace, async (newWorkspace, oldWorkspace) => {
  if (isMounted.value && newWorkspace && newWorkspace !== oldWorkspace && oldWorkspace) {
    console.log('워크스페이스 변경 감지:', oldWorkspace, '→', newWorkspace)
    
    // 1. 먼저 이전 데이터 초기화
    clearDashboardData()
    
    // 2. 새로운 데이터 로드
    try {
      await loadDashboardStats()
      
      // 3. 차트 다시 생성
      if (progressChart.value) {
        await createChart()
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    }
  }
}, { immediate: false })

// 워크스페이스 멤버 변경 감지 (초대/강제탈퇴 시 대시보드 최신화)
watch(() => memberStore.members, async (newMembers, oldMembers) => {
  // isMounted이고 멤버 배열이 존재하며, 이전 값도 존재하는 경우만 처리 (초기 로드 제외)
  if (!isMounted.value || !newMembers || !oldMembers) return
  
  // 멤버 수가 변경된 경우에만 업데이트
  if (newMembers.length !== oldMembers.length) {
    console.log('🔄 워크스페이스 멤버 변경 감지:', oldMembers.length, '→', newMembers.length)
    
    // 멤버 목록만 다시 로드
    try {
      const projectId = currentProject.value?.id
      if (projectId) {
        const memberResponse = await getWorkspaceMembers(projectId)
        const members = memberResponse?.data || memberResponse
        teamMembers.value = Array.isArray(members) ? members : []
        console.log('✅ 대시보드 팀 멤버 최신화 완료:', teamMembers.value.length, '명')
      }
    } catch (error) {
      console.error('❌ 멤버 목록 최신화 실패:', error)
    }
  }
}, { deep: true })

// Lifecycle
onMounted(async () => {
  isMounted.value = true
  await createChart()
  await loadDashboardStats()
})

onUnmounted(() => {
  isMounted.value = false
  if (chartInstance) {
    chartInstance.destroy()
  }
})

// Watch
watch(timeFilter, () => {
  currentPage.value = 0 // 필터 변경 시 첫 페이지로
  calculateTotalPages()
  updateChart()
})

watch([customStartDate, customEndDate], () => {
  if (timeFilter.value === 'custom') {
    currentPage.value = 0 // 날짜 변경 시 첫 페이지로
    calculateTotalPages()
    updateChart()
  }
})

// 통계 데이터 변화 감지 - 차트 업데이트
watch([allTasks, inProgressTasks, completedTasks, teamMembers], () => {
  // 데이터가 변경되면 차트 업데이트
  if (allTasks.value.length > 0) {
    calculateTotalPages()
    updateChart()
  }
}, { deep: true })

// 업무 상세 모달 관련
const showTaskDetailModal = ref(false)
const selectedTask = ref({})
const isLoadingTask = ref(false)

// 업무 항목 클릭 핸들러
const handleTaskClick = async (taskSeq) => {
  console.log('🖱️ 업무 클릭:', taskSeq)
  
  if (!taskSeq) {
    console.warn('⚠️ taskSeq가 없습니다:', taskSeq)
    return
  }
  
  try {
    isLoadingTask.value = true
    
    // API로 업무 상세 정보 가져오기
    console.log('📡 API 호출 시작: getTaskDetail(' + taskSeq + ')')
    const response = await getTaskDetail(taskSeq)
    console.log('📦 받은 응답:', response)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 객체
    const taskDetail = response?.data || response
    
    if (taskDetail) {
      selectedTask.value = taskDetail
      console.log('✅ selectedTask에 저장됨:', selectedTask.value)
      showTaskDetailModal.value = true
      console.log('✅ 모달 열기:', showTaskDetailModal.value)
    } else {
      console.error('❌ 업무 정보를 가져올 수 없습니다.')
      alert('업무 정보가 없습니다.')
    }
  } catch (error) {
    console.error('❌ 업무 상세 조회 실패:', error)
    alert('업무 정보를 불러오는데 실패했습니다: ' + error.message)
  } finally {
    isLoadingTask.value = false
  }
}

// 모달이 닫힐 때 데이터 새로고침
watch(showTaskDetailModal, async (newVal, oldVal) => {
  // 모달이 열림 → 닫힘 상태로 변경될 때
  if (oldVal === true && newVal === false) {
    // 데이터 새로고침
    await loadStats()
    selectedTask.value = {}
  }
})
</script>

<style scoped>
.team-dashboard {
  padding: 24px;
  background-color: rgb(var(--v-theme-background));
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
  color: rgb(var(--v-theme-on-surface));
}

.dashboard-header p {
  font-size: 16px;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

/* 2. 통계 카드 그리드 */
.stats-grid {
  margin-bottom: 24px;
  position: relative;
  z-index: 100;
}

.stat-col {
  display: flex;
  flex-direction: column;
}

.stat-card-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card {
  position: relative;
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: visible;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card :deep(.v-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card-with-dropdown {
  overflow: visible !important;
}

.stat-card-with-dropdown :deep(.v-card) {
  overflow: visible !important;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card .v-card-text {
  padding: 20px;
  display: flex;
  align-items: center;
  min-height: 104px;
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
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1;
  margin-bottom: 4px;
}

.stat-description {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* 3. 프로젝트 진행 흐름 카드 */
.progress-flow-card {
  border-radius: 12px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
  overflow: visible;
  background: rgb(var(--v-theme-surface));
}

.progress-flow-card .v-card-text {
  overflow: visible;
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
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.flow-period {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.85);
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
  color: rgba(var(--v-theme-on-surface), 0.7);
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
  margin-bottom: 16px;
  padding: 0 8px;
}

.chart-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px 0;
}

.page-info {
  font-size: 14px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
  min-width: 60px;
  text-align: center;
}

.period-progress-section {
  position: relative;
  overflow: visible;
}

.period-progress-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 16px;
}

.period-cards {
  margin-top: 16px;
  position: relative;
  z-index: 200;
}

.period-card-wrapper {
  position: relative;
  width: 100%;
}

.period-card {
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
}

.period-card .v-card-text {
  display: flex;
  flex-direction: column;
  min-height: 160px;
}

.period-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.period-card-with-dropdown {
  overflow: visible !important;
}

.period-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.period-task-dropdown {
  position: absolute;
  top: calc(100% - 8px);
  left: 0;
  right: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 20000;
  max-height: 350px;
  overflow-y: auto;
  padding-top: 8px;
  animation: fadeInDown 0.2s ease-out;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px 8px 0 0;
  margin-top: -8px;
}

.dropdown-header strong {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.task-count {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  background: rgb(var(--v-theme-surface));
  padding: 2px 8px;
  border-radius: 12px;
}

.task-list {
  padding: 8px;
}

.period-task-item {
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: background-color 0.2s;
}

.period-task-item:last-child {
  border-bottom: none;
}

.period-task-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.03);
}

.period-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 4px;
}

.period-phase {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
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
  color: rgb(var(--v-theme-on-surface));
}

.period-tasks {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
  display: flex;
  justify-content: space-between;
}

.completed-tasks {
  color: #22c55e;
}

.no-tasks-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
}

.no-tasks-text {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-weight: 500;
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
  color: rgb(var(--v-theme-on-surface));
  padding: 20px 24px;
}

.deadlines-section h5,
.milestones-section h5 {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 12px;
}

.scrollable-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.scrollable-list::-webkit-scrollbar {
  width: 6px;
}

.scrollable-list::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.scrollable-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.scrollable-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.deadline-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.deadline-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.06);
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

.deadline-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.deadline-title {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  color: rgb(var(--v-theme-on-surface));
}

.deadline-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
  margin-bottom: 6px;
}

.remaining-time {
  color: #ef4444;
  font-weight: 500;
}

.board-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.milestone-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  margin-bottom: 12px;
  transition: background-color 0.2s ease;
}

.milestone-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.06);
}

.milestone-marker {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.milestone-content {
  flex: 1;
}

.milestone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.milestone-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.milestone-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  flex: 1;
}

.milestone-description {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.85);
  margin-bottom: 12px;
  line-height: 1.5;
}

.milestone-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.milestone-assignee {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.milestone-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.assignee-filter {
  max-width: 150px;
}

/* 담당자 필터 - 버튼/메뉴 */
.assignee-filter-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.assignee-filter-btn:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.3);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.assignee-filter-btn .label { font-weight: 600; font-size: 14px; }
.assignee-filter-btn .chevron { color: rgba(var(--v-theme-on-surface), 0.7); }

.assignee-filter-menu { border-radius: 12px !important; overflow: hidden; }
.assignee-filter-menu .menu-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12); font-weight: 600; color: rgb(var(--v-theme-on-surface));
}

.assignee-filter-menu .menu-search { padding: 10px 12px 0 12px; }
/* 기본 텍스트필드 스타일 사용: 커스텀 제거 */

.assignee-filter-menu .menu-list { max-height: 320px; overflow-y: auto; }
.assignee-filter-menu .menu-empty { display:flex; align-items:center; justify-content:center; gap:8px; color:rgba(var(--v-theme-on-surface), 0.6); padding: 16px 0; }
.assignee-filter-menu .menu-actions { display:flex; align-items:center; gap:8px; padding:8px 12px 10px 12px; border-top:1px solid rgba(var(--v-theme-on-surface), 0.12); }

.assignee-tasks {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 4px;
}

.assignee-tasks::-webkit-scrollbar {
  width: 6px;
}

.assignee-tasks::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.assignee-tasks::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.assignee-tasks::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.assignee-task-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  transition: background-color 0.2s ease;
}

.assignee-task-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.06);
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

.task-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  flex: 1;
}

.task-period {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
  margin-bottom: 6px;
}

.task-assignee-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.85);
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
  color: rgb(var(--v-theme-on-surface));
  min-width: 40px;
  text-align: right;
}

/* 드롭다운 스타일 */
.task-dropdown {
  position: absolute;
  top: calc(100% - 8px);
  left: 0;
  right: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  max-height: 300px;
  overflow-y: auto;
  padding-top: 8px;
  animation: fadeInDown 0.2s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-item {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.task-item:last-child {
  border-bottom: none;
}

.task-item-enhanced {
  padding: 12px 16px !important;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.task-item-enhanced:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.task-item-enhanced:last-child {
  border-bottom: none;
}

.task-item-content {
  width: 100%;
}

.task-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.task-assignee,
.task-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-state {
  padding: 24px 16px !important;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-text {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 13px;
  display: block;
}

/* 클릭 가능한 카드 */
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
