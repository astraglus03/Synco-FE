<template>
  <div class="meeting-view">
    <!-- 미팅 헤더 -->
    <div class="meeting-header">
      <div class="call-info">
        <h3 class="call-title">{{ meetingData?.title || '회의' }}</h3>
        <p class="call-duration">{{ callDuration }}</p>
      </div>
      <div class="call-controls">
        <v-btn
          icon="mdi-microphone"
          :color="isMuted ? 'error' : 'success'"
          @click="toggleMute"
        />
        <v-btn
          icon="mdi-video"
          :color="isVideoOn ? 'success' : 'error'"
          @click="toggleVideo"
        />
        <v-btn
          icon="mdi-monitor"
          :color="isScreenSharing ? 'primary' : 'white'"
          :class="{ 'screen-share-btn': !isScreenSharing }"
          @click="toggleScreenShare"
        />
        <v-btn
          icon="mdi-phone-hangup"
          color="error"
          @click="endCall"
        />
      </div>
    </div>

    <!-- 메인 컨테이너 -->
    <div class="main-container">
      <!-- 비디오 영역 -->
      <div class="video-container" :class="{ 'full-width': !showChat }">
        <!-- 모든 참여자들 비디오 (내 비디오가 첫 번째) -->
        <div class="participants-video">
          <!-- 내 비디오 (첫 번째 위치) -->
          <div class="participant-video my-video">
            <video
              ref="myVideoRef"
              autoplay
              muted
              playsinline
              class="video-element"
            />
            <div class="video-label">나</div>
          </div>
          
          <!-- 다른 참여자들 비디오 -->
          <div
            v-for="participant in participants"
            :key="participant.id"
            class="participant-video"
          >
            <video
              :ref="`participantVideo_${participant.id}`"
              autoplay
              playsinline
              class="video-element"
            />
            <div class="video-label">{{ participant.name }}</div>
          </div>
        </div>
      </div>

      <!-- 채팅 토글 버튼 -->
      <div class="chat-toggle-container">
        <v-btn
          :icon="showChat ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          variant="text"
          size="small"
          class="chat-toggle-btn"
          @click="toggleChat"
        />
      </div>

      <!-- 채팅 영역 -->
      <div class="chat-sidebar" :class="{ 'chat-hidden': !showChat }">
        <div class="chat-header">
          <h4>채팅</h4>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="toggleChat"
          />
        </div>
        <div class="chat-messages" ref="chatMessagesRef">
          <div
            v-for="message in chatMessages"
            :key="message.id"
            class="chat-message"
          >
            <div class="message-avatar">
              {{ message.sender.charAt(0) }}
            </div>
            <div class="message-content">
              <div class="message-sender">{{ message.sender }}</div>
              <div class="message-text">{{ message.text }}</div>
              <div class="message-time">{{ message.time }}</div>
            </div>
          </div>
        </div>
        <div class="chat-input">
          <v-text-field
            v-model="newMessage"
            placeholder="메시지를 입력하세요..."
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="sendMessage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMeetingStore } from '@/store/meetingStore'

// Props
const props = defineProps({
  id: String
})

// Store
const meetingStore = useMeetingStore()

// 반응형 데이터
const isMuted = ref(false)
const isVideoOn = ref(true)
const isScreenSharing = ref(false)
const callStartTime = ref(null)
const callDuration = ref('00:00')
const participants = ref([])
const chatMessages = ref([])
const newMessage = ref('')
const showChat = ref(true)

// 비디오 참조
const myVideoRef = ref(null)
const chatMessagesRef = ref(null)

// 타이머
const callTimer = ref(null)

// 미팅 데이터
const meetingData = computed(() => {
  // Store에서 미팅 데이터를 가져오거나, URL 파라미터로부터 생성
  const storeData = meetingStore.getCurrentMeetingData
  if (storeData) {
    return storeData
  }
  
  // URL 파라미터로부터 기본 미팅 데이터 생성 - 더 많은 참여자 추가
  const participantsList = [
    { id: 'me', name: '나', avatar: '나', status: 'online', isHost: true },
    { id: 'kim_minsu', name: '김민수', avatar: '김', status: 'online', isHost: false },
    { id: 'lee_jihyun', name: '이지현', avatar: '이', status: 'online', isHost: false },
    { id: 'park_junyoung', name: '박준영', avatar: '박', status: 'away', isHost: false },
    { id: 'choi_sujin', name: '최수진', avatar: '최', status: 'online', isHost: false },
    { id: 'jung_hyunwoo', name: '정현우', avatar: '정', status: 'online', isHost: false }
  ]
  
  return {
    id: props.id || 'unknown',
    title: `미팅 ${props.id || 'Unknown'}`,
    date: new Date().toLocaleDateString('ko-KR'),
    duration: '진행 중',
    participants: participantsList.length,
    participantsList: participantsList,
    summary: '',
    isActive: true
  }
})

