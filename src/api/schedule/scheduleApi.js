import apiClient from '../../utils/api.js'

// 프로젝트 태스크 조회 API
export const getProjectTasks = async (projectId, assigneeMemberSeq = null) => {
  try {
    let url = `/task-service/scheduleManagement/project/tasks/${projectId}`
    if (assigneeMemberSeq) {
      url += `?assigneeMemberSeq=${assigneeMemberSeq}`
    }
    const response = await apiClient.get(url)
    return response.data
  } catch (error) {
    console.error('프로젝트 태스크 조회 실패:', error)
    throw error
  }
}

// 태스크 상태 업데이트 API
export const updateTaskStatus = async (taskSeq, newStatus) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/project/task/${taskSeq}/status`, {
      taskStatus: newStatus
    })
    return response.data
  } catch (error) {
    console.error('태스크 상태 업데이트 실패:', error)
    throw error
  }
}

// 태스크 생성 API
export const createTask = async (taskData) => {
  try {
    const response = await apiClient.post('/task-service/scheduleManagement/project/task', taskData)
    return response.data
  } catch (error) {
    console.error('태스크 생성 실패:', error)
    throw error
  }
}

// 태스크 수정 API
export const updateTask = async (taskSeq, taskData) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/project/task/${taskSeq}`, taskData)
    return response.data
  } catch (error) {
    console.error('태스크 수정 실패:', error)
    throw error
  }
}

// 태스크 삭제 API
export const deleteTask = async (taskSeq) => {
  try {
    const response = await apiClient.delete(`/task-service/scheduleManagement/project/task/${taskSeq}`)
    return response.data
  } catch (error) {
    console.error('태스크 삭제 실패:', error)
    throw error
  }
}

// 프로젝트 멤버 목록 조회 API (담당자 선택용)
export const getProjectMemberList = async (projectId) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/project/memberList/${projectId}`)
    return response.data
  } catch (error) {
    console.error('프로젝트 멤버 목록 조회 실패:', error)
    throw error
  }
}

// 개인 담당 task 조회 API (board가 null인 task들)
export const getMyTasks = async (projectId) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/project/myTasks/${projectId}`)
    return response.data
  } catch (error) {
    console.error('개인 담당 task 조회 실패:', error)
    throw error
  }
}

// 보드 생성 API
export const createBoard = async (boardData) => {
  try {
    const response = await apiClient.post('/task-service/scheduleManagement/project/board', boardData)
    return response.data
  } catch (error) {
    console.error('보드 생성 실패:', error)
    throw error
  }
}

// 보드 목록 조회 API
export const getProjectBoards = async (projectId) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/project/boards/${projectId}`)
    return response.data
  } catch (error) {
    console.error('보드 목록 조회 실패:', error)
    throw error
  }
}

// 태스크를 보드로 이동 API
export const moveTaskToBoard = async (taskSeq, boardSeq) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/project/task/${taskSeq}/board`, {
      boardSeq: boardSeq
    })
    return response.data
  } catch (error) {
    console.error('태스크 보드 이동 실패:', error)
    throw error
  }
}

// 태스크 상세 조회 API
export const getTaskDetail = async (taskSeq) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/project/task/${taskSeq}`)
    return response.data
  } catch (error) {
    console.error('태스크 상세 조회 실패:', error)
    throw error
  }
}

// 보드 상세 조회 API
export const getBoardDetail = async (boardSeq) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/project/board/${boardSeq}`)
    return response.data
  } catch (error) {
    console.error('보드 상세 조회 실패:', error)
    throw error
  }
}

