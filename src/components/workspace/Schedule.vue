<template>
  <div class="project-schedule">
    <div class="schedule-header">
      <h1>프로젝트 일정관리</h1>
      <v-btn color="primary" prepend-icon="mdi-plus">
        일정 추가
      </v-btn>
    </div>
    
    <div class="schedule-content">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-calendar-clock</v-icon>
          프로젝트 일정
        </v-card-title>
        <v-card-text>
          <p>프로젝트 일정이 여기에 표시됩니다.</p>
          <p v-if="selectedSchedule">선택된 일정: {{ selectedSchedule }}</p>
          <!-- TODO: 일정 관리 기능 구현 예정 -->
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup>
// 프로젝트 일정관리 컴포넌트
// TODO: 실제 기능 구현 예정

const props = defineProps({
  selectedSchedule: String
})
</script>

<style scoped>
.project-schedule {
  padding: 24px;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.schedule-header h1 {
  font-size: 28px;
  font-weight: 600;
}
</style>
