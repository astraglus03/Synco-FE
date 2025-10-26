<template>
  <div class="personal-dashboard">
    <!-- 헤더 -->
    <div class="dashboard-header">
      <div class="greeting">
        <h1>안녕하세요, {{ userName }}님! 👋</h1>
        <p class="date-time">{{ currentDate }} · {{ currentTime }}</p>
      </div>
    </div>
    
    <!-- 통계 카드 -->
    <div class="stats-grid">
      <div class="stat-card clickable" @click="navigateToFriends">
        <div class="stat-icon primary">
          <v-icon size="28">mdi-account-multiple</v-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ friendsCount }}</div>
          <div class="stat-label">친구</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <v-icon size="28">mdi-calendar-check</v-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ schedulesCount }}</div>
          <div class="stat-label">개인 일정</div>
        </div>
      </div>

      <div class="stat-card clickable" @click="navigateToDrive">
        <div class="stat-icon warning">
          <v-icon size="28">mdi-folder</v-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ driveFilesCount }}</div>
          <div class="stat-label">개인 드라이브</div>
        </div>
      </div>

      <div 
        class="stat-card-wrapper"
        @mouseenter="showProjectsDropdown = true"
        @mouseleave="showProjectsDropdown = false"
      >
        <div class="stat-card stat-card-with-dropdown">
          <div class="stat-icon info">
            <v-icon size="28">mdi-folder-multiple</v-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ projectsCount }}</div>
            <div class="stat-label">참여 프로젝트</div>
          </div>
        </div>
        
        <!-- 프로젝트 목록 드롭다운 -->
        <div v-if="showProjectsDropdown" class="projects-dropdown">
          <div class="dropdown-header">
            <strong>참여 프로젝트 목록</strong>
            <span class="project-count">{{ projectsCount }}개</span>
          </div>
          
          <div v-if="projects.length > 0" class="project-list">
            <div
              v-for="project in projects"
              :key="project.id"
              class="project-item"
              @click="navigateToProject(project.id)"
            >
              <div class="project-info">
                <div class="project-name">{{ project.name }}</div>
                <div class="project-description" v-if="project.description">
                  {{ project.description }}
                </div>
              </div>
              <v-icon size="small" color="#94a3b8">mdi-chevron-right</v-icon>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <v-icon size="large" color="grey-lighten-1">mdi-folder-off-outline</v-icon>
            <span class="empty-text">참여 중인 프로젝트가 없습니다</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 빠른 작업 -->
    <div class="quick-actions">
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="action-btn"
        @click="handleQuickAction(action.action)"
      >
        <div class="action-icon" :style="{ backgroundColor: action.color }">
          <v-icon color="white">{{ action.icon }}</v-icon>
        </div>
        <span>{{ action.label }}</span>
      </button>
    </div>

    <!-- 메인 컨텐츠 -->
    <div class="main-grid">
      <!-- 내 업무 -->
      <div class="content-section tasks-section">
        <div class="section-header">
          <div class="header-left">
            <v-icon color="primary">mdi-format-list-checks</v-icon>
            <h2>내 업무</h2>
          </div>
          <v-select
            v-model="selectedProject"
            :items="projectFilterOptions"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 200px;"
          />
        </div>

        <v-tabs v-model="taskTab" color="primary" density="compact">
          <v-tab value="all">전체 ({{ filteredTasks.length }})</v-tab>
          <v-tab value="urgent">
            <v-icon size="small" color="error" class="mr-1">mdi-alert-circle</v-icon>
            마감임박 ({{ urgentTasks.length }})
          </v-tab>
          <v-tab value="in-progress">진행중 ({{ inProgressTasks.length }})</v-tab>
          <v-tab value="todo">대기 ({{ todoTasks.length }})</v-tab>
          <v-tab value="completed">완료 ({{ completedTasks.length }})</v-tab>
        </v-tabs>

        <div class="tasks-container">
          <div v-if="displayedTasks.length === 0" class="empty-state">
            <v-icon size="64" color="grey">mdi-clipboard-off</v-icon>
            <p>업무가 없습니다</p>
          </div>

          <div
            v-for="task in displayedTasks"
            :key="task.id"
            class="task-card"
            @click="openTaskDetail(task)"
          >
            <div class="task-content">
              <div class="task-title" :class="{ completed: task.status === 'COMPLETED' }">
                {{ task.title }}
              </div>
              <div class="task-meta">
                <v-chip size="x-small" :color="getPriorityColor(task.priority)">
                  {{ getPriorityText(task.priority) }}
                </v-chip>
                <span class="meta-item">
                  <v-icon size="14">mdi-folder</v-icon>
                  {{ task.projectName }}
                </span>
                <span class="meta-item">
                  <v-icon size="14">mdi-calendar</v-icon>
                  {{ task.dueDate }}
                </span>
              </div>
            </div>
            <v-btn icon size="small" variant="text" @click.stop="editTask(task)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- 개인 일정 -->
      <div class="content-section schedule-section">
        <div class="section-header">
          <div class="header-left">
            <v-icon color="primary">mdi-calendar</v-icon>
            <h2>개인 일정</h2>
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-plus"
            @click="handleQuickAction('new-schedule')"
          >
            추가
          </v-btn>
        </div>

        <div class="schedule-container">
          <div v-if="personalSchedules.length === 0" class="empty-state">
            <v-icon size="64" color="grey">mdi-calendar-blank</v-icon>
            <p>일정이 없습니다</p>
          </div>

          <div
            v-for="schedule in personalSchedules"
            :key="schedule.id"
            class="schedule-card"
            :class="{ today: schedule.isToday }"
          >
            <div class="schedule-date" :class="{ today: schedule.isToday }">
              <div class="date-day">{{ schedule.day }}</div>
              <div class="date-num">{{ schedule.date }}</div>
            </div>
            <div class="schedule-content">
              <div class="schedule-title">{{ schedule.title }}</div>
              <div class="schedule-meta">
                <v-chip size="x-small" :color="getScheduleTypeColor(schedule.type)">
                  {{ getScheduleTypeText(schedule.type) }}
                </v-chip>
                <span class="meta-item">
                  <v-icon size="12">mdi-clock</v-icon>
                  {{ schedule.time }}
                </span>
                <span v-if="schedule.location" class="meta-item">
                  <v-icon size="12">mdi-map-marker</v-icon>
                  {{ schedule.location }}
                </span>
              </div>
            </div>
            <v-btn icon size="x-small" variant="text" @click.stop="editSchedule(schedule)">
              <v-icon size="16">mdi-pencil</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 파일 업로드 다이얼로그 -->
    <v-dialog v-model="showFileUploadDialog" max-width="600">
      <v-card>
            <v-card-title>
          <v-icon color="success" class="mr-2">mdi-file-upload</v-icon>
          파일 업로드
          <v-spacer />
          <v-btn icon variant="text" @click="showFileUploadDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
            </v-card-title>

        <v-card-text class="pt-4">
          <v-file-input
            v-model="uploadFiles"
            label="파일 선택"
            multiple
            chips
            prepend-icon="mdi-paperclip"
            variant="outlined"
            hint="여러 파일을 선택할 수 있습니다"
            persistent-hint
          />
            </v-card-text>

        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="showFileUploadDialog = false">취소</v-btn>
          <v-btn color="success" @click="handleFileUpload">업로드</v-btn>
        </v-card-actions>
          </v-card>
    </v-dialog>

    <!-- 프로젝트 생성 다이얼로그 -->
    <v-dialog v-model="showProjectDialog" max-width="800">
      <v-card class="create-workspace-modal">
        <div class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon">mdi-plus-circle</v-icon>
            <h3 class="modal-title">새 프로젝트 만들기</h3>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeProjectDialog"
          />
        </div>
        
        <div class="modal-body">
          <!-- 프로젝트 기본 정보 -->
          <div class="workspace-info-section">
            <div class="workspace-basic-row">
              <!-- 프로필 이미지 -->
              <div class="profile-image-group">
                <div class="profile-image-upload">
                  <v-avatar 
                    size="70" 
                    :color="newProjectProfile ? 'transparent' : 'primary'"
                    class="profile-avatar"
                    @click="selectProfileImage"
                  >
                    <img v-if="newProjectProfile" :src="newProjectProfile" alt="Profile" />
                    <v-icon v-else>mdi-camera-plus</v-icon>
                  </v-avatar>
                  <input 
                    ref="profileInput" 
                    type="file" 
                    accept="image/*" 
                    style="display: none"
                    @change="handleProfileImageChange"
                  />
                </div>
              </div>
              
              <!-- 프로젝트 이름 -->
              <div class="workspace-name-group">
                <label class="input-label">프로젝트 이름</label>
                <v-text-field
                  v-model="newProject.name"
                  placeholder="예: 마케팅 프로젝트"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @keyup.enter="handleCreateProject"
                />
              </div>
            </div>
          </div>

          <!-- 멤버 초대 섹션 -->
          <div class="member-invite-section">
            <div class="section-title">멤버 초대</div>
            
            <!-- 검색바 -->
            <div class="search-container">
              <div class="search-input-wrapper">
                <v-icon class="search-icon">mdi-magnify</v-icon>
                <input
                  v-model="memberSearchQuery"
                  type="text"
                  class="search-input"
                  placeholder="사용자 검색..."
                />
              </div>
            </div>
            
            <div class="member-selection-container">
              <!-- 왼쪽: 친구 목록 -->
              <div class="friends-panel">
                <div class="panel-header">
                  <h4>친구 목록</h4>
                </div>
                
                <div class="friends-list">
                  <!-- 로딩 중 -->
                  <div v-if="isLoadingProjectFriends" class="loading-state">
                    <v-progress-circular indeterminate color="primary" size="32" />
                    <p>친구 목록 불러오는 중...</p>
                  </div>
                  
                  <!-- 친구 목록 -->
                  <div
                    v-for="friend in projectFriends"
                    :key="friend.memberSeq"
                    class="friend-item"
                    @click="addToInviteList(friend)"
                  >
                    <v-avatar size="32" :color="friend.avatarColor">
                      <img v-if="friend.profileImage" :src="friend.profileImage" alt="Profile" />
                      <span v-else>{{ friend.avatarText }}</span>
                    </v-avatar>
                    <div class="friend-info">
                      <div class="friend-name">
                        {{ friend.name }}
                        <v-icon 
                          size="12" 
                          color="success" 
                          class="friend-badge"
                        >
                          mdi-account-check
                        </v-icon>
                      </div>
                      <div class="friend-status">
                        @{{ friend.id }}
                        <span class="friend-label">친구</span>
                      </div>
                    </div>
                    <v-icon 
                      v-if="isInvited(friend.memberSeq)"
                      class="check-icon"
                      color="primary"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                  
                  <!-- 친구가 없을 때 -->
                  <div v-if="!isLoadingProjectFriends && projectFriends.length === 0" class="no-results">
                    <v-icon size="48" color="grey">mdi-account-search</v-icon>
                    <p>친구가 없습니다</p>
                  </div>
                </div>
              </div>

              <!-- 중간: 검색 결과 (검색할 때만 표시) -->
              <div v-if="memberSearchQuery" class="search-results-panel">
                <div class="panel-header">
                  <h4>검색 결과</h4>
                </div>
                
                <div class="search-results-list">
                  <!-- 로딩 중 -->
                  <div v-if="isLoadingMemberSearch" class="loading-state">
                    <v-progress-circular indeterminate color="primary" size="32" />
                    <p>검색 중...</p>
                  </div>
                  
                  <!-- 검색 결과 -->
                  <div
                    v-for="user in memberSearchResults"
                    :key="user.memberSeq"
                    class="friend-item"
                    @click="addToInviteList(user)"
                  >
                    <v-avatar size="32" :color="user.avatarColor">
                      <img v-if="user.profileImage" :src="user.profileImage" alt="Profile" />
                      <span v-else>{{ user.avatarText }}</span>
                    </v-avatar>
                    <div class="friend-info">
                      <div class="friend-name">
                        {{ user.name }}
                        <v-icon 
                          v-if="user.isFriend" 
                          size="12" 
                          color="success" 
                          class="friend-badge"
                        >
                          mdi-account-check
                        </v-icon>
                      </div>
                      <div class="friend-status">
                        @{{ user.id }}
                        <span v-if="user.isFriend" class="friend-label">친구</span>
                      </div>
                    </div>
                    <v-icon 
                      v-if="isInvited(user.memberSeq)"
                      class="check-icon"
                      color="primary"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                  
                  <!-- 검색 결과가 없을 때 -->
                  <div v-if="!isLoadingMemberSearch && memberSearchResults.length === 0" class="no-results">
                    <v-icon size="48" color="grey">mdi-account-search</v-icon>
                    <p>검색 결과가 없습니다</p>
                  </div>
                </div>
              </div>

              <!-- 오른쪽: 초대 목록 -->
              <div class="invite-panel">
                <div class="panel-header">
                  <h4>초대 목록 ({{ invitedMembers.length }}명)</h4>
                </div>
                
                <div class="invite-list">
                  <div
                    v-for="member in invitedMembers"
                    :key="member.memberSeq || member.id"
                    class="invite-item"
                  >
                    <v-avatar size="32" :color="member.avatarColor">
                      <img v-if="member.profileImage" :src="member.profileImage" alt="Profile" />
                      <span v-else>{{ member.avatarText }}</span>
                    </v-avatar>
                    <div class="member-info">
                      <div class="member-name">
                        {{ member.name }}
                        <v-icon 
                          v-if="member.isFriend" 
                          size="12" 
                          color="success" 
                          class="friend-badge"
                        >
                          mdi-account-check
                        </v-icon>
                      </div>
                      <div class="member-status">
                        @{{ member.id }}
                        <span v-if="member.isFriend" class="friend-label">친구</span>
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      size="small"
                      class="remove-btn"
                      @click="removeFromInviteList(member.memberSeq || member.id)"
                    />
                  </div>
                  
                  <!-- 초대 목록이 비어있을 때 -->
                  <div v-if="invitedMembers.length === 0" class="empty-invite">
                    <v-icon size="48" color="grey">mdi-account-plus</v-icon>
                    <p>초대할 멤버를 선택하세요</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <v-btn
            variant="text"
            @click="closeProjectDialog"
          >
            취소
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!newProject.name.trim()"
            @click="handleCreateProject"
            class="create-workspace-btn"
          >
            프로젝트 만들기
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- 빠른 작업 추가 다이얼로그 -->
    <v-dialog v-model="showQuickTaskDialog" max-width="600">
      <v-card>
            <v-card-title>
          <v-icon color="primary" class="mr-2">mdi-plus-circle</v-icon>
          새 작업 추가
          <v-spacer />
          <v-btn icon variant="text" @click="showQuickTaskDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
            </v-card-title>

        <v-card-text class="pt-4">
          <v-text-field
            v-model="newTask.title"
            label="작업 제목"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-format-title"
            class="mb-4"
          />

          <v-select
            v-model="newTask.project"
            :items="projects"
            item-title="name"
            item-value="id"
            label="프로젝트"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-folder"
            class="mb-4"
          />

          <v-row>
            <v-col cols="6">
              <v-select
                v-model="newTask.priority"
                :items="priorityOptions"
                label="우선순위"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-flag"
              />
        </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newTask.dueDate"
                label="마감일"
                type="date"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar"
              />
        </v-col>
      </v-row>

          <v-textarea
            v-model="newTask.description"
            label="설명 (선택)"
            variant="outlined"
            density="comfortable"
            rows="3"
            prepend-inner-icon="mdi-text"
          />
        </v-card-text>

        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="showQuickTaskDialog = false">취소</v-btn>
          <v-btn color="primary" @click="addQuickTask">추가</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as friendApi from '@/api/friend/friend'
