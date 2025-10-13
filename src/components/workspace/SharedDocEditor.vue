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
            <h2 class="document-title">{{ documentStore.documentName }}</h2>
            <div class="document-meta">
              <span class="document-type">공유문서</span>
              <v-icon v-if="documentStore.isDocumentLocked" class="lock-icon" size="16">mdi-lock</v-icon>
              <v-chip
                :color="isConnected ? 'success' : 'error'"
                size="small"
                variant="flat"
                class="connection-status"
              >
                <v-icon start>{{ isConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}</v-icon>
                {{ isConnected ? '연결됨' : '연결 끊김' }}
              </v-chip>
            </div>
          </div>
        </div>
        
        <div class="header-center">
          <div class="collaborators">
            <span class="collaborators-label">협업자:</span>
            <div class="collaborator-avatars">
              <v-tooltip
                v-for="user in documentStore.onlineUsersList"
                :key="user.id"
                :text="`${user.name} (${user.cursorPosition || 0}번째 위치)`"
                location="bottom"
              >
                <template v-slot:activator="{ props }">
                  <v-avatar
                    v-bind="props"
                    size="24"
                    :style="{ backgroundColor: user.color }"
                    class="collaborator-avatar"
                  >
                    {{ user.avatar }}
                  </v-avatar>
                </template>
              </v-tooltip>
            </div>
          </div>
        </div>
        
        <div class="header-right">
          <div class="save-status">
            <v-icon v-if="documentStore.isSaving" class="saving-icon" size="16">mdi-loading</v-icon>
            <span v-if="documentStore.isSaving" class="status-text">저장 중...</span>
            <span v-else-if="documentStore.isModified" class="status-text modified">수정됨</span>
            <span v-else class="status-text">저장됨 {{ documentStore.formatLastSaved }}</span>
          </div>
          
          <v-btn
            :icon="documentStore.isDocumentLocked ? 'mdi-lock-open' : 'mdi-lock'"
            variant="text"
            @click="toggleLock"
            class="lock-btn"
            :title="documentStore.isDocumentLocked ? '잠금 해제' : '잠금'"
          >
            <v-icon>{{ documentStore.isDocumentLocked ? 'mdi-lock-open' : 'mdi-lock' }}</v-icon>
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
            :loading="documentStore.isSaving"
            :disabled="!documentStore.isModified"
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
              <v-btn 
                icon="mdi-format-bold" 
                size="small" 
                title="굵게"
                :class="{ 'v-btn--active': editor?.isActive('bold') }"
                @click="editor?.chain().focus().toggleBold().run()"
              ></v-btn>
              <v-btn 
                icon="mdi-format-italic" 
                size="small" 
                title="기울임"
                :class="{ 'v-btn--active': editor?.isActive('italic') }"
                @click="editor?.chain().focus().toggleItalic().run()"
              ></v-btn>
              <v-btn 
                icon="mdi-format-strikethrough" 
                size="small" 
                title="취소선"
                :class="{ 'v-btn--active': editor?.isActive('strike') }"
                @click="editor?.chain().focus().toggleStrike().run()"
              ></v-btn>
            </v-btn-group>
            
            <v-divider vertical class="mx-2"></v-divider>
            
            <v-btn-group variant="text" density="compact">
              <v-btn 
                icon="mdi-format-header-1" 
                size="small" 
                title="제목 1"
                :class="{ 'v-btn--active': editor?.isActive('heading', { level: 1 }) }"
                @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
              ></v-btn>
              <v-btn 
                icon="mdi-format-header-2" 
                size="small" 
                title="제목 2"
                :class="{ 'v-btn--active': editor?.isActive('heading', { level: 2 }) }"
                @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
              ></v-btn>
              <v-btn 
                icon="mdi-format-header-3" 
                size="small" 
                title="제목 3"
                :class="{ 'v-btn--active': editor?.isActive('heading', { level: 3 }) }"
                @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
              ></v-btn>
            </v-btn-group>
            
            <v-divider vertical class="mx-2"></v-divider>
            
            <v-btn-group variant="text" density="compact">
              <v-btn 
                icon="mdi-format-list-bulleted" 
                size="small" 
                title="글머리 기호"
                :class="{ 'v-btn--active': editor?.isActive('bulletList') }"
                @click="editor?.chain().focus().toggleBulletList().run()"
              ></v-btn>
              <v-btn 
                icon="mdi-format-list-numbered" 
                size="small" 
                title="번호 매기기"
                :class="{ 'v-btn--active': editor?.isActive('orderedList') }"
                @click="editor?.chain().focus().toggleOrderedList().run()"
              ></v-btn>
            </v-btn-group>
          </div>
          
          <div class="toolbar-right">
            <v-btn
              icon="mdi-eye"
              variant="text"
              size="small"
              :color="documentStore.isEditing ? 'primary' : ''"
              @click="documentStore.setEditing(!documentStore.isEditing)"
              title="편집 모드"
            >
              <v-icon>mdi-eye</v-icon>
            </v-btn>
          </div>
        </div>
        
        <div class="editor-main">
          <div class="editor-wrapper">
            <textarea
              v-model="editorContent"
              class="yjs-editor"
              placeholder="문서를 작성해보세요..."
              @input="handleContentChange"
              @keyup="handleCursorUpdate"
            ></textarea>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as Y from 'yjs'
import { useDocumentStore } from '@/store/documentStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from '@/utils/api'

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

// 스토어 및 컴포저블
const documentStore = useDocumentStore()
const { connect, disconnect, sendYjsUpdate, sendCursorUpdate, setYjsUpdateCallback } = useWebSocket()

// 에디터 관련
const editorContent = ref('')
const ydoc = ref(null)
const yText = ref(null)
const isUpdatingFromYjs = ref(false)

// 연결 상태
const isConnected = computed(() => documentStore.isConnected)

// 텍스트 변경 핸들러
const handleContentChange = () => {
  if (!yText.value || isUpdatingFromYjs.value) return
  
  // 현재 YJS 텍스트와 textarea 내용이 다를 때만 업데이트
  const currentYjsText = yText.value.toString()
  if (currentYjsText !== editorContent.value) {
    // YJS 텍스트를 textarea 내용으로 교체
    yText.value.delete(0, currentYjsText.length)
    yText.value.insert(0, editorContent.value)
  }
}

// 커서 위치 업데이트 핸들러
const handleCursorUpdate = (event) => {
  if (isConnected.value) {
    const cursorPosition = event.target.selectionStart
    sendCursorUpdate(props.document.id, cursorPosition)
  }
}

// 문서 초기화
const initializeEditor = async () => {
  if (!props.document) return
  
  try {
    console.log('📝 문서 초기화 시작:', props.document)
    
    // 문서 정보를 스토어에 설정
    documentStore.setCurrentDocument(props.document)
    
    // YJS 문서 생성 및 초기화
    ydoc.value = new Y.Doc()
    
    // YJS 문서에 초기 텍스트 설정
    yText.value = ydoc.value.getText('content')
    yText.value.insert(0, props.document.content || '문서를 작성해보세요...')
    
    // 초기 내용을 에디터에 설정
    editorContent.value = yText.value.toString()
    
    // YJS 텍스트 변경 감지
    yText.value.observe((event) => {
      console.log('📝 YJS 텍스트 변경:', event)
      
      // YJS에서 업데이트 중임을 표시
      isUpdatingFromYjs.value = true
      editorContent.value = yText.value.toString()
      isUpdatingFromYjs.value = false
      
      documentStore.setModified(true)
      
      // YJS 업데이트를 STOMP로 전송
      if (isConnected.value) {
        try {
          const update = Y.encodeStateAsUpdate(ydoc.value)
          const updateBase64 = btoa(String.fromCharCode(...update))
          sendYjsUpdate(props.document.id, updateBase64, yText.value.toString())
        } catch (error) {
          console.error('❌ YJS 업데이트 인코딩 실패:', error)
        }
      }
    })
    
    // YJS 업데이트 콜백 설정
    setYjsUpdateCallback((update) => {
      console.log('📥 YJS 업데이트 적용:', update)
      try {
        Y.applyUpdate(ydoc.value, update)
      } catch (error) {
        console.error('❌ YJS 업데이트 적용 실패:', error)
      }
    })
    
    // WebSocket 연결
    await connect(props.document.id)
    
    // 초기 문서 내용 로드
    await loadDocumentContent()
    
    console.log('✅ 문서 초기화 완료')
    
  } catch (error) {
    console.error('❌ 문서 초기화 오류:', error)
  }
}

// 문서 내용 로드 (API)
const loadDocumentContent = async () => {
  try {
    const response = await axios.get(`/drive/project/${props.document.driveChannelSeq}/documents/${props.document.id}`)
    const docDetail = response.data.data
    if (docDetail && docDetail.content) {
      const fullContent = docDetail.content.join('\n')
      editor.value.commands.setContent(fullContent)
      documentStore.setModified(false)
    }
  } catch (error) {
    console.error('❌ 문서 내용 로드 실패:', error)
  }
}

// 문서 저장 (API)
const saveDocument = async () => {
  documentStore.setSaving(true)
  
  try {
    const content = editor.value.getHTML()
    const textContent = editor.value.getText()
    
    console.log('💾 문서 저장 시작:', props.document.id)
    
    // 백엔드 API 호출
    await axios.put(`/drive/project/${props.document.driveChannelSeq}/documents/${props.document.id}`, {
      documentSeq: props.document.id,
      driveChannelSeq: props.document.driveChannelSeq,
      content: textContent // 백엔드는 textContent를 저장
    })
    
    documentStore.setModified(false)
    documentStore.setLastSaved(Date.now())
    
    emit('save', {
      id: props.document.id,
      content: textContent,
      modifiedDate: new Date().toISOString()
    })
    
    console.log('✅ 문서 저장 성공')
    
  } catch (error) {
    console.error('❌ 문서 저장 실패:', error)
  } finally {
    documentStore.setSaving(false)
  }
}

// 문서 다운로드
const downloadDocument = async () => {
  try {
    const response = await axios.get(`/drive/project/${props.document.driveChannelSeq}/documents/${props.document.id}/download`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${props.document.name}.txt`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    console.log('✅ 문서 다운로드 성공')
  } catch (error) {
    console.error('❌ 문서 다운로드 실패:', error)
  }
}

// 잠금 토글 (API)
const toggleLock = async () => {
  try {
    const response = await axios.post(`/drive/project/documents/lock`, {
      driveChannelSeq: props.document.driveChannelSeq,
      documentSeq: props.document.id
    })
    
    emit('toggle-lock', props.document.id)
    console.log('✅ 문서 잠금 상태 변경 성공:', response.data)
  } catch (error) {
    console.error('❌ 문서 잠금 상태 변경 오류:', error)
  }
}

// 에디터 닫기
const closeEditor = () => {
  if (documentStore.isModified) {
    if (confirm('저장되지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?')) {
      cleanup()
      emit('close')
    }
  } else {
    cleanup()
    emit('close')
  }
}

// 정리 작업
const cleanup = () => {
  if (yText.value) {
    yText.value.unobserve()
    yText.value = null
  }
  
  if (ydoc.value) {
    ydoc.value.destroy()
    ydoc.value = null
  }
  
  editorContent.value = ''
  
  disconnect()
  documentStore.clearDocument()
}

// 자동 저장 (30초마다)
let autoSaveInterval = null

const startAutoSave = () => {
  autoSaveInterval = setInterval(() => {
    if (documentStore.isModified && !documentStore.isSaving) {
      console.log('⏰ 자동 저장 중...')
      saveDocument()
    }
  }, 30000) // 30초
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

// 생명주기
onMounted(async () => {
  console.log('🚀 SharedDocEditor 마운트됨')
  await nextTick()
  
  if (props.isOpen) {
    await initializeEditor()
    startAutoSave()
  }
  
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  console.log('🛑 SharedDocEditor 언마운트됨')
  stopAutoSave()
  cleanup()
  document.removeEventListener('keydown', handleKeydown)
})

// props.isOpen 변경 감지
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    await initializeEditor()
    startAutoSave()
  } else {
    stopAutoSave()
    cleanup()
  }
})

// 문서 변경 감지 (부모로부터)
watch(() => props.document, (newDoc) => {
  if (newDoc && editor.value) {
    // 문서 내용이 변경되었을 경우 에디터 업데이트
    const newContent = newDoc.content.join('\n')
    if (editor.value.getHTML() !== newContent) {
      editor.value.commands.setContent(newContent)
      documentStore.setModified(false)
    }
  }
}, { deep: true })
</script>

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

.connection-status {
  font-size: 12px;
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

.editor-wrapper {
  width: 100%;
  min-height: 500px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* YJS 에디터 스타일 */
.yjs-editor {
  width: 100%;
  min-height: 500px;
  font-size: 16px;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface));
  font-family: 'Noto Sans KR', sans-serif;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  padding: 0;
}

.editor-wrapper :deep(.ProseMirror h1) {
  font-size: 28px;
  font-weight: 700;
  margin: 24px 0 16px 0;
  color: rgb(var(--v-theme-on-surface));
}

.editor-wrapper :deep(.ProseMirror h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 20px 0 12px 0;
  color: rgb(var(--v-theme-on-surface));
}

.editor-wrapper :deep(.ProseMirror h3) {
  font-size: 20px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: rgb(var(--v-theme-on-surface));
}

.editor-wrapper :deep(.ProseMirror p) {
  margin: 8px 0;
}

.editor-wrapper :deep(.ProseMirror ul),
.editor-wrapper :deep(.ProseMirror ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.editor-wrapper :deep(.ProseMirror blockquote) {
  border-left: 4px solid rgba(var(--v-theme-on-surface), 0.2);
  padding-left: 16px;
  margin: 16px 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-style: italic;
}

.editor-wrapper :deep(.ProseMirror code) {
  background: rgba(var(--v-theme-on-surface), 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

.editor-wrapper :deep(.ProseMirror pre) {
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.editor-wrapper :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
}

/* 협업 커서 스타일 */
.editor-wrapper :deep(.ProseMirror .collaboration-cursor__caret) {
  position: relative;
  margin-left: -1px;
  margin-right: -1px;
  border-left: 1px solid #0d7377;
  border-right: 1px solid #0d7377;
  word-break: normal;
  pointer-events: none;
}

.editor-wrapper :deep(.ProseMirror .collaboration-cursor__label) {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  user-select: none;
  color: #0d7377;
  padding: 0.1rem 0.3rem;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
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