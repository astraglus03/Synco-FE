<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isOpen', 'save', 'close', 'toggle-lock'])

// 문서 내용
const documentContent = ref('')
const originalContent = ref('')
const isModified = ref(false)

// 편집 상태
const isEditing = ref(true)
const isSaving = ref(false)
const lastSaved = ref(null)

// 실시간 편집 시뮬레이션 (실제로는 WebSocket 등을 사용)
const collaborators = ref([
  { id: 1, name: '김민수', avatar: '김', color: '#2196f3', cursor: 0 },
  { id: 2, name: '이지현', avatar: '이', color: '#4caf50', cursor: 0 },
  { id: 3, name: '박준호', avatar: '박', color: '#ff9800', cursor: 0 }
])

// 문서 초기화
const initializeDocument = () => {
  if (props.document) {
    documentContent.value = props.document.content || '문서를 작성해보세요...'
    originalContent.value = props.document.content || ''
    isModified.value = false
    lastSaved.value = new Date()
  }
}

// 내용 변경 감지
const handleContentChange = () => {
  isModified.value = documentContent.value !== originalContent.value
}

// 문서 저장
const saveDocument = async () => {
  isSaving.value = true
  
  try {
    // 실제로는 API 호출
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    originalContent.value = documentContent.value
    isModified.value = false
    lastSaved.value = new Date()
    
    emit('save', {
      id: props.document.id,
      content: documentContent.value,
      modifiedDate: new Date().toISOString()
    })
  } catch (error) {
    console.error('문서 저장 실패:', error)
  } finally {
    isSaving.value = false
  }
}

// 문서 다운로드 (한글 파일)
const downloadDocument = () => {
  const content = documentContent.value
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.document.name}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 잠금 토글
const toggleLock = () => {
  // 부모 컴포넌트에 잠금 토글 이벤트 전달
  emit('toggle-lock', props.document.id)
}

// 모달 닫기
const closeEditor = () => {
  if (isModified.value) {
    if (confirm('저장되지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?')) {
      emit('close')
    }
  } else {
    emit('close')
  }
}

// 자동 저장 (5초마다)
let autoSaveInterval = null

const startAutoSave = () => {
  autoSaveInterval = setInterval(() => {
    if (isModified.value && !isSaving.value) {
      saveDocument()
    }
  }, 5000)
}

const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
    autoSaveInterval = null
  }
}

// 키보드 단축키
const handleKeydown = (event) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 's':
        event.preventDefault()
        saveDocument()
        break
      case 'w':
        event.preventDefault()
        closeEditor()
        break
    }
  }
}

// 실시간 편집 시뮬레이션
const simulateCollaboration = () => {
  setInterval(() => {
    const randomCollaborator = collaborators.value[Math.floor(Math.random() * collaborators.value.length)]
    randomCollaborator.cursor = Math.floor(Math.random() * documentContent.value.length)
  }, 3000)
}

// 생명주기
onMounted(() => {
  initializeDocument()
  startAutoSave()
  simulateCollaboration()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopAutoSave()
  document.removeEventListener('keydown', handleKeydown)
})

// 문서 변경 감지
watch(() => props.document, () => {
  initializeDocument()
}, { deep: true })