import * as scheduleApi from '@/api/schedule/scheduleApi'
import { personalDriveApi } from '@/api/drive/driveApi'
import { createWorkspace, getFriendList, searchMembers } from '@/api/workspace/workSpaceApi'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'

// Stores & Router
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const router = useRouter()

// Reactive data
const userName = computed(() => authStore.user?.name || '사용자')
const currentDate = ref('')
const currentTime = ref('')
const selectedProject = ref('all')
const taskTab = ref('all')
const showQuickTaskDialog = ref(false)
const showFileUploadDialog = ref(false)
const showProjectDialog = ref(false)

// 새 작업 폼
const newTask = ref({
  title: '',
  project: null,
  priority: 'medium',
  dueDate: '',
  description: ''
})

// 파일 업로드
const uploadFiles = ref([])

// 새 프로젝트 폼
const newProject = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: ''
})

// 프로젝트 생성 관련
const newProjectProfile = ref('')
const newProjectProfileFile = ref(null)
const profileInput = ref(null)
const memberSearchQuery = ref('')
const invitedMembers = ref([])
const isLoadingProjectFriends = ref(false)
const isLoadingMemberSearch = ref(false)
const projectFriends = ref([])
const memberSearchResults = ref([])

// 프로젝트 목록 (워크스페이스에서 가져오기)
const projects = computed(() => {
  const projectList = workspaceStore.workspaces
    .filter(ws => ws.type === 'project')
    .map(ws => {
      console.log('프로젝트 원본 데이터:', ws)
      return {
        id: ws.workSpaceSeq || ws.id,
        name: ws.name || ws.workSpaceName,
        description: ws.description
      }
    })
  console.log('매핑된 프로젝트 목록:', projectList)
  return projectList
})

