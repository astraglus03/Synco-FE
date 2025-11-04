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


    <!-- 탭 네비게이션 (3개) -->
    <div class="tab-navigation">
      <button
        class="tab-button"
        :class="{ 'active': activeTab === 'friendList' }"
        @click="changeTab('friendList')"
      >
        친구 목록
        <span class="tab-count">{{ totalFriends }}</span>
      </button>
      <button
        class="tab-button"
        :class="{ 'active': activeTab === 'receivedRequests' }"
        @click="changeTab('receivedRequests')"
      >
        받은 요청
        <span class="tab-count">{{ pendingReceived }}</span>
      </button>
      <button
        class="tab-button"
        :class="{ 'active': activeTab === 'sentRequests' }"
        @click="changeTab('sentRequests')"
      >
        보낸 요청
        <span class="tab-count">{{ pendingSent }}</span>
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
              <div class="status-badge-wrapper">
                <FriendStatusBadge 
                  :friend-name="friend.name"
                  :current-status="friend.activeStatus"
                  :tooltip="true"
                  class="friend-status-badge"
                />
              </div>
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
                @click="startChatWithFriend(friend)"
                title="1:1 채팅 시작"
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
    <v-dialog v-model="showAddFriendModal" max-width="600px" @click:outside="closeModal" class="no-scroll-dialog">
      <v-card class="add-friend-modal fixed-modal">
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
          
          <!-- 콘텐츠 영역 (고정 높이) -->
          <div class="modal-content-area">
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
                  :class="getSearchResultStatus(user)"
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
                    <!-- 상태 배지 -->
                    <div v-if="getSearchResultStatus(user) !== 'none'" class="status-badge">
                      <v-icon v-if="getSearchResultStatus(user) === 'sent'" size="16">mdi-clock-outline</v-icon>
                      <v-icon v-else-if="getSearchResultStatus(user) === 'received'" size="16">mdi-arrow-down</v-icon>
                    </div>
                  </div>
                  <div class="result-info">
                    <div class="result-name">{{ user.name }}</div>
                    <div class="result-userid">@{{ user.memberId }}</div>
                    <div v-if="getSearchResultStatus(user) !== 'none'" class="result-status">
                      <span v-if="getSearchResultStatus(user) === 'sent'">요청 대기 중</span>
                      <span v-else-if="getSearchResultStatus(user) === 'received'">나에게 요청함</span>
                    </div>
                  </div>
                  <div class="result-actions">
                    <v-btn
                      v-if="getSearchResultStatus(user) === 'none'"
                      color="primary"
                      size="small"
                      class="request-btn"
                      @click="sendFriendRequest(user.memberId)"
                    >
                      <v-icon left>mdi-account-plus</v-icon>
                      요청 보내기
                    </v-btn>
                    <v-btn
                      v-else-if="getSearchResultStatus(user) === 'received'"
                      color="success"
                      size="small"
                      class="accept-btn"
                      @click="acceptFriendRequestFromSearch(user)"
                    >
                      <v-icon left>mdi-check</v-icon>
                      수락
                    </v-btn>
                    <v-btn
                      v-else
                      disabled
                      size="small"
                      class="disabled-btn"
                    >
                      대기 중
                    </v-btn>
                  </div>
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
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/store/workspaceStore'
import * as friendApi from '@/api/friend/friend'
import { createIndividualChatChannel } from '@/api/chat/chatApi'
import { emitter } from '@/eventBus' // 이벤트 버스
import FriendStatusBadge from '@/components/common/FriendStatusBadge.vue'

const props = defineProps({
  currentChannel: String
})

const theme = useTheme()
const router = useRouter()
const workspaceStore = useWorkspaceStore()

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

// 친구 요청 중인 memberId 추적 (중복 요청 방지)
const sendingFriendRequests = ref(new Set())

// 친구 요청 보내기
const sendFriendRequest = async (memberId) => {
  // 중복 요청 방지
  if (sendingFriendRequests.value.has(memberId)) {
    console.log('[PersonalFriends] 이미 요청 중인 memberId:', memberId)
    return
  }
  
  try {
    sendingFriendRequests.value.add(memberId)
    await friendApi.sendFriendRequest(memberId)
    
    // 검색 결과에서 해당 사용자의 상태를 'sent'로 변경
    const user = modalSearchResults.value.find(u => u.memberId === memberId)
    if (user) {
      user.requestStatus = 'sent'
    }
    
    // 보낸 요청 목록 새로고침
    await loadSentRequests()
    
    alert('친구 요청을 보냈습니다.')
  } catch (error) {
    console.error('친구 요청 실패:', error)
    alert('친구 요청에 실패했습니다.')
  } finally {
    sendingFriendRequests.value.delete(memberId)
  }
}

