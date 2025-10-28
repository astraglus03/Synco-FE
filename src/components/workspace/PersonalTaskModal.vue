<template>
  <v-dialog v-model="isOpen" max-width="600px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left color="primary">{{ isEditMode ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
        {{ isEditMode ? '일정 수정' : '새 일정 추가' }}
      </v-card-title>
      
      <v-card-text>
        <v-form ref="formRef" v-model="isFormValid">
          <!-- 일정 제목 -->
          <div class="mb-4">
            <v-text-field
              v-model="taskData.taskTitle"
              label="제목"
              placeholder="예: 회의 준비"
              :rules="titleRules"
              variant="outlined"
              required
            ></v-text-field>
          </div>

          <!-- 일정 내용 -->
          <div class="mb-4">
            <v-textarea
              v-model="taskData.taskContent"
              label="내용"
              placeholder="일정에 대한 자세한 설명을 입력하세요..."
              :rules="contentsRules"
              variant="outlined"
              rows="4"
              required
            ></v-textarea>
          </div>

          <!-- 일정 상태 -->
          <div class="mb-4">
            <v-select
              v-model="taskData.taskStatus"
              label="상태"
              :items="taskStatusOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              required
            ></v-select>
          </div>

          <!-- 날짜 필드들 -->
          <div class="mb-4">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="taskData.startDate"
                  label="시작일"
                  type="date"
                  :rules="dateRules"
                  variant="outlined"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="taskData.endDate"
                  label="종료일"
                  type="date"
                  :rules="dateRules"
                  variant="outlined"
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-btn
          variant="outlined"
          @click="closeModal"
          :disabled="isCreating"
        >
          취소
        </v-btn>
        <v-spacer></v-spacer>
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
import { ref, computed, watch } from 'vue'
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
.v-card-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  padding: 24px 24px 10px 24px;
}

.v-card-text {
  padding: 24px;
}

.v-card-actions {
  padding: 0 24px 24px 24px;
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
</style>