// 내 업무 목록 (실제 데이터)
const myTasks = ref([])
const allTasksData = ref([]) // 모든 프로젝트의 업무 데이터

// 더미 데이터: 빠른 작업
const quickActions = ref([
  { id: 1, label: '개인 일정', icon: 'mdi-calendar-plus', color: '#0ea5e9', action: 'new-schedule' },
  { id: 2, label: '파일 업로드', icon: 'mdi-file-upload', color: '#10b981', action: 'upload-file' },
  { id: 3, label: '팀원 초대', icon: 'mdi-account-plus', color: '#8b5cf6', action: 'invite-member' },
  { id: 4, label: '프로젝트', icon: 'mdi-folder-plus', color: '#ec4899', action: 'new-project' }
])

// 더미 데이터: 개인 일정 (클라이밍 테마 🧗‍♂️)
const personalSchedules = ref([
  {
    id: 1,
    title: '더클라임 강남 세션',
    type: 'personal',
    date: '26',
    day: '토',
    time: '10:00 - 12:00',
    location: '더클라임 강남점',
    description: '5.12a 루트 프로젝트 도전',
    isToday: true
  },
  {
    id: 2,
    title: '클라이밍 장비 쇼핑',
    type: 'personal',
    date: '26',
    day: '토',
    time: '14:00 - 15:30',
    location: '클라이밍코리아 매장',
    description: '새 클라이밍화 구매 (La Sportiva Solution)',
    isToday: true
  },
  {
    id: 3,
    title: '프로젝트 스프린트 회의',
    type: 'work',
    date: '27',
    day: '일',
    time: '10:00 - 11:00',
    location: '온라인 (Zoom)',
    description: '이번 주 개발 목표 설정',
    isToday: false
  },
  {
    id: 4,
    title: '인수봉 암장 야외 클라이밍',
    type: 'personal',
    date: '27',
    day: '일',
    time: '13:00 - 18:00',
    location: '인수봉 (북한산)',
    description: '크랙 클라이밍 연습 + 멀티피치',
    isToday: false
  },
  {
    id: 5,
    title: '클라이밍 크루 정기 모임',
    type: 'social',
    date: '28',
    day: '월',
    time: '19:00 - 21:00',
    location: '더클라임 연남점',
    description: '월요일 정기 세션 + 치맥',
    isToday: false
  },
  {
    id: 6,
    title: '볼더링 대회 출전',
    type: 'personal',
    date: '29',
    day: '화',
    time: '18:00 - 22:00',
    location: '클라이밍파크 성수점',
    description: '오픈 볼더링 컴피티션 (V4-V7)',
    isToday: false
  },
  {
    id: 7,
    title: '손가락 재활 운동',
    type: 'personal',
    date: '30',
    day: '수',
    time: '07:00 - 07:30',
    location: '집',
    description: '핑거보드 트레이닝 + 스트레칭',
    isToday: false
  },
  {
    id: 8,
    title: '클라이밍 유튜브 촬영',
    type: 'personal',
    date: '31',
    day: '목',
    time: '15:00 - 17:00',
    location: '더클라임 신림점',
    description: '5.13a 온사이트 도전 영상',
    isToday: false
  }
])

