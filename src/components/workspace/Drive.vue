<template>
  <div class="project-drive">
    <div class="drive-header">
      <h1>프로젝트 드라이브</h1>
      <v-btn color="primary" prepend-icon="mdi-upload">
        파일 업로드
      </v-btn>
    </div>
    
    <div class="drive-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-folder-multiple</v-icon>
          프로젝트 파일
        </v-card-title>
        <v-card-text>
          <p>프로젝트 공유 파일들이 여기에 표시됩니다.</p>
          <!-- TODO: 파일 관리 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 프로젝트 드라이브 컴포넌트
// TODO: 실제 기능 구현 예정
</script>

<style scoped>
.project-drive {
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
