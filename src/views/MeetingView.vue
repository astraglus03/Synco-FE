<template>
  <div class="meeting-view">
    <!-- 미팅 헤더 -->
    <div class="meeting-header">
      <div class="call-info">
        <h3 class="call-title">{{ displayRoomName }}</h3>
        <p class="call-duration">{{ callDuration }}</p>
      </div>
      <div class="call-controls">
        <!-- 녹화 버튼 (호스트만) -->
        <v-btn
          v-if="meetingData?.isHost && !isRecording"
          icon="mdi-record"
          color="grey-darken-1"
          @click="handleRecording"
        />
        <!-- 녹화 중 표시 -->
        <div v-if="isRecording" class="recording-status">
          🔴 녹화 중
        </div>
        
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
        <div class="participants-video">
          <!-- 내 비디오 -->
          <div v-if="localParticipantIdentity" class="participant-video my-video">
            <video :id="`video-${localParticipantIdentity}`" autoplay muted playsinline class="video-element"></video>
            <div class="video-label">{{ getParticipantName(localParticipantIdentity) || authStore.user?.name || localParticipantIdentity }}</div>
          </div>
          
          <!-- 원격 참여자들 -->
          <div
            v-for="participant in remoteParticipants"
            :key="participant.identity"
            class="participant-video"
          >
            <video :id="`video-${participant.identity}`" autoplay playsinline class="video-element"></video>
            <div class="video-label">{{ getParticipantName(participant.identity) || participant.name || participant.identity }}</div>
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
import { useRoute } from 'vue-router'
import { useMeetingStore } from '@/store/meetingStore'
import { useAuthStore } from '@/store/authStore'
import { meetingApi } from '@/api/meeting/meetingApi'
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
} from 'livekit-client'

// props
const props = defineProps({
  roomId: String,
})

// route
const route = useRoute()

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
const isRecording = ref(false)
const isEndingCall = ref(false) // 종료 중 플래그

// LiveKit refs
const room = ref(null)
const roomContainer = ref(null)
const chatMessagesRef = ref(null)
const callTimer = ref(null)
const remoteParticipants = ref([])
const localParticipantIdentity = ref(null)
const roomParticipants = ref([]) // API로 가져온 참가자 정보 (이름 포함)

// meetingData
const meetingData = computed(() => {
  // 1) URL 쿼리에서 우선 읽는다 (새 탭 시나리오)
  const qToken = route.query.token
  const qRoomName = route.query.roomName // 이건 livekitRoomName (실제 roomName)
  const qDisplayName = route.query.displayName // 사람이 보는 회의 이름
  const qIsHost = route.query.isHost === 'true'

  if (qToken && qRoomName && props.roomId) {
    return {
      roomId: props.roomId,
      roomName: qDisplayName || `미팅 ${props.roomId}`,
      isHost: qIsHost,
      livekitToken: qToken,
      livekitRoomName: qRoomName,
    }
  }

  // 2) 같은 탭 안에서 바로 라우터로 이동하는 경우 (fallback)
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

  // 3) sessionStorage에서 읽기 (페이지 새로고침 시)
  const storedIsHost = sessionStorage.getItem('meetingIsHost')
  const storedRoomName = sessionStorage.getItem('meetingRoomName')
  if (storedIsHost) {
    return {
      roomId: props.roomId || 'unknown',
      roomName: storedRoomName || `미팅 ${props.roomId || 'Unknown'}`,
      isHost: storedIsHost === 'true',
      livekitToken: null,
      livekitRoomName: props.roomId?.toString() || 'unknown',
    }
  }

  // 4) 최후 fallback (API 호출 없이 기본값)
  return {
    roomId: props.roomId || 'unknown',
    roomName: '회의',
    isHost: false,
    livekitToken: null,
    livekitRoomName: props.roomId?.toString() || 'unknown',
  }
})

// 회의 제목 로드 (fallback용)
const roomTitle = ref(null)

