<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePermissions, PERMISSIONS } from '@/composables/usePermissions'
import SharedDocEditor from './SharedDocEditor.vue'

const props = defineProps({
  currentChannel: String
})

const { hasPermission, isManager, isSuper } = usePermissions()

// 뷰 모드 (list, grid)
const viewMode = ref('grid')

// 현재 폴더 경로
const currentPath = ref([])

// 선택된 항목들
const selectedItems = ref([])

// 드래그 앤 드롭 상태
const draggedItem = ref(null)
const dragOverItem = ref(null)

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

// 팀 멤버 데이터
const teamMembers = ref([
  { id: 1, name: '김민수', avatar: '김', role: '팀장', status: 'online' },
  { id: 2, name: '이지현', avatar: '이', role: '디자이너', status: 'away' },
  { id: 3, name: '박준호', avatar: '박', role: '개발자', status: 'online' },
  { id: 4, name: '최수진', avatar: '최', role: '마케터', status: 'offline' },
  { id: 5, name: '정다은', avatar: '정', role: '기획자', status: 'online' }
])

// 파일/폴더 데이터 (계층 구조)
const fileSystem = ref([
  {
    id: 1,
    name: '프로젝트 문서',
    type: 'folder',
    size: '-',
    uploader: '김민수',
    uploadDate: '2025-01-10',
    modifiedDate: '2025-01-15',
    icon: 'mdi-folder',
    color: '#2196f3',
    parentId: null,
    children: [
      {
        id: 11,
        name: '기획서',
        type: 'folder',
        size: '-',
        uploader: '김민수',
        uploadDate: '2025-01-10',
        modifiedDate: '2025-01-12',
        icon: 'mdi-folder',
        color: '#2196f3',
        parentId: 1,
        children: [
          {
            id: 111,
            name: '프로젝트 기획서_v2.pdf',
            type: 'file',
            size: '2.3 MB',
            uploader: '김민수',
            uploadDate: '2025-01-12',
            modifiedDate: '2025-01-12',
            icon: 'mdi-file-pdf',
            color: '#f44336',
            parentId: 11
          },
          {
            id: 112,
            name: '요구사항 정의서.docx',
            type: 'file',
            size: '1.8 MB',
            uploader: '이지현',
            uploadDate: '2025-01-11',
            modifiedDate: '2025-01-11',
            icon: 'mdi-file-word',
            color: '#2196f3',
            parentId: 11
          }
        ]
      },
      {
        id: 12,
        name: '디자인',
        type: 'folder',
        size: '-',
        uploader: '최수진',
        uploadDate: '2025-01-09',
        modifiedDate: '2025-01-14',
        icon: 'mdi-folder',
        color: '#2196f3',
        parentId: 1,
        children: [
          {
            id: 121,
            name: 'UI_디자인_시안.psd',
            type: 'file',
            size: '15.7 MB',
            uploader: '최수진',
            uploadDate: '2025-01-14',
            modifiedDate: '2025-01-14',
            icon: 'mdi-file-image',
            color: '#ff5722',
            parentId: 12
          },
          {
            id: 122,
            name: '아이콘_세트.ai',
            type: 'file',
            size: '8.2 MB',
            uploader: '최수진',
            uploadDate: '2025-01-13',
            modifiedDate: '2025-01-13',
            icon: 'mdi-file-image',
            color: '#ff5722',
            parentId: 12
          }
        ]
      }
    ]
  },
  {
    id: 2,
    name: '마케팅 자료',
    type: 'folder',
    size: '-',
    uploader: '이지현',
    uploadDate: '2025-01-08',
    modifiedDate: '2025-01-16',
    icon: 'mdi-folder',
    color: '#2196f3',
    parentId: null,
    children: [
      {
        id: 21,
        name: '브랜드 가이드.pdf',
        type: 'file',
        size: '5.2 MB',
        uploader: '이지현',
        uploadDate: '2025-01-16',
        modifiedDate: '2025-01-16',
        icon: 'mdi-file-pdf',
        color: '#f44336',
        parentId: 2
      },
      {
        id: 22,
        name: '소셜미디어_템플릿.psd',
        type: 'file',
        size: '12.1 MB',
        uploader: '이지현',
        uploadDate: '2025-01-15',
        modifiedDate: '2025-01-15',
        icon: 'mdi-file-image',
        color: '#ff5722',
        parentId: 2
      }
    ]
  },
  {
    id: 3,
    name: '개발 문서',
    type: 'folder',
    size: '-',
    uploader: '박준호',
    uploadDate: '2025-01-07',
    modifiedDate: '2025-01-17',
    icon: 'mdi-folder',
    color: '#2196f3',
    parentId: null,
    children: [
      {
        id: 31,
        name: 'API_문서.md',
        type: 'file',
        size: '0.8 MB',
        uploader: '박준호',
        uploadDate: '2025-01-17',
        modifiedDate: '2025-01-17',
        icon: 'mdi-file-document',
        color: '#607d8b',
        parentId: 3
      },
      {
        id: 32,
        name: '데이터베이스_스키마.sql',
        type: 'file',
        size: '0.3 MB',
        uploader: '박준호',
        uploadDate: '2025-01-16',
        modifiedDate: '2025-01-16',
        icon: 'mdi-file-code',
        color: '#795548',
        parentId: 3
      }
    ]
  },
  {
    id: 4,
    name: '회의록_2025_01_15.txt',
    type: 'file',
    size: '0.5 KB',
    uploader: '김민수',
    uploadDate: '2025-01-15',
    modifiedDate: '2025-01-15',
    icon: 'mdi-file-document',
    color: '#607d8b',
    parentId: null
  },
  {
    id: 7,
    name: '프로젝트 회의록',
    type: 'shared-doc',
    size: '-',
    uploader: '김민수',
    uploadDate: '2025-01-15',
    modifiedDate: '2025-01-15',
    icon: 'mdi-file-document-multiple',
    color: '#ff9800',
    parentId: null,
    isShared: true,
    isLocked: false,
    content: '프로젝트 회의록\n\n일시: 2025년 1월 15일\n참석자: 김민수, 이지현, 박준호\n\n주요 안건:\n1. 프로젝트 진행 상황 검토\n2. 다음 주 계획 수립\n3. 이슈 사항 논의\n\n결과:\n- 웹사이트 리뉴얼 프로젝트 70% 완료\n- 다음 주까지 UI 디자인 완료 예정\n- 데이터베이스 구축 작업 시작'
  },
  {
    id: 8,
    name: '기획서 초안',
    type: 'shared-doc',
    size: '-',
    uploader: '이지현',
    uploadDate: '2025-01-14',
    modifiedDate: '2025-01-16',
    icon: 'mdi-file-document-multiple',
    color: '#ff9800',
    parentId: 1,
    isShared: true,
    isLocked: true,
    content: '기획서 초안\n\n1. 프로젝트 개요\n- 목적: 사용자 경험 개선\n- 기간: 3개월\n- 예산: 5천만원\n\n2. 주요 기능\n- 반응형 웹 디자인\n- 모바일 최적화\n- 접근성 개선\n\n3. 일정\n- 1월: 기획 및 설계\n- 2월: 개발\n- 3월: 테스트 및 배포'
  },
  {
    id: 5,
    name: '데이터_분석_보고서.xlsx',
    type: 'file',
    size: '3.8 MB',
    uploader: '정다은',
    uploadDate: '2025-01-14',
    modifiedDate: '2025-01-14',
    icon: 'mdi-file-excel',
    color: '#4caf50',
    parentId: null
  },
  {
    id: 6,
    name: '프레젠테이션_자료.pptx',
    type: 'file',
    size: '7.2 MB',
    uploader: '김민수',
    uploadDate: '2025-01-13',
    modifiedDate: '2025-01-13',
    icon: 'mdi-file-powerpoint',
    color: '#2196f3',
    parentId: null
  }
])