// 우선순위 옵션
const priorityOptions = [
  { title: '높음', value: 'high' },
  { title: '보통', value: 'medium' },
  { title: '낮음', value: 'low' }
]

// 프로젝트 드롭다운 표시 상태
const showProjectsDropdown = ref(false)

// Computed
const projectFilterOptions = computed(() => {
  return [
    { title: '전체 프로젝트', value: 'all' },
    ...projects.value.map(p => ({ title: p.name, value: p.id }))
  ]
})

const filteredTasks = computed(() => {
  if (selectedProject.value === 'all') {
    return myTasks.value
  }
  return myTasks.value.filter(task => task.projectId === selectedProject.value)
})

const inProgressTasks = computed(() => {
  return filteredTasks.value.filter(task => task.status === 'IN_PROGRESS')
})

const todoTasks = computed(() => {
  return filteredTasks.value.filter(task => task.status === 'TODO')
})

const completedTasks = computed(() => {
  return filteredTasks.value.filter(task => task.status === 'COMPLETED')
})

const urgentTasks = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  
  return filteredTasks.value.filter(task => {
    if (task.status === 'COMPLETED') return false
    if (!task.dueDate) return false
    
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    
    return dueDate >= now && dueDate <= fiveDaysLater
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
})

const displayedTasks = computed(() => {
  switch (taskTab.value) {
    case 'urgent':
      return urgentTasks.value
    case 'in-progress':
      return inProgressTasks.value
    case 'todo':
      return todoTasks.value
    case 'completed':
      return completedTasks.value
    default:
      return filteredTasks.value
  }
})

