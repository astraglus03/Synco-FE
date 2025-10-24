<template>
  <div class="meeting-view">
    <!-- 미팅 헤더 -->
    <div class="meeting-header">
      <div class="call-info">
        <h3 class="call-title">{{ meetingData?.roomName || '회의' }}</h3>
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
        <!-- LiveKit Room 컴포넌트 -->
        <div ref="roomContainer" class="livekit-room">
          <!-- LiveKit Room이 여기에 렌더링됩니다 -->
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
              {{ message.name?.charAt(0) || '?' }}
            </div>
            <div class="message-content">
              <div class="message-sender">{{ message.name || '알 수 없음' }}</div>
              <div class="message-text">{{ message.content }}</div>
              <div class="message-time">{{ message.timeOnly }}</div>
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
import { useAuthStore } from '@/store/authStore'
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track } from 'livekit-client'

// Props
const props = defineProps({
  id: String
})

// Store
const meetingStore = useMeetingStore()
const authStore = useAuthStore()

// 반응형 데이터
const isMuted = ref(false)
const isVideoOn = ref(true)
const isScreenSharing = ref(false)
const callStartTime = ref(null)
const callDuration = ref('00:00')
const chatMessages = ref([])
const newMessage = ref('')
const showChat = ref(true)

// LiveKit 관련
const room = ref(null)
const roomContainer = ref(null)
const chatMessagesRef = ref(null)
const callTimer = ref(null)

// 미팅 데이터
const meetingData = computed(() => {
  // Store에서 미팅 데이터를 가져오거나, URL 파라미터로부터 생성
  const storeData = meetingStore.currentMeetingData
  if (storeData) {
    return storeData
  }
  
  // URL 파라미터로부터 기본 미팅 데이터 생성
  return {
    roomId: props.id || 'unknown',
    roomName: `미팅 ${props.id || 'Unknown'}`,
    isHost: false
  }
})

// LiveKit Room 초기화
const initializeLiveKitRoom = async () => {
  try {
    // LiveKit 토큰과 룸 이름 가져오기
    const token = meetingStore.livekitToken
    const roomName = meetingStore.livekitRoomName || meetingData.value.roomId.toString()
    
    if (!token || !roomName) {
      throw new Error('LiveKit 토큰 또는 룸 이름이 없습니다.')
    }

    // LiveKit Room 생성
    room.value = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        videoSimulcastLayers: [
          { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 200000 } },
          { resolution: { width: 1280, height: 720 }, encoding: { maxBitrate: 500000 } }
        ]
      }
    })

    // 이벤트 리스너 등록
    setupRoomEventListeners()

    // 룸 연결
    await room.value.connect(process.env.VUE_APP_LIVEKIT_URL || 'wss://your-livekit-server.com', token)
    
    // 로컬 미디어 트랙 활성화
    await room.value.localParticipant.enableCameraAndMicrophone()
    
    // 타이머 시작
    callStartTime.value = new Date()
    startCallTimer()
    
    console.log('LiveKit Room 연결 성공')
    
  } catch (error) {
    console.error('LiveKit Room 초기화 실패:', error)
    alert('화상회의 연결에 실패했습니다.')
  }
}

// 룸 이벤트 리스너 설정
const setupRoomEventListeners = () => {
  if (!room.value) return

  // 참여자 연결
  room.value.on(RoomEvent.ParticipantConnected, (participant) => {
    console.log('참여자 연결:', participant.identity)
    setupParticipantEvents(participant)
  })

  // 참여자 연결 해제
  room.value.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('참여자 연결 해제:', participant.identity)
  })

  // 트랙 게시
  room.value.on(RoomEvent.TrackPublished, (publication, participant) => {
    console.log('트랙 게시:', publication.kind, participant.identity)
  })

  // 트랙 구독
  room.value.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log('트랙 구독:', track.kind, participant.identity)
    attachTrack(track, participant)
  })

  // 트랙 구독 해제
  room.value.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    console.log('트랙 구독 해제:', track.kind, participant.identity)
    detachTrack(track, participant)
  })

  // 데이터 수신 (채팅 메시지)
  room.value.on(RoomEvent.DataReceived, (payload, participant) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload))
      if (data.type === 'chat') {
        handleChatMessage(data, participant)
      }
    } catch (error) {
      console.error('데이터 파싱 실패:', error)
    }
  })

  // 룸 연결 해제
  room.value.on(RoomEvent.Disconnected, (reason) => {
    console.log('룸 연결 해제:', reason)
    endCall()
  })
}

// 참여자 이벤트 설정
const setupParticipantEvents = (participant) => {
  // 참여자 트랙 게시
  participant.on(RoomEvent.TrackPublished, (publication) => {
    console.log('참여자 트랙 게시:', publication.kind)
  })

  // 참여자 트랙 구독
  participant.on(RoomEvent.TrackSubscribed, (track) => {
    console.log('참여자 트랙 구독:', track.kind)
    attachTrack(track, participant)
  })

  // 참여자 트랙 구독 해제
  participant.on(RoomEvent.TrackUnsubscribed, (track) => {
    console.log('참여자 트랙 구독 해제:', track.kind)
    detachTrack(track, participant)
  })
}

