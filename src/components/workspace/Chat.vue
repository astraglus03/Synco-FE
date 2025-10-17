<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { usePermissions, PERMISSIONS } from "@/composables/usePermissions";
import PollModal from "./PollModal.vue";
import FileAttachmentModal from "./FileAttachmentModal.vue";
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import axios from "axios";

const props = defineProps({
  currentChannel: String,
});

const { hasPermission, isManager, isSuper } = usePermissions();

// WebSocket 관련 상태
const stompClient = ref(null);
const subscription = ref(null);
const token = ref("");
const channelSeq = ref(null);
const memberSeq = ref(0);

// 채널 목록
const channels = ref([
  { id: "general", name: "일반", type: "text", unread: 3 },
  { id: "marketing", name: "마케팅", type: "text", unread: 0 },
  { id: "development", name: "개발", type: "text", unread: 1 },
]);

// 현재 채널
const currentChannel = ref("general");

// 실제 메시지 데이터 (WebSocket에서 받아온 메시지들)
const messages = ref([]);

// 새 메시지
const newMessage = ref("");

// 메시지 입력 관련 상태
const showAttachmentMenu = ref(false);
const isTyping = ref(false);
const messageInputFocused = ref(false);
const otherTyping = ref(false);

// 모달 관련
const showPollModal = ref(false);
const showFileModal = ref(false);

// 첨부된 파일들
const attachedFiles = ref([]);

// WebSocket 연결
const connectWebsocket = () => {
  if (stompClient.value && stompClient.value.connected) return;

  const sockJs = new SockJS(
    `${import.meta.env.VITE_API_URL}/chat-service/connect`
  );
  stompClient.value = Stomp.over(sockJs);

  stompClient.value.connect(
    { Authorization: `Bearer ${token.value}` },
    () => {
      console.log("WebSocket 연결 성공!");
      // 구독
      subscription.value = stompClient.value.subscribe(
        `/topic/${channelSeq.value}`,
        (message) => {
          try {
            const parsed = JSON.parse(message.body);
            console.log("메시지 수신:", parsed);

            // 메시지 형식을 Chat.vue 형식으로 변환
            const formattedMessage = {
              id: parsed.chatMessageSeq || Date.now(),
              user: parsed.senderName || parsed.senderSeq,
              content: parsed.chatMessageText,
              time: new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              avatar: (parsed.senderName || parsed.senderSeq).charAt(0),
              isOwn: parsed.senderSeq === memberSeq.value,
              unread: parsed.senderSeq !== memberSeq.value ? 1 : 0,
            };

            // 자신이 보낸 메시지가 아닌 경우에만 추가 (중복 방지)
            if (parsed.senderSeq !== memberSeq.value) {
              messages.value.push(formattedMessage);
              console.log("메시지 추가됨:", formattedMessage);
              scrollToBottom();
            }
          } catch (e) {
            console.error("메시지 파싱 실패:", e, message.body);
          }
        },
        { Authorization: `Bearer ${token.value}` }
      );
    },
    (error) => {
      console.error("WebSocket 연결 실패:", error);
    }
  );
};

// WebSocket 연결 해제
const disconnectWebsocket = async () => {
  try {
    // 읽음 처리 API
    await axios.post(
      `${import.meta.env.VITE_API_URL}/chat/room/${channelSeq.value}/read`
    );
  } catch (e) {
    console.warn("읽음 처리 실패:", e);
  }

  try {
    if (subscription.value) {
      subscription.value.unsubscribe();
      subscription.value = null;
    }
    if (stompClient.value && stompClient.value.connected) {
      stompClient.value.disconnect(() => {
        // disconnected
      });
    }
  } catch (e) {
    console.warn("WebSocket 해제 중 오류:", e);
  } finally {
    stompClient.value = null;
  }
};

// 스크롤을 맨 아래로
const scrollToBottom = () => {
  setTimeout(() => {
    const chatBox = document.querySelector(".messages-container");
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  }, 100);
};

