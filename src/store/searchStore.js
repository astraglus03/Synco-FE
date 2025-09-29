import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSearchStore = defineStore('search', () => {
  // 검색 상태
  const searchQuery = ref('')
  const searchResults = ref([])
  const isSearching = ref(false)
  const searchHistory = ref([])
  const recentSearches = ref([])

  // 검색 설정
  const searchSettings = ref({
    scope: 'all', // 'all', 'current-workspace', 'current-channel', 'personal', 'team'
    types: ['messages', 'files', 'users', 'channels'],
    includeSubChannels: true,
    dateRange: null,
    sortBy: 'relevance', // 'relevance', 'date', 'name'
    channelId: null // 특정 채널 ID
  })

  // 검색 통계
  const searchStats = ref({
    totalSearches: 0,
    successfulSearches: 0,
    averageResponseTime: 0
  })

  // 검색 결과 필터링
  const filteredResults = computed(() => {
    if (!searchResults.value.length) return []
    
    return searchResults.value.filter(result => {
      // 타입 필터링
      if (searchSettings.value.types.length > 0) {
        if (!searchSettings.value.types.includes(result.type)) {
          return false
        }
      }
      
      // 날짜 범위 필터링
      if (searchSettings.value.dateRange) {
        const resultDate = new Date(result.date)
        const startDate = new Date(searchSettings.value.dateRange.start)
        const endDate = new Date(searchSettings.value.dateRange.end)
        
        if (resultDate < startDate || resultDate > endDate) {
          return false
        }
      }
      
      return true
    })
  })

  // 검색 결과 그룹화
  const groupedResults = computed(() => {
    const groups = {
      messages: [],
      files: [],
      users: [],
      channels: []
    }
    
    filteredResults.value.forEach(result => {
      if (groups[result.type]) {
        groups[result.type].push(result)
      }
    })
    
    return groups
  })

  // 검색 수행
  const performSearch = async (query, options = {}) => {
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    
    isSearching.value = true
    searchQuery.value = query
    
    try {
      const startTime = Date.now()
      
      // 검색 설정 업데이트
      const searchParams = {
        query,
        settings: { ...searchSettings.value, ...options },
        ...options
      }
      
      // current-channel인 경우 channelId 추가
      if (options.scope === 'current-channel' && options.channelId) {
        searchParams.channelId = options.channelId
      }
      
      // Elasticsearch API 호출
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      })
      
      const data = await response.json()
      searchResults.value = data.results || []
      
      // 검색 통계 업데이트
      const responseTime = Date.now() - startTime
      updateSearchStats(true, responseTime)
      
      // 검색 히스토리에 추가
      addToSearchHistory(query, data.results?.length || 0)
      
    } catch (error) {
      console.error('검색 오류:', error)
      searchResults.value = []
      updateSearchStats(false, 0)
    } finally {
      isSearching.value = false
    }
  }

  // 검색 설정 업데이트
  const updateSearchSettings = (newSettings) => {
    searchSettings.value = { ...searchSettings.value, ...newSettings }
  }

  // 검색 히스토리 추가
  const addToSearchHistory = (query, resultCount) => {
    const searchEntry = {
      query,
      resultCount,
      timestamp: new Date().toISOString(),
      id: Date.now()
    }
    
    searchHistory.value.unshift(searchEntry)
    
    // 최근 검색어 업데이트
    if (!recentSearches.value.includes(query)) {
      recentSearches.value.unshift(query)
      if (recentSearches.value.length > 10) {
        recentSearches.value.pop()
      }
    }
    
    // 히스토리 제한 (최대 100개)
    if (searchHistory.value.length > 100) {
      searchHistory.value.pop()
    }
  }

  // 검색 통계 업데이트
  const updateSearchStats = (success, responseTime) => {
    searchStats.value.totalSearches++
    if (success) {
      searchStats.value.successfulSearches++
    }
    
    // 평균 응답 시간 계산
    const totalTime = searchStats.value.averageResponseTime * (searchStats.value.totalSearches - 1) + responseTime
    searchStats.value.averageResponseTime = totalTime / searchStats.value.totalSearches
  }

  // 검색 결과 클리어
  const clearSearchResults = () => {
    searchResults.value = []
    searchQuery.value = ''
  }

  // 검색 히스토리 클리어
  const clearSearchHistory = () => {
    searchHistory.value = []
    recentSearches.value = []
  }

  // 특정 검색어 제거
  const removeSearchHistory = (searchId) => {
    const index = searchHistory.value.findIndex(item => item.id === searchId)
    if (index > -1) {
      searchHistory.value.splice(index, 1)
    }
  }

  return {
    // State
    searchQuery,
    searchResults,
    isSearching,
    searchHistory,
    recentSearches,
    searchSettings,
    searchStats,
    
    // Getters
    filteredResults,
    groupedResults,
    
    // Actions
    performSearch,
    updateSearchSettings,
    addToSearchHistory,
    updateSearchStats,
    clearSearchResults,
    clearSearchHistory,
    removeSearchHistory
  }
})
