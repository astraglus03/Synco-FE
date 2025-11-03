<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import FileAttachmentModal from "./FileAttachmentModal.vue";

const props = defineProps({
  currentChannel: String,
});

// 채팅 목록
const chatList = ref([
  {
    id: "kim_minsu",
    name: "김민수",
    lastMessage: "안녕하세요!",
    time: "5분 전",
    unread: 2,
    avatar: "김",
  },
  {
    id: "lee_jihyun",
    name: "이지현",
    lastMessage: "회의 준비됐어요",
    time: "12분 전",
    unread: 0,
    avatar: "이",
  },
  {
    id: "park_junyoung",
    name: "박준영",
    lastMessage: "파일 확인했습니다",
    time: "1시간 전",
    unread: 1,
    avatar: "박",
  },
  {
    id: "choi_sujin",
    name: "최수진",
    lastMessage: "내일 미팅 시간 어때요?",
    time: "2시간 전",
    unread: 0,
    avatar: "최",
  },
  {
    id: "jung_hyunwoo",
    name: "정현우",
    lastMessage: "코드 리뷰 완료했어요",
    time: "3시간 전",
    unread: 1,
    avatar: "정",
  },
  {
    id: "han_soyoung",
    name: "한소영",
    lastMessage: "프레젠테이션 자료 보냈어요",
    time: "4시간 전",
    unread: 0,
    avatar: "한",
  },
  {
    id: "yoon_donghyun",
    name: "윤동현",
    lastMessage: "데이터 분석 결과 나왔어요",
    time: "5시간 전",
    unread: 2,
    avatar: "윤",
  },
  {
    id: "kang_minji",
    name: "강민지",
    lastMessage: "고객 피드백 정리했어요",
    time: "6시간 전",
    unread: 0,
    avatar: "강",
  },
  {
    id: "oh_seungmin",
    name: "오승민",
    lastMessage: "시스템 점검 완료했습니다",
    time: "7시간 전",
    unread: 1,
    avatar: "오",
  },
  {
    id: "lim_jiyeon",
    name: "임지연",
    lastMessage: "마케팅 계획 검토해주세요",
    time: "8시간 전",
    unread: 0,
    avatar: "임",
  },
  {
    id: "shin_taewon",
    name: "신태원",
    lastMessage: "새 프로젝트 제안서 작성 중",
    time: "9시간 전",
    unread: 3,
    avatar: "신",
  },
  {
    id: "kwon_hyerim",
    name: "권혜림",
    lastMessage: "예산안 검토 부탁드려요",
    time: "10시간 전",
    unread: 0,
    avatar: "권",
  },
  {
    id: "ryu_jongho",
    name: "류종호",
    lastMessage: "보고서 초안 완성했어요",
    time: "11시간 전",
    unread: 1,
    avatar: "류",
  },
  {
    id: "song_jiwon",
    name: "송지원",
    lastMessage: "팀 미팅 일정 조율해주세요",
    time: "12시간 전",
    unread: 0,
    avatar: "송",
  },
  {
    id: "jang_myeongsu",
    name: "장명수",
    lastMessage: "기술 문서 업데이트했습니다",
    time: "1일 전",
    unread: 2,
    avatar: "장",
  },
  {
    id: "kim_yeonju",
    name: "김연주",
    lastMessage: "고객 상담 일정 잡았어요",
    time: "1일 전",
    unread: 0,
    avatar: "김",
  },
  {
    id: "lee_hyunseok",
    name: "이현석",
    lastMessage: "품질 검사 결과 양호합니다",
    time: "1일 전",
    unread: 1,
    avatar: "이",
  },
  {
    id: "park_sunhee",
    name: "박선희",
    lastMessage: "교육 자료 준비 완료했어요",
    time: "2일 전",
    unread: 0,
    avatar: "박",
  },
  {
    id: "choi_jihoon",
    name: "최지훈",
    lastMessage: "네트워크 보안 점검 중",
    time: "2일 전",
    unread: 1,
    avatar: "최",
  },
  {
    id: "jung_sohee",
    name: "정소희",
    lastMessage: "인사팀과 급여 관련 논의",
    time: "3일 전",
    unread: 0,
    avatar: "정",
  },
]);

// 현재 선택된 채팅
const selectedChat = ref("park_junyoung");

// 아바타 초기값 가져오기
const getAvatarInitial = (name) => {
  return name.charAt(0);
};

