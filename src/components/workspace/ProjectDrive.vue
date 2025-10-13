<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePermissions, PERMISSIONS } from '@/composables/usePermissions'
import { useProjectDriveStore } from '@/store/drive/projectDriveStore'
import { useDraggable, useDropZone } from '@vueuse/core'
import SharedDocEditor from './SharedDocEditor.vue'

const props = defineProps({
  currentChannel: String
})

const { hasPermission, isManager, isSuper } = usePermissions()
const driveStore = useProjectDriveStore()

// 뷰 모드 (list, grid)
const viewMode = ref('grid')

// 브레드크럼 경로
const breadcrumbPath = computed(() => {
  const path = [{ id: null, name: '홈' }]
  if (driveStore.currentPath && driveStore.currentPath.length > 0) {
    path.push(...driveStore.currentPath)
  }
  return path
})

// 선택된 항목들
const selectedItems = ref([])

// 드래그 앤 드롭 상태
const draggedItem = ref(null)
const dragOverItem = ref(null)
const dragOverItemType = ref(null)
const isDragging = ref(false)

// 드롭 모달 상태
const showDropModal = ref(false)
const dropAction = ref(null) // 'move' 또는 'reorder'
const dropTarget = ref(null)

// 폴더 이름 변경 상태
const editingItem = ref(null)
const editingItemType = ref(null)
const editingName = ref('')

// 전체 폴더 목록 (공유문서 생성용)
const allFolders = ref([])
const loadingFolders = ref(false)

// 검색 및 필터
const searchQuery = ref('')
const sortBy = ref('name') // name, date, size, type
const sortOrder = ref('asc') // asc, desc

// 모달 상태
const showUploadModal = ref(false)
const showNewFolderModal = ref(false)
const showSharedDocModal = ref(false)
const newFolderName = ref('')
const uploadFiles = ref([])
const sharedDocTitle = ref('')
const sharedDocLocation = ref(null)
const sharedDocIsLocked = ref(false)
const showFolderSelector = ref(false)
const showDocEditor = ref(false)
const currentDocument = ref(null)

// 계산된 속성들 - 스토어 데이터 사용 (백엔드에서 이미 정렬되어 있으므로 그대로 사용)
const currentItems = computed(() => {
  return driveStore.items || []
})

// 필터링된 항목들
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return currentItems.value
  
  return currentItems.value.filter(item => 
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 아이템 정렬
const sortItems = (items) => {
  return [...items].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy.value) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'date':
        comparison = new Date(a.modifiedDate) - new Date(b.modifiedDate)
        break
      case 'size':
        if (a.type === 'folder' && b.type === 'folder') return 0
        if (a.type === 'folder') return -1
        if (b.type === 'folder') return 1
        comparison = parseSize(a.size) - parseSize(b.size)
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
    }
    
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
}

// 파일 크기 파싱
const parseSize = (sizeStr) => {
  if (sizeStr === '-') return 0
  const match = sizeStr.match(/(\d+\.?\d*)\s*(KB|MB|GB)/)
  if (!match) return 0
  
  const value = parseFloat(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 'KB': return value * 1024
    case 'MB': return value * 1024 * 1024
    case 'GB': return value * 1024 * 1024 * 1024
    default: return value
  }
}

// 공유문서 더블클릭으로 문서 편집기 진입
const openSharedDoc = async (doc) => {
  if (doc.type === 'shared-doc') {
    const result = await driveStore.loadDocumentContent(doc.id)
    if (result.success) {
      showDocEditor.value = true
    } else {
      console.error('문서 내용 로드 실패:', result.error)
    }
  }
}

// 파일 다운로드
const downloadFile = async (file) => {
  if (file.type !== 'folder' && file.type !== 'shared-doc') {
    const result = await driveStore.downloadFile(file)
    if (!result.success) {
      console.error('파일 다운로드 실패:', result.error)
    }
  }
}

// 공유문서 저장
const saveDocument = async (docData) => {
  const result = await driveStore.saveDocumentContent(docData.id, docData.content)
  if (!result.success) {
    console.error('문서 저장 실패:', result.error)
  }
}

// 공유문서 편집기 닫기
const closeDocEditor = () => {
  showDocEditor.value = false
  driveStore.currentDocument = null
}

// 공유문서 잠금 해제/잠금
const toggleDocumentLock = async (docId) => {
  const result = await driveStore.toggleDocumentLock(docId)
  if (!result.success) {
    console.error('잠금 상태 변경 실패:', result.error)
  }
}

// 홈으로
const goHome = () => {
  driveStore.goToRoot()
}

// 현재 경로 표시
const currentPathDisplay = computed(() => {
  return driveStore.currentPathString || '홈'
})

// 아이템 선택
const selectItem = (item, event) => {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd 클릭: 다중 선택
    driveStore.selectItem(item.id)
  } else {
    // 일반 클릭: 단일 선택
    driveStore.clearSelection()
    driveStore.selectItem(item.id)
  }
}

// 드래그 시작
const startDrag = (item, event) => {
  draggedItem.value = item
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', item.id.toString())
}

// 드래그 오버
const handleDragOver = (item, event) => {
  event.preventDefault()
  
  if (!draggedItem.value || draggedItem.value.id === item.id) return
  
  // 드롭 가능한 경우만 표시
  let canDrop = false
  
  if (draggedItem.value.type === 'folder') {
    // 폴더는 다른 폴더로 이동하거나 같은 레벨에서 순서 변경 가능
    if (item.type === 'folder') {
      canDrop = true
    }
  } else {
    // 문서나 파일은 폴더로만 이동 가능
    canDrop = item.type === 'folder'
  }
  
  if (canDrop) {
    dragOverItem.value = item
    dragOverItemType.value = item.type
    event.dataTransfer.dropEffect = 'move'
  } else {
    dragOverItem.value = null
    dragOverItemType.value = null
    event.dataTransfer.dropEffect = 'none'
  }
}

