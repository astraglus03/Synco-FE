<template>
  <div class="team-meeting">
    <!-- 헤더 -->
    <div class="meeting-header">
      <div class="header-left">
        <h2 class="meeting-title">{{ currentChannelData?.channelName || '화상회의' }}</h2>
        <!-- 미팅 참여 상태 표시 -->
        <div v-if="isCurrentlyInMeeting" class="meeting-status-badge">
          <v-icon size="16" color="success">mdi-video</v-icon>
          <span>미팅 참여 중</span>
        </div>
      </div>
      <div class="header-right">
        <!-- 권한에 따른 버튼 표시 -->
        <v-btn
          v-if="canCreateMeeting"
          color="primary"
          prepend-icon="mdi-video-plus"
          :disabled="!meetingStore.canJoinRoom"
          :loading="meetingStore.isCreating"
          @click="showCreateRoomModal = true"
        >
          회의 시작하기
        </v-btn>
      </div>
    </div>

    <!-- 진행 중인 회의 섹션 -->
    <div v-if="activeRooms.length > 0" class="active-meeting-section">
      <div class="meeting-status-card">
        <div class="status-content">
          <v-icon class="status-icon" color="success">mdi-video</v-icon>
          <div class="status-info">
            <h3>진행 중인 회의가 있습니다</h3>
            <p>{{ activeRooms.length }}개의 회의가 진행 중</p>
          </div>
        </div>
        <div class="meeting-actions">
          <v-btn
            v-if="!isCurrentlyInMeeting"
            color="primary"
            prepend-icon="mdi-video"
            :loading="meetingStore.isJoining"
            @click="joinFirstActiveRoom"
          >
            참여하기
          </v-btn>
          <v-btn
            v-else
            color="success"
            prepend-icon="mdi-video"
            disabled
          >
            미팅 참여 중
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 회의 목록 섹션 -->
    <div class="meeting-list-section">
      <div class="section-header">
        <h3 class="section-title">회의 목록</h3>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          class="refresh-btn"
          :loading="meetingStore.isLoading"
          @click="refreshMeetings"
        />
      </div>
      
      <!-- 탭 스위치 -->
      <v-tabs
        v-model="activeTab"
        color="primary"
        class="mb-4"
        @update:model-value="onTabChange"
      >
        <v-tab value="active" prepend-icon="mdi-video">
          진행 중 ({{ meetingStore.activeRoomsPagination.totalElements }})
        </v-tab>
        <v-tab value="ended" prepend-icon="mdi-history">
          종료된 회의 ({{ meetingStore.endedRoomsPagination.totalElements }})
        </v-tab>
      </v-tabs>

      <!-- 탭 컨텐츠 -->
      <v-window v-model="activeTab">
        <!-- 진행 중인 회의 -->
        <v-window-item value="active">
          <div class="meeting-timeline" @scroll="handleScroll">
            <div
              v-for="room in activeRooms"
              :key="room.roomId"
              class="timeline-item active"
              @dblclick="joinRoom(room)"
            >
          <div class="timeline-dot">
            <v-icon color="success" size="16">mdi-video</v-icon>
          </div>
          
          <div class="timeline-content">
            <div class="meeting-header-info">
              <h4 class="meeting-title">{{ room.roomName }}</h4>
              <div class="meeting-actions">
                <v-btn
                  icon="mdi-video"
                  variant="text"
                  size="small"
                  class="action-btn"
                  :loading="meetingStore.isJoining"
                  @click.stop="joinRoom(room)"
                />
                <v-btn
                  v-if="workspaceMemberStore.canCreateChannel(authStore) && room.hostId === currentMemberSeq"
                  icon="mdi-close"
                  variant="text"
                  size="small"
                  class="action-btn"
                  @click.stop="cancelRoom(room)"
                />
              </div>
            </div>
            
            <div class="meeting-meta-grid">
              <div class="meta-item">
                <v-icon size="14" color="grey">mdi-account-group</v-icon>
                <span>{{ room.activeUserCount }}명 참여 중</span>
              </div>
              <div class="meta-item">
                <v-icon size="14" color="grey">mdi-clock-outline</v-icon>
                <span>진행 중</span>
              </div>
              <div class="meta-item">
                <v-icon size="14" color="grey">mdi-information</v-icon>
                <span>{{ room.formattedDescription }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 로딩 인디케이터 -->
        <div v-if="meetingStore.isLoading" class="loading-indicator">
          <v-progress-circular
            indeterminate
            color="primary"
            size="24"
          />
          <span>회의 목록을 불러오는 중...</span>
        </div>
        
        <!-- 회의가 없을 때 -->
        <div v-else-if="activeRooms.length === 0" class="no-meetings">
          <v-icon color="grey" size="48">mdi-video-off</v-icon>
          <h4>진행 중인 회의가 없습니다</h4>
          <p v-if="workspaceMemberStore.canCreateChannel(authStore)">회의를 시작해보세요!</p>
          <p v-else>회의가 시작되면 알림을 받을 수 있습니다.</p>
        </div>
          </div>
          
          <!-- 페이지네이션 -->
          <div v-if="meetingStore.activeRoomsPagination.totalPages > 1" class="pagination-wrapper">
            <v-pagination
              v-model="currentActivePage"
              :length="meetingStore.activeRoomsPagination.totalPages"
              :total-visible="7"
              color="primary"
              @update:model-value="onActivePageChange"
            />
          </div>
        </v-window-item>

        <!-- 종료된 회의 -->
        <v-window-item value="ended">
          <div class="meeting-timeline" @scroll="handleScroll">
            <div
              v-for="room in meetingStore.endedRooms"
              :key="room.roomId"
              class="timeline-item"
              @dblclick="openRoomDetail(room)"
            >
              <div class="timeline-dot">
                <div class="dot-inner"></div>
              </div>
              
              <div class="timeline-content">
                <div class="meeting-header-info">
                  <h4 class="meeting-title">{{ room.roomName }}</h4>
                  <div class="meeting-actions">
                    <v-btn
                      icon="mdi-eye-outline"
                      variant="text"
                      size="small"
                      class="action-btn"
                      @click.stop="openRoomDetail(room)"
                    />
                  </div>
                </div>
                
                <div class="meeting-meta-grid">
                  <div class="meta-item">
                    <v-icon size="14" color="grey">mdi-calendar</v-icon>
                    <span>{{ room.formattedCreatedAt }}</span>
                  </div>
                  <div class="meta-item">
                    <v-icon size="14" color="grey">mdi-account-group</v-icon>
                    <span>{{ room.activeUserCount }}명 참여</span>
                  </div>
                  <div class="meta-item">
                    <v-icon size="14" color="grey">mdi-information</v-icon>
                    <span>{{ room.formattedDescription }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 빈 상태 -->
            <div v-if="meetingStore.endedRooms.length === 0 && !meetingStore.isLoading" class="no-meetings">
              <v-icon color="grey" size="48">mdi-history</v-icon>
              <h4>종료된 회의가 없습니다</h4>
            </div>
          </div>
          
          <!-- 페이지네이션 -->
          <div v-if="meetingStore.endedRoomsPagination.totalPages > 1" class="pagination-wrapper">
            <v-pagination
              v-model="currentEndedPage"
              :length="meetingStore.endedRoomsPagination.totalPages"
              :total-visible="7"
              color="primary"
              @update:model-value="onEndedPageChange"
            />
          </div>
        </v-window-item>
      </v-window>

      <!-- 로딩 인디케이터 -->
      <div v-if="meetingStore.isLoading" class="loading-indicator">
        <v-progress-circular
          indeterminate
          color="primary"
          size="24"
        />
        <span>회의 목록을 불러오는 중...</span>
      </div>
    </div>

    <!-- 회의 상세 정보 모달 -->
    <v-dialog v-model="showRoomDetailModal" max-width="900">
      <v-card class="meeting-detail-modal">
        <div class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon">mdi-calendar-clock</v-icon>
            <h3 class="modal-title">{{ meetingStore.currentRoomDetail?.roomName }}</h3>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeRoomDetailModal"
          />
        </div>
        
        <div class="meeting-detail-content-new" v-if="meetingStore.currentRoomDetail">
          <!-- 회의 정보 -->
          <div class="meeting-info-section-new">
            <div class="section-header-new">
              <div class="blue-bar"></div>
              <h4 class="section-title-new">회의 정보</h4>
            </div>
            <div class="info-grid-new">
              <div class="info-item-new">
                <v-icon class="info-icon" color="primary">mdi-calendar</v-icon>
                <div class="info-content">
                  <div class="info-label">일정</div>
                  <div class="info-value">{{ meetingStore.currentRoomDetail.formattedCreatedAt }}</div>
                </div>
              </div>
              <div class="info-item-new">
                <v-icon class="info-icon" color="primary">mdi-clock</v-icon>
                <div class="info-content">
                  <div class="info-label">소요시간</div>
                  <div class="info-value">{{ meetingStore.currentRoomDetail.formattedDuration }}</div>
                </div>
              </div>
              <div class="info-item-new">
                <v-icon class="info-icon" color="primary">mdi-account-group</v-icon>
                <div class="info-content">
                  <div class="info-label">참여자</div>
                  <div class="info-value">{{ meetingStore.currentRoomDetail.participantCount }}명</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 참여자 목록 -->
          <div class="participants-section-new">
            <div class="section-header-new">
              <div class="blue-bar"></div>
              <h4 class="section-title-new">참여자 목록</h4>
            </div>
            <div class="participants-grid-new">
              <div
                v-for="participant in meetingStore.currentRoomDetail.participants"
                :key="participant.participantId"
                class="participant-card-new"
              >
                <v-avatar size="48" :color="getParticipantColor(participant)">
                  <v-img 
                    v-if="participant.participantProfileUrl" 
                    :src="participant.participantProfileUrl"
                    :alt="participant.participantName"
                  />
                  <span v-else class="text-white font-weight-bold text-h6">
                    {{ participant.avatar }}
                  </span>
                </v-avatar>
                <div class="participant-info-new">
                  <div class="participant-name-row">
                    <span class="participant-name">{{ participant.participantName }}</span>
                    <v-icon
                      v-if="participant.participantId === meetingStore.currentRoomDetail.hostId"
                      class="host-icon"
                      color="warning"
                      size="small"
                    >
                      mdi-crown
                    </v-icon>
                  </div>
                  <div class="participant-status">{{ participant.statusText || '오프라인' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 회의 요약 -->
          <div class="summary-section-new" v-if="meetingStore.currentRoomDetail.summaryContent">
            <div class="section-header-new">
              <div class="blue-bar"></div>
              <h4 class="section-title-new">회의 요약</h4>
            </div>
            <div class="summary-content-new">
              {{ meetingStore.currentRoomDetail.summaryContent }}
            </div>
          </div>

          <!-- 회의 음성 다운로드 -->
          <div class="download-section-new" v-if="meetingStore.currentRoomDetail.downloadUrl">
            <div class="section-header-new">
              <div class="blue-bar"></div>
              <h4 class="section-title-new">회의 음성</h4>
            </div>
            <div class="download-content-new">
              <v-btn
                color="primary"
                prepend-icon="mdi-download"
                @click="downloadMeetingRecording"
                variant="outlined"
                class="download-btn"
              >
                회의 음성 다운로드
              </v-btn>
            </div>
          </div>
        </div>
        
        <div class="modal-actions-new">
          <v-btn
            v-if="meetingStore.currentRoomDetail?.downloadUrl"
            color="primary"
            prepend-icon="mdi-download"
            @click="downloadMeetingRecording"
            class="download-action-btn"
          >
            음성 다운로드
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            class="close-btn"
            @click="closeRoomDetailModal"
          >
            닫기
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- 회의 생성 모달 -->
    <v-dialog v-model="showCreateRoomModal" max-width="500">
      <v-card class="create-room-modal">
        <div class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon">mdi-video-plus</v-icon>
            <h3 class="modal-title">새 회의 시작하기</h3>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeCreateRoomModal"
          />
        </div>
        
        <div class="modal-body">
          <div class="input-group">
            <label class="input-label">회의 제목 *</label>
            <v-text-field
              v-model="newRoomName"
              placeholder="회의 제목을 입력하세요"
              variant="outlined"
              density="compact"
              hide-details
              :rules="[v => !!v || '회의 제목은 필수입니다']"
            />
          </div>
          
          <div class="input-group">
            <label class="input-label">회의 설명</label>
            <v-textarea
              v-model="newRoomDescription"
              placeholder="회의 설명을 입력하세요 (선택사항)"
              variant="outlined"
              density="compact"
              hide-details
              rows="3"
            />
          </div>
          
          <div class="input-group">
            <label class="input-label">알림을 보낼 사람 선택</label>
            <div class="members-selection">
              <div
                v-for="member in workspaceMembers"
                :key="member.memberSeq"
                class="member-item"
                :class="{ 'selected': selectedMembers.includes(member.memberSeq) }"
                @click="toggleMemberSelection(member.memberSeq)"
              >
                <v-avatar size="32" :color="member.statusColor">
                  <v-img 
                    v-if="member.profileImageUrl" 
                    :src="member.profileImageUrl"
                    :alt="member.name"
                  />
                  <span v-else class="text-white font-weight-bold">
                    {{ member.name?.charAt(0) || '?' }}
                  </span>
                </v-avatar>
                <div class="member-info">
                  <div class="member-name">{{ member.name }}</div>
                  <div class="member-status">
                    <v-icon 
                      size="12" 
                      :color="member.activeStatus === 'ONLINE' ? 'success' : 
                             member.activeStatus === 'AWAY' ? 'warning' : 
                             member.activeStatus === 'BUSY' ? 'error' : 'grey'"
                    >
                      mdi-circle
                    </v-icon>
                    <span class="ml-1">
                      {{ member.activeStatus === 'ONLINE' ? '온라인' : 
                         member.activeStatus === 'AWAY' ? '자리비움' : 
                         member.activeStatus === 'BUSY' ? '바쁨' : '오프라인' }}
                    </span>
                  </div>
                </div>
                <v-icon 
                  v-if="selectedMembers.includes(member.memberSeq)"
                  class="check-icon"
                  color="primary"
                >
                  mdi-check-circle
                </v-icon>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <v-btn
            variant="text"
            @click="closeCreateRoomModal"
          >
            취소
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!newRoomName.trim()"
            :loading="meetingStore.isCreating"
            @click="confirmCreateRoom"
          >
            회의 시작하기
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- 에러 스낵바 -->
    <v-snackbar
      v-model="showError"
      color="error"
      timeout="5000"
      @update:model-value="meetingStore.clearError"
    >
      {{ meetingStore.error }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMeetingStore } from '@/store/meetingStore'
import { usePermissions } from '@/composables/usePermissions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useWorkspaceMemberStore } from '@/store/workspaceMemberStore'
import { useAuthStore } from '@/store/authStore'
import meetingApi from '@/api/meeting/meetingApi'

// Props
const props = defineProps({
  currentChannel: String,
  selectedChannel: String
})

// Store
const meetingStore = useMeetingStore()
const workspaceStore = useWorkspaceStore()
const workspaceMemberStore = useWorkspaceMemberStore()
const authStore = useAuthStore()

// 반응형 데이터
const showCreateRoomModal = ref(false)
const showRoomDetailModal = ref(false)
const newRoomName = ref('')
const newRoomDescription = ref('')
const selectedMembers = ref([])
const showError = ref(false)
const activeTab = ref('active') // 'active' or 'ended'
const currentActivePage = ref(1) // 1-based page number for active rooms
const currentEndedPage = ref(1) // 1-based page number for ended rooms

// 워크스페이스 멤버 목록 (현재 사용자 제외)
const workspaceMembers = computed(() => {
  return workspaceMemberStore.members.filter(member => 
    Number(member.memberSeq) !== Number(authStore.memberSeq)
  )
})

// 화상회의 생성 권한 확인 (화상회의 채널 멤버 권한 기반)
const canCreateMeeting = computed(() => {
  // 화상회의 채널이 있는지 확인
  if (!workspaceMemberStore.meetingChannels?.length) {
    return false
  }
  
  // 첫 번째 화상회의 채널의 멤버 목록에서 현재 사용자 찾기
  const firstMeetingChannel = workspaceMemberStore.meetingChannels[0]
  const channelMembers = firstMeetingChannel?.channelMemberList || []
  
  const currentUser = channelMembers.find(member => 
    Number(member.memberSeq) === Number(authStore.memberSeq)
  )
  
  // SUPER 또는 MANAGER 권한이 있으면 화상회의 생성 가능
  return currentUser?.authority === 'SUPER' || currentUser?.authority === 'MANAGER'
})

// 현재 사용자 정보
const currentMemberSeq = computed(() => authStore.memberSeq)
const currentAuthority = computed(() => authStore.authority)
const currentWorkSpaceSeq = computed(() => workspaceStore.currentWorkspaceInfo?.workSpaceSeq)

// 현재 채널 데이터
const currentChannelData = computed(() => {
  return meetingStore.currentChannel
})

// 활성 회의 목록
const activeRooms = computed(() => {
  return meetingStore.activeRoomsInCurrentChannel
})

// 페이지네이션 정보 동기화 (store의 0-based를 1-based로 변환)
watch(() => meetingStore.activeRoomsPagination.page, (newPage) => {
  if (newPage !== undefined) {
    currentActivePage.value = newPage + 1
  }
}, { immediate: true })

watch(() => meetingStore.endedRoomsPagination.page, (newPage) => {
  if (newPage !== undefined) {
    currentEndedPage.value = newPage + 1
  }
}, { immediate: true })

// 미팅 참여 상태
const isCurrentlyInMeeting = computed(() => {
  return meetingStore.isCurrentlyInMeeting
})

// 에러 표시
watch(() => meetingStore.error, (newError) => {
  showError.value = !!newError
})

// 메서드
const refreshMeetings = async () => {
  try {
    if (currentWorkSpaceSeq.value) {
      if (activeTab.value === 'active') {
        // 현재 페이지로 다시 로드
        await meetingStore.loadActiveRooms(
          currentWorkSpaceSeq.value,
          currentActivePage.value - 1, // 0-based page
          10
        )
      } else {
        // 현재 페이지로 다시 로드
        await meetingStore.loadEndedRooms(
          currentWorkSpaceSeq.value,
          currentEndedPage.value - 1, // 0-based page
          10
        )
      }
    }
  } catch (error) {
  }
}

// 탭 변경 핸들러
const onTabChange = async (tab) => {
  try {
    if (currentWorkSpaceSeq.value) {
      if (tab === 'ended' && meetingStore.endedRooms.length === 0) {
        await meetingStore.loadEndedRooms(currentWorkSpaceSeq.value, 0, 10)
        currentEndedPage.value = 1
      } else if (tab === 'active' && meetingStore.activeRooms.length === 0) {
        await meetingStore.loadActiveRooms(currentWorkSpaceSeq.value, 0, 10)
        currentActivePage.value = 1
      }
    }
  } catch (error) {
  }
}

// 활성 회의 페이지 변경 핸들러
const onActivePageChange = async (page) => {
  try {
    if (currentWorkSpaceSeq.value) {
      currentActivePage.value = page
      await meetingStore.loadActiveRooms(
        currentWorkSpaceSeq.value,
        page - 1, // 0-based page
        10
      )
      // 페이지 변경 시 스크롤 맨 위로
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } catch (error) {
  }
}

// 종료된 회의 페이지 변경 핸들러
const onEndedPageChange = async (page) => {
  try {
    if (currentWorkSpaceSeq.value) {
      currentEndedPage.value = page
      await meetingStore.loadEndedRooms(
        currentWorkSpaceSeq.value,
        page - 1, // 0-based page
        10
      )
      // 페이지 변경 시 스크롤 맨 위로
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } catch (error) {
  }
}

// 더블클릭으로 회의 상세 정보 열기
const openRoomDetail = async (room) => {
  try {
    await meetingStore.loadRoomDetail(room.roomId)
    showRoomDetailModal.value = true
  } catch (error) {
  }
}

const closeRoomDetailModal = () => {
  showRoomDetailModal.value = false
}

// 회의 음성 다운로드 (백엔드 API 통해 Blob 다운로드)
const downloadMeetingRecording = async () => {
  const roomId = meetingStore.currentRoomDetail?.roomId
  if (!roomId) {
    alert('다운로드할 회의 음성이 없습니다.')
    return
  }

  try {
    const res = await meetingApi.downloadRecording(authStore.memberSeq, roomId)
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${meetingStore.currentRoomDetail?.roomName || 'meeting'}_recording.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    alert('회의 음성 다운로드 중 오류가 발생했습니다.')
  }
}

// 참여자 색상 가져오기
const getParticipantColor = (participant) => {
  const statusColor = participant.statusColor
  const colorMap = {
    'success': 'success',
    'warning': 'warning',
    'grey': 'grey',
    'error': 'error'
  }
  return colorMap[statusColor] || 'primary'
}

const joinFirstActiveRoom = async () => {
  if (activeRooms.value.length > 0) {
    try {
      await joinRoom(activeRooms.value[0])
    } catch (error) {
      // 에러는 meetingStore에서 이미 설정되므로 스낵바만 표시
      if (meetingStore.error) {
        showError.value = true
      }
    }
  }
}

const joinRoom = async (room) => {
  try {
    await meetingStore.joinRoom(room.roomId)
  } catch (error) {
    // 에러는 meetingStore에서 이미 설정되므로 스낵바만 표시
    if (meetingStore.error) {
      showError.value = true
    }
  }
}

const cancelRoom = async (room) => {
  if (confirm('회의를 취소하시겠습니까?')) {
    try {
      await meetingStore.cancelRoom(room.roomId)
      await refreshMeetings()
    } catch (error) {
    }
  }
}

const closeCreateRoomModal = () => {
  showCreateRoomModal.value = false
  newRoomName.value = ''
  newRoomDescription.value = ''
  selectedMembers.value = []
}

const confirmCreateRoom = async () => {
  try {
    await meetingStore.createRoom(
      workspaceStore.currentWorkspaceInfo.workSpaceSeq,
      newRoomName.value,
      newRoomDescription.value,
      selectedMembers.value
    )
    closeCreateRoomModal()
    await refreshMeetings()
  } catch (error) {
    // 에러는 meetingStore에서 이미 설정되므로 스낵바만 표시
    if (meetingStore.error) {
      showError.value = true
    }
  }
}

const toggleMemberSelection = (memberSeq) => {
  const index = selectedMembers.value.indexOf(memberSeq)
  if (index > -1) {
    selectedMembers.value.splice(index, 1)
  } else {
    selectedMembers.value.push(memberSeq)
  }
}

const handleScroll = (event) => {
  // 스크롤 이벤트 처리 (필요시 페이지네이션 구현)
}

// 초기화
const initialize = async () => {
  try {
    // 워크스페이스 seq 확인
    if (!currentWorkSpaceSeq.value) {
      return
    }
    
    // 현재 사용자 정보 설정
    meetingStore.setCurrentUser(
      currentMemberSeq.value,
      currentAuthority.value,
      currentWorkSpaceSeq.value
    )
    
    // 이미 데이터가 로드되어 있는지 확인
    const needsMemberLoad = workspaceMemberStore.members.length === 0
    const needsChannelLoad = meetingStore.channels.length === 0
    
    // 필요한 경우에만 데이터 로드
    if (needsMemberLoad) {
      await workspaceMemberStore.loadWorkspaceMembers(currentWorkSpaceSeq.value)
    }
    
    if (needsChannelLoad) {
      await meetingStore.loadChannels(currentWorkSpaceSeq.value)
    }
    
    // 채널이 있으면 첫 번째 채널 선택하고 활성/종료된 회의 목록 로드
    if (meetingStore.channels.length > 0) {
      const defaultChannel = meetingStore.channels[0]
      meetingStore.selectChannel(defaultChannel)
      
      // 활성 회의 목록과 종료된 회의 목록 동시에 로드 (첫 페이지)
      await Promise.all([
        meetingStore.loadActiveRooms(currentWorkSpaceSeq.value, 0, 10),
        meetingStore.loadEndedRooms(currentWorkSpaceSeq.value, 0, 10)
      ])
      // 페이지 번호 초기화
      currentActivePage.value = 1
      currentEndedPage.value = 1
    }
  } catch (error) {
  }
}

// 워크스페이스 변경 감지
watch(() => workspaceStore.currentWorkspaceInfo, async (newWorkspace, oldWorkspace) => {
  if (newWorkspace && newWorkspace.workSpaceSeq) {
    // 워크스페이스가 실제로 변경된 경우에만 초기화
    if (!oldWorkspace || oldWorkspace.workSpaceSeq !== newWorkspace.workSpaceSeq) {
      await initialize()
    }
  }
}, { deep: true })

// 생명주기
onMounted(async () => {
  // 컴포넌트가 마운트될 때 초기화 수행
  if (currentWorkSpaceSeq.value) {
    await initialize()
  }
})

onUnmounted(() => {
  // 컴포넌트 언마운트 시 정리
})
</script>

<style scoped>
.team-meeting {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-background));
}

/* 헤더 */
.meeting-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meeting-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.meeting-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 8px;
  background: rgba(var(--v-theme-success), 0.1);
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-success));
  width: fit-content;
}

/* 활성 회의 섹션 */
.active-meeting-section {
  padding: 24px;
}

.meeting-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: rgba(var(--v-theme-success), 0.1);
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  border-radius: 12px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-icon {
  font-size: 32px;
}

.status-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-success));
}

