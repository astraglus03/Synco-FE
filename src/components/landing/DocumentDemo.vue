<template>
  <div class="document-demo">
    <div class="demo-document-container">
      <div class="document-header">
        <div class="document-title">
          <v-icon size="20" color="primary">mdi-file-document-edit</v-icon>
          <span>프로젝트 기획서</span>
          <div class="collaboration-status">
            <div class="online-users">
              <div class="user-avatar" v-for="user in onlineUsers" :key="user" :title="user">
                {{ user.charAt(0) }}
              </div>
            </div>
            <span class="status-text">{{ onlineUsers.length }}명이 편집 중</span>
          </div>
        </div>
        <div class="document-actions">
          <v-btn size="small" variant="outlined">
            <v-icon>mdi-share</v-icon>
            공유
          </v-btn>
          <v-btn size="small" color="primary">
            <v-icon>mdi-download</v-icon>
            내보내기
          </v-btn>
        </div>
      </div>
      
      <div class="document-content">
        <div class="document-sidebar">
          <div class="sidebar-section">
            <h4>목차</h4>
            <ul class="toc-list">
              <li><a href="#overview">1. 프로젝트 개요</a></li>
              <li><a href="#goals">2. 목표 및 범위</a></li>
              <li><a href="#timeline">3. 일정 계획</a></li>
              <li><a href="#resources">4. 리소스</a></li>
            </ul>
          </div>
          <div class="sidebar-section">
            <h4>댓글</h4>
            <div class="comments">
              <div class="comment" v-for="comment in comments" :key="comment.id">
                <div class="comment-avatar">{{ comment.user.charAt(0) }}</div>
                <div class="comment-content">
                  <div class="comment-header">
                    <span class="comment-user">{{ comment.user }}</span>
                    <span class="comment-time">{{ comment.time }}</span>
                  </div>
                  <div class="comment-text">{{ comment.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="document-main">
          <div class="document-editor">
            <div class="editor-toolbar">
              <div class="toolbar-group">
                <v-btn size="small" variant="text">
                  <v-icon>mdi-format-bold</v-icon>
                </v-btn>
                <v-btn size="small" variant="text">
                  <v-icon>mdi-format-italic</v-icon>
                </v-btn>
                <v-btn size="small" variant="text">
                  <v-icon>mdi-format-underline</v-icon>
                </v-btn>
              </div>
              <div class="toolbar-group">
                <v-btn size="small" variant="text">
                  <v-icon>mdi-format-list-bulleted</v-icon>
                </v-btn>
                <v-btn size="small" variant="text">
                  <v-icon>mdi-format-list-numbered</v-icon>
                </v-btn>
              </div>
              <div class="toolbar-group">
                <v-btn size="small" variant="text">
                  <v-icon>mdi-link</v-icon>
                </v-btn>
                <v-btn size="small" variant="text">
                  <v-icon>mdi-image</v-icon>
                </v-btn>
              </div>
            </div>
            
            <div class="editor-content">
              <div class="document-section" id="overview">
                <h1>프로젝트 기획서</h1>
                <p class="document-meta">
                  <span class="last-modified">마지막 수정: 2024년 1월 15일</span>
                  <span class="version">버전 2.1</span>
                </p>
                
                <h2>1. 프로젝트 개요</h2>
                <p>
                  이 프로젝트는 팀 협업 도구의 새로운 표준을 제시하는 것을 목표로 합니다. 
                  디스코드의 실시간 소통 기능과 노션의 강력한 문서 협업 기능을 결합하여 
                  <span class="highlight">올인원 협업 플랫폼</span>을 구축합니다.
                </p>
                
                <h2>2. 목표 및 범위</h2>
                <div class="goals-list">
                  <div class="goal-item">
                    <v-icon size="16" color="success">mdi-check-circle</v-icon>
                    <span>실시간 채팅 및 화상회의 기능</span>
                  </div>
                  <div class="goal-item">
                    <v-icon size="16" color="success">mdi-check-circle</v-icon>
                    <span>문서 공동 편집 및 버전 관리</span>
                  </div>
                  <div class="goal-item">
                    <v-icon size="16" color="success">mdi-check-circle</v-icon>
                    <span>파일 공유 및 저장소 관리</span>
                  </div>
                  <div class="goal-item">
                    <v-icon size="16" color="success">mdi-check-circle</v-icon>
                    <span>일정 관리 및 알림 시스템</span>
                  </div>
                </div>
                
                <h2>3. 일정 계획</h2>
                <div class="timeline">
                  <div class="timeline-item">
                    <div class="timeline-date">1월</div>
                    <div class="timeline-content">
                      <h4>기획 및 설계</h4>
                      <p>요구사항 분석 및 시스템 설계</p>
                    </div>
                  </div>
                  <div class="timeline-item">
                    <div class="timeline-date">2월</div>
                    <div class="timeline-content">
                      <h4>개발 시작</h4>
                      <p>핵심 기능 개발 및 프로토타입 제작</p>
                    </div>
                  </div>
                  <div class="timeline-item">
                    <div class="timeline-date">3월</div>
                    <div class="timeline-content">
                      <h4>테스트 및 출시</h4>
                      <p>베타 테스트 및 정식 출시</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const onlineUsers = ref(['김민수', '박지영', '이준호', '최유진'])

const comments = ref([
  {
    id: 1,
    user: '김민수',
    time: '2분 전',
    text: '일정을 좀 더 구체적으로 작성하면 좋을 것 같습니다.'
  },
  {
    id: 2,
    user: '박지영',
    time: '5분 전',
    text: '리소스 섹션에 예산 정보도 추가해야겠네요.'
  },
  {
    id: 3,
    user: '이준호',
    time: '10분 전',
    text: '전체적으로 잘 작성되었습니다!'
  }
])

onMounted(() => {
  // 실시간 편집 효과
  setInterval(() => {
    const randomUser = onlineUsers.value[Math.floor(Math.random() * onlineUsers.value.length)]
    // 편집 중인 사용자 표시 효과
  }, 2000)
})
</script>

<style scoped>
.document-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-document-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1a1a2e;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.document-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1a1a2e;
}

.collaboration-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 2rem;
}

