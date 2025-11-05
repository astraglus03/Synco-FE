<template>
  <div class="global-search-container">
    <div class="search-input-wrapper">
      <v-icon class="search-icon">mdi-magnify</v-icon>
      <input 
        ref="searchInputRef"
        v-model="searchQuery"
        type="text" 
        :placeholder="placeholder" 
        class="search-input"
        @input="handleSearch"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.enter="handleEnter"
        @keydown.escape="handleEscape"
        @keydown.space.prevent
      />
    </div>
    
    <!-- 검색 결과 드롭다운 -->
    <div v-if="showResults && searchResults.length > 0" class="search-results-dropdown" :style="dropdownPosition">
      <div class="search-results-list">
        <div
          v-for="result in searchResults"
          :key="result.id"
          class="search-result-item"
          @click="selectResult(result)"
        >
          <v-icon :color="result.iconColor">{{ result.icon }}</v-icon>
          <div class="result-info">
            <div class="result-title" v-html="highlight(result.title)"></div>
            <div class="result-subtitle" v-html="highlightSubtitle(result.subtitle)"></div>
            <div class="result-type">{{ result.type }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 검색 결과가 없을 때 -->
    <div v-if="showResults && searchResults.length === 0 && searchQuery" class="no-results" :style="dropdownPosition">
      <v-icon size="48" color="grey">mdi-magnify</v-icon>
      <p>검색 결과가 없습니다</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { searchUnified } from '@/api/search/searchApi'

/**
 * GlobalSearch 컴포넌트
 * 
 * 협업 프로젝트에서 사용하는 공통 검색 컴포넌트
 * 
 * @param {String} placeholder - 검색 입력창 placeholder
 * @param {String} searchScope - 검색 범위 ('all', 'current-workspace', 'current-channel', 'personal', 'project')
 * @param {Array} searchTypes - 검색할 타입들 (['task', 'file', 'message', 'meeting'])
 * @param {Boolean} autoNavigate - 검색 결과 선택 시 자동 네비게이션 여부
 * @param {Number} debounceMs - 검색 디바운스 시간 (ms)
 */
const props = defineProps({
  placeholder: {
    type: String,
    default: '검색...'
  },
  searchScope: {
    type: String,
    default: 'current-workspace',
    validator: (value) => ['all', 'current-workspace', 'current-channel', 'personal', 'project'].includes(value)
  },
  searchTypes: {
    type: Array,
    default: () => ['task', 'file', 'message', 'meeting']
  },
  autoNavigate: {
    type: Boolean,
    default: true
  },
  debounceMs: {
    type: Number,
    default: 300
  },
  channelId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['search', 'select', 'focus', 'blur'])

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const searchQuery = ref('')
const showResults = ref(false)
const searchResults = ref([])
const debounceTimer = ref(null)
const searchInputRef = ref(null)
const dropdownPosition = ref({ top: '60px', left: '50%', transform: 'translateX(-50%)', width: '300px' })

// 검색 처리 (디바운스 적용)
const handleSearch = () => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  
  debounceTimer.value = setTimeout(async () => {
    // 공백 제거 후 검색 (스페이스 무시)
    const q = String(searchQuery.value || '').replace(/\s+/g, '')
    if (!q) {
      searchResults.value = []
      showResults.value = false
      return
    }
    
    try {
      const results = await performSearch(q)
      searchResults.value = results
      showResults.value = true
      calculateDropdownPosition()
      
      emit('search', { query: q, results })
    } catch (error) {
      console.error('검색 오류:', error)
      searchResults.value = []
    }
  }, props.debounceMs)
}

// ID에서 접두사 제거 (workspace_4 → 4, chat_8 → 8, task_1 → 1)
const extractId = (fullId) => {
  if (!fullId) return fullId
  const match = fullId.match(/_(\d+)$/)
  if (match) {
    return match[1]
  }
  return fullId
}

// 프론트엔드 타입을 백엔드 타입으로 변환 (백엔드는 task, file, message, meeting만 지원)
const mapToBackendTypes = (frontendTypes) => {
  const typeMap = {
    'messages': 'message',
    'message': 'message',
    'files': 'file',
    'file': 'file',
    'task': 'task',
    'tasks': 'task',
    'meeting': 'meeting',
    'meetings': 'meeting'
  }
  
  // 지원하는 타입만 매핑하고 필터링
  const validBackendTypes = ['task', 'file', 'message', 'meeting']
  const mapped = frontendTypes
    .map(type => typeMap[type] || type)
    .filter(type => validBackendTypes.includes(type))
  
  // 중복 제거
  return [...new Set(mapped)]
}

// 타입에 따른 아이콘과 색상 매핑 (백엔드 지원 타입만)
const getResultIcon = (type) => {
  const iconMap = {
    task: 'mdi-checkbox-marked-circle',
    file: 'mdi-file-document',
    message: 'mdi-message',
    meeting: 'mdi-calendar-clock'
  }
  return iconMap[type] || 'mdi-circle'
}

const getResultIconColor = (type) => {
  const colorMap = {
    task: 'primary',
    file: 'orange',
    message: 'blue',
    meeting: 'green'
  }
  return colorMap[type] || 'grey'
}

// HTML 이스케이프 (XSS 방지)
const escapeHtml = (str) => {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 키워드 하이라이트 처리
const highlight = (text) => {
  const raw = escapeHtml(text)
  const keyword = String(searchQuery.value || '').trim().replace(/\s+/g, '')
  if (!keyword) return raw
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escapedKeyword, 'gi')
  return raw.replace(re, (m) => `<span class="highlight">${m}</span>`)
}

// 키워드가 포함된 부분만 추출 (subtitle용)
const extractKeywordSnippet = (text, maxLength = 100) => {
  if (!text) return ''
  
  const keyword = String(searchQuery.value || '').trim().replace(/\s+/g, '')
  if (!keyword) {
    // 키워드가 없으면 앞부분만 자르기
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
  
  // 대소문자 구분 없이 키워드 찾기
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const keywordIndex = lowerText.indexOf(lowerKeyword)
  
  if (keywordIndex === -1) {
    // 키워드가 없으면 앞부분만 반환
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
  
  // 키워드 위치 기준으로 앞뒤 텍스트 추출
  const halfLength = Math.floor(maxLength / 2)
  const start = Math.max(0, keywordIndex - halfLength)
  const end = Math.min(text.length, keywordIndex + keyword.length + halfLength)
  
  let snippet = text.substring(start, end)
  
  // 앞부분 생략 표시
  if (start > 0) {
    snippet = '...' + snippet
  }
  
  // 뒷부분 생략 표시
  if (end < text.length) {
    snippet = snippet + '...'
  }
  
  return snippet
}

// subtitle에 키워드 포함 부분만 표시하고 하이라이트
const highlightSubtitle = (text) => {
  const snippet = extractKeywordSnippet(text, 40) // 키워드 앞뒤 20자씩 (총 40자)
  return highlight(snippet)
}

// Elasticsearch 검색 수행
const performSearch = async (query) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  
  if (!currentWorkspace) {
    console.warn('워크스페이스 정보가 없습니다.')
    return []
  }
  
  // workSpaceSeq 추출 (personal인 경우 workSpaceSeq가 있을 수 있음)
  let workSpaceSeq = currentWorkspace.workSpaceSeq
  
  // workSpaceSeq가 없으면 ID에서 추출 시도
  if (!workSpaceSeq) {
    const extractedId = extractId(currentWorkspace.id)
    // 숫자로 변환 가능한지 확인
    if (/^\d+$/.test(extractedId)) {
      workSpaceSeq = Number(extractedId)
    } else {
      // personal인 경우 workSpaceSeq가 있을 수 있으므로 다시 확인
      workSpaceSeq = currentWorkspace.workSpaceSeq
    }
  }
  
  // workSpaceSeq가 여전히 없으면 에러
  if (!workSpaceSeq) {
    console.warn('워크스페이스 Seq를 찾을 수 없습니다.')
    return []
  }
  
  try {
    // 프론트엔드 타입을 백엔드 타입으로 변환
    const backendTypes = mapToBackendTypes(props.searchTypes)
    
    // API 호출
    const response = await searchUnified(workSpaceSeq, {
      query: query,
      types: backendTypes,
      page: 0,
      size: 20
    })
    
    // 백엔드 응답 결과에 아이콘과 색상 추가
    const results = response.results.map(result => ({
      ...result,
      icon: getResultIcon(result.type),
      iconColor: getResultIconColor(result.type)
    }))
    
    return results
  } catch (error) {
    console.error('검색 API 호출 실패:', error)
    throw error
  }
}

// 검색 결과 선택
const selectResult = (result) => {
  emit('select', result)
  
  if (props.autoNavigate) {
    navigateToResult(result)
  }
  
  // 검색 결과 숨기기
  showResults.value = false
  searchQuery.value = ''
}

// 결과로 네비게이션
const navigateToResult = (result) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  const cleanWorkspaceId = extractId(currentWorkspace.id)
  
  switch (result.type) {
    case 'message':
      const channelId = extractId(result.channelId)
      router.push(`/workspaces/${cleanWorkspaceId}/chats/${channelId}`)
      break
    case 'file':
      // 검색 결과에서 폴더 정보를 URL 경로 파라미터로 전달
      const fileId = extractId(result.id)
      // channelId가 folder_3 형식이므로 숫자 추출
      let folderId = null
      if (result.channelId) {
        const extracted = extractId(result.channelId)
        // 유효한 숫자인지 확인 (NaN, null, undefined 체크)
        if (extracted && extracted !== 'NaN' && !isNaN(extracted) && extracted !== 'null' && extracted !== 'undefined') {
          folderId = extracted
        }
      }
      // personal 워크스페이스 처리
      const workspaceIdForUrl = currentWorkspace?.id === 'personal' ? 'personal' : cleanWorkspaceId
      if (folderId) {
        router.push(`/workspaces/${workspaceIdForUrl}/drive/${folderId}`)
      } else {
        router.push(`/workspaces/${workspaceIdForUrl}/drive`)
      }
      break
    case 'task':
      // task ID에서 실제 ID 추출 (task_1 -> 1)
      const taskId = extractId(result.id)
      // 개인 워크스페이스면 개인 캘린더로 이동 + 상세 모달 오픈, 프로젝트면 팀 일정 + 상세 모달 오픈
      if (currentWorkspace?.id === 'personal' || currentWorkspace?.type === 'personal') {
        router.push(`/workspaces/personal/calendar`).then(() => {
          if (taskId) {
            // 이벤트를 한 번만 dispatch (중복 모달 방지)
            // 페이지 로딩을 기다리기 위해 약간의 지연 후 한 번만 실행
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskSeq: taskId } }))
            }, 300)
          }
        })
      } else {
        const path = `/workspaces/${cleanWorkspaceId}/schedules/team-schedule`
        router.push(path).then(() => {
          if (taskId) {
            // 이벤트를 한 번만 dispatch (중복 모달 방지)
            // 페이지 로딩을 기다리기 위해 약간의 지연 후 한 번만 실행
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskSeq: taskId } }))
            }, 300)
          }
        })
      }
      break
    case 'meeting':
      // meeting ID에서 실제 ID 추출
      const meetingId = extractId(result.id)
      router.push(`/workspaces/${cleanWorkspaceId}/meetings?meetingId=${meetingId}`)
      break
    default:
      console.log('알 수 없는 결과 타입:', result.type)
  }
}

