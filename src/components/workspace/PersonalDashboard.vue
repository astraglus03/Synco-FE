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

      <div 
        class="stat-card-wrapper"
        @mouseenter="showSchedulesDropdown = true"
        @mouseleave="showSchedulesDropdown = false"
      >
        <div class="stat-card stat-card-with-dropdown">
          <div class="stat-icon success">
            <v-icon size="28">mdi-calendar-check</v-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ schedulesCount }}</div>
            <div class="stat-label">개인 일정</div>
          </div>
        </div>
        
        <!-- 개인 일정 목록 드롭다운 -->
        <div v-if="showSchedulesDropdown" class="projects-dropdown">
          <div class="dropdown-header">
            <strong>개인 일정 목록</strong>
            <span class="project-count">{{ schedulesCount }}개</span>
          </div>
          
          <div v-if="personalSchedules.length > 0" class="project-list">
            <div
              v-for="schedule in personalSchedules"
              :key="schedule.taskSeq"
              class="project-item"
              @click="handleTaskClick(schedule.taskSeq, true)"
            >
              <div class="project-info">
                <div class="project-name">{{ schedule.taskTitle }}</div>
                <div class="project-description" v-if="schedule.taskContent">
                  {{ schedule.taskContent }}
                </div>
                <div class="schedule-dropdown-meta">
                  <v-chip size="x-small" :color="getTaskStatusColor(schedule.taskStatus)">
                    {{ getTaskStatusText(schedule.taskStatus) }}
                  </v-chip>
                  <span class="schedule-date-text">
                    <v-icon size="12">mdi-calendar</v-icon>
                    {{ formatScheduleDate(schedule.startDate, schedule.endDate) }}
                  </span>
                </div>
              </div>
              <v-icon size="small" color="#94a3b8">mdi-chevron-right</v-icon>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <v-icon size="large" color="grey-lighten-1">mdi-calendar-blank</v-icon>
            <span class="empty-text">등록된 일정이 없습니다</span>
          </div>
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
          <v-menu
            v-model="showProjectMenu"
            :close-on-content-click="false"
            location="bottom end"
            offset="8"
          >
            <template #activator="{ props }">
              <button class="project-filter-btn" v-bind="props">
                <v-icon size="18" class="mr-2">mdi-briefcase</v-icon>
                <span class="label">{{ selectedProjectLabel }}</span>
                <v-icon size="18" class="ml-3 chevron">mdi-chevron-down</v-icon>
              </button>
            </template>
            <v-card class="project-filter-menu" min-width="280">
              <div class="menu-header">
                <v-icon size="18" color="primary">mdi-briefcase</v-icon>
                <span>프로젝트 선택</span>
              </div>
              <div class="menu-search">
                <v-text-field
                  v-model="projectSearch"
                  placeholder="프로젝트 검색"
                  prepend-inner-icon="mdi-magnify"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </div>
              <v-list density="comfortable" class="menu-list">
                <v-list-item
                  :active="selectedProject === 'all'"
                  @click="selectProject('all')"
                >
                  <template #prepend>
                    <v-icon>mdi-infinity</v-icon>
                  </template>
                  <v-list-item-title>전체 프로젝트</v-list-item-title>
                  <template #append>
                    <v-icon v-if="selectedProject === 'all'" color="primary">mdi-check</v-icon>
                  </template>
                </v-list-item>
                <v-divider class="my-1" />
                <v-list-item
                  v-for="opt in filteredProjectOptions"
                  :key="opt.value"
                  :active="selectedProject === opt.value"
                  @click="selectProject(opt.value)"
                >
                  <template #prepend>
                    <v-avatar size="22" color="primary">
                      <span class="text-white" style="font-weight:700">{{ opt.title?.charAt(0) }}</span>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ opt.title }}</v-list-item-title>
                  <template #append>
                    <v-icon v-if="selectedProject === opt.value" color="primary">mdi-check</v-icon>
                  </template>
                </v-list-item>
                <div v-if="filteredProjectOptions.length === 0" class="menu-empty">
                  <v-icon size="22" color="grey">mdi-folder-off</v-icon>
                  <span>검색 결과가 없습니다</span>
                </div>
              </v-list>
              <div class="menu-actions">
                <v-btn variant="text" size="small" @click="showProjectDialog = true">
                  <v-icon start size="16">mdi-folder-plus</v-icon>
                  새 프로젝트 만들기
                </v-btn>
                <v-spacer />
                <v-btn variant="text" size="small" @click="showProjectMenu = false">닫기</v-btn>
              </div>
            </v-card>
          </v-menu>
        </div>

        <v-tabs v-model="taskTab" color="primary" density="compact">
          <v-tab value="all">전체 ({{ filteredTasks.length }})</v-tab>
          <v-tab value="urgent">
            <v-icon size="small" color="error" class="mr-1">mdi-alert-circle</v-icon>
            마감임박 ({{ urgentTasks.length }})
          </v-tab>
          <v-tab value="in-progress">진행중 ({{ inProgressTasks.length }})</v-tab>
          <v-tab value="todo">할 일 ({{ todoTasks.length }})</v-tab>
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
            @click="handleTaskClick(task.taskSeq || task.id)"
          >
            <div class="task-marker" :style="{ backgroundColor: getAssigneeTaskMarkerColor(task.status, task.isOverdue) }"></div>
            <div class="task-content">
              <div class="task-title-section">
                <div class="task-title" :class="{ completed: task.status === 'COMPLETED' }">
                  {{ task.title }}
                </div>
                <div class="task-chips">
                  <v-chip
                    v-if="task.isOverdue && !isTaskCompleted(task.status)"
                    color="error"
                    size="x-small"
                    class="overdue-chip"
                  >
                    기한이 지났습니다
                  </v-chip>
                  <v-chip
                    :color="getTaskStatusColor(task.status)"
                    size="x-small"
                    class="status-chip"
                  >
                    {{ getTaskStatusText(task.status) }}
                  </v-chip>
                </div>
              </div>
              <div class="task-meta">
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
        </div>

        <div class="schedule-container">
          <div v-if="personalSchedules.length === 0" class="empty-state">
            <v-icon size="64" color="grey">mdi-calendar-blank</v-icon>
            <p>일정이 없습니다</p>
          </div>

          <div
            v-for="schedule in personalSchedules"
            :key="schedule.taskSeq"
            class="schedule-card"
            :class="{ today: isToday(schedule.startDate) }"
            @click="handleTaskClick(schedule.taskSeq, true)"
          >
            <div class="schedule-date" :class="{ today: isToday(schedule.startDate) }">
              <div class="date-day">{{ formatDay(schedule.startDate) }}</div>
              <div class="date-num">{{ formatDate(schedule.startDate) }}</div>
            </div>
            <div class="schedule-content">
              <div class="schedule-title">{{ schedule.taskTitle }}</div>
              <div class="schedule-meta">
                <v-chip size="x-small" :color="getTaskStatusColor(schedule.taskStatus)">
                  {{ getTaskStatusText(schedule.taskStatus) }}
                </v-chip>
                <span class="meta-item">
                  <v-icon size="12">mdi-clock</v-icon>
                  {{ formatPeriod(schedule.startDate, schedule.endDate) }}
                </span>
                <span v-if="schedule.taskContent" class="meta-item">
                  <v-icon size="12">mdi-text</v-icon>
                  {{ schedule.taskContent }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 파일 업로드 다이얼로그 -->
    <v-dialog v-model="showFileUploadDialog" max-width="700px" max-height="90vh">
      <v-card class="upload-modal">
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="primary">mdi-upload</v-icon>
            <h3 class="modal-title">파일 업로드</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeFileUploadModal"></v-btn>
        </v-card-title>
        
        <v-card-text class="modal-body">
          <!-- 업로드할 폴더 선택 -->
          <div class="folder-selection mb-4">
            <label class="input-label">업로드 위치</label>
            <div class="folder-selector" @click="showUploadFolderSelector = !showUploadFolderSelector">
              <div class="selected-folder">
                <v-icon class="folder-icon">mdi-folder</v-icon>
                <span class="folder-name">{{ selectedUploadFolderName }}</span>
                <v-icon class="dropdown-icon" :class="{ 'rotated': showUploadFolderSelector }">mdi-chevron-down</v-icon>
              </div>
            </div>
            
            <!-- 계층형 폴더 선택 드롭다운 -->
            <div v-if="showUploadFolderSelector" class="folder-dropdown">
              <div class="folder-list">
                <!-- 로딩 상태 -->
                <div v-if="loadingFolders" class="loading-state">
                  <v-progress-circular size="20" indeterminate></v-progress-circular>
                  <span>폴더 목록을 불러오는 중...</span>
                </div>
                
                <!-- 최상위 루트 옵션 -->
                <div 
                  class="folder-item"
                  :class="{ 'selected': uploadFolderLocation === null }"
                  @click="selectUploadFolder({ folderSeq: null, folderName: '최상위 루트' })"
                >
                  <v-icon class="expand-placeholder"></v-icon>
                  <v-icon class="folder-icon" color="#2196f3">mdi-home</v-icon>
                  <span class="folder-name">최상위 루트</span>
                  <span v-if="uploadFolderLocation === null" class="selected-indicator">
                    <v-icon color="primary" size="16">mdi-check</v-icon>
                  </span>
                </div>
                
                <!-- 계층구조 폴더 목록 -->
                <div 
                  v-for="folder in flattenedFolders" 
                  :key="folder.id"
                  class="folder-item"
                  :class="{ 'selected': uploadFolderLocation === folder.id }"
                  :style="{ paddingLeft: `${20 + folder.level * 20}px` }"
                  @click="selectUploadFolder(folder)"
                >
                  <v-icon class="folder-icon" color="#ff9800">mdi-folder</v-icon>
                  <span class="folder-name">{{ folder.name }}</span>
                  <span v-if="uploadFolderLocation === folder.id" class="selected-indicator">
                    <v-icon color="primary" size="16">mdi-check</v-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="uploadFiles.length > 0" class="upload-files">
            <div class="upload-files-header">
              <span class="files-count">{{ uploadFiles.length }}개 파일 선택됨</span>
            </div>
            <div class="files-list">
              <div 
                v-for="(file, index) in uploadFiles" 
                :key="index"
                class="file-item"
              >
                <v-icon class="file-icon">{{ getFileIcon(file.type) }}</v-icon>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ formatFileSizeFromBytes(file.size) }}</div>
                </div>
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="uploadFiles.splice(index, 1)"
                ></v-btn>
              </div>
            </div>
          </div>
          <div v-else class="upload-placeholder">
            <v-icon size="48" color="grey">mdi-cloud-upload</v-icon>
            <p>업로드할 파일이 없습니다</p>
          </div>
        </v-card-text>
        
        <v-card-actions class="modal-actions">
          <v-btn variant="text" @click="$refs.fileInput.click()">
            <v-icon left>mdi-plus</v-icon>
            파일 추가
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeFileUploadModal">취소</v-btn>
          <v-btn 
            color="primary" 
            @click="uploadFilesToDrive"
            :disabled="uploadFiles.length === 0"
            :loading="isUploading"
          >
            업로드
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- 숨겨진 파일 input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      style="display: none"
      @change="handleFileInputChange"
    />

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
          
          <!-- 프로젝트 기간 (서버 사이드바와 동일하게 멤버 초대 아래에 위치) -->
          <div class="workspace-info-section">
            <div class="workspace-basic-row" style="align-items: center;">
              <div class="workspace-name-group">
                <label class="input-label">프로젝트 기간</label>
                
                <!-- 날짜 선택 카드 -->
                <div class="date-selector-container">
                  <v-menu
                    v-model="newProjectStartDateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                  >
                    <template v-slot:activator="{ props: menuProps }">
                      <div 
                        v-bind="menuProps"
                        class="date-selector-card"
                        @click="openNewProjectDatePicker('start')"
                      >
                        <div class="date-selector-icon">
                          <v-icon color="primary">mdi-calendar-start</v-icon>
                        </div>
                        <div class="date-selector-content">
                          <div class="date-selector-label">시작일</div>
                          <div class="date-selector-value">
                            {{ formatNewProjectDisplayDate(newProjectStartDate) || '날짜 선택' }}
                          </div>
                        </div>
                        <v-icon class="date-selector-arrow">mdi-chevron-right</v-icon>
                      </div>
                    </template>
                    <v-date-picker
                      :model-value="newProjectStartDate"
                      @update:model-value="updateNewProjectStartDate"
                      :max="newProjectEndDate || undefined"
                      color="primary"
                      locale="ko-KR"
                    ></v-date-picker>
                  </v-menu>
                  
                  <div class="date-connector">
                    <v-icon size="small" color="grey">mdi-arrow-right</v-icon>
                  </div>
                  
                  <v-menu
                    v-model="newProjectEndDateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                  >
                    <template v-slot:activator="{ props: menuProps }">
                      <div 
                        v-bind="menuProps"
                        class="date-selector-card"
                        @click="openNewProjectDatePicker('end')"
                      >
                        <div class="date-selector-icon">
                          <v-icon color="primary">mdi-calendar-end</v-icon>
                        </div>
                        <div class="date-selector-content">
                          <div class="date-selector-label">종료일</div>
                          <div class="date-selector-value">
                            {{ formatNewProjectDisplayDate(newProjectEndDate) || '날짜 선택' }}
                          </div>
                        </div>
                        <v-icon class="date-selector-arrow">mdi-chevron-right</v-icon>
                      </div>
                    </template>
                    <v-date-picker
                      :model-value="newProjectEndDate"
                      @update:model-value="updateNewProjectEndDate"
                      :min="newProjectStartDate || undefined"
                      color="primary"
                      locale="ko-KR"
                    ></v-date-picker>
                  </v-menu>
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

  <!-- 업무 상세 모달 -->
  <TaskDetailModal
    v-model="showTaskDetailModal"
    :taskData="selectedTask"
    :isPersonal="isPersonalTask"
  />

  <!-- 개인 일정 추가 모달 -->
  <PersonalTaskModal
    v-model="showPersonalTaskModal"
    :work-space-seq="personalWorkspaceId"
    :is-edit-mode="false"
    @task-created="handlePersonalTaskCreated"
  />

  <!-- 에러 모달 -->
  <v-dialog v-model="showErrorModal" max-width="500px" persistent class="error-dialog">
    <v-card class="error-modal">
      <v-card-title class="error-header">
        <div class="error-title-content">
          <v-icon class="error-icon" color="error">mdi-alert-circle</v-icon>
          <h3 class="error-title">{{ errorTitle }}</h3>
        </div>
      </v-card-title>
      
      <v-card-text class="error-body">
        <p class="error-message">{{ errorMessage }}</p>
      </v-card-text>
      
      <v-card-actions class="error-actions">
        <v-spacer></v-spacer>
        <v-btn 
          color="primary" 
          variant="flat"
          @click="closeErrorModal"
        >
          확인
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
import TaskDetailModal from './TaskDetailModal.vue'
import PersonalTaskModal from './PersonalTaskModal.vue'

