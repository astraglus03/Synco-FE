import { defineStore } from 'pinia'
import { getProjectTasks, updateTaskStatus, createTask, updateTask, deleteTask } from '../api/schedule/scheduleApi.js'
import { useWorkspaceStore } from './workspaceStore.js'
import { useWorkspaceMemberStore } from './workspaceMemberStore.js'

export const useProjectScheduleStore = defineStore('projectSchedule', {
  state: () => ({
    // 1. 프로젝트 기본 정보
    currentProject: {
      id: null, // 동적으로 설정됨 (현재 워크스페이스의 workSpaceSeq)
      name: '',
      description: '',
      startDate: null,
      endDate: null,
      status: 'in-progress',
      progress: 0
    },

    // API 응답 데이터
    taskData: [],
    isLoading: false,
    error: null,
    
    // 필터링 관련 상태
    selectedFilterMember: null, // 선택된 멤버 필터

    // 2. 보드 정보 (칸반 스타일) - API 응답에 맞게 수정
    boards: [
      { id: 1, name: '할 일', color: '#e3f2fd', status: 'TODO' },
      { id: 2, name: '진행중', color: '#fff3e0', status: 'IN_PROGRESS' },
      { id: 3, name: '완료', color: '#e8f5e8', status: 'COMPLETED' }
    ],

    // 3. 팀 멤버 정보 (API에서 가져옴)
    teamMembers: [],

    // 4. 업무(Task) 배열 (API에서 가져옴)
    tasks: [],

    // 5. 마일스톤 정보 (API에서 가져옴)
    milestones: [],

    // 6. 최근 활동 정보 (API에서 가져옴)
    recentActivities: []
  }),

  getters: {
    // 현재 프로젝트 정보 반환 (워크스페이스 이름 동적 설정)
    getCurrentProject: (state) => {
      const workspaceStore = useWorkspaceStore()
      const currentWorkspaceInfo = workspaceStore.currentWorkspaceInfo
      
      return {
        ...state.currentProject,
        id: currentWorkspaceInfo?.workSpaceSeq || currentWorkspaceInfo?.id || state.currentProject.id,
        name: currentWorkspaceInfo?.name || state.currentProject.name
      }
    },

    // 보드별 업무 개수
    getTaskCountByBoard: (state) => (boardId) => {
      return state.tasks.filter(task => task.boardId === boardId).length
    },

    // 완료된 업무 개수
    getCompletedTaskCount: (state) => {
      return state.tasks.filter(task => task.progress === 100).length
    },

    // 진행중인 업무 개수
    getInProgressTaskCount: (state) => {
      return state.tasks.filter(task => task.progress > 0 && task.progress < 100).length
    },

    // 활성 팀 멤버 수
    getActiveTeamMemberCount: (state) => {
      return state.teamMembers.length
    },

    // 담당자별 업무 필터링
    getTasksByAssignee: (state) => (assignee) => {
      if (assignee === '전체') {
        return state.tasks
      }
      return state.tasks.filter(task => task.assignee === assignee)
    },

    // 마감일 임박 업무 (7일 이내)
    getUpcomingDeadlines: (state) => {
      const today = new Date()
      const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      return state.tasks
        .filter(task => {
          const endDate = new Date(task.endDate)
          return endDate >= today && endDate <= sevenDaysLater && task.progress < 100
        })
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
    },

    // 다가오는 마일스톤
    getUpcomingMilestones: (state) => {
      return state.milestones
        .filter(milestone => milestone.status !== 'completed')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    },

    // 최근 활동 (최신순)
    getRecentActivities: (state) => {
      return [...state.recentActivities].sort((a, b) => b.timestamp - a.timestamp)
    }
  },

  actions: {
    // 더 많은 활동 로드 (무한 스크롤용)
    loadMoreActivities() {
      // TODO: 실제 구현시 API 호출
      console.log('loadMoreActivities - API 구현 필요')
    },

    // API 연동 Actions
    async loadProjectTasks(assigneeMemberSeq = null) {
      this.isLoading = true
      this.error = null
      try {
        // workspaceStore에서 현재 워크스페이스 정보 가져오기
        const workspaceStore = useWorkspaceStore()
        const currentWorkspace = workspaceStore.currentWorkspaceInfo
        
        if (!currentWorkspace || !currentWorkspace.workSpaceSeq) {
          throw new Error('현재 워크스페이스 정보를 찾을 수 없습니다.')
        }
        
        // 현재 워크스페이스의 workSpaceSeq를 projectId로 사용
        const projectId = currentWorkspace.workSpaceSeq
        this.currentProject.id = projectId
        
        console.log('📡 팀 일정 데이터 로딩 시작:', { projectId, assigneeMemberSeq })
        const response = await getProjectTasks(projectId, assigneeMemberSeq)
        console.log('📦 받은 응답:', response)
        
        // 백엔드 응답 구조 처리: { success, data } 또는 직접 배열
        const taskData = response?.data || response
        this.taskData = Array.isArray(taskData) ? taskData : []
        
        this.isLoading = false
        console.log('✅ taskData 저장 완료:', this.taskData)
        return taskData
      } catch (error) {
        console.error('❌ 팀 일정 데이터 로딩 실패:', error)
        this.error = error.message
        this.isLoading = false
        throw error
      }
    },

    // API 데이터를 칸반보드 형태로 변환하는 getter
    getKanbanTasks() {
      if (!this.taskData || this.taskData.length === 0) {
        return {
          'TODO': [],
          'IN_PROGRESS': [],
          'COMPLETED': []
        }
      }

      const kanbanTasks = {
        'TODO': [],
        'IN_PROGRESS': [],
        'COMPLETED': []
      }

      this.taskData.forEach(statusGroup => {
        const status = statusGroup.taskStatusDescription
        const tasks = statusGroup.taskResDtoList || []
        
        tasks.forEach(task => {
          // picMemberSeq로 멤버 정보 조회
          const memberInfo = this.getMemberInfo(task.picMemberSeq)
          
          const kanbanTask = {
            id: task.taskSeq,
            title: task.taskTitle,
            description: task.taskContent,
            assignee: memberInfo.name || '미지정',
            startDate: task.startDate,
            endDate: task.endDate,
            status: task.taskStatus,
            picMemberSeq: task.picMemberSeq,
            picMemberProfileImageUrl: memberInfo.profileImageUrl || ''
          }

          // 상태에 따라 분류
          if (task.taskStatus === 'TODO') {
            kanbanTasks.TODO.push(kanbanTask)
          } else if (task.taskStatus === 'IN_PROGRESS') {
            kanbanTasks.IN_PROGRESS.push(kanbanTask)
          } else if (task.taskStatus === 'COMPLETED') {
            kanbanTasks.COMPLETED.push(kanbanTask)
          }
        })
      })

        return kanbanTasks
      },

      // 멤버 정보 조회 함수
      getMemberInfo(memberSeq) {
        if (!memberSeq) return { name: '미지정', profileImageUrl: '' }
        
        const workspaceMemberStore = useWorkspaceMemberStore()
        const member = workspaceMemberStore.members?.find(m => m.memberSeq === memberSeq)
        
        if (member) {
          return {
            name: member.name,
            profileImageUrl: member.profileImageUrl || ''
          }
        }
        
        return { name: '미지정', profileImageUrl: '' }
      },

      async updateTaskStatus(taskSeq, newStatus) {
      try {
        await updateTaskStatus(taskSeq, newStatus)
        // 로컬 상태 업데이트
        await this.loadProjectTasks()
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async createNewTask(taskData) {
      try {
        await createTask(taskData)
        await this.loadProjectTasks()
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updateExistingTask(taskSeq, taskData) {
      try {
        await updateTask(taskSeq, taskData)
        await this.loadProjectTasks()
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async removeTask(taskSeq) {
      try {
        await deleteTask(taskSeq)
        await this.loadProjectTasks()
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 멤버별 필터링
    async filterTasksByMember(memberSeq) {
      try {
        this.selectedFilterMember = memberSeq
        await this.loadProjectTasks(memberSeq)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    // 필터 초기화 (전체 태스크 보기)
    async clearFilter() {
      try {
        this.selectedFilterMember = null
        await this.loadProjectTasks()
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})

