<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { usePermissions, PERMISSIONS } from "@/composables/usePermissions";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useWorkspaceMemberStore } from "@/store/workspaceMemberStore";
import { emitter } from "@/eventBus";
import { useRoute } from "vue-router";
import PollModal from "./PollModal.vue";
import FileAttachmentModal from "./FileAttachmentModal.vue";
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import axios from "axios";

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
});

const { hasPermission, isManager, isSuper } = usePermissions();

// Store 사용
const workspaceStore = useWorkspaceStore();
const route = useRoute();
const workspaceMemberStore = useWorkspaceMemberStore();

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
let typingTimeout = null;  // 타이핑 종료 타이머
let lastTypingSent = 0;     // 마지막 전송 시간
let typingInterval = null;  // 타이핑 지속 알림 인터벌

// 채널 목록 (Store에서 가져오기)
const channels = computed(() => {
  const channelList =
    workspaceMemberStore.chatChannels?.map((channel) => ({
      id: channel.channelSeq.toString(),
      name: channel.channelName,
      type: "text",
      unread: 0,
      channelData: channel,
    })) || [];

  console.log(
    "📋 Store에서 가져온 채널 데이터:",
    workspaceMemberStore.chatChannels
  );
  console.log("📋 변환된 채널 목록:", channelList);

  return channelList;
});

// 현재 채널
const currentChannel = ref("general");

// 현재 채널 이름 가져오기
const currentChannelName = computed(() => {
  const channel = channels.value.find((c) => c.id === currentChannel.value);
  return channel ? channel.name : "채널";
});

// 실제 메시지 데이터 (WebSocket에서 받아온 메시지들)
const messages = ref([]);

// 새 메시지
const newMessage = ref("");

// 메시지 입력 관련 상태
const showAttachmentMenu = ref(false);
const isTyping = ref(false);
const messageInputFocused = ref(false);
const otherTyping = ref(false);
const typingUserName = ref("");

// 모달 관련
const showPollModal = ref(false);
const showFileModal = ref(false);
const showFileLimitModal = ref(false);
const fileLimitMessage = ref("");

// 첨부된 파일들
const attachedFiles = ref([]);

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

