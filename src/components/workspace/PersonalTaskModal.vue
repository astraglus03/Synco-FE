<template>
  <v-dialog v-model="isOpen" max-width="600px" persistent class="no-scroll-dialog">
    <v-card class="personal-task-modal">
      <!-- 모달 헤더 -->
      <div class="modal-header">
        <div class="modal-header-content">
          <div class="modal-icon">
            <v-icon>{{ isEditMode ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          </div>
          <h3 class="modal-title">{{ isEditMode ? '일정 수정' : '새 일정 추가' }}</h3>
        </div>
      </div>
      
      <v-card-text class="modal-content">
        <v-form ref="formRef" v-model="isFormValid">
          <!-- 일정 제목 -->
          <div class="mb-3">
            <label class="text-subtitle-1 font-weight-medium mb-2">제목</label>
            <v-text-field
              v-model="taskData.taskTitle"
              placeholder="예: 회의 준비"
              :rules="titleRules"
              variant="outlined"
              density="comfortable"
              required
            ></v-text-field>
          </div>

          <!-- 일정 내용 -->
          <div class="mb-3">
            <label class="text-subtitle-1 font-weight-medium mb-2">내용</label>
            <v-textarea
              v-model="taskData.taskContent"
              placeholder="일정에 대한 자세한 설명을 입력하세요..."
              :rules="contentsRules"
              variant="outlined"
              rows="4"
              required
            ></v-textarea>
          </div>

          <!-- 일정 상태 -->
          <div class="mb-3">
            <label class="text-subtitle-1 font-weight-medium mb-2">상태</label>
            <v-select
              v-model="taskData.taskStatus"
              :items="taskStatusOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="comfortable"
              required
            ></v-select>
          </div>

          <!-- 날짜 필드들 -->
          <div class="mb-3">
            <label class="text-subtitle-1 font-weight-medium mb-3">일정 기간</label>
            
            <!-- 날짜 선택 카드 -->
            <div class="date-selector-container">
              <v-menu
                v-model="startDateMenu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="290px"
              >
                <template v-slot:activator="{ props: menuProps }">
                  <div 
                    v-bind="menuProps"
                    class="date-selector-card"
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
                  :max="taskData.endDate || undefined"
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
              >
                <template v-slot:activator="{ props: menuProps }">
                  <div 
                    v-bind="menuProps"
                    class="date-selector-card"
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
                  :min="taskData.startDate || undefined"
                  color="primary"
                  locale="ko-KR"
                ></v-date-picker>
              </v-menu>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="modal-actions">
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
          @click="saveTask"
          :loading="isCreating"
          :disabled="!isFormValid"
        >
          {{ isEditMode ? '수정' : '추가' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { createPersonalTask, updatePersonalTask } from '@/api/schedule/scheduleApi'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  workSpaceSeq: {
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
  if (event.key === 'Escape' && isOpen.value) {
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

// 모달 열림 상태에 따라 ESC 리스너 토글
watch(isOpen, (newValue) => {
  if (newValue) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

// 폼 참조
const formRef = ref(null)
const isFormValid = ref(false)

// 로딩 상태
const isCreating = ref(false)

// 날짜 메뉴 상태
const startDateMenu = ref(false)
const endDateMenu = ref(false)

// 일정 데이터
const taskData = ref({
  taskTitle: '',
  taskContent: '',
  taskStatus: 'TODO',
  startDate: '',
  endDate: ''
})

// 일정 상태 옵션
const taskStatusOptions = [
  { title: '할 일', value: 'TODO' },
  { title: '진행중', value: 'IN_PROGRESS' },
  { title: '완료', value: 'COMPLETED' }
]

// 유효성 검사 규칙
const titleRules = [
  v => !!v || '제목은 필수입니다.',
  v => (v && v.length >= 2) || '제목은 최소 2글자 이상이어야 합니다.'
]

const contentsRules = [
  v => !!v || '내용은 필수입니다.',
  v => (v && v.length >= 5) || '내용은 최소 5글자 이상이어야 합니다.'
]

const dateRules = [
  v => !!v || '날짜는 필수입니다.'
]

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

// 일정 저장
const saveTask = async () => {
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
      console.log('📝 [PersonalTaskModal] 일정 수정 요청 데이터:', {
        taskSeq: props.editTaskData.taskSeq,
        workSpaceSeq: props.workSpaceSeq,
        taskData: taskData.value,
        rawTaskData: JSON.parse(JSON.stringify(taskData.value))
      })
      await updatePersonalTask(props.editTaskData.taskSeq, taskData.value)
      
      alert('일정이 성공적으로 수정되었습니다.')
      emit('taskUpdated', taskData.value)
      closeModal()
    } else {
      // 생성 모드
      console.log('➕ [PersonalTaskModal] 일정 생성 요청 데이터:', {
        workSpaceSeq: props.workSpaceSeq,
        taskData: taskData.value,
        rawTaskData: JSON.parse(JSON.stringify(taskData.value)),
        startDate: taskData.value.startDate,
        endDate: taskData.value.endDate,
        startDateType: typeof taskData.value.startDate,
        endDateType: typeof taskData.value.endDate
      })
      await createPersonalTask(props.workSpaceSeq, taskData.value)
      
      alert('일정이 성공적으로 추가되었습니다.')
      emit('taskCreated', taskData.value)
      closeModal()
      resetForm()
    }
  } catch (error) {
    console.error('일정 처리 실패:', error)
    alert('일정 처리 중 오류가 발생했습니다.')
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
  const today = new Date().toISOString().split('T')[0]
  taskData.value = {
    taskTitle: '',
    taskContent: '',
    taskStatus: 'TODO',
    startDate: today, // 시작일은 오늘로 기본 설정
    endDate: '' // 종료일은 빈 값
  }
  startDateMenu.value = false
  endDateMenu.value = false
  if (formRef.value) {
    formRef.value.reset()
  }
}

// 모달이 열릴 때 데이터 설정
watch([isOpen, () => props.editTaskData], ([newValue]) => {
  if (newValue) {
    if (props.isEditMode && props.editTaskData) {
      console.log('📝 수정 모드 - editTaskData:', props.editTaskData)
      // 수정 모드: 상세 데이터로 폼 채우기
      taskData.value = {
        taskTitle: props.editTaskData.taskTitle || '',
        taskContent: props.editTaskData.taskContent || '',
        taskStatus: props.editTaskData.taskStatus || 'TODO',
        startDate: formatDateForInput(props.editTaskData.startDate),
        endDate: formatDateForInput(props.editTaskData.endDate)
      }
      console.log('📝 폼 데이터:', taskData.value)
    } else {
      // 생성 모드: 기본값으로 초기화
      const today = new Date().toISOString().split('T')[0]
      taskData.value = {
        taskTitle: '',
        taskContent: '',
        taskStatus: 'TODO',
        startDate: today, // 시작일은 오늘로 기본 설정
        endDate: '' // 종료일은 빈 값
      }
    }
  }
})
</script>

<style scoped>
.no-scroll-dialog :deep(.v-overlay__content) {
  max-height: 90vh;
  overflow-y: auto;
}

.personal-task-modal {
  border-radius: 8px;
  overflow: hidden;
}

/* 모달 헤더 */
.modal-header {
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.1);
}

.modal-icon .v-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 20px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.3px;
}

/* 모달 본문 */
.modal-content {
  padding: 24px;
  background: rgb(var(--v-theme-schedule-card-bg));
}

.modal-content label.text-subtitle-1 {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-schedule-text));
  margin-bottom: 8px;
  text-transform: none;
  letter-spacing: 0;
}

/* 폼 필드 스타일 */
.modal-content :deep(.v-field) {
  border-radius: 4px;
  background: rgb(var(--v-theme-schedule-card-bg));
  border: 1px solid rgb(var(--v-theme-schedule-border));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
}

.modal-content :deep(.v-field:hover) {
  border-color: rgb(var(--v-theme-schedule-border));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.modal-content :deep(.v-field--focused) {
  border-color: #1976d2 !important;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1) !important;
  background: rgb(var(--v-theme-schedule-card-bg));
}

.modal-content :deep(.v-field__outline) {
  display: none;
}

.modal-content :deep(.v-field__input) {
  padding: 12px 14px;
  font-size: 14px;
  color: rgb(var(--v-theme-schedule-text));
  min-height: auto;
}

.modal-content :deep(.v-field__input::placeholder) {
  color: rgb(var(--v-theme-schedule-placeholder));
  opacity: 1;
}

.modal-content :deep(textarea.v-field__input) {
  padding: 12px 14px;
  line-height: 1.6;
}

/* Select 특별 스타일 */
.modal-content :deep(.v-select .v-field__input) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.modal-content :deep(.v-select__selection-text) {
  font-size: 14px;
  color: rgb(var(--v-theme-schedule-text));
}

/* Date input 스타일 */
.modal-content :deep(input[type="date"]) {
  font-size: 14px;
  color: rgb(var(--v-theme-schedule-text));
}

/* 모달 액션 (버튼 영역) */
.modal-actions {
  padding: 16px 24px;
  background: rgb(var(--v-theme-schedule-header-bg));
  border-top: 1px solid rgb(var(--v-theme-schedule-border));
  gap: 8px;
}

.modal-actions .v-btn {
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

.modal-actions .v-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-actions .v-btn[variant="outlined"] {
  border: 1px solid rgb(var(--v-theme-schedule-border));
  color: rgb(var(--v-theme-schedule-text));
  background: rgb(var(--v-theme-schedule-card-bg));
}

.modal-actions .v-btn[variant="outlined"]:hover {
  border-color: rgb(var(--v-theme-schedule-border));
  background: rgb(var(--v-theme-schedule-hover-bg));
}

.modal-actions .v-btn[color="primary"] {
  background: #1976d2;
  color: white;
  box-shadow: 0 1px 2px rgba(25, 118, 210, 0.2);
}

.modal-actions .v-btn[color="primary"]:hover {
  background: #1976d2;
  filter: brightness(0.9);
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
}

.modal-actions .v-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Row 간격 조정 */
.v-row {
  margin-top: 0;
  margin-bottom: 0;
}

.v-col {
  padding-top: 0;
  padding-bottom: 0;
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