// 각 사용자별 메시지 데이터
const chatMessages = {
  kim_minsu: [
    {
      id: 1,
      sender: "김민수",
      content: "안녕하세요! 프로젝트 진행 상황은 어떤가요?",
      time: "14:30",
      isOwn: false,
      unread: 1,
    },
    {
      id: 2,
      sender: "나",
      content: "네, 잘 진행되고 있습니다. 내일까지 완료할 예정이에요.",
      time: "14:32",
      isOwn: true,
    },
    {
      id: 3,
      sender: "김민수",
      content: "좋습니다! 그럼 내일 오후에 미팅을 잡을까요?",
      time: "14:35",
      isOwn: false,
      unread: 1,
    },
  ],
  lee_jihyun: [
    {
      id: 1,
      sender: "이지현",
      content: "회의 준비 다 됐어요!",
      time: "10:15",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "고마워요! 자료는 준비됐나요?",
      time: "10:18",
      isOwn: true,
    },
    {
      id: 3,
      sender: "이지현",
      content: "네, 프레젠테이션도 완성했어요",
      time: "10:20",
      isOwn: false,
    },
  ],
  park_junyoung: [
    {
      id: 1,
      sender: "박준영",
      content: "파일 확인했습니다. 수정사항이 있나요?",
      time: "09:45",
      isOwn: false,
      unread: 1,
    },
    {
      id: 2,
      sender: "나",
      content: "네, 몇 가지 수정이 필요해요",
      time: "09:50",
      isOwn: true,
    },
    {
      id: 3,
      sender: "박준영",
      content: "어떤 부분을 수정하면 될까요?",
      time: "09:52",
      isOwn: false,
    },
    {
      id: 4,
      sender: "나",
      content: "3페이지의 차트 부분이요",
      time: "09:55",
      isOwn: true,
    },
  ],
  choi_sujin: [
    {
      id: 1,
      sender: "최수진",
      content: "내일 미팅 시간 어때요?",
      time: "16:20",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "오후 2시는 어떠세요?",
      time: "16:25",
      isOwn: true,
    },
    {
      id: 3,
      sender: "최수진",
      content: "좋아요! 그럼 2시에 만나요",
      time: "16:30",
      isOwn: false,
    },
  ],
  jung_hyunwoo: [
    {
      id: 1,
      sender: "정현우",
      content: "코드 리뷰 완료했어요",
      time: "15:10",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "수고하셨어요! 이슈는 없었나요?",
      time: "15:15",
      isOwn: true,
    },
  ],
  han_soyoung: [
    {
      id: 1,
      sender: "한소영",
      content: "프레젠테이션 자료 보냈어요",
      time: "13:45",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "확인해보겠습니다!",
      time: "13:50",
      isOwn: true,
    },
  ],
  yoon_donghyun: [
    {
      id: 1,
      sender: "윤동현",
      content: "데이터 분석 결과 나왔어요",
      time: "12:30",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "어떤 결과인가요?",
      time: "12:35",
      isOwn: true,
    },
    {
      id: 3,
      sender: "윤동현",
      content: "예상보다 좋은 결과가 나왔어요",
      time: "12:40",
      isOwn: false,
    },
  ],
  kang_minji: [
    {
      id: 1,
      sender: "강민지",
      content: "고객 피드백 정리했어요",
      time: "11:20",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "고생하셨어요!",
      time: "11:25",
      isOwn: true,
    },
  ],
  oh_seungmin: [
    {
      id: 1,
      sender: "오승민",
      content: "시스템 점검 완료했습니다",
      time: "10:15",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "문제는 없었나요?",
      time: "10:20",
      isOwn: true,
    },
    {
      id: 3,
      sender: "오승민",
      content: "전체적으로 양호합니다",
      time: "10:25",
      isOwn: false,
    },
  ],
  lim_jiyeon: [
    {
      id: 1,
      sender: "임지연",
      content: "마케팅 계획 검토해주세요",
      time: "09:30",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "내일까지 검토하겠습니다",
      time: "09:35",
      isOwn: true,
    },
  ],
  shin_taewon: [
    {
      id: 1,
      sender: "신태원",
      content: "새 프로젝트 제안서 작성 중",
      time: "08:45",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "언제쯤 완성될까요?",
      time: "08:50",
      isOwn: true,
    },
    {
      id: 3,
      sender: "신태원",
      content: "이번 주말까지는 완성할 예정이에요",
      time: "08:55",
      isOwn: false,
    },
  ],
  kwon_hyerim: [
    {
      id: 1,
      sender: "권혜림",
      content: "예산안 검토 부탁드려요",
      time: "17:30",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "확인해보겠습니다",
      time: "17:35",
      isOwn: true,
    },
  ],
  ryu_jongho: [
    {
      id: 1,
      sender: "류종호",
      content: "보고서 초안 완성했어요",
      time: "16:20",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "수고하셨어요!",
      time: "16:25",
      isOwn: true,
    },
  ],
  song_jiwon: [
    {
      id: 1,
      sender: "송지원",
      content: "팀 미팅 일정 조율해주세요",
      time: "15:10",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "언제가 좋을까요?",
      time: "15:15",
      isOwn: true,
    },
  ],
  jang_myeongsu: [
    {
      id: 1,
      sender: "장명수",
      content: "기술 문서 업데이트했습니다",
      time: "14:30",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "확인해보겠습니다",
      time: "14:35",
      isOwn: true,
    },
  ],
  kim_yeonju: [
    {
      id: 1,
      sender: "김연주",
      content: "고객 상담 일정 잡았어요",
      time: "13:45",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "언제인가요?",
      time: "13:50",
      isOwn: true,
    },
  ],
  lee_hyunseok: [
    {
      id: 1,
      sender: "이현석",
      content: "품질 검사 결과 양호합니다",
      time: "12:20",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "다행이네요!",
      time: "12:25",
      isOwn: true,
    },
  ],
  park_sunhee: [
    {
      id: 1,
      sender: "박선희",
      content: "교육 자료 준비 완료했어요",
      time: "11:30",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "수고하셨어요!",
      time: "11:35",
      isOwn: true,
    },
  ],
  choi_jihoon: [
    {
      id: 1,
      sender: "최지훈",
      content: "네트워크 보안 점검 중",
      time: "10:15",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "문제는 없나요?",
      time: "10:20",
      isOwn: true,
    },
  ],
  jung_sohee: [
    {
      id: 1,
      sender: "정소희",
      content: "인사팀과 급여 관련 논의",
      time: "09:30",
      isOwn: false,
    },
    {
      id: 2,
      sender: "나",
      content: "어떤 내용인가요?",
      time: "09:35",
      isOwn: true,
    },
  ],
};