// 보드 수정 API
export const updateBoard = async (boardSeq, boardData) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/project/board/${boardSeq}`, boardData)
    return response.data
  } catch (error) {
    console.error('보드 수정 실패:', error)
    throw error
  }
}

// 보드 삭제 API
export const deleteBoard = async (boardSeq) => {
  try {
    const response = await apiClient.delete(`/task-service/scheduleManagement/project/board/${boardSeq}`)
    return response.data
  } catch (error) {
    console.error('보드 삭제 실패:', error)
    throw error
  }
}

// 보드 순서 변경 API
export const updateBoardOrders = async (boardOrders) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/project/boards/orders`, boardOrders)
    return response.data
  } catch (error) {
    console.error('보드 순서 변경 실패:', error)
    throw error
  }
}

// ===== 댓글 관련 API =====

// 댓글 생성 API
export const createComment = async (taskSeq, commentData) => {
  try {
    const response = await apiClient.post(`/task-service/comment/task/${taskSeq}`, commentData)
    return response.data
  } catch (error) {
    console.error('댓글 생성 실패:', error)
    throw error
  }
}

// 댓글 수정 API
export const updateComment = async (commentSeq, commentData) => {
  try {
    const response = await apiClient.patch(`/task-service/comment/${commentSeq}`, commentData)
    return response.data
  } catch (error) {
    console.error('댓글 수정 실패:', error)
    throw error
  }
}

// 댓글 조회 API (페이징)
export const getComments = async (taskSeq, page = 0, size = 10) => {
  try {
    const response = await apiClient.get(`/task-service/comment/task/${taskSeq}`, {
      params: {
        page: page,
        size: size
      }
    })
    return response.data
  } catch (error) {
    console.error('댓글 조회 실패:', error)
    throw error
  }
}

// 댓글 삭제 API
export const deleteComment = async (commentSeq) => {
  try {
    const response = await apiClient.delete(`/task-service/comment/${commentSeq}`)
    return response.data
  } catch (error) {
    console.error('댓글 삭제 실패:', error)
    throw error
  }
}

// ===== 개인 워크스페이스 일정관리 API =====

// 개인 스케줄 Task 생성
export const createPersonalTask = async (workSpaceSeq, taskData) => {
  try {
    const response = await apiClient.post(`/task-service/scheduleManagement/personal/task/${workSpaceSeq}`, taskData)
    return response.data
  } catch (error) {
    console.error('개인 스케줄 Task 생성 실패:', error)
    throw error
  }
}

// 개인 스케줄 Task 목록 조회 (상태별로 그룹화)
export const getPersonalTasks = async (workSpaceSeq) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/personal/tasks/${workSpaceSeq}`)
    return response.data
  } catch (error) {
    console.error('개인 스케줄 Task 목록 조회 실패:', error)
    throw error
  }
}

// 개인 스케줄 Task 상세 조회
export const getPersonalTask = async (taskSeq) => {
  try {
    const response = await apiClient.get(`/task-service/scheduleManagement/personal/task/${taskSeq}`)
    return response.data
  } catch (error) {
    console.error('개인 스케줄 Task 상세 조회 실패:', error)
    throw error
  }
}

// 개인 스케줄 Task 수정
export const updatePersonalTask = async (taskSeq, taskData) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/personal/task/${taskSeq}`, taskData)
    return response.data
  } catch (error) {
    console.error('개인 스케줄 Task 수정 실패:', error)
    throw error
  }
}

// 개인 스케줄 Task 상태 변경
export const updatePersonalTaskStatus = async (taskSeq, newStatus) => {
  try {
    const response = await apiClient.patch(`/task-service/scheduleManagement/personal/task/${taskSeq}/status`, {
      taskStatus: newStatus
    })
    return response.data
  } catch (error) {
    console.error('개인 스케줄 Task 상태 변경 실패:', error)
    throw error
  }
}

// 개인 스케줄 Task 삭제
export const deletePersonalTask = async (taskSeq) => {
  try {
    const response = await apiClient.delete(`/task-service/scheduleManagement/personal/task/${taskSeq}`)
    return response.data
  } catch (error) {
    console.error('개인 스케줄 Task 삭제 실패:', error)
    throw error
  }
}