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
      <div class="video-container" :class="{ 'full-width': !showChat, 'screen-share-mode': activeScreenShare }">
        <!-- 화면 공유 모드: 메인 영역 + 서브 영역 -->
        <template v-if="activeScreenShare">
          <!-- 메인 화면 공유 영역 -->
          <div class="main-screen-share-area">
            <div 
              class="screen-share-video-wrapper"
              @click="expandVideo(activeScreenShare.identity, 'screen-share')"
            >
              <video 
                :id="`screen-share-${activeScreenShare.identity}`" 
                autoplay 
                playsinline 
                class="screen-share-element"
              ></video>
              <div class="screen-share-label">
                <v-icon size="16">mdi-monitor</v-icon>
                {{ getParticipantName(activeScreenShare.identity) || activeScreenShare.name || activeScreenShare.identity }}의 화면
              </div>
              <div class="expand-hint">
                <v-icon size="20">mdi-fullscreen</v-icon>
                <span>클릭하여 확대</span>
              </div>
            </div>
          </div>
          
          <!-- 참가자 카메라 서브 영역 -->
          <div class="participants-sidebar">
            <!-- 내 비디오 -->
            <div 
              v-if="localParticipantIdentity" 
              class="participant-video-small my-video"
              @click="expandVideo(localParticipantIdentity, 'camera')"
            >
              <video :id="`video-${localParticipantIdentity}`" autoplay muted playsinline class="video-element"></video>
              <div class="video-label">{{ getParticipantName(localParticipantIdentity) || authStore.user?.name || localParticipantIdentity }}</div>
            </div>
            
            <!-- 원격 참여자들 -->
            <div
              v-for="participant in remoteParticipants"
              :key="participant.identity"
              class="participant-video-small"
              @click="expandVideo(participant.identity, 'camera')"
            >
              <video :id="`video-${participant.identity}`" autoplay playsinline class="video-element"></video>
              <div class="video-label">{{ getParticipantName(participant.identity) || participant.name || participant.identity }}</div>
            </div>
          </div>
        </template>
        
        <!-- 일반 모드: 그리드 레이아웃 -->
        <template v-else>
          <div class="participants-video">
            <!-- 내 비디오 -->
            <div 
              v-if="localParticipantIdentity" 
              class="participant-video my-video"
              @click="expandVideo(localParticipantIdentity, 'camera')"
            >
              <video :id="`video-${localParticipantIdentity}`" autoplay muted playsinline class="video-element"></video>
              <div class="video-label">{{ getParticipantName(localParticipantIdentity) || authStore.user?.name || localParticipantIdentity }}</div>
            </div>
            
            <!-- 원격 참여자들 -->
            <div
              v-for="participant in remoteParticipants"
              :key="participant.identity"
              class="participant-video"
              @click="expandVideo(participant.identity, 'camera')"
            >
              <video :id="`video-${participant.identity}`" autoplay playsinline class="video-element"></video>
              <div class="video-label">{{ getParticipantName(participant.identity) || participant.name || participant.identity }}</div>
            </div>
          </div>
        </template>
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

    <!-- 확대된 비디오 모달 (풀스크린) -->
    <div 
      v-if="expandedVideo" 
      class="expanded-video-overlay"
      @click="closeExpandedVideo"
    >
      <div class="expanded-video-container" @click.stop>
        <div class="expanded-video-header">
          <div class="expanded-video-info">
            <v-icon v-if="expandedVideo.type === 'screen-share'" size="20">mdi-monitor</v-icon>
            <v-icon v-else size="20">mdi-video</v-icon>
            <span>{{ expandedVideo.name }}의 {{ expandedVideo.type === 'screen-share' ? '화면' : '비디오' }}</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            class="close-expanded-btn"
            @click="closeExpandedVideo"
          />
        </div>
        <div class="expanded-video-content">
          <video 
            :id="`expanded-${expandedVideo.id}-${expandedVideo.type}`" 
            autoplay 
            :muted="expandedVideo.id === localParticipantIdentity"
            playsinline 
            class="expanded-video-element"
          ></video>
        </div>
        <div class="expanded-video-footer">
          <v-btn
            icon="mdi-fullscreen-exit"
            variant="text"
            @click="closeExpandedVideo"
          >
            전체화면 종료 (ESC)
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
const activeScreenShare = ref(null) // 현재 화면 공유 중인 참가자 정보 { identity, name }
const expandedVideo = ref(null) // 확대된 비디오 정보 { id, name, type }
const screenShareTracks = ref(new Map()) // 화면 공유 트랙 저장 (identity -> track)

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
    // 백엔드 API로 회의 상세 정보 가져오기 (파라미터 순서: roomSeq, memberSeq)
    const response = await meetingApi.getRoomDetail(props.roomId, authStore.memberSeq)
    
    if (response?.data?.roomName) {
      roomTitle.value = response.data.roomName
      // meetingData는 computed이므로 직접 수정 불가, 대신 sessionStorage 업데이트
      sessionStorage.setItem('meetingRoomName', roomTitle.value)
    }
  } catch (error) {
  }
}

