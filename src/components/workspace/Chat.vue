<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { usePermissions, PERMISSIONS } from "@/composables/usePermissions";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useWorkspaceMemberStore } from "@/store/workspaceMemberStore";
import { useNotificationStore } from "@/store/notificationStore";
import { emitter } from "@/eventBus";
import { useRoute, useRouter } from "vue-router";
// import PollModal from "./PollModal.vue";
import FileAttachmentModal from "./FileAttachmentModal.vue";
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import apiClient from "@/utils/api";
import { getChannelMembers, updateLastRead } from "@/api/chat/chatApi";

// ✅ 현재 사용자가 멘션된 메시지인지 확인
const isMentionedMessage = (message) => {
  if (!message.content || !localStorage.getItem("user")) return false;

  // 내 이름 가져오기
  const currentUser =
    JSON.parse(localStorage.getItem("user") || "{}").name ||
    localStorage.getItem("memberName") ||
    "";

  // 멘션 패턴 검사
  const mentionRegex = new RegExp(`@${currentUser}`, "g");
  return mentionRegex.test(message.content);
};

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
  selectedChannel: String, // 하위 채널 ID
  workspaceType: String, // 'personal' 또는 'project'
});

const { hasPermission, isManager, isSuper } = usePermissions();

// Store 사용
const workspaceStore = useWorkspaceStore();
const route = useRoute();
const router = useRouter();
const workspaceMemberStore = useWorkspaceMemberStore();
const notificationStore = useNotificationStore();

// Store 초기화 대기 함수
const waitForStore = () => {
  return new Promise((resolve) => {
    const checkStore = () => {
      if (
        workspaceStore.currentWorkspaceInfo &&
        workspaceMemberStore.chatChannels?.length > 0
      ) {
        resolve();
      } else {
        setTimeout(checkStore, 100);
      }
    };
    checkStore();
  });
};

// WebSocket 관련 상태
const stompClient = ref(null);
const subscription = ref(null);
const token = ref("");
const channelSeq = ref(null);
const memberSeq = ref(0);

// 타이핑 인디케이터 관련
let typingTimeout = null; // 타이핑 종료 타이머
let lastTypingSent = 0; // 마지막 전송 시간
let typingInterval = null; // 타이핑 지속 알림 인터벌

// 채널 목록 (Store에서 가져오기)
const channels = computed(() => {
  // 개인 워크스페이스: 1:1 채팅 목록을 채널로 변환
  if (props.workspaceType === "personal") {
    // directMessages는 WorkspaceSidebar에 있으므로
    // Chat.vue에서는 props.selectedChannel을 channelSeq로 사용
    // 빈 배열 반환 (실제로는 WorkspaceSidebar에서 채널 선택 시 channelSeq 전달)
    return [];
  }

  // 프로젝트 워크스페이스: Store에서 채널 목록 가져오기
  const channelList =
    workspaceMemberStore.chatChannels?.map((channel) => ({
      id: channel.channelSeq.toString(),
      name: channel.channelName,
      type: "text",
      unread: 0,
      channelData: channel,
    })) || [];

  return channelList;
});

// 현재 채널
const currentChannel = ref("general");

// 현재 채널 이름 가져오기
const currentChannelName = computed(() => {
  // 1:1 채팅일 때는 상대방 이름 표시
  if (isPersonalChat.value && chatUserInfo.value) {
    return chatUserInfo.value.name || "사용자";
  }

  // 프로젝트 워크스페이스: 채널 이름 표시
  const channel = channels.value.find((c) => c.id === currentChannel.value);
  return channel ? channel.name : "채널";
});

// 실제 메시지 데이터 (WebSocket에서 받아온 메시지들)
const messages = ref([]);

// 새 메시지
const newMessage = ref("");

const normalizeChannelId = (id) => {
  if (id === undefined || id === null) return null;
  return String(id).replace(/^chat_/, "");
};

// 메시지 입력 관련 상태
const showAttachmentMenu = ref(false);
const isTyping = ref(false);
const messageInputFocused = ref(false);
const otherTyping = ref(false);
const typingUserName = ref("");

// 모달 관련
// const showPollModal = ref(false);
const showFileModal = ref(false);
const showFileLimitModal = ref(false);
const fileLimitMessage = ref("");

// 첨부된 파일들
const attachedFiles = ref([]);

// 이미지 확장 상태 관리 (메시지 ID별로)
const expandedImages = ref({});

// 파일 첨부 제한 설정
const MAX_FILES = 20;
const attachedFilesCount = computed(() => attachedFiles.value.length);
const canAttachMore = computed(() => attachedFilesCount.value < MAX_FILES);
const remainingSlots = computed(() => MAX_FILES - attachedFilesCount.value);

// 답장 관련 상태
const replyToMessage = ref(null);
const showReplyInput = ref(false);

// 메시지 전송 중복 방지
const isSending = ref(false);

// 이전 메시지 로드 관련 상태
const isLoadingMessages = ref(false);
const hasMoreMessages = ref(true);
const lastReadMessageSeq = ref(null); // ✅ 마지막 읽은 메시지 seq 저장

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
const selectedMentionIndex = ref(0); // 키보드 네비게이션용 선택된 인덱스
const messageTextarea = ref(null);

// 멘션 하이라이트된 메시지 텍스트
const highlightedMessage = computed(() => {
  return parseMentions(newMessage.value);
});

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// 1:1 채팅 상대방 정보 (개인 워크스페이스일 때만 사용)
const chatUserInfo = ref(null);

// 개인 워크스페이스에서 1:1 채팅인지 확인
const isPersonalChat = computed(() => {
  return props.workspaceType === "personal";
});

// WebSocket 연결 중 플래그 (중복 호출 방지)
const isConnecting = ref(false);