// 회의 제목이 기본값인지 확인 (미팅 N 패턴 또는 "회의")
const isDefaultRoomName = (roomName) => {
  if (!roomName) return true
  if (roomName === '회의') return true
  // "미팅 N" 패턴 확인
  const match = roomName.match(/^미팅\s*(\d+)$/)
  return !!match
}

// 회의 제목 가져오기
const loadRoomTitle = async () => {
  if (!props.roomId) return
  
  const currentRoomName = meetingData.value?.roomName
  // 기본값이 아니고 이미 실제 제목이 있으면 스킵
  if (currentRoomName && !isDefaultRoomName(currentRoomName)) {
    return
  }
  
  try {
    console.log('🔍 회의 제목 API 호출 시작:', props.roomId)
    // 백엔드 API로 회의 상세 정보 가져오기 (파라미터 순서: roomSeq, memberSeq)
    const response = await meetingApi.getRoomDetail(props.roomId, authStore.memberSeq)
    console.log('📋 API 응답:', response)
    
    if (response?.data?.roomName) {
      roomTitle.value = response.data.roomName
      console.log('✅ 회의 제목 로드 완료:', roomTitle.value)
      // meetingData는 computed이므로 직접 수정 불가, 대신 sessionStorage 업데이트
      sessionStorage.setItem('meetingRoomName', roomTitle.value)
    }
  } catch (error) {
    console.warn('⚠️ 회의 제목 로드 실패:', error)
  }
}

// 회의 참가자 정보 가져오기 (이름 포함)
const loadRoomParticipants = async () => {
  if (!props.roomId) return
  
  try {
    console.log('🔍 회의 참가자 정보 API 호출 시작:', props.roomId)
    const response = await meetingApi.getRoomDetail(props.roomId, authStore.memberSeq)
    console.log('📋 참가자 정보 API 응답:', response)
    
    if (response?.data?.participants && Array.isArray(response.data.participants)) {
      roomParticipants.value = response.data.participants
      console.log('✅ 참가자 정보 로드 완료:', roomParticipants.value.length, '명')
    }
  } catch (error) {
    console.warn('⚠️ 참가자 정보 로드 실패:', error)
  }
}

// participant identity로 이름 찾기
const getParticipantName = (participantIdentity) => {
  if (!participantIdentity) return null
  
  // 1. 로컬 참가자이면 authStore에서 가져오기
  if (participantIdentity?.toString() === localParticipantIdentity.value?.toString() ||
      participantIdentity?.toString() === authStore.memberSeq?.toString()) {
    return authStore.user?.name || null
  }
  
  // 2. roomParticipants에서 찾기
  const participant = roomParticipants.value.find(
    p => p.participantId?.toString() === participantIdentity?.toString()
  )
  
  if (participant?.participantName) {
    return participant.participantName
  }
  
  // 3. remoteParticipants에서 찾기 (participant.name이 있는 경우)
  const remoteParticipant = remoteParticipants.value.find(
    p => p.identity?.toString() === participantIdentity?.toString()
  )
  
  if (remoteParticipant?.name) {
    return remoteParticipant.name
  }
  
  return null
}

// 회의 제목 표시 (computed로 반응성 확보)
const displayRoomName = computed(() => {
  const currentRoomName = meetingData.value?.roomName
  
  // 1. 실제 제목이 있으면 사용 (기본값이 아닌 경우)
  if (currentRoomName && !isDefaultRoomName(currentRoomName)) {
    return currentRoomName
  }
  
  // 2. API로 로드한 제목이 있으면 사용
  if (roomTitle.value) {
    return roomTitle.value
  }
  
  // 3. Fallback: 기본값 또는 현재 값
  return currentRoomName || '회의'
})

