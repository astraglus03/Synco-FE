<template>
  <div class="personal-friends">
    <div class="friends-header">
      <h1>친구 목록</h1>
      <v-btn color="primary" prepend-icon="mdi-account-plus">
        친구 추가
      </v-btn>
    </div>
    
    <div class="friends-content">
      <v-card>
        <v-card-title>친구 목록</v-card-title>
        <v-card-text>
          <p>친구 목록이 여기에 표시됩니다.</p>
          <!-- TODO: 친구 목록 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 개인 친구 관리 컴포넌트
// TODO: 실제 기능 구현 예정
</script>

<style scoped>
.personal-friends {
  padding: 24px;
}

.friends-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.friends-header h1 {
  font-size: 28px;
  font-weight: 600;
}
</style>
