<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  workspaces: Array,
  currentWorkspace: String
})

const emit = defineEmits(['select-workspace'])

// 워크스페이스 생성 다이얼로그 상태
const createWorkspaceDialog = ref(false)
const newWorkspaceName = ref('')
const newWorkspaceProfile = ref('')
const profileInput = ref(null)

// 친구 관련 상태
const friendSearchQuery = ref('')
const selectedFriends = ref([])
const invitedMembers = ref([])

// 친구 목록 (임시 데이터)
const friends = ref([
  { id: 'kim_minsu', name: '김민수', avatarColor: 'primary' },
  { id: 'lee_jihyun', name: '이지현', avatarColor: 'success' },
  { id: 'park_junyoung', name: '박준영', avatarColor: 'warning' },
  { id: 'choi_sujin', name: '최수진', avatarColor: 'error' },
  { id: 'jung_hyunwoo', name: '정현우', avatarColor: 'info' },
  { id: 'han_jisoo', name: '한지수', avatarColor: 'purple' },
  { id: 'yoon_jiho', name: '윤지호', avatarColor: 'teal' }
])

// 전체 사용자 목록 (친구 + 일반 사용자)
const allUsers = ref([
  // 친구들
  { id: 'kim_minsu', name: '김민수', avatarColor: 'primary', isFriend: true },
  { id: 'lee_jihyun', name: '이지현', avatarColor: 'success', isFriend: true },
  { id: 'park_junyoung', name: '박준영', avatarColor: 'warning', isFriend: true },
  { id: 'choi_sujin', name: '최수진', avatarColor: 'error', isFriend: true },
  { id: 'jung_hyunwoo', name: '정현우', avatarColor: 'info', isFriend: true },
  { id: 'han_jisoo', name: '한지수', avatarColor: 'purple', isFriend: true },
  { id: 'yoon_jiho', name: '윤지호', avatarColor: 'teal', isFriend: true },
  
  // 일반 사용자들
  { id: 'kim_sohee', name: '김소희', avatarColor: 'pink', isFriend: false },
  { id: 'lee_donghyun', name: '이동현', avatarColor: 'indigo', isFriend: false },
  { id: 'park_jiwon', name: '박지원', avatarColor: 'orange', isFriend: false },
  { id: 'choi_hyunwoo', name: '최현우', avatarColor: 'cyan', isFriend: false },
  { id: 'jung_soyoung', name: '정소영', avatarColor: 'deep-purple', isFriend: false },
  { id: 'han_minjae', name: '한민재', avatarColor: 'light-green', isFriend: false },
  { id: 'yoon_jiyeon', name: '윤지연', avatarColor: 'amber', isFriend: false },
  { id: 'kang_taewon', name: '강태원', avatarColor: 'red', isFriend: false },
  { id: 'oh_seunghyun', name: '오승현', avatarColor: 'blue-grey', isFriend: false },
  { id: 'lim_jihoon', name: '임지훈', avatarColor: 'lime', isFriend: false },
  { id: 'shin_yeji', name: '신예지', avatarColor: 'deep-orange', isFriend: false },
  { id: 'kwon_hyunseok', name: '권현석', avatarColor: 'brown', isFriend: false },
  { id: 'ryu_jihye', name: '류지혜', avatarColor: 'green', isFriend: false },
  { id: 'song_mingyu', name: '송민규', avatarColor: 'light-blue', isFriend: false },
  { id: 'jang_hyunwoo', name: '장현우', avatarColor: 'purple', isFriend: false }
])

// 필터링된 사용자 목록 (친구 + 일반 사용자)
const filteredUsers = computed(() => {
  if (!friendSearchQuery.value.trim()) {
    return allUsers.value
  }
  return allUsers.value.filter(user => 
    user.name.toLowerCase().includes(friendSearchQuery.value.toLowerCase()) ||
    user.id.toLowerCase().includes(friendSearchQuery.value.toLowerCase())
  )
})

// 프로필 이미지 선택
const selectProfileImage = () => {
  profileInput.value?.click()
}

// 프로필 이미지 변경 처리
const handleProfileImageChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      newWorkspaceProfile.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 친구 검색
const searchFriends = () => {
  // 검색 로직은 computed에서 처리됨
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
  if (!isInvited(user.id)) {
    invitedMembers.value.push(user)
  }
}

// 초대 목록에서 제거
const removeFromInviteList = (userId) => {
  const index = invitedMembers.value.findIndex(member => member.id === userId)
  if (index > -1) {
    invitedMembers.value.splice(index, 1)
  }
}

// 초대되었는지 확인
const isInvited = (userId) => {
  return invitedMembers.value.some(member => member.id === userId)
}

// 워크스페이스 생성 함수
const createWorkspace = () => {
  if (newWorkspaceName.value.trim()) {
    const newWorkspace = {
      id: `team_${Date.now()}`,
      name: newWorkspaceName.value,
      type: 'team',
      profile: newWorkspaceProfile.value,
      icon: newWorkspaceName.value.charAt(0).toUpperCase(),
      members: 1 + invitedMembers.value.length,
      invitedMembers: invitedMembers.value
    }
    
    // 워크스페이스 목록에 추가 (실제로는 API 호출)
    emit('select-workspace', newWorkspace.id)
    closeCreateWorkspaceDialog()
  }
}

