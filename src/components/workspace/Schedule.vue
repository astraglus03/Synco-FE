<template>
  <div class="project-schedule">
    <!-- 헤더 -->
    <div class="schedule-header">
      <h1>팀 일정</h1>
      <div class="header-actions">
        <div class="header-icons">
          <v-icon 
            :size="20" 
            :color="currentView === 'board' ? 'primary' : 'grey'"
            @click="currentView = 'board'"
            style="cursor: pointer;"
          >mdi-view-grid</v-icon>
          <v-icon 
            :size="20" 
            :color="currentView === 'timeline' ? 'primary' : 'grey'"
            @click="currentView = 'timeline'"
            style="cursor: pointer;"
          >mdi-timeline</v-icon>
          <v-icon 
            :size="20" 
            :color="currentView === 'calendar' ? 'primary' : 'grey'"
            @click="currentView = 'calendar'"
            style="cursor: pointer;"
          >mdi-calendar</v-icon>
        </div>
        <v-btn 
          v-if="canCreateTask"
          color="primary" 
          prepend-icon="mdi-plus" 
          @click="openTaskModal"
        >
          업무 추가
        </v-btn>
      </div>
    </div>

    <!-- 검색 및 필터 -->
    <div class="search-section">
      <div class="search-bar">
        <v-icon size="20" color="grey">mdi-magnify</v-icon>
        <input placeholder="일정 검색..." class="search-input" />
      </div>
      <div class="filter-section">
        <!-- 보드 뷰: 프로필 아바타 -->
        <div v-if="currentView === 'board'" class="member-avatars">
          <div 
            v-for="member in workspaceMembers" 
            :key="member.memberSeq"
            class="avatar"
            :class="{ 'selected': selectedFilter === member.memberSeq }"
            :style="{ backgroundColor: member.profileImageUrl ? 'transparent' : getMemberColor(member.memberSeq) }"
            :title="member.name"
            :data-member-name="member.name"
            @click="toggleFilter(member.memberSeq)"
          >
            <img 
              v-if="member.profileImageUrl" 
              :src="member.profileImageUrl" 
              :alt="member.name"
              class="profile-image"
            />
            <span v-else>{{ getMemberInitial(member.name) }}</span>
          </div>
        </div>
        <!-- 타임라인/캘린더 뷰: 필터 버튼 -->
        <v-btn
          v-else
          :variant="hasActiveFilters ? 'flat' : 'outlined'"
          :color="hasActiveFilters ? 'primary' : undefined"
          size="small"
          @click="showFilterModal = !showFilterModal"
          class="multi-filter-btn"
          :class="{ 'active': showFilterModal, 'filtered': hasActiveFilters }"
        >
          <v-icon>mdi-tune</v-icon>
          <span class="filter-text">필터</span>
          <v-chip
            v-if="hasActiveFilters"
            size="x-small"
            color="white"
            class="filter-count-chip"
          >
            {{ activeFilterCount }}
          </v-chip>
          <v-icon v-if="showFilterModal" size="16">mdi-chevron-up</v-icon>
          <v-icon v-else size="16">mdi-chevron-down</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- 뷰 전환 -->
    <!-- 보드 뷰 -->
    <div v-if="currentView === 'board'">
    <!-- 칸반보드 -->
    <div class="kanban-board">
      <!-- 할 일 컬럼 -->
      <div 
        class="kanban-column"
        :class="{ 'drag-over': dragOverColumn === 'TODO' }"
        data-status="TODO"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, 'TODO')"
      >
        <div class="column-header todo-header">
          <div class="column-title">
            <h3>할 일</h3>
            <v-icon size="16" color="dark-grey">mdi-view-grid</v-icon>
            <div class="task-count">{{ kanbanTasks.TODO.length }}</div>
          </div>
        </div>
        <div class="column-content">
          <!-- 로딩 상태 -->
          <div v-if="isLoading" class="loading-state">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p>태스크를 불러오는 중...</p>
          </div>
          
          <!-- 에러 상태 -->
          <div v-else-if="error" class="error-state">
            <v-icon color="error" size="48">mdi-alert-circle</v-icon>
            <p>{{ error }}</p>
          </div>
          
          <!-- API 데이터 표시 -->
          <div v-else>
            <div 
              v-for="task in kanbanTasks.TODO" 
              :key="task.id" 
              class="task-card"
              draggable="true"
              @dragstart="onDragStart($event, task)"
              @dragend="onDragEnd"
              @dblclick="openTaskDetail(task)"
            >
              <div class="task-header">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-actions">
                  <div class="task-assignee">{{ task.assignee }}</div>
                  <v-menu v-if="canEditTask(task)" location="bottom start">
                    <template v-slot:activator="{ props }">
                      <v-btn 
                        icon="mdi-dots-vertical" 
                        size="x-small" 
                        variant="text"
                        class="task-menu-btn"
                        v-bind="props"
                        @click.stop
                      />
                    </template>
                    <v-list density="compact" class="menu-list">
                      <v-list-item @click="editTask(task)" class="menu-item">
                        <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="canCreateTask" @click="deleteTask(task)" class="menu-item text-red">
                        <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </div>
              <div class="task-date">{{ task.startDate }} - {{ task.endDate }}</div>
              <div class="task-description">{{ task.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 진행중 컬럼 -->
      <div 
        class="kanban-column"
        :class="{ 'drag-over': dragOverColumn === 'IN_PROGRESS' }"
        data-status="IN_PROGRESS"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, 'IN_PROGRESS')"
      >
        <div class="column-header progress-header">
          <div class="column-title">
            <h3>진행중</h3>
            <v-icon size="16" color="dark-grey">mdi-view-grid</v-icon>
            <div class="task-count">{{ kanbanTasks.IN_PROGRESS.length }}</div>
          </div>
        </div>
        <div class="column-content">
          <div 
            v-for="task in kanbanTasks.IN_PROGRESS" 
            :key="task.id" 
            class="task-card"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @dblclick="openTaskDetail(task)"
          >
            <div class="task-header">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-actions">
                <div class="task-assignee">{{ task.assignee }}</div>
                <v-menu v-if="canEditTask(task)" location="bottom start">
                  <template v-slot:activator="{ props }">
                    <v-btn 
                      icon="mdi-dots-vertical" 
                      size="x-small" 
                      variant="text"
                      class="task-menu-btn"
                      v-bind="props"
                      @click.stop
                    />
                  </template>
                  <v-list density="compact" class="menu-list">
                    <v-list-item @click="editTask(task)" class="menu-item">
                      <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="canCreateTask" @click="deleteTask(task)" class="menu-item text-red">
                      <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
            <div class="task-date">{{ task.startDate }} - {{ task.endDate }}</div>
            <div class="task-description">{{ task.description }}</div>
          </div>
        </div>
      </div>

      <!-- 완료 컬럼 -->
      <div 
        class="kanban-column"
        :class="{ 'drag-over': dragOverColumn === 'COMPLETED' }"
        data-status="COMPLETED"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, 'COMPLETED')"
      >
        <div class="column-header completed-header">
          <div class="column-title">
            <h3>완료</h3>
            <v-icon size="16" color="dark-grey">mdi-view-grid</v-icon>
            <div class="task-count">{{ kanbanTasks.COMPLETED.length }}</div>
          </div>
        </div>
        <div class="column-content">
          <div 
            v-for="task in kanbanTasks.COMPLETED" 
            :key="task.id" 
            class="task-card"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @dblclick="openTaskDetail(task)"
          >
            <div class="task-header">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-actions">
                <div class="task-assignee">{{ task.assignee }}</div>
                <v-menu v-if="canEditTask(task)" location="bottom start">
                  <template v-slot:activator="{ props }">
                    <v-btn 
                      icon="mdi-dots-vertical" 
                      size="x-small" 
                      variant="text"
                      class="task-menu-btn"
                      v-bind="props"
                      @click.stop
                    />
                  </template>
                  <v-list density="compact" class="menu-list">
                    <v-list-item @click="editTask(task)" class="menu-item">
                      <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="canCreateTask" @click="deleteTask(task)" class="menu-item text-red">
                      <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
            <div class="task-date">{{ task.startDate }} - {{ task.endDate }}</div>
            <div class="task-description">{{ task.description }}</div>
          </div>
        </div>
      </div>
    </div>
    </div>
    <!-- 보드 뷰 끝 -->

    <!-- 타임라인 뷰 -->
    <div v-else-if="currentView === 'timeline'">
      <ScheduleTimeline 
        :kanban-tasks="filteredKanbanTasks"
        :workspace-members="workspaceMembers"
        @open-task-detail="openTaskDetail"
      />
    </div>

    <!-- 캘린더 뷰 -->
    <div v-else-if="currentView === 'calendar'">
      <ScheduleCalendar 
        :kanban-tasks="kanbanTasks"
        :workspace-members="workspaceMembers"
        @open-task-detail="openTaskDetail"
      />
    </div>

    <!-- Task 생성/수정 모달 -->
    <TaskCreateModal
      v-model="isTaskModalOpen"
      :project-id="currentProjectId"
      :is-edit-mode="isEditMode"
      :edit-task-data="editTaskData"
      :edit-mode-limited="isEditModeLimited"
      @task-created="onTaskCreated"
      @task-updated="onTaskUpdated"
    />

    <!-- Task 상세 모달 -->
    <TaskDetailModal
      v-model="isTaskDetailModalOpen"
      :task-data="selectedTaskData"
    />

    <!-- 스낵바 -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="4000"
      top
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn
          color="white"
          variant="text"
          @click="snackbar.show = false"
        >
          닫기
        </v-btn>
      </template>
    </v-snackbar>

    <!-- 필터 모달 -->
    <div v-if="showFilterModal" class="filter-modal-overlay" @click.self="showFilterModal = false">
      <div class="multi-filter-dropdown">
        <div class="filter-dropdown-content">
          <!-- 필터 헤더 -->
          <div class="filter-header">
            <div class="header-left">
              <v-icon color="primary" size="20">mdi-tune</v-icon>
              <h3>필터 옵션</h3>
            </div>
            <v-btn
              icon
              size="small"
              variant="text"
              @click="showFilterModal = false"
              class="close-filter-btn"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>

          <!-- 선택된 필터 표시 -->
          <div v-if="hasActiveFilters" class="active-filters">
            <div class="active-filters-header">
              <v-icon size="16">mdi-check-circle</v-icon>
              <span>선택된 필터</span>
            </div>
            <div class="active-filter-tags">
              <v-chip
                v-for="status in selectedFilters.statuses"
                :key="`status-${status}`"
                size="small"
                color="primary"
                closable
                @click:close="removeStatusFilter(status)"
                class="active-filter-chip"
              >
                <v-icon start size="14">mdi-folder</v-icon>
                {{ getStatusLabel(status) }}
              </v-chip>
              <v-chip
                v-for="memberSeq in selectedFilters.assignees"
                :key="`member-${memberSeq}`"
                size="small"
                color="info"
                closable
                @click:close="removeAssigneeFilter(memberSeq)"
                class="active-filter-chip"
              >
                <v-icon start size="14">mdi-account</v-icon>
                {{ getMemberName(memberSeq) }}
              </v-chip>
            </div>
          </div>

          <!-- 필터 옵션 -->
          <div class="filter-options-simple">
            <!-- 보드 필터 -->
            <div class="filter-section-simple">
              <div class="filter-section-header-simple">
                <v-icon color="primary" size="18">mdi-folder</v-icon>
                <span class="section-title-simple">보드</span>
              </div>
              <div class="filter-options-list">
                <div
                  v-for="status in statusOptions"
                  :key="status.value"
                  class="filter-option-simple"
                  :class="{ 'selected': selectedFilters.statuses.includes(status.value) }"
                  @click="toggleFilterStatus(status.value)"
                >
                  <div class="option-color-simple" :style="{ backgroundColor: status.color }"></div>
                  <span class="option-label-simple">{{ status.label }}</span>
                </div>
              </div>
            </div>

            <!-- 담당자 필터 -->
            <div class="filter-section-simple">
              <div class="filter-section-header-simple">
                <v-icon color="info" size="18">mdi-account-group</v-icon>
                <span class="section-title-simple">담당자</span>
              </div>
              <div class="filter-options-list">
                <div
                  v-for="member in workspaceMembers"
                  :key="member.memberSeq"
                  class="filter-option-simple"
                  :class="{ 'selected': selectedFilters.assignees.includes(member.memberSeq) }"
                  @click="toggleFilterAssignee(member.memberSeq)"
                >
                  <div class="option-avatar-simple" :style="{ backgroundColor: member.profileImageUrl ? 'transparent' : getMemberColor(member.memberSeq) }">
                    <img 
                      v-if="member.profileImageUrl" 
                      :src="member.profileImageUrl" 
                      :alt="member.name"
                      class="profile-image-small"
                    />
                    <span v-else class="text-white text-caption">{{ getMemberInitial(member.name) }}</span>
                  </div>
                  <span class="option-label-simple">{{ member.name }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 필터 액션 -->
          <div class="filter-actions">
            <v-btn
              variant="outlined"
              size="small"
              @click="resetFilterModal"
              class="clear-filters-btn"
            >
              <v-icon left size="16">mdi-refresh</v-icon>
              초기화
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              @click="applyFilterModal"
              class="apply-filters-btn"
            >
              <v-icon left size="16">mdi-check</v-icon>
              적용
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectScheduleStore } from '../../store/projectScheduleStore.js'
import { useWorkspaceStore } from '../../store/workspaceStore.js'
import { useWorkspaceMemberStore } from '../../store/workspaceMemberStore.js'
import { useAuthStore } from '../../store/authStore.js'
import { getWorkspaceMembers } from '@/api/workspace/workSpaceApi'
import { getProjectTasks, getTaskDetail } from '../../api/schedule/scheduleApi.js'
import TaskCreateModal from './TaskCreateModal.vue'
import TaskDetailModal from './TaskDetailModal.vue'
import ScheduleTimeline from './ScheduleTimeline.vue'
import ScheduleCalendar from './ScheduleCalendar.vue'

