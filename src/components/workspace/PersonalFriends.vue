<template>
  <div class="personal-friends" :class="{ 'dark-mode': theme.global.current.value.dark }">
    <!-- 헤더 -->
    <div class="friends-header">
      <div class="header-content">
        <div class="header-text">
          <h1 class="page-title">친구 관리</h1>
          <p class="page-subtitle">친구를 추가하고 관리하세요</p>
        </div>
        <v-btn
          color="primary"
          size="large"
          class="add-friend-btn"
          @click="showAddFriendModal = true"
        >
          <v-icon left>mdi-account-plus</v-icon>
        친구 추가
      </v-btn>
      </div>
    </div>

    <!-- 통계 카드 -->
    <div class="stats-cards">
      <div class="stat-card stat-card-primary">
        <div class="stat-content">
          <div class="stat-text">
            <h3 class="stat-title">총 친구 수</h3>
            <div class="stat-number">{{ totalFriends }}</div>
          </div>
          <v-icon class="stat-icon">mdi-account-group</v-icon>
        </div>
      </div>
      
      <div class="stat-card stat-card-warning">
        <div class="stat-content">
          <div class="stat-text">
            <h3 class="stat-title">받은 요청</h3>
            <div class="stat-number">{{ pendingReceived }}</div>
          </div>
          <v-icon class="stat-icon">mdi-inbox-arrow-down</v-icon>
        </div>
      </div>
      
      <div class="stat-card stat-card-success">
        <div class="stat-content">
          <div class="stat-text">
            <h3 class="stat-title">보낸 요청</h3>
            <div class="stat-number">{{ pendingSent }}</div>
          </div>
          <v-icon class="stat-icon">mdi-inbox-arrow-up</v-icon>
        </div>
      </div>
    </div>

    <!-- 탭 네비게이션 (3개) -->
    <div class="tab-navigation">
      <button
        class="tab-button"
        :class="{ 'active': activeTab === 'friendList' }"
        @click="changeTab('friendList')"
      >
        친구 목록
      </button>
      <button
        class="tab-button"
        :class="{ 'active': activeTab === 'receivedRequests' }"
        @click="changeTab('receivedRequests')"
      >
        받은 요청
      </button>
      <button
        class="tab-button"
        :class="{ 'active': activeTab === 'sentRequests' }"
        @click="changeTab('sentRequests')"
      >
        보낸 요청
      </button>
    </div>

    <!-- 메인 콘텐츠 -->
    <div class="main-content">
      <!-- 친구 목록 탭 -->
      <div v-if="activeTab === 'friendList'" class="tab-content">
        <div class="content-header">
          <div class="header-left">
            <h2 class="content-title">친구 목록</h2>
          </div>
          <div class="header-right">
            <!-- 검색 바 -->
            <div class="search-container">
              <div class="search-input-wrapper">
                <v-icon class="search-icon">mdi-magnify</v-icon>
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="친구 이름 또는 ID로 검색..." 
                  class="search-input"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 로딩 -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate color="primary" />
        </div>
        
        <!-- 빈 상태 -->
        <div v-else-if="filteredFriends.length === 0" class="empty-state">
          <v-icon class="empty-icon">mdi-account-group-outline</v-icon>
          <h3 class="empty-title">친구가 없습니다</h3>
          <p class="empty-subtitle">새로운 친구를 추가해보세요!</p>
        </div>
        
        <!-- 친구 목록 -->
        <div v-else class="friends-list">
          <div
            v-for="friend in filteredFriends"
            :key="friend.memberSeq"
            class="friend-item"
          >
            <div class="friend-avatar">
              <v-avatar size="40" color="primary">
                <v-img 
                  v-if="friend.profileImageUrl" 
                  :src="friend.profileImageUrl"
                  cover
                />
                <span v-else>{{ friend.name?.charAt(0) || 'U' }}</span>
              </v-avatar>
              <!-- 실시간 상태 배지 -->
              <FriendStatusBadge 
                :friend-name="friend.name"
                :current-status="friend.activeStatus"
                :size="12"
                :tooltip="true"
                class="friend-status-badge"
              />
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend.name }}</div>
              <div class="friend-status">
                {{ getStatusLabel(friend.activeStatus) }} • @{{ friend.memberId }}
              </div>
            </div>
            <div class="friend-actions">
              <v-btn
                icon
                size="small"
                variant="text"
                @click="console.log(`${friend.name}과 채팅 시작`)"
              >
                <v-icon>mdi-message</v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                @click="deleteFriend(friend.memberSeq)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 받은 요청 탭 -->
      <div v-if="activeTab === 'receivedRequests'" class="tab-content">
        <div class="content-header content-header-simple">
          <div class="header-left">
            <h2 class="content-title">받은 친구 요청</h2>
            <p class="content-subtitle">받은 친구 요청을 확인하고 승인하세요</p>
          </div>
        </div>
        
        <!-- 로딩 -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate color="primary" />
        </div>
        
        <!-- 빈 상태 -->
        <div v-else-if="receivedRequests.length === 0" class="empty-state">
          <v-icon class="empty-icon">mdi-email-outline</v-icon>
          <h3 class="empty-title">새로운 친구 요청이 없습니다</h3>
          <p class="empty-subtitle">친구 요청이 들어오면 여기에 표시됩니다</p>
        </div>
        
        <!-- 받은 요청 목록 -->
        <div v-else class="request-list">
          <div
            v-for="request in receivedRequests"
            :key="request.friendSeq"
            class="request-item"
          >
            <v-avatar size="40" color="primary">
              <v-img 
                v-if="request.profileImageUrl" 
                :src="request.profileImageUrl"
                cover
              />
              <span v-else>{{ request.requesterName?.charAt(0) || 'U' }}</span>
            </v-avatar>
            <div class="request-info">
              <div class="request-name">{{ request.requesterName }}</div>
              <div class="request-message">@{{ request.requesterId }}</div>
            </div>
            <div class="request-actions">
              <v-btn
                color="success"
                size="small"
                @click="acceptFriendRequest(request.friendSeq)"
              >
                수락
              </v-btn>
              <v-btn
                color="error"
                size="small"
                variant="outlined"
                @click="rejectFriendRequest(request.friendSeq)"
              >
                거부
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 보낸 요청 탭 -->
      <div v-if="activeTab === 'sentRequests'" class="tab-content">
        <div class="content-header content-header-simple">
          <div class="header-left">
            <h2 class="content-title">보낸 친구 요청</h2>
            <p class="content-subtitle">내가 보낸 친구 요청 목록입니다</p>
          </div>
        </div>
        
        <!-- 로딩 -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate color="primary" />
        </div>
        
        <!-- 빈 상태 -->
        <div v-else-if="sentRequests.length === 0" class="empty-state">
          <v-icon class="empty-icon">mdi-send-outline</v-icon>
          <h3 class="empty-title">보낸 친구 요청이 없습니다</h3>
          <p class="empty-subtitle">새로운 친구에게 요청을 보내보세요</p>
        </div>
        
        <!-- 보낸 요청 목록 -->
        <div v-else class="request-list">
          <div
            v-for="request in sentRequests"
            :key="request.friendSeq"
            class="request-item"
          >
            <v-avatar size="40" color="primary">
              <v-img 
                v-if="request.profileImageUrl" 
                :src="request.profileImageUrl"
                cover
              />
              <span v-else>{{ request.name?.charAt(0) || 'U' }}</span>
            </v-avatar>
            <div class="request-info">
              <div class="request-name">{{ request.name }}</div>
              <div class="request-message">@{{ request.memberId }}</div>
              <div class="request-time">대기 중</div>
            </div>
            <div class="request-actions">
              <v-btn
                color="error"
                size="small"
                variant="outlined"
                @click="cancelSentRequest(request.friendSeq)"
              >
                취소
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 친구 추가 모달 -->
    <v-dialog v-model="showAddFriendModal" max-width="600px" @click:outside="closeModal">
      <v-card class="add-friend-modal">
        <!-- 모달 헤더 -->
        <div class="modal-header">
          <div class="modal-header-content">
            <div class="modal-icon">
              <v-icon>mdi-account-plus</v-icon>
            </div>
            <div class="modal-title-section">
              <h3 class="modal-title">새 친구 추가</h3>
              <p class="modal-subtitle">회원 ID로 친구를 찾아보세요</p>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            class="close-btn"
            @click="closeModal"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        
        <!-- 모달 콘텐츠 -->
        <div class="modal-content">
          <!-- 검색 섹션 -->
          <div class="modal-search-section">
            <div class="search-input-wrapper">
              <v-icon class="search-icon">mdi-magnify</v-icon>
              <input 
                v-model="modalSearchQuery"
                type="text" 
                placeholder="회원 ID로 검색..." 
                class="search-input"
                @input="searchForNewFriends"
              />
            </div>
          </div>
          
          <!-- 로딩 -->
          <div v-if="modalLoading" class="loading-state">
            <v-progress-circular indeterminate color="primary" />
          </div>
          
          <!-- 검색 결과 -->
          <div v-else-if="modalSearchResults.length > 0" class="search-results">
            <div class="results-header">
              <h4 class="results-title">검색 결과</h4>
              <span class="results-count">{{ modalSearchResults.length }}명</span>
            </div>
            <div class="results-list">
              <div
                v-for="user in modalSearchResults"
                :key="user.memberSeq"
                class="result-item"
              >
                <div class="result-avatar">
                  <v-avatar size="48" color="primary">
                    <v-img 
                      v-if="user.profileImageUrl" 
                      :src="user.profileImageUrl"
                      cover
                    />
                    <span v-else>{{ user.name?.charAt(0) || 'U' }}</span>
                  </v-avatar>
                </div>
                <div class="result-info">
                  <div class="result-name">{{ user.name }}</div>
                  <div class="result-userid">@{{ user.memberId }}</div>
                </div>
                <v-btn
                  color="primary"
                  size="small"
                  class="request-btn"
                  @click="sendFriendRequest(user.memberId)"
                >
                  <v-icon left>mdi-account-plus</v-icon>
                  요청 보내기
                </v-btn>
              </div>
            </div>
          </div>
          
          <!-- 빈 상태 -->
          <div v-else-if="modalSearchQuery && modalSearchResults.length === 0 && !modalLoading" class="empty-state">
            <div class="empty-icon">
              <v-icon>mdi-account-search</v-icon>
            </div>
            <h4 class="empty-title">검색 결과가 없습니다</h4>
            <p class="empty-subtitle">다른 회원 ID로 검색해보세요</p>
          </div>
          
          <!-- 초기 상태 -->
          <div v-else class="initial-state">
            <div class="initial-icon">
              <v-icon>mdi-account-search</v-icon>
            </div>
            <h4 class="initial-title">친구를 찾아보세요</h4>
            <p class="initial-subtitle">회원 ID를 입력하여 친구를 검색하고 요청을 보내세요</p>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import * as friendApi from '@/api/friend/friend'