// ✅ WebSocket 연결
const connectWebsocket = () => {
  console.log("토큰 확인:", token.value);
  if (stompClient.value && stompClient.value.connected) return;

  const sockJs = new SockJS(
    `${import.meta.env.VITE_API_URL}/chat-service/connect`
  );
  stompClient.value = Stomp.over(sockJs);

  stompClient.value.connect(
    { Authorization: `Bearer ${token.value}` },
    () => {
      console.log("✅ WebSocket 연결 성공!");
      console.log("🔍 구독할 채널 Seq:", channelSeq.value);
      console.log("🔍 구독 경로:", `/topic/${channelSeq.value}`);

      subscription.value = stompClient.value.subscribe(
        `/topic/${channelSeq.value}`,
        (message) => {
          try {
            const parsed = JSON.parse(message.body);
            console.log("📩 메시지 수신:", parsed);

            // ✅ TYPING 이벤트 처리
            if (parsed.action === "TYPING") {
              console.log("⌨️ 타이핑 이벤트 수신:", parsed);
              
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
              console.log("🗑️ 삭제된 메시지:", parsed.chatMessageSeq);
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
    // 🟡 읽음 처리 API 호출
    await axios.post(
      `${import.meta.env.VITE_API_URL}/chat-service/chat/channels/${
        channelSeq.value
      }/read`,
      {},
      {
        headers: {
          "X-Member-Seq": memberSeq.value,
          Authorization: `Bearer ${token.value}`,
        },
      }
    );
    console.log("✅ 마지막 읽은 메시지 업데이트 완료");
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

// ✅ 메시지 전송
const sendMessage = async () => {
  console.log("============= 메시지 전송 ===============", memberSeq.value);
  
  // 중복 전송 방지
  if (isSending.value) {
    console.warn("이미 전송 중입니다. 잠시만 기다려주세요.");
    return;
  }
  
  if (!stompClient.value || !stompClient.value.connected) {
    console.error("WebSocket 연결이 없습니다!");
    return;
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
  console.log("📤 메시지 전송 시도...");
  console.log("🔍 전송할 채널 Seq:", channelSeq.value);
  console.log("🔍 전송 경로:", `/publish/${channelSeq.value}`);
  console.log("🔍 메시지 내용:", message);

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

    scrollToBottom();
  } finally {
    // 전송 완료/실패 무관하게 플래그 해제
    isSending.value = false;
  }
};

// ✅ 메시지 삭제 (하드 삭제)
const deleteMessage = async (message) => {
  try {
    const url = `${import.meta.env.VITE_API_URL}/chat-service/chat/messages/${
      message.id
    }`;
    const res = await axios.delete(url, {
      headers: {
        "X-Member-Seq": memberSeq.value,
        Authorization: `Bearer ${token.value}`,
      },
    });

    console.log("✅ 메시지 삭제 성공:", res.data);

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
      console.log("새 채널 생성:", newChannel);
    }
  }
};

const loadMoreMessages = async (lastId = null) => {
  // 중복 로드 방지
  if (isLoadingMessages.value || !hasMoreMessages.value) return;

  isLoadingMessages.value = true;

  try {
    console.log("📥 이전 메시지 로드 시작 - lastId:", lastId);

    const url = `${import.meta.env.VITE_API_URL}/chat-service/chat/channels/${
      channelSeq.value
    }/messages${lastId ? `?lastId=${lastId}` : ""}`;

    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token.value}`,
        "X-Member-Seq": memberSeq.value,
      },
    });

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
      console.log("📭 더 이상 로드할 메시지가 없습니다.");
      hasMoreMessages.value = false;
      isLoadingMessages.value = false;
      return;
    }

    console.log("📨 로드된 메시지 개수:", loadedMessages.length);

    // 메시지 맵핑 → WebSocket 수신 형식과 동일하게 변환
    const formatted = loadedMessages.map((m) => ({
      id: m.chatMessageSeq,
      user: m.senderName,
      content: m.chatMessageText,
      time: new Date(m.createdAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
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
    }));

    // ✅ 스크롤 위치 저장
    const container = document.querySelector(".messages-container");
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    // ✅ prepend (기존 메시지 앞에 붙임)
    // BE에서 DESC 순서로 반환되므로 reverse() 후 앞에 추가하면 올바른 시간순 (오래된 → 최신)
    messages.value = [...formatted.reverse(), ...messages.value];

    // ✅ 재접속 시(lastReadMessageSeq.value가 있으면): 구분선 위치 복원
    if (lastReadMessageSeq.value) {
      console.log("📍 재접속 - 구분선 위치로 스크롤 복원");

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
          console.log("📍 구분선 위치로 스크롤 복원 완료");
        } else {
          firstNewMessage.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
          console.log("📍 새 메시지 위치로 스크롤 복원 완료");
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
        console.log("📍 스크롤 위치 복원 - 차이:", heightDifference);
      }
    } else {
      // 처음 로드하는 경우 맨 아래로 스크롤
      await new Promise((resolve) => setTimeout(resolve, 50)); // DOM 업데이트 대기
      scrollToBottom();
      console.log("📍 최초 접속 - 맨 아래로 스크롤");
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

  isLoadingMessages.value = true;

  try {
    console.log("📥 새 메시지 로드 시작 (마지막 읽은 메시지 이후)");

    const url = `${import.meta.env.VITE_API_URL}/chat-service/chat/channels/${
      channelSeq.value
    }/messages/after-last-read`;

    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token.value}`,
        "X-Member-Seq": memberSeq.value,
      },
    });

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
      console.log(
        "📭 새 메시지가 없습니다. (최초 접속 또는 읽을 새 메시지 없음)"
      );
      lastReadMessageSeq.value = null;
      isLoadingMessages.value = false;
      return [];
    }

    console.log("📨 로드된 새 메시지 개수:", loadedMessages.length);

    // 메시지 맵핑
    const formatted = loadedMessages.map((m) => ({
      id: m.chatMessageSeq,
      user: m.senderName,
      content: m.chatMessageText,
      time: new Date(m.createdAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
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
    }));

    // 마지막 읽은 메시지 저장 (가장 오래된 새 메시지)
    // ✅ 새 메시지가 있으면 → 재접속 (lastReadSeq가 있음)
    // ✅ 새 메시지가 없으면 → 최초 접속 또는 읽을 새 메시지 없음 (lastReadSeq가 null)
    if (formatted.length > 0) {
      lastReadMessageSeq.value = formatted[0].id;
      console.log("📍 마지막 읽은 메시지 seq:", lastReadMessageSeq.value);
      console.log("🔄 재접속 감지 - 구분선 표시 예정");
    }

    isLoadingMessages.value = false;
    return formatted;
  } catch (e) {
    console.error("❌ 새 메시지 로드 실패:", e);
    lastReadMessageSeq.value = null;
    isLoadingMessages.value = false;
    return [];
  }
};

// 채널 변경 시 WebSocket 재연결
const changeChannel = async (channelId) => {
  sendTypingStopEvent();
  
  if (currentChannel.value === channelId) return;

  console.log("🔄 채널 변경:", currentChannel.value, "→", channelId);
  console.log("🔍 새로운 채널 Seq:", channelId);

  // 기존 연결 해제
  disconnectWebsocket();

  // 새 채널로 변경
  currentChannel.value = channelId;
  channelSeq.value = parseInt(channelId); // 문자열을 숫자로 변환
  messages.value = [];

  // 이전 메시지 로드 상태 리셋
  hasMoreMessages.value = true;
  isLoadingMessages.value = false;
  lastReadMessageSeq.value = null; // ✅ 마지막 읽은 메시지 초기화

  console.log("✅ 채널 변경 완료 - 현재 채널 Seq:", channelSeq.value);
  console.log("🔍 channelSeq 타입:", typeof channelSeq.value);

  // ✅ 1단계: 마지막 읽은 이후의 새 메시지 로드
  const newMessages = await loadMessagesAfterLastRead();

  // ✅ 2단계: 재접속 여부에 따른 처리
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
          console.log("📍 구분선 위치로 스크롤 완료 (상단)");
        } else {
          // 구분선이 없으면 메시지 상단으로 스크롤
          firstNewMessage.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
          console.log("📍 새 메시지 위치로 스크롤 완료");
        }
      }
    }
  } else {
    // 🆕 최초 접속: 모든 메시지 로드 후 맨 아래로 스크롤
    console.log("🆕 최초 접속 감지 - 모든 메시지 로드");
  }

  // ✅ 3단계: 이전 메시지 로드
  // 재접속 시(lastReadMessageSeq.value가 있으면): 구분선 이전의 메시지만 로드
  // 최초 접속 시(null): 최신 메시지 로드
  const lastId = lastReadMessageSeq.value || null;
  await loadMoreMessages(lastId);

  // 새 채널로 연결
  connectWebsocket();
};