const props = defineProps({
  selectedSchedule: String
})

// 뷰 전환 상태
const currentView = ref('board')

const projectScheduleStore = useProjectScheduleStore()
const workspaceStore = useWorkspaceStore()
const workspaceMemberStore = useWorkspaceMemberStore()
const authStore = useAuthStore()

// 필터 모달
const showFilterModal = ref(false)
const selectedFilters = ref({
  statuses: [],
  assignees: []
})

// 필터 모달이 열릴 때 현재 선택된 담당자로 초기화
watch(showFilterModal, (isOpen) => {
  if (isOpen) {
    // 현재 선택된 담당자가 있으면 필터에 추가 (한 명만)
    if (selectedFilter.value) {
      selectedFilters.value.assignees = [selectedFilter.value]
    } else {
      selectedFilters.value.assignees = []
    }
  }
  // 모달이 닫혀도 selectedFilters는 유지 (필터 적용을 위해)
})

// 상태 옵션
const statusOptions = [
  { value: 'TODO', label: '할 일', color: '#e3f2fd' },
  { value: 'IN_PROGRESS', label: '진행중', color: '#fff3e0' },
  { value: 'COMPLETED', label: '완료', color: '#e8f5e8' }
]

// 워크스페이스 멤버 데이터
const workspaceMembers = ref([])