// 메시지 전송
const sendMessage = () => {
  if (!stompClient.value || !stompClient.value.connected) {
    console.error("WebSocket 연결이 없습니다!");
    return;
  }
  if (newMessage.value.trim() === "") return;

  const message = {
    senderSeq: memberSeq.value,
    messageType: "TEXT",
    chatMessageText: newMessage.value,
  };

  // 즉시 UI에 메시지 표시 (자신이 보낸 메시지)
  const immediateMessage = {
    id: Date.now(),
    user: "나",
    content: newMessage.value,
    time: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avatar: "나",
    isOwn: true,
    unread: 0,
  };

  messages.value.push(immediateMessage);
  console.log("메시지 전송:", message);
  console.log("즉시 메시지 추가:", immediateMessage);

  // webstomp-client: send(destination, body, headers)
  stompClient.value.send(
    `/publish/${channelSeq.value}`,
    JSON.stringify(message),
    { Authorization: `Bearer ${token.value}` }
  );

  newMessage.value = "";
  attachedFiles.value = [];
  isTyping.value = false;
  showAttachmentMenu.value = false;

  scrollToBottom();
};

// 채널 생성
const createChannel = () => {
  if (hasPermission(PERMISSIONS.CREATE_CHANNEL)) {
    const channelName = prompt("새 채널 이름을 입력하세요:");
    if (channelName && channelName.trim()) {
      const newChannel = {
        id: `channel_${Date.now()}`,
        name: channelName.trim(),
        type: "text",
        unread: 0,
      };
      channels.value.push(newChannel);
      console.log("새 채널 생성:", newChannel);
    }
  }
};

// 채널 변경 시 WebSocket 재연결
const changeChannel = (channelId) => {
  if (currentChannel.value === channelId) return;

  // 기존 연결 해제
  disconnectWebsocket();

  // 새 채널로 변경
  currentChannel.value = channelId;
  channelSeq.value = channelId;
  messages.value = [];

  // 새 채널로 연결
  connectWebsocket();
};

// 하위 채널 선택 이벤트 처리
const handleSubChannelSelect = (event) => {
  const { parentId, subChannelId } = event.detail;
  if (parentId === "chat") {
    changeChannel(subChannelId);
  }
};

// Enter 키로 메시지 전송
const handleKeyPress = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 첨부파일 메뉴 토글
const toggleAttachmentMenu = () => {
  showAttachmentMenu.value = !showAttachmentMenu.value;
};

// 모달 관련 함수들
const openPollModal = () => {
  showPollModal.value = true;
  showAttachmentMenu.value = false;
};

const openFileModal = () => {
  showFileModal.value = true;
  showAttachmentMenu.value = false;
};

const handleCreatePoll = (pollData) => {
  // 투표 메시지 생성
  const pollMessage = {
    id: Date.now(),
    user: "나",
    content: `📊 **${pollData.title}**`,
    time: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avatar: "나",
    isOwn: true,
    type: "poll",
    pollData: pollData,
  };

  messages.value.push(pollMessage);
  newMessage.value = "";
  isTyping.value = false;
  showAttachmentMenu.value = false;
};

