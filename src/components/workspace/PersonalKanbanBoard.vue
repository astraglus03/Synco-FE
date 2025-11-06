<template>
  <div class="personal-kanban-board">
    <!-- 헤더 -->
    <div class="schedule-header">
      <h1>내 일정관리</h1>
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
            :color="currentView === 'calendar' ? 'primary' : 'grey'"
            @click="currentView = 'calendar'"
            style="cursor: pointer;"
          >mdi-calendar</v-icon>
        </div>
        <v-btn 
          color="primary" 
          prepend-icon="mdi-plus" 
          @click="handleCreateTask"
        >
          일정 추가
        </v-btn>
      </div>
    </div>

    <!-- 뷰 전환 -->
    <!-- 칸반보드 뷰 -->
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
            <div class="task-count">{{ getTasksByStatus('TODO').length }}</div>
          </div>
        </div>
        <div class="column-content">
          <div 
            v-for="task in getTasksByStatus('TODO')" 
            :key="task.taskSeq" 
            class="task-card"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @dblclick="handleTaskClick(task)"
          >
            <div class="task-header">
              <div class="task-title">{{ task.taskTitle }}</div>
              <v-menu location="bottom start">
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
                  <v-list-item @click="handleEditTask(task)" class="menu-item">
                    <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="handleDeleteTask(task)" class="menu-item text-red">
                    <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
            <div class="task-date">{{ task.startDate }} - {{ task.endDate }}</div>
            <div class="task-description">{{ task.taskContent }}</div>
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
            <div class="task-count">{{ getTasksByStatus('IN_PROGRESS').length }}</div>
          </div>
        </div>
        <div class="column-content">
          <div 
            v-for="task in getTasksByStatus('IN_PROGRESS')" 
            :key="task.taskSeq" 
            class="task-card"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @dblclick="handleTaskClick(task)"
          >
            <div class="task-header">
              <div class="task-title">{{ task.taskTitle }}</div>
              <v-menu location="bottom start">
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
                  <v-list-item @click="handleEditTask(task)" class="menu-item">
                    <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="handleDeleteTask(task)" class="menu-item text-red">
                    <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
            <div class="task-date">{{ task.startDate }} - {{ task.endDate }}</div>
            <div class="task-description">{{ task.taskContent }}</div>
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
            <div class="task-count">{{ getTasksByStatus('COMPLETED').length }}</div>
          </div>
        </div>
        <div class="column-content">
          <div 
            v-for="task in getTasksByStatus('COMPLETED')" 
            :key="task.taskSeq" 
            class="task-card"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @dblclick="handleTaskClick(task)"
          >
            <div class="task-header">
              <div class="task-title">{{ task.taskTitle }}</div>
              <v-menu location="bottom start">
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
                  <v-list-item @click="handleEditTask(task)" class="menu-item">
                    <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="handleDeleteTask(task)" class="menu-item text-red">
                    <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
            <div class="task-date">{{ task.startDate }} - {{ task.endDate }}</div>
            <div class="task-description">{{ task.taskContent }}</div>
          </div>
        </div>
      </div>
    </div>
    </div>
    <!-- 칸반보드 뷰 끝 -->

    <!-- 캘린더 뷰 -->
    <div v-else-if="currentView === 'calendar'">
      <PersonalCalendar 
        :kanban-tasks="kanbanTasks"
        @open-task-detail="handleTaskClick"
      />
    </div>
  </div>

  <!-- 일정 추가/수정 모달 -->
  <PersonalTaskModal
    v-model="showTaskModal"
    :work-space-seq="personalWorkspaceId"
    :is-edit-mode="isEditMode"
    :edit-task-data="selectedTask"
    @task-created="handleTaskCreated"
    @task-updated="handleTaskUpdated"
  />

  <!-- 일정 상세보기 모달 -->
  <TaskDetailModal
    v-model="showTaskDetailModal"
    :taskData="selectedTask"
    :isPersonal="true"
  />
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { 
  getPersonalTasks, 
  getPersonalTask,
  updatePersonalTaskStatus, 
  updatePersonalTask,
  createPersonalTask,
  deletePersonalTask 
} from '@/api/schedule/scheduleApi'
import PersonalCalendar from './PersonalCalendar.vue'
import PersonalTaskModal from './PersonalTaskModal.vue'
import TaskDetailModal from './TaskDetailModal.vue'

const workspaceStore = useWorkspaceStore()

// 뷰 전환 상태
const currentView = ref('board')

// 상태 관리
const personalTasks = ref([])
const draggedTask = ref(null)
const dragOverColumn = ref(null)