// 모달 닫기 및 초기화
const closeCreateWorkspaceDialog = () => {
  createWorkspaceDialog.value = false
  newWorkspaceName.value = ''
  newWorkspaceProfile.value = ''
  selectedFriends.value = []
  invitedMembers.value = []
  friendSearchQuery.value = ''
}

// 워크스페이스 아이콘 색상 생성
const getWorkspaceIconColor = (workspace) => {
  if (workspace.type === 'personal') return 'primary'
  
  const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
  const index = workspace.id.charCodeAt(0) % colors.length
  return colors[index]
}
</script>

<template>
  <!-- 서버 사이드바 -->
  <div class="server-sidebar">
    <!-- 개인 워크스페이스 (홈) -->
    <div 
      class="server-icon home"
      :class="{ 'active': currentWorkspace === 'personal' }"
      @click="emit('select-workspace', 'personal')"
    >
      <v-icon>mdi-home</v-icon>
    </div>

    <!-- 구분선 -->
    <v-divider class="server-divider" />

    <!-- 팀 워크스페이스들 -->
    <div 
      v-for="workspace in workspaces.filter(w => w.type === 'team')"
      :key="workspace.id"
      class="server-icon team"
      :class="{ 'active': currentWorkspace === workspace.id }"
      @click="emit('select-workspace', workspace.id)"
    >
      <span>{{ workspace.icon }}</span>
    </div>

    <!-- 워크스페이스 추가 버튼 -->
    <div 
      class="server-icon add-server"
      @click="createWorkspaceDialog = true"
    >
      <v-icon>mdi-plus</v-icon>
    </div>

    <!-- 워크스페이스 생성 다이얼로그 -->
    <v-dialog 
      v-model="createWorkspaceDialog" 
      max-width="800"
    >
      <v-card class="create-workspace-modal">
        <div class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon">mdi-plus-circle</v-icon>
            <h3 class="modal-title">새 워크스페이스 만들기</h3>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeCreateWorkspaceDialog"
          />
        </div>
        
        <div class="modal-body">
          <!-- 워크스페이스 기본 정보 -->
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
              
              <!-- 워크스페이스 이름 -->
              <div class="workspace-name-group">
                <label class="input-label">워크스페이스 이름</label>
                <v-text-field
                  v-model="newWorkspaceName"
                  placeholder="예: 마케팅팀"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @keyup.enter="createWorkspace"
                />
              </div>
            </div>
          </div>

          <!-- 멤버 초대 섹션 -->
          <div class="member-invite-section">
            <div class="section-title">멤버 초대</div>
            
            <!-- 공용 검색바 -->
            <div class="global-search-container">
              <div class="search-input-wrapper">
                <v-icon class="search-icon">mdi-magnify</v-icon>
                <input 
                  v-model="friendSearchQuery"
                  type="text" 
                  placeholder="사용자 검색..." 
                  class="search-input"
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
                  <div
                    v-for="friend in friends"
                    :key="friend.id"
                    class="friend-item"
                    @click="addToInviteList(friend)"
                  >
                    <v-avatar size="32" :color="friend.avatarColor">
                      {{ friend.name.charAt(0) }}
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
                      v-if="isInvited(friend.id)"
                      class="check-icon"
                      color="primary"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                </div>
              </div>

              <!-- 중간: 검색 결과 (검색할 때만 표시) -->
              <div v-if="friendSearchQuery" class="search-results-panel">
                <div class="panel-header">
                  <h4>검색 결과</h4>
                </div>
                
                <div class="search-results-list">
                  <div
                    v-for="user in filteredUsers"
                    :key="user.id"
                    class="friend-item"
                    @click="addToInviteList(user)"
                  >
                    <v-avatar size="32" :color="user.avatarColor">
                      {{ user.name.charAt(0) }}
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
                      v-if="isInvited(user.id)"
                      class="check-icon"
                      color="primary"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                  
                  <!-- 검색 결과가 없을 때 -->
                  <div v-if="filteredUsers.length === 0" class="no-results">
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
                    :key="member.id"
                    class="invite-item"
                  >
                    <v-avatar size="32" :color="member.avatarColor">
                      {{ member.name.charAt(0) }}
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
                      @click="removeFromInviteList(member.id)"
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
            @click="createWorkspace"
            class="create-workspace-btn"
          >
            워크스페이스 만들기
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: fixed;
  left: 0;
  top: 60px;
  bottom: 0;
  z-index: 100;
  transition: width 0.3s ease;
}



.server-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.server-icon.add-server {
  width: 44px;
  height: 44px;
}

.server-icon:hover {
  border-radius: 16px;
  background: rgba(var(--v-theme-primary), 0.2);
}

.server-icon.home {
  background: rgb(var(--v-theme-primary));
}

.server-icon.active {
  background: rgb(var(--v-theme-primary));
  border-radius: 16px;
}

.server-icon.active::before {
  content: '';
  position: absolute;
  left: -12px;
  width: 4px;
  height: 20px;
  background: white;
  border-radius: 0 4px 4px 0;
}


.server-divider {
  width: 32px;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1px;
  /* margin: 2px 0; */
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
  color: rgba(255, 255, 255, 0.6) !important;
  font-size: 18px;
  font-weight: 300;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.3);
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

</style>
