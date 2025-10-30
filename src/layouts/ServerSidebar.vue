<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { createWorkspace, getFriendList, searchMembers } from '@/api/workspace/workSpaceApi'

const props = defineProps({
  workspaces: Array,
  currentWorkspace: String
})

const emit = defineEmits(['select-workspace'])

// Store
const workspaceStore = useWorkspaceStore()

// 워크스페이스 생성 다이얼로그 상태
const createWorkspaceDialog = ref(false)
const newWorkspaceName = ref('')
const newWorkspaceProfile = ref('')
const newWorkspaceProfileFile = ref(null)
const profileInput = ref(null)

// 친구 관련 상태
const friendSearchQuery = ref('')
const selectedFriends = ref([])
const invitedMembers = ref([])
const isLoadingFriends = ref(false)
const isLoadingSearch = ref(false)

// 친구 목록 (API에서 가져옴)
const friends = ref([])

// 검색 결과 목록
const searchResults = ref([])

// 필터링된 사용자 목록 (검색 결과)
const filteredUsers = computed(() => {
  return searchResults.value
})

// 프로필 이미지 선택
const selectProfileImage = () => {
  profileInput.value?.click()
}

// 프로필 이미지 변경 처리
const handleProfileImageChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    newWorkspaceProfileFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      newWorkspaceProfile.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 친구 목록 가져오기
const loadFriendList = async () => {
  try {
    isLoadingFriends.value = true
    const response = await getFriendList('', 0, 50)
    
    // API 응답이 배열인지, 페이징 객체인지 확인
    const friendList = Array.isArray(response) ? response : (response.content || [])
    
    friends.value = friendList.map(friend => ({
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
    // alert('친구 목록을 불러오는데 실패했습니다.')
  } finally {
    isLoadingFriends.value = false
  }
}

// 회원 검색
const searchMembersDebounced = ref(null)
watch(friendSearchQuery, (newValue) => {
  if (searchMembersDebounced.value) {
    clearTimeout(searchMembersDebounced.value)
  }
  
  if (!newValue.trim()) {
    searchResults.value = []
    return
  }
  
  searchMembersDebounced.value = setTimeout(async () => {
    try {
      isLoadingSearch.value = true
      const response = await searchMembers(newValue, 0, 20)
      
      // API 응답이 배열인지, 페이징 객체인지 확인
      const memberList = Array.isArray(response) ? response : (response.content || [])
      
      searchResults.value = memberList.map(member => ({
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
      searchResults.value = []
    } finally {
      isLoadingSearch.value = false
    }
  }, 300)
})

// 랜덤 아바타 색상 생성
const getRandomColor = () => {
  const colors = ['primary', 'success', 'warning', 'error', 'info', 'purple', 'teal', 'pink', 'indigo', 'orange']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 친구 선택 토글 (기존 함수 유지)
const toggleFriendSelection = (friendId) => {
  const index = selectedFriends.value.indexOf(friendId)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
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

// 프로젝트 생성 함수
const handleCreateWorkspace = async () => {
  if (!newWorkspaceName.value.trim()) {
    alert('프로젝트 이름을 입력해주세요.')
    return
  }

  try {
    // memberList 생성 (memberSeq 배열)
    const memberList = invitedMembers.value.map(member => member.memberSeq)
    
    // API 호출
    const createdWorkspace = await createWorkspace(
      newWorkspaceName.value,
      newWorkspaceProfileFile.value,
      memberList
    )
    
    // 성공 메시지
    alert(`프로젝트 "${createdWorkspace.workSpaceName}"가 성공적으로 생성되었습니다!`)
    
    // 워크스페이스 목록 새로고침 (API에서 최신 목록 가져오기)
    await workspaceStore.loadMyWorkspaces()
    
    // 생성된 워크스페이스로 이동
    const newWorkspaceId = `workspace_${createdWorkspace.workSpaceSeq}`
    emit('select-workspace', newWorkspaceId)
    
    // 모달 닫기
    closeCreateWorkspaceDialog()
  } catch (error) {
    console.error('프로젝트 생성 실패:', error)
    alert('프로젝트 생성에 실패했습니다. 다시 시도해주세요.')
  }
}

// 모달 닫기 및 초기화
const closeCreateWorkspaceDialog = () => {
  createWorkspaceDialog.value = false
  newWorkspaceName.value = ''
  newWorkspaceProfile.value = ''
  newWorkspaceProfileFile.value = null
  selectedFriends.value = []
  invitedMembers.value = []
  friendSearchQuery.value = ''
  searchResults.value = []
}

// 프로젝트 생성 모달 열기
const openCreateWorkspaceDialog = () => {
  createWorkspaceDialog.value = true
  loadFriendList()
}

// 워크스페이스 아이콘 색상 생성
const getWorkspaceIconColor = (workspace) => {
  if (workspace.type === 'personal') return 'primary'
  
  const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
  const index = workspace.id.charCodeAt(0) % colors.length
  return colors[index]
}

// Lifecycle
onMounted(() => {
  // MainLayout에서 워크스페이스 목록을 로드하므로 여기서는 불필요
})
</script>

<template>
  <!-- 서버 사이드바 -->
  <div class="server-sidebar">
    <!-- 홈 버튼 (개인 워크스페이스 접근용) -->
    <div 
      class="server-icon home"
      :class="{ 'active': currentWorkspace === 'personal' }"
      @click="emit('select-workspace', 'personal')"
    >
      <v-icon>mdi-home</v-icon>
    </div>

    <!-- 구분선 -->
    <v-divider class="server-divider" />

    <!-- 프로젝트 워크스페이스 목록 (스크롤 영역) -->
    <div class="workspaces-scroll-container">
      <div 
        v-for="workspace in workspaces.filter(w => w.type === 'project')"
        :key="workspace.id"
        class="server-icon project"
        :class="{ 'active': currentWorkspace === workspace.id }"
        @click="emit('select-workspace', workspace.id)"
      >
        <img 
          v-if="workspace.profile" 
          :src="workspace.profile" 
          :alt="workspace.name"
          class="workspace-thumbnail"
        />
        <span v-else>{{ workspace.icon }}</span>
      </div>

      <!-- 프로젝트 추가 버튼: 목록의 마지막에 위치하고 함께 스크롤 -->
      <div 
        class="server-icon add-server"
        @click="openCreateWorkspaceDialog"
      >
        <v-icon>mdi-plus</v-icon>
      </div>
    </div>

    <!-- 프로젝트 생성 다이얼로그 -->
    <v-dialog 
      v-model="createWorkspaceDialog" 
      max-width="800"
    >
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
            @click="closeCreateWorkspaceDialog"
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
                    :color="newWorkspaceProfile ? 'transparent' : 'primary'"
                    class="profile-avatar"
                    @click="selectProfileImage"
                  >
                    <img v-if="newWorkspaceProfile" :src="newWorkspaceProfile" alt="Profile" />
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
                  v-model="newWorkspaceName"
                  placeholder="예: 마케팅 프로젝트"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @keyup.enter="handleCreateWorkspace"
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
                  v-model="friendSearchQuery"
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
                  <div v-if="isLoadingFriends" class="loading-state">
                    <v-progress-circular indeterminate color="primary" size="32" />
                    <p>친구 목록 불러오는 중...</p>
                  </div>
                  
                  <!-- 친구 목록 -->
                  <div
                    v-for="friend in friends"
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
                  <div v-if="!isLoadingFriends && friends.length === 0" class="no-results">
                    <v-icon size="48" color="grey">mdi-account-search</v-icon>
                    <p>친구가 없습니다</p>
                  </div>
                </div>
              </div>

              <!-- 중간: 검색 결과 (검색할 때만 표시) -->
              <div v-if="friendSearchQuery" class="search-results-panel">
                <div class="panel-header">
                  <h4>검색 결과</h4>
                </div>
                
                <div class="search-results-list">
                  <!-- 로딩 중 -->
                  <div v-if="isLoadingSearch" class="loading-state">
                    <v-progress-circular indeterminate color="primary" size="32" />
                    <p>검색 중...</p>
                  </div>
                  
                  <!-- 검색 결과 -->
                  <div
                    v-for="user in filteredUsers"
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
                  <div v-if="!isLoadingSearch && filteredUsers.length === 0" class="no-results">
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
            @click="closeCreateWorkspaceDialog"
          >
            취소
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!newWorkspaceName.trim()"
            @click="handleCreateWorkspace"
            class="create-workspace-btn"
          >
            프로젝트 만들기
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>

  <!-- 사이드바 토글 버튼 (접혔을 때만 표시) -->
  <v-btn
    v-if="collapsed"
    class="sidebar-toggle-btn"
    icon
    size="small"
    color="primary"
    @click="emit('toggle')"
  >
    <v-icon>mdi-chevron-right</v-icon>
  </v-btn>
</template>

<style scoped>
.server-sidebar {
  width: 72px;
  background: rgb(var(--v-theme-surface)); /* 라이트 모드 톤 맞춤, 다크 자동 대응 */
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: 1px 0 0 rgba(var(--v-theme-on-surface), 0.04);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px; /* 홈-구분선-목록 사이 간격 축소 */
  position: fixed;
  left: 0;
  top: 60px;
  bottom: 0;
  z-index: 100;
  transition: width 0.3s ease;
}

/* 프로젝트 목록 스크롤 영역 */
.workspaces-scroll-container {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0; /* 중요: flex child의 스크롤을 위해 필수 */
  overflow-y: auto;
  overflow-x: visible; /* 좌측 액티브 인디케이터가 잘리지 않도록 */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 0 6px 0; /* 상단 패딩 제거로 첫 아이콘 상단 간격 축소 */
  /* 스크롤바 숨기기 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.workspaces-scroll-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.server-icon {
  flex-shrink: 0; /* 고정 크기 유지 */
  width: 48px;
  height: 48px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
  font-size: 16px;
}

/* 프로젝트 아이콘 텍스트 톤 다운 */
.server-icon span {
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.server-icon.active span {
  color: white;
}

.server-icon.add-server {
  flex-shrink: 0; /* 추가 버튼 고정 */
  width: 44px;
  height: 44px;
}

.server-icon:hover {
  border-radius: 16px;
  background: rgba(var(--v-theme-primary), 0.12);
}

.server-icon.home {
  flex-shrink: 0; /* 홈 버튼 고정 */
  background: rgb(var(--v-theme-primary));
}

.server-icon.active {
  background: rgb(var(--v-theme-primary));
  border-radius: 16px;
}

/* 활성 인디케이터 - 모든 서버에서 보이도록 위치/레이어 보정 */
.server-icon.active::before {
  content: '';
  position: absolute;
  left: -6px; /* 과도한 음수로 잘리는 이슈 방지 */
  width: 3px;
  height: 20px;
  background: rgb(var(--v-theme-primary));
  border-radius: 0 4px 4px 0;
  z-index: 2;
}

.workspace-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}


.server-divider {
  flex-shrink: 0; /* 구분선 고정 */
  width: 32px;
  height: 2px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 1px;
  margin: 0 !important; /* 여백 제거: 외부 컨테이너 gap으로만 간격 제어 */
}

.sidebar-toggle-btn {
  position: fixed;
  left: 8px;
  top: 80px;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(var(--v-theme-primary), 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sidebar-toggle-btn:hover {
  background: rgba(var(--v-theme-primary), 0.4);
  border-color: rgba(var(--v-theme-primary), 0.6);
  transform: scale(1.1);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .server-sidebar {
    width: 60px;
  }
  
  .server-icon {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }
}

/* 워크스페이스 생성 다이얼로그 스타일 */
.create-workspace-modal {
  background: rgb(var(--v-theme-surface));
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 24px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.modal-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group:last-child {
  margin-bottom: 0;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.profile-image-upload {
  display: flex;
  justify-content: center;
}

.profile-avatar {
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-avatar:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
}

.members-selection {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  padding: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.member-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.member-item.selected {
  background: rgba(var(--v-theme-primary), 0.15);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.member-info {
  flex: 1;
  margin-left: 12px;
}

.member-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
}

.member-status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.check-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

/* 검색바 스타일 */
.search-container {
  position: relative;
  width: 100%;
  margin-bottom: 12px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.6);
  z-index: 2;
}

.search-input {
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

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 1);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* 검색 결과 없음 */
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

.no-results p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

/* 화이트모드에서 워크스페이스 추가 버튼 텍스트 색상 */
.server-icon.add-server {
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
  font-size: 18px;
  font-weight: 300;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
}

/* 친구 표시 스타일 */
.friend-badge {
  margin-left: 6px;
  vertical-align: middle;
}

.friend-label {
  margin-left: 8px;
  padding: 2px 6px;
  background: rgba(var(--v-theme-success), 0.1);
  color: rgb(var(--v-theme-success));
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

/* 워크스페이스 만들기 버튼 텍스트 색상 */
.create-workspace-btn {
  color: white !important;
}

.create-workspace-btn .v-btn__content {
  color: white !important;
}

/* 좌우 분할 모달 스타일 */
.workspace-info-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.workspace-basic-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
}

.profile-image-group {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.workspace-name-group {
  flex: 1;
}


.profile-image-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-avatar {
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-avatar:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
}

.member-invite-section {
  margin-top: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 16px;
}

/* 공용 검색바 */
.global-search-container {
  margin-bottom: 16px;
}

.global-search-container .search-container {
  width: 100%;
  margin: 0;
}

.global-search-container .search-input {
  height: 40px;
  font-size: 14px;
  padding: 8px 16px 8px 48px;
}

.global-search-container .search-icon {
  left: 16px;
  font-size: 18px;
}

.member-selection-container {
  display: flex;
  gap: 16px;
  height: 320px;
}

.friends-panel,
.search-results-panel,
.invite-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  overflow: hidden;
}

/* 검색 결과 패널이 있을 때 레이아웃 조정 */
.member-selection-container:has(.search-results-panel) .friends-panel {
  flex: 0.8;
}

.member-selection-container:has(.search-results-panel) .search-results-panel {
  flex: 1.2;
}

.member-selection-container:has(.search-results-panel) .invite-panel {
  flex: 0.8;
}

.panel-header {
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.friends-list,
.search-results-list,
.invite-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.friend-item,
.invite-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.friend-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.friend-info,
.member-info {
  flex: 1;
  margin-left: 12px;
}

.friend-name,
.member-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  display: flex;
  align-items: center;
}

.friend-status,
.member-status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
  display: flex;
  align-items: center;
}

.invite-item {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.remove-btn {
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  color: rgb(var(--v-theme-error)) !important;
  opacity: 1;
  background: rgba(var(--v-theme-error), 0.1);
}

.empty-invite {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
  height: 100%;
}

.empty-invite p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
  height: 100%;
  gap: 12px;
}

.loading-state p {
  margin: 0;
  font-size: 14px;
}

</style>