// 친구 목록 데이터
const friendsList = ref([])

// 개인 드라이브 데이터
const driveItems = ref([])

const friendsCount = computed(() => {
  return friendsList.value.length
})

const schedulesCount = computed(() => {
  return personalSchedules.value.length
})

const driveFilesCount = computed(() => {
  return driveItems.value.length
})

const projectsCount = computed(() => {
  return projects.value.length
})

// Methods
const updateDateTime = () => {
  const now = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const day = days[now.getDay()]
  
  currentDate.value = `${year}년 ${month}월 ${date}일 ${day}요일`
  
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
}

const getPriorityColor = (priority) => {
  const colors = {
    high: 'error',
    medium: 'warning',
    low: 'success'
  }
  return colors[priority] || 'grey'
}

const getPriorityText = (priority) => {
  const texts = {
    high: '높음',
    medium: '보통',
    low: '낮음'
  }
  return texts[priority] || priority
}

const openTaskDetail = (task) => {
  console.log('작업 상세:', task)
}

const editTask = (task) => {
  console.log('작업 수정:', task)
}

const editSchedule = (schedule) => {
  console.log('일정 수정:', schedule)
}

const getScheduleTypeColor = (type) => {
  const colors = {
    meeting: 'primary',
    work: 'info',
    personal: 'success',
    social: 'warning'
  }
  return colors[type] || 'grey'
}

const getScheduleTypeText = (type) => {
  const texts = {
    meeting: '회의',
    work: '업무',
    personal: '개인',
    social: '모임'
  }
  return texts[type] || type
}

const handleQuickAction = (action) => {
  switch (action) {
    case 'new-schedule':
      console.log('개인 일정 생성')
      // TODO: 개인 일정 생성 모달 구현
      break
    case 'upload-file':
      showFileUploadDialog.value = true
      break
    case 'invite-member':
      console.log('팀원 초대')
      // TODO: 팀원 초대 모달 구현
      break
    case 'new-project':
      showProjectDialog.value = true
      loadProjectFriendList() // 친구 목록 로드
      break
  }
}

const navigateToFriends = () => {
  router.push('/workspaces/personal/friends')
}

// 파일 업로드 처리
const handleFileUpload = async () => {
  if (!uploadFiles.value || uploadFiles.value.length === 0) {
    alert('업로드할 파일을 선택해주세요.')
    return
  }

  try {
    console.log('파일 업로드:', uploadFiles.value)
    
    // 개인 드라이브 channelSeq는 2로 고정 (TEST_CHANNEL_SEQ)
    const channelSeq = 2
    const response = await personalDriveApi.uploadFiles(uploadFiles.value, channelSeq, null)
    
    if (response.success) {
      alert(`${uploadFiles.value.length}개의 파일이 업로드되었습니다.`)
      uploadFiles.value = []
      showFileUploadDialog.value = false
      
      // 드라이브 파일 개수 새로고침
      await loadDriveFiles()
    } else {
      throw new Error(response.error || '파일 업로드 실패')
    }
  } catch (error) {
    console.error('파일 업로드 실패:', error)
    alert('파일 업로드에 실패했습니다: ' + (error.message || error))
  }
}

// 프로필 이미지 선택
const selectProfileImage = () => {
  profileInput.value?.click()
}

// 프로필 이미지 변경 처리
const handleProfileImageChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    newProjectProfileFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      newProjectProfile.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 프로젝트 친구 목록 가져오기
const loadProjectFriendList = async () => {
  try {
    isLoadingProjectFriends.value = true
    const response = await getFriendList('', 0, 50)
    
    const friendList = Array.isArray(response) ? response : (response.content || [])
    
    projectFriends.value = friendList.map(friend => ({
      id: friend.memberId || friend.id,
      memberSeq: friend.memberSeq || friend.friendSeq,
      name: friend.name,
      email: friend.email,
      profileImage: friend.profileImage,
      avatarText: friend.name ? friend.name.charAt(0) : '?',
      avatarColor: getRandomColor(),
      isFriend: true
    }))
  } catch (error) {
    console.error('친구 목록 로딩 실패:', error)
  } finally {
    isLoadingProjectFriends.value = false
  }
}