// 현재 폴더의 항목들 (폴더 우선, 파일 나중)
const currentItems = computed(() => {
  const currentFolderId = currentPath.value.length > 0 ? currentPath.value[currentPath.value.length - 1] : null
  let items = []
  
  if (currentFolderId) {
    // 특정 폴더 내부
    const folder = findItemById(currentFolderId)
    items = folder?.children || []
  } else {
    // 루트 폴더
    items = fileSystem.value
  }
  
  // 폴더 우선, 파일 나중으로 정렬
  const folders = items.filter(item => item.type === 'folder')
  const files = items.filter(item => item.type !== 'folder')
  
  // 각각을 선택된 정렬 기준으로 정렬
  const sortedFolders = sortItems(folders)
  const sortedFiles = sortItems(files)
  
  return [...sortedFolders, ...sortedFiles]
})

// 필터링된 항목들
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return currentItems.value
  
  return currentItems.value.filter(item => 
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 아이템 찾기 (재귀)
const findItemById = (id, items = fileSystem.value) => {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findItemById(id, item.children)
      if (found) return found
    }
  }
  return null
}

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

// 폴더 더블클릭으로 진입
const enterFolder = (folder) => {
  if (folder.type === 'folder') {
    currentPath.value.push(folder.id)
  }
}

// 공유문서 더블클릭으로 문서 편집기 진입
const openSharedDoc = (doc) => {
  if (doc.type === 'shared-doc') {
    currentDocument.value = {
      ...doc,
      content: doc.content || '문서를 작성해보세요...'
    }
    showDocEditor.value = true
  }
}