// 회의 참가자 정보 가져오기 (이름 포함)
const loadRoomParticipants = async () => {
  if (!props.roomId) return
  
  try {
    const response = await meetingApi.getRoomDetail(props.roomId, authStore.memberSeq)
    
    if (response?.data?.participants && Array.isArray(response.data.participants)) {
      roomParticipants.value = response.data.participants
    }
  } catch (error) {
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

  // 참가자 정보 먼저 로드
  await loadRoomParticipants()

  // 원격 참가자들
  room.value.remoteParticipants.forEach((participant) => {
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
        attachTrack(pub.track, participant, pub)
      }
    })
  })

  // 로컬 참가자 (지금은 카메라/마이크 안 켠 상태일 수 있음)
  room.value.localParticipant.trackPublications.forEach((pub) => {
    if (pub.track) {
      attachTrack(pub.track, room.value.localParticipant, pub)
    }
  })
}

// LiveKit Room 초기화
const initializeLiveKitRoom = async () => {
  try {
    const token = meetingData.value.livekitToken
    const lkRoomName = meetingData.value.livekitRoomName

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

    // WS 시그널링 URL 생성
    let livekitUrl = import.meta.env.VITE_LIVEKIT_API_URL
    
    // 환경 변수 검증
    if (!livekitUrl || livekitUrl.trim() === '') {
      console.error('❌ VITE_LIVEKIT_API_URL이 설정되지 않았습니다.')
      throw new Error('LiveKit 서버 URL이 설정되지 않았습니다.')
    }
    
    let wsUrl = ''
    
    // 프로토콜이 이미 포함되어 있는지 확인
    if (livekitUrl.startsWith('ws://') || livekitUrl.startsWith('wss://')) {
      // 이미 WebSocket 프로토콜이 있으면 그대로 사용
      wsUrl = livekitUrl
    } else if (livekitUrl.startsWith('http://')) {
      // http://로 시작하면 ws://로 변환
      wsUrl = livekitUrl.replace('http://', 'ws://')
    } else if (livekitUrl.startsWith('https://')) {
      // https://로 시작하면 wss://로 변환
      wsUrl = livekitUrl.replace('https://', 'wss://')
    } else {
      // 프로토콜이 없으면 현재 페이지 프로토콜에 따라 결정
      // HTTPS 페이지에서는 wss://, HTTP 페이지에서는 ws:// 사용
      const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
      wsUrl = protocol + livekitUrl
    }
    
    // 포트 번호가 포함되어 있으면 제거 (Nginx가 443 포트로 프록시하므로)
    // 예: livekit.synco1.shop:7880 -> livekit.synco1.shop
    if (wsUrl.includes(':7880')) {
      wsUrl = wsUrl.replace(':7880', '')
      console.warn('⚠️ 포트 7880이 URL에서 제거되었습니다. Nginx 프록시를 사용합니다.')
    }
    
    // LiveKit은 /rtc 경로를 필요로 함 (명시적으로 추가)
    // 라이브러리 버전에 따라 자동 추가되지 않을 수 있으므로 안전하게 명시적으로 추가
    if (!wsUrl.endsWith('/rtc')) {
      // 마지막 슬래시 제거 후 /rtc 추가
      wsUrl = wsUrl.replace(/\/$/, '') + '/rtc'
    }
    
    // 디버깅 로그
    console.log('🔗 LiveKit 연결 정보:', {
      livekitUrl,
      wsUrl,
      hasToken: !!token,
      roomName: lkRoomName
    })

    // 방 연결
    await room.value.connect(wsUrl, token)

    // 로컬 참가자 identity 저장
    localParticipantIdentity.value = room.value.localParticipant.identity

    // 이벤트 리스너 등록 (connect 이후)
    setupRoomEventListeners()

    // 현재 방에 있는 참가자/트랙 DOM 부착
    await initializeExistingTracks()

    // 카메라와 마이크 트랙 생성 및 publish
    try {
      const tracks = await createLocalTracks({
        video: true,
        audio: true,
      })
      
      for (const track of tracks) {
        await room.value.localParticipant.publishTrack(track)
        
        // 트랙을 바로 DOM에 붙이기
        attachTrack(track, room.value.localParticipant)
      }
      
      isVideoOn.value = true
      isMuted.value = false
    } catch (err) {
    }

    // 통화 타이머 시작
    callStartTime.value = new Date()
    startCallTimer()

    // 기존 채팅 메시지 불러오기
    await loadChatMessages()
  } catch (error) {
    alert('화상회의 연결에 실패했습니다.')
  }
}