// Stores & Router
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const router = useRouter()

// Reactive data
const userName = computed(() => authStore.user?.name || '사용자')
const currentDate = ref('')
const currentTime = ref('')
const selectedProject = ref('all')
const showProjectMenu = ref(false)
const projectSearch = ref('')
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
const uploadFolderLocation = ref(null)
const showUploadFolderSelector = ref(false)
const allFolders = ref([])
const loadingFolders = ref(false)
const fileInput = ref(null)
const isUploading = ref(false)

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
const newProjectStartDate = ref('') // yyyy-MM-dd (서버 사이드바와 동일)
const newProjectEndDate = ref('')   // yyyy-MM-dd (서버 사이드바와 동일)

// 프로젝트 생성 날짜 메뉴 상태
const newProjectStartDateMenu = ref(false)
const newProjectEndDateMenu = ref(false)

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
  { id: 3, label: '프로젝트', icon: 'mdi-folder-plus', color: '#ec4899', action: 'new-project' }
])

// 개인 일정 데이터 (API로부터 가져옴)
const personalSchedules = ref([])

// 우선순위 옵션
const priorityOptions = [
  { title: '높음', value: 'high' },
  { title: '보통', value: 'medium' },
  { title: '낮음', value: 'low' }
]

// 프로젝트 드롭다운 표시 상태
const showProjectsDropdown = ref(false)