// 회원 검색
const searchMembersDebounced = ref(null)
watch(memberSearchQuery, (newValue) => {
  if (searchMembersDebounced.value) {
    clearTimeout(searchMembersDebounced.value)
  }
  
  if (!newValue.trim()) {
    memberSearchResults.value = []
    return
  }
  
  searchMembersDebounced.value = setTimeout(async () => {
    try {
      isLoadingMemberSearch.value = true
      const response = await searchMembers(newValue, 0, 20)
      
      const memberList = Array.isArray(response) ? response : (response.content || [])
      
      memberSearchResults.value = memberList.map(member => ({
        id: member.memberId || member.id,
        memberSeq: member.memberSeq,
        name: member.name,
        email: member.email,
        profileImage: member.profileImage,
        avatarText: member.name ? member.name.charAt(0) : '?',
        avatarColor: getRandomColor(),
        isFriend: member.isFriend || false
      }))
    } catch (error) {
      console.error('회원 검색 실패:', error)
      memberSearchResults.value = []
    } finally {
      isLoadingMemberSearch.value = false
    }
  }, 300)
})

// 랜덤 아바타 색상 생성
const getRandomColor = () => {
  const colors = ['primary', 'success', 'warning', 'error', 'info', 'purple', 'teal', 'pink', 'indigo', 'orange']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 초대 목록에 추가
const addToInviteList = (user) => {
  if (!isInvited(user.memberSeq || user.id)) {
    invitedMembers.value.push(user)
  }
}

// 초대 목록에서 제거
const removeFromInviteList = (userSeq) => {
  const index = invitedMembers.value.findIndex(member => (member.memberSeq || member.id) === userSeq)
  if (index > -1) {
    invitedMembers.value.splice(index, 1)
  }
}

// 초대되었는지 확인
const isInvited = (userSeq) => {
  return invitedMembers.value.some(member => (member.memberSeq || member.id) === userSeq)
}

// 프로젝트 생성 처리
const handleCreateProject = async () => {
  if (!newProject.value.name.trim()) {
    alert('프로젝트 이름을 입력해주세요.')
    return
  }

  try {
    // memberList 생성 (memberSeq 배열)
    const memberList = invitedMembers.value.map(member => member.memberSeq)
    
    // API 호출
    const createdWorkspace = await createWorkspace(
      newProject.value.name,
      newProjectProfileFile.value,
      memberList
    )
    
    // 성공 메시지
    alert(`프로젝트 "${createdWorkspace.workSpaceName}"가 성공적으로 생성되었습니다!`)
    
    // 워크스페이스 목록 새로고침
    await workspaceStore.loadMyWorkspaces()
    
    // 생성된 워크스페이스로 이동
    const newWorkspaceId = createdWorkspace.workSpaceSeq
    await router.push(`/workspaces/${newWorkspaceId}/dashboard`)
    
    // 모달 닫기
    closeProjectDialog()
  } catch (error) {
    console.error('프로젝트 생성 실패:', error)
    alert('프로젝트 생성에 실패했습니다: ' + (error.message || error))
  }
}

// 프로젝트 모달 닫기 및 초기화
const closeProjectDialog = () => {
  showProjectDialog.value = false
  newProject.value = {
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  }
  newProjectProfile.value = ''
  newProjectProfileFile.value = null
  invitedMembers.value = []
  memberSearchQuery.value = ''
  memberSearchResults.value = []
}

const addQuickTask = () => {
  if (!newTask.value.title) {
    alert('작업 제목을 입력해주세요.')
    return
  }

  const project = projects.value.find(p => p.id === newTask.value.project)
  
  const task = {
    id: myTasks.value.length + 1,
    title: newTask.value.title,
    projectId: newTask.value.project,
    projectName: project?.name || '미지정',
    status: 'TODO',
    priority: newTask.value.priority,
    dueDate: newTask.value.dueDate,
    description: newTask.value.description
  }

  myTasks.value.unshift(task)
  
  newTask.value = {
    title: '',
    project: null,
    priority: 'medium',
    dueDate: '',
    description: ''
  }
  
  showQuickTaskDialog.value = false
}

// 친구 목록 로드
const loadFriends = async () => {
  try {
    const data = await friendApi.getFriendList()
    friendsList.value = data.content || data || []
  } catch (error) {
    console.error('친구 목록 로드 실패:', error)
    friendsList.value = []
  }
}

// 개인 드라이브 파일 개수 로드
const loadDriveFiles = async () => {
  try {
    // 개인 드라이브는 channelSeq가 2로 고정 (TEST_CHANNEL_SEQ)
    const response = await personalDriveApi.getItems(2, null)
    
    if (response.success && response.data) {
      driveItems.value = response.data
      console.log('📁 개인 드라이브 파일 개수:', driveItems.value.length)
    } else {
      driveItems.value = []
    }
  } catch (error) {
    console.error('개인 드라이브 로드 실패:', error)
    driveItems.value = []
  }
}

// 내 업무 목록 로드
const loadMyTasks = async () => {
  try {
    const projectWorkspaces = projects.value
    const currentUserSeq = authStore.memberSeq
    
    console.log('📋 프로젝트 목록:', projectWorkspaces)
    console.log('👤 현재 사용자 memberSeq:', currentUserSeq)
    
    if (projectWorkspaces.length === 0) {
      console.log('⚠️ 프로젝트가 없습니다')
      myTasks.value = []
      return
    }
    
    // 모든 프로젝트의 업무를 병렬로 가져오기
    const taskPromises = projectWorkspaces.map(async (project) => {
      try {
        console.log(`🔄 프로젝트 ${project.name} (ID: ${project.id}) 업무 로드 중...`)
        const response = await scheduleApi.getProjectTasks(project.id)
        console.log(`📦 프로젝트 ${project.name} API 응답:`, response)
        
        // API 응답 구조 처리
        let tasks = []
        if (Array.isArray(response)) {
          // 직접 배열인 경우
          tasks = response.flatMap(group => group.taskResDtoList || [])
        } else if (response.data) {
          // data 속성이 있는 경우
          if (Array.isArray(response.data)) {
            tasks = response.data.flatMap(group => group.taskResDtoList || [])
          }
        }
        
        console.log(`✅ 프로젝트 ${project.name} 업무 ${tasks.length}개 로드됨`)
        
        // 프로젝트 정보 추가
        return tasks.map(task => ({
          id: task.taskSeq,
          title: task.taskTitle,
          projectId: project.id,
          projectName: project.name,
          status: task.taskStatus,
          priority: getPriorityFromTask(task),
          dueDate: task.endDate,
          description: task.taskContent || '',
          assigneeSeq: task.picMemberSeq
        }))
      } catch (error) {
        console.error(`❌ 프로젝트 ${project.name} 업무 로드 실패:`, error)
        return []
      }
    })
    
    const allProjectTasks = await Promise.all(taskPromises)
    const flatTasks = allProjectTasks.flat()
    
    console.log(`📊 전체 업무 개수: ${flatTasks.length}`)
    
    // 내가 담당자인 업무만 필터링
    if (currentUserSeq) {
      myTasks.value = flatTasks.filter(task => {
        const isMyTask = task.assigneeSeq && Number(task.assigneeSeq) === Number(currentUserSeq)
        if (isMyTask) {
          console.log(`✓ 내 업무: ${task.title} (담당자: ${task.assigneeSeq})`)
        }
        return isMyTask
      })
      console.log(`👤 내가 담당자인 업무: ${myTasks.value.length}개`)
    } else {
      // memberSeq가 없으면 모든 업무 표시
      console.log('⚠️ memberSeq가 없어서 모든 업무 표시')
      myTasks.value = flatTasks
    }
    
    allTasksData.value = flatTasks
    console.log('✅ 내 업무 로드 완료:', myTasks.value)
    
  } catch (error) {
    console.error('❌ 내 업무 로드 실패:', error)
    myTasks.value = []
  }
}

// 업무에서 우선순위 추출 (팀 대시보드와 동일한 기준)
const getPriorityFromTask = (task) => {
  // API에 우선순위 필드가 있으면 사용, 없으면 기본값
  if (task.priority) return task.priority
  
  // 마감일 기준으로 우선순위 자동 설정 (팀 대시보드 기준)
  if (task.endDate) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    
    // 우선순위 기준 (팀 대시보드와 동일)
    if (daysRemaining >= 14) return 'low'      // 14일 이상: 낮음
    if (daysRemaining >= 10) return 'medium'   // 10일 이상: 보통
    return 'high'                               // 10일 미만 (5일 이내 포함): 높음
  }
  
  return 'medium' // 기본값: 보통
}