// 드롭다운 위치 계산
const calculateDropdownPosition = () => {
  if (!searchInputRef.value) return
  
  const rect = searchInputRef.value.getBoundingClientRect()
  const searchBarWidth = rect.width
  const minDropdownWidth = 300
  const maxDropdownWidth = 400
  
  // 검색바 너비에 맞춰 드롭다운 너비 결정 (최소 300px, 최대 400px)
  const dropdownWidth = Math.max(minDropdownWidth, Math.min(maxDropdownWidth, searchBarWidth))
  
  // 검색바 바로 아래에 표시
  let left = `${rect.left}px`
  let transform = 'none'
  
  // 화면 경계 확인
  const screenWidth = window.innerWidth
  const rightEdge = rect.left + dropdownWidth
  
  if (rightEdge > screenWidth) {
    // 오른쪽 경계를 벗어나면 오른쪽 정렬
    left = `${rect.right - dropdownWidth}px`
  }
  
  dropdownPosition.value = {
    top: `${rect.bottom + 4}px`,
    left,
    transform,
    width: `${dropdownWidth}px`
  }
}

// 포커스 처리
const handleFocus = () => {
  calculateDropdownPosition()
  if (searchResults.value.length > 0) {
    showResults.value = true
  }
  emit('focus')
}

const handleBlur = () => {
  // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
  setTimeout(() => {
    showResults.value = false
  }, 200)
  emit('blur')
}

