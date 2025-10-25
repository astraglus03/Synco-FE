<template>
  <v-dialog :model-value="isOpen" @update:model-value="$emit('update:isOpen', $event)" max-width="600px" persistent>
    <v-card class="board-create-modal">
      <!-- 헤더 -->
      <div class="modal-header">
        <div class="header-content">
          <v-icon class="header-icon" color="primary">mdi-folder-plus</v-icon>
          <div class="header-text">
            <h3 class="modal-title">새 보드 추가</h3>
            <p class="modal-subtitle">프로젝트를 위한 보드를 생성하세요</p>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          class="close-btn"
          @click="closeModal"
        />
      </div>

      <v-card-text class="modal-body">
        <v-form ref="formRef" v-model="isFormValid">
          <!-- 기본 정보 섹션 -->
          <div class="section">
            <div class="section-header">
              <div class="section-bar"></div>
              <h4 class="section-title">기본 정보</h4>
            </div>
            
            <div class="input-group">
              <label class="input-label">보드 이름 *</label>
              <v-text-field
                v-model="boardData.boardName"
                placeholder="보드 이름을 입력하세요"
                :rules="boardNameRules"
                outlined
                required
              ></v-text-field>
            </div>
          </div>

          <!-- 색상 선택 섹션 -->
          <div class="section">
            <div class="section-header">
              <div class="section-bar"></div>
              <h4 class="section-title">색상 선택</h4>
            </div>
            
            <div class="color-grid">
              <div
                v-for="color in colorOptions"
                :key="color.value"
                class="color-option"
                :class="{ 'selected': boardData.colors === color.value }"
                :style="{ backgroundColor: color.value }"
                @click="selectColor(color.value)"
              >
                <v-icon v-if="boardData.colors === color.value" color="white" size="20">
                  mdi-check
                </v-icon>
              </div>
            </div>
            
            <div class="selected-color-info">
              <span class="selected-color-label">선택된 색상:</span>
              <div 
                class="selected-color-preview"
                :style="{ backgroundColor: boardData.colors }"
              ></div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <!-- 푸터 버튼들 -->
      <v-card-actions class="modal-actions">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-close"
          @click="closeModal"
          :disabled="isCreating"
        >
          취소
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="createBoard"
          :loading="isCreating"
          :disabled="!isFormValid || !boardData.colors"
        >
          보드 생성
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { createBoard as createBoardApi, getProjectMemberList } from '../../api/schedule/scheduleApi.js'
import { useWorkspaceStore } from '../../store/workspaceStore.js'
import { useWorkspaceMemberStore } from '../../store/workspaceMemberStore.js'
import { useAuthStore } from '../../store/authStore.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isOpen', 'board-created'])

// Store
const workspaceStore = useWorkspaceStore()
const workspaceMemberStore = useWorkspaceMemberStore()
const authStore = useAuthStore()

// 폼 관련
const formRef = ref(null)
const isFormValid = ref(false)
const isCreating = ref(false)

// 보드 데이터
const boardData = ref({
  boardName: '',
  colors: '' // 색상 미선택 상태
})

// 색상 옵션들 (더 진한 색상)
const colorOptions = ref([
  { value: '#bbdefb', name: '파란색' },
  { value: '#ffe0b2', name: '주황색' },
  { value: '#c8e6c9', name: '초록색' },
  { value: '#e1bee7', name: '보라색' },
  { value: '#b2dfdb', name: '청록색' },
  { value: '#f8bbd9', name: '분홍색' },
  { value: '#dcedc8', name: '연두색' },
  { value: '#c5cae9', name: '연보라색' }
])

// 폼 검증 규칙
const boardNameRules = ref([
  v => !!v || '보드 이름을 입력해주세요',
  v => (v && v.length >= 2) || '보드 이름은 2글자 이상이어야 합니다',
  v => (v && v.length <= 20) || '보드 이름은 20글자 이하여야 합니다'
])