const handleAttachFiles = (files) => {
  // 첨부된 파일들을 attachedFiles에 추가
  attachedFiles.value.push(...files);
  showAttachmentMenu.value = false;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (fileType) => {
  if (fileType.startsWith("image/")) return "mdi-image";
  if (fileType.startsWith("video/")) return "mdi-video";
  if (fileType.startsWith("audio/")) return "mdi-music";
  if (fileType.includes("pdf")) return "mdi-file-pdf-box";
  if (fileType.includes("word")) return "mdi-file-word-box";
  if (fileType.includes("excel") || fileType.includes("spreadsheet"))
    return "mdi-file-excel-box";
  if (fileType.includes("powerpoint") || fileType.includes("presentation"))
    return "mdi-file-powerpoint-box";
  return "mdi-file";
};

const removeAttachedFile = (index) => {
  attachedFiles.value.splice(index, 1);
};

// 메시지 입력 포커스 처리
const handleInputFocus = () => {
  messageInputFocused.value = true;
  showAttachmentMenu.value = false;
};

const handleInputBlur = () => {
  messageInputFocused.value = false;
};

// 메시지 입력 변화 감지
const handleInputChange = () => {
  isTyping.value = newMessage.value.length > 0;
};

// 이벤트 리스너 등록/해제
onMounted(() => {
  window.addEventListener("select-chat-channel", handleSubChannelSelect);

  // 초기화
  channelSeq.value = currentChannel.value;
  memberSeq.value = Number(localStorage.getItem("memberSeq")) || 0;

  console.log("Chat 컴포넌트 초기화:");
  console.log("- channelSeq:", channelSeq.value);
  console.log("- memberSeq:", memberSeq.value);
  console.log("- currentChannel:", currentChannel.value);

  // 토큰 설정 (실서비스에서는 저장소에서 읽어와야 함)
  token.value =
    "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzYwNzAzNzI3LCJleHAiOjE3NjA3MDU1Mjd9.2V9Ad2M2QLSzpoLK-z-XBk27pcTo0kPQeaKGErm5PxmP-VBVLO_gb1yr3oKGadhfGZ0tHtLniNCubNZ3e1ynIQ";

  // WebSocket 연결
  console.log("WebSocket 연결 시도...");
  connectWebsocket();
});

onUnmounted(() => {
  window.removeEventListener("select-chat-channel", handleSubChannelSelect);
  disconnectWebsocket();
});
</script>

<template>
  <div class="team-chat">
    <!-- 채팅 영역 -->
    <div class="chat-area">
      <!-- 채팅 헤더 -->
      <div class="chat-header">
        <div class="channel-info">
          <v-icon>mdi-pound</v-icon>
          <v-select
            v-model="currentChannel"
            :items="channels"
            item-title="name"
            item-value="id"
            variant="plain"
            density="compact"
            hide-details
            @update:model-value="changeChannel"
            class="channel-select"
          />
        </div>
        <div class="channel-actions">
          <v-btn
            v-if="hasPermission(PERMISSIONS.CREATE_CHANNEL)"
            color="primary"
            prepend-icon="mdi-plus"
            @click="createChannel"
          >
            채널 생성
          </v-btn>
        </div>
      </div>

      <!-- 메시지 목록 -->
      <div class="messages-container">
        <div class="messages-list">
          <div
            v-for="(message, index) in messages"
            :key="message.id"
            class="message-item"
            :class="{
              'own-message': message.isOwn,
              consecutive:
                !message.isOwn &&
                index > 0 &&
                messages[index - 1].user === message.user &&
                !messages[index - 1].isOwn,
              'first-in-group':
                !message.isOwn &&
                (index === 0 ||
                  messages[index - 1].user !== message.user ||
                  messages[index - 1].isOwn),
            }"
          >
            <div class="message-content">
              <!-- 프로필 아바타 (상대방 메시지의 첫 번째만) -->
              <div
                v-if="
                  !message.isOwn &&
                  (index === 0 ||
                    messages[index - 1].user !== message.user ||
                    messages[index - 1].isOwn)
                "
                class="message-avatar"
              >
                {{ message.avatar }}
              </div>

              <div class="message-group">
                <!-- 발신자 이름 (상대방 메시지의 첫 번째만) -->
                <div
                  v-if="
                    !message.isOwn &&
                    (index === 0 ||
                      messages[index - 1].user !== message.user ||
                      messages[index - 1].isOwn)
                  "
                  class="message-sender"
                >
                  {{ message.user }}
                </div>

                <div class="message-bubble">
                  <div v-if="message.content" class="message-text">
                    {{ message.content }}
                  </div>

                  <!-- 첨부된 파일들 표시 -->
                  <div
                    v-if="message.files && message.files.length > 0"
                    class="message-files"
                  >
                    <div
                      v-for="(file, fileIndex) in message.files"
                      :key="fileIndex"
                      class="message-file-item"
                    >
                      <v-icon class="mr-2">{{ getFileIcon(file.type) }}</v-icon>
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size"
                        >({{ formatFileSize(file.size) }})</span
                      >
                    </div>
                  </div>
                </div>

                <!-- 메시지 메타 정보 (시간, 안읽음수) -->
                <div class="message-meta">
                  <div
                    v-if="!message.isOwn && message.unread"
                    class="unread-count"
                  >
                    {{ message.unread }}
                  </div>
                  <div class="message-time">{{ message.time }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 타이핑 인디케이터 (상대방이 입력 중일 때) -->
      <div v-if="otherTyping" class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text">김민수님이 입력 중...</span>
      </div>

      <!-- 메시지 입력 -->
      <div class="message-input-container">
        <!-- 첨부파일 메뉴 -->
        <div v-if="showAttachmentMenu" class="attachment-menu">
          <div class="attachment-item" @click="openPollModal">
            <div class="attachment-icon poll-icon">
              <v-icon>mdi-poll</v-icon>
            </div>
            <div class="attachment-text">
              <div class="attachment-title">투표</div>
              <div class="attachment-desc">팀원들의 의견을 수집해보세요</div>
            </div>
          </div>
          <div class="attachment-item" @click="openFileModal">
            <div class="attachment-icon file-icon">
              <v-icon>mdi-attachment</v-icon>
            </div>
            <div class="attachment-text">
              <div class="attachment-title">파일 첨부</div>
              <div class="attachment-desc">
                문서, 이미지, 동영상을 공유하세요
              </div>
            </div>
          </div>
        </div>

        <!-- 첨부된 파일들 표시 -->
        <div v-if="attachedFiles.length > 0" class="attached-files">
          <div
            v-for="(file, index) in attachedFiles"
            :key="index"
            class="attached-file-item"
          >
            <v-icon class="mr-2">{{ getFileIcon(file.type) }}</v-icon>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">({{ formatFileSize(file.size) }})</span>
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              @click="removeAttachedFile(index)"
            ></v-btn>
          </div>
        </div>

        <!-- 메시지 입력 영역 -->
        <div
          class="message-input"
          :class="{ focused: messageInputFocused, typing: isTyping }"
        >
          <!-- 첨부파일 버튼 -->
          <div class="input-actions">
            <v-btn
              icon
              variant="text"
              class="attachment-btn"
              :class="{ active: showAttachmentMenu }"
              @click="toggleAttachmentMenu"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <!-- 메시지 입력 필드 -->
          <div class="input-field">
            <v-textarea
              v-model="newMessage"
              placeholder="메시지를 입력하세요..."
              variant="plain"
              rows="1"
              auto-grow
              hide-details
              class="message-textarea"
              @keypress="handleKeyPress"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
              @input="handleInputChange"
            />
          </div>

          <!-- 전송 버튼 -->
          <div class="send-actions">
            <v-btn
              v-if="isTyping"
              color="primary"
              icon
              class="send-btn"
              @click="sendMessage"
              :disabled="!newMessage.trim()"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- 투표 모달 -->
    <PollModal v-model="showPollModal" @create-poll="handleCreatePoll" />

    <!-- 파일 첨부 모달 -->
    <FileAttachmentModal
      v-model="showFileModal"
      @attach-files="handleAttachFiles"
    />
  </div>
</template>

<style scoped>
.team-chat {
  height: calc(100vh - 60px);
  background: rgb(var(--v-theme-background));
}

.chat-area {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.channel-select {
  min-width: 120px;
}

.channel-select :deep(.v-field__input) {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.channel-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 8px;
}

.message-item.own-message {
  justify-content: flex-end;
}

.message-item.consecutive {
  margin-top: 2px;
}

.message-item.first-in-group {
  margin-top: 16px;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
}

.message-item.own-message .message-content {
  flex-direction: row-reverse;
}

.message-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
}

.message-item.own-message .message-group {
  align-items: flex-end;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 4px;
}

.message-bubble {
  background: rgb(var(--v-theme-surface));
  padding: 8px 12px;
  border-radius: 18px;
  color: rgb(var(--v-theme-on-surface));
  word-wrap: break-word;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  backdrop-filter: blur(10px);
  flex: 1;
  position: relative;
}

.message-item.consecutive .message-bubble {
  border-radius: 4px 18px 18px 18px;
}

.message-item.own-message .message-bubble {
  background: rgb(var(--v-theme-primary));
  color: #ffffff !important;
  font-weight: 600;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 18px 18px 4px 18px;
}

.message-item.own-message.consecutive .message-bubble {
  border-radius: 18px 4px 18px 18px;
}

.message-sender {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}

.message-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin-top: 4px;
  position: absolute;
  right: -35px;
  bottom: 0;
}