// 모달 상태
const showTaskModal = ref(false)
const showTaskDetailModal = ref(false)
const isEditMode = ref(false)
const selectedTask = ref(null)
const loadingTaskDetail = ref(false)

// 개인 워크스페이스 ID
const personalWorkspaceId = computed(() => {
  const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
  return personalWorkspace?.workSpaceSeq || null
})

// 칸반보드 데이터 구조로 변환
const kanbanTasks = computed(() => {
  const todos = personalTasks.value.filter(task => task.taskStatus === 'TODO')
  const inProgress = personalTasks.value.filter(task => task.taskStatus === 'IN_PROGRESS')
  const completed = personalTasks.value.filter(task => task.taskStatus === 'COMPLETED')
  
  return {
    TODO: todos,
    IN_PROGRESS: inProgress,
    COMPLETED: completed
  }
})

// 상태별로 태스크 필터링
const getTasksByStatus = (status) => {
  return personalTasks.value.filter(task => task.taskStatus === status)
}

// 개인 일정 로드
const loadPersonalTasks = async () => {
  if (!personalWorkspaceId.value) {
    return
  }

  try {
    // 개인 스케줄 API 사용
    const response = await getPersonalTasks(personalWorkspaceId.value)
    
    console.log('📦 개인 일정 API 응답 (raw):', JSON.stringify(response, null, 2))
    
    // 백엔드 응답 구조 처리
    let taskData = response?.data || response
    
    if (!Array.isArray(taskData)) {
      personalTasks.value = []
      return
    }
    
    // 배열에서 태스크 추출 (상태별 그룹화된 데이터)
    let tasks = []
    taskData.forEach(group => {
      if (group.taskResDtoList && Array.isArray(group.taskResDtoList)) {
        tasks = tasks.concat(group.taskResDtoList)
      } else if (group.taskSeq || group.taskTitle) {
        tasks.push(group)
      }
    })
    
    personalTasks.value = tasks
    console.log('✅ 개인 일정 로드 완료:', personalTasks.value.length, '개')
  } catch (error) {
    console.error('❌ 개인 일정 로드 실패:', error)
    console.error('❌ 에러 상세:', error.response?.data || error.message)
    personalTasks.value = []
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
  
  const target = event.currentTarget
  if (target.classList.contains('kanban-column')) {
    const status = target.getAttribute('data-status')
    dragOverColumn.value = status
  }
}

const onDragLeave = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragOverColumn.value = null
  }
}

const onDrop = async (event, newStatus) => {
  event.preventDefault()
  
  if (!draggedTask.value || draggedTask.value.taskStatus === newStatus) {
    draggedTask.value = null
    dragOverColumn.value = null
    return
  }
  
  // Task 정보 미리 저장
  const taskSeq = draggedTask.value.taskSeq
  
  // 드래그 정보 초기화 (API 호출 전에 초기화)
  draggedTask.value = null
  dragOverColumn.value = null
  
  try {
    // 개인 Task 상태 변경 API 호출
    await updatePersonalTaskStatus(taskSeq, newStatus)
    
    // 데이터 새로고침 (전체 재로드)
    await loadPersonalTasks()
  } catch (error) {
    console.error('태스크 상태 업데이트 실패:', error)
    console.error('❌ 에러 상세:', error.response?.data || error.message)
    alert('태스크 상태 변경에 실패했습니다.')
  }
}

// 일정 추가
const handleCreateTask = () => {
  isEditMode.value = false
  selectedTask.value = null
  showTaskModal.value = true
}

// 일정 수정
const handleEditTask = async (task) => {
  isEditMode.value = true
  loadingTaskDetail.value = true
  
  try {
    // API를 통해 최신 데이터 조회
    const response = await getPersonalTask(task.taskSeq)
    console.log('📦 수정 API 응답:', response)
    // 응답에서 data 추출
    selectedTask.value = response?.data || response
    showTaskModal.value = true
  } catch (error) {
    console.error('일정 수정 조회 실패:', error)
    console.error('❌ 에러 상세:', error.response?.data || error.message)
    // API 실패 시 클릭한 task 데이터 사용
    selectedTask.value = task
    showTaskModal.value = true
  } finally {
    loadingTaskDetail.value = false
  }
}

// 일정 삭제
const handleDeleteTask = async (task) => {
  if (confirm(`"${task.taskTitle}" 일정을 삭제하시겠습니까?`)) {
    try {
      // 개인 Task 삭제 API 호출
      await deletePersonalTask(task.taskSeq)
      await loadPersonalTasks()
      alert('일정이 삭제되었습니다.')
    } catch (error) {
      console.error('일정 삭제 실패:', error)
      console.error('❌ 에러 상세:', error.response?.data || error.message)
      alert('일정 삭제에 실패했습니다.')
    }
  }
}