// ✅ 로드 상태 플래그 - 중복 로드 방지
const hasLoadedInitialChannel = ref(false);

// 하위 채널 선택 이벤트 처리 (event bus용)
const handleSubChannelSelect = ({ parentId, subChannelId }) => {
  console.log("📣 select-chat-channel 이벤트:", parentId, subChannelId);
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

  // ✅ 투표 전송 후에도 타이핑 종료 브로드캐스트
  try {
    sendTypingStopEvent();
  } catch (e) {
    console.warn("타이핑 종료 이벤트 전송 실패", e);
  }

  newMessage.value = "";
  isTyping.value = false;
  showAttachmentMenu.value = false;
  scrollToBottom();
};

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

// ✅ Scroll 최상단 감지 후 이전 메시지 로드
const handleScroll = async (e) => {
  const container = e.target;

  // 로딩 중이거나 더 이상 메시지가 없으면 리턴
  if (isLoadingMessages.value || !hasMoreMessages.value) return;

  // 스크롤이 최상단에 있고 메시지가 있을 때만 로드
  if (container.scrollTop === 0 && messages.value.length > 0) {
    const oldest = messages.value[0];
    console.log(
      "🔄 최상단 스크롤 감지 - 이전 메시지 로드 시작 - oldest.id:",
      oldest.id
    );
    await loadMoreMessages(oldest.id);
  }
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
      console.log("⌨️ [타이핑] 입력 내용 있음 → 시작");
      sendTypingStartEvent();
    }
  } else {
    // 입력 내용이 없으면 → 타이핑 종료 이벤트 전송
    console.log("⌨️ [타이핑] 입력 내용 없음 → 종료");
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
    const lower = url.split('?')[0].toLowerCase();
    return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)$/.test(lower);
  } catch (e) {
    return false;
  }
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
        typing: true
      };

      stompClient.value.send(
        `/publish/typing/${channelSeq.value}`,
        JSON.stringify(typingEvent),
        { Authorization: `Bearer ${token.value}` }
      );

      console.log("⌨️ [타이핑 중] 이벤트 전송");
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
    typing: false
  };

  // 6. WebSocket 전송
  stompClient.value.send(
    `/publish/typing/${channelSeq.value}`,
    JSON.stringify(stopEvent),
    { Authorization: `Bearer ${token.value}` }
  );

  console.log("⌨️ [종료] 이벤트:", stopEvent);
  lastTypingSent = 0;
};

