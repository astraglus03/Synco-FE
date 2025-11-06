import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/store/searchStore'
import { useWorkspaceStore } from '@/store/workspaceStore'

/**
 * 검색 기능을 위한 Composable
 * 
 * 협업 프로젝트에서 검색 기능을 쉽게 사용할 수 있도록 도와주는 훅
 * 
 * @param {Object} options - 검색 옵션
 * @param {String} options.scope - 검색 범위 ('all', 'current-workspace', 'current-channel', 'personal', 'project')
 * @param {Array} options.types - 검색할 타입들
 * @param {String} options.placeholder - placeholder 텍스트
 * @param {Boolean} options.autoNavigate - 자동 네비게이션 여부
 * @param {String} options.channelId - 특정 채널 ID (current-channel일 때 사용)
 * @returns {Object} 검색 관련 상태와 메서드들
 */
export function useSearch(options = {}) {
  const router = useRouter()
  const searchStore = useSearchStore()
  const workspaceStore = useWorkspaceStore()
  
  // 기본 옵션
  const defaultOptions = {
    scope: 'current-workspace',
    types: ['messages', 'files', 'users', 'channels'],
    placeholder: '검색...',
    autoNavigate: true,
    channelId: null
  }
  
  const config = { ...defaultOptions, ...options }
  
  // 검색 상태
  const searchQuery = ref('')
  const isSearching = ref(false)
  const searchResults = ref([])
  
  // 검색 수행
  const performSearch = async (query) => {
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    
    isSearching.value = true
    searchQuery.value = query
    
    try {
      await searchStore.performSearch(query, {
        scope: config.scope,
        types: config.types,
        workspaceId: workspaceStore.currentWorkspace,
        channelId: config.channelId
      })
      
      searchResults.value = searchStore.filteredResults
    } catch (error) {
      console.error('검색 오류:', error)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }
  
  // 검색 결과 선택
  const selectResult = (result) => {
    if (config.autoNavigate) {
      navigateToResult(result)
    }
    
    // 검색 결과 클리어
    searchResults.value = []
    searchQuery.value = ''
  }
  
  // ID에서 접두사 제거 (workspace_4 → 4, chat_8 → 8)
  const extractId = (fullId) => {
    if (!fullId) return fullId
    const match = fullId.match(/_(\d+)$/)
    if (match) {
      return match[1]
    }
    return fullId
  }
  
  // 결과로 네비게이션
  const navigateToResult = (result) => {
    const currentWorkspace = workspaceStore.currentWorkspaceInfo
    const cleanWorkspaceId = extractId(currentWorkspace.id)
    
    switch (result.type) {
      case 'message':
        router.push(`/workspaces/${cleanWorkspaceId}/chats?messageId=${result.id}`)
        break
      case 'file':
        router.push(`/workspaces/${cleanWorkspaceId}/drive?fileId=${result.id}`)
        break
      case 'user':
        router.push(`/workspaces/${cleanWorkspaceId}/friends?userId=${result.id}`)
        break
      case 'channel':
        router.push(`/workspaces/${cleanWorkspaceId}/${result.id}`)
        break
      default:
        console.log('알 수 없는 결과 타입:', result.type)
    }
  }
  
  // 검색 설정 업데이트
  const updateSearchConfig = (newConfig) => {
    Object.assign(config, newConfig)
  }
  
  // 검색 히스토리 가져오기
  const getSearchHistory = () => {
    return searchStore.recentSearches
  }
  
  // 검색 통계 가져오기
  const getSearchStats = () => {
    return searchStore.searchStats
  }
  
  return {
    // State
    searchQuery,
    isSearching,
    searchResults,
    config,
    
    // Actions
    performSearch,
    selectResult,
    navigateToResult,
    updateSearchConfig,
    
    // Getters
    getSearchHistory,
    getSearchStats
  }
}

/**
 * 채팅 검색 전용 훅
 * 메시지 검색에 최적화된 설정
 */
export function useChatSearch() {
  return useSearch({
    scope: 'current-workspace',
    types: ['messages'],
    placeholder: '채팅 검색...'
  })
}

/**
 * 파일 검색 전용 훅
 * 파일 검색에 최적화된 설정
 */
export function useFileSearch() {
  return useSearch({
    scope: 'current-workspace',
    types: ['files'],
    placeholder: '파일 검색...'
  })
}

/**
 * 사용자 검색 전용 훅
 * 사용자 검색에 최적화된 설정 (자동 네비게이션 비활성화)
 */
export function useUserSearch() {
  return useSearch({
    scope: 'all',
    types: ['users'],
    placeholder: '사용자 검색...',
    autoNavigate: false
  })
}

/**
 * 전체 검색 전용 훅
 * 모든 타입의 검색에 최적화된 설정
 */
export function useGlobalSearch() {
  return useSearch({
    scope: 'all',
    types: ['messages', 'files', 'users', 'channels'],
    placeholder: '전체 검색...'
  })
}

/**
 * 팀 검색 전용 훅
 * 팀 워크스페이스 내 검색에 최적화된 설정
 */
export function useProjectSearch() {
  return useSearch({
    scope: 'current-workspace',
    types: ['messages', 'files', 'users', 'channels'],
    placeholder: '팀 검색...'
  })
}

/**
 * 개인 검색 전용 훅
 * 개인 워크스페이스 내 검색에 최적화된 설정
 */
export function usePersonalSearch() {
  return useSearch({
    scope: 'personal',
    types: ['messages', 'files'],
    placeholder: '개인 검색...'
  })
}

/**
 * 채널 검색 전용 훅
 * 특정 채널 내 검색에 최적화된 설정
 */
export function useChannelSearch(channelId) {
  return useSearch({
    scope: 'current-channel',
    types: ['messages', 'files'],
    placeholder: '채널 검색...',
    channelId: channelId
  })
}

/**
 * 1:1 채팅 검색 전용 훅
 * 1:1 채팅방 내 검색에 최적화된 설정
 */
export function useDirectChatSearch(chatId) {
  return useSearch({
    scope: 'current-channel',
    types: ['messages'],
    placeholder: '1:1 채팅 검색...',
    channelId: chatId
  })
}

/**
 * 팀 채팅 검색 전용 훅
 * 팀 채팅방 내 검색에 최적화된 설정
 */
export function useProjectChatSearch(projectChatId) {
  return useSearch({
    scope: 'current-channel',
    types: ['messages', 'files'],
    placeholder: '팀 채팅 검색...',
    channelId: projectChatId
  })
}