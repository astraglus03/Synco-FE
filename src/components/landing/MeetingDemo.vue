<template>
  <div class="meeting-demo">
    <div class="demo-meeting-container">
      <div class="meeting-header">
        <div class="meeting-info">
          <v-icon size="20" color="success">mdi-video</v-icon>
          <span>팀 미팅 - 프로젝트 리뷰</span>
          <div class="participant-count">
            <v-icon size="16">mdi-account-group</v-icon>
            <span>4명 참여</span>
          </div>
        </div>
        <div class="meeting-controls">
          <v-btn size="small" color="error" variant="outlined">
            <v-icon>mdi-microphone-off</v-icon>
          </v-btn>
          <v-btn size="small" color="error" variant="outlined">
            <v-icon>mdi-video-off</v-icon>
          </v-btn>
          <v-btn size="small" color="primary">
            <v-icon>mdi-screen-share</v-icon>
          </v-btn>
        </div>
      </div>
      
      <div class="meeting-grid">
        <div class="participant" v-for="(participant, index) in participants" :key="index" :class="{ 'speaking': participant.speaking }">
          <div class="participant-video">
            <div class="video-placeholder">
              <v-icon size="48" color="primary">mdi-account</v-icon>
            </div>
            <div class="participant-info">
              <span class="name">{{ participant.name }}</span>
              <div class="status-indicators">
                <v-icon v-if="participant.muted" size="16" color="error">mdi-microphone-off</v-icon>
                <v-icon v-if="!participant.video" size="16" color="error">mdi-video-off</v-icon>
                <div v-if="participant.speaking" class="speaking-indicator"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="meeting-chat">
        <div class="chat-header">
          <span>채팅</span>
          <v-icon size="16">mdi-chat</v-icon>
        </div>
        <div class="chat-messages">
          <div class="chat-message" v-for="(message, index) in chatMessages" :key="index">
            <span class="sender">{{ message.sender }}:</span>
            <span class="text">{{ message.text }}</span>
          </div>
        </div>
        <div class="chat-input">
          <input type="text" placeholder="메시지 입력..." />
          <v-icon size="16" color="primary">mdi-send</v-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const participants = ref([
  {
    name: '김민수',
    muted: false,
    video: true,
    speaking: true
  },
  {
    name: '박지영',
    muted: true,
    video: true,
    speaking: false
  },
  {
    name: '이준호',
    muted: false,
    video: false,
    speaking: false
  },
  {
    name: '최유진',
    muted: false,
    video: true,
    speaking: false
  }
])

const chatMessages = ref([
  {
    sender: '박지영',
    text: '화면 공유해주세요'
  },
  {
    sender: '김민수',
    text: '네, 지금 공유하겠습니다'
  },
  {
    sender: '이준호',
    text: '좋습니다!'
  }
])

onMounted(() => {
  // 발언자 변경 애니메이션
  setInterval(() => {
    participants.value.forEach(p => p.speaking = false)
    const randomIndex = Math.floor(Math.random() * participants.value.length)
    participants.value[randomIndex].speaking = true
  }, 3000)
})
</script>

<style scoped>
.meeting-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-meeting-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f0f23;
}

.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #1a1a2e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.meeting-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f8fafc;
  font-weight: 600;
}

.participant-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 1rem;
  color: #cbd5e1;
  font-size: 0.875rem;
}

.meeting-controls {
  display: flex;
  gap: 0.5rem;
}

.meeting-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1rem;
  min-height: 200px;
}

.participant {
  background: #1a1a2e;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
}

.participant.speaking {
  border-color: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  animation: speakingPulse 2s infinite;
}

@keyframes speakingPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
  }
}

.participant-video {
  position: relative;
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  background: #0f0f23;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.participant-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name {
  color: #f8fafc;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.speaking-indicator {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.meeting-chat {
  height: 150px;
  background: #1a1a2e;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-weight: 600;
  font-size: 0.875rem;
}

.chat-messages {
  flex: 1;
  padding: 0.75rem 1rem;
  overflow-y: auto;
  max-height: 80px;
}

.chat-message {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.sender {
  color: #3b82f6;
  font-weight: 600;
  margin-right: 0.5rem;
}

.text {
  color: #cbd5e1;
}

.chat-input {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  gap: 0.5rem;
}

.chat-input input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 0.875rem;
  outline: none;
}

.chat-input input::placeholder {
  color: #64748b;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .meeting-grid {
    grid-template-columns: 1fr;
  }
  
  .meeting-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .meeting-controls {
    width: 100%;
    justify-content: center;
  }
}
</style>
