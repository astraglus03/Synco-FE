<template>
  <div class="personal-calendar">
    <div class="calendar-header">
      <h1>개인 캘린더</h1>
      <v-btn color="primary" prepend-icon="mdi-plus">
        일정 추가
      </v-btn>
    </div>
    
    <div class="calendar-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-calendar</v-icon>
          내 일정
        </v-card-title>
        <v-card-text>
          <p>개인 일정이 여기에 표시됩니다.</p>
          <!-- TODO: 캘린더 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 개인 캘린더 컴포넌트
// TODO: 실제 기능 구현 예정
</script>

<style scoped>
.personal-calendar {
  padding: 24px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.calendar-header h1 {
  font-size: 28px;
  font-weight: 600;
}
</style>