// 워크스페이스 변경 감지하여 업무 다시 로드
watch(() => workspaceStore.workspaces, (newWorkspaces) => {
  console.log('🔄 워크스페이스 변경 감지:', newWorkspaces.length)
  if (newWorkspaces.length > 0) {
    loadMyTasks()
  }
}, { deep: true })

// 페이지 이동 함수들
const navigateToDrive = () => {
  router.push('/workspaces/personal/drive')
}

const navigateToProject = async (projectId) => {
  console.log('프로젝트로 이동:', projectId)
  
  // 워크스페이스 선택
  await workspaceStore.selectWorkspace(projectId)
  
  // 페이지 이동
  await router.push(`/workspaces/${projectId}/dashboard`)
}

// Lifecycle
let timeInterval = null

onMounted(async () => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 60000)
  
  // 워크스페이스 목록이 로드될 때까지 대기
  if (workspaceStore.workspaces.length === 0) {
    await workspaceStore.loadMyWorkspaces()
  }
  
  // 데이터 로드 (병렬 처리)
  await Promise.all([
    loadFriends(),
    loadDriveFiles()
  ])
  
  // 워크스페이스가 이미 있으면 업무 로드
  if (workspaceStore.workspaces.length > 0) {
    await loadMyTasks()
  }
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.personal-dashboard {
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* 헤더 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.greeting h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.date-time {
  font-size: 14px;
  color: #64748b;
}

/* 통계 카드 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  border-color: #4f46e5;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.15);
}

/* 프로젝트 드롭다운 관련 */
.stat-card-wrapper {
  position: relative;
}

.stat-card-with-dropdown {
  position: relative;
  overflow: visible;
}

.projects-dropdown {
  position: absolute;
  top: calc(100% - 8px);
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  padding-top: 8px;
  animation: fadeInDown 0.2s ease-out;
  max-height: 400px;
  overflow-y: auto;
}

.projects-dropdown .dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 8px;
}

