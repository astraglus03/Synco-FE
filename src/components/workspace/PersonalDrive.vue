<template>
  <div class="personal-drive">
    <div class="drive-header">
      <h1>개인 드라이브</h1>
      <v-btn color="primary" prepend-icon="mdi-upload">
        파일 업로드
      </v-btn>
    </div>
    
    <div class="drive-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-folder</v-icon>
          내 파일
        </v-card-title>
        <v-card-text>
          <p>개인 파일들이 여기에 표시됩니다.</p>
          <!-- TODO: 파일 관리 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 개인 드라이브 컴포넌트
// TODO: 실제 기능 구현 예정
</script>

<style scoped>
.personal-drive {
  padding: 24px;
}

.drive-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.drive-header h1 {
  font-size: 28px;
  font-weight: 600;
}
</style>
