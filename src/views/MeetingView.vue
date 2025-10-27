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
        <!-- LiveKit 참가자 비디오/오디오가 여기 append -->
        <div ref="roomContainer" class="livekit-room"></div>
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
import {
  Room,
  RoomEvent,
  Track,
} from 'livekit-client'

// props
const props = defineProps({
  roomId: String,
})

// store
const meetingStore = useMeetingStore()
const authStore = useAuthStore()

// 상태
const isMuted = ref(false)
const isVideoOn = ref(false)           // 시작 시 false (아직 안 켠 상태)
const isScreenSharing = ref(false)
const callStartTime = ref(null)
const callDuration = ref('00:00')
const chatMessages = ref([])
const newMessage = ref('')
const showChat = ref(true)

// LiveKit refs
const room = ref(null)
const roomContainer = ref(null)
const chatMessagesRef = ref(null)
const callTimer = ref(null)

// meetingData
const meetingData = computed(() => {
  const token = sessionStorage.getItem('meetingToken')
  const roomName = sessionStorage.getItem('meetingRoomName')
  const storedRoomId = sessionStorage.getItem('meetingRoomId')
  const roomNameAlt = sessionStorage.getItem('meetingRoomName_alt')
  const isHost = sessionStorage.getItem('meetingIsHost') === 'true'

  if (token && roomName && storedRoomId) {
    return {
      roomId: storedRoomId,
      roomName: roomNameAlt || `미팅 ${storedRoomId}`,
      isHost,
      livekitToken: token,
      livekitRoomName: roomName,
    }
  }

  if (meetingStore.currentMeetingData) {
    return {
      roomId: meetingStore.currentMeetingData.roomId,
      roomName:
        meetingStore.currentMeetingData.roomName ||
        `미팅 ${meetingStore.currentMeetingData.roomId}`,
      isHost: meetingStore.currentMeetingData.isHost || false,
      livekitToken: meetingStore.livekitToken,
      livekitRoomName: meetingStore.livekitRoomName,
    }
  }

  return {
    roomId: props.roomId || 'unknown',
    roomName: `미팅 ${props.roomId || 'Unknown'}`,
    isHost: false,
    livekitToken: null,
    livekitRoomName: props.roomId?.toString() || 'unknown',
  }
})

// 초기 트랙 붙이기 (connect 이후)
const initializeExistingTracks = () => {
  if (!room.value) return

  // 원격 참가자들
  room.value.remoteParticipants.forEach((participant) => {
    setupParticipantEvents(participant)
    participant.trackPublications.forEach((pub) => {
      if (pub.track) {
        attachTrack(pub.track, participant)
      }
    })
  })

  // 로컬 참가자 (지금은 카메라/마이크 안 켠 상태일 수 있음)
  room.value.localParticipant.trackPublications.forEach((pub) => {
    if (pub.track) {
      attachTrack(pub.track, room.value.localParticipant)
    }
  })
}

// LiveKit Room 초기화
const initializeLiveKitRoom = async () => {
  try {
    // 토큰 / 룸 이름 확보
    let token = meetingData.value.livekitToken
    let lkRoomName = meetingData.value.livekitRoomName

    if (!token || !lkRoomName) {
      token =
        sessionStorage.getItem('meetingToken') || meetingStore.livekitToken
      lkRoomName =
        sessionStorage.getItem('meetingRoomName') ||
        meetingStore.livekitRoomName ||
        meetingData.value.roomId?.toString()
    }

    if (!token || !lkRoomName) {
      throw new Error('LiveKit 토큰 또는 룸 이름이 없습니다.')
    }

    // Room 인스턴스 생성 (순수 literal)
    room.value = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
      },
    })

    // WS 시그널링 URL (http:// 아님)
    const wsUrl =
      import.meta.env.VITE_LIVEKIT_API_URL ||
      'ws://localhost:7880'

    // 방 연결
    await room.value.connect(wsUrl, token)

    // 이벤트 리스너 등록 (connect 이후)
    setupRoomEventListeners()

    // 현재 방에 있는 참가자/트랙 DOM 부착
    initializeExistingTracks()

    // 통화 타이머 시작
    callStartTime.value = new Date()
    startCallTimer()

    console.log('LiveKit Room 연결 성공 (카메라/마이크는 아직 비활성)')
  } catch (error) {
    console.error('LiveKit Room 초기화 실패:', error)
    alert('화상회의 연결에 실패했습니다.')
  }
}