// 룸 이벤트 리스너
const setupRoomEventListeners = () => {
  if (!room.value) return

  // 새 참가자 입장
  room.value.on(RoomEvent.ParticipantConnected, async (participant) => {
    
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
    remoteParticipants.value = remoteParticipants.value.filter(
      p => p.identity !== participant.identity
    )
    detachAllTracksOfParticipant(participant)
    
  })

  // 원격 트랙 구독됨
  room.value.on(
    RoomEvent.TrackSubscribed,
    (track, publication, participant) => {
      attachTrack(track, participant, publication)
    },
  )

  // 원격 트랙 구독 해제
  room.value.on(
    RoomEvent.TrackUnsubscribed,
    (track, publication, participant) => {
      detachTrack(track, participant, publication)
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
    }
  })

  // 룸 연결 끊김
  room.value.on(RoomEvent.Disconnected, (reason) => {
    endCall()
  })
}

// 참가자 이벤트
const setupParticipantEvents = (participant) => {
  // 참가자의 트랙 게시 이벤트
  participant.on(RoomEvent.TrackPublished, (publication) => {
  })

  // 참가자의 트랙 구독
  participant.on(RoomEvent.TrackSubscribed, (track, publication) => {
    attachTrack(track, participant, publication)
  })

  // 참가자의 트랙 구독 해제
  participant.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
    detachTrack(track, participant, publication)
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
const attachTrack = (track, participant, publication = null) => {
  const pid = participant.identity || 'unknown'

  if (track.kind === Track.Kind.Video) {
    // 화면 공유 트랙인지 확인
    const isScreenShare = publication?.source === Track.Source.ScreenShare || 
                         publication?.source === Track.Source.ScreenShareAudio ||
                         track.source === Track.Source.ScreenShare ||
                         track.source === Track.Source.ScreenShareAudio

    if (isScreenShare) {
      // 화면 공유 트랙 저장
      screenShareTracks.value.set(pid, { track, participant })
      
      // 화면 공유 참가자 정보 업데이트
      const participantName = getParticipantName(pid)
      activeScreenShare.value = {
        identity: pid,
        name: participantName || participant.name || pid
      }
      
      // 화면 공유 전용 비디오 요소에 attach
      setTimeout(() => {
        const screenShareElement = document.getElementById(`screen-share-${pid}`)
        if (screenShareElement) {
          track.attach(screenShareElement)
        } else {
          setTimeout(() => {
            const retryElement = document.getElementById(`screen-share-${pid}`)
            if (retryElement) {
              track.attach(retryElement)
            }
          }, 200)
        }
      }, 100)
    } else {
      // 일반 카메라 트랙
      // 화면 공유 모드에서는 participants-sidebar 안의 요소에 attach
      // 일반 모드에서는 participants-video 안의 요소에 attach
      const attachCameraTrack = (elementId) => {
        const videoElement = document.getElementById(elementId)
        if (videoElement) {
          // 기존 트랙이 있으면 먼저 detach
          if (videoElement.srcObject) {
            const existingTracks = videoElement.srcObject.getVideoTracks()
            existingTracks.forEach(t => {
              if (t !== track.mediaStreamTrack) {
                t.stop()
              }
            })
          }
          track.attach(videoElement)
          return true
        }
        return false
      }
      
      // 먼저 직접 요소 찾기 시도
      if (!attachCameraTrack(`video-${pid}`)) {
        // Vue의 반응형 시스템이 DOM을 업데이트할 때까지 기다림
        setTimeout(() => {
          if (!attachCameraTrack(`video-${pid}`)) {
            // 추가 재시도 (화면 공유 모드 전환 시 DOM이 늦게 업데이트될 수 있음)
            setTimeout(() => {
              attachCameraTrack(`video-${pid}`)
            }, 300)
          }
        }, 100)
      }
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
const detachTrack = (track, participant, publication = null) => {
  const pid = participant.identity

  if (track.kind === Track.Kind.Video) {
    // 화면 공유 트랙인지 확인
    const isScreenShare = publication?.source === Track.Source.ScreenShare || 
                         publication?.source === Track.Source.ScreenShareAudio ||
                         track.source === Track.Source.ScreenShare ||
                         track.source === Track.Source.ScreenShareAudio

    if (isScreenShare) {
      // 화면 공유 트랙 제거
      screenShareTracks.value.delete(pid)
      
      // 화면 공유 상태 업데이트
      if (activeScreenShare.value?.identity === pid) {
        activeScreenShare.value = null
      }
      
      // 화면 공유 비디오 요소에서 detach
      const screenShareElement = document.getElementById(`screen-share-${pid}`)
      if (screenShareElement) {
        track.detach(screenShareElement)
      }
      
      // 확대된 화면이 화면 공유였다면 닫기
      if (expandedVideo.value?.id === pid && expandedVideo.value?.type === 'screen-share') {
        closeExpandedVideo()
      }
    } else {
      // 일반 카메라 트랙
      const videoElement = document.getElementById(`video-${pid}`)
      if (videoElement) {
        track.detach(videoElement)
        // template에 있는 요소는 remove하지 않음
      }
      
      // 확대된 화면이 카메라였다면 닫기
      if (expandedVideo.value?.id === pid && expandedVideo.value?.type === 'camera') {
        closeExpandedVideo()
      }
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
    const response = await meetingApi.startRecording(authStore.memberSeq, props.roomId)
    
    isRecording.value = true
  } catch (err) {
    alert('녹화 시작에 실패했습니다: ' + (err.message || err))
  }
}

// 모든 참여자가 나갔는지 확인

// 콜 종료
const endCall = async () => {
  // 이미 종료 중이면 중복 호출 방지
  if (isEndingCall.value) {
    return
  }
  
  isEndingCall.value = true
  
  try {
    // LiveKit 방 나가기 (Webhook이 자동으로 회의 종료 처리함)
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
  }
}

// 비디오 확대 (풀스크린)
const expandVideo = (participantId, type) => {
  if (!participantId) return
  
  const participantName = type === 'screen-share' 
    ? (getParticipantName(activeScreenShare.value?.identity) || activeScreenShare.value?.name || participantId)
    : (getParticipantName(participantId) || 
       remoteParticipants.value.find(p => p.identity === participantId)?.name || 
       (participantId === localParticipantIdentity.value ? authStore.user?.name : null) ||
       participantId)
  
  expandedVideo.value = {
    id: participantId,
    name: participantName,
    type: type
  }
  
  // 다음 틱에서 트랙을 확대된 비디오 요소에 attach
  setTimeout(() => {
    const expandedElement = document.getElementById(`expanded-${participantId}-${type}`)
    if (!expandedElement) return
    
    if (type === 'screen-share') {
      const screenShareData = screenShareTracks.value.get(participantId)
      if (screenShareData?.track) {
        screenShareData.track.attach(expandedElement)
      }
    } else {
      // 카메라 트랙 찾기
      const participant = participantId === localParticipantIdentity.value
        ? room.value?.localParticipant
        : Array.from(room.value?.remoteParticipants.values()).find(p => p.identity === participantId)
      
      if (participant) {
        participant.trackPublications.forEach((pub) => {
          if (pub.track && pub.track.kind === Track.Kind.Video && 
              pub.source !== Track.Source.ScreenShare && 
              pub.source !== Track.Source.ScreenShareAudio) {
            pub.track.attach(expandedElement)
          }
        })
      }
    }
  }, 100)
  
  // ESC 키로 닫기
  document.addEventListener('keydown', handleEscKey)
}

// 확대된 비디오 닫기
const closeExpandedVideo = () => {
  if (!expandedVideo.value) return
  
  const { id, type } = expandedVideo.value
  
  // 트랙을 원래 위치로 다시 attach
  setTimeout(() => {
    const expandedElement = document.getElementById(`expanded-${id}-${type}`)
    if (expandedElement) {
      // 모든 트랙 detach
      if (expandedElement.srcObject) {
        const tracks = expandedElement.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      }
    }
    
    // 원래 위치의 비디오 요소에 다시 attach
    if (type === 'screen-share') {
      const screenShareElement = document.getElementById(`screen-share-${id}`)
      const screenShareData = screenShareTracks.value.get(id)
      if (screenShareElement && screenShareData?.track) {
        screenShareData.track.attach(screenShareElement)
      }
    } else {
      const videoElement = document.getElementById(`video-${id}`)
      if (videoElement) {
        const participant = id === localParticipantIdentity.value
          ? room.value?.localParticipant
          : Array.from(room.value?.remoteParticipants.values()).find(p => p.identity === id)
        
        if (participant) {
          participant.trackPublications.forEach((pub) => {
            if (pub.track && pub.track.kind === Track.Kind.Video && 
                pub.source !== Track.Source.ScreenShare && 
                pub.source !== Track.Source.ScreenShareAudio) {
              pub.track.attach(videoElement)
            }
          })
        }
      }
    }
  }, 100)
  
  expandedVideo.value = null
  document.removeEventListener('keydown', handleEscKey)
}

// ESC 키 핸들러
const handleEscKey = (e) => {
  if (e.key === 'Escape' && expandedVideo.value) {
    closeExpandedVideo()
  }
}

// 채팅 패널 토글
const toggleChat = () => {
  showChat.value = !showChat.value
}

// 모든 카메라 트랙을 다시 attach하는 함수
const reattachAllCameraTracks = async () => {
  if (!room.value) return
  
  await nextTick() // DOM 업데이트 대기
  
  // 로컬 참가자 카메라 트랙 재attach
  if (localParticipantIdentity.value) {
    const localVideoElement = document.getElementById(`video-${localParticipantIdentity.value}`)
    if (localVideoElement) {
      room.value.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track && pub.track.kind === Track.Kind.Video && 
            pub.source !== Track.Source.ScreenShare && 
            pub.source !== Track.Source.ScreenShareAudio) {
          pub.track.attach(localVideoElement)
        }
      })
    }
  }
  
  // 원격 참가자 카메라 트랙 재attach
  room.value.remoteParticipants.forEach((participant) => {
    const videoElement = document.getElementById(`video-${participant.identity}`)
    if (videoElement) {
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.track.kind === Track.Kind.Video && 
            pub.source !== Track.Source.ScreenShare && 
            pub.source !== Track.Source.ScreenShareAudio) {
          pub.track.attach(videoElement)
        }
      })
    }
  })
}