// 선택된 필터 상태
const selectedFilter = ref(null)

// 드래그 앤 드롭 관련 상태
const draggedTask = ref(null)
const dragOverColumn = ref(null)

// Task 생성 모달 상태
const isTaskModalOpen = ref(false)

// Task 수정 모달 상태
const isEditMode = ref(false)
const editTaskData = ref(null)
const isEditModeLimited = ref(false)

// Task 상세 모달 상태
const isTaskDetailModalOpen = ref(false)
const selectedTaskData = ref({})

// 스낵바 상태
const snackbar = ref({
  show: false,
  message: '',
  color: 'error'
})

// 워크스페이스 변경 감지하여 데이터 다시 로드
watch(() => workspaceStore.currentWorkspace, async (newWorkspace, oldWorkspace) => {
  if (newWorkspace && newWorkspace !== oldWorkspace && oldWorkspace) {
    console.log('🔄 [Schedule] 워크스페이스 변경 감지:', oldWorkspace, '→', newWorkspace)
    
    // 1. 먼저 스토어 데이터 초기화
    projectScheduleStore.clearStoreData()
    selectedFilter.value = null
    workspaceMembers.value = []
    
    // 2. 새로운 워크스페이스 데이터 로드
    try {
      const currentWorkspace = workspaceStore.currentWorkspaceInfo
      if (currentWorkspace && currentWorkspace.workSpaceSeq) {
        await Promise.all([
          projectScheduleStore.loadProjectTasks(),
          loadWorkspaceMembers(),
          workspaceMemberStore.loadWorkspaceMembers(currentWorkspace.workSpaceSeq),
          workspaceMemberStore.loadChannels(currentWorkspace.workSpaceSeq)
        ])
        console.log('✅ [Schedule] 워크스페이스 데이터 로드 완료')
      }
    } catch (error) {
      console.error('❌ [Schedule] 데이터 로딩 실패:', error)
    }
  }
}, { immediate: false })