import FriendStatusBadge from '@/components/common/FriendStatusBadge.vue'

const props = defineProps({
  currentChannel: String
})

const theme = useTheme()

// 현재 활성 탭
const activeTab = ref('friendList')

// 친구 목록
const friends = ref([])
const receivedRequests = ref([])
const sentRequests = ref([])

// 로딩 상태
const loading = ref(false)

// 검색어
const searchQuery = ref('')

// 모달 관련
const showAddFriendModal = ref(false)
const modalSearchQuery = ref('')
const modalSearchResults = ref([])
const modalLoading = ref(false)

// 디바운스 타이머
let searchDebounceTimer = null

// 통계 계산
const totalFriends = computed(() => friends.value.length)
const pendingReceived = computed(() => receivedRequests.value.length)
const pendingSent = computed(() => sentRequests.value.length)

// 친구 목록 (서버에서 검색된 결과)
const filteredFriends = computed(() => friends.value)

// 검색어 변경 감지 및 자동 검색
watch(searchQuery, (newQuery) => {
  // 기존 타이머 취소
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // 500ms 후에 검색 실행 (디바운스)
  searchDebounceTimer = setTimeout(() => {
    loadFriendList()
  }, 500)
})

// 친구 목록 조회
const loadFriendList = async () => {
  try {
    loading.value = true
    const data = await friendApi.getFriendList(searchQuery.value)
    friends.value = data.content || data || []
  } catch (error) {
    console.error('친구 목록 조회 실패:', error)
  } finally {
    loading.value = false
  }
}