// 키보드 이벤트 처리
const handleEnter = () => {
  if (searchResults.value.length > 0) {
    selectResult(searchResults.value[0])
  }
}

const handleEscape = () => {
  showResults.value = false
  searchQuery.value = ''
}

// 검색 쿼리 변경 감지
watch(searchQuery, (newQuery) => {
  if (!newQuery.trim()) {
    searchResults.value = []
    showResults.value = false
  }
})

// 윈도우 리사이즈 이벤트 처리
const handleResize = () => {
  if (showResults.value) {
    calculateDropdownPosition()
  }
}

// 컴포넌트 마운트 시 이벤트 리스너 추가
import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

// 컴포넌트 언마운트 시 타이머 정리 및 이벤트 리스너 제거
onUnmounted(() => {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.global-search-container {
  position: relative;
  width: 100%;
  z-index: 1006;
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

.search-results-dropdown {
  position: fixed;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  max-height: 400px;
  overflow-y: auto;
}

.search-results-list {
  padding: 8px;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.result-info {
  flex: 1;
  margin-left: 12px;
}

.result-title {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
}

.result-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 12px;
  margin-top: 2px;
}

:deep(.highlight) {
  background: rgba(var(--v-theme-primary), 0.25);
  color: inherit;
  font-weight: 600;
  padding: 0 1px;
  border-radius: 2px;
}

.result-type {
  color: rgba(var(--v-theme-primary), 0.8);
  font-size: 11px;
  margin-top: 2px;
  text-transform: uppercase;
}

.no-results {
  position: fixed;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  padding: 24px;
  text-align: center;
}

.no-results p {
  margin: 8px 0 0 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}
</style>