// API 데이터 로딩
onMounted(async () => {
  try {
    const currentWorkspace = workspaceStore.currentWorkspaceInfo
    if (currentWorkspace && currentWorkspace.workSpaceSeq) {
      await Promise.all([
        projectScheduleStore.loadProjectTasks(),
        loadWorkspaceMembers(),
        workspaceMemberStore.loadWorkspaceMembers(currentWorkspace.workSpaceSeq),
        workspaceMemberStore.loadChannels(currentWorkspace.workSpaceSeq)
      ])
    }
  } catch (error) {
    console.error('데이터 로딩 실패:', error)
  }
})

// 워크스페이스 멤버 목록 로드
const loadWorkspaceMembers = async () => {
  try {
    const currentWorkspace = workspaceStore.currentWorkspaceInfo
    if (currentWorkspace && currentWorkspace.workSpaceSeq) {
      const members = await getWorkspaceMembers(currentWorkspace.workSpaceSeq)
      workspaceMembers.value = members
      console.log('워크스페이스 멤버 목록:', members)
    }
  } catch (error) {
    console.error('워크스페이스 멤버 목록 로딩 실패:', error)
  }
}

// 칸반보드 데이터
const kanbanTasks = computed(() => projectScheduleStore.getKanbanTasks())

// 보드(상태) 필터 적용된 칸반보드 데이터 (타임라인용)
const filteredKanbanTasks = computed(() => {
  const tasks = kanbanTasks.value
  
  // 보드(상태) 필터가 없으면 그대로 반환
  if (selectedFilters.value.statuses.length === 0) {
    return tasks
  }
  
  // 필터링된 태스크 객체 생성
  const filtered = {}
  
  // 선택된 상태만 포함
  selectedFilters.value.statuses.forEach(status => {
    if (tasks[status]) {
      filtered[status] = tasks[status]
    }
  })
  
  return filtered
})

// 로딩 상태
const isLoading = computed(() => projectScheduleStore.isLoading)

// 에러 상태
const error = computed(() => projectScheduleStore.error)

// 현재 프로젝트 ID
const currentProjectId = computed(() => {
  return workspaceStore.currentWorkspaceInfo?.workSpaceSeq || null
})