// ✅ 구분선 표시 여부 판단 (비활성화)
const shouldShowDivider = (message, index) => {
  // 구분선 표시 안함
  return false;
};

// 이벤트 리스너 등록/해제
onMounted(async () => {
  console.log("📥 listener mounted!");
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

  console.log("🟢 Chat 시작");
  console.log("- memberSeq:", memberSeq.value);
  console.log("- JWT payload:", payload);

  // ✅ Store 초기화 대기
  await waitForStore();

  // ✅ 채널 목록이 비어있으면 종료
  if (channels.value.length === 0) {
    console.warn("⚠️ 채널 목록이 비어있습니다.");
    return;
  }

  // ✅ URL에서 채널 ID 가져오기 (새로고침 시 유지)
  const urlChannelId = route.params.subChannel?.toString();
  console.log("🔍 URL 채널 ID:", urlChannelId);
  console.log("🔍 route.params:", route.params);

  // ✅ 초기 채널 설정 (URL > props > 첫번째 채널 순서)
  const initialChannel =
    urlChannelId || props.selectedChannel || channels.value[0].id;
  currentChannel.value = initialChannel;
  channelSeq.value = parseInt(initialChannel);
  console.log("🔍 최초 채널 선택:", {
    urlChannelId,
    selectedChannel: props.selectedChannel,
    initialChannel,
    channelSeq: channelSeq.value,
  });

  // ✅ 채널 참여 멤버 목록 초기화
  getChannelMembers().then(async () => {
    // ✅ memberSeq가 유효할 때만 채널 로드
    if (memberSeq.value > 0 && currentChannel.value) {
      hasLoadedInitialChannel.value = true;
      // ✅ 1. 마지막 읽은 이후의 새 메시지 로드 시도
      const newMessages = await loadMessagesAfterLastRead();

      // ✅ 2. 재접속 여부에 따른 처리
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
              console.log("📍 구분선 위치로 스크롤 완료 (상단)");
            } else {
              // 구분선이 없으면 메시지 상단으로 스크롤
              firstNewMessage.scrollIntoView({
                behavior: "instant",
                block: "start",
              });
              console.log("📍 새 메시지 위치로 스크롤 완료");
            }
          }
        }
      } else {
        // 🆕 최초 접속: 모든 메시지 로드 후 맨 아래로 스크롤
        console.log("🆕 최초 접속 감지 - 모든 메시지 로드");
      }

      // ✅ 3. 이전 메시지 로드
      // 재접속 시(lastReadMessageSeq.value가 있으면): 구분선 이전의 메시지만 로드
      // 최초 접속 시(null): 최신 메시지 로드
      const lastId = lastReadMessageSeq.value || null;
      await loadMoreMessages(lastId);

      // ✅ 4. WebSocket 연결
      connectWebsocket();
    } else {
      console.error("❌ memberSeq 또는 채널이 유효하지 않습니다.");
    }
  });

  // ✅ 스크롤 이벤트 리스너 등록 (DOM 준비 대기)
  await nextTick();
  const container = document.querySelector(".messages-container");
  if (container) {
    container.addEventListener("scroll", handleScroll);
  }
});