// 파일 다운로드
const downloadFile = (file) => {
  if (file.type !== 'folder' && file.type !== 'shared-doc') {
    console.log('파일 다운로드:', file.name)
    // TODO: 실제 파일 다운로드 로직 구현
  }
}

// 공유문서 저장
const saveDocument = (docData) => {
  const doc = findItemById(docData.id)
  if (doc) {
    doc.content = docData.content
    doc.modifiedDate = docData.modifiedDate
  }
}

// 공유문서 편집기 닫기
const closeDocEditor = () => {
  showDocEditor.value = false
  currentDocument.value = null
}

// 공유문서 잠금 해제/잠금
const toggleDocumentLock = (docId) => {
  const doc = findItemById(docId)
  if (doc && doc.type === 'shared-doc') {
    doc.isLocked = !doc.isLocked
    // 현재 편집 중인 문서라면 currentDocument도 업데이트
    if (currentDocument.value && currentDocument.value.id === docId) {
      currentDocument.value.isLocked = doc.isLocked
    }
  }
}

// 뒤로가기
const goBack = () => {
  if (currentPath.value.length > 0) {
    currentPath.value.pop()
  }
}

// 홈으로
const goHome = () => {
  currentPath.value = []
}

// 현재 경로 표시
const currentPathDisplay = computed(() => {
  if (currentPath.value.length === 0) return '홈'
  
  const pathNames = currentPath.value.map(id => {
    const item = findItemById(id)
    return item ? item.name : '알 수 없음'
  })
  
  return ['홈', ...pathNames].join(' / ')
})

// 아이템 선택
const selectItem = (item, event) => {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd 클릭: 다중 선택
    const index = selectedItems.value.findIndex(selected => selected.id === item.id)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    } else {
      selectedItems.value.push(item)
    }
  } else {
    // 일반 클릭: 단일 선택
    selectedItems.value = [item]
  }
}

// 드래그 시작
const startDrag = (item, event) => {
  draggedItem.value = item
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', item.id)
}

// 드래그 오버
const handleDragOver = (item, event) => {
  event.preventDefault()
  if (item.type === 'folder') {
    dragOverItem.value = item
    event.dataTransfer.dropEffect = 'move'
  }
}

// 드래그 리브
const handleDragLeave = () => {
  dragOverItem.value = null
}

// 드롭
const handleDrop = (targetItem, event) => {
  event.preventDefault()
  
  if (!draggedItem.value || !targetItem || targetItem.type !== 'folder') return
  
  // 같은 폴더로 이동하는 경우 무시
  if (draggedItem.value.parentId === targetItem.id) return
  
  // 아이템 이동
  moveItem(draggedItem.value.id, targetItem.id)
  
  dragOverItem.value = null
  draggedItem.value = null
}