.status-info p {
  margin: 0;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.meeting-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 회의 목록 섹션 */
.meeting-list-section {
  flex: 1;
  padding: 24px 24px 80px 24px; /* 상단 패딩 축소로 헤더와 자연스러운 연결 */
  overflow-y: auto;
  background: rgb(var(--v-theme-background)); /* 헤더와 구분되는 메인 배경 */
  margin-top: 0; /* 헤더와의 간격 제거 */
  border-radius: 0; /* 경계 라운딩 제거로 일체감 */
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1); /* 기존 헤더 경계 연속성 유지 */
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.5px;
}

.refresh-btn {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  color: rgb(var(--v-theme-primary));
  transform: rotate(180deg);
}

/* 타임라인 디자인 */
.meeting-timeline {
  position: relative;
  padding-left: 24px;
}

.meeting-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(0, 0, 0, 0.1);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-item:hover {
  transform: translateX(8px);
}

.timeline-item.active {
  transform: translateX(8px);
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 8px;
  width: 24px;
  height: 24px;
  background: rgb(var(--v-theme-surface));
  border: 3px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all 0.3s ease;
}

.timeline-item.active .timeline-dot {
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.2);
}

.timeline-content {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  padding: 20px 24px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.timeline-item:hover .timeline-content {
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.meeting-header-info {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.timeline-content .meeting-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.4;
  flex: 1;
  margin-right: 16px;
}

.meeting-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.timeline-item:hover .meeting-actions {
  opacity: 1;
}

.action-btn {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: all 0.2s ease;
}

.action-btn:hover {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.meeting-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-weight: 500;
}

.meta-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 모달 스타일 */
.create-room-modal {
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
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
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

/* 로딩 인디케이터 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 14px;
}

.no-meetings {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-align: center;
}

.no-meetings h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.no-meetings p {
  margin: 0;
  font-size: 14px;
}

.dot-inner {
  width: 8px;
  height: 8px;
  background: rgb(var(--v-theme-primary));
  border-radius: 50%;
}

/* 회의 상세 모달 스타일 */
.meeting-detail-modal {
  background: rgb(var(--v-theme-surface));
}

.meeting-detail-content {
  padding: 24px;
  max-height: 600px;
  overflow-y: auto;
}

.meeting-info-section {
  margin-bottom: 32px;
}

.participants-section {
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.info-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 20px;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  position: relative;
}

.participant-info {
  flex: 1;
}

.participant-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 2px;
}

.participant-status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.host-icon {
  margin-left: 8px;
}

/* 새 모달 스타일 */
.modal-header-new {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blue-bar {
  width: 4px;
  height: 24px;
  background: rgb(var(--v-theme-primary));
  border-radius: 2px;
}

.header-text {
  flex: 1;
}

.meeting-detail-content-new {
  padding: 32px 24px 24px 24px;
  max-height: 600px;
  overflow-y: auto;
}

.meeting-info-section-new,
.participants-section-new,
.summary-section-new,
.download-section-new {
  margin-bottom: 32px;
}

.section-header-new {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-title-new {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.info-grid-new {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.info-item-new {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.info-item-new .info-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 24px;
  margin-top: 2px;
}

.info-item-new .info-content {
  flex: 1;
}

.info-item-new .info-label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 4px;
}

.info-item-new .info-value {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.participants-grid-new {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.participant-card-new {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: all 0.2s ease;
}

.participant-card-new:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.participant-info-new {
  flex: 1;
}

.participant-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.participant-card-new .participant-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.participant-card-new .participant-status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.summary-content-new {
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 14px;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface));
  white-space: pre-wrap;
  min-height: 100px;
}

.download-content-new {
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.download-btn {
  width: 100%;
}

.modal-actions-new {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.download-action-btn {
  margin-right: 8px;
}

/* 페이지네이션 스타일 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
  margin-top: 16px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .meeting-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .meeting-status-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .meeting-actions {
    align-self: flex-end;
  }
}
</style>
