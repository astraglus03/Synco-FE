<template>
  <v-dialog v-model="isOpen" max-width="800px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left color="primary">{{ isEditMode ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
        {{ isEditMode ? '업무 수정' : '새 업무 생성' }}
      </v-card-title>
      
       <v-card-text>
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
                  required
                ></v-textarea>
              </div>

              <!-- 날짜 필드들 -->
              <div class="mb-4">
                <v-row>
                  <v-col cols="6">
                    <label class="text-subtitle-1 font-weight-medium mb-2 d-block">시작일</label>
                    <v-text-field
                      v-model="taskData.startDate"
                      type="date"
                      :rules="dateRules"
                      outlined
                      required
                    ></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <label class="text-subtitle-1 font-weight-medium mb-2 d-block">종료일</label>
                    <v-text-field
                      v-model="taskData.endDate"
                      type="date"
                      :rules="dateRules"
                      outlined
                      required
                    ></v-text-field>
                  </v-col>
                </v-row>
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
import { ref, computed, watch, onMounted } from 'vue'
import { getProjectMemberList, createTask as createTaskApi, updateTask as updateTaskApi } from '../../api/schedule/scheduleApi.js'

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
const isLoadingMembers = ref(false)

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

// 프로젝트 멤버 목록 로드
const loadProjectMembers = async () => {
  try {
    isLoadingMembers.value = true
    const response = await getProjectMemberList(props.projectId)
    if (response.success) {
      projectMembers.value = response.data
    }
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
      const response = await createTaskApi(taskData.value)
      
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
  taskData.value = {
    taskTitle: '',
    taskContent: '',
    taskStatus: 'TODO',
    startDate: '',
    endDate: '',
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
      const today = new Date().toISOString().split('T')[0]
      taskData.value = {
        taskTitle: '',
        taskContent: '',
        taskStatus: 'TODO',
        startDate: today,
        endDate: today,
        picMemberSeq: null,
        boardSeq: null
      }
    }
  }
})

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  resetForm()
})
</script>

<style scoped>
.v-card-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  padding: 24px 24px 0 24px;
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
