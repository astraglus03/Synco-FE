<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-brand">
          <div class="logo">
            <span class="brand-text">Synco</span>
          </div>
        </div>
        <div class="nav-links">
          <v-btn 
            color="primary" 
            class="nav-btn primary-btn" 
            @click="openAuthModal('login')"
          >
            로그인
          </v-btn>
          <v-btn 
            variant="outlined" 
            class="nav-btn" 
            @click="openAuthModal('signup')"
          >
            회원가입
          </v-btn>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-background">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
      </div>
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="title-line">팀 협업의</span>
            <span class="title-line highlight">새로운 차원</span>
            <span class="title-line">을 경험하세요</span>
          </h1>
          <p class="hero-description">
            실시간 소통부터 문서 협업까지, 모든 것이 하나의 플랫폼에서 이루어집니다.
            더 이상 여러 도구를 오가며 시간을 낭비하지 마세요.
          </p>
          <div class="hero-actions">
            <v-btn 
              color="primary" 
              size="x-large" 
              class="cta-button"
              @click="openAuthModal('signup')"
            >
              <v-icon left>mdi-rocket-launch</v-icon>
              무료로 시작하기
            </v-btn>
            <v-btn 
              variant="outlined" 
              size="x-large" 
              class="demo-button"
              @click="scrollToDemo"
            >
              <v-icon left>mdi-play-circle</v-icon>
              데모 보기
            </v-btn>
          </div>
          <div class="hero-stats">
            <div class="stat-item">
              <div class="stat-number">100+</div>
              <div class="stat-label">활성 팀</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">99.9%</div>
              <div class="stat-label">가동률</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">24/7</div>
              <div class="stat-label">지원</div>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="mockup-container">
            <div class="mockup-screen">
              <div class="mockup-header">
                <div class="mockup-dots">
                  <div class="dot red"></div>
                  <div class="dot yellow"></div>
                  <div class="dot green"></div>
                </div>
                <div class="mockup-title">Synco Workspace</div>
              </div>
              <div class="mockup-content">
                <div class="mockup-sidebar">
                  <div 
                    class="sidebar-item" 
                    :class="{ active: heroActiveTab === 0 }"
                    @click="heroActiveTab = 0"
                  >
                    <v-icon size="20">mdi-chat</v-icon>
                    <span>일반 채팅</span>
                  </div>
                  <div 
                    class="sidebar-item" 
                    :class="{ active: heroActiveTab === 1 }"
                    @click="heroActiveTab = 1"
                  >
                    <v-icon size="20">mdi-video</v-icon>
                    <span>화상회의</span>
                  </div>
                  <div 
                    class="sidebar-item" 
                    :class="{ active: heroActiveTab === 2 }"
                    @click="heroActiveTab = 2"
                  >
                    <v-icon size="20">mdi-file-document</v-icon>
                    <span>문서</span>
                  </div>
                  <div 
                    class="sidebar-item" 
                    :class="{ active: heroActiveTab === 3 }"
                    @click="heroActiveTab = 3"
                  >
                    <v-icon size="20">mdi-calendar</v-icon>
                    <span>일정</span>
                  </div>
                </div>
                <div class="mockup-main">
                  <!-- 채팅 데모 -->
                  <div v-if="heroActiveTab === 0" class="hero-demo-content">
                    <div class="chat-messages">
                      <div class="message">
                        <div class="avatar">김</div>
                        <div class="message-content">
                          <div class="message-header">
                            <span class="username">김민수</span>
                            <span class="timestamp">오후 2:30</span>
                          </div>
                          <div class="message-text">프로젝트 기획서 검토 완료했습니다!</div>
                        </div>
                      </div>
                      <div class="message">
                        <div class="avatar">박</div>
                        <div class="message-content">
                          <div class="message-header">
                            <span class="username">박지영</span>
                            <span class="timestamp">오후 2:32</span>
                          </div>
                          <div class="message-text">좋습니다! 다음 단계로 진행하겠습니다.</div>
                        </div>
                      </div>
                    </div>
                    <div class="chat-input">
                      <input type="text" placeholder="메시지를 입력하세요..." />
                      <v-icon>mdi-send</v-icon>
                    </div>
                  </div>

                  <!-- 화상회의 데모 -->
                  <div v-if="heroActiveTab === 1" class="hero-demo-content">
                    <div class="meeting-grid">
                      <div class="participant">
                        <div class="participant-video">
                          <div class="video-placeholder">
                            <v-icon size="32" color="primary">mdi-account</v-icon>
                          </div>
                          <div class="participant-info">
                            <span class="name">김민수</span>
                            <div class="status-indicators">
                              <div class="speaking-indicator"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="participant">
                        <div class="participant-video">
                          <div class="video-placeholder">
                            <v-icon size="32" color="success">mdi-account</v-icon>
                          </div>
                          <div class="participant-info">
                            <span class="name">박지영</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="meeting-controls">
                      <v-btn size="small" color="error" variant="outlined">
                        <v-icon>mdi-microphone-off</v-icon>
                      </v-btn>
                      <v-btn size="small" color="error" variant="outlined">
                        <v-icon>mdi-video-off</v-icon>
                      </v-btn>
                      <v-btn size="small" color="primary">
                        <v-icon>mdi-screen-share</v-icon>
                      </v-btn>
                    </div>
                  </div>

                  <!-- 문서 데모 -->
                  <div v-if="heroActiveTab === 2" class="hero-demo-content">
                    <div class="document-editor">
                      <div class="editor-toolbar">
                        <v-btn size="small" variant="text">
                          <v-icon>mdi-format-bold</v-icon>
                        </v-btn>
                        <v-btn size="small" variant="text">
                          <v-icon>mdi-format-italic</v-icon>
                        </v-btn>
                        <v-btn size="small" variant="text">
                          <v-icon>mdi-format-list-bulleted</v-icon>
                        </v-btn>
                      </div>
                      <div class="editor-content">
                        <h3>프로젝트 기획서</h3>
                        <p>이 프로젝트는 팀 협업 도구의 새로운 표준을 제시합니다.</p>
                        <ul>
                          <li>실시간 채팅 기능</li>
                          <li>화상회의 지원</li>
                          <li>문서 공동 편집</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <!-- 일정 데모 -->
                  <div v-if="heroActiveTab === 3" class="hero-demo-content">
                    <div class="calendar-demo">
                      <div class="calendar-header">
                        <h4>1월 2024</h4>
                      </div>
                      <div class="calendar-grid">
                        <div class="calendar-day">
                          <span class="day-number">15</span>
                          <div class="event">팀 미팅</div>
                        </div>
                        <div class="calendar-day">
                          <span class="day-number">16</span>
                          <div class="event">프로젝트 리뷰</div>
                        </div>
                        <div class="calendar-day">
                          <span class="day-number">17</span>
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
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">왜 Synco를 선택해야 할까요?</h2>
          <p class="section-description">
            기존 협업 도구들의 장점을 모두 결합한 통합 플랫폼으로, 팀의 생산성을 극대화합니다.
          </p>
        </div>
        <div class="features-grid">
          <div class="feature-card" v-for="(feature, index) in features" :key="index">
            <div class="feature-icon">
              <v-icon :size="48" :color="feature.color">{{ feature.icon }}</v-icon>
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Section -->
    <section id="demo" class="demo">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">실시간으로 체험해보세요</h2>
          <p class="section-description">
            실제 워크스페이스에서 어떻게 작동하는지 확인해보세요.
          </p>
        </div>
        <div class="demo-container">
          <div class="demo-content">
            <div class="demo-screen">
              <div class="demo-header">
                <div class="demo-dots">
                  <div class="dot red"></div>
                  <div class="dot yellow"></div>
                  <div class="dot green"></div>
                </div>
                <div class="demo-title">{{ demoTabs[activeTab].title }}</div>
                <div class="demo-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: progressWidth + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ activeTab + 1 }} / {{ demoTabs.length }}</span>
                </div>
              </div>
              <div class="demo-body">
                <component :is="demoTabs[activeTab].component" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">협업의 미래를 경험해보세요</h2>
          <p class="cta-description">
            지금 가입하고 팀의 생산성이 3배 향상되는 경험을 직접 확인해보세요.
          </p>
          <div class="cta-actions">
            <v-btn 
              color="primary" 
              size="x-large" 
              class="cta-button"
              @click="goToWorkspace"
            >
              <v-icon left>mdi-rocket-launch</v-icon>
              지금 시작하기
            </v-btn>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <div class="logo">
              <span class="brand-text">Synco</span>
            </div>
            <p class="footer-description">
              팀 협업의 새로운 표준을 제시합니다.
            </p>
          </div>
          <div class="footer-links">
            <div class="link-group">
              <h4>제품</h4>
              <a href="#">기능</a>
              <a href="#">가격</a>
              <a href="#">업데이트</a>
            </div>
            <div class="link-group">
              <h4>회사</h4>
              <a href="#">소개</a>
              <a href="#">채용</a>
              <a href="#">블로그</a>
            </div>
            <div class="link-group">
              <h4>지원</h4>
              <a href="#">도움말</a>
              <a href="#">문의</a>
              <a href="#">상태</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 Synco. All rights reserved.</p>
        </div>
      </div>
    </footer>

    <!-- 인증 모달 -->
    <AuthModal
      v-model="showAuthModal"
      :initial-view="authModalView"
      @login-success="handleLoginSuccess"
      @signup-success="handleSignupSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ChatDemo from '@/components/landing/ChatDemo.vue'