// 메서드
const startCall = async () => {
  try {
    // 카메라와 마이크 권한 요청
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    
    if (myVideoRef.value) {
      myVideoRef.value.srcObject = stream
    }
    
    // 미팅 데이터에서 참여자 목록 가져오기 (나를 제외한 다른 참여자들)
    const currentMeetingData = meetingData.value
    if (currentMeetingData && currentMeetingData.participantsList) {
      participants.value = currentMeetingData.participantsList.filter(p => p.id !== 'me').map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        status: p.status
      }))
    } else {
      // 기본 참여자 (나를 제외한 다른 참여자들)
      participants.value = [
        { id: 'kim_minsu', name: '김민수', avatar: '김', status: 'online' },
        { id: 'lee_jihyun', name: '이지현', avatar: '이', status: 'online' },
        { id: 'park_junyoung', name: '박준영', avatar: '박', status: 'away' },
        { id: 'choi_sujin', name: '최수진', avatar: '최', status: 'online' },
        { id: 'jung_hyunwoo', name: '정현우', avatar: '정', status: 'online' }
      ]
    }
    
    // 타이머 시작
    callStartTime.value = new Date()
    startCallTimer()
    
    // 다른 참여자들의 더미 비디오 스트림 생성
    setTimeout(() => {
      participants.value.forEach((participant, index) => {
        setTimeout(() => {
          const participantVideoRef = document.querySelector(`[ref="participantVideo_${participant.id}"]`)
          if (participantVideoRef) {
            // 더미 비디오 스트림 생성 (실제로는 WebRTC로 연결되어야 함)
            const canvas = document.createElement('canvas')
            canvas.width = 640
            canvas.height = 480
            const ctx = canvas.getContext('2d')
            
            // 참여자 이름을 캔버스에 그리기
            ctx.fillStyle = '#333'
            ctx.fillRect(0, 0, 640, 480)
            ctx.fillStyle = '#fff'
            ctx.font = '24px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(participant.name, 320, 240)
            
            // 캔버스를 스트림으로 변환
            const dummyStream = canvas.captureStream(30)
            participantVideoRef.srcObject = dummyStream
          }
        }, index * 500) // 각 참여자마다 0.5초씩 지연
      })
    }, 1000) // 1초 후에 더미 비디오 생성
    
  } catch (error) {
    console.error('카메라/마이크 접근 실패:', error)
    alert('카메라와 마이크에 접근할 수 없습니다.')
  }
}

const endCall = () => {
  // Store에서 미팅 종료
  meetingStore.endMeeting()
  
  // 비디오 스트림 정리
  if (myVideoRef.value && myVideoRef.value.srcObject) {
    const tracks = myVideoRef.value.srcObject.getTracks()
    tracks.forEach(track => track.stop())
    myVideoRef.value.srcObject = null
  }
  
  // 타이머 정리
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
  
  // 창 닫기
  window.close()
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
}

const toggleVideo = () => {
  isVideoOn.value = !isVideoOn.value
}

const toggleScreenShare = () => {
  isScreenSharing.value = !isScreenSharing.value
}

const toggleChat = () => {
  showChat.value = !showChat.value
}

const sendMessage = () => {
  if (!newMessage.value.trim()) return
  
  const message = {
    id: Date.now(),
    sender: '나',
    text: newMessage.value.trim(),
    time: new Date().toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  chatMessages.value.push(message)
  newMessage.value = ''
  
  // 채팅 스크롤을 맨 아래로
  setTimeout(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
    }
  }, 100)
}

const startCallTimer = () => {
  callTimer.value = setInterval(() => {
    if (callStartTime.value) {
      const now = new Date()
      const diff = now - callStartTime.value
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      callDuration.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }, 1000)
}

// 생명주기
onMounted(() => {
  startCall()
})

onUnmounted(() => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
  }
})
</script>

<style scoped>
.meeting-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: white;
}

/* 미팅 헤더 */
.meeting-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  height: 70px;
  box-sizing: border-box;
}

.call-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.call-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.call-duration {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.call-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 메인 컨테이너 */
.main-container {
  flex: 1;
  display: flex;
  background: #000;
  margin-top: 70px;
  height: calc(100vh - 70px);
  position: relative;
}

.video-container {
  display: flex;
  position: relative;
  background: #000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 75%;
  height: 100%;
}

.video-container.full-width {
  width: 100%;
}

.my-video {
  /* 내 비디오는 이제 그리드의 첫 번째 아이템으로 배치됨 */
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.participants-video {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding: 20px;
  align-items: start;
  justify-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  max-height: 100%;
}

.participant-video {
  position: relative;
  width: 100%;
  max-width: 300px;
  min-width: 200px;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: #333;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* 채팅 토글 버튼 */
.chat-toggle-container {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 25;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px 0 0 8px;
  padding: 8px 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-toggle-btn {
  color: white !important;
  background: rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s ease;
}

.chat-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.chat-sidebar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 25%;
  min-width: 300px;
  max-width: 400px;
  background: rgba(0, 0, 0, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transform: translateX(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.chat-sidebar.chat-hidden {
  transform: translateX(100%);
  width: 0;
  min-width: 0;
  max-width: 0;
}

/* 화면 공유 버튼 스타일 */
.screen-share-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  color: rgba(255, 255, 255, 0.8) !important;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
}

.message-sender {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

.message-text {
  font-size: 14px;
  color: white;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.chat-input {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
    margin-top: 60px;
    height: calc(100vh - 60px);
  }
  
  .video-container {
    flex: 1;
    min-height: 75vh;
    width: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .video-container.full-width {
    flex: 1;
    width: 100%;
  }
  
  .meeting-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    padding: 12px 16px;
  }
  
  .my-video {
    /* 모바일에서도 그리드 아이템으로 유지 */
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  
  .chat-sidebar {
    position: relative;
    width: 100%;
    height: 25vh;
    transform: translateY(0);
  }
  
  .chat-sidebar.chat-hidden {
    transform: translateY(100%);
  }
  
  .chat-toggle-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    top: auto;
    transform: none;
  }
}
</style>