.projects-dropdown .dropdown-header strong {
  font-size: 14px;
  color: #1e293b;
}

.projects-dropdown .project-count {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 12px;
}

.project-list {
  padding: 0 8px 8px 8px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 12px;
}

.project-item:hover {
  background: #f8fafc;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.project-description {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.projects-dropdown .empty-state {
  padding: 24px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.projects-dropdown .empty-text {
  color: #94a3b8;
  font-size: 13px;
}

/* 프로젝트 드롭다운 스크롤바 */
.projects-dropdown::-webkit-scrollbar {
  width: 6px;
}

.projects-dropdown::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.projects-dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.projects-dropdown::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
}

.stat-icon.success {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.stat-icon.info {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

/* 빠른 작업 */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.action-btn:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 메인 그리드 */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.content-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 600px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

/* 업무 목록 */
.tasks-container {
  flex: 1;
  overflow-y: auto;
  margin-top: 16px;
  max-height: 600px;
  padding-right: 4px;
}

/* 커스텀 스크롤바 - 업무 목록 */
.tasks-container::-webkit-scrollbar {
  width: 6px;
}

.tasks-container::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.tasks-container::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.tasks-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.task-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.task-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background: white;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.task-title.completed {
  text-decoration: line-through;
  color: #94a3b8;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #64748b;
}

/* 일정 목록 */
.schedule-container {
  flex: 1;
  overflow-y: auto;
  max-height: 600px;
  padding-right: 4px;
}

/* 커스텀 스크롤바 - 개인 일정 */
.schedule-container::-webkit-scrollbar {
  width: 6px;
}

.schedule-container::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.schedule-container::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.schedule-container::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.schedule-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.schedule-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background: white;
}

.schedule-card.today {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-color: #0ea5e9;
}

.schedule-date {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.schedule-date.today {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: white;
}

.date-day {
  font-size: 11px;
  font-weight: 500;
}

.date-num {
  font-size: 18px;
  font-weight: 700;
}

.schedule-content {
  flex: 1;
  min-width: 0;
}

.schedule-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.schedule-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #94a3b8;
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

/* 반응형 */
@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .personal-dashboard {
    padding: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    flex-wrap: nowrap;
  }
}

/* 프로젝트 생성 모달 스타일 (ServerSidebar에서 가져옴) */
.create-workspace-modal {
  background: rgb(var(--v-theme-surface));
}

.create-workspace-modal .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.create-workspace-modal .header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-workspace-modal .header-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 24px;
}

.create-workspace-modal .modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.create-workspace-modal .modal-body {
  padding: 24px;
}

.create-workspace-modal .input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.create-workspace-modal .profile-image-upload {
  display: flex;
  justify-content: center;
}

.create-workspace-modal .profile-avatar {
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-workspace-modal .profile-avatar:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
}

.create-workspace-modal .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.create-workspace-modal .workspace-info-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.create-workspace-modal .workspace-basic-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
}

.create-workspace-modal .profile-image-group {
  flex-shrink: 0;
}

.create-workspace-modal .workspace-name-group {
  flex: 1;
}

.create-workspace-modal .member-invite-section {
  margin-top: 16px;
}

.create-workspace-modal .section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 16px;
}

.create-workspace-modal .search-container {
  position: relative;
  width: 100%;
  margin-bottom: 12px;
}

.create-workspace-modal .search-input-wrapper {
  position: relative;
  width: 100%;
}

.create-workspace-modal .search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.6);
  z-index: 2;
}

.create-workspace-modal .search-input {
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

.create-workspace-modal .search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 1);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

.create-workspace-modal .search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.create-workspace-modal .member-selection-container {
  display: flex;
  gap: 16px;
  height: 320px;
}

.create-workspace-modal .friends-panel,
.create-workspace-modal .search-results-panel,
.create-workspace-modal .invite-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.create-workspace-modal .panel-header {
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.create-workspace-modal .panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.create-workspace-modal .friends-list,
.create-workspace-modal .search-results-list,
.create-workspace-modal .invite-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.create-workspace-modal .friend-item,
.create-workspace-modal .invite-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 12px;
}

.create-workspace-modal .friend-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.create-workspace-modal .friend-info,
.create-workspace-modal .member-info {
  flex: 1;
  min-width: 0;
}

.create-workspace-modal .friend-name,
.create-workspace-modal .member-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.create-workspace-modal .friend-status,
.create-workspace-modal .member-status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.create-workspace-modal .friend-badge {
  margin-left: 4px;
}

.create-workspace-modal .friend-label {
  margin-left: 8px;
  padding: 2px 6px;
  background: rgba(var(--v-theme-success), 0.1);
  color: rgb(var(--v-theme-success));
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.create-workspace-modal .check-icon {
  flex-shrink: 0;
}

.create-workspace-modal .remove-btn {
  flex-shrink: 0;
}

.create-workspace-modal .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
}

.create-workspace-modal .loading-state p {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}

.create-workspace-modal .no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

.create-workspace-modal .no-results p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.create-workspace-modal .empty-invite {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.create-workspace-modal .empty-invite p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.create-workspace-modal .create-workspace-btn {
  color: white !important;
}
</style>