// 현재 선택된 채팅의 메시지
const messages = computed(() => {
  return chatMessages[selectedChat.value] || [];
});

// 새 메시지
const newMessage = ref("");

// 메시지 입력 관련 상태
const showAttachmentMenu = ref(false);
const isTyping = ref(false);
const messageInputFocused = ref(false);
const otherTyping = ref(false);

// 모달 관련
const showFileModal = ref(false);

// 첨부된 파일들
const attachedFiles = ref([]);

// 검색 쿼리
const searchQuery = ref("");

// 채팅 선택
const selectChat = (chatId) => {
  selectedChat.value = chatId;
  const chat = chatList.value.find((c) => c.id === chatId);
  if (chat) {
    chat.unread = 0; // 읽음 처리
  }
};

// 현재 채팅 정보
const currentChat = computed(() => {
  const chat = chatList.value.find((c) => c.id === selectedChat.value);
  if (!chat) return null;

  // 각 사용자별 추가 정보
  const userInfo = {
    kim_minsu: {
      email: "kim@company.com",
      phone: "010-1234-5678",
      status: "프로젝트 진행 중입니다",
    },
    lee_jihyun: {
      email: "lee@company.com",
      phone: "010-2345-6789",
      status: "회의 준비 중",
    },
    park_junyoung: {
      email: "park@company.com",
      phone: "010-3456-7890",
      status: "파일 검토 중",
    },
    choi_sujin: {
      email: "choi@company.com",
      phone: "010-4567-8901",
      status: "미팅 준비 중",
    },
    jung_hyunwoo: {
      email: "jung@company.com",
      phone: "010-5678-9012",
      status: "개발 중",
    },
    han_soyoung: {
      email: "han@company.com",
      phone: "010-6789-0123",
      status: "프레젠테이션 준비 중",
    },
    yoon_donghyun: {
      email: "yoon@company.com",
      phone: "010-7890-1234",
      status: "데이터 분석 중",
    },
    kang_minji: {
      email: "kang@company.com",
      phone: "010-8901-2345",
      status: "고객 서비스 중",
    },
    oh_seungmin: {
      email: "oh@company.com",
      phone: "010-9012-3456",
      status: "시스템 관리 중",
    },
    lim_jiyeon: {
      email: "lim@company.com",
      phone: "010-0123-4567",
      status: "마케팅 기획 중",
    },
    shin_taewon: {
      email: "shin@company.com",
      phone: "010-1234-5679",
      status: "프로젝트 기획 중",
    },
    kwon_hyerim: {
      email: "kwon@company.com",
      phone: "010-2345-6780",
      status: "예산 관리 중",
    },
    ryu_jongho: {
      email: "ryu@company.com",
      phone: "010-3456-7891",
      status: "보고서 작성 중",
    },
    song_jiwon: {
      email: "song@company.com",
      phone: "010-4567-8902",
      status: "일정 관리 중",
    },
    jang_myeongsu: {
      email: "jang@company.com",
      phone: "010-5678-9013",
      status: "기술 문서 작성 중",
    },
    kim_yeonju: {
      email: "kim2@company.com",
      phone: "010-6789-0124",
      status: "고객 상담 중",
    },
    lee_hyunseok: {
      email: "lee2@company.com",
      phone: "010-7890-1235",
      status: "품질 관리 중",
    },
    park_sunhee: {
      email: "park2@company.com",
      phone: "010-8901-2346",
      status: "교육 준비 중",
    },
    choi_jihoon: {
      email: "choi2@company.com",
      phone: "010-9012-3457",
      status: "보안 점검 중",
    },
    jung_sohee: {
      email: "jung2@company.com",
      phone: "010-0123-4568",
      status: "인사 업무 중",
    },
  };

  return {
    ...chat,
    ...userInfo[selectedChat.value],
  };
});

