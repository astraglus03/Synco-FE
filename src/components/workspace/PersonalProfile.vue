<template>
  <div class="personal-profile">
    <div class="profile-header">
      <h1>프로필 설정</h1>
    </div>
    
    <div class="profile-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-account</v-icon>
          내 프로필
        </v-card-title>
        <v-card-text>
          <p>프로필 정보가 여기에 표시됩니다.</p>
          <!-- TODO: 프로필 관리 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 개인 프로필 컴포넌트
// TODO: 실제 기능 구현 예정
</script>

<style scoped>
.personal-profile {
  padding: 24px;
}

.profile-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
}
</style>