// ✅ props.selectedChannel 변경 감지 - 채널 자동 전환
watch(
  () => props.selectedChannel,
  (newChannelId) => {
    console.log("🔔 selectedChannel props 변경 감지:", newChannelId);
    if (!newChannelId) return;

    if (currentChannel.value === newChannelId) {
      console.log("🚫 같은 채널이므로 skip");
      return;
    }

    // props로 다른 채널이 오면 전환
    console.log(
      "🔄 props에 따라 채널 전환:",
      currentChannel.value,
      "→",
      newChannelId
    );
    changeChannel(newChannelId);
  },
  { immediate: false }
);

onUnmounted(() => {
  emitter.off("select-chat-channel", handleSubChannelSelect);
  window.removeEventListener("click", closeContextMenu);
  
  // ✅ 컴포넌트 종료 시 타이핑 종료 브로드캐스트
  try {
    if (isTyping.value || typingInterval) {
      sendTypingStopEvent();
      isTyping.value = false;
    }
  } catch (e) {
    console.warn("타이핑 종료 이벤트 전송 실패", e);
  }
  
  disconnectWebsocket();
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
          <v-icon>mdi-pound</v-icon>
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
              <div class="message-content">
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
                        {{
                          getReplyToMessage(message.replyToSeq)?.user ||
                          " "
                        }}
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
                      <div
                        v-for="(file, i) in message.files"
                        :key="i"
                        class="message-file-item"
                      >
                        <!-- 이미지면 썸네일, 아니면 아이콘+링크 -->
                        <template v-if="isImageUrl(file.url)">
                          <a
                            :href="file.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="image-thumb-link"
                          >
                            <img :src="file.url" :alt="file.name" class="image-thumb" />
                          </a>
                        </template>
                        <template v-else>
                          <v-icon class="mr-2">mdi-file</v-icon>
                          <a
                            :href="file.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="file-name"
                          >
                            {{ file.name }}
                          </a>
                        </template>
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
        <span class="typing-text">{{ typingUserName }}님이 입력 중입니다...</span>
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
              :disabled="isSending || (!newMessage.trim() && attachedFiles.length === 0)"
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

.channel-name {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
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
  position: relative;
  padding-right: 70px; /* 기본: 오른쪽에 공간 확보 (메타 폭 + 여유) */
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
  width: 40px; /* 아바타 크기 고정 */
  height: 40px;
  border-radius: 50%; /* 동그라미 모양 */
  overflow: hidden; /* 이미지를 원 안에 자름 */
  background-color: #f2f2f2; /* 이미지 없을 때 배경색 */
  flex-shrink: 0; /* 아바타 크기 고정 - 축소 방지 */
  min-width: 40px; /* 최소 너비 보장 */
  min-height: 40px; /* 최소 높이 보장 */
}

/* ✅ 연속된 메시지에서 아바타 투명하게 */
.message-avatar.avatar-hidden {
  opacity: 0;
  pointer-events: none;
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
  cursor: text;
  width: 100%;
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

:deep(.mention-overlay .mention-highlight) {
  color: #6366f1 !important;
  background: rgba(99, 102, 241, 0.1) !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: inline !important;
  border: none !important;
  font-size: 0.95em !important;
}

/* 오버레이에서 멘션이 아닌 텍스트는 완전히 투명하게 */
.mention-overlay {
  color: transparent !important;
}

.mention-overlay * {
  color: transparent !important;
}

.mention-overlay .mention-highlight {
  color: #6366f1 !important;
}

:deep(.mention-highlight) {
  background: rgba(99, 102, 241, 0.1) !important;
  color: #6366f1 !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: inline !important;
  border: none !important;
  font-size: 0.95em !important;
}

/* 전역 멘션 하이라이트 스타일 */
.mention-highlight {
  background: rgba(99, 102, 241, 0.1) !important;
  color: #6366f1 !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: inline !important;
  border: none !important;
  font-size: 0.95em !important;
}

/* 메시지 내 멘션 하이라이트 */
:deep(.message-text .mention-highlight) {
  background: #e0e7ff !important;
  color: #4f46e5 !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  font-size: inherit !important;
  display: inline !important;
  border: none !important;
}

/* 더 강력한 선택자 */
.team-chat .mention-highlight {
  background: rgba(99, 102, 241, 0.1) !important;
  color: #6366f1 !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: inline !important;
  border: none !important;
  font-size: 0.95em !important;
}

.team-chat .message-text .mention-highlight {
  background: #e0e7ff !important;
  color: #4f46e5 !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: inline !important;
  border: none !important;
  font-size: inherit !important;
}

.team-chat .mention-overlay .mention-highlight {
  background: rgba(99, 102, 241, 0.1) !important;
  color: #6366f1 !important;
  padding: 1px 4px !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  display: inline !important;
  border: none !important;
  font-size: 0.95em !important;
}

/* 답장 미리보기 내 멘션 하이라이트 */
:deep(.reply-text .mention-highlight),
:deep(.reply-preview-text .mention-highlight) {
  background: rgba(99, 102, 241, 0.08) !important;
  color: #6366f1 !important;
  padding: 1px 3px !important;
  border-radius: 4px !important;
  font-weight: 500 !important;
  font-size: inherit !important;
  display: inline !important;
  border: none !important;
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

/* Vuetify textarea의 기본 하이라이트 비활성화 */
.message-textarea :deep(.v-field__input) {
  background: transparent !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  caret-color: rgb(var(--v-theme-on-surface)) !important;
  position: relative;
  z-index: 1;
}

.message-textarea :deep(.v-field__input::selection) {
  background: rgba(var(--v-theme-primary), 0.2) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.message-textarea :deep(.v-field__input::-moz-selection) {
  background: rgba(var(--v-theme-primary), 0.2) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* 멘션 부분만 textarea에서 숨기기 - 정규식으로 멘션 부분을 공백으로 대체 */

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
  color: white !important;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
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
  margin-top: 8px;
  margin-bottom: 8px;
  border-top: none;
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

/* 이미지 썸네일 */
.image-thumb-link {
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  line-height: 0;
}

.image-thumb {
  width: 160px;
  height: 160px;
  object-fit: cover;
  display: block;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
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

.mention-item-selected {
  background: rgba(var(--v-theme-primary), 0.15) !important;
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

.message-textarea :deep(.v-field) {
  width: 100% !important;
  max-width: 100% !important;
}

.message-textarea :deep(.v-field__input) {
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  box-sizing: border-box !important;
}

.message-textarea :deep(textarea) {
  width: 100% !important;
  max-width: 100% !important;
  resize: none !important;
  line-height: 52px !important;
  overflow-x: hidden !important;
  box-sizing: border-box !important;
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}

.input-field {
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

/* 🚨 Vuetify 내부 display 강제 덮어쓰기 */
.message-textarea :deep(.v-input),
.message-textarea :deep(.v-input__control),
.message-textarea :deep(.v-field),
.message-textarea :deep(.v-field__input),
.message-textarea :deep(textarea) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  flex: 1 1 auto !important;
  display: block !important;
  box-sizing: border-box !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

/* ✅ 내가 멘션된 메시지 배경 하이라이트 (강조 버전) */
.message-bubble.mentioned {
  background: linear-gradient(
    135deg,
    #ede9fe,
    #ddd6fe
  ) !important; /* 보라빛 그라데이션 */
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.5) !important; /* 외곽광 */
  animation: mentionGlow 2s ease-in-out infinite alternate;
  transition: all 0.3s ease;
}

/* 💡 하이라이트 애니메이션 */
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

/* 🟣 메시지 텍스트 색도 살짝 강조 */
.message-bubble.mentioned .message-text {
  color: #4c1d95 !important;
  font-weight: 600;
}

/* ✅ 구분선 스타일 */
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
</style>
