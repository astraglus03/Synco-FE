<template>
  <div class="personal-schedule">
    <!-- 헤더 -->
    <div class="schedule-header">
      <h1>개인 일정관리</h1>
      <div class="header-actions">
        <!-- 검색 바 -->
        <div class="search-bar">
          <v-icon size="20" color="grey">mdi-magnify</v-icon>
          <input placeholder="업무 검색..." class="search-input" />
        </div>
        <div class="header-icons">
          <v-icon size="20" color="grey">mdi-view-grid</v-icon>
          <v-icon size="20" color="grey">mdi-timeline</v-icon>
          <v-icon size="20" color="grey">mdi-calendar</v-icon>
        </div>
      </div>
    </div>

    <!-- 개인 담당 업무 섹션 -->
    <div 
      class="my-tasks-section"
      :class="{ 'drag-over': dragOverSection === 'my-tasks' }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onMyTasksDrop"
    >

      <!-- 로딩 상태 -->
      <div v-if="isLoading" class="loading-state">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p>담당 업무를 불러오는 중...</p>
      </div>
      
      <!-- 에러 상태 -->
      <div v-else-if="error" class="error-state">
        <v-icon color="error" size="48">mdi-alert-circle</v-icon>
        <p>{{ error }}</p>
      </div>
      
      <!-- 담당 업무 목록 -->
      <div v-else-if="myTasks.length > 0" class="task-container">
        <button 
          class="scroll-btn scroll-left" 
          @click="scrollTasks('left')"
          :disabled="!canScrollLeft"
        >
          <v-icon>mdi-chevron-left</v-icon>
        </button>
        
        <div class="task-list" ref="taskListRef">
          <div 
            v-for="task in myTasks" 
            :key="task.taskSeq" 
            class="task-card"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
          >
            <div class="task-header">
              <div class="task-title">{{ task.taskTitle }}</div>
              <v-chip 
                :color="getStatusColor(task.taskStatus)" 
                size="x-small"
                class="status-chip"
              >
                {{ getStatusText(task.taskStatus) }}
              </v-chip>
            </div>
            
            <div class="task-content">
              <div class="task-description">{{ task.taskContent }}</div>
              <div class="task-dates">
                <v-icon size="16" color="grey">mdi-calendar</v-icon>
                <span>{{ task.startDate }} ~ {{ task.endDate }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          class="scroll-btn scroll-right" 
          @click="scrollTasks('right')"
          :disabled="!canScrollRight"
        >
          <v-icon>mdi-chevron-right</v-icon>
        </button>
      </div>
      
      <!-- 업무가 없는 경우 -->
      <div v-else class="empty-message">
        <p>담당 업무가 없습니다</p>
      </div>
    </div>

    <!-- 칸반 보드 섹션 -->
    <div class="kanban-section">
      <div class="section-header">
        <h2>내 칸반 보드</h2>
        <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openBoardModal">
          보드 생성
        </v-btn>
      </div>
      
      <!-- 로딩 상태 -->
      <div v-if="isLoadingBoards" class="loading-state">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p>보드를 불러오는 중...</p>
      </div>
      
      <!-- 보드 목록 -->
      <div v-else-if="boards.length > 0" class="kanban-boards">
        <div 
          v-for="board in boards" 
          :key="board.boardSeq" 
          class="kanban-board"
          :class="{ 
            'drag-over': dragOverSection === 'board' || dragOverBoard === board.boardSeq 
          }"
          :style="{ backgroundColor: board.colors }"
        >
          <div 
            class="board-header" 
            :style="{ backgroundColor: board.colors }"
            draggable="true"
            @dragstart="onBoardDragStart($event, board)"
            @dragend="onBoardDragEnd"
            @dragover="onBoardDragOver($event, board)"
            @dragleave="onBoardDragLeave"
            @drop="onBoardOrderDrop($event, board)"
          >
            <h3 class="board-title">{{ board.boardName }}</h3>
            <div class="board-actions">
              <v-menu location="bottom start">
                <template v-slot:activator="{ props }">
                  <v-btn 
                    icon="mdi-dots-vertical" 
                    size="x-small" 
                    variant="text"
                    class="board-menu-btn"
                    v-bind="props"
                    @click.stop
                  />
                </template>
                <v-list density="compact" class="menu-list">
                  <v-list-item @click="editBoard(board)" class="menu-item">
                    <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="deleteBoardHandler(board)" class="menu-item text-red">
                    <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>
          
          <div 
            class="board-content"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onBoardDrop($event, board.boardSeq)"
          >
            <div class="task-list">
              <div 
                v-for="task in board.taskResDtoList" 
                :key="task.taskSeq" 
                class="task-card"
                draggable="true"
                @dragstart="onDragStart($event, task)"
                @dragend="onDragEnd"
              >
                <div class="task-header">
                  <div class="task-title">{{ task.taskTitle }}</div>
                  <v-chip 
                    :color="getStatusColor(task.taskStatus)" 
                    size="small"
                    class="status-chip"
                  >
                    {{ getStatusText(task.taskStatus) }}
                  </v-chip>
                </div>
                
                <div class="task-content">
                  <div class="task-description">{{ task.taskContent }}</div>
                  <div class="task-dates">
                    <v-icon size="16" color="grey">mdi-calendar</v-icon>
                    <span>{{ task.startDate }} ~ {{ task.endDate }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 보드가 없는 경우 -->
      <div v-else class="empty-state">
        <v-icon size="64" color="grey">mdi-construction</v-icon>
        <h3>아직 보드가 없습니다</h3>
        <p>새 보드를 생성하여 업무를 관리해보세요!</p>
      </div>
    </div>

    <!-- 보드 생성/수정 모달 -->
    <BoardCreateModal
      v-model:isOpen="showBoardModal"
      :is-edit-mode="isEditMode"
      :edit-board-data="editBoardData"
      @board-created="onBoardCreated"
      @board-updated="onBoardUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkspaceStore } from '../../store/workspaceStore.js'
import { getMyTasks, getProjectBoards, moveTaskToBoard, updateBoardOrders, deleteBoard, getBoardDetail } from '../../api/schedule/scheduleApi.js'
import BoardCreateModal from './BoardCreateModal.vue'

const workspaceStore = useWorkspaceStore()

// 상태 관리
const myTasks = ref([])
const boards = ref([])
const isLoading = ref(false)
const isLoadingBoards = ref(false)
const error = ref(null)
const draggedTask = ref(null)
const showBoardModal = ref(false)
const isEditMode = ref(false)
const editBoardData = ref(null)
const dragOverSection = ref(null)
const draggedBoard = ref(null)
const dragOverBoard = ref(null)
const taskListRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// 현재 프로젝트 ID (팀 프로젝트의 개인 일정 = 해당 프로젝트에서 내가 담당한 업무)
const currentProjectId = computed(() => {
  return workspaceStore.currentWorkspaceInfo?.workSpaceSeq || null
})


// 상태별 색상 반환
const getStatusColor = (status) => {
  const colors = {
    'TODO': 'blue',
    'IN_PROGRESS': 'orange', 
    'COMPLETED': 'green'
  }
  return colors[status] || 'grey'
}

// 상태별 텍스트 반환
const getStatusText = (status) => {
  const texts = {
    'TODO': '할 일',
    'IN_PROGRESS': '진행중', 
    'COMPLETED': '완료'
  }
  return texts[status] || '알 수 없음'
}

// 개인 담당 업무 로드
const loadMyTasks = async () => {
  if (!currentProjectId.value) {
    error.value = '프로젝트 정보를 찾을 수 없습니다.'
    return
  }

  try {
    isLoading.value = true
    error.value = null
    
    const response = await getMyTasks(currentProjectId.value)
    
    const taskData = response?.data || response
    myTasks.value = Array.isArray(taskData) ? taskData : []
  } catch (err) {
    console.error('❌ 담당 업무 로드 실패:', err)
    error.value = '담당 업무를 불러오는 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 보드 목록 로드
const loadBoards = async () => {
  if (!currentProjectId.value) {
    return
  }

  try {
    isLoadingBoards.value = true
    
    const response = await getProjectBoards(currentProjectId.value)
    
    const boardData = response?.data || response
    boards.value = Array.isArray(boardData) ? boardData : []
  } catch (err) {
    console.error('❌ 보드 목록 로드 실패:', err)
  } finally {
    isLoadingBoards.value = false
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

// 보드로 드롭 처리
const onBoardDrop = async (event, boardSeq) => {
  event.preventDefault()
  
  if (!draggedTask.value) return
  
  try {
    await moveTaskToBoard(draggedTask.value.taskSeq, boardSeq)
    
    // 성공 시 데이터 새로고침
    await Promise.all([
      loadMyTasks(),
      loadBoards()
    ])
    
    console.log('태스크가 보드로 이동되었습니다.')
  } catch (error) {
    console.error('태스크 보드 이동 실패:', error)
    alert('태스크 이동에 실패했습니다.')
  } finally {
    // 드래그 상태 초기화
    dragOverSection.value = null
  }
}

// 개인 담당 업무로 드롭 처리 (보드에서 제거)
const onMyTasksDrop = async (event) => {
  event.preventDefault()
  
  if (!draggedTask.value) return
  
  try {
    // boardSeq를 null로 설정하여 개인 담당 업무로 이동
    await moveTaskToBoard(draggedTask.value.taskSeq, null)
    
    // 성공 시 데이터 새로고침
    await Promise.all([
      loadMyTasks(),
      loadBoards()
    ])
    
    console.log('태스크가 개인 담당 업무로 이동되었습니다.')
  } catch (error) {
    console.error('태스크 이동 실패:', error)
    alert('태스크 이동에 실패했습니다.')
  } finally {
    // 드래그 상태 초기화
    dragOverSection.value = null
  }
}

// 보드 드래그 시작
const onBoardDragStart = (event, board) => {
  draggedBoard.value = board
  event.dataTransfer.effectAllowed = 'move'
}

// 보드 드래그 종료
const onBoardDragEnd = () => {
  draggedBoard.value = null
  dragOverBoard.value = null
}

// 보드 드래그 오버
const onBoardDragOver = (event, targetBoard) => {
  event.preventDefault()
  dragOverBoard.value = targetBoard.boardSeq
}

// 보드 드래그 리브
const onBoardDragLeave = () => {
  dragOverBoard.value = null
}

// 보드 순서 변경 드롭
const onBoardOrderDrop = async (event, targetBoard) => {
  event.preventDefault()
  dragOverBoard.value = null
  
  if (draggedBoard.value && draggedBoard.value.boardSeq !== targetBoard.boardSeq) {
    try {
      // 보드 순서 변경을 위한 데이터 준비
      const boardOrders = boards.value.map((board, index) => ({
        boardSeq: board.boardSeq,
        newOrders: index + 1
      }))
      
      // 드래그된 보드와 타겟 보드의 순서 교체
      const draggedIndex = boards.value.findIndex(b => b.boardSeq === draggedBoard.value.boardSeq)
      const targetIndex = boards.value.findIndex(b => b.boardSeq === targetBoard.boardSeq)
      
      // 순서 교체
      const newBoardOrders = [...boardOrders]
      newBoardOrders[draggedIndex].newOrders = targetIndex + 1
      newBoardOrders[targetIndex].newOrders = draggedIndex + 1
      
      // API 호출
      await updateBoardOrders(newBoardOrders)
      await loadBoards()
    } catch (error) {
      console.error('보드 순서 변경 실패:', error)
    }
  }
}

// 보드 수정
const editBoard = async (board) => {
  try {
    console.log('📡 보드 상세 정보 조회 시작:', board.boardSeq)
    // 보드 상세 정보 조회
    const response = await getBoardDetail(board.boardSeq)
    console.log('📦 받은 응답:', response)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 객체
    const boardData = response?.data || response
    
    if (boardData) {
      editBoardData.value = boardData
      isEditMode.value = true
      showBoardModal.value = true
      console.log('✅ 보드 수정 모달 열기')
    } else {
      alert('보드 정보를 불러오는데 실패했습니다.')
    }
  } catch (error) {
    console.error('❌ 보드 상세 조회 실패:', error)
    alert('보드 정보를 불러오는데 실패했습니다.')
  }
}

// 보드 수정 완료 시 처리
const onBoardUpdated = async () => {
  // 수정 모드 상태 초기화
  isEditMode.value = false
  editBoardData.value = null
  // 보드 목록 새로고침
  await loadBoards()
  
  // 강제 리렌더링
  boards.value = [...boards.value]
}

// 보드 삭제
const deleteBoardHandler = async (board) => {
  if (confirm(`"${board.boardName}" 보드를 삭제하시겠습니까?`)) {
    try {
      await deleteBoard(board.boardSeq)
      await loadBoards()
      console.log('보드가 성공적으로 삭제되었습니다.')
    } catch (error) {
      console.error('보드 삭제 실패:', error)
      alert('보드 삭제에 실패했습니다.')
    }
  }
}

// 드래그 오버 처리
const onDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  // 드래그 오버 상태 설정
  const target = event.currentTarget
  if (target.classList.contains('my-tasks-section')) {
    dragOverSection.value = 'my-tasks'
  } else if (target.classList.contains('kanban-board')) {
    dragOverSection.value = 'board'
  }
}

// 드래그 리브 처리
const onDragLeave = (event) => {
  // 드래그가 완전히 벗어났을 때만 상태 초기화
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragOverSection.value = null
  }
}

// 보드 생성 모달 열기
const openBoardModal = () => {
  showBoardModal.value = true
}

// 보드 생성 완료 시 처리
const onBoardCreated = () => {
  // 보드 목록 새로고침
  loadBoards()
}

// 태스크 스크롤 함수
const scrollTasks = (direction) => {
  if (!taskListRef.value) return
  
  const scrollAmount = 250 // 스크롤할 양
  const currentScroll = taskListRef.value.scrollLeft
  
  if (direction === 'left') {
    taskListRef.value.scrollLeft = Math.max(0, currentScroll - scrollAmount)
  } else {
    taskListRef.value.scrollLeft = currentScroll + scrollAmount
  }
  
  updateScrollButtons()
}

// 스크롤 버튼 상태 업데이트
const updateScrollButtons = () => {
  if (!taskListRef.value) return
  
  const { scrollLeft, scrollWidth, clientWidth } = taskListRef.value
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(async () => {
  await Promise.all([
    loadMyTasks(),
    loadBoards()
  ])
  
  // 스크롤 이벤트 리스너 추가
  if (taskListRef.value) {
    taskListRef.value.addEventListener('scroll', updateScrollButtons)
    updateScrollButtons()
  }
})

// currentProjectId 변경 감지
watch(
  currentProjectId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadMyTasks()
      loadBoards()
    }
  }
)
</script>

<style scoped>
.personal-schedule {
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

/* 검색 바 (헤더 내부) */
.header-actions .search-bar {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  margin-right: 16px;
}

.search-input {
  border: none;
  outline: none;
  margin-left: 8px;
  flex: 1;
  font-size: 14px;
}

/* 섹션 헤더 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

/* 담당 업무 섹션 */
.my-tasks-section {
  margin-bottom: 20px;
  min-height: 60px;
  border: 2px dashed transparent;
  border-radius: 8px;
  padding: 8px;
  transition: all 0.3s ease;
}

.my-tasks-section.drag-over {
  border-color: #2196f3;
  background-color: rgba(33, 150, 243, 0.1);
}

.empty-message {
  text-align: center;
  padding: 20px;
  color: #666;
}

.empty-message p {
  margin: 0;
  font-size: 14px;
}

.task-container {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.task-list {
  display: flex;
  gap: 12px;
  overflow-x: hidden;
  flex: 1;
  scroll-behavior: smooth;
}

.scroll-btn {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.scroll-btn:hover:not(:disabled) {
  background: #f5f5f5;
  transform: scale(1.05);
}

.scroll-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.task-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  cursor: move;
  transition: all 0.3s ease;
  min-width: 200px;
  flex-shrink: 0;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 6px;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.status-chip {
  flex-shrink: 0;
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-description {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

.task-dates {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #888;
}

/* 칸반 보드 섹션 */
.kanban-section {
  margin-bottom: 20px;
}

.kanban-boards {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 16px;
  flex-wrap: nowrap;
}

.kanban-board {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  overflow: hidden;
  min-width: 300px;
  flex-shrink: 0;
  min-height: 350px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.kanban-board.drag-over {
  border-color: #2196f3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  transform: scale(1.02);
}

.board-header {
  padding: 16px 20px;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  border-radius: 8px 8px 0 0;
}

.board-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.board-menu-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
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

.kanban-board:hover .board-menu-btn {
  opacity: 1;
}

.board-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}


.board-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  background: transparent !important;
}

.kanban-board .task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kanban-board .task-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: move;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.kanban-board .task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kanban-board .task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.kanban-board .task-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 8px;
}

.kanban-board .task-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kanban-board .task-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.kanban-board .task-dates {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #888;
}

/* 로딩 및 에러 상태 */
.loading-state, .error-state, .empty-state, .coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.loading-state p, .error-state p, .empty-state p, .coming-soon p {
  margin-top: 16px;
  font-size: 14px;
}

.error-state {
  color: #d32f2f;
}

.empty-state h3, .coming-soon h3 {
  margin-top: 16px;
  font-size: 18px;
  font-weight: 600;
}

/* 스크롤바 스타일 */
.kanban-boards::-webkit-scrollbar {
  height: 8px;
}

.kanban-boards::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.kanban-boards::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.kanban-boards::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.board-content::-webkit-scrollbar {
  width: 6px;
}

.board-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.board-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.board-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .personal-schedule {
    padding: 16px;
  }
  
  .schedule-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
  }
  
  .header-actions .search-bar {
    max-width: 100%;
    margin-right: 0;
  }
  
  .task-list {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .kanban-boards {
    gap: 16px;
  }
  
  .kanban-board {
    min-width: 280px;
  }
}
</style>
