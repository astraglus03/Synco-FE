<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>채팅</v-card-title>
          <v-card-text>
            <!-- 💬 채팅 메시지 표시 영역 -->
            <div class="chat-box">
              <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="[
                  'chat-message',
                  msg.senderSeq === memberSeq ? 'sent' : 'received',
                ]"
              >
                <strong>{{ msg.senderName || msg.senderSeq }}: </strong>
                {{ msg.chatMessageText }}
              </div>
            </div>

            <!-- ✏️ 메시지 입력창 -->
            <v-text-field
              v-model="newMessage"
              label="메시지 입력"
              @keyup.enter="sendMessage"
            />
            <v-btn color="primary" block @click="sendMessage">전송</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import axios from "axios";

export default {
  name: "ProjectChatPage",
  data() {
    return {
      messages: [],
      newMessage: "",
      stompClient: null,
      subscription: null,
      token: "",
      channelSeq: null,
      memberSeq: 0, // ← 템플릿에서 이 값으로 비교
    };
  },
  async created() {
    this.channelSeq = Number(this.$route.params.channelSeq);
    this.memberSeq = Number(localStorage.getItem("memberSeq")) || 0;

    // 토큰 예시(실서비스는 저장소에서 읽어와라)
    this.token =
      "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIyIiwiaWF0IjoxNzYwNjkyNzg4LCJleHAiOjE3NjA2OTQ1ODh9.ujk2o-1rMG0EeyhDDbUAwW3oJk_YXOTvch_dwYoAf6066ulxFVnQhVXPvRPB07NslNYw4u4EqB2D3_4ewi8l4Q";

    this.connectWebsocket();
  },
  beforeRouteLeave(to, from, next) {
    this.disconnectWebsocket().finally(() => next());
  },
  beforeUnmount() {
    this.disconnectWebsocket();
  },
  methods: {
    connectWebsocket() {
      if (this.stompClient && this.stompClient.connected) return;

      const sockJs = new SockJS(
        `${import.meta.env.VITE_API_URL}/chat-service/connect`
      );
      this.stompClient = Stomp.over(sockJs);

      this.stompClient.connect(
        { Authorization: `Bearer ${this.token}` },
        () => {
          // 구독
          this.subscription = this.stompClient.subscribe(
            `/topic/${this.channelSeq}`,
            (message) => {
              try {
                const parsed = JSON.parse(message.body);
                this.messages.push(parsed);
                this.scrollToBottom();
              } catch (e) {
                console.error("메시지 파싱 실패:", e, message.body);
              }
            },
            { Authorization: `Bearer ${this.token}` }
          );
        },
        (error) => {
          console.error("WebSocket 연결 실패:", error);
        }
      );
    },

    sendMessage() {
      if (!this.stompClient || !this.stompClient.connected) return;
      if (this.newMessage.trim() === "") return;

      const message = {
        senderSeq: this.memberSeq,
        messageType: "TEXT",
        chatMessageText: this.newMessage,
      };

      // webstomp-client: send(destination, body, headers)
      this.stompClient.send(
        `/publish/${this.channelSeq}`,
        JSON.stringify(message),
        { Authorization: `Bearer ${this.token}` }
      );

      this.newMessage = "";
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const chatBox = this.$el.querySelector(".chat-box");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      });
    },

    async disconnectWebsocket() {
      try {
        // 읽음 처리 API (엔드포인트는 환경에 맞춰라)
        await axios.post(
          `${import.meta.env.VITE_API_URL}/chat/room/${this.channelSeq}/read`
        );
      } catch (e) {
        console.warn("읽음 처리 실패:", e);
      }

      try {
        if (this.subscription) {
          this.subscription.unsubscribe();
          this.subscription = null;
        }
        if (this.stompClient && this.stompClient.connected) {
          this.stompClient.disconnect(() => {
            // disconnected
          });
        }
      } catch (e) {
        console.warn("WebSocket 해제 중 오류:", e);
      } finally {
        this.stompClient = null;
      }
    },
  },
};
</script>

<style>
.chat-box {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  padding: 10px;
}

.chat-message {
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  color: #111; /* 가독성 확보 */
  border: 1px solid #e0e0e0;
}

.sent {
  text-align: right;
  background-color: #e3f2fd;
}

.received {
  text-align: left;
  background-color: #f5f5f5;
}
</style>