// 드래그 리브
const handleDragLeave = () => {
  dragOverItem.value = null
  dragOverItemType.value = null
}

// 드롭
const handleDrop = async (targetItem, event) => {
  event.preventDefault()
  
  if (!draggedItem.value || !targetItem) return
  
  // 같은 아이템으로 드롭하는 경우 무시
  if (draggedItem.value.id === targetItem.id) {
    resetDragState()
    return
  }
  
  // 드롭 가능 여부 확인
  let canDrop = false
  let actionType = null
  
  if (draggedItem.value.type === 'folder') {
    if (targetItem.type === 'folder') {
      canDrop = true
      // 폴더끼리 드롭하는 경우 모달로 선택
      dropAction.value = null
      dropTarget.value = targetItem
      showDropModal.value = true
      return
    }
  } else {
    if (targetItem.type === 'folder') {
      canDrop = true
      actionType = 'move'
    }
  }
  
  if (canDrop && actionType) {
    await executeDropAction(actionType, targetItem)
  }
  
  resetDragState()
}

// 드롭 액션 실행
const executeDropAction = async (actionType, targetItem) => {
  if (actionType === 'move') {
    // 폴더로 이동
    const result = await driveStore.moveItem(draggedItem.value.id, draggedItem.value.type, targetItem.id)
    if (!result.success) {
      console.error('아이템 이동 실패:', result.error)
    }
  } else if (actionType === 'reorder') {
    // 순서 변경 - 타겟 폴더의 order 값 사용
    const result = await driveStore.reorderFolder(draggedItem.value.id, targetItem.orders)
    if (!result.success) {
      console.error('순서 변경 실패:', result.error)
    }
  }
}

// 드롭 모달에서 액션 선택
const selectDropAction = async (action) => {
  dropAction.value = action
  await executeDropAction(action, dropTarget.value)
  closeDropModal()
}

// 드롭 모달 닫기
const closeDropModal = () => {
  showDropModal.value = false
  dropAction.value = null
  dropTarget.value = null
  resetDragState()
}

// 드래그 상태 리셋
const resetDragState = () => {
  dragOverItem.value = null
  dragOverItemType.value = null
  draggedItem.value = null
  isDragging.value = false
}

// 드래그 종료
const handleDragEnd = () => {
  resetDragState()
}

// 이름 변경 시작
const startRename = (item) => {
  if (item.type !== 'folder' && item.type !== 'shared-doc' && item.type !== 'file') return
  
  // 이미 편집 중인 아이템을 다시 클릭하면 취소
  if (editingItem.value === item.id && editingItemType.value === item.type) {
    cancelRename()
    return
  }
  
  editingItem.value = item.id
  editingItemType.value = item.type
  editingName.value = item.name
}

// 이름 변경 완료
const finishRename = async () => {
  if (!editingItem.value || !editingName.value.trim()) {
    cancelRename()
    return
  }
  
  try {
    const item = driveStore.items.find(item => item.id === editingItem.value)
    let result
    
    if (editingItemType.value === 'folder') {
      result = await driveStore.renameFolder(editingItem.value, editingName.value.trim())
    } else if (editingItemType.value === 'shared-doc') {
      result = await driveStore.renameDocument(editingItem.value, editingName.value.trim())
    } else if (editingItemType.value === 'file') {
      result = await driveStore.renameDocument(editingItem.value, editingName.value.trim())
    }
    
    if (result.success) {
      editingItem.value = null
      editingItemType.value = null
      editingName.value = ''
      
      // UI 업데이트를 위해 다음 틱에서 포커스 해제
      await nextTick()
    } else {
      console.error('이름 변경 실패:', result.error)
      // 실패 시 편집 모드 유지 (사용자가 다시 시도할 수 있도록)
    }
  } catch (error) {
    console.error('이름 변경 중 오류:', error)
    // 에러 발생 시 편집 모드 유지
  }
}

// 이름 변경 취소
const cancelRename = () => {
  editingItem.value = null
  editingItemType.value = null
  editingName.value = ''
}

// 폴더 진입
const enterFolder = (folder) => {
  driveStore.enterFolder(folder)
}

// 브레드크럼 클릭으로 폴더 이동
const navigateToFolder = (folderId) => {
  if (folderId === null) {
    // 홈으로 이동
    driveStore.goToRoot()
  } else {
    // 특정 폴더로 이동
    driveStore.goToFolder(folderId)
  }
}

// 뒤로 가기
const goBack = () => {
  driveStore.goBack()
}

// 전체 폴더 목록 로드
const loadAllFolders = async () => {
  loadingFolders.value = true
  try {
    const result = await driveStore.getAllFolders()
    if (result.success) {
      allFolders.value = result.data
    }
  } catch (error) {
    console.error('전체 폴더 목록 로드 실패:', error)
  } finally {
    loadingFolders.value = false
  }
}

// 폴더 계층구조 생성 (백엔드에서 이미 계층구조로 반환됨)
const buildFolderHierarchy = (folders) => {
  // 백엔드에서 이미 계층구조로 반환되므로 그대로 사용
  return folders || []
}

