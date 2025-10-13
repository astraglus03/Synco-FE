import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDocumentStore = defineStore('document', () => {
  // 현재 문서 정보
  const currentDocument = ref(null)
  const currentUser = ref({
    id: 1, // 하드코딩 - 나중에 DB에서 가져올 예정
    name: '김민수',
    color: '#3B82F6',
    avatar: '김'
  })
  
  // 연결 상태
  const isConnected = ref(false)
  const connectionError = ref(null)
  
  // 온라인 사용자 목록
  const onlineUsers = ref(new Map())
  
  // 사용자 커서 위치
  const userCursors = ref(new Map())
  
  // 문서 편집 상태
  const isEditing = ref(false)
  const isModified = ref(false)
  const isSaving = ref(false)
  const lastSaved = ref(null)
  
  // 현재 문서 설정
  const setCurrentDocument = (document) => {
    currentDocument.value = document
  }
  
  // 현재 문서 초기화
  const clearDocument = () => {
    currentDocument.value = null
    onlineUsers.value.clear()
    userCursors.value.clear()
    isEditing.value = false
    isModified.value = false
    isSaving.value = false
    lastSaved.value = null
  }
  
  // 연결 상태 설정
  const setConnectionStatus = (status) => {
    isConnected.value = status
    if (!status) {
      connectionError.value = '연결이 끊어졌습니다'
    } else {
      connectionError.value = null
    }
  }
  
  // 온라인 사용자 추가
  const addOnlineUser = (user) => {
    onlineUsers.value.set(user.id, user)
  }
  
  // 온라인 사용자 제거
  const removeOnlineUser = (userId) => {
    onlineUsers.value.delete(userId)
    userCursors.value.delete(userId)
  }
  
  // 사용자 커서 업데이트
  const updateUserCursor = (userId, cursorData) => {
    userCursors.value.set(userId, {
      ...cursorData,
      timestamp: Date.now()
    })
  }
  
  // 편집 상태 설정
  const setEditing = (editing) => {
    isEditing.value = editing
  }
  
  // 수정 상태 설정
  const setModified = (modified) => {
    isModified.value = modified
  }
  
  // 저장 상태 설정
  const setSaving = (saving) => {
    isSaving.value = saving
  }
  
  // 마지막 저장 시간 설정
  const setLastSaved = (timestamp) => {
    lastSaved.value = timestamp
  }
  
  // 계산된 속성들
  const onlineUsersList = computed(() => {
    return Array.from(onlineUsers.value.values())
  })
  
  const userCursorsList = computed(() => {
    return Array.from(userCursors.value.entries()).map(([userId, cursorData]) => ({
      userId,
      ...cursorData
    }))
  })
  
  const documentName = computed(() => {
    return currentDocument.value?.name || '새 문서'
  })
  
  const isDocumentLocked = computed(() => {
    return currentDocument.value?.isLocked || false
  })
  
  const formatLastSaved = computed(() => {
    if (!lastSaved.value) return ''
    return new Date(lastSaved.value).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  })
  
  return {
    // 상태
    currentDocument,
    currentUser,
    isConnected,
    connectionError,
    onlineUsers,
    userCursors,
    isEditing,
    isModified,
    isSaving,
    lastSaved,
    
    // 액션
    setCurrentDocument,
    clearDocument,
    setConnectionStatus,
    addOnlineUser,
    removeOnlineUser,
    updateUserCursor,
    setEditing,
    setModified,
    setSaving,
    setLastSaved,
    
    // 계산된 속성
    onlineUsersList,
    userCursorsList,
    documentName,
    isDocumentLocked,
    formatLastSaved
  }
})