// 초기 트랙 붙이기 (connect 이후)
const initializeExistingTracks = async () => {
  if (!room.value) return

  console.log('🔍 기존 참가자 수:', room.value.remoteParticipants.size)

  // 참가자 정보 먼저 로드
  await loadRoomParticipants()

  // 원격 참가자들
  room.value.remoteParticipants.forEach((participant) => {
    console.log('📹 기존 원격 참가자 추가:', participant.identity)
    
    // 참가자 이름 찾기
    const participantName = getParticipantName(participant.identity)
    
    // 참가자를 배열에 추가
    remoteParticipants.value.push({
      identity: participant.identity,
      name: participantName || participant.name || participant.identity,
    })
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
  
  console.log('✅ 초기 트랙 붙이기 완료, remoteParticipants:', remoteParticipants.value.length)
}

// LiveKit Room 초기화
const initializeLiveKitRoom = async () => {
  try {
    const token = meetingData.value.livekitToken
    const lkRoomName = meetingData.value.livekitRoomName

    console.log('[LiveKit connect try]', {
      wsUrl: import.meta.env.VITE_LIVEKIT_API_URL,
      tokenPreview: token?.substring?.(0, 20) + '...',
      lkRoomName,
    })

    if (!token || !lkRoomName) {
      throw new Error('LiveKit 토큰 또는 룸 이름이 없습니다.')
    }

    // Room 인스턴스 생성
    room.value = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
      },
    })

    // WS 시그널링 URL (WebSocket은 ws:// 프로토콜 사용)
    let wsUrl = 'ws://'+import.meta.env.VITE_LIVEKIT_API_URL
    
    // http://로 시작하면 ws://로 변환
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://')
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://')
    }

    console.log('[LiveKit] WebSocket URL:', wsUrl)
    console.log('[LiveKit] Token preview:', token?.substring?.(0, 50))

    // 방 연결
    await room.value.connect(wsUrl, token)

    // 로컬 참가자 identity 저장
    localParticipantIdentity.value = room.value.localParticipant.identity
    console.log('로컬 참가자 identity:', localParticipantIdentity.value)

    // 이벤트 리스너 등록 (connect 이후)
    setupRoomEventListeners()

    // 현재 방에 있는 참가자/트랙 DOM 부착
    await initializeExistingTracks()

    // 카메라와 마이크 트랙 생성 및 publish
    try {
      console.log('🎥 카메라/마이크 트랙 생성 시작...')
      const tracks = await createLocalTracks({
        video: true,
        audio: true,
      })
      
      console.log('📹 트랙 생성됨:', tracks.length, '개')
      
      for (const track of tracks) {
        console.log('📤 트랙 publish 중:', track.kind)
        await room.value.localParticipant.publishTrack(track)
        console.log('✅ 트랙 publish 완료:', track.kind)
        
        // 트랙을 바로 DOM에 붙이기
        attachTrack(track, room.value.localParticipant)
      }
      
      isVideoOn.value = true
      isMuted.value = false
      
      console.log('✅ 카메라/마이크 트랙 생성 및 publish 완료')
      console.log('📺 현재 DOM 비디오 요소:', document.querySelectorAll('video').length)
    } catch (err) {
      console.error('❌ 카메라/마이크 권한 요청 실패:', err)
    }

    // 통화 타이머 시작
    callStartTime.value = new Date()
    startCallTimer()

    // 기존 채팅 메시지 불러오기
    await loadChatMessages()

    console.log('LiveKit Room 연결 성공')
  } catch (error) {
    console.error('LiveKit Room 초기화 실패:', error)
    alert('화상회의 연결에 실패했습니다.')
  }
}

