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

// 답장 관련 상태
const replyToMessage = ref(null);
const showReplyInput = ref(false);

// 컨텍스트 메뉴 관련 상태
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const selectedMessage = ref(null);

// @ 언급 관련 상태
const mentionList = ref([]);
const showMentionDropdown = ref(false);
const mentionStartIndex = ref(-1);
const mentionEndIndex = ref(-1);
const filteredMentions = ref([]);

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

            // // ✅ 내가 보낸 메시지는 무시 (서버 broadcast에 포함되므로)
            // if (Number(parsed.senderSeq) === Number(memberSeq.value)) return;

            // 🟩 1️⃣ 서버에서 다시 받은 내 메시지가 temp_로 이미 표시된 경우 → 교체 처리
            if (Number(parsed.senderSeq) === Number(memberSeq.value)) {
              const tempMsgIndex = messages.value.findIndex(
                (msg) =>
                  msg.isOwn &&
                  msg.content === parsed.chatMessageText &&
                  msg.messageType === parsed.messageType
              );

              if (tempMsgIndex !== -1) {
                // 🟩 temp_ 메시지 → 실제 chatMessageSeq로 교체
                messages.value[tempMsgIndex].id = parsed.chatMessageSeq;
                messages.value[tempMsgIndex].replyToSeq =
                  parsed.replyToSeq || null;
                messages.value[tempMsgIndex].profileImageUrl =
                  parsed.senderProfileImageUrl || null;
                messages.value[tempMsgIndex].time =
                  new Date().toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                // 🟩 교체했으면 새로 push하지 않도록 return
                return;
              }
            }

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
              id: parsed.chatMessageSeq || Date.now(), // ✅ 백엔드에서 받은 실제 chatMessageSeq 사용
              user: parsed.senderName || parsed.senderSeq, // ✅ 백엔드에서 받은 실제 senderName 사용
              content: parsed.chatMessageText,
              time: new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              avatar:
                parsed.senderProfileImageUrl &&
                parsed.senderProfileImageUrl.trim() !== ""
                  ? parsed.senderProfileImageUrl // ✅ 실제 프로필 URL이 있으면 그걸 avatar로 사용
                  : (parsed.senderName || parsed.senderSeq)
                      ?.toString()
                      .charAt(0),
              // profileImageUrl: parsed.senderProfileImageUrl || null,
              profileImageUrl:
                parsed.senderProfileImageUrl && parsed.senderProfileImageUrl.trim() !== ""
                  ? parsed.senderProfileImageUrl
                  : null,
              senderSeq: parsed.senderSeq,
              isOwn: parsed.senderSeq === memberSeq.value,
              unread: parsed.senderSeq !== memberSeq.value ? 1 : 0,
              files: fileList, // ✅ 추가
              messageType: parsed.messageType || "TEXT", // ✅ 메시지 타입 추가
              replyToSeq: parsed.replyToSeq || null, // ✅ 답장 대상 메시지 ID 추가
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
  console.log("============= 메시지 전송 ===============", memberSeq.value);
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
  // const currentUserName = localStorage.getItem("memberName") || "사용자";
  const currentUserName =
    localStorage.getItem("memberName") ||
    JSON.parse(localStorage.getItem("user") || "{}").name ||
    JSON.parse(localStorage.getItem("user") || "{}").memberName ||
    "사용자";
  const currentUserProfileImage =
    localStorage.getItem("profileImageUrl") || null;

  // ✅ MessageType enum 기반 메시지 타입 동적 결정
  // TEXT, FILE, REPLY, VOTE
  let messageType = "TEXT";
  if (replyToMessage.value) {
    messageType = "REPLY"; // 답장 메시지
  } else if (attachedFiles.value.length > 0) {
    messageType = "FILE";
  }
  // ✅ replyToSeq 먼저 안전하게 복사
  const replySeq = replyToMessage.value?.id || null;

  const message = {
    senderSeq: memberSeq.value,
    senderName: currentUserName,
    senderProfileImageUrl: currentUserProfileImage,
    messageType: messageType, // ✅ MessageType enum 값
    chatMessageText: newMessage.value,
    chatMessageFileUrls: uploadedUrls.join(","), // 🔹 S3 URL 문자열로 전달
    replyToSeq: replySeq, // ✅ 지역 변수 사용
  };

  // 2️⃣ 즉시 화면에 표시 (로컬 메시지)
  const localMessage = {
    id: `temp_${Date.now()}`, // ✅ 임시 ID 사용 (백엔드에서 실제 ID로 업데이트됨)
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
    messageType: messageType, // ✅ 메시지 타입 추가
    replyToSeq: replyToMessage.value?.id || null, // ✅ 답장 대상 메시지 ID 추가
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

  // 답장 상태 초기화
  if (replyToMessage.value) {
    replyToMessage.value = null;
    showReplyInput.value = false;
  }

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

  // ✅ WebSocket으로 투표 메시지 전송 (VOTE 타입)
  const message = {
    senderSeq: memberSeq.value,
    senderName: currentUserName,
    senderProfileImageUrl: currentUserProfileImage,
    messageType: "VOTE", // ✅ 투표 메시지는 VOTE 타입
    chatMessageText: `📊 **${pollData.title}**`,
    chatMessageFileUrls: "",
    replyToSeq: null,
  };

  // 즉시 화면에 표시
  const pollMessage = {
    id: `temp_${Date.now()}`, // ✅ 임시 ID 사용
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
    messageType: "VOTE", // ✅ 투표 메시지 타입
    replyToSeq: null, // ✅ 투표는 답장이 아님
  };

  messages.value.push(pollMessage);

  // WebSocket으로 전송
  if (stompClient.value && stompClient.value.connected) {
    stompClient.value.send(
      `/publish/${channelSeq.value}`,
      JSON.stringify(message),
      { Authorization: `Bearer ${token.value}` }
    );
  }

  newMessage.value = "";
  isTyping.value = false;
  showAttachmentMenu.value = false;
  scrollToBottom();
};