// 업무 추가 버튼 표시 권한 확인 (일정관리 채널 권한 기준)
const canCreateTask = computed(() => {
  // 일정관리 채널의 멤버 목록에서 현재 사용자 찾기
  const scheduleMembers = workspaceMemberStore.scheduleChannels || []
  const currentUser = scheduleMembers.find(member => 
    Number(member.memberSeq) === Number(authStore.memberSeq)
  )
  
  const authority = currentUser?.authority
  return authority === 'SUPER' || authority === 'MANAGER'
})

// participant라도 자신이 담당자인 업무는 수정 가능
const canEditTask = (task) => {
  try {
    const mySeq = Number(authStore.memberSeq)
    const assigneeSeq = Number(task.assigneeMemberSeq || task.picMemberSeq || task.assigneeSeq)
    const isAssignee = !!assigneeSeq && mySeq === assigneeSeq
    return canCreateTask.value || isAssignee
  } catch (e) {
    return canCreateTask.value
  }
}

// 멤버 이니셜 추출 함수
const getMemberInitial = (memberName) => {
  if (!memberName) return '?'
  return memberName.charAt(0).toUpperCase()
}

// 멤버별 색상 할당 함수
const getMemberColor = (memberSeq) => {
  const colors = [
    '#ff6b9d', // 분홍
    '#4ecdc4', // 청록
    '#ff6b6b', // 빨강
    '#4dabf7', // 파랑
    '#ffd43b', // 노랑
    '#e91e63', // 진분홍
    '#9c27b0', // 보라
    '#00bcd4'  // 하늘
  ]
  return colors[(memberSeq - 1) % colors.length]
}

// 필터 토글 함수
const toggleFilter = async (memberSeq) => {
  try {
    if (selectedFilter.value === memberSeq) {
      selectedFilter.value = null
      projectScheduleStore.selectedFilterMember = null
    } else {
      selectedFilter.value = memberSeq
      projectScheduleStore.selectedFilterMember = memberSeq
    }
    await refreshTasks()
  } catch (error) {
    console.error('필터링 실패:', error)
  }
}

// 태스크 데이터 새로고침
const refreshTasks = async () => {
  try {
    const workspaceStore = useWorkspaceStore()
    const currentWorkspace = workspaceStore.currentWorkspaceInfo
    const projectId = currentWorkspace.workSpaceSeq
    
    console.log('🔄 태스크 새로고침 시작:', { projectId, selectedFilter: selectedFilter.value })
    
    const response = selectedFilter.value 
      ? await getProjectTasks(projectId, selectedFilter.value)
      : await getProjectTasks(projectId)
    
    console.log('📦 받은 응답:', response)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 배열
    const taskData = response?.data || response
    projectScheduleStore.taskData = Array.isArray(taskData) ? taskData : []
    console.log('✅ 태스크 데이터 저장:', projectScheduleStore.taskData)
    
    // 에러 상태 초기화
    projectScheduleStore.error = null
  } catch (error) {
    console.error('❌ 태스크 새로고침 실패:', error)
    // 에러가 발생해도 화면에 표시하지 않음
  }
}

// 드래그 앤 드롭 이벤트 핸들러들
const onDragStart = (event, task) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target.outerHTML)
  event.target.style.opacity = '0.5'
}

const onDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedTask.value = null
}

const onDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  // 드래그 오버 상태 설정
  const target = event.currentTarget
  if (target.classList.contains('kanban-column')) {
    const status = target.getAttribute('data-status')
    dragOverColumn.value = status
  }
}

// 드래그 리브 처리
const onDragLeave = (event) => {
  // 드래그가 완전히 벗어났을 때만 상태 초기화
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragOverColumn.value = null
  }
}

const onDrop = async (event, newStatus) => {
  event.preventDefault()
  
  if (!draggedTask.value || draggedTask.value.status === newStatus) return
  
  // 먼저 화면에서 드래그된 태스크를 원래 위치로 되돌림
  const originalStatus = draggedTask.value.status
  
  try {
    await projectScheduleStore.updateTaskStatus(draggedTask.value.id, newStatus)
    // 성공하면 태스크 목록 새로고침
    await refreshTasks()
  } catch (error) {
    console.error('태스크 상태 업데이트 실패:', error)
    
    // 에러 상태 즉시 초기화
    projectScheduleStore.error = null
    
    // 에러 발생 시 화면을 원래 상태로 되돌리기 위해 태스크 목록 새로고침
    await refreshTasks()
    
    // 500 에러인 경우 권한 관련 메시지 표시
    if (error.response?.status === 500) {
      snackbar.value = {
        show: true,
        message: '해당 업무의 상태를 변경할 수 없습니다. 담당자이거나 관리자 권한이 필요합니다.',
        color: 'error'
      }
    } else {
      snackbar.value = {
        show: true,
        message: '업무 상태 변경에 실패했습니다.',
        color: 'error'
      }
    }
  } finally {
    // 드래그 상태 초기화
    dragOverColumn.value = null
  }
}