// 룸 이벤트 리스너
const setupRoomEventListeners = () => {
  if (!room.value) return

  // 새 참가자 입장
  room.value.on(RoomEvent.ParticipantConnected, async (participant) => {
    console.log('참여자 연결:', participant.identity)
    
    // 참가자 정보 새로고침 (새 참가자가 추가되었을 수 있음)
    await loadRoomParticipants()
    
    // 참가자 이름 찾기
    const participantName = getParticipantName(participant.identity)
    
    remoteParticipants.value.push({
      identity: participant.identity,
      name: participantName || participant.name || participant.identity,
    })
    setupParticipantEvents(participant)
  })

  // 참가자 퇴장
  room.value.on(RoomEvent.ParticipantDisconnected, (participant) => {
    console.log('참여자 연결 해제:', participant.identity)
    remoteParticipants.value = remoteParticipants.value.filter(
      p => p.identity !== participant.identity
    )
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
  if (!participant || !participant.tracks) return
  
  participant.tracks.forEach((pub) => {
    if (pub.track) {
      detachTrack(pub.track, participant)
    }
  })
}

// 트랙을 DOM에 붙이기
const attachTrack = (track, participant) => {
  const pid = participant.identity || 'unknown'

  if (track.kind === Track.Kind.Video) {
    const videoElement = document.getElementById(`video-${pid}`)
    if (videoElement) {
      track.attach(videoElement)
      console.log('✅ 비디오 트랙 attach됨:', pid)
    } else {
      console.warn('⚠️ 비디오 element 찾을 수 없음, 재시도:', `video-${pid}`)
      // Vue의 반응형 시스템이 DOM을 업데이트할 때까지 기다림
      setTimeout(() => {
        const retryElement = document.getElementById(`video-${pid}`)
        if (retryElement) {
          track.attach(retryElement)
          console.log('✅ 재시도 성공 - 비디오 트랙 attach됨:', pid)
        } else {
          console.error('❌ 재시도 실패 - 여전히 element 못 찾음:', `video-${pid}`)
        }
      }, 100)
    }
  } else if (track.kind === Track.Kind.Audio) {
    let audioElement = document.getElementById(`audio-${pid}`)
    if (!audioElement) {
      audioElement = createAudioElement(pid)
      document.body.appendChild(audioElement)
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
      // template에 있는 요소는 remove하지 않음
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
  const senderId = participant?.identity || data?.senderId || 'unknown'
  const senderName =
    participant?.name ||
    data?.name ||
    participant?.identity ||
    '알 수 없음'

  // senderId가 현재 사용자이면 실제 이름 표시
  const displayName = 
    senderId?.toString() === authStore.memberSeq?.toString() 
      ? (authStore.user?.name || '알 수 없음')
      : senderName

  const message = {
    id: Date.now(),
    senderId: senderId,
    name: displayName,
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

// 녹화 처리
const handleRecording = async () => {
  if (!meetingData.value?.isHost) {
    console.warn('❌ 호스트가 아닙니다. 녹화 권한이 없습니다.')
    return
  }

  if (isRecording.value) {
    // 녹화 중에는 버튼이 숨겨지므로 여기서는 실행 안 됨
    return
  }

  // 녹화 시작 확인
  const confirmMessage = `모든 참여자가 나가면 녹화본을 요약해서 제공합니다.\n녹화를 시작하시겠습니까?`
  const confirmed = confirm(confirmMessage)
  
  if (confirmed) {
    await startRecording()
  }
}

// 녹화 시작
const startRecording = async () => {
  try {
    console.log('🎬 녹화 시작 시도:', {
      memberSeq: authStore.memberSeq,
      roomId: props.roomId
    })
    
    const response = await meetingApi.startRecording(authStore.memberSeq, props.roomId)
    console.log('✅ 녹화 시작 성공:', response)
    
    isRecording.value = true
    
    console.log('📊 녹화 상태 업데이트: isRecording =', isRecording.value)
  } catch (err) {
    console.error('❌ 녹화 시작 실패:', err)
    alert('녹화 시작에 실패했습니다: ' + (err.message || err))
  }
}

// 모든 참여자가 나갔는지 확인

// 콜 종료
const endCall = async () => {
  // 이미 종료 중이면 중복 호출 방지
  if (isEndingCall.value) {
    console.log('⚠️ 이미 종료 중입니다.')
    return
  }
  
  isEndingCall.value = true
  
  try {
    // LiveKit 방 나가기 (Webhook이 자동으로 회의 종료 처리함)
    if (room.value) {
      console.log('📞 LiveKit 방 나가기...')
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

// 채팅 메시지 불러오기
const loadChatMessages = async () => {
  try {
    const response = await meetingApi.getMessages(
      authStore.memberSeq,
      props.roomId,
      0, // 첫 페이지
      50 // 최근 50개 메시지
    )
    
    console.log('📨 채팅 메시지 응답 구조:', response)
    
    // ResponseDto 구조: { success, code, message, data }
    // data가 Page 객체: { content: [...], totalElements: ... }
    const pageData = response.data || response
    const messagesArray = pageData.content || []
    
    console.log('📋 파싱된 메시지 배열:', messagesArray.length, '개')
    
    if (Array.isArray(messagesArray) && messagesArray.length > 0) {
      const messages = messagesArray.map((msg) => {
        // senderId가 현재 사용자이면 실제 이름 표시, 아니면 이름 또는 senderId 표시
        const displayName = 
          msg.senderId?.toString() === authStore.memberSeq?.toString() 
            ? (authStore.user?.name || '알 수 없음')
            : (msg.name || msg.senderId?.toString() || '알 수 없음')
        
        return {
          id: msg.id,
          senderId: msg.senderId,
          name: displayName,
          content: msg.content,
          createdAt: msg.createdAt,
          timeOnly: new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }
      }).reverse();
      
      chatMessages.value = messages
      console.log('✅ 채팅 메시지 로드 완료:', messages.length, '개')
      
      // 채팅 스크롤을 맨 아래로
      setTimeout(() => {
        if (chatMessagesRef.value) {
          chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
        }
      }, 100)
    } else {
      console.log('📭 채팅 메시지 없음')
      chatMessages.value = []
    }
  } catch (err) {
    console.error('❌ 채팅 메시지 로드 실패:', err)
    chatMessages.value = []
  }
}

// 채팅 보내기
const sendMessage = async () => {
  if (!newMessage.value.trim() || !room.value) return
  
  const content = newMessage.value.trim()
  const messageText = content
  
  try {
    // 현재 사용자 이름
    const userName = authStore.user?.name || '알 수 없음'
    
    // 1. LiveKit으로 실시간 전송 (다른 참여자들에게 즉시 전달)
    const payload = {
      type: 'chat',
      senderId: authStore.memberSeq?.toString() || 'me',
      name: userName,
      content: messageText,
    }

    await room.value.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(payload)),
      { reliable: true },
    )

    // 2. 백엔드 API로 DB 저장 (예외 처리로 실패해도 LiveKit은 이미 보냄)
    try {
      await meetingApi.sendMessage(
        authStore.memberSeq,
        props.roomId,
        {
          senderId: authStore.memberSeq?.toString(),
          name: userName,
          content: messageText,
        }
      )
    } catch (apiErr) {
      console.warn('백엔드 채팅 저장 실패 (LiveKit은 전송됨):', apiErr)
    }

    // 3. 내 메시지를 UI에 즉시 표시
    const message = {
      id: Date.now(),
      senderId: authStore.memberSeq?.toString() || 'me',
      name: userName,
      content: messageText,
      createdAt: new Date().toISOString(),
      timeOnly: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    chatMessages.value.push(message)
    newMessage.value = ''

    // 채팅 스크롤을 맨 아래로
    setTimeout(() => {
      if (chatMessagesRef.value) {
        chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
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
onMounted(async () => {
  // isHost와 roomName 정보를 sessionStorage에 저장 (페이지 새로고침 시 유지용)
  if (meetingData.value?.isHost !== undefined) {
    sessionStorage.setItem('meetingIsHost', meetingData.value.isHost.toString())
  }
  
  // 실제 제목인 경우에만 sessionStorage에 저장
  const currentRoomName = meetingData.value?.roomName
  if (currentRoomName && !isDefaultRoomName(currentRoomName)) {
    sessionStorage.setItem('meetingRoomName', currentRoomName)
  }
  
  // 회의 제목이 기본값이면 API로 가져오기
  await loadRoomTitle()
  
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

.recording-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 20px;
  color: #ff5252;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
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

.my-video {
  border: 2px solid rgba(255, 255, 255, 0.3);
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