// 개인 일정 드롭다운 표시 상태
const showSchedulesDropdown = ref(false)

// Computed
const projectFilterOptions = computed(() => {
  return [
    { title: '전체 프로젝트', value: 'all' },
    ...projects.value.map(p => ({ title: p.name, value: p.id }))
  ]
})

const filteredProjectOptions = computed(() => {
  const q = (projectSearch.value || '').toLowerCase().trim()
  if (!q) return projects.value.map(p => ({ title: p.name, value: p.id }))
  return projects.value
    .filter(p => (p.name || '').toLowerCase().includes(q))
    .map(p => ({ title: p.name, value: p.id }))
})

const selectedProjectLabel = computed(() => {
  if (selectedProject.value === 'all') return '전체 프로젝트'
  const found = projects.value.find(p => p.id === selectedProject.value)
  return found?.name || '전체 프로젝트'
})

const selectProject = (value) => {
  selectedProject.value = value
  showProjectMenu.value = false
}

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
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  let tasks = []
  switch (taskTab.value) {
    case 'urgent':
      tasks = urgentTasks.value
      break
    case 'in-progress':
      tasks = inProgressTasks.value
      break
    case 'todo':
      tasks = todoTasks.value
      break
    case 'completed':
      tasks = completedTasks.value
      break
    default:
      tasks = filteredTasks.value
  }
  
  // 기한 지남 여부 계산 및 추가
  return tasks.map(task => {
    const endDate = task.dueDate ? new Date(task.dueDate) : null
    let isOverdue = false
    if (endDate) {
      endDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000))
      isOverdue = daysRemaining < 0
    }
    
    return {
      ...task,
      isOverdue: isOverdue
    }
  })
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

