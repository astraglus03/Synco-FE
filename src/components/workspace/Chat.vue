<template>
  <div class="project-chat">
    <div class="chat-header">
      <h1>프로젝트 채팅</h1>
      <v-btn color="primary" prepend-icon="mdi-plus">
        채널 생성
      </v-btn>
    </div>
    
    <div class="chat-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-message-text</v-icon>
          프로젝트 채널
        </v-card-title>
        <v-card-text>
          <p>프로젝트 채팅이 여기에 표시됩니다.</p>
          <p v-if="selectedChannel">선택된 채널: {{ selectedChannel }}</p>
          <!-- TODO: 채팅 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 프로젝트 채팅 컴포넌트
// TODO: 실제 기능 구현 예정

const props = defineProps({
  selectedChannel: String
})
</script>

<style scoped>
.project-chat {
  padding: 24px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chat-header h1 {
  font-size: 28px;
  font-weight: 600;
}
</style>