// 화면 공유 모드 변경 감지
watch(activeScreenShare, async (newVal, oldVal) => {
  // 화면 공유가 시작되거나 종료될 때
  if (newVal !== oldVal) {
    // DOM 업데이트 후 카메라 트랙 재attach
    await nextTick()
    await reattachAllCameraTracks()
  }
}, { immediate: false })

// 채팅 메시지 불러오기
const loadChatMessages = async () => {
  try {
    const response = await meetingApi.getMessages(
      authStore.memberSeq,
      props.roomId,
      0, // 첫 페이지
      50 // 최근 50개 메시지
    )
    
    // ResponseDto 구조: { success, code, message, data }
    // data가 Page 객체: { content: [...], totalElements: ... }
    const pageData = response.data || response
    const messagesArray = pageData.content || []
    
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
      
      // 채팅 스크롤을 맨 아래로
      setTimeout(() => {
        if (chatMessagesRef.value) {
          chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
        }
      }, 100)
    } else {
      chatMessages.value = []
    }
  } catch (err) {
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

/* 화면 공유 모드 스타일 */
.video-container.screen-share-mode {
  flex-direction: row;
  gap: 12px;
}

.main-screen-share-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.screen-share-video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.screen-share-video-wrapper:hover {
  opacity: 0.95;
}

.screen-share-video-wrapper:hover .expand-hint {
  opacity: 1;
}

.screen-share-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.screen-share-label {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.expand-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 10;
}

.participants-sidebar {
  width: 240px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
}

.participant-video-small {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: #333;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.participant-video-small:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.02);
}

.participant-video-small.my-video {
  border: 2px solid rgba(25, 118, 210, 0.5);
}

.participant-video {
  cursor: pointer;
  transition: all 0.2s ease;
}

.participant-video:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.02);
}

.participant-audio {
  display: none;
}

/* 확대된 비디오 모달 */
.expanded-video-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.expanded-video-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.expanded-video-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.expanded-video-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.close-expanded-btn {
  color: white !important;
}

.expanded-video-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.expanded-video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.expanded-video-footer {
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.expanded-video-footer :deep(.v-btn) {
  color: white !important;
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