// 친구 요청 수락 중인 friendSeq 추적 (중복 요청 방지)
const acceptingFriendRequests = ref(new Set())

// 검색 결과에서 친구 요청 수락
const acceptFriendRequestFromSearch = async (user) => {
  const request = receivedRequests.value.find(r => r.requesterId === user.memberId)
  if (!request) {
    alert('요청을 찾을 수 없습니다.')
    return
  }
  
  const friendSeq = request.friendSeq
  
  // 중복 요청 방지
  if (acceptingFriendRequests.value.has(friendSeq)) {
    console.log('[PersonalFriends] 이미 수락 처리 중인 friendSeq:', friendSeq)
    return
  }
  
  try {
    acceptingFriendRequests.value.add(friendSeq)
    await friendApi.acceptFriendRequest(friendSeq)
    
    // 받은 요청에서 제거
    receivedRequests.value = receivedRequests.value.filter(r => r.friendSeq !== friendSeq)
    
    // 검색 결과에서 제거
    modalSearchResults.value = modalSearchResults.value.filter(u => u.memberSeq !== user.memberSeq)
    
    // 친구 목록 새로고침
    await loadFriendList()
    
    alert('친구 요청을 수락했습니다.')
  } catch (error) {
    console.error('친구 요청 수락 실패:', error)
    alert('친구 요청 수락에 실패했습니다.')
  } finally {
    acceptingFriendRequests.value.delete(friendSeq)
  }
}