.online-users {
  display: flex;
  gap: -0.25rem;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  border: 2px solid white;
  margin-left: -4px;
  animation: pulse 2s infinite;
}

.user-avatar:first-child {
  margin-left: 0;
}

.status-text {
  font-size: 0.875rem;
  color: #64748b;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
}

.document-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.document-sidebar {
  width: 250px;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: 2rem;
}

.sidebar-section h4 {
  color: #1a1a2e;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-list li {
  margin-bottom: 0.5rem;
}

.toc-list a {
  color: #64748b;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.3s ease;
}

.toc-list a:hover {
  color: #3b82f6;
}

.comments {
  max-height: 200px;
  overflow-y: auto;
}

.comment {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.comment-user {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 0.875rem;
}

.comment-time {
  font-size: 0.75rem;
  color: #64748b;
}

.comment-text {
  color: #475569;
  font-size: 0.875rem;
  line-height: 1.4;
}

.document-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.document-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-group {
  display: flex;
  gap: 0.25rem;
}

.editor-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  max-width: 800px;
  margin: 0 auto;
}

.document-section h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.document-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 2rem 0 1rem 0;
}

.document-section p {
  color: #475569;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.document-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: #64748b;
}

.last-modified {
  color: #64748b;
}

.version {
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.highlight {
  background: #fef3c7;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-weight: 600;
}

.goals-list {
  margin: 1rem 0;
}

.goal-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border-radius: 8px;
  border-left: 4px solid #10b981;
}

.goal-item span {
  color: #1a1a2e;
  font-weight: 500;
}

.timeline {
  margin: 1rem 0;
}

.timeline-item {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.timeline-date {
  font-weight: 600;
  color: #3b82f6;
  min-width: 60px;
}

.timeline-content h4 {
  margin: 0 0 0.5rem 0;
  color: #1a1a2e;
  font-size: 1rem;
}

.timeline-content p {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

/* 애니메이션 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .document-content {
    flex-direction: column;
  }
  
  .document-sidebar {
    width: 100%;
    max-height: 200px;
  }
  
  .editor-content {
    padding: 1rem;
  }
  
  .document-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .collaboration-status {
    margin-left: 0;
  }
}
</style>