import MeetingDemo from '@/components/landing/MeetingDemo.vue'
import DocumentDemo from '@/components/landing/DocumentDemo.vue'
import AuthModal from '@/components/auth/AuthModal.vue'

const router = useRouter()
const activeTab = ref(0)
const heroActiveTab = ref(0)
const progressWidth = ref(0)

// 인증 모달 관련
const showAuthModal = ref(false)
const authModalView = ref('login')

const features = ref([
  {
    icon: 'mdi-chat-processing',
    title: '실시간 소통',
    description: '빠르고 직관적인 채팅으로 팀원들과 즉시 연결되세요. 더 이상 이메일을 기다리지 마세요.',
    color: 'primary'
  },
  {
    icon: 'mdi-video',
    title: '스마트 미팅',
    description: 'AI가 자동으로 회의록을 작성하고, 화면 공유는 한 번의 클릭으로 시작하세요.',
    color: 'success'
  },
  {
    icon: 'mdi-file-document-edit',
    title: '생생한 문서',
    description: '여러 명이 동시에 편집하는 살아있는 문서. 아이디어가 실시간으로 구현됩니다.',
    color: 'warning'
  },
  {
    icon: 'mdi-folder-multiple',
    title: '무한 저장소',
    description: '모든 파일이 클라우드에 안전하게 보관되고, 언제든지 빠르게 찾을 수 있습니다.',
    color: 'secondary'
  },
  {
    icon: 'mdi-shield-check',
    title: '완벽한 보안',
    description: '은행급 암호화로 팀의 소중한 데이터를 철저히 보호합니다.',
    color: 'error'
  }
])