// 받은 요청 목록 조회
const loadReceivedRequests = async () => {
  try {
    loading.value = true
    const data = await friendApi.getReceivedRequests()
    receivedRequests.value = data.content || data || []
  } catch (error) {
    console.error('받은 요청 조회 실패:', error)
  } finally {
    loading.value = false
  }
}

// 보낸 요청 목록 조회
const loadSentRequests = async () => {
  try {
    loading.value = true
    const data = await friendApi.getSentRequests()
    sentRequests.value = data.content || data || []
  } catch (error) {
    console.error('보낸 요청 조회 실패:', error)
  } finally {
    loading.value = false
  }
}

// 새 친구 검색 (모달에서) - 디바운스 적용
const searchForNewFriends = () => {
  // 기존 타이머 취소
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // 검색어가 너무 짧으면 결과 초기화
  if (modalSearchQuery.value.trim().length < 3) {
    modalSearchResults.value = []
    modalLoading.value = false
    return
  }
  
  // 0.5초 후에 API 호출 (디바운스 중에는 로딩 표시 안 함)
  searchDebounceTimer = setTimeout(async () => {
    try {
      // API 호출 직전에만 로딩 표시
      modalLoading.value = true
      const data = await friendApi.searchMembers(modalSearchQuery.value)
      modalSearchResults.value = data.content || data || []
    } catch (error) {
      console.error('회원 검색 실패:', error)
      modalSearchResults.value = []
    } finally {
      modalLoading.value = false
    }
  }, 500) // 500ms 디바운스
}

