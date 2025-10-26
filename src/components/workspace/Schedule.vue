<template>
  <div class="project-schedule">
    <!-- 헤더 -->
    <div class="schedule-header">
      <h1>팀 일정</h1>
      <div class="header-actions">
        <div class="header-icons">
          <v-icon size="20" color="grey">mdi-view-grid</v-icon>
          <v-icon size="20" color="grey">mdi-timeline</v-icon>
          <v-icon size="20" color="grey">mdi-calendar</v-icon>
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
        <div class="member-avatars">
          <div 
            v-for="member in workspaceMembers" 
            :key="member.memberSeq"
            class="avatar"
            :class="{ 'selected': selectedFilter === member.memberSeq }"
            :style="{ backgroundColor: getMemberColor(member.memberSeq) }"
            :title="member.name"
            :data-member-name="member.name"
            @click="toggleFilter(member.memberSeq)"
          >
            {{ getMemberInitial(member.name) }}
          </div>
        </div>
      </div>
    </div>

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
            >
              <div class="task-header">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-actions">
                  <div class="task-assignee">{{ task.assignee }}</div>
                  <v-menu v-if="canCreateTask" location="bottom start">
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
                      <v-list-item @click="deleteTask(task)" class="menu-item text-red">
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
          >
            <div class="task-header">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-actions">
                <div class="task-assignee">{{ task.assignee }}</div>
                <v-menu v-if="canCreateTask" location="bottom start">
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
                    <v-list-item @click="deleteTask(task)" class="menu-item text-red">
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
          >
            <div class="task-header">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-actions">
                <div class="task-assignee">{{ task.assignee }}</div>
                <v-menu v-if="canCreateTask" location="bottom start">
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
                    <v-list-item @click="deleteTask(task)" class="menu-item text-red">
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

    <!-- Task 생성 모달 -->
    <TaskCreateModal
      v-model="isTaskModalOpen"
      :project-id="currentProjectId"
      @task-created="onTaskCreated"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectScheduleStore } from '../../store/projectScheduleStore.js'
import { useWorkspaceStore } from '../../store/workspaceStore.js'
import { useWorkspaceMemberStore } from '../../store/workspaceMemberStore.js'
import { useAuthStore } from '../../store/authStore.js'
import { getWorkspaceMembers } from '@/api/workspace/workSpaceApi'
import { getProjectTasks } from '../../api/schedule/scheduleApi.js'
import TaskCreateModal from './TaskCreateModal.vue'

const props = defineProps({
  selectedSchedule: String
})

const projectScheduleStore = useProjectScheduleStore()
const workspaceStore = useWorkspaceStore()
const workspaceMemberStore = useWorkspaceMemberStore()
const authStore = useAuthStore()

// 워크스페이스 멤버 데이터
const workspaceMembers = ref([])

// 선택된 필터 상태
const selectedFilter = ref(null)

// 드래그 앤 드롭 관련 상태
const draggedTask = ref(null)
const dragOverColumn = ref(null)

// Task 생성 모달 상태
const isTaskModalOpen = ref(false)

// 스낵바 상태
const snackbar = ref({
  show: false,
  message: '',
  color: 'error'
})

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
    
    if (selectedFilter.value) {
      const response = await getProjectTasks(projectId, selectedFilter.value)
      projectScheduleStore.taskData = response.data
    } else {
      const response = await getProjectTasks(projectId)
      projectScheduleStore.taskData = response.data
    }
    
    // 에러 상태 초기화
    projectScheduleStore.error = null
  } catch (error) {
    console.error('태스크 새로고침 실패:', error)
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

// Task 수정
const editTask = (task) => {
  // TODO: TaskCreateModal을 수정 모드로 열기
  console.log('태스크 수정:', task)
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
</style>