// 일정 클릭 (상세 보기)
const handleTaskClick = async (task) => {
  loadingTaskDetail.value = true
  try {
    // API를 통해 최신 데이터 조회
    const response = await getPersonalTask(task.taskSeq)
    console.log('📦 상세조회 API 응답:', response)
    // 응답에서 data 추출
    selectedTask.value = response?.data || response
    showTaskDetailModal.value = true
  } catch (error) {
    console.error('일정 상세 조회 실패:', error)
    console.error('❌ 에러 상세:', error.response?.data || error.message)
    // API 실패 시 클릭한 task 데이터 사용
    selectedTask.value = task
    showTaskDetailModal.value = true
  } finally {
    loadingTaskDetail.value = false
  }
}

// 일정 생성 완료 후
const handleTaskCreated = () => {
  loadPersonalTasks()
}

// 일정 수정 완료 후
const handleTaskUpdated = () => {
  loadPersonalTasks()
}

// 상세 모달이 닫힐 때 데이터 새로고침
watch(showTaskDetailModal, async (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    await loadPersonalTasks()
  }
})

onMounted(async () => {
  await loadPersonalTasks()
  // 검색/알림에서 넘어온 상세 열기 이벤트 리스너 등록
  window.addEventListener('open-task-detail', onOpenTaskDetailFromExternal)
  // 내비게이션 직후 세션 스토리지 전달값 처리 (이벤트 미리스닝 대비)
  try {
    const pendingTaskSeq = sessionStorage.getItem('openTaskDetailTaskSeq')
    if (pendingTaskSeq) {
      sessionStorage.removeItem('openTaskDetailTaskSeq')
      onOpenTaskDetailFromExternal({ detail: { taskSeq: Number(pendingTaskSeq) } })
    }
  } catch {}
})

onBeforeUnmount(() => {
  window.removeEventListener('open-task-detail', onOpenTaskDetailFromExternal)
})

// 외부 트리거(검색/알림)로 개인 업무 상세 열기
const onOpenTaskDetailFromExternal = async (e) => {
  try {
    const detail = e?.detail || {}
    const taskSeq = Number(detail.taskSeq || detail.channelSeq)
    if (!taskSeq) return
    loadingTaskDetail.value = true
    const response = await getPersonalTask(taskSeq)
    const taskDetail = response?.data || response
    if (taskDetail) {
      selectedTask.value = taskDetail
      showTaskDetailModal.value = true
    }
  } catch (err) {
    console.error('[개인 일정] 태스크 상세 열기 실패:', err)
  } finally {
    loadingTaskDetail.value = false
  }
}
</script>

<style scoped>
.personal-kanban-board {
  padding: 24px;
  background-color: rgb(var(--v-theme-background));
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
  background: rgb(var(--v-theme-schedule-card-bg));
  border: 1px solid rgb(var(--v-theme-schedule-border));
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
  background: rgba(33, 150, 243, 0.08);
}

/* 진행중 컬럼 전체 색상 */
.kanban-column:nth-child(2) {
  background: rgba(255, 152, 0, 0.08);
}

/* 완료 컬럼 전체 색상 */
.kanban-column:last-child {
  background: rgba(76, 175, 80, 0.08);
}

.column-header {
  padding: 16px 20px;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgb(var(--v-theme-schedule-text));
  font-weight: 600;
  font-size: 16px;
}

.todo-header {
  background: rgba(33, 150, 243, 0.15);
}

.progress-header {
  background: rgba(255, 152, 0, 0.15);
}

.completed-header {
  background: rgba(76, 175, 80, 0.15);
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
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid rgb(var(--v-theme-schedule-border));
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
  color: rgb(var(--v-theme-schedule-text));
  line-height: 1.4;
  flex: 1;
  margin-right: 8px;
}

.task-date {
  font-size: 12px;
  color: rgb(var(--v-theme-schedule-text-secondary));
  margin-bottom: 6px;
}

.task-description {
  font-size: 12px;
  color: rgb(var(--v-theme-schedule-text-tertiary));
  line-height: 1.4;
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
  
  .personal-kanban-board {
    padding: 16px;
  }
}

/* 스크롤바 스타일 */
.column-content::-webkit-scrollbar {
  width: 6px;
}

.column-content::-webkit-scrollbar-track {
  background: rgb(var(--v-theme-schedule-hover-bg));
  border-radius: 3px;
}

.column-content::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-schedule-text-secondary), 0.4);
  border-radius: 3px;
}

.column-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-schedule-text-secondary), 0.6);
}
</style>