// 친구 요청 보내기
const sendFriendRequest = async (memberId) => {
  try {
    await friendApi.sendFriendRequest(memberId)
    
    // 검색 결과에서 제거
    modalSearchResults.value = modalSearchResults.value.filter(u => u.memberId !== memberId)
    
    // 보낸 요청 목록 새로고침
    await loadSentRequests()
    
    alert('친구 요청을 보냈습니다.')
  } catch (error) {
    console.error('친구 요청 실패:', error)
    alert('친구 요청에 실패했습니다.')
  }
}

// 친구 요청 수락
const acceptFriendRequest = async (friendSeq) => {
  try {
    await friendApi.acceptFriendRequest(friendSeq)
    
    // 받은 요청에서 제거
    receivedRequests.value = receivedRequests.value.filter(r => r.friendSeq !== friendSeq)
    
    // 친구 목록 새로고침
    await loadFriendList()
    
    alert('친구 요청을 수락했습니다.')
  } catch (error) {
    console.error('친구 요청 수락 실패:', error)
    alert('친구 요청 수락에 실패했습니다.')
  }
}

// 친구 요청 거부
const rejectFriendRequest = async (friendSeq) => {
  try {
    await friendApi.rejectFriendRequest(friendSeq)
    
    // 받은 요청에서 제거
    receivedRequests.value = receivedRequests.value.filter(r => r.friendSeq !== friendSeq)
    
    alert('친구 요청을 거절했습니다.')
  } catch (error) {
    console.error('친구 요청 거절 실패:', error)
    alert('친구 요청 거절에 실패했습니다.')
  }
}