// 룸 이벤트 리스너
const setupRoomEventListeners = () => {
  if (!room.value) return

  // 새 참가자 입장
  room.value.on(RoomEvent.ParticipantConnected, (participant) => {
    console.log('참여자 연결:', participant.identity)
    setupParticipantEvents(participant)
  })

  // 참가자 퇴장
  room.value.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('참여자 연결 해제:', participant.identity)
    detachAllTracksOfParticipant(participant)
  })

  // 원격 트랙 구독됨
  room.value.on(
    RoomEvent.TrackSubscribed,
    (track, publication, participant) => {
      console.log('트랙 구독:', track.kind, participant.identity)
      attachTrack(track, participant)
    },
  )

  // 원격 트랙 구독 해제
  room.value.on(
    RoomEvent.TrackUnsubscribed,
    (track, publication, participant) => {
      console.log('트랙 구독 해제:', track.kind, participant.identity)
      detachTrack(track, participant)
    },
  )

  // 데이터 수신 (채팅)
  room.value.on(RoomEvent.DataReceived, (payload, participant) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload))
      if (data.type === 'chat') {
        handleChatMessage(data, participant)
      }
    } catch (err) {
      console.error('데이터 파싱 실패:', err)
    }
  })

  // 룸 연결 끊김
  room.value.on(RoomEvent.Disconnected, (reason) => {
    console.log('룸 연결 해제:', reason)
    endCall()
  })
}

// 참가자 이벤트
const setupParticipantEvents = (participant) => {
  // 참가자의 트랙 게시 이벤트
  participant.on(RoomEvent.TrackPublished, (publication) => {
    console.log('참여자 트랙 게시:', publication.kind)
  })

  // 참가자의 트랙 구독
  participant.on(RoomEvent.TrackSubscribed, (track) => {
    console.log('참여자 트랙 구독:', track.kind, participant.identity)
    attachTrack(track, participant)
  })

  // 참가자의 트랙 구독 해제
  participant.on(RoomEvent.TrackUnsubscribed, (track) => {
    console.log('참여자 트랙 구독 해제:', track.kind, participant.identity)
    detachTrack(track, participant)
  })
}

// 참가자 전체 트랙 제거
const detachAllTracksOfParticipant = (participant) => {
  participant.tracks.forEach((pub) => {
    if (pub.track) {
      detachTrack(pub.track, participant)
    }
  })
}

// 트랙을 DOM에 붙이기
const attachTrack = (track, participant) => {
  if (!roomContainer.value) return

  const pid = participant.identity || 'unknown'

  if (track.kind === Track.Kind.Video) {
    let videoElement = document.getElementById(`video-${pid}`)
    if (!videoElement) {
      videoElement = createVideoElement(pid)
      roomContainer.value.appendChild(videoElement)
    }
    track.attach(videoElement)
  } else if (track.kind === Track.Kind.Audio) {
    let audioElement = document.getElementById(`audio-${pid}`)
    if (!audioElement) {
      audioElement = createAudioElement(pid)
      roomContainer.value.appendChild(audioElement)
    }
    track.attach(audioElement)
  }
}

// 트랙을 DOM에서 떼기
const detachTrack = (track, participant) => {
  const pid = participant.identity || 'unknown'

  if (track.kind === Track.Kind.Video) {
    const videoElement = document.getElementById(`video-${pid}`)
    if (videoElement) {
      track.detach(videoElement)
      videoElement.remove()
    }
  } else if (track.kind === Track.Kind.Audio) {
    const audioElement = document.getElementById(`audio-${pid}`)
    if (audioElement) {
      track.detach(audioElement)
      audioElement.remove()
    }
  }
}