// 수정 시간 포맷팅
const formatLastSaved = computed(() => {
  if (!lastSaved.value) return ''
  return lastSaved.value.toLocaleTimeString('ko-KR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
})

// 협업자 상태
const activeCollaborators = computed(() => {
  return collaborators.value.filter(c => c.cursor > 0)
})
</script>

<template>
  <v-dialog :model-value="isOpen" max-width="1200px" fullscreen @update:model-value="$emit('update:isOpen', $event)">
    <v-card class="shared-doc-editor">
      <!-- 헤더 -->
      <div class="editor-header">
        <div class="header-left">
          <v-btn icon="mdi-arrow-left" variant="text" @click="closeEditor" class="back-btn">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <div class="document-info">
            <h2 class="document-title">{{ document.name }}</h2>
            <div class="document-meta">
              <span class="document-type">공유문서</span>
              <v-icon v-if="document.isLocked" class="lock-icon" size="16">mdi-lock</v-icon>
            </div>
          </div>
        </div>
        
        <div class="header-center">
          <div class="collaborators">
            <span class="collaborators-label">협업자:</span>
            <div class="collaborator-avatars">
              <v-avatar
                v-for="collaborator in activeCollaborators"
                :key="collaborator.id"
                size="24"
                :style="{ backgroundColor: collaborator.color }"
                class="collaborator-avatar"
              >
                {{ collaborator.avatar }}
              </v-avatar>
            </div>
          </div>
        </div>
        
        <div class="header-right">
          <div class="save-status">
            <v-icon v-if="isSaving" class="saving-icon" size="16">mdi-loading</v-icon>
            <span v-if="isSaving" class="status-text">저장 중...</span>
            <span v-else-if="isModified" class="status-text modified">수정됨</span>
            <span v-else class="status-text">저장됨 {{ formatLastSaved }}</span>
          </div>
          
          <v-btn
            :icon="document.isLocked ? 'mdi-lock-open' : 'mdi-lock'"
            variant="text"
            @click="toggleLock"
            class="lock-btn"
            :title="document.isLocked ? '잠금 해제' : '잠금'"
          >
            <v-icon>{{ document.isLocked ? 'mdi-lock-open' : 'mdi-lock' }}</v-icon>
          </v-btn>
          
          <v-btn
            icon="mdi-download"
            variant="text"
            @click="downloadDocument"
            class="download-btn"
            title="다운로드"
          >
            <v-icon>mdi-download</v-icon>
          </v-btn>
          
          <v-btn
            color="primary"
            @click="saveDocument"
            :loading="isSaving"
            :disabled="!isModified"
            class="save-btn"
          >
            <v-icon left>mdi-content-save</v-icon>
            저장
          </v-btn>
        </div>
      </div>

      <!-- 편집 영역 -->
      <div class="editor-content">
        <div class="editor-toolbar">
          <div class="toolbar-left">
            <v-btn-group variant="text" density="compact">
              <v-btn icon="mdi-format-bold" size="small" title="굵게"></v-btn>
              <v-btn icon="mdi-format-italic" size="small" title="기울임"></v-btn>
              <v-btn icon="mdi-format-underline" size="small" title="밑줄"></v-btn>
            </v-btn-group>
            
            <v-divider vertical class="mx-2"></v-divider>
            
            <v-btn-group variant="text" density="compact">
              <v-btn icon="mdi-format-list-bulleted" size="small" title="글머리 기호"></v-btn>
              <v-btn icon="mdi-format-list-numbered" size="small" title="번호 매기기"></v-btn>
            </v-btn-group>
          </div>
          
          <div class="toolbar-right">
            <v-btn
              icon="mdi-eye"
              variant="text"
              size="small"
              :color="isEditing ? 'primary' : ''"
              @click="isEditing = !isEditing"
              title="편집 모드"
            >
              <v-icon>mdi-eye</v-icon>
            </v-btn>
          </div>
        </div>
        
        <div class="editor-main">
          <v-textarea
            v-model="documentContent"
            @input="handleContentChange"
            variant="plain"
            placeholder="문서를 작성해보세요..."
            class="document-textarea"
            :readonly="!isEditing"
            auto-grow
            rows="20"
          />
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.shared-doc-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 헤더 */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.document-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.document-title {
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.document-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.lock-icon {
  color: #ff9800;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.collaborators {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collaborators-label {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.collaborator-avatars {
  display: flex;
  gap: 4px;
}

.collaborator-avatar {
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.saving-icon {
  animation: spin 1s linear infinite;
}

.status-text {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.status-text.modified {
  color: #ff9800;
}

.lock-btn {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.lock-btn:hover {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.download-btn {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.save-btn {
  text-transform: none;
}

/* 편집 영역 */
.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.document-textarea {
  width: 100%;
  min-height: 500px;
  font-size: 16px;
  line-height: 1.6;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.document-textarea :deep(.v-field__input) {
  min-height: 500px;
  padding: 0;
  font-family: 'Noto Sans KR', sans-serif;
}

.document-textarea :deep(textarea) {
  min-height: 500px;
  padding: 0;
  font-family: 'Noto Sans KR', sans-serif;
  resize: none;
}

/* 애니메이션 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 반응형 */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-center {
    order: 3;
    width: 100%;
    justify-content: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .editor-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .toolbar-right {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