// Task 모달 열기
const openTaskModal = () => {
  if (!currentProjectId.value) {
    alert('프로젝트 정보를 찾을 수 없습니다.')
    return
  }
  isTaskModalOpen.value = true
}

// Task 생성 완료 후 처리
const onTaskCreated = async (newTask) => {
  console.log('새로운 업무가 생성되었습니다:', newTask)
  // 태스크 목록 새로고침
  await refreshTasks()
}

// Task 수정 완료 후 처리
const onTaskUpdated = async (updatedTask) => {
  console.log('업무가 수정되었습니다:', updatedTask)
  // 수정 모드 상태 초기화
  isEditMode.value = false
  editTaskData.value = null
  // 태스크 목록 새로고침
  await refreshTasks()
}

// 모달이 닫힐 때 수정 모드 상태 초기화
watch(isTaskModalOpen, (newValue) => {
  if (!newValue) {
    // 모달이 닫힐 때 수정 모드 상태 초기화
    isEditMode.value = false
    editTaskData.value = null
    isEditModeLimited.value = false
  }
})

// 상세 모달이 닫힐 때 데이터 새로고침
watch(isTaskDetailModalOpen, async (newVal, oldVal) => {
  // 모달이 열림 → 닫힘 상태로 변경될 때
  if (oldVal === true && newVal === false) {
    console.log('🔄 상세 모달 닫힘 - 데이터 새로고침')
    // 데이터 새로고침
    await refreshTasks()
    selectedTaskData.value = {}
  }
})

// Task 수정
const editTask = async (task) => {
  try {
    console.log('✏️ 태스크 수정 클릭:', task)
    
    // 태스크 상세 정보 조회
    console.log('📡 태스크 상세 조회 시작:', task.id)
    const response = await getTaskDetail(task.id)
    console.log('📦 받은 응답:', response)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 객체
    const taskDetail = response?.data || response
    
    if (taskDetail) {
      // 수정 모드로 설정하고 모달 열기
      editTaskData.value = taskDetail
      isEditMode.value = true
      isEditModeLimited.value = !canCreateTask.value
      isTaskModalOpen.value = true
      console.log('✅ 태스크 수정 모달 열기')
    } else {
      console.error('❌ 태스크 정보가 없습니다.')
      alert('태스크 정보를 불러오는데 실패했습니다.')
    }
  } catch (error) {
    console.error('❌ 태스크 상세 조회 실패:', error)
    alert('태스크 정보를 불러오는데 실패했습니다.')
  }
}

// Task 상세 열기
const openTaskDetail = async (task) => {
  try {
    console.log('🖱️ 태스크 더블클릭:', task)
    
    // 태스크 상세 정보 조회
    console.log('📡 태스크 상세 조회 시작:', task.id)
    const response = await getTaskDetail(task.id)
    console.log('📦 받은 응답:', response)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 객체
    const taskDetail = response?.data || response
    
    if (taskDetail) {
      selectedTaskData.value = taskDetail
      isTaskDetailModalOpen.value = true
      console.log('✅ 태스크 상세 모달 열기')
    } else {
      console.error('❌ 태스크 정보가 없습니다.')
      alert('태스크 정보를 불러오는데 실패했습니다.')
    }
  } catch (error) {
    console.error('❌ 태스크 상세 조회 실패:', error)
    alert('태스크 정보를 불러오는데 실패했습니다.')
  }
}

// Task 삭제
const deleteTask = async (task) => {
  if (confirm(`"${task.title}" 업무를 삭제하시겠습니까?`)) {
    try {
      await projectScheduleStore.removeTask(task.id)
      await refreshTasks()
      snackbar.value = {
        show: true,
        message: '업무가 성공적으로 삭제되었습니다.',
        color: 'success'
      }
    } catch (error) {
      console.error('태스크 삭제 실패:', error)
      snackbar.value = {
        show: true,
        message: '업무 삭제에 실패했습니다.',
        color: 'error'
      }
    }
  }
}

// 필터 모달 함수들
const toggleFilterStatus = (status) => {
  const index = selectedFilters.value.statuses.indexOf(status)
  if (index === -1) {
    selectedFilters.value.statuses.push(status)
  } else {
    selectedFilters.value.statuses.splice(index, 1)
  }
}

const toggleFilterAssignee = (memberSeq) => {
  const index = selectedFilters.value.assignees.indexOf(memberSeq)
  if (index === -1) {
    // 한 명만 선택 가능 (라디오 버튼처럼 동작)
    selectedFilters.value.assignees = [memberSeq]
  } else {
    // 클릭하면 선택 해제
    selectedFilters.value.assignees.splice(index, 1)
  }
}

const resetFilterModal = async () => {
  selectedFilters.value.statuses = []
  selectedFilters.value.assignees = []
  
  // 필터 해제 - 기존 로직 사용
  if (selectedFilter.value !== null) {
    selectedFilter.value = null
    projectScheduleStore.selectedFilterMember = null
    await refreshTasks()
  }
  
  // 모달은 닫지 않고 필터만 초기화
}