// 아이템 이동
const moveItem = (itemId, newParentId) => {
  const item = findItemById(itemId)
  if (!item) return
  
  // 기존 위치에서 제거
  removeItemFromParent(itemId, item.parentId)
  
  // 새 위치에 추가
  addItemToParent(item, newParentId)
  
  // 선택 해제
  selectedItems.value = []
}

// 부모에서 아이템 제거
const removeItemFromParent = (itemId, parentId) => {
  if (parentId === null) {
    const index = fileSystem.value.findIndex(item => item.id === itemId)
    if (index > -1) fileSystem.value.splice(index, 1)
  } else {
    const parent = findItemById(parentId)
    if (parent && parent.children) {
      const index = parent.children.findIndex(item => item.id === itemId)
      if (index > -1) parent.children.splice(index, 1)
    }
  }
}

// 부모에 아이템 추가
const addItemToParent = (item, parentId) => {
  item.parentId = parentId
  
  if (parentId === null) {
    fileSystem.value.push(item)
  } else {
    const parent = findItemById(parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(item)
    }
  }
}

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
const createFolder = () => {
  if (!newFolderName.value.trim()) return
  
  const newFolder = {
    id: Date.now(),
    name: newFolderName.value.trim(),
    type: 'folder',
    size: '-',
    uploader: '김민수', // 현재 사용자
    uploadDate: new Date().toISOString().split('T')[0],
    modifiedDate: new Date().toISOString().split('T')[0],
    icon: 'mdi-folder',
    color: '#2196f3',
    parentId: currentPath.value.length > 0 ? currentPath.value[currentPath.value.length - 1] : null,
    children: []
  }
  
  // 현재 폴더에 추가
  if (newFolder.parentId) {
    const parent = findItemById(newFolder.parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(newFolder)
    }
  } else {
    fileSystem.value.push(newFolder)
  }
  
  newFolderName.value = ''
  showNewFolderModal.value = false
}

// 파일 업로드
const handleFileUpload = (event) => {
  const files = Array.from(event.target.files)
  uploadFiles.value = files
  showUploadModal.value = true
}