// 보낸 요청 취소
const cancelSentRequest = async (friendSeq) => {
  try {
    await friendApi.cancelFriendRequest(friendSeq)
    
    // 보낸 요청에서 제거
    sentRequests.value = sentRequests.value.filter(r => r.friendSeq !== friendSeq)
    
    alert('친구 요청을 취소했습니다.')
  } catch (error) {
    console.error('친구 요청 취소 실패:', error)
    alert('친구 요청 취소에 실패했습니다.')
  }
}

// 친구 삭제
const deleteFriend = async (memberSeq) => {
  if (!confirm('정말로 이 친구를 삭제하시겠습니까?')) {
    return
  }
  
  try {
    await friendApi.deleteFriend(memberSeq)
    
    // 친구 목록에서 제거
    friends.value = friends.value.filter(f => f.memberSeq !== memberSeq)
    
    alert('친구를 삭제했습니다.')
  } catch (error) {
    console.error('친구 삭제 실패:', error)
    alert('친구 삭제에 실패했습니다.')
  }
}

// 상태 라벨
const getStatusLabel = (status) => {
  switch (status) {
    case 'ONLINE': return '온라인'
    case 'AWAY': return '자리비움'
    case 'OFFLINE': return '오프라인'
    default: return '알 수 없음'
  }
}

// 탭 변경
const changeTab = (tab) => {
  activeTab.value = tab
  
  // 탭 변경 시 데이터 로드
  if (tab === 'friendList' && friends.value.length === 0) {
    loadFriendList()
  } else if (tab === 'receivedRequests' && receivedRequests.value.length === 0) {
    loadReceivedRequests()
  } else if (tab === 'sentRequests' && sentRequests.value.length === 0) {
    loadSentRequests()
  }
}

// ESC 키로 모달 닫기
const handleKeydown = (event) => {
  if (event.key === 'Escape' && showAddFriendModal.value) {
    closeModal()
  }
}

// 모달 닫기 함수
const closeModal = () => {
  showAddFriendModal.value = false
  modalSearchQuery.value = ''
  modalSearchResults.value = []
  
  // 디바운스 타이머 정리
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // 초기 데이터 로드
  loadFriendList()
  loadReceivedRequests()
  loadSentRequests()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  
  // 디바운스 타이머 정리
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})
</script>

<style scoped>
.personal-friends {
  padding: 20px;
  height: calc(100vh - 60px);
  background: #f8f9fa;
  transition: all 0.3s ease;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 transparent;
}

.personal-friends.dark-mode {
  background: #1a1a1a;
}

.personal-friends::-webkit-scrollbar {
  width: 8px;
}

.personal-friends::-webkit-scrollbar-track {
  background: transparent;
}

.personal-friends::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 4px;
}

.personal-friends::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.dark-mode .personal-friends::-webkit-scrollbar-thumb {
  background: #555555;
}

.dark-mode .personal-friends::-webkit-scrollbar-thumb:hover {
  background: #777777;
}

/* 헤더 */
.friends-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark-mode .page-title {
  color: #ffffff;
}

.page-subtitle {
  color: #666666;
  font-size: 16px;
  transition: color 0.3s ease;
}

.dark-mode .page-subtitle {
  color: #cccccc;
}

.add-friend-btn {
  background: #1976d2 !important;
  color: white !important;
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  padding: 12px 24px;
}

/* 통계 카드 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  min-height: 80px;
  border: 1px solid rgba(25, 118, 210, 0.1);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1976d2, #42a5f5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: rgba(25, 118, 210, 0.3);
}

.stat-card:hover::before {
  opacity: 1;
}

.dark-mode .stat-card {
  background: #2d2d2d;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border-color: rgba(100, 181, 246, 0.2);
}

.dark-mode .stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border-color: rgba(100, 181, 246, 0.4);
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.stat-text {
  flex: 1;
}

.stat-title {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.dark-mode .stat-title {
  color: #cccccc;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark-mode .stat-number {
  color: #ffffff;
}

.stat-icon {
  font-size: 24px;
  color: #1976d2;
  margin-left: 12px;
  opacity: 0.8;
}

/* 카드별 색상 스타일 */
.stat-card-primary {
  border-color: rgba(25, 118, 210, 0.2);
}