// 공유문서 생성 모달 열기
const openSharedDocModal = () => {
  showSharedDocModal.value = true
  loadAllFolders() // 전체 폴더 목록 로드
}

// 아이템 삭제
const deleteItem = async (item) => {
  if (!confirm(`"${item.name}"을(를) 삭제하시겠습니까?`)) {
    return
  }
  
  try {
    const result = await driveStore.deleteItem(item.id, item.type)
    if (!result.success) {
      console.error('아이템 삭제 실패:', result.error)
      alert('삭제에 실패했습니다.')
    }
  } catch (error) {
    console.error('아이템 삭제 중 오류:', error)
    alert('삭제 중 오류가 발생했습니다.')
  }
}

// 삭제 버튼 표시 여부 확인
const canDeleteItem = (item) => {
  // 폴더는 항상 삭제 가능
  if (item.type === 'folder') {
    return true
  }
  
  // 문서는 내가 올린 것만 삭제 가능 (memberSeq 확인)
  if (item.type === 'file' || item.type === 'shared-doc') {
    // TODO: 현재 사용자의 memberSeq와 비교
    // 현재는 테스트용으로 true 반환
    return true
  }
  
  return false
}

// 평면화된 폴더 목록 (계층구조 표시용)
const flattenedFolders = computed(() => {
  const result = []
  
  const flatten = (folders, level = 0) => {
    folders.forEach(folder => {
      result.push({ ...folder, level })
      if (folder.children && folder.children.length > 0) {
        flatten(folder.children, level + 1)
      }
    })
  }
  
  flatten(buildFolderHierarchy(allFolders.value))
  return result
})

// 파일 크기 포맷팅
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 날짜 포맷팅
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 정렬 변경
const changeSort = (newSortBy) => {
  if (sortBy.value === newSortBy) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = newSortBy
    sortOrder.value = 'asc'
  }
}

// 뷰 모드 변경
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

// 폴더 생성
const createFolder = async () => {
  if (!newFolderName.value.trim()) return
  
  const result = await driveStore.createFolder(newFolderName.value.trim())
  if (result.success) {
    newFolderName.value = ''
    showNewFolderModal.value = false
  } else {
    console.error('폴더 생성 실패:', result.error)
  }
}

// 파일 업로드
const handleFileUpload = (event) => {
  const files = Array.from(event.target.files)
  uploadFiles.value = files
  showUploadModal.value = true
}

// 파일 업로드 처리
const uploadFilesToDrive = async () => {
  if (uploadFiles.value.length === 0) return
  
  const result = await driveStore.uploadFiles(uploadFiles.value)
  if (result.success) {
    uploadFiles.value = []
    showUploadModal.value = false
  } else {
    console.error('파일 업로드 실패:', result.error)
  }
}

// 파일 타입 결정
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('word')) return 'document'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation'
  if (mimeType.includes('text')) return 'text'
  return 'file'
}

// 파일 아이콘 결정
const getFileIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'mdi-file-image'
  if (mimeType.startsWith('video/')) return 'mdi-file-video'
  if (mimeType.startsWith('audio/')) return 'mdi-file-music'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf'
  if (mimeType.includes('word')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'mdi-file-powerpoint'
  if (mimeType.includes('text')) return 'mdi-file-document'
  return 'mdi-file'
}

// 파일 색상 결정
const getFileColor = (mimeType) => {
  if (mimeType.startsWith('image/')) return '#ff5722'
  if (mimeType.startsWith('video/')) return '#9c27b0'
  if (mimeType.startsWith('audio/')) return '#ff9800'
  if (mimeType.includes('pdf')) return '#f44336'
  if (mimeType.includes('word')) return '#2196f3'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#4caf50'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '#ff9800'
  if (mimeType.includes('text')) return '#607d8b'
  return '#757575'
}

// 파일 크기 포맷팅 (바이트를 읽기 쉬운 형태로)
const formatFileSizeFromBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 공유문서 생성
const createSharedDoc = async () => {
  if (!sharedDocTitle.value.trim()) return
  
  // 현재 폴더의 ID를 사용 (sharedDocLocation이 선택된 폴더가 아니라면 현재 폴더 사용)
  const parentFolderId = sharedDocLocation.value || driveStore.currentParentId
  
  const result = await driveStore.createSharedDocument(sharedDocTitle.value.trim(), parentFolderId, sharedDocIsLocked.value)
  if (result.success) {
    // 폼 초기화
    sharedDocTitle.value = ''
    sharedDocLocation.value = null
    sharedDocIsLocked.value = false
    showSharedDocModal.value = false
    showFolderSelector.value = false
  } else {
    console.error('공유문서 생성 실패:', result.error)
  }
}

// 계층형 폴더 구조 생성 (공유문서 위치 선택용)
const hierarchicalFolders = computed(() => {
  const folders = []
  
  const buildHierarchy = (items, level = 0, parentPath = []) => {
    items.forEach(item => {
      if (item.type === 'folder') {
        const currentPath = [...parentPath, item.name]
        const folderData = {
          ...item,
          level,
          path: currentPath,
          displayName: '  '.repeat(level) + item.name,
          fullPath: currentPath.join(' / '),
          isExpanded: false
        }
        folders.push(folderData)
        
        if (item.children && item.children.length > 0) {
          buildHierarchy(item.children, level + 1, currentPath)
        }
      }
    })
  }
  
  buildHierarchy(driveStore.items)
  return folders
})