// 개인 워크스페이스 ID
const personalWorkspaceId = computed(() => {
  const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
  return personalWorkspace?.workSpaceSeq || null
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

// 업무 완료 여부 확인
const isTaskCompleted = (status) => {
  const statusValue = status || ''
  return statusValue === 'COMPLETED' || statusValue === '완료' || statusValue === 'DONE' || statusValue === 'FINISHED' || statusValue === 'completed'
}

// 담당자별 업무 현황 마커 색상 (기한 만료 우선, 그 다음 상태)
const getAssigneeTaskMarkerColor = (status, isOverdue) => {
  // 완료된 업무는 기한 만료와 관계없이 녹색
  const statusValue = status || ''
  if (isTaskCompleted(status)) {
    return '#22c55e' // 녹색
  }
  
  // 기한 만료는 우선순위가 가장 높음 (빨간색)
  if (isOverdue) {
    return '#ef4444' // 빨간색
  }
  
  // 상태에 따른 색상
  if (statusValue === 'IN_PROGRESS' || statusValue === '진행중' || statusValue === 'PROGRESS' || statusValue === 'DOING' || statusValue === 'in-progress') {
    return '#f59e0b' // 노란색
  }
  if (statusValue === 'TODO' || statusValue === '할일' || statusValue === 'PENDING' || statusValue === 'pending') {
    return '#3b82f6' // 파란색
  }
  
  // 기본값 (파란색)
  return '#3b82f6'
}

// openTaskDetail 함수는 하단의 handleTaskClick으로 대체됨

const editTask = (task) => {
  // TODO: 작업 수정 모달 구현
}

const editSchedule = (schedule) => {
  // TODO: 일정 수정 모달 구현
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

// 업무 상태 색상
const getTaskStatusColor = (status) => {
  const colors = {
    TODO: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success'
  }
  return colors[status] || 'grey'
}

// 업무 상태 텍스트
const getTaskStatusText = (status) => {
  const texts = {
    TODO: '예정',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료'
  }
  return texts[status] || status
}

// 날짜 포맷팅 (일)
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.getDate()
}

// 날짜 포맷팅 (요일)
const formatDay = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}

// 기간 포맷팅
const formatPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return ''
  return `${startDate} ~ ${endDate}`
}

// 일정 날짜 포맷팅 (드롭다운용)
const formatScheduleDate = (startDate, endDate) => {
  if (!startDate) return ''
  if (startDate === endDate) return startDate
  return `${startDate} ~ ${endDate}`
}

