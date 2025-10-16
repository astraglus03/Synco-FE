// SSE는 EventSource를 직접 사용하므로 별도 API 함수가 필요하지 않음
// EventSource는 브라우저에서 직접 SSE 연결을 처리합니다.

// ----------------------
// SSE 연결 상태 확인 API (개발용)
// ----------------------
import { apiGet } from '@/utils/api'

export const getSSEStatus = async () => {
  return await apiGet('/api/sse/status')
}
