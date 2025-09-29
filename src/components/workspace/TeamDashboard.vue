<template>
  <div class="team-dashboard">
    <div class="dashboard-header">
      <h1>팀 대시보드</h1>
      <p>{{ currentWorkspaceData?.name }}에 오신 것을 환영합니다!</p>
    </div>
    
    <div class="dashboard-content">
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="dashboard-card">
            <v-card-title>
              <v-icon left>mdi-chart-line</v-icon>
              팀 활동
            </v-card-title>
            <v-card-text>
              <p>팀의 최근 활동이 여기에 표시됩니다.</p>
            </v-card-text>
          </v-card>
        </v-col>
        
        <v-col cols="12" md="6">
          <v-card class="dashboard-card">
            <v-card-title>
              <v-icon left>mdi-account-group</v-icon>
              팀 멤버
            </v-card-title>
            <v-card-text>
              <p>팀 멤버 정보가 여기에 표시됩니다.</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup>
// 팀 대시보드 컴포넌트
// TODO: 실제 기능 구현 예정

const props = defineProps({
  currentWorkspaceData: Object
})
</script>

<style scoped>
.team-dashboard {
  padding: 24px;
}

.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.dashboard-header p {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 16px;
}

.dashboard-card {
  height: 200px;
}
</style>
