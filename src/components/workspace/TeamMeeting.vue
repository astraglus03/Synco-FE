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
      
      <div class="meeting-timeline" @scroll="handleScroll">
        <!-- 활성 회의 목록 -->
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
    </div>

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
const newRoomName = ref('')
const newRoomDescription = ref('')
const selectedMembers = ref([])
const showError = ref(false)

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
      await meetingStore.loadActiveRooms(currentWorkSpaceSeq.value)
      console.log(currentWorkSpaceSeq.value, '회의 목록 새로고침 완료')

      console.log('활성 회의 목록:', activeRooms.value)
    }
  } catch (error) {
    console.error('회의 목록 새로고침 실패:', error)
  }
}

const joinFirstActiveRoom = async () => {
  if (activeRooms.value.length > 0) {
    await joinRoom(activeRooms.value[0])
  }
}

const joinRoom = async (room) => {
  try {
    await meetingStore.joinRoom(room.roomId)
  } catch (error) {
    console.error('회의 참여 실패:', error)
  }
}

const cancelRoom = async (room) => {
  if (confirm('회의를 취소하시겠습니까?')) {
    try {
      await meetingStore.cancelRoom(room.roomId)
      await refreshMeetings()
    } catch (error) {
      console.error('회의 취소 실패:', error)
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
    console.error('회의 생성 실패:', error)
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
      console.error('워크스페이스 seq가 없습니다. 현재 워크스페이스:', workspaceStore.currentWorkspaceInfo)
      return
    }
    
    console.log('초기화 시작 - 워크스페이스 seq:', currentWorkSpaceSeq.value)
    
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
    
    // 채널이 있으면 첫 번째 채널 선택하고 활성 회의 목록 로드
    if (meetingStore.channels.length > 0) {
      const defaultChannel = meetingStore.channels[0]
      meetingStore.selectChannel(defaultChannel)
      
      // 활성 회의 목록 로드
      await meetingStore.loadActiveRooms(currentWorkSpaceSeq.value)
    }
  } catch (error) {
    console.error('초기화 실패:', error)
  }
}

// 워크스페이스 변경 감지
watch(() => workspaceStore.currentWorkspaceInfo, async (newWorkspace, oldWorkspace) => {
  if (newWorkspace && newWorkspace.workSpaceSeq) {
    // 워크스페이스가 실제로 변경된 경우에만 초기화
    if (!oldWorkspace || oldWorkspace.workSpaceSeq !== newWorkspace.workSpaceSeq) {
      console.log('워크스페이스 변경 감지:', newWorkspace)
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
  padding: 40px 24px 80px 24px;
  overflow-y: auto;
  background: rgba(var(--v-theme-on-surface), 0.02);
  margin-top: 24px;
  border-radius: 16px 16px 0 0;
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
