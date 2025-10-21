<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { usePermissions, PERMISSIONS } from "@/composables/usePermissions";
import PollModal from "./PollModal.vue";
import FileAttachmentModal from "./FileAttachmentModal.vue";
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import axios from "axios";

// JWT에서 payload 추출
const parseJwt = (token) => {
  try {
    const base64Payload = token.split(".")[1];
    const jsonPayload = decodeURIComponent(
      atob(base64Payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("❌ JWT 파싱 실패:", e);
    return null;
  }
};

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

// ✅ WebSocket 연결
const connectWebsocket = () => {
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!토큰 확인:", token.value);
  if (stompClient.value && stompClient.value.connected) return;

  const sockJs = new SockJS(
    `${import.meta.env.VITE_API_URL}/chat-service/connect`
  );
  stompClient.value = Stomp.over(sockJs);

  stompClient.value.connect(
    { Authorization: `Bearer ${token.value}` },
    () => {
      console.log("✅ WebSocket 연결 성공!");

      subscription.value = stompClient.value.subscribe(
        `/topic/${channelSeq.value}`,
        (message) => {
          try {
            const parsed = JSON.parse(message.body);
            console.log("📩 메시지 수신:", parsed);

            // ✅ 내가 보낸 메시지는 무시 (서버 broadcast에 포함되므로)
            if (Number(parsed.senderSeq) === Number(memberSeq.value)) return;

            // ✅ 파일 URL 파싱 (BE에서 chatMessageFileUrls 문자열로 전송됨)
            const urls = (parsed.chatMessageFileUrls || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

            const fileList = urls.map((url) => ({
              name: url.split("/").pop(),
              url,
              type: "file",
            }));

            // 💬 메시지 구조 변환 (사용자 정보 포함)
            const formattedMessage = {
              id: parsed.chatMessageSeq || Date.now(),
              user: parsed.senderName || parsed.senderSeq,
              content: parsed.chatMessageText,
              time: new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              avatar: (parsed.senderName || parsed.senderSeq)
                .toString()
                .charAt(0),
              profileImageUrl: parsed.senderProfileImageUrl || null,
              senderSeq: parsed.senderSeq,
              isOwn: parsed.senderSeq === memberSeq.value,
              unread: parsed.senderSeq !== memberSeq.value ? 1 : 0,
              files: fileList, // ✅ 추가
            };

            // 중복 메시지 방지 (자신이 보낸 메시지는 제외)
            const existingMessage = messages.value.find(
              (msg) =>
                msg.id === formattedMessage.id ||
                (msg.content === formattedMessage.content &&
                  msg.user === formattedMessage.user &&
                  msg.time === formattedMessage.time)
            );

            if (!existingMessage && parsed.senderSeq !== memberSeq.value) {
              messages.value.push(formattedMessage);
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
      console.error("❌ WebSocket 연결 실패:", error);
    }
  );
};

// ✅ WebSocket 연결 해제
const disconnectWebsocket = async () => {
  try {
    // 🟡 읽음 처리 API 호출
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
        console.log("🔌 WebSocket 연결 해제 완료");
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

// ✅ 파일 업로드 (S3 REST API 호출)
const uploadFilesToS3 = async () => {
  if (attachedFiles.value.length === 0) return [];

  const formData = new FormData();
  attachedFiles.value.forEach((file) => formData.append("files", file));

  const url = `${import.meta.env.VITE_API_URL}/chat-service/chat/files/upload/${
    channelSeq.value
  }`;

  try {
    const res = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token.value}`,
      },
    });

    console.log("✅ 파일 업로드 성공:", res.data);

    // ✅ 배열만 추출하도록 보정
    const urls = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.uploadedUrls)
      ? res.data.uploadedUrls
      : [];

    return urls;
  } catch (err) {
    console.error("❌ 파일 업로드 실패:", err.response?.data || err);
    return [];
  }
};

// // ✅ 파일 업로드 (S3 REST API 호출)
// const uploadFilesToS3 = async () => {
//   if (attachedFiles.value.length === 0) return [];

//   const formData = new FormData();
//   attachedFiles.value.forEach((file) => {
//     formData.append("files", file);
//   });

//   const url = `${import.meta.env.VITE_API_URL}/chat-service/chat/files/upload/${channelSeq.value}`;

//   try {
//     const res = await axios.post(url, formData, {
//       headers: {
//         "Content-Type": "multipart/form-data",
//         Authorization: `Bearer ${token.value}`,
//       },
//     });
//     console.log("✅ 파일 업로드 성공:", res.data);
//     // 서버가 ["https://s3...","https://s3..."] 형태로 반환함
//     return res.data;
//   } catch (err) {
//     console.error("❌ 파일 업로드 실패:", err.response?.data || err);
//     return [];
//   }
// };

// ✅ 메시지 전송
const sendMessage = async () => {
  console.log("===============sendMessage===============", memberSeq.value);
  if (!stompClient.value || !stompClient.value.connected) {
    console.error("WebSocket 연결이 없습니다!");
    return;
  }

  if (newMessage.value.trim() === "" && attachedFiles.value.length === 0)
    return;

  let uploadedUrls = [];
  if (attachedFiles.value.length > 0) {
    uploadedUrls = await uploadFilesToS3(); // 🔹 S3 업로드 먼저 실행
  }

  // 1️⃣ 전송할 메시지 데이터 생성 (사용자 정보 포함)
  const currentUserName = localStorage.getItem("memberName") || "사용자";
  const currentUserProfileImage =
    localStorage.getItem("profileImageUrl") || null;

  const message = {
    senderSeq: memberSeq.value,
    senderName: currentUserName,
    senderProfileImageUrl: currentUserProfileImage,
    chatMessageText: newMessage.value,
    chatMessageFileUrls: uploadedUrls.join(","), // 🔹 S3 URL 문자열로 전달
  };

  // 2️⃣ 즉시 화면에 표시 (로컬 메시지)
  const localMessage = {
    id: Date.now(),
    user: currentUserName,
    content: newMessage.value,
    time: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avatar: currentUserName.charAt(0),
    profileImageUrl: currentUserProfileImage,
    senderSeq: memberSeq.value,
    isOwn: true,
    unread: 0,
    files: uploadedUrls.map((url) => ({
      name: url.split("/").pop(),
      url,
      type: "file",
    })),
  };
  messages.value.push(localMessage);
  scrollToBottom();

  console.log("📤 보내는 메시지:", message);

  // 3️⃣ WebSocket 전송
  stompClient.value.send(
    `/publish/${channelSeq.value}`,
    JSON.stringify(message),
    { Authorization: `Bearer ${token.value}` }
  );

  // 4️⃣ 입력창 초기화
  newMessage.value = "";
  attachedFiles.value = [];
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
  const currentUserName = localStorage.getItem("memberName") || "나";
  const currentUserProfileImage =
    localStorage.getItem("profileImageUrl") || null;

  const pollMessage = {
    id: Date.now(),
    user: currentUserName,
    content: `📊 **${pollData.title}**`,
    time: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avatar: currentUserName.charAt(0),
    profileImageUrl: currentUserProfileImage,
    senderSeq: memberSeq.value,
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

  const workspaceSeq = 4;
  channelSeq.value = 1;

  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    console.error("❌ 로그인이 필요합니다. accessToken이 없습니다.");
    return;
  }

  token.value = accessToken;

  // ✅ accessToken에서 memberSeq 추출
  const payload = parseJwt(accessToken.replace("Bearer ", ""));
  if (payload && payload.memberSeq) {
    memberSeq.value = payload.memberSeq;
  } else if (payload && payload.sub) {
    memberSeq.value = payload.sub; // 일부 시스템은 sub를 member ID로 씀
  }

  console.log("🟢 Chat 시작");
  console.log("- channelSeq:", channelSeq.value);
  console.log("- memberSeq:", memberSeq.value);
  console.log("- JWT payload:", payload);

  // ✅ memberSeq 값이 유효할 때만 연결
  if (memberSeq.value > 0) {
    connectWebsocket();
  } else {
    console.error(
      "❌ memberSeq가 유효하지 않습니다. JWT payload를 확인하세요."
    );
  }
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
              <div v-if="!message.isOwn" class="message-avatar">
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
                    v-if="Array.isArray(message.files) && message.files.length"
                    class="message-files"
                  >
                    <div
                      v-for="(file, i) in message.files"
                      :key="i"
                      class="message-file-item"
                    >
                      <v-icon class="mr-2">mdi-file</v-icon>
                      <a
                        :href="file.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="file-name"
                      >
                        {{ file.name }}
                      </a>
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
              v-if="isTyping || attachedFiles.length > 0"
              color="primary"
              icon
              class="send-btn"
              @click="sendMessage"
              :disabled="!newMessage.trim() && attachedFiles.length === 0"
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
  right: -50px;
  bottom: 0;
}

.message-item.own-message .message-meta {
  left: -50px;
  right: auto;
}

.message-time {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  padding: 0px 0px;
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
