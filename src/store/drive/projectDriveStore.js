import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { projectDriveApi } from '@/api/drive/driveApi'
import { DriveItem, DocumentDetail } from '@/models/drive/DriveModels'

// 프로젝트 드라이브 스토어
export const useProjectDriveStore = defineStore('projectDrive', () => {
  // 상태
  const items = ref([])
  const currentPath = ref([])
  const currentParentId = ref(null)
  const currentDriveChannelSeq = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const selectedItems = ref([])
  const allFolders = ref([])
  
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
  const loadItems = async (driveChannelSeq, parentId = null) => {
    isLoading.value = true
    error.value = null
    currentDriveChannelSeq.value = driveChannelSeq

    try {
      const result = await projectDriveApi.getItems(driveChannelSeq, parentId)
      
      if (result.success) {
        items.value = result.data
        currentParentId.value = parentId
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = '목록을 불러오는데 실패했습니다.'
('프로젝트 드라이브 목록 로드 실패:', err)
    } finally {
      isLoading.value = false
    }
  }

  const uploadFiles = async (files, parentId = null) => {
    isLoading.value = true
    error.value = null

    try {
      const targetParentId = parentId !== null ? parentId : currentParentId.value
      const result = await projectDriveApi.uploadFiles(files, currentDriveChannelSeq.value, targetParentId)
      
      if (result.success) {
        // 업로드된 파일이 현재 보고 있는 폴더에 업로드된 경우에만 즉시 추가
        // (다른 폴더에 업로드된 경우는 해당 폴더로 이동할 때 자동으로 조회됨)
        if (targetParentId === currentParentId.value) {
          items.value.push(...result.data)
        }
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '파일 업로드에 실패했습니다.'
('프로젝트 드라이브 파일 업로드 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const createFolder = async (name, parentId = null) => {
    isLoading.value = true
    error.value = null

    try {
      const targetParentId = parentId !== null ? parentId : currentParentId.value
      const result = await projectDriveApi.createFolder(name, currentDriveChannelSeq.value, targetParentId)
      
      if (result.success) {
        // 폴더 생성 후 현재 보고 있는 폴더의 목록을 다시 불러와서 갱신
        await loadItems(currentDriveChannelSeq.value, currentParentId.value)
        
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '폴더 생성에 실패했습니다.'
('프로젝트 드라이브 폴더 생성 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const createSharedDocument = async (name, parentId = null, isLocked = false) => {
    isLoading.value = true
    error.value = null

    try {
      const targetParentId = parentId !== null ? parentId : currentParentId.value
      const result = await projectDriveApi.createSharedDocument(name, currentDriveChannelSeq.value, targetParentId, isLocked)
      
      if (result.success) {
        // 생성된 문서가 현재 보고 있는 폴더에 생성된 경우에만 즉시 추가
        // (다른 폴더에 생성된 경우는 해당 폴더로 이동할 때 자동으로 조회됨)
        if (targetParentId === currentParentId.value) {
          items.value.push(result.data)
        }
        return { success: true, data: result.data }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '공유문서 생성에 실패했습니다.'
('프로젝트 드라이브 공유문서 생성 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const deleteItem = async (itemId, itemType) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await projectDriveApi.deleteItem(itemId, itemType, currentDriveChannelSeq.value)
      
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
('프로젝트 드라이브 아이템 삭제 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const renameFolder = async (folderId, newName) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await projectDriveApi.renameFolder(folderId, newName, currentDriveChannelSeq.value)
      
      if (result.success) {
        // ID와 타입을 모두 확인해서 정확한 아이템 찾기
        const index = items.value.findIndex(item => item.id === folderId && item.type === 'folder')
        if (index !== -1) {
          items.value[index].name = newName
        }
        return { success: true, data: items.value[index] }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '이름 변경에 실패했습니다.'
('프로젝트 드라이브 폴더 이름 변경 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const renameDocument = async (documentId, newName) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await projectDriveApi.renameDocument(documentId, newName, currentDriveChannelSeq.value)
      
      if (result.success) {
        // ID와 타입을 모두 확인해서 정확한 아이템 찾기 (file 또는 shared-doc)
        const index = items.value.findIndex(item => 
          item.id === documentId && (item.type === 'file' || item.type === 'shared-doc')
        )
        if (index !== -1) {
          items.value[index].name = newName
        }
        return { success: true, data: items.value[index] }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '문서 이름 변경에 실패했습니다.'
('프로젝트 드라이브 문서 이름 변경 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const downloadFile = async (item) => {
    try {
      const result = await projectDriveApi.downloadFile(item.id, currentDriveChannelSeq.value)
      
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
('프로젝트 드라이브 파일 다운로드 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const downloadDocument = async (documentId) => {
    try {
      const result = await projectDriveApi.downloadDocument(documentId, currentDriveChannelSeq.value, false)
      
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
('프로젝트 드라이브 문서 다운로드 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const downloadSharedDocument = async (documentId) => {
    try {
      const result = await projectDriveApi.downloadDocument(documentId, currentDriveChannelSeq.value, false)
      
      if (result.success) {
        // 문서 이름을 가져오기 위해 아이템에서 찾기
        const documentItem = items.value.find(item => item.id === documentId)
        const fileName = documentItem ? `${documentItem.name}.txt` : `${documentId}.txt`
        
        const url = window.URL.createObjectURL(new Blob([result.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
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
      error.value = '공유문서 다운로드에 실패했습니다.'
('프로젝트 드라이브 공유문서 다운로드 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const loadDocumentContent = async (documentId) => {
    try {
      const result = await projectDriveApi.getDocumentContent(documentId, currentDriveChannelSeq.value, false)
      
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
('프로젝트 드라이브 문서 내용 조회 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const saveDocumentContent = async (documentId, content) => {
    try {
      const result = await projectDriveApi.saveDocumentContent(documentId, currentDriveChannelSeq.value, content, false)
      
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
('프로젝트 드라이브 문서 저장 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const toggleDocumentLock = async (documentId) => {
    try {
      const result = await projectDriveApi.toggleDocumentLock(documentId, currentDriveChannelSeq.value, false)
      
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
('프로젝트 드라이브 문서 잠금 상태 변경 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const moveItem = async (itemId, itemType, newParentId) => {
    try {
      const result = await projectDriveApi.moveItem(itemId, itemType, newParentId, currentDriveChannelSeq.value, false)
      
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
('프로젝트 드라이브 아이템 이동 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const reorderFolder = async (folderId, newOrder) => {
    try {
      const result = await projectDriveApi.reorderFolder(folderId, newOrder, currentDriveChannelSeq.value, false)
      
      if (result.success) {
        // 순서 변경 후 전체 목록을 다시 로드하여 올바른 순서 반영
        await loadItems(currentDriveChannelSeq.value, currentParentId.value)
        return { success: true }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '순서 변경에 실패했습니다.'
('프로젝트 드라이브 폴더 순서 변경 실패:', err)
      return { success: false, error: error.value }
    }
  }

  const getAllFolders = async () => {
    isLoading.value = true
    error.value = null

    try {
      const result = await projectDriveApi.getAllFolders(currentDriveChannelSeq.value)
      
      if (result.success) {
        // API 응답을 DriveItem 형태로 변환
        const folders = result.data.map(folder => DriveItem.fromApiFormat(folder))
        allFolders.value = folders
        return { success: true, data: folders }
      } else {
        error.value = result.error
        return { success: false, error: result.error }
      }
    } catch (err) {
      error.value = '전체 폴더 조회에 실패했습니다.'
('프로젝트 드라이브 전체 폴더 조회 실패:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // 폴더 이동
  const enterFolder = (folder) => {
    currentPath.value.push(folder)
    currentParentId.value = folder.id
    loadItems(currentDriveChannelSeq.value, folder.id)
  }

  const goBack = () => {
    if (currentPath.value.length > 0) {
      currentPath.value.pop()
      const parentFolder = currentPath.value[currentPath.value.length - 1]
      currentParentId.value = parentFolder ? parentFolder.id : null
      loadItems(currentDriveChannelSeq.value, currentParentId.value)
    }
  }

  const goToRoot = () => {
    currentPath.value = []
    currentParentId.value = null
    loadItems(currentDriveChannelSeq.value, null)
  }

  const goToFolder = async (folderId) => {
    // 전체 폴더 목록이 없으면 먼저 로드
    if (!allFolders.value || allFolders.value.length === 0) {
      await getAllFolders()
    }

    // 폴더 경로를 찾아서 설정
    const findFolderPath = (folders, targetId, currentPath = []) => {
      for (const folder of folders) {
        const newPath = [...currentPath, { id: folder.id, name: folder.name }]
        if (folder.id === targetId) {
          return newPath
        }
        if (folder.children && folder.children.length > 0) {
          const found = findFolderPath(folder.children, targetId, newPath)
          if (found) return found
        }
      }
      return null
    }

    // 전체 폴더 목록에서 경로 찾기
    const folderPath = findFolderPath(allFolders.value, folderId)
    if (folderPath) {
      currentPath.value = folderPath
      currentParentId.value = folderId
      loadItems(currentDriveChannelSeq.value, folderId)
    }
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
    isLoading,
    error,
    selectedItems,
    currentDocument,
    documentContent,
    allFolders,
    
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
    renameDocument,
    downloadFile,
    downloadDocument,
    downloadSharedDocument,
    loadDocumentContent,
    saveDocumentContent,
    toggleDocumentLock,
    moveItem,
    reorderFolder,
    getAllFolders,
    enterFolder,
    goBack,
    goToRoot,
    goToFolder,
    selectItem,
    clearSelection,
    selectAll,
    clearError,
    reset
  }
})