const demoTabs = ref([
  {
    name: '채팅',
    title: '실시간 채팅',
    component: ChatDemo
  },
  {
    name: '회의',
    title: '화상회의',
    component: MeetingDemo
  },
  {
    name: '문서',
    title: '문서 협업',
    component: DocumentDemo
  }
])

const goToWorkspace = () => {
  // 임시로 바로 워크스페이스로 이동 (UI 테스트용)
  router.push('/workspace')
}

const openAuthModal = (view) => {
  authModalView.value = view
  showAuthModal.value = true
}

const handleLoginSuccess = (userData) => {
  console.log('로그인 성공:', userData)
  router.push('/workspace')
}

const handleSignupSuccess = (userData) => {
  console.log('회원가입 성공:', userData)
  router.push('/workspace')
}

const scrollToDemo = () => {
  document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  // 스크롤 기반 애니메이션 초기화
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in')
        observer.unobserve(entry.target)
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })

  // 애니메이션 대상 요소들 관찰
  document.querySelectorAll('.feature-card, .hero-content, .hero-visual').forEach(el => {
    observer.observe(el)
  })

  // 패럴랙스 효과
  const handleScroll = () => {
    const scrolled = window.pageYOffset
    const parallaxElements = document.querySelectorAll('.gradient-orb')
    
    parallaxElements.forEach((element, index) => {
      const speed = 0.5 + (index * 0.1)
      element.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`
    })
  }

  window.addEventListener('scroll', handleScroll)

  // 마우스 움직임에 따른 인터랙티브 효과
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    
    const xPos = (clientX / innerWidth - 0.5) * 2
    const yPos = (clientY / innerHeight - 0.5) * 2
    
    const mockupContainer = document.querySelector('.mockup-container')
    if (mockupContainer) {
      mockupContainer.style.transform = `perspective(1000px) rotateY(${xPos * 5}deg) rotateX(${yPos * 5}deg)`
    }
  }

  window.addEventListener('mousemove', handleMouseMove)

  // 데모 자동 전환
  let demoInterval
  let progressInterval
  
  const startDemoRotation = () => {
    demoInterval = setInterval(() => {
      activeTab.value = (activeTab.value + 1) % demoTabs.value.length
    }, 4000) // 4초마다 전환
    
    progressInterval = setInterval(() => {
      progressWidth.value = (progressWidth.value + 1) % 101
      if (progressWidth.value === 0) {
        progressWidth.value = 0
      }
    }, 40) // 40ms마다 진행률 업데이트 (4초 = 4000ms, 100% = 100단계)
  }

  // 데모 섹션이 보일 때만 자동 전환 시작
  const demoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startDemoRotation()
      } else {
        if (demoInterval) clearInterval(demoInterval)
        if (progressInterval) clearInterval(progressInterval)
        progressWidth.value = 0
      }
    })
  }, { threshold: 0.5 })

  const demoSection = document.getElementById('demo')
  if (demoSection) {
    demoObserver.observe(demoSection)
  }

  // 정리 함수
  return () => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('mousemove', handleMouseMove)
    if (demoInterval) clearInterval(demoInterval)
    if (progressInterval) clearInterval(progressInterval)
  }
})
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1a1a2e;
  overflow-x: hidden;
}

/* Navigation */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #3b82f6;
}

.nav-btn {
  margin-left: 0.25rem;
}

.primary-btn {
  background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
}

/* Hero Section */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-top: 70px;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  animation: float 6s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #10b981, #059669);
  top: 60%;
  right: 20%;
  animation-delay: 2s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  bottom: 20%;
  left: 50%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.hero-container {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-content {
  animation: slideInLeft 1s ease-out;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.title-line {
  display: block;
}

.highlight {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.25rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.cta-button {
  background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
}

.demo-button {
  border-color: rgba(0, 0, 0, 0.3) !important;
  color: #1a1a2e !important;
}

.hero-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

.hero-visual {
  animation: slideInRight 1s ease-out;
}

.mockup-container {
  position: relative;
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.3s ease;
}

.mockup-container:hover {
  transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
}

.mockup-screen {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.mockup-header {
  background: #f8fafc;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.mockup-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.mockup-title {
  color: #1a1a2e;
  font-weight: 600;
}

.mockup-content {
  display: flex;
  height: 400px;
}

.mockup-sidebar {
  width: 200px;
  background: #f8fafc;
  padding: 1rem;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 0.5rem;
}

.sidebar-item:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.sidebar-item.active {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.mockup-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.message-content {
  flex: 1;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.username {
  font-weight: 600;
  color: #1a1a2e;
}

.timestamp {
  font-size: 0.75rem;
  color: #64748b;
}

.message-text {
  color: #475569;
  line-height: 1.4;
}

.chat-input {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.chat-input input {
  flex: 1;
  background: transparent;
  border: none;
  color: #1a1a2e;
  font-size: 0.875rem;
  outline: none;
}

.chat-input input::placeholder {
  color: #64748b;
}

/* Hero Demo Content */
.hero-demo-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.meeting-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 1rem;
  flex: 1;
}

.participant {
  background: #1a1a2e;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  overflow: hidden;
}

.participant-video {
  position: relative;
  height: 100%;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  background: #0f0f23;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.participant-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name {
  color: #f8fafc;
  font-weight: 600;
  font-size: 0.75rem;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.speaking-indicator {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.meeting-controls {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  justify-content: center;
  background: #1a1a2e;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.document-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1a1a2e;
}

.editor-toolbar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.editor-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.editor-content h3 {
  margin: 0 0 1rem 0;
  color: #1a1a2e;
  font-size: 1.125rem;
}

.editor-content p {
  margin: 0 0 1rem 0;
  color: #475569;
  line-height: 1.6;
  font-size: 0.875rem;
}

.editor-content ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #475569;
  font-size: 0.875rem;
}

.editor-content li {
  margin-bottom: 0.25rem;
}

.calendar-demo {
  height: 100%;
  padding: 1rem;
  background: #ffffff;
  color: #1a1a2e;
}

.calendar-header {
  text-align: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.calendar-header h4 {
  margin: 0;
  color: #1a1a2e;
  font-size: 1rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.calendar-day {
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.5rem;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.day-number {
  display: block;
  font-weight: 600;
  color: #1a1a2e;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.event {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Features Section */
.features {
  padding: 6rem 0;
  background: #ffffff;
}

/* Demo Section */
.demo {
  padding: 6rem 0;
  background: #f8fafc;
}

.demo-container {
  max-width: 1000px;
  margin: 0 auto;
}


.demo-content {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.demo-screen {
  height: 500px;
}

.demo-header {
  background: #f8fafc;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.demo-dots {
  display: flex;
  gap: 0.5rem;
}

.demo-title {
  color: #1a1a2e;
  font-weight: 600;
  flex: 1;
}

.demo-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}

.progress-bar {
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #6366f1);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.progress-text {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  min-width: 40px;
}

.demo-body {
  height: calc(100% - 60px);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 1.125rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.section-description {
  font-size: 1.125rem;
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(30px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.feature-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  margin-bottom: 1.5rem;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.feature-description {
  color: #64748b;
  line-height: 1.6;
}

/* CTA Section */
.cta {
  padding: 6rem 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  text-align: center;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-description {
  font-size: 1.125rem;
  color: #64748b;
  margin-bottom: 2rem;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Footer */
.footer {
  background: #ffffff;
  padding: 3rem 0 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
  margin-bottom: 2rem;
}

.footer-brand .logo {
  margin-bottom: 1rem;
}

.footer-description {
  color: #64748b;
  line-height: 1.6;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.link-group h4 {
  color: #1a1a2e;
  margin-bottom: 1rem;
  font-weight: 600;
}

.link-group a {
  display: block;
  color: #64748b;
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.link-group a:hover {
  color: #3b82f6;
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  color: #64748b;
}

/* Animations */
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 애니메이션 클래스 */
.animate-in {
  animation: slideInUp 0.8s ease-out forwards;
}

.hero-content.animate-in {
  animation: slideInLeft 1s ease-out forwards;
}

.hero-visual.animate-in {
  animation: slideInRight 1s ease-out forwards;
}

.feature-card.animate-in {
  animation: slideInUp 0.6s ease-out forwards;
}

/* 호버 효과 */
.feature-card:hover {
  transform: translateY(-5px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}


/* Responsive Design */
@media (max-width: 768px) {
  .hero-container {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .hero-stats {
    justify-content: center;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .demo-container {
    padding: 0 1rem;
  }
  
  .demo-progress {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }
  
  .progress-bar {
    width: 80px;
  }
  
  .meeting-grid {
    grid-template-columns: 1fr;
  }
  
  .calendar-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
  }
  
  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>