// ✅ WebSocket 연결
const connectWebsocket = () => {
  // ✅ channelSeq 유효성 검사 추가
  if (!channelSeq.value || isNaN(channelSeq.value) || channelSeq.value <= 0) {
    console.error("❌ 유효하지 않은 channelSeq:", channelSeq.value);
    return;
  }

  if (!token.value) {
    console.error("❌ 토큰이 없습니다.");
    return;
  }

  // ✅ 이미 연결 중이거나 연결되어 있으면 return (중복 호출 방지)
  if (isConnecting.value) {
    return;
  }

  if (stompClient.value && stompClient.value.connected) {
    return;
  }

  // 연결 중 플래그 설정
  isConnecting.value = true;

  // ✅ 기존 연결이 끊어진 상태면 정리
  if (stompClient.value && !stompClient.value.connected) {
    try {
      if (subscription.value) {
        subscription.value.unsubscribe();
        subscription.value = null;
      }
      if (stompClient.value) {
        stompClient.value.disconnect();
      }
    } catch (e) {
      console.warn("기존 연결 정리 중 오류:", e);
    }
    stompClient.value = null;
  }

  const sockJs = new SockJS(
    `${import.meta.env.VITE_API_URL}/chat-service/connect`
  );
  stompClient.value = Stomp.over(sockJs);

  stompClient.value.connect(
    { Authorization: `Bearer ${token.value}` },
    () => {
      // WebSocket 연결 성공

      // 연결 완료 후 플래그 해제
      isConnecting.value = false;

      subscription.value = stompClient.value.subscribe(
        `/topic/${channelSeq.value}`,
        (message) => {
          try {
            const parsed = JSON.parse(message.body);

            // ✅ TYPING 이벤트 처리
            if (parsed.action === "TYPING") {
              // 자신의 타이핑 이벤트는 무시
              if (Number(parsed.senderSeq) === Number(memberSeq.value)) {
                return;
              }

              // ✅ 타이핑 중인 사용자 이름 저장
              typingUserName.value = parsed.senderName || "사용자";
              otherTyping.value = parsed.typing;

              // 타이핑 종료 시 자동으로 숨김
              if (!parsed.typing) {
                otherTyping.value = false;
                typingUserName.value = ""; // ✅ 이름도 초기화
                return;
              }

              return;
            }

            // ✅ 삭제 이벤트 처리 추가 (190줄 위치에 추가!)
            if (parsed.action === "DELETE") {
              messages.value = messages.value.filter(
                (msg) => msg.id !== parsed.chatMessageSeq
              );
              return;
            }

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
                let createdAt = parsed.createdAt
                  ? new Date(parsed.createdAt)
                  : messages.value[tempMsgIndex].createdAt || new Date();
                
                // UTC -> KST 변환 (9시간 더하기)
                createdAt = new Date(createdAt.getTime() + (9 * 60 * 60 * 1000))
                
                messages.value[tempMsgIndex].id = parsed.chatMessageSeq;
                messages.value[tempMsgIndex].replyToSeq =
                  parsed.replyToSeq || null;
                messages.value[tempMsgIndex].profileImageUrl =
                  parsed.senderProfileImageUrl || null;
                messages.value[tempMsgIndex].createdAt = createdAt; // ✅ createdAt 업데이트
                messages.value[tempMsgIndex].time =
                  createdAt.toLocaleTimeString("ko-KR", {
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
            let createdAt = parsed.createdAt
              ? new Date(parsed.createdAt)
              : new Date();
            
            // UTC -> KST 변환 (9시간 더하기)
            createdAt = new Date(createdAt.getTime() + (9 * 60 * 60 * 1000))
            
            const formattedMessage = {
              id: parsed.chatMessageSeq || Date.now(), // ✅ 백엔드에서 받은 실제 chatMessageSeq 사용
              user: parsed.senderName || parsed.senderSeq, // ✅ 백엔드에서 받은 실제 senderName 사용
              content: parsed.chatMessageText,
              time: createdAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              createdAt: createdAt, // ✅ 시간 비교를 위한 원본 Date 객체
              avatar:
                parsed.senderProfileImageUrl &&
                parsed.senderProfileImageUrl.trim() !== ""
                  ? parsed.senderProfileImageUrl // ✅ 실제 프로필 URL이 있으면 그걸 avatar로 사용
                  : (parsed.senderName || parsed.senderSeq)
                      ?.toString()
                      .charAt(0),
              profileImageUrl:
                parsed.senderProfileImageUrl &&
                parsed.senderProfileImageUrl.trim() !== ""
                  ? parsed.senderProfileImageUrl
                  : null,
              senderSeq: parsed.senderSeq,
              isOwn: Number(parsed.senderSeq) === Number(memberSeq.value), // ✅ 타입 변환 후 비교
              unread:
                Number(parsed.senderSeq) !== Number(memberSeq.value) ? 1 : 0,
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

              // ✅ 현재 채널을 보고 있을 때만 메시지를 받으면 알림 초기화
              // workspaceStore의 선택된 채널과 비교하여 실제로 선택된 채널인지 확인
              const currentSelectedChannel = workspaceStore.selectedSubChannel;
              const currentMainChannel = workspaceStore.currentChannel;
              const messageChannelSeq = Number(parsed.channelSeq);
              const messageChannelSeqStr = String(parsed.channelSeq);

              // 실제로 현재 선택된 채널인지 확인
              let isCurrentlySelected = false;
              if (
                currentMainChannel === "chat" &&
                currentSelectedChannel &&
                channelSeq.value
              ) {
                const selectedChannelNum = Number(
                  String(currentSelectedChannel).replace("chat_", "")
                );
                isCurrentlySelected =
                  (selectedChannelNum === messageChannelSeq &&
                    selectedChannelNum === Number(channelSeq.value)) ||
                  (currentSelectedChannel === messageChannelSeqStr &&
                    Number(channelSeq.value) === messageChannelSeq);
              }

              // 실제로 선택된 채널이고 현재 보고 있는 채널일 때만 알림 초기화
              if (
                isCurrentlySelected &&
                channelSeq.value &&
                parsed.channelSeq &&
                Number(channelSeq.value) === messageChannelSeq
              ) {
                const channelSeqStr = String(channelSeq.value);
                if (
                  notificationStore.getChannelNotificationCount(channelSeqStr) >
                  0
                ) {
                  notificationStore.clearChannelNotificationCount(
                    channelSeqStr
                  );
                  console.log(
                    "[Chat.vue] ✅ 현재 선택된 채널에서 메시지 수신, 알림 초기화:",
                    channelSeqStr
                  );
                }
              }

              // ✅ 1:1 채팅일 때 사이드바 마지막 메시지 업데이트 (알림 메시지 형식)
              if (isPersonalChat.value && parsed.channelSeq) {
                // 알림 메시지 형식: 메시지 내용만
                let notificationMessage = "";

                if (
                  formattedMessage.files &&
                  formattedMessage.files.length > 0
                ) {
                  notificationMessage = "[파일]";
                } else if (
                  formattedMessage.content &&
                  formattedMessage.content.trim()
                ) {
                  notificationMessage = formattedMessage.content;
                }

                if (notificationMessage) {
                  emitter.emit("update-direct-message-last-message", {
                    channelSeq: parsed.channelSeq,
                    lastMessage: notificationMessage,
                  });
                }
              }
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
      // 연결 실패 시 플래그 해제
      isConnecting.value = false;

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => connectWebsocket(), RECONNECT_DELAY);
      }
    }
  );
};

// ✅ WebSocket 연결 해제
const disconnectWebsocket = async () => {
  try {
    // 🟡 읽음 처리 API 호출 (인터셉터가 자동으로 토큰 추가)
    if (channelSeq.value && !isNaN(channelSeq.value) && channelSeq.value > 0) {
      await apiClient.post(
        `/chat-service/chat/channels/${channelSeq.value}/read`,
        {}
      );
    } else {
      console.warn(
        "⚠️ channelSeq가 유효하지 않아 읽음 처리 건너뜀:",
        channelSeq.value
      );
    }
  } catch (e) {
    console.warn("읽음 처리 실패:", e);
  }

  try {
    if (subscription.value) {
      subscription.value.unsubscribe();
      subscription.value = null;
    }
    if (stompClient.value && stompClient.value.connected) {
      stompClient.value.disconnect();
    }
  } catch (e) {
    console.warn("WebSocket 해제 중 오류:", e);
  } finally {
    stompClient.value = null;
    // 연결 해제 시 플래그도 해제
    isConnecting.value = false;
  }
};

// 스크롤을 맨 아래로 (부드럽게)
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    const chatBox = document.querySelector(".messages-container");
    if (chatBox) {
      const isNearBottom =
        chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 100;

      // 하단 근처에 있거나 강제 스크롤 요청 시에만 스크롤
      if (isNearBottom || smooth) {
        chatBox.scrollTo({
          top: chatBox.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    }
  });
};

// ✅ 파일 업로드 (S3 REST API 호출)
const uploadFilesToS3 = async () => {
  if (attachedFiles.value.length === 0) return [];

  const formData = new FormData();
  attachedFiles.value.forEach((file) => formData.append("files", file));

  try {
    const res = await apiClient.post(
      `/chat-service/chat/files/upload/${channelSeq.value}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

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

// ✅ 메시지 전송
const sendMessage = async () => {
  // 중복 전송 방지
  if (isSending.value) {
    return;
  }

  // ✅ WebSocket 연결 확인 및 재연결 시도
  if (!stompClient.value || !stompClient.value.connected) {
    if (!channelSeq.value || !token.value) {
      console.error("❌ 채널 또는 토큰이 없습니다.");
      alert("채널을 선택해주세요.");
      return;
    }

    // 재연결 시도
    connectWebsocket();

    // 재연결 대기 (최대 3초)
    let attempts = 0;
    while (
      attempts < 6 &&
      (!stompClient.value || !stompClient.value.connected)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    // 재연결 실패 시
    if (!stompClient.value || !stompClient.value.connected) {
      console.error("❌ WebSocket 재연결 실패");
      alert("채팅 연결에 실패했습니다. 페이지를 새로고침해주세요.");
      return;
    }
  }

  if (newMessage.value.trim() === "" && attachedFiles.value.length === 0)
    return;

  // 전송 시작
  isSending.value = true;

  try {
    let uploadedUrls = [];
    if (attachedFiles.value.length > 0) {
      uploadedUrls = await uploadFilesToS3(); // 🔹 S3 업로드 먼저 실행
    }

    // 1️⃣ 전송할 메시지 데이터 생성 (사용자 정보 포함)
    const currentUserName =
      localStorage.getItem("memberName") ||
      JSON.parse(localStorage.getItem("user") || "{}").name ||
      JSON.parse(localStorage.getItem("user") || "{}").memberName ||
      "사용자";
    const currentUserProfileImage =
      localStorage.getItem("profileImageUrl") || null;

    // ✅ MessageType enum 기반 메시지 타입 동적 결정
    // TEXT, FILE, REPLY
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
    const now = new Date();
    const localMessage = {
      id: `temp_${Date.now()}`, // ✅ 임시 ID 사용 (백엔드에서 실제 ID로 업데이트됨)
      user: currentUserName,
      content: newMessage.value,
      time: now.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: now, // ✅ 시간 비교를 위한 원본 Date 객체
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

    // 3️⃣ WebSocket 전송
    stompClient.value.send(
      `/publish/${channelSeq.value}`,
      JSON.stringify(message),
      { Authorization: `Bearer ${token.value}` }
    );

    // ✅ 전송 직후 타이핑 종료 브로드캐스트
    try {
      sendTypingStopEvent();
    } catch (e) {
      console.warn("타이핑 종료 이벤트 전송 실패", e);
    }

    // 로컬 상태도 종료
    isTyping.value = false;

    // 4️⃣ 입력창 초기화
    newMessage.value = "";
    attachedFiles.value = [];
    showAttachmentMenu.value = false;

    // 답장 상태 초기화
    if (replyToMessage.value) {
      replyToMessage.value = null;
      showReplyInput.value = false;
    }

    // 메시지 추가 후 DOM 업데이트를 기다린 후 스크롤 (자신이 보낸 메시지는 강제 스크롤)
    scrollToBottom(true);

    // ✅ 1:1 채팅 목록의 마지막 메시지 업데이트 이벤트 발생 (알림 메시지 형식)
    if (isPersonalChat.value && channelSeq.value) {
      // 알림 메시지 형식: 메시지 내용만
      let notificationMessage = "";

      if (uploadedUrls.length > 0) {
        notificationMessage = "[파일]";
      } else if (localMessage.content && localMessage.content.trim()) {
        notificationMessage = localMessage.content;
      }

      if (notificationMessage) {
        emitter.emit("update-direct-message-last-message", {
          channelSeq: channelSeq.value,
          lastMessage: notificationMessage,
        });
      }
    }
  } finally {
    // 전송 완료/실패 무관하게 플래그 해제
    isSending.value = false;
  }
};

// ✅ 메시지 삭제 (하드 삭제)
const deleteMessage = async (message) => {
  try {
    const res = await apiClient.delete(
      `/chat-service/chat/messages/${message.id}`
    );

    // 로컬 메시지 목록에서도 제거
    messages.value = messages.value.filter((m) => m.id !== message.id);
    showContextMenu.value = false;
  } catch (err) {
    console.error("❌ 메시지 삭제 실패:", err.response?.data || err);
  }
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
    }
  }
};

const loadMoreMessages = async (lastId = null) => {
  // 중복 로드 방지
  if (isLoadingMessages.value || !hasMoreMessages.value) return;

  isLoadingMessages.value = true;

  try {
    const url = `/chat-service/chat/channels/${channelSeq.value}/messages${
      lastId ? `?lastId=${lastId}` : ""
    }`;

    const res = await apiClient.get(url);

    // 백엔드는 ResponseDto로 감싸져 있지 않을 수 있으므로 직접 배열인지 확인
    let loadedMessages = res.data;

    // ResponseDto로 감싸진 경우 (res.data.data)
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      loadedMessages = res.data.data;
    }
    // 직접 배열인 경우
    else if (Array.isArray(res.data)) {
      loadedMessages = res.data;
    } else {
      console.warn("⚠️ 예상치 못한 응답 형식:", res.data);
      hasMoreMessages.value = false;
      return;
    }

    // 로드할 메시지가 없으면 종료
    if (!loadedMessages || loadedMessages.length === 0) {
      hasMoreMessages.value = false;
      isLoadingMessages.value = false;
      return;
    }

    // 메시지 맵핑 → WebSocket 수신 형식과 동일하게 변환
    const formatted = loadedMessages.map((m) => {
      let createdAt = new Date(m.createdAt)
      if (!Number.isNaN(createdAt.getTime())) {
        createdAt = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000)
      }

      return {
        id: m.chatMessageSeq,
        user: m.senderName,
        content: m.chatMessageText,
        time: createdAt.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: createdAt, // ✅ 시간 비교를 위한 원본 Date 객체
        profileImageUrl: m.senderProfileImageUrl || null,
        senderSeq: m.senderSeq,
        isOwn: Number(m.senderSeq) === Number(memberSeq.value), // ✅ 타입 변환 후 비교
        unread: 0,
        files: (m.chatMessageFileUrls || "")
          .split(",")
          .filter(Boolean)
          .map((url) => ({ name: url.split("/").pop(), url, type: "file" })),
        messageType: m.messageType || "TEXT",
        replyToSeq: m.replyToSeq || null,
        isNewMessage: false, // ✅ 이전 메시지는 false
      };
    });

    // ✅ 스크롤 위치 저장
    const container = document.querySelector(".messages-container");
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    // ✅ prepend (기존 메시지 앞에 붙임)
    // BE에서 DESC 순서로 반환되므로 reverse() 후 앞에 추가하면 올바른 시간순 (오래된 → 최신)
    messages.value = [...formatted.reverse(), ...messages.value];

    // ✅ 재접속 시(lastReadMessageSeq.value가 있으면): 구분선 위치 복원
    if (lastReadMessageSeq.value) {
      // DOM 업데이트 대기
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 구분선 위치 찾아서 스크롤
      const firstNewMessage = document.querySelector(
        `[data-message-id="${lastReadMessageSeq.value}"]`
      );
      if (firstNewMessage) {
        const divider = firstNewMessage.previousElementSibling;
        if (divider && divider.classList.contains("message-divider")) {
          divider.scrollIntoView({ behavior: "instant", block: "start" });
        } else {
          firstNewMessage.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
        }
      }

      return;
    }

    // ✅ 최초 접속 시: 스크롤 조작
    // lastId가 있으면 이전 메시지 추가 로드 중
    if (lastId) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // DOM 업데이트 대기

      if (container) {
        const newScrollHeight = container.scrollHeight;
        const heightDifference = newScrollHeight - oldScrollHeight;
        container.scrollTop = heightDifference; // 새로운 컨텐츠 높이만큼 스크롤
      }
    } else {
      // 최초 접속 시: 맨 아래로 강제 스크롤 (구분선이 없을 때)
      await new Promise((resolve) => setTimeout(resolve, 50)); // DOM 업데이트 대기
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  } catch (e) {
    console.error("❌ 메시지 로드 실패:", e);
    hasMoreMessages.value = false;
  } finally {
    isLoadingMessages.value = false;
  }
};

// ✅ 마지막 읽은 메시지 이후의 새 메시지 로드
const loadMessagesAfterLastRead = async () => {
  if (isLoadingMessages.value) return [];

  // ✅ channelSeq 유효성 검사 추가
  if (!channelSeq.value || isNaN(channelSeq.value) || channelSeq.value <= 0) {
    console.error("❌ 유효하지 않은 channelSeq:", channelSeq.value);
    lastReadMessageSeq.value = null;
    isLoadingMessages.value = false;
    return [];
  }

  isLoadingMessages.value = true;

  try {
    const url = `/chat-service/chat/channels/${channelSeq.value}/messages/after-last-read`;

    const res = await apiClient.get(url);

    let loadedMessages = res.data;

    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      loadedMessages = res.data.data;
    } else if (Array.isArray(res.data)) {
      loadedMessages = res.data;
    } else {
      console.warn("⚠️ 예상치 못한 응답 형식:", res.data);
      lastReadMessageSeq.value = null;
      isLoadingMessages.value = false;
      return [];
    }

    if (!loadedMessages || loadedMessages.length === 0) {
      lastReadMessageSeq.value = null;
      isLoadingMessages.value = false;
      return [];
    }

    // 메시지 맵핑
    const formatted = loadedMessages.map((m) => {
      let createdAt = new Date(m.createdAt)
      if (!Number.isNaN(createdAt.getTime())) {
        createdAt = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000)
      }

      return {
        id: m.chatMessageSeq,
        user: m.senderName,
        content: m.chatMessageText,
        time: createdAt.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt,
        profileImageUrl: m.senderProfileImageUrl || null,
        senderSeq: m.senderSeq,
        isOwn: Number(m.senderSeq) === Number(memberSeq.value),
        unread: Number(m.senderSeq) !== Number(memberSeq.value) ? 1 : 0,
        files: (m.chatMessageFileUrls || "")
          .split(",")
          .filter(Boolean)
          .map((url) => ({ name: url.split("/").pop(), url, type: "file" })),
        messageType: m.messageType || "TEXT",
        replyToSeq: m.replyToSeq || null,
        isNewMessage: true, // ✅ 새 메시지 플래그
      }
    })

    // 마지막 읽은 메시지 저장 (가장 오래된 새 메시지)
    // ✅ 새 메시지가 있으면 → 재접속 (lastReadSeq가 있음)
    // ✅ 새 메시지가 없으면 → 최초 접속 또는 읽을 새 메시지 없음 (lastReadSeq가 null)
    if (formatted.length > 0) {
      lastReadMessageSeq.value = formatted[0].id;
    }

    isLoadingMessages.value = false;
    return formatted;
  } catch (e) {
    console.error("❌ 새 메시지 로드 실패:", e);
    console.error("❌ 에러 상세:", e.response?.data || e.message);

    // ✅ 404 또는 500 에러인 경우에도 이전 메시지는 로드해야 함
    if (e.response?.status === 404) {
      console.warn(
        "⚠️ 채널 멤버를 찾을 수 없습니다. 이전 메시지는 로드합니다."
      );
    }

    lastReadMessageSeq.value = null;
    isLoadingMessages.value = false;
    return [];
  }
};

// 채널 변경 시 WebSocket 재연결
const changeChannel = async (channelId) => {
  // 중복 호출 방지
  if (isChangingChannel.value) {
    return;
  }

  if (currentChannel.value === channelId) {
    return;
  }

  // 채널 변경 시작
  isChangingChannel.value = true;

  try {
    sendTypingStopEvent();

    // ✅ channelSeq 유효성 검사
    const parsedChannelSeq = parseInt(normalizeChannelId(channelId), 10);
    if (isNaN(parsedChannelSeq) || parsedChannelSeq <= 0) {
      console.error("❌ 유효하지 않은 channelSeq:", channelId);
      isChangingChannel.value = false;
      return;
    }

    // ✅ 기존 연결 해제 (채널 변경 시 항상 호출)
    await disconnectWebsocket();

    // 새 채널로 변경
    currentChannel.value = channelId;
    channelSeq.value = parsedChannelSeq; // 문자열을 숫자로 변환
    messages.value = [];

    // 이전 메시지 로드 상태 리셋
    hasMoreMessages.value = true;
    isLoadingMessages.value = false;
    lastReadMessageSeq.value = null; // ✅ 마지막 읽은 메시지 초기화

    // ✅ 1:1 채팅일 때 상대방 정보 로드
    if (isPersonalChat.value) {
      await loadChatUserInfo(channelSeq.value);
    }

    try {
      // ✅ 1단계: 마지막 읽은 이후의 새 메시지 로드
      const newMessages = await loadMessagesAfterLastRead();

      // ✅ 2단계: 채널 접속 시 읽음 상태 업데이트 (최신 메시지로)
      // 메시지 로드 후에 읽음 처리 (프로젝트/개인 워크스페이스 모두 동일)
      try {
        await updateLastRead(channelSeq.value);
      } catch (error) {
        console.warn("⚠️ 읽음 상태 업데이트 실패:", error);
        // 읽음 상태 업데이트 실패해도 메시지 로드는 계속 진행
      }

      // ✅ 3단계: 재접속 여부에 따른 처리
      if (newMessages.length > 0 && lastReadMessageSeq.value) {
        // 🔄 재접속: 새 메시지 표시 및 구분선으로 스크롤
        messages.value = newMessages;

        // DOM 업데이트 대기
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 구분선(새 메시지 시작점)이 상단에 오도록 스크롤
        const container = document.querySelector(".messages-container");
        if (container) {
          const firstNewMessage = document.querySelector(
            `[data-message-id="${lastReadMessageSeq.value}"]`
          );
          if (firstNewMessage) {
            // 구분선이 메시지 위에 있으므로, 메시지의 이전 형제 요소를 찾아서 스크롤
            const divider = firstNewMessage.previousElementSibling;
            if (divider && divider.classList.contains("message-divider")) {
              // 구분선으로 스크롤
              divider.scrollIntoView({ behavior: "instant", block: "start" });
            } else {
              // 구분선이 없으면 메시지 상단으로 스크롤
              firstNewMessage.scrollIntoView({
                behavior: "instant",
                block: "start",
              });
            }
          }
        }
      } else {
        // 🆕 최초 접속: 모든 메시지 로드 후 맨 아래로 스크롤
      }
    } catch (error) {
      console.error("❌ loadMessagesAfterLastRead 실패:", error);
      // 에러가 발생해도 이전 메시지는 로드해야 함
      lastReadMessageSeq.value = null;
    }

    // ✅ 3단계: 이전 메시지 로드
    // 재접속 시(lastReadMessageSeq.value가 있으면): 구분선 이전의 메시지만 로드
    // 최초 접속 시(null): 최신 메시지 로드
    const lastId = lastReadMessageSeq.value || null;
    try {
      await loadMoreMessages(lastId);
    } catch (error) {
      console.error("❌ loadMoreMessages 실패:", error);
      // 에러 발생 시에도 사용자에게 알림
      alert("메시지를 불러오는 중 오류가 발생했습니다.");
    }

    // 새 채널로 연결
    connectWebsocket();
  } finally {
    // 채널 변경 완료
    isChangingChannel.value = false;
  }
};

// ✅ 로드 상태 플래그 - 중복 로드 방지
const hasLoadedInitialChannel = ref(false);

// 채널 변경 중복 방지 플래그
const isChangingChannel = ref(false);

// 하위 채널 선택 이벤트 처리 (event bus용)
const handleSubChannelSelect = ({ parentId, subChannelId }) => {
  if (parentId === "chat") {
    // 이미 채널 변경 중이면 스킵
    if (isChangingChannel.value) {
      return;
    }
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
// const openPollModal = () => {
//   showPollModal.value = true;
//   showAttachmentMenu.value = false;
// };

const openFileModal = () => {
  showFileModal.value = true;
  showAttachmentMenu.value = false;
};

// const handleCreatePoll = (pollData) => {
//   // 투표 메시지 생성
//   const currentUserName = localStorage.getItem("memberName") || "나";
//   const currentUserProfileImage =
//     localStorage.getItem("profileImageUrl") || null;

//   // ✅ WebSocket으로 투표 메시지 전송 (VOTE 타입)
//   const message = {
//     senderSeq: memberSeq.value,
//     senderName: currentUserName,
//     senderProfileImageUrl: currentUserProfileImage,
//     messageType: "VOTE", // ✅ 투표 메시지는 VOTE 타입
//     chatMessageText: `📊 **${pollData.title}**`,
//     chatMessageFileUrls: "",
//     replyToSeq: null,
//   };

//   // 즉시 화면에 표시
//   const pollMessage = {
//     id: `temp_${Date.now()}`, // ✅ 임시 ID 사용
//     user: currentUserName,
//     content: `📊 **${pollData.title}**`,
//     time: new Date().toLocaleTimeString("ko-KR", {
//       hour: "2-digit",
//       minute: "2-digit",
//     }),
//     avatar: currentUserName.charAt(0),
//     profileImageUrl: currentUserProfileImage,
//     senderSeq: memberSeq.value,
//     isOwn: true,
//     type: "poll",
//     pollData: pollData,
//     messageType: "VOTE", // ✅ 투표 메시지 타입
//     replyToSeq: null, // ✅ 투표는 답장이 아님
//   };

//   messages.value.push(pollMessage);

//   // WebSocket으로 전송
//   if (stompClient.value && stompClient.value.connected) {
//     stompClient.value.send(
//       `/publish/${channelSeq.value}`,
//       JSON.stringify(message),
//       { Authorization: `Bearer ${token.value}` }
//     );
//   }

//   // ✅ 투표 전송 후에도 타이핑 종료 브로드캐스트
//   try {
//     sendTypingStopEvent();
//   } catch (e) {
//     console.warn("타이핑 종료 이벤트 전송 실패", e);
//   }

//   newMessage.value = "";
//   isTyping.value = false;
//   showAttachmentMenu.value = false;
//   scrollToBottom();
// };

const handleAttachFiles = (files) => {
  const currentCount = attachedFiles.value.length;
  const newFilesCount = files.length;

  // 20개 제한 체크
  if (currentCount + newFilesCount > MAX_FILES) {
    const availableSlots = MAX_FILES - currentCount;
    if (availableSlots <= 0) {
      showFileLimitAlert();
      return;
    } else {
      const message = `최대 ${MAX_FILES}개까지만 첨부할 수 있습니다.\n\n선택한 파일 중 ${availableSlots}개만 첨부됩니다.`;
      showFileLimitAlert(message);
      // 가능한 만큼만 추가
      const limitedFiles = files.slice(0, availableSlots);
      attachedFiles.value.push(...limitedFiles);
    }
  } else {
    // 제한 내에서 추가
    attachedFiles.value.push(...files);
  }

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

// ✅ Scroll 최상단 감지 후 이전 메시지 로드
const handleScroll = async (e) => {
  const container = e.target;

  // 로딩 중이거나 더 이상 메시지가 없으면 리턴
  if (isLoadingMessages.value || !hasMoreMessages.value) return;

  // 스크롤이 최상단에 있고 메시지가 있을 때만 로드
  if (container.scrollTop === 0 && messages.value.length > 0) {
    const oldest = messages.value[0];
    await loadMoreMessages(oldest.id);
  }
};

// @ 언급 관련 함수들 - 채널 참여 멤버 정보
const loadChannelMembers = () => {
  if (!channelSeq.value) {
    mentionList.value = [];
    return;
  }

  try {
    // 프로젝트 워크스페이스: Store에서 채널 멤버 정보 가져오기
    if (props.workspaceType === "project") {
      const channel = workspaceMemberStore.chatChannels?.find(
        (c) => Number(c.channelSeq) === Number(channelSeq.value)
      );

      if (channel?.channelMemberList && channel.channelMemberList.length > 0) {
        mentionList.value = channel.channelMemberList
          .map((m) => ({
            id: m.memberSeq,
            name: m.memberName,
            profileImage: m.memberProfileUrl || null,
          }))
          .filter((member) => Number(member.id) !== Number(memberSeq.value));

        return;
      }
    }

    // 개인 워크스페이스: 1:1 채팅이므로 상대방만 멘션 가능
    // directMessages에서 현재 channelSeq에 해당하는 채널 찾기
    if (props.workspaceType === "personal") {
      // WorkspaceSidebar에서 directMessages를 가져올 수 없으므로
      // 다른 방법 필요: 백엔드 API 호출 또는 전역 상태 관리
      // 임시로 빈 배열로 설정 (나중에 개선 가능)
      mentionList.value = [];
      return;
    }

    // 기본값: 빈 배열
    mentionList.value = [];
  } catch (err) {
    console.error("❌ 채팅 멤버 목록 조회 실패:", err);
    mentionList.value = [];
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

      // 선택된 인덱스 초기화
      selectedMentionIndex.value = 0;
    }
  } else {
    showMentionDropdown.value = false;
  }

  // ✅ 타이핑 상태 업데이트
  const hasContent = value.length > 0;
  isTyping.value = hasContent;

  // ✅ 입력 내용에 따라 타이핑 시작/종료 이벤트 전송
  if (hasContent && channelSeq.value && memberSeq.value) {
    // 입력 내용이 있으면 → 타이핑 시작 이벤트 전송
    // 이미 인터벌이 실행 중이면 스킵
    if (!typingInterval) {
      sendTypingStartEvent();
    }
  } else {
    // 입력 내용이 없으면 → 타이핑 종료 이벤트 전송
    sendTypingStopEvent();
  }
};

// 입력창 클릭 시 포커스
const focusTextarea = () => {
  messageTextarea.value?.focus();
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

// 멘션된 텍스트를 파싱하여 하이라이트된 HTML로 변환
const parseMentions = (text) => {
  if (!text) return "";

  // @사용자명 패턴을 찾아서 하이라이트 처리 (더 포괄적인 패턴)
  const mentionRegex = /@([^\s@]+)/g;
  const result = text.replace(
    mentionRegex,
    '<span class="mention-highlight">@$1</span>'
  );

  return result;
};

const handleMentionKeydown = (event) => {
  if (showMentionDropdown.value) {
    if (event.key === "Escape") {
      showMentionDropdown.value = false;
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedMentionIndex.value = Math.min(
        selectedMentionIndex.value + 1,
        filteredMentions.value.length - 1
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filteredMentions.value.length > 0) {
        selectMention(filteredMentions.value[selectedMentionIndex.value]);
      }
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

// URL 확장자로 이미지 여부 판단
const isImageUrl = (url) => {
  if (!url) return false;
  try {
    const lower = url.split("?")[0].toLowerCase();
    return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)$/.test(lower);
  } catch (e) {
    return false;
  }
};

// URL에서 파일 확장자로 아이콘 결정
const getFileIconFromUrl = (url) => {
  if (!url) return "mdi-file";
  try {
    const lower = url.split("?")[0].toLowerCase();
    if (lower.includes(".pdf")) return "mdi-file-pdf-box";
    if (lower.includes(".doc") || lower.includes(".docx"))
      return "mdi-file-word-box";
    if (
      lower.includes(".xls") ||
      lower.includes(".xlsx") ||
      lower.includes(".csv")
    )
      return "mdi-file-excel-box";
    if (lower.includes(".ppt") || lower.includes(".pptx"))
      return "mdi-file-powerpoint-box";
    if (
      lower.includes(".zip") ||
      lower.includes(".rar") ||
      lower.includes(".7z")
    )
      return "mdi-folder-zip";
    if (lower.includes(".txt")) return "mdi-file-document-outline";
    if (
      lower.includes(".mp4") ||
      lower.includes(".avi") ||
      lower.includes(".mov") ||
      lower.includes(".mkv")
    )
      return "mdi-file-video";
    if (
      lower.includes(".mp3") ||
      lower.includes(".wav") ||
      lower.includes(".flac")
    )
      return "mdi-file-music";
    return "mdi-file";
  } catch (e) {
    return "mdi-file";
  }
};

// 파일 타입에 따른 아이콘 색상 클래스
const getFileIconClass = (url) => {
  if (!url) return "file-icon-default";
  try {
    const lower = url.split("?")[0].toLowerCase();
    if (lower.includes(".pdf")) return "file-icon-pdf";
    if (lower.includes(".doc") || lower.includes(".docx"))
      return "file-icon-word";
    if (
      lower.includes(".xls") ||
      lower.includes(".xlsx") ||
      lower.includes(".csv")
    )
      return "file-icon-excel";
    if (lower.includes(".ppt") || lower.includes(".pptx"))
      return "file-icon-ppt";
    if (
      lower.includes(".zip") ||
      lower.includes(".rar") ||
      lower.includes(".7z")
    )
      return "file-icon-zip";
    if (lower.includes(".txt")) return "file-icon-text";
    if (
      lower.includes(".mp4") ||
      lower.includes(".avi") ||
      lower.includes(".mov") ||
      lower.includes(".mkv")
    )
      return "file-icon-video";
    if (
      lower.includes(".mp3") ||
      lower.includes(".wav") ||
      lower.includes(".flac")
    )
      return "file-icon-audio";
    return "file-icon-default";
  } catch (e) {
    return "file-icon-default";
  }
};

// 이미지 파일만 필터링
const getImageFiles = (files) => {
  if (!Array.isArray(files)) return [];
  return files.filter((file) => isImageUrl(file.url));
};

// 일반 파일만 필터링
const getFileFiles = (files) => {
  if (!Array.isArray(files)) return [];
  return files.filter((file) => !isImageUrl(file.url));
};

// 표시할 이미지 목록 (20개 제한 또는 모두)
const getVisibleImages = (message) => {
  const imageFiles = getImageFiles(message.files);
  if (imageFiles.length <= 20) return imageFiles;
  if (getExpandedImages(message.id)) return imageFiles;
  return imageFiles.slice(0, 20);
};

// 이미지 확장 상태 확인
const getExpandedImages = (messageId) => {
  return expandedImages.value[messageId] || false;
};

// 이미지 확장
const expandImages = (messageId) => {
  expandedImages.value[messageId] = true;
};

// 이미지 접기
const collapseImages = (messageId) => {
  expandedImages.value[messageId] = false;
};

const removeAttachedFile = (index) => {
  attachedFiles.value.splice(index, 1);
};

// 파일 제한 알림 함수 (세련된 모달)
const showFileLimitAlert = (message = null) => {
  if (message) {
    fileLimitMessage.value = message;
  } else {
    fileLimitMessage.value = `파일 첨부 한도를 초과했습니다.\n\n최대 ${MAX_FILES}개까지만 첨부할 수 있습니다.`;
  }
  showFileLimitModal.value = true;
};

// 토스트 알림 관련
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref("success");

// 토스트 알림 함수
const showToastNotification = (message, type = "success") => {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;

  // 3초 후 자동으로 사라짐
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

// 파일 제한 모달 닫기
const closeFileLimitModal = () => {
  showFileLimitModal.value = false;
};

// 메시지 입력 포커스 처리
const handleInputFocus = () => {
  messageInputFocused.value = true;
  showAttachmentMenu.value = false;
};

const handleInputBlur = () => {
  messageInputFocused.value = false;
};

// ✅ 타이핑 시작 이벤트 전송 (입력 시작 시)
const sendTypingStartEvent = () => {
  // 1. WebSocket 연결 체크
  if (!stompClient.value || !stompClient.value.connected) {
    console.warn("⚠️ WebSocket 미연결");
    return;
  }

  // 2. 기존 인터벌은 유지 (재설정하지 않음)
  if (!typingInterval) {
    // // 2. 기존 인터벌 클리어 (중복 방지)
    // if (typingInterval) {
    //   clearInterval(typingInterval);
    //   typingInterval = null;
    // }

    // 3. 현재 사용자 이름 가져오기
    const currentUserName =
      localStorage.getItem("memberName") ||
      JSON.parse(localStorage.getItem("user") || "{}").name ||
      JSON.parse(localStorage.getItem("user") || "{}").memberName ||
      "사용자";

    // // 4. 기존 타이머 클리어
    // if (typingTimeout) {
    //   clearTimeout(typingTimeout);
    //   typingTimeout = null;
    // }

    // 5. 즉시 타이핑 시작 이벤트 전송
    const sendTypingEvent = () => {
      const typingEvent = {
        action: "TYPING",
        channelSeq: channelSeq.value,
        senderSeq: memberSeq.value,
        senderName: currentUserName,
        typing: true,
      };

      stompClient.value.send(
        `/publish/typing/${channelSeq.value}`,
        JSON.stringify(typingEvent),
        { Authorization: `Bearer ${token.value}` }
      );

      // lastTypingSent = Date.now();
    };

    // 즉시 전송
    sendTypingEvent();

    // 6. 3초마다 지속적으로 타이핑 이벤트 전송
    typingInterval = setInterval(() => {
      sendTypingEvent();
    }, 2000);
  }
};

// ✅ 타이핑 종료 이벤트 전송 (입력 삭제 시)
const sendTypingStopEvent = () => {
  // 1. 인터벌 클리어
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  // 2. WebSocket 연결 체크
  if (!stompClient.value || !stompClient.value.connected) {
    return;
  }

  // 3. 타이머 클리어
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  // 4. 현재 사용자 이름 가져오기
  const currentUserName =
    localStorage.getItem("memberName") ||
    JSON.parse(localStorage.getItem("user") || "{}").name ||
    JSON.parse(localStorage.getItem("user") || "{}").memberName ||
    "사용자";

  // 5. 타이핑 종료 이벤트 생성
  const stopEvent = {
    action: "TYPING",
    channelSeq: channelSeq.value,
    senderSeq: memberSeq.value,
    senderName: currentUserName,
    typing: false,
  };

  // 6. WebSocket 전송
  stompClient.value.send(
    `/publish/typing/${channelSeq.value}`,
    JSON.stringify(stopEvent),
    { Authorization: `Bearer ${token.value}` }
  );

  lastTypingSent = 0;
};

// ✅ 구분선 표시 여부 판단 (비활성화)
const shouldShowDivider = (message, index) => {
  // 구분선 표시 안함
  return false;
};

// ✅ 시간 표시 여부 판단 (카카오톡 방식: 같은 시간대의 연속 메시지는 마지막에만 표시)
const shouldShowTime = (message, index) => {
  // 마지막 메시지면 항상 시간 표시
  if (index === messages.value.length - 1) {
    return true;
  }

  const nextMessage = messages.value[index + 1];
  if (!nextMessage || !message.createdAt || !nextMessage.createdAt) {
    return true;
  }

  // 시간 비교 (같은 시:분인지 확인)
  const currentTime = message.createdAt;
  const nextTime = nextMessage.createdAt;

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const nextMinutes = nextTime.getHours() * 60 + nextTime.getMinutes();

  // 다음 메시지와 시간이 다르면 표시
  if (currentMinutes !== nextMinutes) {
    return true;
  }

  // 다음 메시지가 다른 사용자거나, 내 메시지 <-> 상대방 메시지 전환 시 표시
  if (
    message.user !== nextMessage.user ||
    message.isOwn !== nextMessage.isOwn
  ) {
    return true;
  }

  // 같은 시간대의 연속 메시지는 표시하지 않음
  return false;
};

// 1:1 채팅 상대방 정보 가져오기
const loadChatUserInfo = async (targetChannelSeq = null) => {
  // targetChannelSeq가 제공되면 그것을 사용, 없으면 props.selectedChannel 사용
  const channelSeqToUse = targetChannelSeq || props.selectedChannel;

  if (!isPersonalChat.value || !channelSeqToUse) return;

  try {
    const channelSeq = parseInt(normalizeChannelId(channelSeqToUse), 10);
    if (!channelSeq || isNaN(channelSeq)) {
      return;
    }

    // 채널 멤버 목록 조회 (상대방 정보 포함)
    const members = await getChannelMembers(channelSeq);

    if (!members || members.length === 0) {
      return;
    }

    // 상대방 찾기 (본인 제외)
    const otherMember = members.find(
      (m) => Number(m.memberSeq) !== Number(memberSeq.value)
    );

    if (!otherMember) {
      return;
    }

    // 공통 워크스페이스 계산
    const currentUserWorkSpaces = workspaceStore.workspaces
      .filter((ws) => ws.type === "project") // 프로젝트 워크스페이스만
      .map((ws) => ws.workSpaceSeq);

    const otherUserWorkSpaces = otherMember.workSpaceList || [];

    // 교집합 구하기 (공통 워크스페이스)
    const commonWorkSpaceSeqs = currentUserWorkSpaces.filter((wsSeq) =>
      otherUserWorkSpaces.includes(wsSeq)
    );

    // 워크스페이스 이름 매핑
    const commonWorkspaces = commonWorkSpaceSeqs.map((wsSeq) => {
      const workspace = workspaceStore.workspaces.find(
        (ws) => ws.workSpaceSeq === wsSeq
      );
      return {
        workSpaceSeq: wsSeq,
        workSpaceName: workspace?.name || `워크스페이스 #${wsSeq}`,
      };
    });

    // chatUserInfo 업데이트
    chatUserInfo.value = {
      name: otherMember.memberName || "사용자",
      avatar: otherMember.memberProfileUrl || "",
      profileUrl: otherMember.memberProfileUrl || "",
      status: otherMember.activeStatus || "OFFLINE",
      memberSeq: otherMember.memberSeq,
      commonWorkspaces: commonWorkspaces, // ✅ 워크스페이스 정보 (이름 포함)
    };
  } catch (e) {
    chatUserInfo.value = null;
  }
};

// 상태별 색상 계산
const getStatusColor = (status) => {
  const statusMap = {
    ONLINE: "success", // 초록색 (온라인)
    OFFLINE: "error", // 빨간색 (오프라인)
    AWAY: "warning", // 주황색 (자리비움)
  };
  return statusMap[status] || "error";
};

// selectedChannel 변경 시 사용자 정보 로드
watch(
  () => props.selectedChannel,
  () => {
    if (isPersonalChat.value) {
      loadChatUserInfo();
    }
  },
  { immediate: true }
);

watch(
  () => props.currentChannel,
  async (newChannel, oldChannel) => {
    if (oldChannel === "chat" && newChannel !== "chat") {
      await disconnectWebsocket();
    }
  }
);

// 이벤트 리스너 등록/해제
onMounted(async () => {
  emitter.on("select-chat-channel", handleSubChannelSelect);
  window.addEventListener("click", closeContextMenu);

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

  // ✅ 프로젝트 워크스페이스: Store 초기화 대기
  if (props.workspaceType === "project") {
    await waitForStore();

    // ✅ 채널 목록이 비어있으면 종료
    if (channels.value.length === 0) {
      console.warn("⚠️ 채널 목록이 비어있습니다.");
      return;
    }
  }

  // ✅ URL에서 채널 ID 가져오기 (새로고침 시 유지)
  const urlChannelId = route.params.subChannel?.toString();
  // ✅ 초기 채널 설정
  let initialChannel;

  if (props.workspaceType === "personal") {
    // 개인 워크스페이스: props.selectedChannel을 channelSeq로 사용
    initialChannel = urlChannelId || props.selectedChannel;

    if (!initialChannel) {
      console.warn("⚠️ 개인 워크스페이스: 채널이 선택되지 않았습니다.");
      return;
    }
  } else {
    // 프로젝트 워크스페이스: URL > props > 첫번째 채널 순서
    initialChannel =
      urlChannelId || props.selectedChannel || channels.value[0]?.id;

    if (!initialChannel) {
      console.warn("⚠️ 프로젝트 워크스페이스: 채널이 없습니다.");
      return;
    }
  }

  // ✅ 채널이 있으면 초기화 진행
  currentChannel.value = initialChannel;
  const parsedChannelSeq = parseInt(normalizeChannelId(initialChannel), 10);

  // channelSeq 유효성 검사
  if (isNaN(parsedChannelSeq) || parsedChannelSeq <= 0) {
    console.error("❌ 유효하지 않은 channelSeq:", initialChannel);
    return;
  }

  channelSeq.value = parsedChannelSeq;

  // ✅ 채널 참여 멤버 목록 초기화 (백엔드 API 호출)
  await loadChannelMembers();

  // ✅ 1:1 채팅일 때 상대방 정보 로드
  if (isPersonalChat.value) {
    await loadChatUserInfo(channelSeq.value);
  }

  // ✅ memberSeq와 channelSeq가 유효할 때만 채널 로드
  if (memberSeq.value > 0 && currentChannel.value && channelSeq.value > 0) {
    hasLoadedInitialChannel.value = true;

    try {
      // ✅ 1. 마지막 읽은 이후의 새 메시지 로드 시도
      const newMessages = await loadMessagesAfterLastRead();

      // ✅ 2. 채널 접속 시 읽음 상태 업데이트 (최신 메시지로)
      try {
        await updateLastRead(channelSeq.value);
      } catch (error) {
        console.warn("⚠️ 읽음 상태 업데이트 실패:", error);
      }

      // ✅ 3. 재접속 여부에 따른 처리
      if (newMessages.length > 0 && lastReadMessageSeq.value) {
        messages.value = newMessages;

        await new Promise((resolve) => setTimeout(resolve, 50));

        const container = document.querySelector(".messages-container");
        if (container) {
          const firstNewMessage = document.querySelector(
            `[data-message-id="${lastReadMessageSeq.value}"]`
          );
          if (firstNewMessage) {
            const divider = firstNewMessage.previousElementSibling;
            if (divider && divider.classList.contains("message-divider")) {
              divider.scrollIntoView({ behavior: "instant", block: "start" });
            } else {
              firstNewMessage.scrollIntoView({
                behavior: "instant",
                block: "start",
              });
            }
          }
        }
      }

      // ✅ 3. 이전 메시지 로드
      const lastId = lastReadMessageSeq.value || null;
      await loadMoreMessages(lastId);
    } catch (error) {
      console.error("❌ 채널 로드 중 오류:", error);
    }

    // ✅ 4. WebSocket 연결
    connectWebsocket();
  } else {
    console.error("❌ memberSeq 또는 채널이 유효하지 않습니다.", {
      memberSeq: memberSeq.value,
      currentChannel: currentChannel.value,
      channelSeq: channelSeq.value,
    });
  }

  // ✅ 스크롤 이벤트 리스너 등록 (DOM 준비 대기)
  await nextTick();
  const container = document.querySelector(".messages-container");
  if (container) {
    container.addEventListener("scroll", handleScroll);
  }

  routeLeaveStopper = router.beforeEach(async (to, from, next) => {
    if (from.name === "Chat" && to.name !== "Chat") {
      await disconnectWebsocket();
    }
    next();
  });
});

// ✅ props.selectedChannel 변경 감지 - 채널 자동 전환
watch(
  () => props.selectedChannel,
  (newChannelId) => {
    if (!newChannelId) return;

    if (currentChannel.value === newChannelId) {
      return;
    }

    // 이미 채널 변경 중이면 스킵 (event bus 이벤트가 이미 처리했을 수 있음)
    if (isChangingChannel.value) {
      return;
    }

    // props로 다른 채널이 오면 전환
    changeChannel(newChannelId);
  },
  { immediate: false }
);

onUnmounted(async () => {
  emitter.off("select-chat-channel", handleSubChannelSelect);
  window.removeEventListener("click", closeContextMenu);

  if (routeLeaveStopper) {
    routeLeaveStopper();
    routeLeaveStopper = null;
  }

  // ✅ 컴포넌트 종료 시 타이핑 종료 브로드캐스트
  try {
    if (isTyping.value || typingInterval) {
      sendTypingStopEvent();
      isTyping.value = false;
    }
  } catch (e) {
    console.warn("타이핑 종료 이벤트 전송 실패", e);
  }

  await disconnectWebsocket();
  const container = document.querySelector(".messages-container");
  if (container) {
    container.removeEventListener("scroll", handleScroll);
  }

  // ✅ 타이핑 인터벌 정리
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
});
</script>

<template>
  <div class="team-chat">
    <!-- 채팅 영역 -->
    <div class="chat-area">
      <!-- 채팅 헤더 -->
      <div class="chat-header">
        <div class="channel-info">
          <template v-if="isPersonalChat">
            <v-avatar
              v-if="chatUserInfo?.profileUrl"
              size="36"
              class="channel-avatar"
            >
              <v-img :src="chatUserInfo.profileUrl" alt="상대방 프로필" />
            </v-avatar>
            <v-avatar
              v-else
              size="36"
              class="channel-avatar channel-avatar--fallback"
              color="primary"
            >
              {{
                (chatUserInfo?.name || currentChannelName || "사용자").charAt(
                  0
                ) || "?"
              }}
            </v-avatar>
          </template>
          <v-icon v-else class="channel-icon">mdi-pound</v-icon>
          <span class="channel-name">{{ currentChannelName }}</span>
        </div>
      </div>

      <!-- 메시지 목록 -->
      <div class="messages-container">
        <div class="messages-list">
          <template v-for="(message, index) in messages" :key="message.id">
            <!-- ✅ 구분선: 새 메시지와 이전 메시지 사이 -->
            <div
              v-if="shouldShowDivider(message, index)"
              class="message-divider"
            >
              <div class="divider-line"></div>
              <span class="divider-text">새 메시지</span>
              <div class="divider-line"></div>
            </div>

            <div
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
              <div
                class="message-content"
                :class="{
                  'has-files-content':
                    Array.isArray(message.files) && message.files.length > 0,
                }"
              >
                <!-- ✅ 아바타: 항상 표시하되, 연속된 메시지는 투명하게 -->
                <div
                  v-if="!message.isOwn"
                  class="message-avatar"
                  :class="{
                    'avatar-hidden':
                      index > 0 &&
                      messages[index - 1].user === message.user &&
                      !messages[index - 1].isOwn,
                  }"
                >
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
                        {{ getReplyToMessage(message.replyToSeq)?.user || " " }}
                      </span>
                    </div>
                    <div
                      class="reply-preview-text"
                      v-html="
                        parseMentions(
                          getReplyToMessage(message.replyToSeq)?.content ||
                            '삭제된 메시지입니다.'
                        )
                      "
                    ></div>
                  </div>
                  <div
                    class="message-bubble"
                    :class="{
                      mentioned: isMentionedMessage(message),
                      'has-files':
                        Array.isArray(message.files) &&
                        message.files.length > 0,
                    }"
                  >
                    <div
                      v-if="message.content"
                      class="message-text"
                      v-html="parseMentions(message.content)"
                    ></div>

                    <!-- 첨부된 파일들 표시 -->
                    <div
                      v-if="
                        Array.isArray(message.files) && message.files.length
                      "
                      class="message-files"
                    >
                      <!-- 이미지 파일들을 그리드로 표시 -->
                      <template v-if="getImageFiles(message.files).length > 0">
                        <div class="images-grid-container">
                          <div
                            class="images-grid"
                            :class="{
                              'single-image':
                                getImageFiles(message.files).length === 1,
                              'few-images':
                                getImageFiles(message.files).length >= 2 &&
                                getImageFiles(message.files).length <= 3,
                            }"
                          >
                            <a
                              v-for="(file, i) in getVisibleImages(message)"
                              :key="i"
                              :href="file.url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="image-grid-item"
                            >
                              <div class="image-card-grid">
                                <div class="image-wrapper-grid">
                                  <img
                                    :src="file.url"
                                    :alt="file.name"
                                    class="image-thumb-grid"
                                    @error="
                                      $event.target.style.display = 'none'
                                    "
                                  />
                                  <div class="image-overlay-grid">
                                    <v-icon color="white" size="20"
                                      >mdi-magnify-plus</v-icon
                                    >
                                  </div>
                                </div>
                              </div>
                            </a>
                          </div>
                          <!-- 더보기 버튼 -->
                          <div
                            v-if="
                              getImageFiles(message.files).length > 20 &&
                              !getExpandedImages(message.id)
                            "
                            class="show-more-images"
                            @click="expandImages(message.id)"
                          >
                            <v-icon>mdi-chevron-down</v-icon>
                            <span
                              >더보기 ({{
                                getImageFiles(message.files).length - 20
                              }}개)</span
                            >
                          </div>
                          <!-- 접기 버튼 -->
                          <div
                            v-if="
                              getImageFiles(message.files).length > 20 &&
                              getExpandedImages(message.id)
                            "
                            class="show-more-images"
                            @click="collapseImages(message.id)"
                          >
                            <v-icon>mdi-chevron-up</v-icon>
                            <span>접기</span>
                          </div>
                        </div>
                      </template>

                      <!-- 일반 파일들을 리스트로 표시 -->
                      <template
                        v-for="(file, i) in getFileFiles(message.files)"
                        :key="`file-${i}`"
                      >
                        <div class="message-file-item">
                          <a
                            :href="file.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="file-card-link"
                          >
                            <div class="file-card">
                              <div class="file-icon-wrapper">
                                <v-icon :class="getFileIconClass(file.url)">
                                  {{ getFileIconFromUrl(file.url) }}
                                </v-icon>
                              </div>
                              <div class="file-info">
                                <div class="file-name-text">
                                  {{ file.name }}
                                </div>
                                <div class="file-size-text">
                                  <v-icon size="12" class="file-size-icon"
                                    >mdi-download</v-icon
                                  >
                                  파일 다운로드
                                </div>
                              </div>
                              <v-icon size="20" class="file-action-icon"
                                >mdi-open-in-new</v-icon
                              >
                            </div>
                          </a>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- 메시지 메타 정보 (시간, 안읽음수) -->
                  <div class="message-meta">
                    <div
                      v-if="!message.isOwn && message.unread"
                      class="unread-count"
                    >
                      <!-- {{ message.unread }} -->
                    </div>
                    <div
                      v-if="shouldShowTime(message, index)"
                      class="message-time"
                    >
                      {{ message.time }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 타이핑 인디케이터 (상대방이 입력 중일 때) -->
      <div v-if="otherTyping" class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text"
          >{{ typingUserName }}님이 입력 중입니다...</span
        >
      </div>

      <!-- 메시지 입력 -->
      <div class="message-input-container">
        <!-- 첨부파일 메뉴 -->
        <div v-if="showAttachmentMenu" class="attachment-menu">
          <!-- <div class="attachment-item" @click="openPollModal">
            <div class="attachment-icon poll-icon">
              <v-icon>mdi-poll</v-icon>
            </div>
            <div class="attachment-text">
              <div class="attachment-title">투표</div>
              <div class="attachment-desc">팀원들의 의견을 수집해보세요</div>
            </div>
          </div> -->

          <div
            class="attachment-item"
            :class="{ disabled: !canAttachMore }"
            @click="canAttachMore ? openFileModal() : showFileLimitAlert()"
          >
            <div class="attachment-icon file-icon">
              <v-icon>mdi-attachment</v-icon>
            </div>
            <div class="attachment-text">
              <div class="attachment-title">파일 첨부</div>
              <div class="attachment-desc">
                문서, 이미지, 동영상을 공유하세요 ({{ attachedFilesCount }}/{{
                  MAX_FILES
                }})
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
            <span
              class="reply-text"
              v-html="parseMentions(replyToMessage.content)"
            ></span>
          </div>
        </div>

        <!-- @ 언급 드롭다운 -->
        <div v-if="showMentionDropdown" class="mention-dropdown">
          <div
            v-for="(member, index) in filteredMentions"
            :key="member.id"
            @click="selectMention(member)"
            class="mention-item"
            :class="{ 'mention-item-selected': index === selectedMentionIndex }"
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
          <div class="input-field" @click="focusTextarea">
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
              style="width: 100%"
              no-resize
              @keypress="handleKeyPress"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
              ref="messageTextarea"
            />
          </div>

          <!-- 전송 버튼 -->
          <div class="send-actions">
            <v-btn
              color="primary"
              icon
              class="send-btn"
              @click="sendMessage"
              :disabled="
                isSending || (!newMessage.trim() && attachedFiles.length === 0)
              "
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- 투표 모달 -->
    <!-- <PollModal v-model="showPollModal" @create-poll="handleCreatePoll" /> -->

    <!-- 파일 첨부 모달 -->
    <FileAttachmentModal
      v-model="showFileModal"
      @attach-files="handleAttachFiles"
    />

    <!-- 파일 제한 알림 모달 -->
    <v-dialog v-model="showFileLimitModal" max-width="340px" persistent>
      <v-card class="elegant-modal">
        <div class="modal-content">
          <div class="icon-wrapper">
            <div class="icon-circle">
              <div class="icon-glow"></div>
              <v-icon color="white" size="26">mdi-file-multiple</v-icon>
            </div>
          </div>

          <div class="content-section">
            <h2 class="title">파일 첨부 제한</h2>
            <p class="description">{{ fileLimitMessage }}</p>

            <div class="file-indicator">
              <div class="indicator-wrapper">
                <span class="current">{{ attachedFilesCount }}</span>
                <span class="separator">of</span>
                <span class="total">{{ MAX_FILES }}</span>
              </div>
            </div>
          </div>

          <div class="action-section">
            <v-btn
              color="primary"
              variant="flat"
              block
              @click="closeFileLimitModal"
              class="elegant-button"
            >
              <span class="button-text">확인</span>
              <div class="button-shine"></div>
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-dialog>

    <!-- 토스트 알림 -->
    <v-snackbar
      v-model="showToast"
      :color="toastType === 'success' ? 'success' : 'warning'"
      timeout="3000"
      location="top right"
      class="toast-notification"
    >
      <div class="toast-content">
        <v-icon
          :color="toastType === 'success' ? 'white' : 'white'"
          class="mr-2"
        >
          {{
            toastType === "success" ? "mdi-check-circle" : "mdi-alert-circle"
          }}
        </v-icon>
        <span>{{ toastMessage }}</span>
      </div>
    </v-snackbar>

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
      <div class="context-item" @click="deleteMessage(selectedMessage)">
        <v-icon size="18" color="error">mdi-delete</v-icon>
        <span>삭제</span>
      </div>
    </div>
    <!-- 사용자 정보 사이드바 (개인 워크스페이스에서 1:1 채팅일 때만 표시) -->
    <div v-if="isPersonalChat && chatUserInfo" class="user-info-sidebar">
      <div class="user-header">
        <h3>사용자 정보</h3>
      </div>

      <div class="user-profile">
        <v-avatar size="80" color="primary" class="user-avatar">
          <v-img
            v-if="chatUserInfo.profileUrl"
            :src="chatUserInfo.profileUrl"
            :alt="chatUserInfo.name"
            cover
          />
          <span v-else>{{ chatUserInfo.name?.charAt(0) || "?" }}</span>
        </v-avatar>
        <div class="user-name">{{ chatUserInfo.name || "사용자" }}</div>
        <div class="user-status">
          <v-chip size="small" :color="getStatusColor(chatUserInfo.status)">
            <v-icon start>mdi-circle</v-icon>
            {{
              chatUserInfo.status === "ONLINE"
                ? "온라인"
                : chatUserInfo.status === "OFFLINE"
                ? "오프라인"
                : "자리비움"
            }}
          </v-chip>
        </div>
      </div>

      <div class="user-details">
        <!-- 공통 워크스페이스 -->
        <div class="detail-section">
          <h4>공통 워크스페이스</h4>
          <div class="workspace-list">
            <div
              v-for="ws in chatUserInfo.commonWorkspaces"
              :key="ws.workSpaceSeq"
              class="workspace-item"
            >
              <v-icon size="16">mdi-folder</v-icon>
              <span>{{ ws.workSpaceName }}</span>
            </div>
            <div
              v-if="
                !chatUserInfo.commonWorkspaces ||
                chatUserInfo.commonWorkspaces.length === 0
              "
              class="empty-text"
            >
              공통 워크스페이스가 없습니다
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   레이아웃
   ============================================ */

.team-chat {
  height: calc(100vh - 60px);
  background: rgb(var(--v-theme-background));
  display: flex;
}

.chat-area {
  flex: 1;
  min-width: 0;
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

.channel-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.channel-avatar--fallback {
  font-weight: 600;
  color: #ffffff;
}

.channel-name {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

/* ============================================
   메시지 목록
   ============================================ */

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-item {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0;
  cursor: context-menu;
}

.message-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.message-item.own-message {
  justify-content: flex-end;
}

.message-item.consecutive {
  margin-top: 2px;
}

.message-item.first-in-group {
  margin-top: 8px;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
}

.message-content.has-files-content {
  max-width: 35%;
}

.message-item.own-message .message-content {
  flex-direction: row-reverse;
}

.message-group {
  position: relative;
  padding-right: 70px;
}

.message-item.own-message .message-group {
  padding-right: 0;
  padding-left: 60px;
  align-items: flex-end;
}

.message-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f2f2f2;
  flex-shrink: 0;
  min-width: 40px;
  min-height: 40px;
}

.message-avatar.avatar-hidden {
  opacity: 0;
  pointer-events: none;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

/* 내가 보낸 메시지 버블 */
.message-item.own-message .message-bubble {
  background: rgba(59, 130, 246, 0.15);
  color: #000000;
  font-weight: 600;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 18px 18px 4px 18px;
  backdrop-filter: blur(10px);
}

.v-theme--dark .message-item.own-message .message-bubble {
  color: #ffffff;
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
  right: 0;
  bottom: 0;
  width: 56px;
}

.message-item.own-message .message-meta {
  left: 0;
  right: auto;
  text-align: left;
}

.message-time {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  padding: 0px 0px;
}

/* ============================================
   메시지 입력 영역
   ============================================ */

.message-input-container {
  position: relative;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
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

/* .poll-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
} */

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

.input-actions {
  display: flex;
  align-items: center;
}

.attachment-btn {
  width: 52px;
  height: 52px;
  min-width: 52px;
  min-height: 52px;
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

/* 멘션 하이라이트 오버레이 */
.mention-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2;
  padding: 16px;
  font-size: 14px;
  line-height: 1.2;
  color: transparent;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: hidden;
  box-sizing: border-box;
}

/* 멘션 하이라이트 공통 스타일 */
.mention-highlight {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  padding: 1px 4px;
  border-radius: 6px;
  font-weight: 500;
  display: inline;
  border: none;
  font-size: 0.95em;
}

/* 멘션 오버레이 (입력 필드용) */
.mention-overlay {
  color: transparent;
}

.mention-overlay * {
  color: transparent;
}

.mention-overlay .mention-highlight {
  color: #6366f1;
}

/* 메시지 내 멘션 하이라이트 */
.message-text .mention-highlight,
:deep(.message-text .mention-highlight) {
  background: #e0e7ff;
  color: #4f46e5;
  font-size: inherit;
}

/* 답장 미리보기 내 멘션 하이라이트 */
.reply-text .mention-highlight,
.reply-preview-text .mention-highlight,
:deep(.reply-text .mention-highlight),
:deep(.reply-preview-text .mention-highlight) {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  padding: 1px 3px;
  border-radius: 4px;
  font-size: inherit;
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

/* Vuetify textarea 스타일 */
.message-textarea :deep(.v-field__input) {
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  caret-color: rgb(var(--v-theme-on-surface));
  position: relative;
  z-index: 1;
}

.message-textarea :deep(.v-field__input::selection) {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-on-surface));
}

.message-textarea :deep(.v-field__input::-moz-selection) {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-on-surface));
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

.send-actions {
  display: flex;
  align-items: center;
}

.send-btn {
  width: 52px;
  height: 52px;
  min-width: 52px;
  min-height: 52px;
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
  flex: 1;
  margin-right: 8px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.file-size {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-right: 8px;
}

.remove-file-btn {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-file-btn:hover {
  opacity: 1;
}

.attached-files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.files-count {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* 파일 첨부 버튼 비활성화 */
.attachment-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.attachment-item.disabled:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

/* 아름다운 파일 제한 모달 */
.elegant-modal {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.modal-content {
  padding: 32px 28px 28px;
  text-align: center;
  position: relative;
}

.icon-wrapper {
  margin-bottom: 28px;
  position: relative;
}

.icon-circle {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  position: relative;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  animation: iconFloat 3s ease-in-out infinite;
}

.icon-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.3;
  animation: iconPulse 2s ease-in-out infinite;
}

.icon-circle .v-icon {
  color: white;
  z-index: 1;
}

.content-section {
  margin-bottom: 32px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 12px 0;
  letter-spacing: -0.5px;
  line-height: 1.2;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.description {
  font-size: 16px;
  color: #4a5568;
  line-height: 1.5;
  margin: 0 0 24px 0;
  white-space: pre-line;
  font-weight: 400;
}

.file-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.indicator-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.current {
  color: #667eea;
  font-weight: 700;
  font-size: 20px;
}

.separator {
  color: #a0aec0;
  font-weight: 400;
}

.total {
  color: #2d3748;
  font-weight: 600;
}

.progress-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(
    #667eea 0deg,
    #667eea var(--progress, 0deg),
    #e2e8f0 var(--progress, 0deg),
    #e2e8f0 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: progressRotate 2s ease-in-out infinite;
}

.progress-ring::before {
  content: "";
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: white;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-section {
  padding-top: 8px;
}

.elegant-button {
  border-radius: 14px;
  font-weight: 600;
  text-transform: none;
  height: 52px;
  font-size: 16px;
  letter-spacing: -0.2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.button-text {
  position: relative;
  z-index: 2;
}

.button-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.6s ease;
}

.elegant-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.elegant-button:hover .button-shine {
  left: 100%;
}

.elegant-button:active {
  transform: translateY(0);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

/* 아름다운 애니메이션 */
@keyframes iconFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes iconPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.1;
  }
}

@keyframes progressRotate {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(5deg);
  }
}

.elegant-modal .v-card {
  animation: modalElegantAppear 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes modalElegantAppear {
  from {
    transform: scale(0.9) translateY(30px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* 아름다운 토스트 알림 */
.toast-notification {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(20px);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(248, 250, 252, 0.95) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.toast-content {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.2px;
  color: #2d3748;
}

/* 토스트 애니메이션 */
.toast-notification .v-snackbar__wrapper {
  animation: elegantToastSlide 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes elegantToastSlide {
  from {
    transform: translateX(100%) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
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
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-file-item {
  display: flex;
  width: 100%;
}

/* 이미지 그리드 컨테이너 */
.images-grid-container {
  width: 100%;
  margin-bottom: 8px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 6px;
  max-width: 100%;
}

/* 이미지가 1개일 때 크게 표시 */
.images-grid.single-image {
  grid-template-columns: 1fr;
  max-width: 500px;
  gap: 0;
}

/* 이미지가 2-3개일 때 더 크게 표시 */
.images-grid.few-images {
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 8px;
}

.image-grid-item {
  text-decoration: none;
  color: inherit;
  display: block;
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

/* 이미지가 1개일 때 더 크게 */
.single-image .image-grid-item {
  aspect-ratio: auto;
  max-height: 500px;
}

.image-card-grid {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  transition: transform 0.2s ease;
}

.image-grid-item:hover .image-card-grid {
  transform: scale(1.02);
}

.image-wrapper-grid {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.image-thumb-grid {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

/* 이미지가 1개일 때는 contain 사용해서 전체 이미지 보이기 */
.single-image .image-thumb-grid {
  object-fit: contain;
  max-height: 500px;
}

.image-grid-item:hover .image-thumb-grid {
  transform: scale(1.08);
}

.image-overlay-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-grid-item:hover .image-overlay-grid {
  opacity: 1;
}

/* 더보기 버튼 */
.show-more-images {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  margin-top: 8px;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  user-select: none;
}

.show-more-images:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.3);
  transform: translateY(-1px);
}

.show-more-images .v-icon {
  font-size: 18px;
}

/* 이미지 카드 링크 */
.image-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  width: 100%;
  max-width: 320px;
}

/* 이미지 카드 */
.image-card {
  background: rgba(var(--v-theme-surface), 0.8);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.image-card:hover .image-thumb {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.image-info {
  padding: 10px 14px;
  background: rgba(var(--v-theme-surface), 0.95);
}

.image-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.8);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 파일 카드 링크 */
.file-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  width: 100%;
  max-width: 100%;
}

/* 파일 카드 */
.file-card {
  background: rgba(var(--v-theme-surface), 0.95);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.file-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-surface), 1);
}

.file-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.file-card:hover .file-icon-wrapper {
  transform: scale(1.05);
}

/* 파일 아이콘 색상 클래스 */
.file-icon-pdf .v-icon {
  color: #dc2626;
}

.file-icon-word .v-icon {
  color: #2563eb;
}

.file-icon-excel .v-icon {
  color: #16a34a;
}

.file-icon-ppt .v-icon {
  color: #ea580c;
}

.file-icon-zip .v-icon {
  color: #9333ea;
}

.file-icon-text .v-icon {
  color: #64748b;
}

.file-icon-video .v-icon {
  color: #e11d48;
}

.file-icon-audio .v-icon {
  color: #7c3aed;
}

.file-icon-default .v-icon {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.file-icon-wrapper .v-icon {
  font-size: 22px;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name-text {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size-text {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-size-icon {
  font-size: 14px;
}

.file-action-icon {
  color: rgba(var(--v-theme-on-surface), 0.4);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.file-card:hover .file-action-icon {
  color: rgb(var(--v-theme-primary));
  transform: translateX(2px);
}

.message-file-item:last-child {
  margin-bottom: 0;
}

/* 자신의 메시지에서 파일 카드 색상 조정 */
.message-item.own-message .file-card {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.message-item.own-message .file-card:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.35);
}

.message-item.own-message .image-card {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }

  .messages-container {
    padding: 12px 16px;
  }

  .images-grid {
    grid-template-columns: repeat(4, minmax(130px, 1fr));
    gap: 6px;
  }

  .images-grid.few-images {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
    gap: 8px;
  }

  .images-grid.single-image {
    grid-template-columns: 1fr;
    max-width: 500px;
  }
}

@media (max-width: 480px) {
  .images-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
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

.mention-item-selected {
  background: rgba(var(--v-theme-primary), 0.15);
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

/* Vuetify 입력 필드 레이아웃 */
.input-field {
  flex: 1 1 auto;
  min-width: 0;
}

.message-textarea :deep(.v-input),
.message-textarea :deep(.v-input__control),
.message-textarea :deep(.v-field),
.message-textarea :deep(.v-field__input),
.message-textarea :deep(textarea) {
  width: 100%;
  max-width: 100%;
  min-width: 100%;
  flex: 1 1 auto;
  display: block;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}

.message-textarea :deep(textarea) {
  resize: none;
  line-height: 52px;
  overflow-x: hidden;
  padding-top: 16px;
  padding-bottom: 16px;
}

/* 멘션된 메시지 배경 하이라이트 */
.message-bubble.mentioned {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
  animation: mentionGlow 2s ease-in-out infinite alternate;
  transition: all 0.3s ease;
}

/* 멘션 하이라이트 애니메이션 */
@keyframes mentionGlow {
  0% {
    box-shadow: 0 0 8px rgba(124, 58, 237, 0.3);
  }
  50% {
    box-shadow: 0 0 16px rgba(124, 58, 237, 0.6);
  }
  100% {
    box-shadow: 0 0 8px rgba(124, 58, 237, 0.3);
  }
}

/* 멘션된 메시지 텍스트 강조 */
.message-bubble.mentioned .message-text {
  color: #4c1d95;
  font-weight: 600;
}

/* 구분선 */
.message-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 24px 0;
  padding: 0 24px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(var(--v-theme-primary), 0.3),
    transparent
  );
}

.divider-text {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-surface));
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  white-space: nowrap;
}

/* 사용자 정보 사이드바 (개인 워크스페이스 1:1 채팅일 때만) */
.user-info-sidebar {
  width: 280px;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.user-header {
  padding: 14.5px;
  text-align: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.user-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.user-profile {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.user-avatar {
  margin: 0 auto 12px;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 8px;
}

.user-status {
  display: flex;
  justify-content: center;
}

.user-details {
  padding: 20px;
  flex: 1;
}

.detail-section {
  margin-bottom: 24px;
  text-align: center;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}

.detail-item .v-icon {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.status-message {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.8);
  margin: 0;
  padding: 8px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.activity-item .v-icon {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.workspace-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workspace-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  transition: background 0.2s;
}

.workspace-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.1);
}

.workspace-item .v-icon {
  color: rgb(var(--v-theme-primary));
}

.empty-text {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 8px 0;
  text-align: center;
}
</style>
