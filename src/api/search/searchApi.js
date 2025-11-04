import axios from '@/utils/api'

// 엔드포인트 상수
const API_ENDPOINTS = {
  UNIFIED_SEARCH: (workSpaceSeq) => `/search-service/search/${workSpaceSeq}`,
}

// 통합 검색 API 호출
// workSpaceSeq: number | string
// params: { query: string, types?: string[], page?: number, size?: number }
export const searchUnified = async (workSpaceSeq, params) => {
  if (!workSpaceSeq) {
    throw new Error('workSpaceSeq가 없습니다.')
  }
  if (!params || !params.query || !params.query.trim()) {
    return { results: [], total: 0, facets: {} }
  }

  const endpoint = API_ENDPOINTS.UNIFIED_SEARCH(workSpaceSeq)
  const body = {
    query: params.query,
    types: params.types || undefined,
    page: typeof params.page === 'number' ? params.page : 0,
    size: typeof params.size === 'number' ? params.size : 20,
  }

  const response = await axios.post(endpoint, body)
  const data = response?.data?.data || response?.data

  // 방어적 기본값
  return {
    results: Array.isArray(data?.results) ? data.results : [],
    total: typeof data?.total === 'number' ? data.total : (typeof data?.total === 'string' ? Number(data.total) : 0),
    facets: data?.facets || {},
  }
}

export default {
  searchUnified,
}