// 폴더 확장/축소 토글
const toggleFolderExpansion = (folderId) => {
  const folder = hierarchicalFolders.value.find(f => f.id === folderId)
  if (folder) {
    folder.isExpanded = !folder.isExpanded
  }
}

// 폴더 선택 (더블클릭으로)
const selectFolderForSharedDoc = (folder) => {
  sharedDocLocation.value = folder.id
  showFolderSelector.value = false
}

// 현재 선택된 폴더 이름 가져오기
const selectedFolderName = computed(() => {
  if (sharedDocLocation.value === null) return '최상위 루트'
  if (!sharedDocLocation.value) return '폴더를 선택하세요'
  const folder = driveStore.items.find(item => item.id === sharedDocLocation.value)
  return folder ? folder.name : '알 수 없는 폴더'
})

// 모달 닫기
const closeModals = () => {
  showUploadModal.value = false
  showNewFolderModal.value = false
  showSharedDocModal.value = false
  showFolderSelector.value = false
  newFolderName.value = ''
  uploadFiles.value = []
  sharedDocTitle.value = ''
  sharedDocLocation.value = null
  sharedDocIsLocked.value = false
}

// 생명주기
onMounted(() => {
  loadDriveItems()
  
  // 전역 클릭 이벤트로 편집 모드 취소
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  // 이벤트 리스너 정리
  document.removeEventListener('click', handleGlobalClick)
})

// 전역 클릭 핸들러
const handleGlobalClick = (event) => {
  // 편집 중이 아닌 경우 무시
  if (!editingItem.value) return
  
  // 편집 입력 필드나 편집 버튼을 클릭한 경우 무시
  const target = event.target
  if (target.classList.contains('rename-input') || 
      target.closest('.action-btn') ||
      target.closest('.item-name')) {
    return
  }
  
  // 다른 곳을 클릭한 경우 편집 취소
  cancelRename()
}

// API 연동 메서드들
const loadDriveItems = async () => {
  if (!props.currentChannel) return
  
  const driveChannelSeq = parseInt(props.currentChannel.replace('project', ''))
  await driveStore.loadItems(driveChannelSeq, null)
}
</script>