// 비디오/오디오 element 생성
const createVideoElement = (participantIdentity) => {
  const videoElement = document.createElement('video')
  videoElement.id = `video-${participantIdentity}`
  videoElement.autoplay = true
  videoElement.playsInline = true
  videoElement.className = 'participant-video'
  if (
    room.value &&
    room.value.localParticipant &&
    room.value.localParticipant.identity === participantIdentity
  ) {
    // 자기 자신의 비디오는 기본 음소거 (하울링 방지)
    videoElement.muted = true
  }
  return videoElement
}

const createAudioElement = (participantIdentity) => {
  const audioElement = document.createElement('audio')
  audioElement.id = `audio-${participantIdentity}`
  audioElement.autoplay = true
  audioElement.className = 'participant-audio'
  return audioElement
}

// 채팅 메시지 처리
const handleChatMessage = (data, participant) => {
  const senderName =
    participant?.name ||
    participant?.identity ||
    data?.name ||
    '알 수 없음'

  const message = {
    id: Date.now(),
    senderId: participant?.identity || data?.senderId || 'unknown',
    name: senderName,
    content: data.content,
    createdAt: new Date().toISOString(),
    timeOnly: new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }

  chatMessages.value.push(message)

  // 스크롤 맨 아래로
  setTimeout(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
    }
  }, 100)
}

// 콜 종료
const endCall = async () => {
  try {
    if (room.value) {
      await room.value.disconnect()
      room.value = null
    }

    meetingStore.endMeetingFromStore()

    sessionStorage.removeItem('meetingToken')
    sessionStorage.removeItem('meetingRoomName')
    sessionStorage.removeItem('meetingRoomId')
    sessionStorage.removeItem('meetingRoomName_alt')
    sessionStorage.removeItem('meetingIsHost')

    if (callTimer.value) {
      clearInterval(callTimer.value)
      callTimer.value = null
    }

    window.close()
  } catch (err) {
    console.error('통화 종료 중 문제:', err)
    window.close()
  }
}

// 마이크 토글
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
  } catch (err) {
    console.error('마이크 토글 중 문제:', err)
  }
}

// 비디오 토글
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
  } catch (err) {
    console.error('비디오 토글 중 문제:', err)
  }
}

// 화면 공유 토글
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
  } catch (err) {
    console.error('화면 공유 토글 중 문제:', err)
  }
}

// 채팅 패널 토글
const toggleChat = () => {
  showChat.value = !showChat.value
}

// 채팅 보내기
const sendMessage = async () => {
  if (!newMessage.value.trim() || !room.value) return
  try {
    const payload = {
      type: 'chat',
      senderId: authStore.memberSeq?.toString() || 'me',
      name: authStore.memberName || '나',
      content: newMessage.value.trim(),
    }

    await room.value.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(payload)),
      { reliable: true },
    )

    const message = {
      id: Date.now(),
      senderId: authStore.memberSeq?.toString() || 'me',
      name: authStore.memberName || '나',
      content: newMessage.value.trim(),
      createdAt: new Date().toISOString(),
      timeOnly: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    chatMessages.value.push(message)
    newMessage.value = ''

    setTimeout(() => {
      if (chatMessagesRef.value) {
        chatMessagesRef.value.scrollTop =
          chatMessagesRef.value.scrollHeight
      }
    }, 100)
  } catch (err) {
    console.error('메시지 전송 중 문제:', err)
  }
}

// 통화 시간 타이머
const startCallTimer = () => {
  callTimer.value = setInterval(() => {
    if (callStartTime.value) {
      const now = new Date()
      const diff = now - callStartTime.value
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      const mm = minutes.toString().padStart(2, '0')
      const ss = seconds.toString().padStart(2, '0')
      callDuration.value = `${mm}:${ss}`
    }
  }, 1000)
}

// 라이프사이클
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

  sessionStorage.removeItem('meetingToken')
  sessionStorage.removeItem('meetingRoomName')
  sessionStorage.removeItem('meetingRoomId')
  sessionStorage.removeItem('meetingRoomName_alt')
  sessionStorage.removeItem('meetingIsHost')
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
    position: absolute
;
    bottom: 20px;
    right: 20px;
    top: auto;
    transform: none;
  }
}
</style>