// 오늘 날짜 확인
const isToday = (dateString) => {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

const handleQuickAction = (action) => {
  switch (action) {
    case 'new-schedule':
      // 개인 일정 생성 모달 열기
      showPersonalTaskModal.value = true
      break
    case 'upload-file':
      showFileUploadDialog.value = true
      uploadFolderLocation.value = null
      showUploadFolderSelector.value = false
      // 폴더 목록이 없을 때만 로드
      if (!allFolders.value || allFolders.value.length === 0) {
        loadAllFolders()
      }
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

// 폴더 목록 로드
const loadAllFolders = async () => {
  loadingFolders.value = true
  try {
    const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
    if (!personalWorkspace || !personalWorkspace.workSpaceSeq) {
      allFolders.value = []
      return
    }
    
    const response = await personalDriveApi.getItems(personalWorkspace.workSpaceSeq, null)
    const items = response?.data || response
    
    // 폴더만 필터링
    const folders = Array.isArray(items) 
      ? items.filter(item => item.type === 'folder' || item.itemType === 'FOLDER')
      : []
    
    // 계층구조 생성
    allFolders.value = buildFolderHierarchy(folders)
  } catch (error) {
    console.error('폴더 목록 로드 실패:', error)
    allFolders.value = []
  } finally {
    loadingFolders.value = false
  }
}

// 폴더 계층구조 생성
const buildFolderHierarchy = (folders) => {
  const folderMap = new Map()
  const rootFolders = []
  
  // 모든 폴더를 맵에 저장
  folders.forEach(folder => {
    const id = folder.folderSeq || folder.id
    folderMap.set(id, {
      id,
      name: folder.folderName || folder.name,
      parentFolderSeq: folder.parentFolderSeq,
      children: []
    })
  })
  
  // 계층구조 구성
  folderMap.forEach(folder => {
    if (folder.parentFolderSeq) {
      const parent = folderMap.get(folder.parentFolderSeq)
      if (parent) {
        parent.children.push(folder)
      } else {
        rootFolders.push(folder)
      }
    } else {
      rootFolders.push(folder)
    }
  })
  
  return rootFolders
}

// 폴더 계층구조를 평탄화
const flattenedFolders = computed(() => {
  const result = []
  
  const flatten = (folders, level = 0) => {
    folders.forEach(folder => {
      result.push({ 
        ...folder, 
        level
      })
      if (folder.children && folder.children.length > 0) {
        flatten(folder.children, level + 1)
      }
    })
  }
  
  flatten(allFolders.value)
  return result
})

// 파일 input 변경 처리
const handleFileInputChange = (event) => {
  const files = Array.from(event.target.files)
  // 기존 파일에 추가
  uploadFiles.value = [...uploadFiles.value, ...files]
  // input 초기화 (같은 파일 다시 선택 가능하도록)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 업로드 폴더 선택
const selectUploadFolder = (folder) => {
  uploadFolderLocation.value = folder.folderSeq !== undefined ? folder.folderSeq : folder.id
  showUploadFolderSelector.value = false
}

// 선택된 업로드 폴더 이름
const selectedUploadFolderName = computed(() => {
  if (uploadFolderLocation.value === null) return '최상위 루트'
  if (!uploadFolderLocation.value) return '폴더를 선택하세요'
  
  const findFolder = (folders, targetId) => {
    for (const folder of folders) {
      if (folder.id === targetId) return folder
      if (folder.children && folder.children.length > 0) {
        const found = findFolder(folder.children, targetId)
        if (found) return found
      }
    }
    return null
  }
  
  const folder = findFolder(allFolders.value, uploadFolderLocation.value)
  return folder ? folder.name : '알 수 없는 폴더'
})

// 파일 아이콘 결정
const getFileIcon = (mimeType) => {
  if (!mimeType) return 'mdi-file'
  if (mimeType.startsWith('image/')) return 'mdi-file-image'
  if (mimeType.startsWith('video/')) return 'mdi-file-video'
  if (mimeType.startsWith('audio/')) return 'mdi-file-music'
  if (mimeType.includes('pdf')) return 'mdi-file-pdf'
  if (mimeType.includes('word')) return 'mdi-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'mdi-file-excel'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'mdi-file-powerpoint'
  if (mimeType.includes('text')) return 'mdi-file-document'
  return 'mdi-file'
}

// 파일 크기 포맷팅
const formatFileSizeFromBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 파일 업로드 모달 닫기
const closeFileUploadModal = () => {
  showFileUploadDialog.value = false
  uploadFiles.value = []
  uploadFolderLocation.value = null
  showUploadFolderSelector.value = false
}

// 파일 업로드 처리
const uploadFilesToDrive = async () => {
  if (!uploadFiles.value || uploadFiles.value.length === 0) {
    return
  }

  isUploading.value = true
  try {
    // 개인 워크스페이스 정보 가져오기
    const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
    
    if (!personalWorkspace || !personalWorkspace.workSpaceSeq) {
      showError('파일 업로드 실패', '개인 워크스페이스 정보를 찾을 수 없습니다.')
      return
    }

    const targetFolderId = uploadFolderLocation.value
    const response = await personalDriveApi.uploadFiles(uploadFiles.value, personalWorkspace.workSpaceSeq, targetFolderId)
    
    if (response.success) {
      closeFileUploadModal()
      
      // 드라이브 파일 개수 새로고침
      await loadDriveFiles()
    } else {
      throw new Error(response.error || '파일 업로드 실패')
    }
  } catch (error) {
    showError('파일 업로드 실패', error.message || '파일 업로드 중 오류가 발생했습니다.')
  } finally {
    isUploading.value = false
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
    // 에러 무시
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

// 프로젝트 생성 처리 (서버 사이드바와 동일한 로직)
const handleCreateProject = async () => {
  if (!newProject.value.name.trim()) {
    alert('프로젝트 이름을 입력해주세요.')
    return
  }
  if (!newProjectStartDate.value) {
    alert('프로젝트 시작일을 선택하세요.')
    return
  }
  if (!newProjectEndDate.value) {
    alert('프로젝트 종료일을 선택하세요.')
    return
  }
  if (new Date(newProjectStartDate.value) > new Date(newProjectEndDate.value)) {
    alert('종료일은 시작일 이후여야 합니다.')
    return
  }

  try {
    // memberList 생성 (memberSeq 배열)
    const memberList = invitedMembers.value.map(member => member.memberSeq)
    
    // 날짜를 ISO LocalDateTime 형식으로 변환 (yyyy-MM-ddTHH:mm:ss)
    const formatDateForApi = (dateValue) => {
      if (!dateValue) return null
      
      // Date 객체인 경우
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear()
        const month = String(dateValue.getMonth() + 1).padStart(2, '0')
        const day = String(dateValue.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      // 문자열인 경우 (yyyy-MM-dd 형식)
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateValue
      }
      
      // 다른 형식인 경우 Date로 파싱 시도
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      return dateValue
    }
    
    const startDateStr = formatDateForApi(newProjectStartDate.value)
    const endDateStr = formatDateForApi(newProjectEndDate.value)
    
    // API 호출 (서버 사이드바와 동일하게 시작일/종료일 포함)
    const createdWorkspace = await createWorkspace(
      newProject.value.name,
      newProjectProfileFile.value,
      memberList,
      startDateStr ? `${startDateStr}T00:00:00` : null,
      endDateStr ? `${endDateStr}T23:59:59` : null
    )
    
    // 성공 메시지
    alert(`프로젝트 "${createdWorkspace.workSpaceName}"가 성공적으로 생성되었습니다!`)
    
    // 워크스페이스 목록 새로고침 (API에서 최신 목록 가져오기)
    await workspaceStore.loadMyWorkspaces()
    
    // 생성된 워크스페이스로 이동
    const newWorkspaceId = `workspace_${createdWorkspace.workSpaceSeq}`
    await router.push(`/workspaces/${newWorkspaceId.split('_')[1]}/dashboard`)
    
    // 모달 닫기
    closeProjectDialog()
  } catch (error) {
    console.error('프로젝트 생성 실패:', error)
    const errorMessage = error.response?.data?.message || error.response?.data?.error || '프로젝트 생성에 실패했습니다. 다시 시도해주세요.'
    alert(errorMessage)
  }
}

// 프로젝트 날짜 표시용 포맷 변환
const formatNewProjectDisplayDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}년 ${month}월 ${day}일`
}

// 프로젝트 날짜 피커 열기
const openNewProjectDatePicker = (type) => {
  if (type === 'start') {
    newProjectStartDateMenu.value = true
  } else {
    newProjectEndDateMenu.value = true
  }
}

// 프로젝트 시작일 업데이트
const updateNewProjectStartDate = (value) => {
  newProjectStartDate.value = value
  newProjectStartDateMenu.value = false
}

// 프로젝트 종료일 업데이트
const updateNewProjectEndDate = (value) => {
  newProjectEndDate.value = value
  newProjectEndDateMenu.value = false
}

// 프로젝트 모달 닫기 및 초기화 (서버 사이드바와 동일)
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
  newProjectStartDate.value = ''
  newProjectEndDate.value = ''
  newProjectStartDateMenu.value = false
  newProjectEndDateMenu.value = false
  invitedMembers.value = []
  memberSearchQuery.value = ''
  memberSearchResults.value = []
}

const addQuickTask = () => {
  if (!newTask.value.title) {
    showError('작업 생성 실패', '작업 제목을 입력해주세요.')
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
    friendsList.value = []
  }
}

// 개인 드라이브 파일 개수 로드
const loadDriveFiles = async () => {
  try {
    // 개인 워크스페이스 정보 가져오기
    const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
    
    console.log('📁 [개인 드라이브] 워크스페이스 검색:', personalWorkspace)
    
    if (!personalWorkspace || !personalWorkspace.workSpaceSeq) {
      console.warn('⚠️ [개인 드라이브] 개인 워크스페이스 정보가 없습니다')
      driveItems.value = []
      return
    }
    
    console.log('📡 [개인 드라이브] API 호출, Seq:', personalWorkspace.workSpaceSeq)
    const response = await personalDriveApi.getItems(personalWorkspace.workSpaceSeq, null)
    
    console.log('📦 [개인 드라이브] API 응답:', response)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 배열
    const driveData = response?.data || response
    driveItems.value = Array.isArray(driveData) ? driveData : []
    
    console.log('✅ [개인 드라이브] 로드 완료:', driveItems.value.length, '개')
  } catch (error) {
    console.error('❌ [개인 드라이브] 로드 실패:', error)
    driveItems.value = []
  }
}

// 개인 일정 목록 로드
const loadPersonalSchedules = async () => {
  try {
    // 개인 워크스페이스 정보 가져오기
    const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
    
    console.log('📅 [개인 일정] 워크스페이스 검색:', personalWorkspace)
    
    if (!personalWorkspace || !personalWorkspace.workSpaceSeq) {
      console.warn('⚠️ [개인 일정] 개인 워크스페이스 정보가 없습니다')
      console.log('전체 워크스페이스:', workspaceStore.workspaces)
      personalSchedules.value = []
      return
    }
    
    console.log('📡 [개인 일정] API 호출, Seq:', personalWorkspace.workSpaceSeq)
    console.log('📡 [개인 일정] API URL:', `/task-service/scheduleManagement/project/tasks/${personalWorkspace.workSpaceSeq}`)
    
    // 프로젝트 Task API 사용 (개인 워크스페이스도 동일한 API)
    const response = await scheduleApi.getProjectTasks(personalWorkspace.workSpaceSeq)
    console.log('📦 [개인 일정] API 응답 (raw):', JSON.stringify(response, null, 2))
    
    // 백엔드 응답 구조 처리
    let scheduleData = response?.data || response
    console.log('📦 [개인 일정] 처리된 데이터 타입:', typeof scheduleData, Array.isArray(scheduleData))
    
    // 배열이 아닌 경우 처리
    if (!Array.isArray(scheduleData)) {
      console.log('⚠️ [개인 일정] 응답이 배열이 아닙니다:', scheduleData)
      personalSchedules.value = []
      return
    }
    
    console.log('📦 [개인 일정] 배열 길이:', scheduleData.length)
    
    // 배열이 비어있는 경우
    if (scheduleData.length === 0) {
      console.log('ℹ️ [개인 일정] 등록된 일정이 없습니다')
      personalSchedules.value = []
      return
    }
    
    // 상태별로 그룹화된 데이터에서 실제 일정 추출
    let schedules = []
    
    for (let i = 0; i < scheduleData.length; i++) {
      const group = scheduleData[i]
      console.log(`📦 [개인 일정] 그룹 ${i}:`, JSON.stringify(group, null, 2))
      
      // taskResDtoList가 있는 경우 (그룹화된 응답)
      if (group && group.taskResDtoList && Array.isArray(group.taskResDtoList)) {
        console.log(`✅ [개인 일정] 그룹 ${i}에서 ${group.taskResDtoList.length}개 추출`)
        schedules = schedules.concat(group.taskResDtoList)
      }
      // 직접 Task 객체인 경우
      else if (group && (group.taskSeq || group.taskTitle)) {
        console.log(`✅ [개인 일정] 그룹 ${i}는 직접 Task 객체`)
        schedules.push(group)
      }
    }
    
    personalSchedules.value = schedules
    console.log('✅ [개인 일정] 로드 완료:', personalSchedules.value.length, '개')
    console.log('✅ [개인 일정] 최종 데이터:', JSON.stringify(personalSchedules.value, null, 2))
  } catch (error) {
    console.error('❌ [개인 일정] 로드 실패:', error)
    console.error('❌ [개인 일정] 에러 상세:', error.response?.data || error.message)
    console.error('❌ [개인 일정] HTTP 상태:', error.response?.status)
    
    // 500 에러는 백엔드 문제이므로 빈 배열로 처리
    if (error.response?.status === 500) {
      console.warn('⚠️ [개인 일정] 백엔드 서버 오류 - 빈 목록으로 표시합니다')
      console.warn('⚠️ [개인 일정] 백엔드 팀에 API 확인 요청이 필요합니다')
    }
    
    personalSchedules.value = []
  }
}

// 내 업무 목록 로드
const loadMyTasks = async () => {
  try {
    const projectWorkspaces = projects.value
    const currentUserSeq = authStore.memberSeq
    
    if (projectWorkspaces.length === 0) {
      myTasks.value = []
      return
    }
    
    // 모든 프로젝트의 업무를 병렬로 가져오기
    const taskPromises = projectWorkspaces.map(async (project) => {
      try {
        const response = await scheduleApi.getProjectTasks(project.id)
        
        // 백엔드 응답 구조 처리: { success, data } 또는 직접 배열
        const taskData = response?.data || response
        const taskArray = Array.isArray(taskData) ? taskData : []
        
        // 중첩된 구조에서 실제 업무 데이터 추출
        let tasks = []
        taskArray.forEach(group => {
          if (group.taskResDtoList && Array.isArray(group.taskResDtoList)) {
            tasks = tasks.concat(group.taskResDtoList)
          } else if (group.taskStatus) {
            // 단일 업무인 경우
            tasks.push(group)
          }
        })
        
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
        return []
      }
    })
    
    const allProjectTasks = await Promise.all(taskPromises)
    const flatTasks = allProjectTasks.flat()
    
    // 내가 담당자인 업무만 필터링
    if (currentUserSeq) {
      myTasks.value = flatTasks.filter(task => {
        return task.assigneeSeq && Number(task.assigneeSeq) === Number(currentUserSeq)
      })
    } else {
      myTasks.value = flatTasks
    }
    
    allTasksData.value = flatTasks
    
  } catch (error) {
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

// 워크스페이스 변경 감지하여 데이터 다시 로드
watch(() => workspaceStore.workspaces, (newWorkspaces, oldWorkspaces) => {
  console.log('🔄 워크스페이스 변경 감지:', oldWorkspaces?.length, '→', newWorkspaces.length)
  
  if (newWorkspaces.length > 0) {
    // 개인 워크스페이스가 추가되었는지 확인
    const personalWorkspace = newWorkspaces.find(ws => ws.type === 'personal')
    const oldPersonalWorkspace = oldWorkspaces?.find(ws => ws.type === 'personal')
    
    // 개인 워크스페이스가 새로 추가되었거나 workSpaceSeq가 변경된 경우
    if (personalWorkspace && 
        (!oldPersonalWorkspace || 
         personalWorkspace.workSpaceSeq !== oldPersonalWorkspace.workSpaceSeq)) {
      console.log('🔄 개인 워크스페이스 변경 감지, 데이터 다시 로드')
      loadPersonalSchedules()
      loadDriveFiles()
    }
    
    // 프로젝트 워크스페이스 변경 시 내 업무 다시 로드
    loadMyTasks()
  }
}, { deep: true })

// 페이지 이동 함수들
const navigateToDrive = () => {
  router.push('/workspaces/personal/drive')
}

const navigateToProject = async (projectId) => {
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
  
  console.log('🚀 [PersonalDashboard] onMounted 시작')
  console.log('📦 [PersonalDashboard] 현재 워크스페이스:', workspaceStore.workspaces)
  
  // 워크스페이스 목록이 로드될 때까지 대기
  if (workspaceStore.workspaces.length === 0) {
    console.log('🔄 [PersonalDashboard] 워크스페이스 로딩 시작')
    await workspaceStore.loadMyWorkspaces()
    console.log('✅ [PersonalDashboard] 워크스페이스 로딩 완료:', workspaceStore.workspaces)
  }
  
  // 개인 워크스페이스가 제대로 로드되었는지 확인
  const personalWorkspace = workspaceStore.workspaces.find(ws => ws.type === 'personal')
  console.log('📦 [PersonalDashboard] 개인 워크스페이스:', personalWorkspace)
  
  // 데이터 로드 (병렬 처리)
  console.log('🔄 [PersonalDashboard] 데이터 로드 시작')
  await Promise.all([
    loadFriends(),
    loadDriveFiles(),
    loadPersonalSchedules()
  ])
  
  // 워크스페이스가 이미 있으면 업무 로드
  if (workspaceStore.workspaces.length > 0) {
    console.log('🔄 [PersonalDashboard] 내 업무 로드 시작')
    await loadMyTasks()
  }
  
  console.log('✅ [PersonalDashboard] onMounted 완료')
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// 업무 상세 모달 관련
const showTaskDetailModal = ref(false)
const selectedTask = ref({})
const isLoadingTask = ref(false)
const isPersonalTask = ref(false)

// 개인 일정 추가 모달 관련
const showPersonalTaskModal = ref(false)

// 에러 모달 상태
const showErrorModal = ref(false)
const errorMessage = ref('')
const errorTitle = ref('')

// 업무 항목 클릭 핸들러
const handleTaskClick = async (taskSeq, isPersonal = false) => {
  if (!taskSeq) {
    return
  }
  
  try {
    isLoadingTask.value = true
    isPersonalTask.value = isPersonal
    
    // 모두 프로젝트 Task API 사용 (개인/프로젝트 동일)
    const response = await scheduleApi.getTaskDetail(taskSeq)
    
    // 백엔드 응답 구조 처리: { success, data } 또는 직접 객체
    const taskDetail = response?.data || response
    
    if (taskDetail) {
      selectedTask.value = taskDetail
      showTaskDetailModal.value = true
    } else {
      showError('업무 조회 실패', '업무 정보를 찾을 수 없습니다.')
    }
  } catch (error) {
    showError('업무 조회 실패', error.message || '업무 정보를 불러오는 중 오류가 발생했습니다.')
  } finally {
    isLoadingTask.value = false
  }
}

// 모달이 닫힐 때 데이터 새로고침
watch(showTaskDetailModal, async (newVal, oldVal) => {
  // 모달이 열림 → 닫힘 상태로 변경될 때
  if (oldVal === true && newVal === false) {
    // 데이터 새로고침
    if (isPersonalTask.value) {
      // 개인 일정이었으면 개인 일정 목록 새로고침
      await loadPersonalSchedules()
    } else {
      // 프로젝트 업무였으면 내 업무 목록 새로고침
      await loadMyTasks()
    }
    selectedTask.value = {}
    isPersonalTask.value = false
  }
})

// 개인 일정 생성 완료 후 핸들러
const handlePersonalTaskCreated = async () => {
  await loadPersonalSchedules()
}

// 에러 모달 표시
const showError = (title, message) => {
  errorTitle.value = title
  errorMessage.value = message
  showErrorModal.value = true
}

// 에러 모달 닫기
const closeErrorModal = () => {
  showErrorModal.value = false
  errorTitle.value = ''
  errorMessage.value = ''
}
</script>

<style scoped>
.personal-dashboard {
  padding: 24px;
  background: rgb(var(--v-theme-background));
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
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 4px;
}

.date-time {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* 통계 카드 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgb(var(--v-theme-surface));
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
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
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 8px 24px rgba(var(--v-theme-primary), 0.15);
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
  background: rgb(var(--v-theme-surface));
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
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-bottom: 8px;
}

.projects-dropdown .dropdown-header strong {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.projects-dropdown .project-count {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  background: rgba(var(--v-theme-on-surface), 0.05);
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
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 4px;
}

.project-description {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
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
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 13px;
}

/* 프로젝트 드롭다운 스크롤바 */
.projects-dropdown::-webkit-scrollbar {
  width: 6px;
}

.projects-dropdown::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.projects-dropdown::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.projects-dropdown::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

/* 일정 드롭다운 메타 정보 */
.schedule-dropdown-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.schedule-date-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
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
  color: rgb(var(--v-theme-on-surface));
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
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
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.action-btn:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.2);
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
  background: rgb(var(--v-theme-surface));
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
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
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

/* 프로젝트 필터 버튼 */
.project-filter-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-filter-btn:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.3);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.project-filter-btn .label {
  font-weight: 600;
}

.project-filter-btn .chevron {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* 프로젝트 필터 메뉴 */
.project-filter-menu {
  border-radius: 12px !important;
  overflow: hidden;
}

.project-filter-menu .menu-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.project-filter-menu .menu-search {
  padding: 10px 12px 0 12px;
}

.project-filter-menu .menu-list {
  max-height: 320px;
  overflow-y: auto;
}

.project-filter-menu .menu-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 16px 0;
}

.project-filter-menu .menu-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 10px 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
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
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.task-card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.task-marker {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
  min-height: 60px;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  flex: 1;
}

.task-title.completed {
  text-decoration: line-through;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.task-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
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
  color: rgba(var(--v-theme-on-surface), 0.7);
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
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.schedule-card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.schedule-card.today {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgb(var(--v-theme-primary));
}

.schedule-date {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.schedule-date.today {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.date-day {
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.date-num {
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.schedule-content {
  flex: 1;
  min-width: 0;
}

.schedule-title {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
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
  color: rgba(var(--v-theme-on-surface), 0.6);
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
  background: rgb(var(--v-theme-surface));
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

/* 날짜 선택 카드 스타일 */
.date-selector-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.date-selector-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-selector-card:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.date-selector-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 10px;
}

.date-selector-content {
  flex: 1;
  min-width: 0;
}

.date-selector-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.date-selector-value {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-selector-arrow {
  color: rgba(var(--v-theme-on-surface), 0.4);
  transition: transform 0.2s ease;
}

.date-selector-card:hover .date-selector-arrow {
  transform: translateX(4px);
  color: rgb(var(--v-theme-primary));
}

.date-connector {
  display: flex;
  align-items: center;
  padding: 0 4px;
  flex-shrink: 0;
}

/* 날짜 피커 스타일 */
:deep(.v-date-picker) {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .date-selector-container {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-connector {
    transform: rotate(90deg);
    padding: 8px 0;
  }
  
  .date-selector-card {
    width: 100%;
  }
}

/* 파일 업로드 모달 스타일 */
.upload-modal {
  display: flex;
  flex-direction: column;
}

.upload-modal .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.upload-modal .header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-modal .header-icon {
  font-size: 24px;
}

.upload-modal .modal-title {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.upload-modal .modal-body {
  min-height: auto;
  max-height: 70vh;
  overflow-y: auto;
  padding: 24px;
  transition: max-height 0.3s ease;
}

.upload-modal .modal-actions {
  flex-shrink: 0;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.upload-files {
  max-height: 300px;
  overflow-y: auto;
}

.upload-files-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.files-count {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-success));
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.file-icon {
  color: rgb(var(--v-theme-success));
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.upload-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.upload-placeholder p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 8px;
}

.folder-selection {
  position: relative;
}

.folder-selector {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(var(--v-theme-surface), 0.8);
}

.folder-selector:hover {
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-surface), 1);
}

.selected-folder {
  display: flex;
  align-items: center;
  gap: 12px;
}

.folder-icon {
  color: rgb(var(--v-theme-success));
}

.folder-name {
  flex: 1;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.dropdown-icon {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: transform 0.2s ease;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

.folder-dropdown {
  margin-top: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 500px;
  overflow-y: auto;
}

.folder-list {
  padding: 8px 0;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.folder-item:hover {
  background: rgba(var(--v-theme-success), 0.1);
}

.folder-item.selected {
  background: rgba(var(--v-theme-success), 0.15);
  border-left: 3px solid rgb(var(--v-theme-success));
}

.expand-placeholder {
  width: 16px;
  height: 16px;
  visibility: hidden;
}

.folder-item .folder-icon {
  color: rgb(var(--v-theme-success));
  width: 20px;
  height: 20px;
}

.folder-item .folder-name {
  flex: 1;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.selected-indicator {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}

/* 에러 모달 스타일 */
.error-modal {
  border-radius: 12px;
}

.error-header {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.error-title-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 24px;
}

.error-title {
  margin: 0;
  color: #d32f2f;
  font-size: 18px;
  font-weight: 600;
}

.error-body {
  padding: 24px;
}

.error-message {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 16px;
  line-height: 1.5;
}

.error-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
</style>
