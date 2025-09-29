<template>
  <div class="personal-chat">
    <div class="chat-header">
      <h1>1:1 채팅</h1>
    </div>
    
    <div class="chat-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-message</v-icon>
          개인 메시지
        </v-card-title>
        <v-card-text>
          <p>1:1 채팅이 여기에 표시됩니다.</p>
          <!-- TODO: 채팅 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 개인 채팅 컴포넌트
// TODO: 실제 기능 구현 예정
</script>

<style scoped>
.personal-chat {
  padding: 24px;
}

.chat-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
}
</style>
