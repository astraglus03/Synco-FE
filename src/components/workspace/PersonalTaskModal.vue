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
          <div class="mb-2">
            <v-row>
              <v-col cols="6">
                <label class="text-subtitle-1 font-weight-medium mb-2">시작일</label>
                <v-text-field
                  v-model="taskData.startDate"
                  type="date"
                  :rules="dateRules"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <label class="text-subtitle-1 font-weight-medium mb-2">종료일</label>
                <v-text-field
                  v-model="taskData.endDate"
                  type="date"
                  :rules="dateRules"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  required
                ></v-text-field>
              </v-col>
            </v-row>
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
      await updatePersonalTask(props.editTaskData.taskSeq, taskData.value)
      
      alert('일정이 성공적으로 수정되었습니다.')
      emit('taskUpdated', taskData.value)
      closeModal()
    } else {
      // 생성 모드
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
  taskData.value = {
    taskTitle: '',
    taskContent: '',
    taskStatus: 'TODO',
    startDate: '',
    endDate: ''
  }
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
        startDate: today,
        endDate: today
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
</style>

