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
            <div class="result-title">{{ result.title }}</div>
            <div class="result-subtitle">{{ result.subtitle }}</div>
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

/**
 * GlobalSearch 컴포넌트
 * 
 * 협업 프로젝트에서 사용하는 공통 검색 컴포넌트
 * 
 * @param {String} placeholder - 검색 입력창 placeholder
 * @param {String} searchScope - 검색 범위 ('all', 'current-workspace', 'current-channel', 'personal', 'project')
 * @param {Array} searchTypes - 검색할 타입들 (['messages', 'files', 'users', 'channels'])
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
    default: () => ['messages', 'files', 'users', 'channels']
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
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      showResults.value = false
      return
    }
    
    try {
      const results = await performSearch(searchQuery.value)
      searchResults.value = results
      showResults.value = true
      calculateDropdownPosition()
      
      emit('search', { query: searchQuery.value, results })
    } catch (error) {
      console.error('검색 오류:', error)
      searchResults.value = []
    }
  }, props.debounceMs)
}

// Elasticsearch 검색 수행
const performSearch = async (query) => {
  const currentWorkspace = workspaceStore.currentWorkspaceInfo
  
  // 검색 범위에 따른 인덱스 결정
  let searchIndex = 'all'
  let channelId = null
  
  if (props.searchScope === 'current-workspace') {
    searchIndex = currentWorkspace?.id || 'personal'
  } else if (props.searchScope === 'current-channel') {
    searchIndex = currentWorkspace?.id || 'personal'
    channelId = props.channelId || workspaceStore.currentChannel
  } else if (props.searchScope === 'personal') {
    searchIndex = 'personal'
  } else if (props.searchScope === 'project') {
    searchIndex = 'project'
  }
  
  // 실제 API 호출 (현재는 목업 데이터)
  const mockResults = generateMockResults(query, searchIndex, channelId)
  return mockResults
}

// 목업 검색 결과 생성 (실제 구현 시 제거)
const generateMockResults = (query, searchIndex, channelId = null) => {
  const mockData = {
    messages: [
      { 
        id: '1', 
        type: 'message', 
        title: `${query} 관련 메시지`, 
        subtitle: channelId ? `채널 ${channelId}에서` : '채팅방에서', 
        icon: 'mdi-message', 
        iconColor: 'primary',
        channelId: channelId
      },
      { 
        id: '2', 
        type: 'message', 
        title: `${query} 대화 내용`, 
        subtitle: channelId ? `채널 ${channelId}에서` : '팀 채팅에서', 
        icon: 'mdi-message', 
        iconColor: 'primary',
        channelId: channelId
      }
    ],
    files: [
      { id: '1', type: 'file', title: `${query} 관련 문서.pdf`, subtitle: '문서 폴더', icon: 'mdi-file-document', iconColor: 'orange' },
      { id: '2', type: 'file', title: `${query} 이미지.jpg`, subtitle: '이미지 폴더', icon: 'mdi-image', iconColor: 'green' }
    ],
    users: [
      { id: '1', type: 'user', title: `${query} 사용자`, subtitle: '@username', icon: 'mdi-account', iconColor: 'blue' }
    ],
    channels: [
      { id: '1', type: 'channel', title: `${query} 채널`, subtitle: '채널 설명', icon: 'mdi-pound', iconColor: 'purple' }
    ]
  }
  
  const results = []
  props.searchTypes.forEach(type => {
    if (mockData[type]) {
      results.push(...mockData[type])
    }
  })
  
  return results.slice(0, 10) // 최대 10개 결과
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
  
  switch (result.type) {
    case 'message':
      router.push(`/workspace/${currentWorkspace.id}/chat?messageId=${result.id}`)
      break
    case 'file':
      router.push(`/workspace/${currentWorkspace.id}/drive?fileId=${result.id}`)
      break
    case 'user':
      router.push(`/workspace/${currentWorkspace.id}/friends?userId=${result.id}`)
      break
    case 'channel':
      router.push(`/workspace/${currentWorkspace.id}/${result.id}`)
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