.message-item.own-message .message-meta {
  left: -35px;
  right: auto;
}

.message-time {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
}

.unread-count {
  background: rgb(var(--v-theme-primary));
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* 메시지 입력 컨테이너 */
.message-input-container {
  position: relative;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

/* 첨부파일 메뉴 */
.attachment-menu {
  position: absolute;
  bottom: 100%;
  left: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 8px;
  margin-bottom: 8px;
  z-index: 10;
  min-width: 280px;
  backdrop-filter: blur(10px);
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attachment-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.attachment-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.poll-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.file-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.attachment-text {
  flex: 1;
}

.attachment-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 2px;
}

.attachment-desc {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.3;
}

/* 메시지 입력 영역 */
.message-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgb(var(--v-theme-surface));
  transition: all 0.3s ease;
  position: relative;
}

.message-input.focused {
  background: rgba(var(--v-theme-primary), 0.02);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.2);
}

.message-input.typing {
  background: rgba(var(--v-theme-primary), 0.05);
}

/* 입력 액션 버튼들 */
.input-actions {
  display: flex;
  align-items: center;
}

.attachment-btn {
  width: 52px !important;
  height: 52px !important;
  min-width: 52px !important;
  min-height: 52px !important;
  border-radius: 12px;
  transition: all 0.2s ease;
  color: rgba(var(--v-theme-on-surface), 0.6);
  background: rgba(var(--v-theme-primary), 0.1);
}