// 현재 사용자의 scheduleManagementChannelMemberSeq 찾기
const currentUserScheduleMemberSeq = ref(null)

// 현재 사용자의 scheduleManagementChannelMemberSeq 찾는 함수
const findCurrentUserScheduleMemberSeq = async () => {
  try {
    const currentProjectId = workspaceStore.currentWorkspaceInfo?.workSpaceSeq
    
    if (currentProjectId) {
      const response = await getProjectMemberList(currentProjectId)
      
      if (response.success && response.data) {
        // 현재 사용자 찾기
        const currentUser = response.data.find(member => 
          Number(member.memberSeq) === Number(authStore.memberSeq)
        )
        currentUserScheduleMemberSeq.value = currentUser?.scheduleManagementChannelMemberSeq || null
      }
    }
  } catch (error) {
    console.error('멤버 목록 조회 실패:', error)
    currentUserScheduleMemberSeq.value = null
  }
}

// 색상 선택
const selectColor = (color) => {
  boardData.value.colors = color
}

// 보드 생성
const createBoard = async () => {
  if (!formRef.value) return
  
  const isValid = await formRef.value.validate()
  if (!isValid) return

  // 사용자 정보가 없다면 다시 찾기 시도
  if (!currentUserScheduleMemberSeq.value) {
    await findCurrentUserScheduleMemberSeq()
  }

  if (!currentUserScheduleMemberSeq.value) {
    alert('사용자 정보를 찾을 수 없습니다.')
    return
  }

  try {
    isCreating.value = true

    const requestData = {
      boardName: boardData.value.boardName,
      colors: boardData.value.colors,
      scheduleManagementChannelMemberSeq: currentUserScheduleMemberSeq.value
    }

    await createBoardApi(requestData)
    
    alert('보드가 성공적으로 생성되었습니다!')
    emit('board-created')
    closeModal()
    
  } catch (error) {
    console.error('보드 생성 실패:', error)
    alert('보드 생성에 실패했습니다. 다시 시도해주세요.')
  } finally {
    isCreating.value = false
  }
}

// 모달 닫기
const closeModal = () => {
  emit('update:isOpen', false)
}

// 폼 초기화
const resetForm = () => {
  boardData.value = {
    boardName: '',
    colors: ''
  }
  if (formRef.value) {
    formRef.value.resetValidation()
  }
}

// 모달이 열릴 때 폼 초기화 및 사용자 정보 찾기
watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    resetForm()
    await findCurrentUserScheduleMemberSeq()
  }
})
</script>

<style scoped>
.board-create-modal {
  border-radius: 16px;
  overflow: hidden;
}

/* 헤더 스타일 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 16px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.header-icon {
  font-size: 28px;
  margin-top: 4px;
}

.header-text {
  flex: 1;
}

.modal-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #2c3e50;
}

.modal-subtitle {
  font-size: 14px;
  color: #6c757d;
  margin: 0;
}

.close-btn {
  color: #6c757d;
}

/* 본문 스타일 */
.modal-body {
  padding: 24px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.section-bar {
  width: 4px;
  height: 20px;
  background-color: #3498db;
  margin-right: 12px;
  border-radius: 2px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

/* 색상 선택 스타일 */
.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.color-option {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 3px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-option.selected {
  border-color: #2c3e50;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.selected-color-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-color-label {
  font-size: 14px;
  color: #495057;
}

.selected-color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

/* 푸터 스타일 */
.modal-actions {
  padding: 16px 24px 24px 24px;
  justify-content: space-between;
  background-color: #f8f9fa;
}

.modal-actions .v-btn {
  min-width: 120px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .modal-header {
    padding: 20px 20px 12px 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-actions {
    padding: 12px 20px 20px 20px;
  }
  
  .color-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  
  .color-option {
    width: 44px;
    height: 44px;
  }
}
</style>