// 메시지 전송
const sendMessage = () => {
  if (newMessage.value.trim() || attachedFiles.value.length > 0) {
    const newMsg = {
      id: Date.now(),
      user: "나",
      content: newMessage.value,
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      avatar: "나",
      isOwn: true,
      files: attachedFiles.value.length > 0 ? [...attachedFiles.value] : null,
    };

    chatMessages[selectedChat.value].push(newMsg);
    newMessage.value = "";
    attachedFiles.value = [];
    isTyping.value = false;
    showAttachmentMenu.value = false;

    // 상대방 타이핑 시뮬레이션
    setTimeout(() => {
      otherTyping.value = true;
      setTimeout(() => {
        otherTyping.value = false;
        // 상대방 메시지 추가
        const otherMsg = {
          id: Date.now() + 1,
          user: "김민수",
          content: "네, 알겠습니다!",
          time: new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          avatar: "김",
          isOwn: false,
        };
        chatMessages[selectedChat.value].push(otherMsg);
      }, 2000);
    }, 1000);
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
const openFileModal = () => {
  showFileModal.value = true;
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

// 전역 이벤트 리스너
const handleSelectChat = (event) => {
  selectedChat.value = event.detail;
  const chat = chatList.value.find((c) => c.id === event.detail);
  if (chat) {
    chat.unread = 0; // 읽음 처리
  }
};

// 컴포넌트 마운트/언마운트 시 이벤트 리스너 등록/해제
onMounted(() => {
  window.addEventListener("select-chat", handleSelectChat);
});

onUnmounted(() => {
  window.removeEventListener("select-chat", handleSelectChat);
});

// 현재 채팅 상대방 정보
const chatPartner = computed(() => {
  return {
    name: "김민수",
    status: "online",
    avatar: "김",
  };
});
</script>

<template>
  <div class="personal-chat">
    <!-- 채팅 영역 -->
    <div class="chat-main">
      <!-- 채팅 헤더 -->
      <div class="chat-header">
        <div class="chat-partner-info">
          <v-avatar size="40" color="primary">
            {{ currentChat?.avatar || "김" }}
          </v-avatar>
          <div class="partner-details">
            <div class="partner-name">{{ currentChat?.name || "김민수" }}</div>
            <div class="partner-status">온라인</div>
          </div>
        </div>
        <div class="chat-actions">
          <!-- 검색바 -->
          <div class="search-container">
            <div class="search-input-wrapper">
              <v-icon class="search-icon">mdi-magnify</v-icon>
              <input
                type="text"
                placeholder="메시지 검색..."
                class="search-input"
                v-model="searchQuery"
              />
            </div>
          </div>
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
                messages[index - 1].sender === message.sender &&
                !messages[index - 1].isOwn,
              'first-in-group':
                !message.isOwn &&
                (index === 0 ||
                  messages[index - 1].sender !== message.sender ||
                  messages[index - 1].isOwn),
            }"
          >
            <div class="message-content">
              <!-- 프로필 아바타 (상대방 메시지의 첫 번째만) -->
              <div
                v-if="
                  !message.isOwn &&
                  (index === 0 ||
                    messages[index - 1].sender !== message.sender ||
                    messages[index - 1].isOwn)
                "
                class="message-avatar"
              >
                {{ getAvatarInitial(message.sender) }}
              </div>

              <div class="message-group">
                <!-- 발신자 이름 (상대방 메시지의 첫 번째만) -->
                <div
                  v-if="
                    !message.isOwn &&
                    (index === 0 ||
                      messages[index - 1].sender !== message.sender ||
                      messages[index - 1].isOwn)
                  "
                  class="message-sender"
                >
                  {{ message.sender }}
                </div>

                <div class="message-bubble">
                  <div class="message-text">{{ message.content }}</div>
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
        <span class="typing-text"
          >{{ currentChat?.name || "김민수" }}님이 입력 중...</span
        >
      </div>

      <!-- 메시지 입력 -->
      <div class="message-input-container">
        <!-- 첨부파일 메뉴 -->
        <div v-if="showAttachmentMenu" class="attachment-menu">
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

    <!-- 사용자 정보 사이드바 -->
    <div class="user-info-sidebar">
      <div class="user-header">
        <h3>사용자 정보</h3>
      </div>

      <div class="user-profile">
        <v-avatar size="80" color="primary" class="user-avatar">
          {{ currentChat?.avatar || "김" }}
        </v-avatar>
        <div class="user-name">{{ currentChat?.name || "박준영" }}</div>
        <div class="user-status">
          <v-chip size="small" color="success">
            <v-icon start>mdi-circle</v-icon>
            온라인
          </v-chip>
        </div>
      </div>

      <div class="user-details">
        <div class="detail-section">
          <h4>연락처</h4>
          <div class="detail-item">
            <v-icon>mdi-email</v-icon>
            <span>{{ currentChat?.email || "park@company.com" }}</span>
          </div>
          <div class="detail-item">
            <v-icon>mdi-phone</v-icon>
            <span>{{ currentChat?.phone || "010-3456-7890" }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>상태 메시지</h4>
          <p class="status-message">
            {{ currentChat?.status || "파일 검토 중" }}
          </p>
        </div>

        <div class="detail-section">
          <h4>최근 활동</h4>
          <div class="activity-item">
            <v-icon>mdi-clock</v-icon>
            <span>5분 전에 온라인</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 파일 첨부 모달 -->
    <FileAttachmentModal
      v-model="showFileModal"
      @attach-files="handleAttachFiles"
    />
  </div>
</template>

<style scoped>
.personal-chat {
  display: flex;
  height: calc(100vh - 60px);
  background: rgb(var(--v-theme-background));
}

.user-info-sidebar {
  width: 280px;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.user-header {
  padding: 20px;
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
  margin-bottom: 12px;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 8px;
}

.user-status {
  margin-bottom: 16px;
}

.user-details {
  padding: 20px;
  flex: 1;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: rgb(var(--v-theme-on-surface));
}

.detail-item .v-icon {
  font-size: 16px;
  color: rgb(var(--v-theme-primary));
}

.status-message {
  margin: 0;
  padding: 8px 12px;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
  font-style: italic;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-on-surface));
}

.activity-item .v-icon {
  font-size: 16px;
  color: rgb(var(--v-theme-success));
}

.chat-sidebar {
  width: 300px;
  border-right: 1px solid rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
}

.chat-list-header {
  padding: 16px;
  border-bottom: 1px solid rgb(var(--v-theme-surface));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-item:hover {
  background: rgb(var(--v-theme-surface));
}

.chat-item.active {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.chat-info {
  flex: 1;
  margin-left: 12px;
}

.chat-name {
  font-weight: 500;
  font-size: 14px;
}

.chat-last-message {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 2px;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.chat-time {
  font-size: 11px;
  opacity: 0.6;
}

.unread-badge {
  font-size: 10px;
  min-width: 18px;
  height: 18px;
}

.chat-main {
  flex: 1;
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

.chat-partner-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.partner-details {
  display: flex;
  flex-direction: column;
}

.partner-name {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.partner-status {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
}

.chat-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 검색바 스타일 */
.search-container {
  position: relative;
  width: 300px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.6);
  z-index: 2;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 8px 16px 8px 48px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 20px;
  background: rgba(var(--v-theme-surface), 0.8);
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-surface), 1);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

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