const applyFilterModal = async () => {
  // 필터 적용 로직 - 기존 toggleFilter 함수 사용
  console.log('적용된 필터:', selectedFilters.value)
  
  // 보드(상태) 필터는 프론트엔드에서 자동으로 적용됨 (computed로 처리)
  
  // 담당자 필터링 (보드 뷰와 동일하게)
  if (selectedFilters.value.assignees.length > 0) {
    // 첫 번째 담당자만 필터로 적용
    const firstAssignee = selectedFilters.value.assignees[0]
    
    // 기존 필터와 다르면 적용, 같으면 필터 해제
    if (selectedFilter.value !== firstAssignee) {
      await toggleFilter(firstAssignee)
    }
  } else {
    // 필터 해제
    if (selectedFilter.value !== null) {
      // 프로필 아바타 상태 유지를 위해 selectedFilter만 초기화
      selectedFilter.value = null
      projectScheduleStore.selectedFilterMember = null
      await refreshTasks()
    }
  }
  
  showFilterModal.value = false
}

// 활성 필터 확인
const hasActiveFilters = computed(() => {
  // 담당자 필터가 활성화되어 있는지 확인 (보드에서 적용된 필터)
  const isAssigneeFilterActive = selectedFilter.value !== null
  // 모달에서 선택된 담당자가 있는지 확인
  const isModalAssigneeActive = selectedFilters.value.assignees.length > 0
  // 상태 필터가 있는지 확인
  const isStatusFilterActive = selectedFilters.value.statuses.length > 0
  
  return isAssigneeFilterActive || isModalAssigneeActive || isStatusFilterActive
})

// 활성 필터 개수
const activeFilterCount = computed(() => {
  let count = 0
  
  // 보드에서 적용된 담당자 필터가 있으면 1 추가
  if (selectedFilter.value !== null) {
    count++
  }
  
  // 모달에서 선택된 상태 필터 개수 추가
  count += selectedFilters.value.statuses.length
  
  return count
})

// 선택된 필터 제거
const removeStatusFilter = (status) => {
  const index = selectedFilters.value.statuses.indexOf(status)
  if (index > -1) {
    selectedFilters.value.statuses.splice(index, 1)
  }
}

const removeAssigneeFilter = async (memberSeq) => {
  const index = selectedFilters.value.assignees.indexOf(memberSeq)
  if (index > -1) {
    selectedFilters.value.assignees.splice(index, 1)
  }
  
  // 마지막 담당자가 제거되면 필터 해제
  if (selectedFilters.value.assignees.length === 0) {
    if (selectedFilter.value !== null) {
      selectedFilter.value = null
      projectScheduleStore.selectedFilterMember = null
      await refreshTasks()
    }
  }
}

// 상태 라벨
const getStatusLabel = (status) => {
  const labels = {
    'TODO': '할 일',
    'IN_PROGRESS': '진행중',
    'COMPLETED': '완료'
  }
  return labels[status] || status
}

// 멤버 이름
const getMemberName = (memberSeq) => {
  const member = workspaceMembers.value.find(m => m.memberSeq === memberSeq)
  return member ? member.name : '미지정'
}
</script>

<style scoped>
.project-schedule {
  padding: 24px;
  background-color: white;
  min-height: 100vh;
}

/* 헤더 스타일 */
.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.schedule-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icons {
  display: flex;
  gap: 12px;
}

