import { defineStore } from 'pinia'
import { getProjectTasks, updateTaskStatus, createTask, updateTask, deleteTask } from '../api/schedule/scheduleApi.js'
import { useWorkspaceStore } from './workspaceStore.js'
import { useWorkspaceMemberStore } from './workspaceMemberStore.js'

export const useProjectScheduleStore = defineStore('projectSchedule', {
  state: () => ({
    // 1. 프로젝트 기본 정보
    currentProject: {
      id: null, // 동적으로 설정됨 (현재 워크스페이스의 workSpaceSeq)
      name: '스타트업 플랫폼 개발',
      description: '신입 팀원을 위한 프로젝트 개요',
      startDate: '2025-09-01',
      endDate: '2025-12-31',
      status: 'in-progress',
      progress: 65
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

    // 3. 팀 멤버 정보
    teamMembers: [
      { id: 'user1', name: '김민수', role: 'Frontend Developer', avatar: '김' },
      { id: 'user2', name: '이지은', role: 'Backend Developer', avatar: '이' },
      { id: 'user3', name: '박준호', role: 'UI/UX Designer', avatar: '박' },
      { id: 'user4', name: '최서연', role: 'Project Manager', avatar: '최' },
      { id: 'user5', name: '정우진', role: 'DevOps Engineer', avatar: '정' },
      { id: 'user6', name: '강민지', role: 'QA Engineer', avatar: '강' }
    ],

    // 4. 업무(Task) 배열
    tasks: [
      {
        id: 1,
        title: '프로젝트 기획서 작성',
        description: '프로젝트 전체 기획서 작성 및 검토',
        boardId: 3,
        assignee: '김민수',
        priority: 'high',
        startDate: '2025-09-01',
        endDate: '2025-09-15',
        progress: 100,
        tags: ['기획', '문서']
      },
      {
        id: 2,
        title: '사용자 요구사항 분석',
        description: '사용자 페르소나 및 요구사항 분석',
        boardId: 3,
        assignee: '김민수',
        priority: 'high',
        startDate: '2025-09-05',
        endDate: '2025-09-20',
        progress: 100,
        tags: ['분석', '기획']
      },
      {
        id: 3,
        title: 'UI/UX 디자인 시안 제작',
        description: '메인 화면 및 주요 기능 디자인',
        boardId: 2,
        assignee: '박준호',
        priority: 'high',
        startDate: '2025-10-01',
        endDate: '2025-10-25',
        progress: 60,
        tags: ['디자인']
      },
      {
        id: 4,
        title: '데이터베이스 스키마 설계',
        description: 'ERD 작성 및 테이블 설계',
        boardId: 2,
        assignee: '이지은',
        priority: 'high',
        startDate: '2025-10-05',
        endDate: '2025-10-20',
        progress: 45,
        tags: ['개발', 'DB']
      },
      {
        id: 5,
        title: '프론트엔드 기본 구조 완료',
        description: 'Vue.js 프로젝트 초기 설정 및 기본 컴포넌트 개발 완료',
        boardId: 2,
        assignee: '김민수',
        priority: 'high',
        startDate: '2025-10-10',
        endDate: '2025-10-25',
        progress: 70,
        tags: ['개발', 'Frontend']
      },
      {
        id: 6,
        title: '사용자 인증 시스템 완료',
        description: 'JWT 기반 사용자 인증 및 권한 관리 시스템 완료',
        boardId: 2,
        assignee: '이지은',
        priority: 'high',
        startDate: '2025-10-15',
        endDate: '2025-10-30',
        progress: 55,
        tags: ['개발', 'Backend']
      },
      {
        id: 7,
        title: '백엔드 API 개발 완료',
        description: '핵심 API 개발 및 데이터베이스 구축 완료',
        boardId: 1,
        assignee: '이지은',
        priority: 'medium',
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        progress: 0,
        tags: ['개발', 'Backend']
      },
      {
        id: 8,
        title: '프론트엔드 핵심 기능 완료',
        description: '사용자 인터페이스 핵심 기능 개발 완료',
        boardId: 1,
        assignee: '김민수',
        priority: 'medium',
        startDate: '2025-11-05',
        endDate: '2025-11-25',
        progress: 0,
        tags: ['개발', 'Frontend']
      },
      {
        id: 9,
        title: '실시간 채팅 기능 완료',
        description: 'WebSocket 기반 실시간 채팅 시스템 완료',
        boardId: 1,
        assignee: '정우진',
        priority: 'medium',
        startDate: '2025-11-10',
        endDate: '2025-11-30',
        progress: 0,
        tags: ['개발', 'Backend']
      },
      {
        id: 10,
        title: 'E2E 테스트 작성',
        description: '주요 기능 E2E 테스트 시나리오 작성 및 실행',
        boardId: 1,
        assignee: '강민지',
        priority: 'medium',
        startDate: '2025-12-01',
        endDate: '2025-12-15',
        progress: 0,
        tags: ['테스트']
      },
      {
        id: 11,
        title: '성능 최적화',
        description: '로딩 속도 및 렌더링 성능 최적화',
        boardId: 1,
        assignee: '정우진',
        priority: 'low',
        startDate: '2025-12-10',
        endDate: '2025-12-20',
        progress: 0,
        tags: ['최적화']
      },
      {
        id: 12,
        title: '사용자 매뉴얼 작성',
        description: '최종 사용자를 위한 매뉴얼 작성',
        boardId: 1,
        assignee: '김민수',
        priority: 'low',
        startDate: '2025-12-20',
        endDate: '2025-12-31',
        progress: 0,
        tags: ['문서']
      }
    ],

    // 5. 마일스톤 정보
    milestones: [
      {
        id: 1,
        title: '프론트엔드 기본 구조 완료',
        description: 'Vue.js 프로젝트 초기 설정 및 기본 컴포넌트 개발 완료',
        date: '2025-10-25',
        status: 'in-progress'
      },
      {
        id: 2,
        title: '사용자 인증 시스템 완료',
        description: 'JWT 기반 사용자 인증 및 권한 관리 시스템 완료',
        date: '2025-10-30',
        status: 'in-progress'
      },
      {
        id: 3,
        title: '프론트엔드 핵심 기능 완료',
        description: '사용자 인터페이스 핵심 기능 개발 완료',
        date: '2025-11-25',
        status: 'pending'
      },
      {
        id: 4,
        title: '백엔드 API 개발 완료',
        description: '핵심 API 개발 및 데이터베이스 구축 완료',
        date: '2025-11-30',
        status: 'pending'
      },
      {
        id: 5,
        title: '실시간 채팅 기능 완료',
        description: 'WebSocket 기반 실시간 채팅 시스템 완료',
        date: '2025-11-30',
        status: 'pending'
      }
    ],

    // 6. 최근 활동 정보
    recentActivities: [
      {
        id: 1,
        user: '김민수',
        avatar: '김',
        action: '프로젝트 기획서.pdf 파일을 업로드했습니다',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: 2,
        user: '이지은',
        avatar: '이',
        action: '"데이터베이스 스키마 설계" 업무의 진행률을 45%로 업데이트했습니다',
        timestamp: new Date(Date.now() - 12 * 60 * 1000)
      },
      {
        id: 3,
        user: '박준호',
        avatar: '박',
        action: '"UI/UX 디자인 시안 제작" 업무에 댓글을 작성했습니다',
        timestamp: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        id: 4,
        user: '최서연',
        avatar: '최',
        action: '주간 회의록을 공유했습니다',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 5,
        user: '정우진',
        avatar: '정',
        action: '"실시간 채팅 기능" 마일스톤을 생성했습니다',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        id: 6,
        user: '강민지',
        avatar: '강',
        action: '"E2E 테스트" 업무를 할 일 보드에 추가했습니다',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        id: 7,
        user: '김민수',
        avatar: '김',
        action: '"프론트엔드 기본 구조" 업무를 진행중으로 이동했습니다',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        id: 8,
        user: '이지은',
        avatar: '이',
        action: 'API 문서를 업데이트했습니다',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ]
  }),

  getters: {
    // 현재 프로젝트 정보 반환
    getCurrentProject: (state) => state.currentProject,

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
      // 실제 구현시 API 호출
      const moreActivities = [
        {
          id: this.recentActivities.length + 1,
          user: '박준호',
          avatar: '박',
          action: '새로운 디자인 시안을 업로드했습니다',
          timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000)
        },
        {
          id: this.recentActivities.length + 2,
          user: '최서연',
          avatar: '최',
          action: '프로젝트 일정을 조정했습니다',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
        }
      ]
      this.recentActivities.push(...moreActivities)
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
        
        const response = await getProjectTasks(projectId, assigneeMemberSeq)
        this.taskData = response.data
        this.isLoading = false
        return response
      } catch (error) {
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