const handleAttachFiles = (files) => {
  // 첨부된 파일들을 attachedFiles에 추가
  attachedFiles.value.push(...files);
  showAttachmentMenu.value = false;
};

// 컨텍스트 메뉴 관련 함수들
const handleMessageRightClick = (message, event) => {
  event.preventDefault();
  selectedMessage.value = message;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
  selectedMessage.value = null;
};

const startReply = (message) => {
  console.log("💬 답장 대상 message:", message);
  replyToMessage.value = message;
  showReplyInput.value = true;
  newMessage.value = ""; // 답장은 @ 입력 없이 답장 대상만 표시
  closeContextMenu();

  // 입력창에 포커스
  setTimeout(() => {
    const textarea = document.querySelector(".message-input textarea");
    if (textarea) {
      textarea.focus();
    }
  }, 100);
};

const copyMessage = (message) => {
  navigator.clipboard.writeText(message.content);
  closeContextMenu();
  // 복사 완료 알림 (선택사항)
  console.log("메시지가 클립보드에 복사되었습니다.");
};

// 답장 메시지 표시 관련 함수들
const getReplyToMessage = (replyToSeq) => {
  if (!replyToSeq) return null;
  return messages.value.find(
    (msg) =>
      String(msg.id) === String(replyToSeq) ||
      String(msg.id).replace("temp_", "") === String(replyToSeq)
  );
};

const scrollToOriginalMessage = (messageId) => {
  const messageElement = document.querySelector(
    `[data-message-id="${messageId}"]`
  );
  if (messageElement) {
    // 부드러운 스크롤
    messageElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    // 하이라이트 효과
    setTimeout(() => {
      messageElement.classList.add("highlight-message");
    }, 500);

    setTimeout(() => {
      messageElement.classList.remove("highlight-message");
    }, 2500);
  } else {
    console.warn(`메시지 ID ${messageId}를 찾을 수 없습니다.`);
  }
};

const cancelReply = () => {
  replyToMessage.value = null;
  showReplyInput.value = false;
  newMessage.value = "";
};