<template>
  <div class="project-drive">
    <!-- 헤더 -->
    <div class="drive-header">
      <div class="header-left">
        <h2 class="page-title">
          <v-icon class="title-icon">mdi-folder-multiple</v-icon>
          프로젝트 드라이브
        </h2>
        <div class="breadcrumb">
          <template v-for="(item, index) in breadcrumbPath" :key="item.id || 'home'">
            <span 
              class="breadcrumb-item" 
              :class="{ 'clickable': index < breadcrumbPath.length - 1 }"
              @click="index < breadcrumbPath.length - 1 ? navigateToFolder(item.id) : null"
            >
              {{ item.name }}
            </span>
            <v-icon 
              v-if="index < breadcrumbPath.length - 1" 
              size="16" 
              class="breadcrumb-separator"
            >
              mdi-chevron-right
            </v-icon>
          </template>
        </div>
      </div>
      
      <div class="header-right">
        <div class="search-container">
          <div class="search-input-wrapper">
            <v-icon class="search-icon">mdi-magnify</v-icon>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="파일 또는 폴더 검색..." 
              class="search-input"
            />
          </div>
        </div>
        
        <div class="view-controls">
          <v-btn-toggle
            v-model="viewMode"
            mandatory
            variant="outlined"
            density="compact"
            class="view-toggle"
          >
            <v-btn value="grid" size="small">
              <v-icon>mdi-view-grid</v-icon>
            </v-btn>
            <v-btn value="list" size="small">
              <v-icon>mdi-view-list</v-icon>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>
    </div>

    <!-- 툴바 -->
    <div class="drive-toolbar">
      <div class="toolbar-left">
        <v-btn
          v-if="driveStore.currentPath && driveStore.currentPath.length > 0"
          icon="mdi-arrow-left"
          variant="text"
          size="small"
          @click="goBack"
          class="back-btn"
        />
        
        <v-btn
          icon="mdi-upload"
          variant="text"
          size="small"
          class="upload-btn"
          @click="$refs.fileInput.click()"
        >
          <v-icon>mdi-upload</v-icon>
        </v-btn>
        
        <v-btn
          icon="mdi-folder-plus"
          variant="text"
          size="small"
          class="new-folder-btn"
          @click="showNewFolderModal = true"
        >
          <v-icon>mdi-folder-plus</v-icon>
        </v-btn>
        
        <v-btn
          icon="mdi-file-document-multiple"
          variant="text"
          size="small"
          class="new-shared-doc-btn"
          @click="openSharedDocModal"
        >
          <v-icon>mdi-file-document-multiple</v-icon>
        </v-btn>
        
        <!-- 숨겨진 파일 입력 -->
        <input
          ref="fileInput"
          type="file"
          multiple
          style="display: none"
          @change="handleFileUpload"
        />
      </div>
      
      <div class="toolbar-right">
        <div class="sort-controls">
          <span class="sort-label">정렬:</span>
          <v-btn
            :class="{ 'active': sortBy === 'name' }"
            variant="text"
            size="small"
            @click="changeSort('name')"
          >
            이름
            <v-icon v-if="sortBy === 'name'" size="16">
              {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
            </v-icon>
          </v-btn>
          <v-btn
            :class="{ 'active': sortBy === 'date' }"
            variant="text"
            size="small"
            @click="changeSort('date')"
          >
            수정일
            <v-icon v-if="sortBy === 'date'" size="16">
              {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
            </v-icon>
          </v-btn>
          <v-btn
            :class="{ 'active': sortBy === 'size' }"
            variant="text"
            size="small"
            @click="changeSort('size')"
          >
            크기
            <v-icon v-if="sortBy === 'size'" size="16">
              {{ sortOrder === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
            </v-icon>
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 파일/폴더 목록 -->
    <div class="drive-content">
      <!-- 로딩 상태 -->
      <div v-if="driveStore.isLoading" class="loading-container">
        <v-progress-circular indeterminate color="primary" />
        <p>로딩 중...</p>
      </div>
      
      <!-- 에러 상태 -->
      <div v-else-if="driveStore.error" class="error-container">
        <v-alert type="error" :text="driveStore.error" />
      </div>
      
      <!-- 빈 상태 -->
      <div v-else-if="filteredItems.length === 0" class="empty-container">
        <v-icon size="64" color="grey">mdi-folder-open-outline</v-icon>
        <h3>폴더가 비어있습니다</h3>
        <p>파일을 업로드하거나 새 폴더를 만들어보세요</p>
      </div>
      
      <!-- 그리드 뷰 -->
      <div v-else-if="viewMode === 'grid'" class="grid-view">
        <div class="grid-container">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="grid-item"
            :class="{ 
              'selected': selectedItems.some(selected => selected.id === item.id),
              'drag-over': dragOverItem?.id === item.id && dragOverItemType === item.type
            }"
            @click="selectItem(item, $event)"
            @dblclick="item.type === 'folder' ? enterFolder(item) : item.type === 'shared-doc' ? openSharedDoc(item) : null"
            @dragstart="editingItem === item.id && editingItemType === item.type ? null : startDrag(item, $event)"
            @dragover="editingItem === item.id && editingItemType === item.type ? null : handleDragOver(item, $event)"
            @dragleave="editingItem === item.id && editingItemType === item.type ? null : handleDragLeave"
            @drop="editingItem === item.id && editingItemType === item.type ? null : handleDrop(item, $event)"
            :draggable="editingItem === item.id && editingItemType === item.type ? false : true"
          >
            <div class="item-icon">
              <v-icon :color="item.color" size="48">{{ item.icon }}</v-icon>
            </div>
            <div class="item-name" :title="item.name">
              <!-- 이름 편집 모드 -->
              <input
                v-if="editingItem === item.id && editingItemType === item.type"
                v-model="editingName"
                class="rename-input"
                @keyup.enter="finishRename"
                @keyup.escape="cancelRename"
                ref="renameInput"
              />
              <!-- 일반 표시 모드 -->
              <template v-else>
                {{ item.name }}
                <div v-if="item.type === 'shared-doc'" class="shared-doc-icons">
                  <v-icon 
                    v-if="item.isLocked"
                    class="lock-icon"
                    size="14"
                  >
                    mdi-lock
                  </v-icon>
                  <v-icon 
                    class="shared-icon"
                    size="16"
                  >
                    mdi-account-multiple
                  </v-icon>
                </div>
              </template>
            </div>
            <div class="item-meta">
              <span class="item-size">{{ item.size }}</span>
              <span class="item-date">{{ formatDate(item.modifiedDate) }}</span>
            </div>
            <div class="item-actions">
              <!-- 일반 파일 다운로드 버튼 -->
              <v-btn
                v-if="item.type !== 'folder' && item.type !== 'shared-doc'"
                icon="mdi-download"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="downloadFile(item)"
                title="다운로드"
              >
                <v-icon size="16">mdi-download</v-icon>
              </v-btn>
              
              <!-- 일반 파일 이름 변경 버튼 -->
              <v-btn
                v-if="item.type === 'file'"
                icon="mdi-pencil"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="startRename(item)"
                title="이름 변경"
              >
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
              
              <!-- 폴더 이름 변경 버튼 -->
              <v-btn
                v-if="item.type === 'folder'"
                icon="mdi-pencil"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="startRename(item)"
                title="이름 변경"
              >
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
              
              <!-- 공유문서 이름 변경 버튼 -->
              <v-btn
                v-if="item.type === 'shared-doc'"
                icon="mdi-pencil"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="startRename(item)"
                title="이름 변경"
              >
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
              
              <!-- 공유문서 잠금 해제 버튼 -->
              <v-btn
                v-if="item.type === 'shared-doc'"
                :icon="item.isLocked ? 'mdi-lock-open' : 'mdi-lock'"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="toggleDocumentLock(item.id)"
                :title="item.isLocked ? '잠금 해제' : '잠금'"
              >
                <v-icon size="16">{{ item.isLocked ? 'mdi-lock-open' : 'mdi-lock' }}</v-icon>
              </v-btn>
              
              <!-- 삭제 버튼 -->
              <v-btn
                v-if="canDeleteItem(item)"
                icon="mdi-delete"
                size="small"
                variant="text"
                class="action-btn delete-btn"
                @click.stop="deleteItem(item)"
                title="삭제"
              >
                <v-icon size="16">mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 리스트 뷰 -->
      <div v-else class="list-view">
        <div class="list-header">
          <div class="list-column name-column">이름</div>
          <div class="list-column size-column">크기</div>
          <div class="list-column date-column">수정일</div>
          <div class="list-column uploader-column">업로더</div>
        </div>
        
        <div class="list-items">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="list-item"
            :class="{ 
              'selected': selectedItems.some(selected => selected.id === item.id),
              'drag-over': dragOverItem?.id === item.id && dragOverItemType === item.type
            }"
            @click="selectItem(item, $event)"
            @dblclick="item.type === 'folder' ? enterFolder(item) : item.type === 'shared-doc' ? openSharedDoc(item) : null"
            @dragstart="editingItem === item.id && editingItemType === item.type ? null : startDrag(item, $event)"
            @dragover="editingItem === item.id && editingItemType === item.type ? null : handleDragOver(item, $event)"
            @dragleave="editingItem === item.id && editingItemType === item.type ? null : handleDragLeave"
            @drop="editingItem === item.id && editingItemType === item.type ? null : handleDrop(item, $event)"
            :draggable="editingItem === item.id && editingItemType === item.type ? false : true"
          >
            <div class="list-cell name-cell">
              <v-icon :color="item.color" size="20" class="item-icon">{{ item.icon }}</v-icon>
              <!-- 이름 편집 모드 -->
              <input
                v-if="editingItem === item.id && editingItemType === item.type"
                v-model="editingName"
                class="rename-input"
                @keyup.enter="finishRename"
                @keyup.escape="cancelRename"
                ref="renameInput"
              />
              <!-- 일반 표시 모드 -->
              <span v-else class="item-name">{{ item.name }}</span>
              <div v-if="item.type === 'shared-doc'" class="shared-doc-icons">
                <v-icon 
                  v-if="item.isLocked"
                  class="lock-icon"
                  size="14"
                >
                  mdi-lock
                </v-icon>
                <v-icon 
                  class="shared-icon"
                  size="16"
                >
                  mdi-account-multiple
                </v-icon>
              </div>
              <!-- 일반 파일 다운로드 버튼 -->
              <v-btn
                v-if="item.type !== 'folder' && item.type !== 'shared-doc'"
                icon="mdi-download"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="downloadFile(item)"
                title="다운로드"
              >
                <v-icon size="16">mdi-download</v-icon>
              </v-btn>
              
              <!-- 일반 파일 이름 변경 버튼 -->
              <v-btn
                v-if="item.type === 'file'"
                icon="mdi-pencil"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="startRename(item)"
                title="이름 변경"
              >
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
              
              <!-- 폴더 이름 변경 버튼 -->
              <v-btn
                v-if="item.type === 'folder'"
                icon="mdi-pencil"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="startRename(item)"
                title="이름 변경"
              >
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
              
              <!-- 공유문서 이름 변경 버튼 -->
              <v-btn
                v-if="item.type === 'shared-doc'"
                icon="mdi-pencil"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="startRename(item)"
                title="이름 변경"
              >
                <v-icon size="16">mdi-pencil</v-icon>
              </v-btn>
              
              <!-- 공유문서 잠금 해제 버튼 -->
              <v-btn
                v-if="item.type === 'shared-doc'"
                :icon="item.isLocked ? 'mdi-lock-open' : 'mdi-lock'"
                size="small"
                variant="text"
                class="action-btn"
                @click.stop="toggleDocumentLock(item.id)"
                :title="item.isLocked ? '잠금 해제' : '잠금'"
              >
                <v-icon size="16">{{ item.isLocked ? 'mdi-lock-open' : 'mdi-lock' }}</v-icon>
              </v-btn>
              
              <!-- 삭제 버튼 -->
              <v-btn
                v-if="canDeleteItem(item)"
                icon="mdi-delete"
                size="small"
                variant="text"
                class="action-btn delete-btn"
                @click.stop="deleteItem(item)"
                title="삭제"
              >
                <v-icon size="16">mdi-delete</v-icon>
              </v-btn>
            </div>
            <div class="list-cell size-cell">{{ item.size }}</div>
            <div class="list-cell date-cell">{{ formatDate(item.modifiedDate) }}</div>
            <div class="list-cell uploader-cell">{{ item.uploader }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 폴더 생성 모달 -->
    <v-dialog v-model="showNewFolderModal" max-width="400px" @click:outside="closeModals">
      <v-card class="folder-modal">
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="primary">mdi-folder-plus</v-icon>
            <h3 class="modal-title">새 폴더 만들기</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeModals"></v-btn>
        </v-card-title>
        
        <v-card-text class="modal-body">
          <v-text-field
            v-model="newFolderName"
            label="폴더 이름"
            placeholder="폴더 이름을 입력하세요"
            variant="outlined"
            @keyup.enter="createFolder"
            autofocus
          />
        </v-card-text>
        
        <v-card-actions class="modal-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeModals">취소</v-btn>
          <v-btn 
            color="primary" 
            @click="createFolder"
            :disabled="!newFolderName.trim()"
          >
            만들기
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 공유문서 생성 모달 -->
    <v-dialog v-model="showSharedDocModal" max-width="600px" @click:outside="closeModals">
      <v-card class="shared-doc-modal">
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="primary">mdi-file-document-multiple</v-icon>
            <h3 class="modal-title">공유문서 만들기</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeModals"></v-btn>
        </v-card-title>
        
        <v-card-text class="modal-body">
          <v-text-field
            v-model="sharedDocTitle"
            label="공유문서 제목"
            placeholder="공유문서 제목을 입력하세요"
            variant="outlined"
            @keyup.enter="createSharedDoc"
            autofocus
            class="mb-4"
          />
          
          <!-- 폴더 위치 선택 -->
          <div class="folder-selection mb-4">
            <label class="input-label">저장 위치</label>
            <div class="folder-selector" @click="showFolderSelector = !showFolderSelector">
              <div class="selected-folder">
                <v-icon class="folder-icon">mdi-folder</v-icon>
                <span class="folder-name">{{ selectedFolderName }}</span>
                <v-icon class="dropdown-icon" :class="{ 'rotated': showFolderSelector }">mdi-chevron-down</v-icon>
              </div>
            </div>
            
            <!-- 계층형 폴더 선택 드롭다운 -->
            <div v-if="showFolderSelector" class="folder-dropdown">
              <div class="folder-list">
                <!-- 로딩 상태 -->
                <div v-if="loadingFolders" class="loading-state">
                  <v-progress-circular size="20" indeterminate></v-progress-circular>
                  <span>폴더 목록을 불러오는 중...</span>
                </div>
                
                <!-- 최상위 루트 옵션 -->
                <div 
                  class="folder-item"
                  :class="{ 'selected': sharedDocLocation === null }"
                  @click="selectFolderForSharedDoc({ id: null, name: '최상위 루트' })"
                >
                  <v-icon class="expand-placeholder"></v-icon>
                  <v-icon class="folder-icon" color="#2196f3">mdi-home</v-icon>
                  <span class="folder-name">최상위 루트</span>
                  <span v-if="sharedDocLocation === null" class="selected-indicator">
                    <v-icon color="primary" size="16">mdi-check</v-icon>
                  </span>
                </div>
                
                <!-- 계층구조 폴더 목록 -->
                <div 
                  v-for="folder in flattenedFolders" 
                  :key="folder.id"
                  class="folder-item"
                  :class="{ 'selected': sharedDocLocation === folder.id }"
                  :style="{ paddingLeft: `${20 + folder.level * 20}px` }"
                  @click="selectFolderForSharedDoc(folder)"
                >
                  <v-icon class="folder-icon" color="#ff9800">mdi-folder</v-icon>
                  <span class="folder-name">{{ folder.name }}</span>
                  <span v-if="sharedDocLocation === folder.id" class="selected-indicator">
                    <v-icon color="primary" size="16">mdi-check</v-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 잠금 설정 -->
          <div class="lock-setting">
            <v-checkbox
              v-model="sharedDocIsLocked"
              label="문서 잠금 (편집 권한 제한)"
              color="primary"
              hide-details
            />
          </div>
        </v-card-text>
        
        <v-card-actions class="modal-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeModals">취소</v-btn>
          <v-btn 
            color="primary" 
            @click="createSharedDoc"
            :disabled="!sharedDocTitle.trim()"
          >
            만들기
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 파일 업로드 모달 -->
    <v-dialog v-model="showUploadModal" max-width="600px" @click:outside="closeModals">
      <v-card class="upload-modal">
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="primary">mdi-upload</v-icon>
            <h3 class="modal-title">파일 업로드</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeModals"></v-btn>
        </v-card-title>
        
        <v-card-text class="modal-body">
          <div v-if="uploadFiles.length > 0" class="upload-files">
            <div class="upload-files-header">
              <span class="files-count">{{ uploadFiles.length }}개 파일 선택됨</span>
            </div>
            <div class="files-list">
              <div 
                v-for="(file, index) in uploadFiles" 
                :key="index"
                class="file-item"
              >
                <v-icon class="file-icon">{{ getFileIcon(file.type) }}</v-icon>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ formatFileSizeFromBytes(file.size) }}</div>
                </div>
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="uploadFiles.splice(index, 1)"
                ></v-btn>
              </div>
            </div>
          </div>
          <div v-else class="upload-placeholder">
            <v-icon size="48" color="grey">mdi-cloud-upload</v-icon>
            <p>업로드할 파일이 없습니다</p>
          </div>
        </v-card-text>
        
        <v-card-actions class="modal-actions">
          <v-btn variant="text" @click="$refs.fileInput.click()">
            <v-icon left>mdi-plus</v-icon>
            파일 추가
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeModals">취소</v-btn>
          <v-btn 
            color="primary" 
            @click="uploadFilesToDrive"
            :disabled="uploadFiles.length === 0"
          >
            업로드
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 드롭 액션 선택 모달 -->
    <v-dialog v-model="showDropModal" max-width="500px" @click:outside="closeDropModal">
      <v-card class="drop-action-modal">
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="primary">mdi-drag</v-icon>
            <h3 class="modal-title">이동 방식 선택</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeDropModal"></v-btn>
        </v-card-title>
        
        <v-card-text class="modal-body">
          <div class="drop-info">
            <div class="dragged-item">
              <v-icon :color="draggedItem?.color" size="24">{{ draggedItem?.icon }}</v-icon>
              <span class="item-name">{{ draggedItem?.name }}</span>
            </div>
            <v-icon class="arrow-icon" color="primary">mdi-arrow-right</v-icon>
            <div class="target-item">
              <v-icon :color="dropTarget?.color" size="24">{{ dropTarget?.icon }}</v-icon>
              <span class="item-name">{{ dropTarget?.name }}</span>
            </div>
          </div>
          
          <div class="action-options">
            <div class="option-item" @click="selectDropAction('move')">
              <div class="option-icon">
                <v-icon color="#4caf50" size="32">mdi-folder-move</v-icon>
              </div>
              <div class="option-content">
                <h4 class="option-title">폴더로 이동</h4>
                <p class="option-description">선택한 폴더 안으로 이동합니다</p>
              </div>
            </div>
            
            <div class="option-item" @click="selectDropAction('reorder')">
              <div class="option-icon">
                <v-icon color="#ff9800" size="32">mdi-sort</v-icon>
              </div>
              <div class="option-content">
                <h4 class="option-title">순서 변경</h4>
                <p class="option-description">선택한 폴더 앞으로 이동합니다</p>
              </div>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions class="modal-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDropModal">취소</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.project-drive {
  height: calc(100vh - 60px);
  background: rgb(var(--v-theme-background));
  display: flex;
  flex-direction: column;
}

/* 헤더 */
.drive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.title-icon {
  color: rgb(var(--v-theme-primary));
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.breadcrumb-item {
  cursor: pointer;
  transition: color 0.2s ease;
}

.breadcrumb-item.clickable:hover {
  color: rgb(var(--v-theme-primary));
}

.breadcrumb-separator {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-container {
  position: relative;
  width: 300px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.6);
  z-index: 2;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 8px 16px 8px 48px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 20px;
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 1);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.view-controls {
  display: flex;
  align-items: center;
}

.view-toggle {
  border-radius: 8px;
}

/* 툴바 */
.drive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn,
.upload-btn,
.new-folder-btn,
.new-shared-doc-btn {
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition: all 0.2s ease;
}

.back-btn:hover,
.upload-btn:hover,
.new-folder-btn:hover,
.new-shared-doc-btn:hover {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-right: 8px;
}

.sort-controls .v-btn {
  font-size: 12px;
  text-transform: none;
  color: rgba(var(--v-theme-on-surface), 0.7);
  min-width: auto;
  padding: 4px 8px;
}

.sort-controls .v-btn.active {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

/* 콘텐츠 */
.drive-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #666;
}

/* 그리드 뷰 */
.grid-view {
  width: 100%;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.grid-item {
  background: rgb(var(--v-theme-surface));
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.grid-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.grid-item.selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.grid-item.drag-over {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  transform: scale(1.02);
}

.item-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  text-align: center;
  word-break: break-word;
  line-height: 1.4;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.item-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

/* 리스트 뷰 */
.list-view {
  width: 100%;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-items {
  max-height: 600px;
  overflow-y: auto;
}

.list-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.list-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.list-item.selected {
  background: rgba(var(--v-theme-primary), 0.05);
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.list-item.drag-over {
  background: rgba(var(--v-theme-primary), 0.1);
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.list-cell {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.name-cell {
  gap: 12px;
}

.item-icon {
  flex-shrink: 0;
}

.item-name {
  font-weight: 500;
  word-break: break-word;
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-cell,
.date-cell,
.uploader-cell {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* 모달 스타일 */
.folder-modal,
.upload-modal,
.shared-doc-modal {
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 24px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.modal-body {
  padding: 24px;
}

.modal-actions {
  padding: 16px 24px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

/* 업로드 모달 특별 스타일 */
.upload-files {
  max-height: 300px;
  overflow-y: auto;
}

.upload-files-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.files-count {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.file-icon {
  color: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.upload-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.upload-placeholder p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

/* 공유문서 모달 특별 스타일 */
.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 8px;
}

.folder-selection {
  position: relative;
}

.folder-selector {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(var(--v-theme-surface), 0.8);
}

.folder-selector:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 1);
}

.selected-folder {
  display: flex;
  align-items: center;
  gap: 12px;
}

.folder-icon {
  color: rgb(var(--v-theme-primary));
}

.folder-name {
  flex: 1;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.dropdown-icon {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: transform 0.2s ease;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

.folder-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
}

.folder-list {
  padding: 8px 0;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.folder-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.folder-item.selected {
  background: rgba(var(--v-theme-primary), 0.15);
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.expand-icon {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: transform 0.2s ease;
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 16px;
  height: 16px;
  visibility: hidden;
}

.folder-item .folder-icon {
  color: rgb(var(--v-theme-primary));
  width: 20px;
  height: 20px;
}

.folder-item .folder-name {
  flex: 1;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.selected-indicator {
  display: flex;
  align-items: center;
  margin-left: auto;
}

/* 공유문서 아이콘 */
.shared-doc-icons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.shared-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.8;
  transition: all 0.2s ease;
}

.shared-icon:hover {
  opacity: 1;
  transform: scale(1.1);
}

.lock-icon {
  color: #ff9800;
  opacity: 0.9;
  transition: all 0.2s ease;
}

.lock-icon:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* 아이템 액션 버튼 */
.item-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.grid-item:hover .item-actions {
  opacity: 1;
}

.action-btn {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: all 0.2s ease;
}

.action-btn:hover {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.lock-setting {
  padding: 16px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

/* 반응형 */
@media (max-width: 768px) {
  .drive-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-box {
    width: 200px;
  }
  
  .grid-container {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 16px;
  }
  
  .list-header,
  .list-item {
    grid-template-columns: 2fr 1fr 1fr;
  }
  
  .uploader-column,
  .uploader-cell {
    display: none;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-actions {
    padding: 12px 20px;
  }
}

/* 드롭 액션 모달 스타일 */
.drop-action-modal {
  border-radius: 16px;
  overflow: hidden;
}

.drop-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 12px;
  margin-bottom: 24px;
}

.dragged-item,
.target-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.arrow-icon {
  color: rgb(var(--v-theme-primary));
}

.action-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-2px);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 12px;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 4px 0;
}

.option-description {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
}

/* 폴더 이름 변경 스타일 */
.rename-input {
  background: transparent;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  width: 100%;
  outline: none;
}

.rename-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

/* 로딩 상태 스타일 */
.loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}

/* 삭제 버튼 스타일 */
.delete-btn {
  color: #f44336 !important;
}

.delete-btn:hover {
  background-color: rgba(244, 67, 54, 0.1) !important;
}
</style>