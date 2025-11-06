/**
 * 로거 유틸리티
 * SSE 및 알림 관련 로그만 활성화하고 나머지는 비활성화
 */

// 로그 카테고리별 활성화 설정
const LOG_CONFIG = {
  SSE: true,          // SSE 관련 로그
  NOTIFICATION: true, // 알림 관련 로그
  APP: false,         // 앱 일반 로그
  API: false,         // API 호출 로그
  STORE: false,       // 스토어 로그
  COMPONENT: false,   // 컴포넌트 로그
  MEETING: false,     // 회의 관련 로그
  WORKSPACE: false,   // 워크스페이스 로그
  SCHEDULE: false,    // 일정 관련 로그
  DRIVE: false,       // 드라이브 로그
  DEFAULT: false      // 기본 로그
}

/**
 * 카테고리별 로그 함수
 */
export const logger = {
  // SSE 로그
  sse: (...args) => {
    if (LOG_CONFIG.SSE) {
      console.log(...args)
    }
  },
  
  // 알림 로그
  notification: (...args) => {
    if (LOG_CONFIG.NOTIFICATION) {
      console.log(...args)
    }
  },
  
  // 앱 로그
  app: (...args) => {
    if (LOG_CONFIG.APP) {
      console.log(...args)
    }
  },
  
  // API 로그
  api: (...args) => {
    if (LOG_CONFIG.API) {
      console.log(...args)
    }
  },
  
  // 스토어 로그
  store: (...args) => {
    if (LOG_CONFIG.STORE) {
      console.log(...args)
    }
  },
  
  // 컴포넌트 로그
  component: (...args) => {
    if (LOG_CONFIG.COMPONENT) {
      console.log(...args)
    }
  },
  
  // 회의 로그
  meeting: (...args) => {
    if (LOG_CONFIG.MEETING) {
      console.log(...args)
    }
  },
  
  // 워크스페이스 로그
  workspace: (...args) => {
    if (LOG_CONFIG.WORKSPACE) {
      console.log(...args)
    }
  },
  
  // 일정 로그
  schedule: (...args) => {
    if (LOG_CONFIG.SCHEDULE) {
      console.log(...args)
    }
  },
  
  // 드라이브 로그
  drive: (...args) => {
    if (LOG_CONFIG.DRIVE) {
      console.log(...args)
    }
  },
  
  // 에러 로그 (항상 표시)
  error: (...args) => {
    console.error(...args)
  },
  
  // 경고 로그 (항상 표시)
  warn: (...args) => {
    console.warn(...args)
  }
}

// 전역 console.log 오버라이드 (선택적)
export const disableAllConsoleLogs = () => {
  const noop = () => {}
  console.log = noop
  // console.error와 console.warn은 유지
}

// 특정 로그 카테고리 활성화/비활성화
export const setLogConfig = (category, enabled) => {
  if (category in LOG_CONFIG) {
    LOG_CONFIG[category] = enabled
  }
}

// 모든 로그 활성화
export const enableAllLogs = () => {
  Object.keys(LOG_CONFIG).forEach(key => {
    LOG_CONFIG[key] = true
  })
}

// 모든 로그 비활성화
export const disableAllLogs = () => {
  Object.keys(LOG_CONFIG).forEach(key => {
    LOG_CONFIG[key] = false
  })
}

export default logger