// 파일 업로드 처리
const uploadFilesToDrive = () => {
  if (uploadFiles.value.length === 0) return
  
  const currentFolderId = currentPath.value.length > 0 ? currentPath.value[currentPath.value.length - 1] : null
  
  uploadFiles.value.forEach(file => {
    const newFile = {
      id: Date.now() + Math.random(),
      name: file.name,
      type: getFileType(file.type),
      size: formatFileSizeFromBytes(file.size),
      uploader: '김민수', // 현재 사용자
      uploadDate: new Date().toISOString().split('T')[0],
      modifiedDate: new Date().toISOString().split('T')[0],
      icon: getFileIcon(file.type),
      color: getFileColor(file.type),
      parentId: currentFolderId
    }
    
    // 현재 폴더에 추가
    if (newFile.parentId) {
      const parent = findItemById(newFile.parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(newFile)
      }
    } else {
      fileSystem.value.push(newFile)
    }
  })
  
  uploadFiles.value = []
  showUploadModal.value = false
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
const createSharedDoc = () => {
  if (!sharedDocTitle.value.trim()) return
  
  const newSharedDoc = {
    id: Date.now(),
    name: sharedDocTitle.value.trim(),
    type: 'shared-doc',
    size: '-',
    uploader: '김민수', // 현재 사용자
    uploadDate: new Date().toISOString().split('T')[0],
    modifiedDate: new Date().toISOString().split('T')[0],
    icon: 'mdi-file-document-multiple',
    color: '#ff9800',
    parentId: sharedDocLocation.value,
    isShared: true,
    isLocked: sharedDocIsLocked.value
  }
  
  // 선택된 폴더에 추가
  if (newSharedDoc.parentId) {
    const parent = findItemById(newSharedDoc.parentId)
    if (parent) {
      if (!parent.children) parent.children = []
      parent.children.push(newSharedDoc)
    }
  } else {
    fileSystem.value.push(newSharedDoc)
  }
  
  // 폼 초기화
  sharedDocTitle.value = ''
  sharedDocLocation.value = null
  sharedDocIsLocked.value = false
  showSharedDocModal.value = false
  showFolderSelector.value = false
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
  
  buildHierarchy(fileSystem.value)
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
  const folder = findItemById(sharedDocLocation.value)
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

onMounted(() => {
  // 초기화
})
</script>

<template>
  <div class="team-drive">
    <!-- 헤더 -->
    <div class="drive-header">
      <div class="header-left">
        <h2 class="page-title">
          <v-icon class="title-icon">mdi-folder-multiple</v-icon>
          드라이브
        </h2>
        <div class="breadcrumb">
          <span class="breadcrumb-item" @click="goHome">홈</span>
          <template v-for="(id, index) in currentPath" :key="id">
            <v-icon size="16" class="breadcrumb-separator">mdi-chevron-right</v-icon>
            <span class="breadcrumb-item">{{ findItemById(id)?.name || '알 수 없음' }}</span>
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
          v-if="currentPath.length > 0"
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
          @click="showSharedDocModal = true"
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
      <!-- 그리드 뷰 -->
      <div v-if="viewMode === 'grid'" class="grid-view">
        <div class="grid-container">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="grid-item"
            :class="{ 
              'selected': selectedItems.some(selected => selected.id === item.id),
              'drag-over': dragOverItem?.id === item.id
            }"
            @click="selectItem(item, $event)"
            @dblclick="item.type === 'folder' ? enterFolder(item) : item.type === 'shared-doc' ? openSharedDoc(item) : null"
            @dragstart="startDrag(item, $event)"
            @dragover="handleDragOver(item, $event)"
            @dragleave="handleDragLeave"
            @drop="handleDrop(item, $event)"
            draggable="true"
          >
            <div class="item-icon">
              <v-icon :color="item.color" size="48">{{ item.icon }}</v-icon>
            </div>
            <div class="item-name" :title="item.name">
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
              'drag-over': dragOverItem?.id === item.id
            }"
            @click="selectItem(item, $event)"
            @dblclick="item.type === 'folder' ? enterFolder(item) : item.type === 'shared-doc' ? openSharedDoc(item) : null"
            @dragstart="startDrag(item, $event)"
            @dragover="handleDragOver(item, $event)"
            @dragleave="handleDragLeave"
            @drop="handleDrop(item, $event)"
            draggable="true"
          >
            <div class="list-cell name-cell">
              <v-icon :color="item.color" size="20" class="item-icon">{{ item.icon }}</v-icon>
              <span class="item-name">{{ item.name }}</span>
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
                
                <div 
                  v-for="folder in hierarchicalFolders" 
                  :key="folder.id"
                  class="folder-item"
                  :class="{ 
                    'selected': sharedDocLocation === folder.id,
                    'has-children': folder.children && folder.children.length > 0
                  }"
                  :style="{ paddingLeft: (folder.level * 20 + 16) + 'px' }"
                  @click="selectFolderForSharedDoc(folder)"
                >
                  <v-icon 
                    v-if="folder.children && folder.children.length > 0"
                    class="expand-icon"
                    :class="{ 'expanded': folder.isExpanded }"
                    @click.stop="toggleFolderExpansion(folder.id)"
                  >
                    mdi-chevron-right
                  </v-icon>
                  <v-icon 
                    v-else
                    class="expand-placeholder"
                  ></v-icon>
                  <v-icon class="folder-icon" :color="folder.color">mdi-folder</v-icon>
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

    <!-- 공유문서 편집기 -->
    <SharedDocEditor
      v-if="currentDocument"
      v-model:is-open="showDocEditor"
      :document="currentDocument"
      @save="saveDocument"
      @close="closeDocEditor"
      @toggle-lock="toggleDocumentLock"
    />
  </div>
</template>

<style scoped>
.team-drive {
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

.breadcrumb-item:hover {
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
</style>