.stat-card-primary::before {
  background: linear-gradient(90deg, #1976d2, #42a5f5);
}

.stat-card-primary .stat-icon {
  color: #1976d2;
}

.stat-card-warning {
  border-color: rgba(255, 152, 0, 0.2);
}

.stat-card-warning::before {
  background: linear-gradient(90deg, #ff9800, #ffb74d);
}

.stat-card-warning .stat-icon {
  color: #ff9800;
}

.stat-card-success {
  border-color: rgba(76, 175, 80, 0.2);
}

.stat-card-success::before {
  background: linear-gradient(90deg, #4caf50, #81c784);
}

.stat-card-success .stat-icon {
  color: #4caf50;
}

.dark-mode .stat-card-primary {
  border-color: rgba(100, 181, 246, 0.3);
}

.dark-mode .stat-card-warning {
  border-color: rgba(255, 183, 77, 0.3);
}

.dark-mode .stat-card-success {
  border-color: rgba(129, 199, 132, 0.3);
}

/* 탭 네비게이션 */
.tab-navigation {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  background: #ffffff;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.dark-mode .tab-navigation {
  background: #2d2d2d;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.tab-button {
  flex: 1;
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: #666666;
  font-size: 16px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button:hover {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

.tab-button.active {
  background: #1976d2;
  color: white;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
}

.dark-mode .tab-button {
  color: #cccccc;
}

.dark-mode .tab-button:hover {
  background: rgba(25, 118, 210, 0.2);
  color: #64b5f6;
}

.dark-mode .tab-button.active {
  background: #1976d2;
  color: white;
}

/* 메인 콘텐츠 */
.main-content {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dark-mode .main-content {
  background: #2d2d2d;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.content-header-simple {
  justify-content: flex-start;
  align-items: flex-start;
}

.content-header-simple .header-left {
  display: flex;
  flex-direction: column;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: flex-end;
}

.content-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.dark-mode .content-title {
  color: #ffffff;
}

.content-subtitle {
  color: #666666;
  font-size: 16px;
  transition: color 0.3s ease;
}

.dark-mode .content-subtitle {
  color: #cccccc;
}

/* 로딩 상태 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

/* 친구 목록 */
.friends-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 transparent;
}

.friends-list::-webkit-scrollbar {
  width: 8px;
}

.friends-list::-webkit-scrollbar-track {
  background: transparent;
}

.friends-list::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 2px;
}

.friends-list::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.dark-mode .friend-item {
  background: #3d3d3d;
}

.friend-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark-mode .friend-item:hover {
  background: #4d4d4d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.friend-avatar {
  position: relative;
}

.friend-status-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  z-index: 1;
}


.friend-info {
  flex: 1;
}

.friend-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.dark-mode .friend-name {
  color: #ffffff;
}

.friend-status {
  font-size: 14px;
  color: #666666;
  transition: color 0.3s ease;
}

.dark-mode .friend-status {
  color: #cccccc;
}

.friend-actions {
  display: flex;
  gap: 8px;
}

/* 빈 상태 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  color: #cccccc;
  margin-bottom: 24px;
}

.dark-mode .empty-icon {
  color: #666666;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.dark-mode .empty-title {
  color: #ffffff;
}

.empty-subtitle {
  font-size: 16px;
  color: #666666;
  transition: color 0.3s ease;
}

.dark-mode .empty-subtitle {
  color: #cccccc;
}

/* 친구 요청 목록 */
.request-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 transparent;
}

.request-list::-webkit-scrollbar {
  width: 8px;
}

.request-list::-webkit-scrollbar-track {
  background: transparent;
}

.request-list::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 2px;
}

.request-list::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.dark-mode .request-item {
  background: #3d3d3d;
}

.request-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark-mode .request-item:hover {
  background: #4d4d4d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.request-info {
  flex: 1;
}

.request-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.dark-mode .request-name {
  color: #ffffff;
}

.request-message {
  font-size: 14px;
  color: #666666;
  margin: 4px 0;
  transition: color 0.3s ease;
}

.dark-mode .request-message {
  color: #cccccc;
}

.request-time {
  font-size: 12px;
  color: #999999;
  transition: color 0.3s ease;
}

.dark-mode .request-time {
  color: #888888;
}

.request-actions {
  display: flex;
  gap: 8px;
}

/* 검색 컨테이너 */
.search-container {
  position: relative;
  width: 300px;
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
  color: rgba(0, 0, 0, 0.6);
  font-size: 20px;
}

.dark-mode .search-icon {
  color: rgba(255, 255, 255, 0.6);
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 8px 16px 8px 48px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  background: #ffffff;
  color: #1a1a1a;
  font-size: 14px;
  transition: all 0.3s ease;
}

.dark-mode .search-input {
  background: #1a1a1a;
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

.search-input:focus {
  border-color: #1976d2;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
  outline: none;
}

.dark-mode .search-input:focus {
  background: #1a1a1a;
}

.search-input::placeholder {
  color: rgba(0, 0, 0, 0.6);
}

.dark-mode .search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

/* 모달 스타일 */
.add-friend-modal {
  border-radius: 36px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, #1976d2 0%, rgba(25, 118, 210, 0.8) 100%);
  color: white;
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon .v-icon {
  font-size: 24px;
  color: white;
}

.modal-title-section {
  flex: 1;
}

.modal-title {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 700;
  color: white;
}

.modal-subtitle {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.close-btn {
  color: white !important;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.modal-content {
  padding: 32px;
  background: #ffffff;
}

.dark-mode .modal-content {
  background: #1a1a1a;
}

.modal-search-section {
  margin-bottom: 24px;
}

.modal-search-section .search-container {
  width: 100%;
}

.modal-search-section .search-input {
  background: #ffffff;
}

.dark-mode .modal-search-section .search-input {
  background: #2d2d2d;
}

/* 검색 결과 */
.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.dark-mode .results-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.results-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.dark-mode .results-title {
  color: #ffffff;
}

.results-count {
  font-size: 14px;
  color: #1976d2;
  font-weight: 600;
  background: rgba(25, 118, 210, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.dark-mode .result-item {
  background: #2d2d2d;
  border-color: rgba(255, 255, 255, 0.1);
}

.result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #1976d2;
}

.dark-mode .result-item:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.result-avatar {
  position: relative;
}

.result-info {
  flex: 1;
}

.result-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.dark-mode .result-name {
  color: #ffffff;
}

.result-userid {
  font-size: 13px;
  color: #1976d2;
  font-weight: 600;
}

.request-btn {
  border-radius: 20px;
  text-transform: none;
  font-weight: 600;
  padding: 8px 20px;
}

/* 빈 상태 */
.initial-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.initial-icon {
  width: 80px;
  height: 80px;
  background: rgba(25, 118, 210, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.initial-icon .v-icon {
  font-size: 40px;
  color: #1976d2;
}

.initial-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.dark-mode .initial-title {
  color: #ffffff;
}

.initial-subtitle {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
  max-width: 300px;
  line-height: 1.5;
}

.dark-mode .initial-subtitle {
  color: rgba(255, 255, 255, 0.6);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .personal-friends {
    padding: 20px;
    height: calc(100vh - 56px);
  }
  
  .friends-list,
  .request-list {
    min-height: 200px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
  }
  
  .stats-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .main-content {
    padding: 20px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .friend-item,
  .request-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .friend-actions,
  .request-actions {
    align-self: flex-end;
  }
}
</style>