.attachment-btn:hover {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-primary));
  transform: scale(1.05);
}

.attachment-btn.active {
  background: rgb(var(--v-theme-primary));
  color: white;
  transform: rotate(45deg);
}

/* 입력 필드 */
.input-field {
  flex: 1;
  position: relative;
}

.message-textarea {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 16px;
  padding: 16px 16px;
  font-size: 14px;
  line-height: 1.2;
  transition: all 0.3s ease;
  height: 52px;
  max-height: 120px;
  resize: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.message-textarea:focus {
  background: white;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.message-textarea::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 14px;
  line-height: 1.4;
}

/* 전송 액션 버튼들 */
.send-actions {
  display: flex;
  align-items: center;
}

.send-btn {
  width: 52px !important;
  height: 52px !important;
  min-width: 52px !important;
  min-height: 52px !important;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: rgb(var(--v-theme-primary));
  color: white;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.3);
}

.send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  transform: none;
  box-shadow: none;
}

/* 타이핑 인디케이터 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 12px;
  background: rgba(var(--v-theme-primary), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-text {
  font-size: 12px;
  font-style: italic;
}

/* 첨부된 파일들 표시 */
.attached-files {
  padding: 12px 16px;
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
  border-radius: 12px;
  margin-bottom: 8px;
}

.attached-file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.attached-file-item:last-child {
  margin-bottom: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-right: 8px;
}

.file-size {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-right: 8px;
}

/* 메시지 내 파일 표시 */
.message-files {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.message-file-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 13px;
}

.message-file-item:last-child {
  margin-bottom: 0;
}

.message-file-item .file-name {
  font-size: 13px;
  margin-right: 6px;
}

.message-file-item .file-size {
  font-size: 11px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }

  .messages-container {
    padding: 12px 16px;
  }

  .message-input {
    padding: 12px 16px;
  }

  .message-content {
    max-width: 85%;
  }

  .attachment-menu {
    left: 8px;
    right: 8px;
    min-width: auto;
  }

  .message-input-container {
    padding: 0;
  }

  .message-textarea {
    font-size: 16px; /* iOS 줌 방지 */
  }
}
</style>