// 트랙 연결
const attachTrack = (track, participant) => {
  if (track.kind === Track.Kind.Video) {
    const videoElement = createVideoElement(participant.identity)
    track.attach(videoElement)
  } else if (track.kind === Track.Kind.Audio) {
    const audioElement = createAudioElement(participant.identity)
    track.attach(audioElement)
  }
}

// 트랙 연결 해제
const detachTrack = (track, participant) => {
  if (track.kind === Track.Kind.Video) {
    const videoElement = document.getElementById(`video-${participant.identity}`)
    if (videoElement) {
      track.detach(videoElement)
      videoElement.remove()
    }
  } else if (track.kind === Track.Kind.Audio) {
    const audioElement = document.getElementById(`audio-${participant.identity}`)
    if (audioElement) {
      track.detach(audioElement)
      audioElement.remove()
    }
  }
}

// 비디오 엘리먼트 생성
const createVideoElement = (participantIdentity) => {
  const videoElement = document.createElement('video')
  videoElement.id = `video-${participantIdentity}`
  videoElement.autoplay = true
  videoElement.playsInline = true
  videoElement.className = 'participant-video'
  
  // 비디오 컨테이너에 추가
  if (roomContainer.value) {
    roomContainer.value.appendChild(videoElement)
  }
  
  return videoElement
}

// 오디오 엘리먼트 생성
const createAudioElement = (participantIdentity) => {
  const audioElement = document.createElement('audio')
  audioElement.id = `audio-${participantIdentity}`
  audioElement.autoplay = true
  audioElement.className = 'participant-audio'
  
  // 오디오 컨테이너에 추가
  if (roomContainer.value) {
    roomContainer.value.appendChild(audioElement)
  }
  
  return audioElement
}

// 채팅 메시지 처리
const handleChatMessage = (data, participant) => {
  const message = {
    id: Date.now(),
    senderId: participant.identity,
    name: participant.name || participant.identity,
    content: data.content,
    createdAt: new Date().toISOString(),
    timeOnly: new Date().toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  chatMessages.value.push(message)
  
  // 채팅 스크롤을 맨 아래로
  setTimeout(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
    }
  }, 100)
}

// 메서드
const endCall = async () => {
  try {
    // LiveKit Room 연결 해제
    if (room.value) {
      await room.value.disconnect()
      room.value = null
    }
    
    // Store에서 미팅 종료
    meetingStore.endMeetingFromStore()
    
    // 타이머 정리
    if (callTimer.value) {
      clearInterval(callTimer.value)
      callTimer.value = null
    }
    
    // 창 닫기
    window.close()
    
  } catch (error) {
    console.error('통화 종료 실패:', error)
    // 에러가 발생해도 창은 닫기
    window.close()
  }
}

const toggleMute = async () => {
  if (!room.value) return
  
  try {
    if (isMuted.value) {
      await room.value.localParticipant.setMicrophoneEnabled(true)
      isMuted.value = false
    } else {
      await room.value.localParticipant.setMicrophoneEnabled(false)
      isMuted.value = true
    }
  } catch (error) {
    console.error('마이크 토글 실패:', error)
  }
}

const toggleVideo = async () => {
  if (!room.value) return
  
  try {
    if (isVideoOn.value) {
      await room.value.localParticipant.setCameraEnabled(false)
      isVideoOn.value = false
    } else {
      await room.value.localParticipant.setCameraEnabled(true)
      isVideoOn.value = true
    }
  } catch (error) {
    console.error('비디오 토글 실패:', error)
  }
}

const toggleScreenShare = async () => {
  if (!room.value) return
  
  try {
    if (isScreenSharing.value) {
      await room.value.localParticipant.setScreenShareEnabled(false)
      isScreenSharing.value = false
    } else {
      await room.value.localParticipant.setScreenShareEnabled(true)
      isScreenSharing.value = true
    }
  } catch (error) {
    console.error('화면 공유 토글 실패:', error)
  }
}

const toggleChat = () => {
  showChat.value = !showChat.value
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !room.value) return
  
  try {
    const messageData = {
      type: 'chat',
      senderId: authStore.memberSeq.toString(),
      name: authStore.memberName || '나',
      content: newMessage.value.trim()
    }
    
    // LiveKit을 통해 데이터 전송
    await room.value.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(messageData)),
      { reliable: true }
    )
    
    // 로컬 채팅에 추가
    const message = {
      id: Date.now(),
      senderId: authStore.memberSeq.toString(),
      name: authStore.memberName || '나',
      content: newMessage.value.trim(),
      createdAt: new Date().toISOString(),
      timeOnly: new Date().toLocaleTimeString('ko-KR', { 
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
    
  } catch (error) {
    console.error('메시지 전송 실패:', error)
  }
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
  initializeLiveKitRoom()
})

onUnmounted(() => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
  }
  
  if (room.value) {
    room.value.disconnect()
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

.livekit-room {
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

.participant-audio {
  display: none;
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