// @ 언급 관련 함수들 - 채널 참여 멤버 정보
const getChannelMembers = async () => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/chat-service/chat/channels/${
        channelSeq.value
      }/members`,
      {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      }
    );

    console.log("📡 서버 응답 원본:", res.data);

    // 백엔드에서 ChannelMemberResDto 리스트 반환됨 [{ memberSeq, memberName, memberProfileUrl }]
    mentionList.value = res.data.data.map((m) => ({
      id: m.memberSeq,
      name: m.memberName,
      profileImage: m.memberProfileUrl,
    }));

    // 현재 로그인 사용자 제외
    mentionList.value = mentionList.value.filter(
      (member) => member.id !== memberSeq.value
    );

    console.log("✅ 채팅 멤버 목록:", mentionList.value);
  } catch (err) {
    console.error("❌ 채팅 멤버 목록 조회 실패:", err);
  }
};

const handleMessageInput = (event) => {
  const value = event.target.value;
  const cursorPosition = event.target.selectionStart;

  // @ 입력 감지
  const lastAtIndex = value.lastIndexOf("@", cursorPosition - 1);
  if (lastAtIndex !== -1) {
    const afterAt = value.substring(lastAtIndex + 1, cursorPosition);

    // 공백이나 줄바꿈이 없으면 멘션 드롭다운 표시
    if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
      showMentionDropdown.value = true;
      mentionStartIndex.value = lastAtIndex;
      mentionEndIndex.value = cursorPosition;

      // 멘션 필터링
      const searchTerm = afterAt.toLowerCase();
      filteredMentions.value = mentionList.value.filter((member) =>
        member.name.toLowerCase().includes(searchTerm)
      );
    }
  } else {
    showMentionDropdown.value = false;
  }
};

const selectMention = (member) => {
  const beforeMention = newMessage.value.substring(0, mentionStartIndex.value);
  const afterMention = newMessage.value.substring(mentionEndIndex.value);

  newMessage.value = beforeMention + `@${member.name} ` + afterMention;
  showMentionDropdown.value = false;

  // 커서 위치 조정
  setTimeout(() => {
    const textarea = document.querySelector(".message-input textarea");
    if (textarea) {
      const newCursorPos = beforeMention.length + `@${member.name} `.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }
  }, 0);
};

const handleMentionKeydown = (event) => {
  if (showMentionDropdown.value) {
    if (event.key === "Escape") {
      showMentionDropdown.value = false;
    }
  }
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
  window.addEventListener("click", closeContextMenu);

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

  // ✅ 채널 참여 멤버 목록 초기화
  getChannelMembers().then(() => {
    // ✅ memberSeq가 유효할 때만 WebSocket 연결
    if (memberSeq.value > 0) {
      connectWebsocket();
    } else {
      console.error("❌ memberSeq가 유효하지 않습니다.");
    }
  });
});

onUnmounted(() => {
  window.removeEventListener("select-chat-channel", handleSubChannelSelect);
  window.removeEventListener("click", closeContextMenu);
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
            :data-message-id="message.id"
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
            @contextmenu="handleMessageRightClick(message, $event)"
          >
            <div class="message-content">
              <div v-if="!message.isOwn" class="message-avatar">
                <img
                  v-if="message.profileImageUrl"
                  :src="message.profileImageUrl"
                  alt="avatar"
                  class="avatar-image"
                />
                <span v-else>{{ message.avatar }}</span>
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

                <!-- 답장 메시지 미리보기 (메시지 위쪽에 표시) -->
                <div
                  v-if="message.messageType === 'REPLY' && message.replyToSeq"
                  class="reply-preview-above"
                  :class="{
                    'deleted-message': !getReplyToMessage(message.replyToSeq),
                  }"
                  @click="
                    getReplyToMessage(message.replyToSeq)
                      ? scrollToOriginalMessage(message.replyToSeq)
                      : null
                  "
                >
                  <div class="reply-preview-header">
                    <v-icon
                      size="12"
                      :color="
                        getReplyToMessage(message.replyToSeq)
                          ? 'primary'
                          : 'error'
                      "
                    >
                      {{
                        getReplyToMessage(message.replyToSeq)
                          ? "mdi-reply"
                          : "mdi-delete"
                      }}
                    </v-icon>
                    <span class="reply-preview-user">
                      {{
                        getReplyToMessage(message.replyToSeq)?.user ||
                        "삭제된 사용자"
                      }}
                    </span>
                  </div>
                  <div class="reply-preview-text">
                    {{
                      getReplyToMessage(message.replyToSeq)?.content ||
                      "삭제된 메시지입니다."
                    }}
                  </div>
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

        <!-- 답장 미리보기 -->
        <div v-if="replyToMessage" class="reply-preview">
          <div class="reply-header">
            <v-icon size="16" color="primary">mdi-reply</v-icon>
            <span class="reply-label">답장</span>
            <v-btn icon size="16" variant="text" @click="cancelReply">
              <v-icon size="14">mdi-close</v-icon>
            </v-btn>
          </div>
          <div class="reply-message">
            <span class="reply-user">{{ replyToMessage.user }}</span>
            <span class="reply-text">{{ replyToMessage.content }}</span>
          </div>
        </div>

        <!-- @ 언급 드롭다운 -->
        <div v-if="showMentionDropdown" class="mention-dropdown">
          <div
            v-for="member in filteredMentions"
            :key="member.id"
            @click="selectMention(member)"
            class="mention-item"
          >
            <v-avatar size="24">
              <v-img
                v-if="member.profileImage"
                :src="member.profileImage"
                :alt="member.name"
              />
              <span v-else>{{ member.name.charAt(0) }}</span>
            </v-avatar>
            <div class="mention-info">
              <span class="mention-name">{{ member.name }}</span>
              <span class="mention-email">{{ member.email }}</span>
            </div>
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
              @input="handleMessageInput"
              @keydown="handleMentionKeydown"
              placeholder="메시지를 입력하세요..."
              variant="plain"
              rows="1"
              auto-grow
              hide-details
              class="message-textarea"
              @keypress="handleKeyPress"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
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

    <!-- 컨텍스트 메뉴 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px',
      }"
      @click.stop
    >
      <div class="context-item" @click="startReply(selectedMessage)">
        <v-icon size="18">mdi-reply</v-icon>
        <span>답장</span>
      </div>
      <div class="context-item" @click="copyMessage(selectedMessage)">
        <v-icon size="18">mdi-content-copy</v-icon>
        <span>복사</span>
      </div>
    </div>
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
  flex: 1; /* 남은 공간을 모두 차지하도록 */
  min-width: 0; /* flex item이 축소될 수 있도록 */
}

.message-item.own-message .message-group {
  align-items: flex-end;
}

.message-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; /* 아바타 크기 고정 */
  height: 40px;
  border-radius: 50%; /* 동그라미 모양 */
  overflow: hidden; /* 이미지를 원 안에 자름 */
  background-color: #f2f2f2; /* 이미지 없을 때 배경색 */
  flex-shrink: 0; /* 아바타 크기 고정 - 축소 방지 */
  min-width: 40px; /* 최소 너비 보장 */
  min-height: 40px; /* 최소 높이 보장 */
}

.avatar-image {
  width: 100%; /* 부모 영역에 맞춰 */
  height: 100%;
  object-fit: cover; /* 비율 유지하며 꽉 채움 */
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

/* 컨텍스트 메뉴 */
.context-menu {
  position: fixed;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  min-width: 120px;
  overflow: hidden;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.context-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.context-item:active {
  background: rgba(var(--v-theme-primary), 0.12);
}

/* 답장 미리보기 */
.reply-preview {
  background: rgba(var(--v-theme-primary), 0.05);
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 12px 16px;
  margin: 0 16px 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.reply-label {
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.reply-message {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reply-user {
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.reply-text {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
}

/* 답장 메시지 위쪽 미리보기 */
.reply-preview-above {
  background: rgba(var(--v-theme-primary), 0.08);
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 6px 10px;
  margin-bottom: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 300px;
  font-size: 11px;
}

.reply-preview-above:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-left-color: rgb(var(--v-theme-primary));
  transform: translateX(2px);
}

.reply-preview-above.deleted-message {
  background: rgba(var(--v-theme-error), 0.08);
  border-left-color: rgb(var(--v-theme-error));
  cursor: not-allowed;
}

.reply-preview-above.deleted-message:hover {
  background: rgba(var(--v-theme-error), 0.12);
  transform: none;
}

.reply-preview-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.reply-preview-user {
  font-size: 11px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.reply-preview-text {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
  max-width: 280px;
}

/* 답장 메시지 표시 (기존 - 메시지 버블 내부용) */
.reply-to-message {
  background: rgba(var(--v-theme-primary), 0.05);
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 280px;
}

.reply-to-message:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  border-left-color: rgb(var(--v-theme-primary));
}

.reply-to-message.deleted-message {
  background: rgba(var(--v-theme-error), 0.05);
  border-left-color: rgb(var(--v-theme-error));
  cursor: not-allowed;
}

.reply-to-message.deleted-message:hover {
  background: rgba(var(--v-theme-error), 0.08);
}

.reply-to-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.reply-to-user {
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.reply-to-content {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

/* 메시지 하이라이트 효과 */
.highlight-message {
  animation: highlightPulse 2s ease-in-out;
  border-radius: 8px;
}

@keyframes highlightPulse {
  0% {
    background: rgba(var(--v-theme-primary), 0.4);
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.4);
  }
  25% {
    background: rgba(var(--v-theme-primary), 0.2);
    box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.2);
  }
  50% {
    background: rgba(var(--v-theme-primary), 0.15);
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.15);
  }
  75% {
    background: rgba(var(--v-theme-primary), 0.08);
    box-shadow: 0 0 0 1px rgba(var(--v-theme-primary), 0.08);
  }
  100% {
    background: transparent;
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0);
  }
}

/* @ 언급 드롭다운 */
.mention-dropdown {
  position: absolute;
  bottom: 100%;
  left: 16px;
  right: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  margin-bottom: 8px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.mention-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.mention-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.mention-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
}

.mention-email {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* 메시지 우클릭 호버 효과 */
.message-item {
  cursor: context-menu;
}

.message-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>
