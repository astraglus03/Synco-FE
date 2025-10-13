import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { driveApi } from '@/api/drive/driveApi'
import { DriveItem, DocumentDetail } from '@/models/drive/DriveModels'

// 통합 드라이브 스토어
export const useDriveStore = defineStore('drive', () => {
  // 상태
  const items = ref([])
  const currentPath = ref([])
  const currentParentId = ref(null)
  const currentDriveChannelSeq = ref(null)
  const isPersonal = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  const selectedItems = ref([])
  
  // 현재 문서 정보
  const currentDocument = ref(null)
  const documentContent = ref('')

  // 계산된 속성
  const currentPathString = computed(() => {
    return currentPath.value.map(folder => folder.name).join(' / ')
  })

  const folders = computed(() => {
    return items.value.filter(item => item.type === 'folder')
  })

  const files = computed(() => {
    return items.value.filter(item => item.type !== 'folder' && item.type !== 'shared-doc')
  })

  const sharedDocs = computed(() => {
    return items.value.filter(item => item.type === 'shared-doc')
  })

  const selectedItemsList = computed(() => {
    return items.value.filter(item => selectedItems.value.includes(item.id))
  })

  // 액션
  const loadItems = async (driveChannelSeq, parentId = null, personal = false) => {
    isLoading.value = true
    error.value = null
    currentDriveChannelSeq.value = driveChannelSeq
    isPersonal.value = personal

    try {
      const result = await driveApi.getItems(driveChannelSeq, parentId, personal)
      
      if (result.success) {
        items.value = result.data
        currentParentId.value = parentId
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = '목록을 불러오는데 실패했습니다.'
      console.error('드라이브 목록 로드 실패:', err)
    } finally {
      isLoading.value = false
    }
  }

  const uploadFiles = async (files, parentId = null) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await driveApi.uploadFiles(files, currentDriveChannelSeq.value, parentId || currentParentId.value, isPersonal.value)
      
      if (result.success) {
        items.value.push(...result.data)
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '파일 업로드에 실패했습니다.'
      console.error('파일 업로드 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const createFolder = async (name, parentId = null) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await driveApi.createFolder(name, currentDriveChannelSeq.value, parentId || currentParentId.value, isPersonal.value)
      
      if (result.success) {
        items.value.push(result.data)
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '폴더 생성에 실패했습니다.'
      console.error('폴더 생성 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const createSharedDocument = async (name, parentId = null, isLocked = false) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await driveApi.createSharedDocument(name, currentDriveChannelSeq.value, parentId || currentParentId.value, isPersonal.value, isLocked)
      
      if (result.success) {
        items.value.push(result.data)
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '공유문서 생성에 실패했습니다.'
      console.error('공유문서 생성 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const deleteItem = async (itemId, itemType) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await driveApi.deleteItem(itemId, itemType, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        items.value = items.value.filter(item => item.id !== itemId)
        selectedItems.value = selectedItems.value.filter(id => id !== itemId)
        return { success: true }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '삭제에 실패했습니다.'
      console.error('아이템 삭제 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const renameFolder = async (folderId, newName) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await driveApi.renameFolder(folderId, newName, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        const index = items.value.findIndex(item => item.id === folderId)
        if (index !== -1) {
          items.value[index] = result.data
        }
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '이름 변경에 실패했습니다.'
      console.error('폴더 이름 변경 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const downloadFile = async (item) => {
    try {
      const result = await driveApi.downloadFile(item.id, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        const url = window.URL.createObjectURL(new Blob([result.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', item.name)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        return { success: true }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '다운로드에 실패했습니다.'
      console.error('파일 다운로드 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const downloadDocument = async (documentId) => {
    try {
      const result = await driveApi.downloadDocument(documentId, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        const url = window.URL.createObjectURL(new Blob([result.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${documentId}.txt`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        return { success: true }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '문서 다운로드에 실패했습니다.'
      console.error('문서 다운로드 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const loadDocumentContent = async (documentId) => {
    try {
      const result = await driveApi.getDocumentContent(documentId, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        currentDocument.value = result.data
        documentContent.value = result.data.fullContent
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '문서 내용 조회에 실패했습니다.'
      console.error('문서 내용 조회 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const saveDocumentContent = async (documentId, content) => {
    try {
      const result = await driveApi.saveDocumentContent(documentId, currentDriveChannelSeq.value, content, isPersonal.value)
      
      if (result.success) {
        // 로컬 상태 업데이트
        const index = items.value.findIndex(item => item.id === documentId)
        if (index !== -1) {
          items.value[index].content = content
          items.value[index].modifiedDate = new Date().toISOString()
        }
        documentContent.value = content
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '문서 저장에 실패했습니다.'
      console.error('문서 저장 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const toggleDocumentLock = async (documentId) => {
    try {
      const result = await driveApi.toggleDocumentLock(documentId, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        const index = items.value.findIndex(item => item.id === documentId)
        if (index !== -1) {
          items.value[index].isLocked = !items.value[index].isLocked
        }
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '잠금 상태 변경에 실패했습니다.'
      console.error('문서 잠금 상태 변경 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const moveItem = async (itemId, itemType, newParentId) => {
    try {
      const result = await driveApi.moveItem(itemId, itemType, newParentId, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        // 로컬 상태에서 아이템 제거 (새 위치로 이동됨)
        items.value = items.value.filter(item => item.id !== itemId)
        selectedItems.value = selectedItems.value.filter(id => id !== itemId)
        return { success: true }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '이동에 실패했습니다.'
      console.error('아이템 이동 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const reorderFolder = async (folderId, newOrder) => {
    try {
      const result = await driveApi.reorderFolder(folderId, newOrder, currentDriveChannelSeq.value, isPersonal.value)
      
      if (result.success) {
        return { success: true }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '순서 변경에 실패했습니다.'
      console.error('폴더 순서 변경 실패:', err)
      return { success: false, error: error.value }
    }
  }

  // 폴더 이동
  const enterFolder = (folder) => {
    currentPath.value.push(folder)
    currentParentId.value = folder.id
    loadItems(currentDriveChannelSeq.value, folder.id, isPersonal.value)
  }

  const goBack = () => {
    if (currentPath.value.length > 0) {
      currentPath.value.pop()
      const parentFolder = currentPath.value[currentPath.value.length - 1]
      currentParentId.value = parentFolder ? parentFolder.id : null
      loadItems(currentDriveChannelSeq.value, currentParentId.value, isPersonal.value)
    }
  }

  const goToRoot = () => {
    currentPath.value = []
    currentParentId.value = null
    loadItems(currentDriveChannelSeq.value, null, isPersonal.value)
  }

  // 아이템 선택
  const selectItem = (itemId) => {
    if (selectedItems.value.includes(itemId)) {
      selectedItems.value = selectedItems.value.filter(id => id !== itemId)
    } else {
      selectedItems.value.push(itemId)
    }
  }

  const clearSelection = () => {
    selectedItems.value = []
  }

  const selectAll = () => {
    selectedItems.value = items.value.map(item => item.id)
  }

  // 유틸리티
  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    items.value = []
    currentPath.value = []
    currentParentId.value = null
    currentDriveChannelSeq.value = null
    isPersonal.value = false
    selectedItems.value = []
    currentDocument.value = null
    documentContent.value = ''
    error.value = null
  }

  return {
    // 상태
    items,
    currentPath,
    currentParentId,
    currentDriveChannelSeq,
    isPersonal,
    isLoading,
    error,
    selectedItems,
    currentDocument,
    documentContent,
    
    // 계산된 속성
    currentPathString,
    folders,
    files,
    sharedDocs,
    selectedItemsList,
    
    // 액션
    loadItems,
    uploadFiles,
    createFolder,
    createSharedDocument,
    deleteItem,
    renameFolder,
    downloadFile,
    downloadDocument,
    loadDocumentContent,
    saveDocumentContent,
    toggleDocumentLock,
    moveItem,
    reorderFolder,
    enterFolder,
    goBack,
    goToRoot,
    selectItem,
    clearSelection,
    selectAll,
    clearError,
    reset
  }
})
