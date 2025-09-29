<template>
  <div class="team-meeting">
    <div class="meeting-header">
      <h1>팀 화상회의</h1>
      <v-btn color="primary" prepend-icon="mdi-video">
        회의 시작
      </v-btn>
    </div>
    
    <div class="meeting-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-video</v-icon>
          화상회의
        </v-card-title>
        <v-card-text>
          <p>팀 화상회의가 여기에 표시됩니다.</p>
          <p v-if="selectedChannel">선택된 회의실: {{ selectedChannel }}</p>
          <!-- TODO: 화상회의 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 팀 화상회의 컴포넌트
// TODO: 실제 기능 구현 예정

const props = defineProps({
  selectedChannel: String
})
</script>

<style scoped>
.team-meeting {
  padding: 24px;
}

.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.meeting-header h1 {
  font-size: 28px;
  font-weight: 600;
}
</style>
