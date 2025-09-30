<template>
  <div class="chat-demo">
    <div class="demo-chat-container">
      <div class="demo-chat-header">
        <div class="channel-info">
          <v-icon size="20" color="primary">mdi-chat</v-icon>
          <span>일반 채팅</span>
          <div class="online-indicator">
            <div class="dot"></div>
            <span>12명 온라인</span>
          </div>
        </div>
      </div>
      
      <div class="demo-messages">
        <div class="message-item" v-for="(message, index) in messages" :key="index" :class="{ 'typing': message.typing }">
          <div class="message-avatar">
            <div class="avatar-circle">{{ message.user.charAt(0) }}</div>
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="username">{{ message.user }}</span>
              <span class="timestamp">{{ message.time }}</span>
            </div>
            <div class="message-text" v-if="!message.typing">{{ message.text }}</div>
            <div class="typing-indicator" v-else>
              <div class="typing-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="demo-input">
        <div class="input-container">
          <input 
            type="text" 
            placeholder="메시지를 입력하세요..." 
            v-model="newMessage"
            @keyup.enter="sendMessage"
          />
          <v-icon color="primary">mdi-send</v-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const newMessage = ref('')
const messages = ref([
  {
    user: '김민수',
    text: '프로젝트 기획서 검토 완료했습니다!',
    time: '오후 2:30',
    typing: false
  },
  {
    user: '박지영',
    text: '좋습니다! 다음 단계로 진행하겠습니다.',
    time: '오후 2:32',
    typing: false
  },
  {
    user: '이준호',
    text: '화상회의는 언제 시작하나요?',
    time: '오후 2:35',
    typing: false
  },
  {
    user: '최유진',
    text: '',
    time: '오후 2:36',
    typing: true
  }
])

const sendMessage = () => {
  if (newMessage.value.trim()) {
    messages.value.push({
      user: '당신',
      text: newMessage.value,
      time: '지금',
      typing: false
    })
    newMessage.value = ''
  }
}

onMounted(() => {
  // 타이핑 애니메이션 효과
  setTimeout(() => {
    const typingMessage = messages.value.find(m => m.typing)
    if (typingMessage) {
      typingMessage.typing = false
      typingMessage.text = '3시에 시작하겠습니다!'
    }
  }, 2000)
})
</script>

<style scoped>
.chat-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f0f23;
}

.demo-chat-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a2e;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f8fafc;
  font-weight: 600;
}

.online-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
  color: #10b981;
  font-size: 0.875rem;
}

.online-indicator .dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.demo-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  max-height: 300px;
}

.message-item {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  animation: slideInUp 0.5s ease-out;
}

.message-item.typing {
  animation: slideInUp 0.5s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  flex-shrink: 0;
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.username {
  font-weight: 600;
  color: #f8fafc;
  font-size: 0.875rem;
}

.timestamp {
  font-size: 0.75rem;
  color: #64748b;
}

.message-text {
  color: #cbd5e1;
  line-height: 1.4;
  font-size: 0.875rem;
}

.typing-indicator {
  display: flex;
  align-items: center;
}

.typing-dots {
  display: flex;
  gap: 0.25rem;
}

.typing-dots .dot {
  width: 6px;
  height: 6px;
  background: #64748b;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots .dot:nth-child(1) { animation-delay: 0s; }
.typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

.demo-input {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #1a1a2e;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #0f0f23;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  transition: border-color 0.3s ease;
}

.input-container:focus-within {
  border-color: #3b82f6;
}

.input-container input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 0.875rem;
  outline: none;
}

.input-container input::placeholder {
  color: #64748b;
}

.input-container input:focus {
  outline: none;
}
</style>
