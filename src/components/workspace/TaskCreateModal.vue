<template>
  <v-dialog 
    v-model="isOpen" 
    max-width="900px" 
    persistent 
    class="no-scroll-dialog task-create-dialog"
  >
    <v-card class="task-create-modal fixed-modal-create">
      <!-- 모달 헤더 -->
      <div class="modal-header">
        <div class="modal-header-content">
          <div class="modal-icon">
            <v-icon>{{ isEditMode ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          </div>
          <h3 class="modal-title">{{ isEditMode ? '업무 수정' : '새 업무 생성' }}</h3>
        </div>
        <v-btn
          icon
          variant="text"
          class="close-btn"
          @click="closeModal"
          :disabled="isCreating"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      
      <v-card-text class="modal-content">
        <v-form ref="formRef" v-model="isFormValid">
          <v-row>
            <!-- 왼쪽 컬럼 -->
            <v-col cols="12" md="6">
              <!-- 업무 제목 -->
              <div class="mb-4">
                <label class="text-subtitle-1 font-weight-medium mb-2 d-block">업무 제목</label>
                <v-text-field
                  v-model="taskData.taskTitle"
                  placeholder="예: Q3 마케팅 캠페인 런칭"
                  :rules="titleRules"
                  outlined
                  :disabled="isEditMode && props.editModeLimited"
                  required
                ></v-text-field>
              </div>

              <!-- 업무 내용 -->
              <div class="mb-4">
                <label class="text-subtitle-1 font-weight-medium mb-2 d-block">업무 설명</label>
                <v-textarea
                  v-model="taskData.taskContent"
                  placeholder="업무에 대한 자세한 설명을 입력하세요..."
                  :rules="contentsRules"
                  outlined
                  rows="4"
                  :disabled="isEditMode && props.editModeLimited"
                  required
                ></v-textarea>
              </div>

              <!-- 날짜 필드들 -->
              <div class="mb-4">
                <label class="text-subtitle-1 font-weight-medium mb-3 d-block">일정 기간</label>
                
                <!-- 날짜 선택 카드 -->
                <div class="date-selector-container">
                  <v-menu
                    v-model="startDateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                    :disabled="isEditMode && props.editModeLimited"
                  >
                    <template v-slot:activator="{ props: menuProps }">
                      <div 
                        v-bind="menuProps"
                        :class="['date-selector-card', { 'disabled': isEditMode && props.editModeLimited }]"
                        @click="openDatePicker('start')"
                      >
                        <div class="date-selector-icon">
                          <v-icon color="primary">mdi-calendar-start</v-icon>
                        </div>
                        <div class="date-selector-content">
                          <div class="date-selector-label">시작일</div>
                          <div class="date-selector-value">
                            {{ formatDisplayDate(taskData.startDate) || '날짜 선택' }}
                          </div>
                        </div>
                        <v-icon class="date-selector-arrow">mdi-chevron-right</v-icon>
                      </div>
                    </template>
                    <v-date-picker
                      :model-value="taskData.startDate"
                      @update:model-value="updateStartDate"
                      :min="projectPeriod.startDate || undefined"
                      :max="projectPeriod.endDate || taskData.endDate || undefined"
                      color="primary"
                      locale="ko-KR"
                    ></v-date-picker>
                  </v-menu>
                  
                  <div class="date-connector">
                    <v-icon size="small" color="grey">mdi-arrow-right</v-icon>
                  </div>
                  
                  <v-menu
                    v-model="endDateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                    :disabled="isEditMode && props.editModeLimited"
                  >
                    <template v-slot:activator="{ props: menuProps }">
                      <div 
                        v-bind="menuProps"
                        :class="['date-selector-card', { 'disabled': isEditMode && props.editModeLimited }]"
                        @click="openDatePicker('end')"
                      >
                        <div class="date-selector-icon">
                          <v-icon color="primary">mdi-calendar-end</v-icon>
                        </div>
                        <div class="date-selector-content">
                          <div class="date-selector-label">종료일</div>
                          <div class="date-selector-value">
                            {{ formatDisplayDate(taskData.endDate) || '날짜 선택' }}
                          </div>
                        </div>
                        <v-icon class="date-selector-arrow">mdi-chevron-right</v-icon>
                      </div>
                    </template>
                    <v-date-picker
                      :model-value="taskData.endDate"
                      @update:model-value="updateEndDate"
                      :min="projectPeriod.startDate || taskData.startDate || undefined"
                      :max="projectPeriod.endDate || undefined"
                      color="primary"
                      locale="ko-KR"
                    ></v-date-picker>
                  </v-menu>
                </div>
              </div>
            </v-col>

            <!-- 오른쪽 컬럼 -->
            <v-col cols="12" md="6">
              <!-- 담당자 선택 -->
              <div class="mb-4">
                <label class="text-subtitle-1 font-weight-medium mb-2 d-block">담당자</label>
                <v-select
                  v-model="taskData.picMemberSeq"
                  :items="memberOptions"
                  item-title="memberName"
                  item-value="scheduleManagementChannelMemberSeq"
                  outlined
                  :loading="isLoadingMembers"
                  placeholder="팀원을 선택하세요"
                  :disabled="isEditMode && props.editModeLimited"
                  required
                >
                  <template #selection="{ item }">
                    <div class="d-flex align-center">
                      <v-avatar size="24" class="me-2">
                        <v-img v-if="item.raw.profileImageUrl" :src="item.raw.profileImageUrl"></v-img>
                        <span v-else class="text-caption">{{ getMemberInitial(item.raw.memberName) }}</span>
                      </v-avatar>
                      {{ item.raw.memberName }}
                    </div>
                  </template>
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-avatar size="32">
                          <v-img v-if="item.raw.profileImageUrl" :src="item.raw.profileImageUrl"></v-img>
                          <span v-else class="text-caption">{{ getMemberInitial(item.raw.memberName) }}</span>
                        </v-avatar>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </div>

              <!-- 업무 상태 -->
              <div class="mb-4">
                <label class="text-subtitle-1 font-weight-medium mb-2 d-block">상태</label>
                <v-select
                  v-model="taskData.taskStatus"
                  :items="taskStatusOptions"
                  outlined
                  required
                ></v-select>
              </div>

              <!-- 보드 선택 (개인 일정관리에서 사용) -->
              <div class="mb-4" v-if="showBoardSelect">
                <label class="text-subtitle-1 font-weight-medium mb-2 d-block">보드</label>
                <v-select
                  v-model="taskData.boardSeq"
                  :items="boardOptions"
                  item-title="boardName"
                  item-value="boardSeq"
                  outlined
                  placeholder="보드를 선택하세요"
                  required
                />
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          @click="closeModal"
          :disabled="isCreating"
        >
          취소
        </v-btn>
        <v-btn
          color="primary"
          @click="createTask"
          :loading="isCreating"
          :disabled="!isFormValid"
        >
          {{ isEditMode ? '수정' : '생성' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getProjectMemberList, createTask as createTaskApi, updateTask as updateTaskApi } from '../../api/schedule/scheduleApi.js'
import { useWorkspaceMemberStore } from '@/store/workspaceMemberStore'
import { useWorkspaceStore } from '@/store/workspaceStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: Number,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  editTaskData: {
    type: Object,
    default: null
  },
  showBoardSelect: {
    type: Boolean,
    default: false
  },
  boardOptions: {
    type: Array,
    default: () => []
  },
  editModeLimited: {
    // true면 수정 시 상태/보드만 변경 가능
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'taskCreated', 'taskUpdated'])

// 모달 상태
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// ESC 키로 닫기
const handleKeydown = (event) => {
  if (event.key === 'Escape' && isOpen.value && !isCreating.value) {
    closeModal()
  }
}

onMounted(() => {
  if (isOpen.value) {
    window.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// 폼 참조
const formRef = ref(null)
const isFormValid = ref(false)

// 로딩 상태
const isCreating = ref(false)
const isLoadingMembers = ref(false)

// 날짜 메뉴 상태
const startDateMenu = ref(false)
const endDateMenu = ref(false)

// 업무 데이터
const taskData = ref({
  taskTitle: '',
  taskContent: '',
  taskStatus: 'TODO',
  startDate: '',
  endDate: '',
  picMemberSeq: null,
  boardSeq: null // 팀 일정관리에서는 보드 없음
})

// 업무 상태 옵션
const taskStatusOptions = [
  { title: '할 일', value: 'TODO' },
  { title: '진행중', value: 'IN_PROGRESS' },
  { title: '완료', value: 'COMPLETED' }
]

// 멤버 목록
const projectMembers = ref([])
const workspaceMemberStore = useWorkspaceMemberStore()
const workspaceStore = useWorkspaceStore()

// 프로젝트 기간 (YYYY-MM-DD 형식)
const projectPeriod = computed(() => {
  const workspaceInfo = workspaceStore.currentWorkspaceInfo
  if (!workspaceInfo || workspaceInfo.type !== 'project') {
    return { startDate: null, endDate: null }
  }
  
  const toYmd = (v) => (v ? String(v).slice(0, 10) : null)
  return {
    startDate: toYmd(workspaceInfo.startDate || workspaceInfo.projectStartDate),
    endDate: toYmd(workspaceInfo.endDate || workspaceInfo.projectEndDate)
  }
})

// 멤버 옵션 (v-select용)
const memberOptions = computed(() => projectMembers.value)

// 유효성 검사 규칙
const titleRules = [
  v => !!v || '업무 제목은 필수입니다.',
  v => (v && v.length >= 2) || '업무 제목은 최소 2글자 이상이어야 합니다.'
]

const contentsRules = [
  v => !!v || '업무 내용은 필수입니다.',
  v => (v && v.length >= 5) || '업무 내용은 최소 5글자 이상이어야 합니다.'
]

const dateRules = [
  v => !!v || '날짜는 필수입니다.'
]

// 멤버 이니셜 추출
const getMemberInitial = (memberName) => {
  if (!memberName) return '?'
  return memberName.charAt(0).toUpperCase()
}

// 날짜 형식을 HTML date input에 맞게 변환
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toISOString().split('T')[0]
}

// 날짜를 표시용 포맷으로 변환 (예: 2024년 1월 15일)
const formatDisplayDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}년 ${month}월 ${day}일`
}

// 날짜 피커 열기
const openDatePicker = (type) => {
  if (isEditMode.value && props.editModeLimited) return
  if (type === 'start') {
    startDateMenu.value = true
  } else {
    endDateMenu.value = true
  }
}

// 시작일 업데이트
const updateStartDate = (value) => {
  // v-date-picker가 Date 객체를 반환할 수 있으므로 문자열로 변환
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    taskData.value.startDate = `${year}-${month}-${day}`
  } else if (typeof value === 'string') {
    taskData.value.startDate = value
  } else {
    taskData.value.startDate = value ? String(value) : ''
  }
  startDateMenu.value = false
}

// 종료일 업데이트
const updateEndDate = (value) => {
  // v-date-picker가 Date 객체를 반환할 수 있으므로 문자열로 변환
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    taskData.value.endDate = `${year}-${month}-${day}`
  } else if (typeof value === 'string') {
    taskData.value.endDate = value
  } else {
    taskData.value.endDate = value ? String(value) : ''
  }
  endDateMenu.value = false
}

// 프로젝트 멤버 목록 로드
const loadProjectMembers = async () => {
  try {
    isLoadingMembers.value = true
    const response = await getProjectMemberList(props.projectId)
    // 배열 직접 응답 또는 { success, data } 형태 모두 지원
    if (Array.isArray(response)) {
      projectMembers.value = response
    } else if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      projectMembers.value = response.success ? (response.data || []) : []
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      projectMembers.value = response.data
    } else {
      projectMembers.value = []
    }

    // 표준화: { memberSeq, memberName, profileImageUrl }
    const normalize = (arr) => (arr || []).map(m => ({
      // 백엔드 DTO가 요구하는 scheduleManagementChannelMemberSeq 우선 유지
      scheduleManagementChannelMemberSeq: m.scheduleManagementChannelMemberSeq ?? m.picScheduleManagementChannelMemberSeq ?? m.picMemberSeq ?? m.memberSeq ?? m.id ?? m.memberId,
      memberSeq: m.memberSeq ?? m.id ?? m.memberId, // 참고용
      memberName: m.memberName ?? m.name ?? m.username ?? m.displayName,
      profileImageUrl: m.profileImageUrl ?? m.memberProfileUrl ?? m.profileImage ?? m.avatarUrl
    })).filter(x => x.scheduleManagementChannelMemberSeq && x.memberName)
    projectMembers.value = normalize(projectMembers.value)

    // 폴백: 비어 있으면 일정관리 채널 멤버 사용
    if (projectMembers.value.length === 0 && Array.isArray(workspaceMemberStore.scheduleChannels)) {
      projectMembers.value = normalize(workspaceMemberStore.scheduleChannels)
    }

    console.log('[Schedule][Modal] memberOptions normalized:', { count: projectMembers.value.length, sample: projectMembers.value.slice(0,5) })
  } catch (error) {
    console.error('프로젝트 멤버 목록 로드 실패:', error)
  } finally {
    isLoadingMembers.value = false
  }
}

// 업무 생성/수정
const createTask = async () => {
  if (!formRef.value) return
  
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    isCreating.value = true
    
    // 날짜 유효성 검사
    if (new Date(taskData.value.startDate) > new Date(taskData.value.endDate)) {
      alert('종료일은 시작일보다 늦어야 합니다.')
      return
    }

    if (props.isEditMode) {
      // 수정 모드
      const response = await updateTaskApi(props.editTaskData.taskSeq, taskData.value)
      
      if (response.success) {
        alert('업무가 성공적으로 수정되었습니다.')
        emit('taskUpdated', response.data)
        closeModal()
      } else {
        alert('업무 수정에 실패했습니다.')
      }
    } else {
      // 생성 모드
      const response = await createTaskApi(props.projectId, taskData.value)
      
      if (response.success) {
        alert('업무가 성공적으로 생성되었습니다.')
        emit('taskCreated', response.data)
        closeModal()
        resetForm()
      } else {
        alert('업무 생성에 실패했습니다.')
      }
    }
  } catch (error) {
    console.error('업무 처리 실패:', error)
    alert('업무 처리 중 오류가 발생했습니다.')
  } finally {
    isCreating.value = false
  }
}

// 모달 닫기
const closeModal = () => {
  resetForm()
  isOpen.value = false
}

// 폼 초기화
const resetForm = () => {
  // 프로젝트 시작일 또는 오늘 날짜 중 하나를 기본값으로 사용
  const defaultStartDate = projectPeriod.value.startDate || new Date().toISOString().split('T')[0]
  taskData.value = {
    taskTitle: '',
    taskContent: '',
    taskStatus: 'TODO',
    startDate: defaultStartDate, // 시작일은 프로젝트 시작일로 기본 설정
    endDate: '', // 종료일은 빈 값
    picMemberSeq: null,
    boardSeq: null
  }
  if (formRef.value) {
    formRef.value.reset()
  }
}

// 모달이 열릴 때 멤버 목록 로드
watch(isOpen, (newValue) => {
  if (newValue) {
    loadProjectMembers()
    
    if (props.isEditMode && props.editTaskData) {
      // 수정 모드: 상세 데이터로 폼 채우기
      taskData.value = {
        taskTitle: props.editTaskData.taskTitle || '',
        taskContent: props.editTaskData.taskContent || '',
        taskStatus: props.editTaskData.taskStatus || 'TODO',
        startDate: formatDateForInput(props.editTaskData.startDate),
        endDate: formatDateForInput(props.editTaskData.endDate),
        picMemberSeq: props.editTaskData.picScheduleManagementChannelMemberSeq || null,
        boardSeq: props.editTaskData.boardSeq || null
      }
    } else {
      // 생성 모드: 기본값으로 초기화
      // 프로젝트 시작일 또는 오늘 날짜 중 하나를 기본값으로 사용
      const defaultStartDate = projectPeriod.value.startDate || new Date().toISOString().split('T')[0]
      taskData.value = {
        taskTitle: '',
        taskContent: '',
        taskStatus: 'TODO',
        startDate: defaultStartDate, // 시작일은 프로젝트 시작일로 기본 설정
        endDate: '', // 종료일은 빈 값
        picMemberSeq: null,
        boardSeq: props.showBoardSelect ? (props.boardOptions[0]?.boardSeq || null) : null
      }
    }
  }
  // ESC 리스너 토글
  if (newValue) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  resetForm()
})
</script>

<style scoped>
/* 모달 스타일 */
/* 디스코드 스타일 모달 */
.task-create-modal {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
  background: rgb(var(--v-theme-schedule-card-bg));
}

/* 고정 크기 모달 */
.fixed-modal-create {
  width: 900px !important;
  max-height: 800px !important;
}

/* 반응형 디자인 */
@media (max-width: 1024px) {
  .task-create-dialog :deep(.v-overlay__content) {
    max-width: 90vw !important;
    width: 700px !important;
  }
  
  .fixed-modal-create {
    width: 90vw !important;
    max-width: 700px !important;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-content {
    padding: 20px;
  }
  
  .v-card-text {
    padding: 20px;
  }
  
  .v-card-actions {
    padding: 16px 20px;
  }
}

@media (max-width: 768px) {
  .task-create-dialog :deep(.v-overlay__content) {
    max-width: 95vw !important;
    width: 95vw !important;
    margin: 0 auto !important;
  }
  
  .fixed-modal-create {
    width: 95vw !important;
    max-width: 500px !important;
    max-height: 90vh !important;
  }
  
  .modal-header {
    padding: 14px 16px;
  }
  
  .modal-header-content {
    gap: 10px;
  }
  
  .modal-icon {
    width: 28px;
    height: 28px;
  }
  
  .modal-icon .v-icon {
    font-size: 18px;
  }
  
  .modal-title {
    font-size: 16px;
  }
  
  .modal-content {
    padding: 16px;
  }
  
  .v-card-text {
    padding: 16px;
  }
  
  .v-card-actions {
    padding: 14px 16px;
    flex-direction: column;
    gap: 8px;
  }
  
  .v-card-actions .v-btn {
    width: 100%;
    margin: 0 !important;
  }
  
  /* 컬럼을 세로로 배치 */
  .v-row {
    margin: 0 !important;
  }
  
  .v-col {
    padding: 0 !important;
    margin-bottom: 16px;
  }
  
  .v-col:last-child {
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .task-create-dialog :deep(.v-overlay__content) {
    max-width: 100vw !important;
    width: 100vw !important;
    margin: 0 !important;
    top: auto !important;
    bottom: 0 !important;
    transform: none !important;
  }
  
  .fixed-modal-create {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 90vh !important;
    border-radius: 16px 16px 0 0 !important;
  }
  
  .modal-header {
    padding: 12px 16px;
  }
  
  .modal-header-content {
    gap: 8px;
  }
  
  .modal-icon {
    width: 24px;
    height: 24px;
  }
  
  .modal-icon .v-icon {
    font-size: 16px;
  }
  
  .modal-title {
    font-size: 14px;
  }
  
  .modal-content {
    padding: 12px;
    max-height: calc(90vh - 120px);
    overflow-y: auto;
  }
  
  .v-card-text {
    padding: 12px;
  }
  
  .v-card-actions {
    padding: 12px 16px;
    gap: 8px;
  }
  
  .v-card-actions .v-btn {
    height: 36px;
    font-size: 14px;
  }
  
  /* 라벨 크기 조정 */
  .v-card-text label.text-subtitle-1 {
    font-size: 11px;
    margin-bottom: 4px;
  }
  
  /* 입력 필드 크기 조정 */
  .v-card-text :deep(.v-field) {
    min-height: 40px;
  }
  
  .v-textarea :deep(.v-field__input) {
    min-height: 80px;
  }
}

/* v-dialog 스크롤바 숨김 */
.no-scroll-dialog .v-overlay__content::-webkit-scrollbar {
  display: none;
}

.no-scroll-dialog .v-overlay__content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 모달 헤더 */
/* 디스코드 스타일 헤더 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  width: 32px;
  height: 32px;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: rgb(var(--v-theme-primary));
}

.modal-icon:hover {
  background: rgba(var(--v-theme-primary), 0.15);
}

.modal-icon .v-icon {
  font-size: 20px;
  color: rgb(var(--v-theme-primary));
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.close-btn {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.close-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.05) !important;
}

/* 모달 콘텐츠 */
/* 디스코드 스타일 본문 */
.modal-content {
  padding: 24px;
  background: rgb(var(--v-theme-schedule-header-bg));
}

.v-card-text {
  padding: 24px;
  background: rgb(var(--v-theme-schedule-header-bg));
}

.v-card-actions {
  padding: 20px 24px;
  background: rgb(var(--v-theme-schedule-card-bg));
  border-top: 1px solid rgb(var(--v-theme-schedule-border));
}

/* 디스코드 스타일 폼 필드 */
.v-card-text :deep(.v-field) {
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 4px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  transition: all 0.15s ease;
}

.v-card-text :deep(.v-field:hover) {
  border-color: rgb(var(--v-theme-schedule-border));
}

.v-card-text :deep(.v-field--focused) {
  border-color: #1976d2;
  box-shadow: 0 0 0 1px #1976d2;
}

.v-card-text :deep(.v-label) {
  font-weight: 600;
  color: rgb(var(--v-theme-schedule-text));
}

/* 디스코드 스타일 레이블 */
.v-card-text label.text-subtitle-1 {
  font-size: 12px;
  font-weight: 700;
  color: #1976d2;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.v-select :deep(.v-field__input) {
  padding-top: 16px;
}

.v-text-field :deep(.v-field__input) {
  padding-top: 16px;
}

.v-textarea :deep(.v-field__input) {
  padding-top: 16px;
}

/* 디스코드 스타일 버튼 */
.v-card-actions .v-btn {
  border-radius: 4px;
  text-transform: none;
  font-weight: 600;
  padding: 0 24px;
  height: 40px;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.v-card-actions .v-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.v-card-actions .v-btn:active {
  transform: translateY(0);
}

.v-card-actions .v-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 선택 드롭다운 스타일 */
.v-card-text :deep(.v-select__selection) {
  font-weight: 500;
}

/* 디스코드 스타일 아바타 */
.v-card-text :deep(.v-avatar) {
  border: 1px solid rgb(var(--v-theme-schedule-border));
}

/* 텍스트 색상 보정 */
.v-card-text :deep(.v-select__selection),
.v-card-text :deep(.v-field__input) {
  color: rgb(var(--v-theme-schedule-text));
}

/* 날짜 선택 카드 스타일 */
.date-selector-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.date-selector-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgb(var(--v-theme-schedule-card-bg));
  border: 2px solid rgb(var(--v-theme-schedule-border));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-selector-card:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.date-selector-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.date-selector-card.disabled:hover {
  border-color: rgb(var(--v-theme-schedule-border));
  background: rgb(var(--v-theme-schedule-card-bg));
  transform: none;
  box-shadow: none;
}

.date-selector-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 10px;
}

.date-selector-content {
  flex: 1;
  min-width: 0;
}

.date-selector-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.date-selector-value {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-selector-arrow {
  color: rgba(var(--v-theme-on-surface), 0.4);
  transition: transform 0.2s ease;
}

.date-selector-card:hover .date-selector-arrow {
  transform: translateX(4px);
  color: rgb(var(--v-theme-primary));
}

.date-connector {
  display: flex;
  align-items: center;
  padding: 0 4px;
  flex-shrink: 0;
}

/* 날짜 피커 스타일 */
:deep(.v-date-picker) {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .date-selector-container {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-connector {
    transform: rotate(90deg);
    padding: 8px 0;
  }
  
  .date-selector-card {
    width: 100%;
  }
}
</style>