/* 검색 섹션 */
.search-section {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.search-bar {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 1;
  max-width: 400px;
}

.search-input {
  border: none;
  outline: none;
  margin-left: 8px;
  flex: 1;
  font-size: 14px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatars {
  display: flex;
  gap: -8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-right: -8px;
  border: 2px solid white;
  position: relative;
  z-index: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar:hover {
  transform: scale(1.1);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.profile-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar::after {
  content: attr(data-member-name);
  position: absolute;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
  pointer-events: none;
}

.avatar:hover::after {
  opacity: 1;
  visibility: visible;
}

.avatar.selected {
  transform: scale(1.15);
  z-index: 10;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.3), 0 6px 16px rgba(0, 0, 0, 0.2);
  border: 3px solid #4a90e2;
}

.avatar.selected::before {
  content: '✓';
  position: absolute;
  top: -5px;
  right: -5px;
  background: #4a90e2;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  z-index: 1001;
}

.avatar:last-child {
  margin-right: 0;
}

/* 드래그 앤 드롭 스타일 */
.task-card {
  cursor: move;
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}


/* 칸반보드 스타일 */
.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-column {
  flex: 1;
  min-width: 300px;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.kanban-column.drag-over {
  border: 2px solid #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  transform: scale(1.02);
}

/* 할 일 컬럼 전체 색상 */
.kanban-column:first-child {
  background: #e3f2fd;
}

/* 진행중 컬럼 전체 색상 */
.kanban-column:nth-child(2) {
  background: #fff3e0;
}

/* 완료 컬럼 전체 색상 */
.kanban-column:last-child {
  background: #e8f5e8;
}

.column-header {
  padding: 16px 20px;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #333;
  font-weight: 600;
  font-size: 16px;
}

.todo-header {
  background: #e3f2fd;
}

.progress-header {
  background: #fff3e0;
}

.completed-header {
  background: #e8f5e8;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.column-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.task-count {
  background: #2196f3;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.progress-header .task-count {
  background: #ff9800;
}

.completed-header .task-count {
  background: #4caf50;
}

.column-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 태스크 카드 스타일 */
.task-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid #e0e0e0;
  position: relative;
  transform: translateZ(0);
  margin-bottom: 12px;
}

.task-card:last-child {
  margin-bottom: 0;
}

.task-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px) translateZ(0);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  margin-top: -8px;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: -8px;
}

.task-menu-btn {
  margin-left: auto;
  margin-right: 0;
}

.task-menu-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.task-card:hover .task-menu-btn {
  opacity: 1;
}

.menu-list {
  min-width: 60px;
}

.menu-item {
  min-height: 20px !important;
  padding: 1px 6px !important;
}

.menu-item .v-list-item-title {
  line-height: 1.2 !important;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  flex: 1;
  margin-right: 8px;
}

.task-date {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.task-description {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .kanban-board {
    flex-direction: column;
  }
  
  .kanban-column {
    min-width: 100%;
    max-height: 400px;
  }
  
  .project-schedule {
    padding: 16px;
  }
  
  .search-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-bar {
    max-width: none;
  }
}

/* 스크롤바 스타일 */
.column-content::-webkit-scrollbar {
  width: 6px;
}

.column-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.column-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.column-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 로딩 및 에러 상태 스타일 */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.loading-state p, .error-state p {
  margin-top: 16px;
  font-size: 14px;
}

.error-state {
  color: #d32f2f;
}

/* 담당자 표시 스타일 */
.task-assignee {
  font-size: 11px;
  color: #666;
  font-weight: 500;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 필터 버튼 (타임라인/캘린더 뷰용) */
.multi-filter-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  padding: 18px 16px;
  gap: 6px;
  min-width: 100px;
  height: 36px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.multi-filter-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.multi-filter-btn.filtered {
  background: #1976d2 !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

.multi-filter-btn.active {
  background: #f8f9fa !important;
  color: #1976d2 !important;
  border-color: #1976d2 !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

.multi-filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
}

.multi-filter-btn.filtered:hover {
  box-shadow: 0 3px 12px rgba(25, 118, 210, 0.4);
}

.filter-text {
  font-weight: 500;
}

.filter-count-chip {
  background: rgba(255, 255, 255, 0.9) !important;
  color: #1976d2 !important;
  font-weight: 600;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  margin: 0 !important;
  align-self: center !important;
}

.multi-filter-btn.filtered .filter-count-chip {
  color: #1976d2 !important;
}

/* 정렬 수정 */
.multi-filter-btn :deep(.v-chip__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 필터 모달 스타일 */
.filter-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.multi-filter-dropdown {
  min-width: 600px;
  max-width: 800px;
  width: 70vw;
}

.filter-dropdown-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 1px solid #e0e0e0;
  overflow: hidden;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 필터 헤더 */
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #172b4d;
}

.close-filter-btn {
  color: #6b778c !important;
}

.close-filter-btn:hover {
  background: #e9ecef !important;
  color: #172b4d !important;
}

/* 선택된 필터 표시 */
.active-filters {
  padding: 16px 24px;
  background: #f0f8ff;
  border-bottom: 1px solid #e1e5e9;
}

.active-filters-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1976d2;
}

.active-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.active-filter-chip {
  border-radius: 6px !important;
  font-weight: 500;
}

/* 필터 옵션들 */
.filter-options-simple {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  padding: 20px 30px;
}

.filter-section-simple {
  flex: 1;
  min-width: 0;
}

.filter-section-header-simple {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #e1e5e9;
}

.section-title-simple {
  font-size: 14px;
  font-weight: 600;
  color: #172b4d;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filter-options-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.filter-option-simple {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.filter-option-simple:hover {
  background: #e3f2fd;
  border-color: #2196f3;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.15);
}

.filter-option-simple.selected {
  background: #e3f2fd;
  border-color: #1976d2;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
}

.option-color-simple {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.option-avatar-simple {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}

.profile-image-small {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.option-label-simple {
  font-size: 12px;
  font-weight: 500;
  color: #172b4d;
  white-space: nowrap;
}

/* 필터 액션 */
.filter-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
  gap: 12px;
}

.clear-filters-btn,
.apply-filters-btn {
  border-radius: 6px;
  text-transform: none;
  font-weight: 500;
}

.clear-filters-btn {
  color: #6b778c !important;
  border-color: #e1e5e9 !important;
}

.apply-filters-btn {
  background: #1976d2 !important;
  color: white !important;
}
</style>