// 친구 요청 수락
const acceptFriendRequest = async (friendSeq) => {
  // 중복 요청 방지
  if (acceptingFriendRequests.value.has(friendSeq)) {
    console.log('[PersonalFriends] 이미 수락 처리 중인 friendSeq:', friendSeq)
    return
  }
  
  try {
    console.log('🔍 [PersonalFriends] acceptFriendRequest 호출됨')
    console.log('🔍 [PersonalFriends] friendSeq 값:', friendSeq)
    console.log('🔍 [PersonalFriends] friendSeq 타입:', typeof friendSeq)
    console.log('🔍 [PersonalFriends] receivedRequests:', receivedRequests.value)
    
    acceptingFriendRequests.value.add(friendSeq)
    await friendApi.acceptFriendRequest(friendSeq)
    
    // 받은 요청에서 제거
    receivedRequests.value = receivedRequests.value.filter(r => r.friendSeq !== friendSeq)
    
    // 친구 목록 새로고침
    await loadFriendList()
    
    alert('친구 요청을 수락했습니다.')
  } catch (error) {
    console.error('친구 요청 수락 실패:', error)
    alert('친구 요청 수락에 실패했습니다.')
  } finally {
    acceptingFriendRequests.value.delete(friendSeq)
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

// 검색 결과 상태 확인 함수 - 백엔드에서 받은 requestStatus 사용
const getSearchResultStatus = (user) => {
  return user.requestStatus || 'none'
}

// 상태 라벨 (백엔드 ActiveStatus enum 매핑)
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

// 1:1 채팅 시작 함수 (친구 목록의 메시지 버튼 클릭 시)
const startChatWithFriend = async (friend) => {
  try {
    console.log('🚀 1:1 채팅 시작:', friend.name, friend.memberSeq)
    
    // 현재 워크스페이스 정보 가져오기 (개인 워크스페이스)
    const currentWorkspace = workspaceStore.currentWorkspaceInfo
    if (!currentWorkspace || !currentWorkspace.workSpaceSeq) {
      alert('워크스페이스 정보를 찾을 수 없습니다.')
      return
    }

    const workSpaceSeq = currentWorkspace.workSpaceSeq
    const otherMemberSeq = friend.memberSeq

    console.log('📤 1:1 채팅 생성 요청:', { workSpaceSeq, otherMemberSeq })

    // 1:1 채팅 채널 생성 또는 기존 채널 반환
    const channelSeq = await createIndividualChatChannel(
      workSpaceSeq,
      otherMemberSeq
    )

    console.log('✅ 1:1 채팅 채널 생성 완료, channelSeq:', channelSeq)

    // WorkspaceSidebar에 1:1 채팅 목록 새로고침 요청
    emitter.emit('refresh-direct-messages')

    // 채팅 화면으로 이동
    // 1. 메인 채널을 'chat'으로 설정
    workspaceStore.selectChannel('chat')
    
    // 2. 하위 채널을 생성된 channelSeq로 설정
    workspaceStore.selectSubChannel('chat', channelSeq.toString())

    // 3. Chat.vue에 채널 변경 이벤트 전달
    emitter.emit('select-chat-channel', {
      parentId: 'chat',
      subChannelId: channelSeq.toString()
    })

    console.log('✅ 채팅 화면으로 이동 완료')

  } catch (error) {
    console.error('❌ 1:1 채팅 생성 실패:', error)
    alert('1:1 채팅 생성에 실패했습니다: ' + (error.message || error))
  }
}

// 멤버 상태 업데이트 이벤트 핸들러
const handleMemberStatusUpdate = ({ memberSeq, activeStatus }) => {
  console.log('[PersonalFriends] 👤 멤버 상태 업데이트 수신:', { memberSeq, activeStatus, 현재친구수: friends.value.length })
  
  if (!memberSeq || !activeStatus) {
    console.warn('[PersonalFriends] ⚠️ 잘못된 데이터:', { memberSeq, activeStatus })
    return
  }
  
  // 타입 정규화
  const targetMemberSeq = Number(memberSeq)
  const normalizedStatus = String(activeStatus).toUpperCase()
  
  // 친구 목록에서 해당 멤버 상태 업데이트
  const friendIndex = friends.value.findIndex(f => Number(f.memberSeq) === targetMemberSeq)
  if (friendIndex > -1) {
    const friend = friends.value[friendIndex]
    console.log('[PersonalFriends] 🔄 상태 변경:', friend.name, friend.activeStatus, '→', normalizedStatus)
    
    // 반응성을 위해 새 객체로 교체 (Vue 반응성 보장)
    friends.value = [
      ...friends.value.slice(0, friendIndex),
      {
        ...friends.value[friendIndex],
        activeStatus: normalizedStatus
      },
      ...friends.value.slice(friendIndex + 1)
    ]
    
    console.log('[PersonalFriends] ✅ 친구 상태 업데이트 완료:', friends.value[friendIndex].name, friends.value[friendIndex].activeStatus)
  } else {
    // 친구 목록에 없는 경우, 친구 목록이 비어있으면 나중에 로드되면 최신 상태가 반영됨
    console.log('[PersonalFriends] ℹ️ 해당 친구를 찾을 수 없음 (memberSeq:', targetMemberSeq, ', 현재 친구:', friends.value.map(f => ({ seq: f.memberSeq, name: f.name })), ')')
    // 친구 목록이 비어있고 친구 목록 탭이 활성화되어 있으면 다시 로드 시도
    if (friends.value.length === 0 && activeTab.value === 'friendList') {
      console.log('[PersonalFriends] 🔄 친구 목록이 비어있어 다시 로드 시도')
      loadFriendList()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // 멤버 상태 업데이트 이벤트 리스너 등록 (친구 목록 로드 전에 등록)
  emitter.on('member-status-updated', handleMemberStatusUpdate)
  // 초기 데이터 로드
  loadFriendList()
  loadReceivedRequests()
  loadSentRequests()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // 멤버 상태 업데이트 이벤트 리스너 제거
  emitter.off('member-status-updated', handleMemberStatusUpdate)
  
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

/* 탭 카운트 스타일 */
.tab-count {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.dark-mode .tab-count {
  color: rgba(255, 255, 255, 0.6);
}

.tab-button:hover .tab-count {
  background: rgba(255, 255, 255, 0.3);
  color: #1976d2;
}

.dark-mode .tab-button:hover .tab-count {
  color: #64b5f6;
}

.tab-button.active .tab-count {
  background: rgba(255, 255, 255, 0.3);
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

.status-badge-wrapper {
  position: absolute;
  bottom: -2px;
  right: -2px;
  z-index: 1;
}

.friend-status-badge {
  display: inline-block;
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

/* 고정 크기 모달 */
.fixed-modal {
  width: 600px !important;
  height: 600px !important;
  min-height: 600px !important;
  max-height: 600px !important;
}

/* v-dialog 스크롤바 숨김 */
.fixed-modal::-webkit-scrollbar {
  display: none;
}

.fixed-modal {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* v-dialog 전체 스크롤바 숨김 */
.no-scroll-dialog .v-overlay__content::-webkit-scrollbar {
  display: none;
}

.no-scroll-dialog .v-overlay__content {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
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
  padding: 32px 32px 0 32px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

/* 모달 콘텐츠 영역 */
.modal-content-area {
  flex: 1;
  min-height: 370px;
  max-height: 370px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 transparent;
  margin-bottom: 32px;
}

.modal-content-area::-webkit-scrollbar {
  width: 8px;
}

.modal-content-area::-webkit-scrollbar-track {
  background: transparent;
}

.modal-content-area::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 4px;
}

.modal-content-area::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.dark-mode .modal-content-area::-webkit-scrollbar-thumb {
  background: #555555;
}

.dark-mode .modal-content-area::-webkit-scrollbar-thumb:hover {
  background: #777777;
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
  flex: 1;
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

/* 상태별 스타일 */
.result-item.sent {
  background: #fff3e0;
  border-color: #ff9800;
}

.dark-mode .result-item.sent {
  background: #4a3d2d;
  border-color: #ff9800;
}

.result-item.received {
  background: #e3f2fd;
  border-color: #2196f3;
}

.dark-mode .result-item.received {
  background: #2d3a4a;
  border-color: #2196f3;
}

.result-avatar {
  position: relative;
}

/* 상태 배지 */
.status-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  background: #1976d2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  z-index: 1;
}

.status-badge .v-icon {
  color: white;
  font-size: 12px;
}

.result-item.sent .status-badge {
  background: #ff9800;
}

.result-item.received .status-badge {
  background: #2196f3;
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

/* 상태 텍스트 */
.result-status {
  font-size: 12px;
  color: #666666;
  margin-top: 4px;
  font-weight: 500;
}

.dark-mode .result-status {
  color: #cccccc;
}

.result-item.sent .result-status {
  color: #ff9800;
}

.result-item.received .result-status {
  color: #2196f3;
}

/* 액션 버튼들 */
.result-actions {
  display: flex;
  align-items: center;
}

.request-btn {
  border-radius: 20px;
  text-transform: none;
  font-weight: 600;
  padding: 8px 20px;
}

.accept-btn {
  border-radius: 20px;
  text-transform: none;
  font-weight: 600;
  padding: 8px 20px;
}

.disabled-btn {
  border-radius: 20px;
  text-transform: none;
  font-weight: 600;
  padding: 8px 20px;
  opacity: 0.6;
}

/* 빈 상태 */
.initial-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  flex: 1;
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
@media (max-width: 1024px) {
  .personal-friends {
    padding: 16px;
  }
  
  .page-title {
    font-size: 22px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .search-container {
    width: 100%;
    max-width: 100%;
  }
  
  .tab-button {
    font-size: 14px;
    padding: 10px 16px;
  }
}

@media (max-width: 768px) {
  .personal-friends {
    padding: 12px;
    height: calc(100vh - 56px);
  }
  
  .friends-header {
    margin-bottom: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .add-friend-btn {
    width: 100%;
    font-size: 14px;
    padding: 10px 20px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .page-subtitle {
    font-size: 13px;
  }
  
  .tab-navigation {
    gap: 0;
    padding: 3px;
  }
  
  .tab-button {
    font-size: 13px;
    padding: 8px 12px;
    gap: 4px;
    white-space: nowrap;
  }
  
  .tab-count {
    font-size: 11px;
    padding: 1px 6px;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .content-header {
    margin-bottom: 16px;
  }
  
  .content-title {
    font-size: 18px;
  }
  
  .content-subtitle {
    font-size: 14px;
  }
  
  .search-container {
    width: 100%;
  }
  
  .search-input {
    font-size: 13px;
    height: 36px;
    padding: 6px 12px 6px 40px;
  }
  
  .search-icon {
    left: 12px;
    font-size: 18px;
  }
  
  .friends-list,
  .request-list {
    gap: 12px;
  }
  
  .friend-item,
  .request-item {
    padding: 12px;
    gap: 12px;
  }
  
  .friend-name,
  .request-name {
    font-size: 14px;
  }
  
  .friend-status,
  .request-message {
    font-size: 12px;
  }
  
  .empty-state {
    padding: 40px 16px;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .empty-title {
    font-size: 16px;
  }
  
  .empty-subtitle {
    font-size: 13px;
  }
  
  /* 모달 반응형 */
  .fixed-modal {
    width: 95vw !important;
    height: 85vh !important;
    max-width: 500px !important;
    min-height: 500px !important;
    max-height: 85vh !important;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-icon {
    width: 40px;
    height: 40px;
  }
  
  .modal-icon .v-icon {
    font-size: 20px;
  }
  
  .modal-title {
    font-size: 18px;
  }
  
  .modal-subtitle {
    font-size: 13px;
  }
  
  .modal-content {
    padding: 20px 20px 0 20px;
  }
  
  .modal-content-area {
    margin-bottom: 20px;
  }
  
  .result-item {
    padding: 16px;
    gap: 12px;
  }
  
  .result-name {
    font-size: 15px;
  }
  
  .result-userid {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .personal-friends {
    padding: 10px;
  }
  
  .friends-header {
    margin-bottom: 12px;
  }
  
  .add-friend-btn {
    font-size: 13px;
    padding: 8px 16px;
  }
  
  .page-title {
    font-size: 18px;
  }
  
  .page-subtitle {
    font-size: 12px;
  }
  
  .tab-button {
    font-size: 12px;
    padding: 6px 8px;
    gap: 3px;
  }
  
  .tab-count {
    font-size: 10px;
    padding: 1px 5px;
  }
  
  .main-content {
    padding: 12px;
  }
  
  .content-title {
    font-size: 16px;
  }
  
  .content-subtitle {
    font-size: 13px;
  }
  
  .search-input {
    font-size: 12px;
    height: 32px;
    padding: 4px 10px 4px 36px;
  }
  
  .search-icon {
    left: 10px;
    font-size: 16px;
  }
  
  .friend-item,
  .request-item {
    padding: 10px;
    gap: 10px;
  }
  
  .friend-avatar .v-avatar,
  .request-item .v-avatar {
    width: 36px !important;
    height: 36px !important;
  }
  
  .friend-name,
  .request-name {
    font-size: 13px;
  }
  
  .friend-status,
  .request-message {
    font-size: 11px;
  }
  
  .friend-actions button,
  .request-actions button {
    padding: 4px 8px;
    font-size: 12px;
    min-width: auto;
  }
  
  .empty-state {
    padding: 30px 12px;
  }
  
  .empty-icon {
    font-size: 40px;
    margin-bottom: 12px;
  }
  
  .empty-title {
    font-size: 14px;
  }
  
  .empty-subtitle {
    font-size: 12px;
  }
  
  /* 모달 반응형 */
  .fixed-modal {
    width: 100vw !important;
    height: 90vh !important;
    max-width: 100vw !important;
    min-height: 400px !important;
    max-height: 90vh !important;
    border-radius: 16px 16px 0 0 !important;
  }
  
  .modal-header {
    padding: 12px 16px;
  }
  
  .modal-header-content {
    gap: 12px;
  }
  
  .modal-icon {
    width: 36px;
    height: 36px;
  }
  
  .modal-icon .v-icon {
    font-size: 18px;
  }
  
  .modal-title {
    font-size: 16px;
  }
  
  .modal-subtitle {
    font-size: 12px;
  }
  
  .modal-content {
    padding: 16px 16px 0 16px;
  }
  
  .modal-search-section {
    margin-bottom: 16px;
  }
  
  .modal-content-area {
    margin-bottom: 16px;
  }
  
  .results-title {
    font-size: 16px;
  }
  
  .results-count {
    font-size: 12px;
    padding: 2px 8px;
  }
  
  .result-item {
    padding: 12px;
    gap: 10px;
  }
  
  .result-avatar .v-avatar {
    width: 40px !important;
    height: 40px !important;
  }
  
  .result-name {
    font-size: 14px;
  }
  
  .result-userid {
    font-size: 11px;
  }
  
  .result-status {
    font-size: 11px;
  }
  
  .request-btn,
  .accept-btn,
  .disabled-btn {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .initial-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 16px;
  }
  
  .initial-icon .v-icon {
    font-size: 32px;
  }
  
  .initial-title {
    font-size: 16px;
  }
  
  .initial-subtitle {
    font-size: 13px;
  }
}

@media (max-width: 360px) {
  .personal-friends {
    padding: 8px;
  }
  
  .page-title {
    font-size: 16px;
  }
  
  .page-subtitle {
    font-size: 11px;
  }
  
  .tab-button {
    font-size: 11px;
    padding: 5px 6px;
  }
  
  .tab-count {
    font-size: 9px;
    padding: 1px 4px;
  }
  
  .main-content {
    padding: 10px;
  }
  
  .content-title {
    font-size: 15px;
  }
  
  .search-input {
    font-size: 11px;
    height: 30px;
  }
  
  .friend-name,
  .request-name {
    font-size: 12px;
  }
  
  .friend-status,
  .request-message {
    font-size: 10px;
  }
  
  .empty-title {
    font-size: 13px;
  }
  
  .empty-subtitle {
    font-size: 11px;
  }
  
  .modal-title {
    font-size: 15px;
  }
  
  .modal-subtitle {
    font-size: 11px;
  }
  
  .result-name {
    font-size: 13px;
  }
  
  .result-userid {
    font-size: 10px;
  }
}
</style>
