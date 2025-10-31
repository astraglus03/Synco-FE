<template>
  <v-dialog v-model="isOpen" :max-width="props.isPersonal ? '600px' : '1200px'" class="no-scroll-dialog">
    <v-card class="task-detail-modal" :class="props.isPersonal ? 'fixed-modal-personal' : 'fixed-modal-detail'">
      <!-- 모달 헤더 -->
      <div class="modal-header">
        <div class="modal-header-content">
          <div class="modal-icon">
            <v-icon>mdi-clipboard-text</v-icon>
          </div>
          <h3 class="modal-title">업무 상세</h3>
        </div>
        <v-btn
          icon
          variant="text"
          class="close-btn"
          @click="closeModal"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      
      <!-- 본문 -->
      <div class="modal-body">
        <!-- 왼쪽: Task 정보 -->
        <div class="task-info-section">
          <h3 class="section-title">업무 정보</h3>
          
          <div class="info-item">
            <label class="info-label">업무명</label>
            <div class="info-value">{{ props.taskData.taskTitle || props.taskData.taskName || '-' }}</div>
          </div>

          <div class="info-item">
            <label class="info-label">설명</label>
            <div class="info-value task-content">{{ props.taskData.taskContent || props.taskData.description || '-' }}</div>
          </div>

          <div class="info-compact-wrapper">
            <div class="info-row-compact">
              <div class="info-item-inline">
                <label class="info-label">시작일</label>
                <div class="info-value">{{ props.taskData.startDate || '-' }}</div>
              </div>
              <div class="info-item-inline">
                <label class="info-label">종료일</label>
                <div class="info-value">{{ props.taskData.endDate || '-' }}</div>
              </div>
            </div>
            
            <div class="info-row-compact">
              <div v-if="!props.isPersonal" class="info-item-inline">
                <label class="info-label">담당자</label>
                <div class="info-value">{{ assigneeName }}</div>
              </div>
              <div class="info-item-inline">
                <label class="info-label">상태</label>
                <div class="info-value">
                  <div :class="['status-chip', getStatusClass(props.taskData.taskStatus || props.taskData.status)]">
                    <div class="status-dot"></div>
                    <span class="status-text">{{ getStatusText(props.taskData.taskStatus || props.taskData.status) || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 구분선 (프로젝트 업무일 때만) -->
        <div v-if="!props.isPersonal" class="divider"></div>

        <!-- 오른쪽: 댓글 (프로젝트 업무일 때만) -->
        <div v-if="!props.isPersonal" class="comments-section">
          <h3 class="section-title">댓글</h3>
          
          <!-- 댓글 목록 -->
          <div class="comments-list">
            <!-- 로딩 상태 -->
            <div v-if="isLoadingComments" class="loading-state">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p>댓글을 불러오는 중...</p>
            </div>
            
            <!-- 댓글 목록 -->
            <div v-else>
              <div v-for="comment in comments" :key="comment.commentSeq" class="comment-item">
                <!-- 원댓글 -->
                <div class="comment-header">
                  <div class="comment-user">
                    <v-avatar size="24" class="comment-avatar">
                      <span class="text-caption">{{ getInitial(comment.memberName) }}</span>
                    </v-avatar>
                    <span class="comment-name">{{ comment.memberName }}</span>
                  </div>
                  <div class="comment-header-right">
                    <div class="comment-time">{{ formatDate(comment.createdAt) }}</div>
                    <!-- 댓글 메뉴 (작성자만) -->
                    <v-menu v-if="canEditComment(comment)" location="bottom start">
                      <template v-slot:activator="{ props }">
                        <v-btn 
                          icon="mdi-dots-horizontal" 
                          size="x-small" 
                          variant="text"
                          class="comment-menu-btn"
                          v-bind="props"
                        />
                      </template>
                      <v-list density="compact" class="comment-menu-list">
                        <v-list-item @click="startEditComment(comment)" class="comment-menu-item">
                          <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="confirmDeleteComment(comment.commentSeq)" class="comment-menu-item text-red">
                          <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </div>
                
                <!-- 댓글 내용 (수정 모드가 아닐 때) -->
                <div v-if="editingComment !== comment.commentSeq" class="comment-text">{{ comment.commentContent }}</div>
                
                <!-- 댓글 수정 입력창 -->
                <div v-else class="comment-edit-section">
                  <div class="comment-input-wrapper">
                    <v-textarea
                      v-model="editText"
                      placeholder="댓글을 수정하세요..."
                      outlined
                      rows="2"
                      hide-details
                      class="comment-input"
                    ></v-textarea>
                    <div class="edit-actions">
                      <v-btn
                        color="primary"
                        size="small"
                        variant="text"
                        @click="saveEditComment(comment.commentSeq)"
                        :disabled="!editText.trim()"
                      >
                        저장
                      </v-btn>
                      <v-btn
                        color="grey"
                        size="small"
                        variant="text"
                        @click="cancelEditComment"
                      >
                        취소
                      </v-btn>
                    </div>
                  </div>
                </div>
                
                <div class="comment-actions">
                  <a href="#" class="reply-link" @click.prevent="toggleReply(comment.commentSeq)">답글</a>
                </div>
                
                <!-- 답글 입력창 -->
                <div v-if="replyToComment === comment.commentSeq" class="reply-input-section">
                  <div class="comment-input-wrapper">
                    <v-textarea
                      v-model="replyText"
                      placeholder="답글 작성..."
                      outlined
                      rows="2"
                      hide-details
                      class="comment-input"
                    ></v-textarea>
                    <v-btn
                      color="primary"
                      icon="mdi-send"
                      size="default"
                      variant="text"
                      @click="postReply(comment.commentSeq)"
                      class="post-btn"
                      :disabled="!replyText.trim()"
                    />
                  </div>
                </div>
                
                <!-- 대댓글 목록 -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
                  <div v-for="reply in comment.replies" :key="reply.commentSeq" class="reply-item">
                    <div class="comment-header">
                      <div class="comment-user">
                        <v-avatar size="20" class="comment-avatar">
                          <span class="text-caption">{{ getInitial(reply.memberName) }}</span>
                        </v-avatar>
                        <span class="comment-name">{{ reply.memberName }}</span>
                      </div>
                      <div class="comment-header-right">
                        <div class="comment-time">{{ formatDate(reply.createdAt) }}</div>
                        <!-- 답글 메뉴 (작성자만) -->
                        <v-menu v-if="canEditComment(reply)" location="bottom start">
                          <template v-slot:activator="{ props }">
                            <v-btn 
                              icon="mdi-dots-horizontal" 
                              size="x-small" 
                              variant="text"
                              class="comment-menu-btn"
                              v-bind="props"
                            />
                          </template>
                          <v-list density="compact" class="comment-menu-list">
                            <v-list-item @click="startEditComment(reply)" class="comment-menu-item">
                              <v-list-item-title class="text-caption text-center">수정</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="confirmDeleteComment(reply.commentSeq)" class="comment-menu-item text-red">
                              <v-list-item-title class="text-caption text-center">삭제</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                      </div>
                    </div>
                    
                    <!-- 답글 내용 (수정 모드가 아닐 때) -->
                    <div v-if="editingComment !== reply.commentSeq" class="comment-text">{{ reply.commentContent }}</div>
                    
                    <!-- 답글 수정 입력창 -->
                    <div v-else class="comment-edit-section">
                      <div class="comment-input-wrapper">
                        <v-textarea
                          v-model="editText"
                          placeholder="답글을 수정하세요..."
                          outlined
                          rows="2"
                          hide-details
                          class="comment-input"
                        ></v-textarea>
                        <div class="edit-actions">
                          <v-btn
                            color="primary"
                            size="small"
                            variant="text"
                            @click="saveEditComment(reply.commentSeq)"
                            :disabled="!editText.trim()"
                          >
                            저장
                          </v-btn>
                          <v-btn
                            color="grey"
                            size="small"
                            variant="text"
                            @click="cancelEditComment"
                          >
                            취소
                          </v-btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 댓글 작성 -->
          <div class="comment-input-section">
            <div class="comment-input-wrapper">
              <v-textarea
                v-model="newComment"
                placeholder="새 댓글 작성..."
                outlined
                rows="2"
                hide-details
                class="comment-input"
              ></v-textarea>
              <v-btn
                color="primary"
                icon="mdi-send"
                size="default"
                variant="text"
                @click="postComment"
                class="post-btn"
                :disabled="!newComment.trim()"
              />
            </div>
          </div>
        </div>
      </div>
    </v-card>
    
    <!-- 삭제 확인 다이얼로그 -->
    <v-dialog v-model="showDeleteConfirm" max-width="400px">
      <v-card>
        <v-card-title>댓글 삭제</v-card-title>
        <v-card-text>
          정말로 이 댓글을 삭제하시겠습니까?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="cancelDeleteComment"
          >
            취소
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            @click="deleteCommentConfirm(showDeleteConfirm)"
          >
            삭제
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkspaceMemberStore } from '../../store/workspaceMemberStore.js'
import { useAuthStore } from '../../store/authStore.js'
import { getComments, createComment, updateComment, deleteComment } from '../../api/schedule/scheduleApi.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  taskData: {
    type: Object,
    default: () => ({})
  },
  isPersonal: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 모달 상태
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 워크스페이스 멤버 스토어
const workspaceMemberStore = useWorkspaceMemberStore()

// 인증 스토어
const authStore = useAuthStore()

// 담당자 이름 조회
const assigneeName = computed(() => {
  if (!props.taskData.picMemberSeq) return '미지정'
  
  const member = workspaceMemberStore.members?.find(m => m.memberSeq === props.taskData.picMemberSeq)
  return member?.name || '미지정'
})

// 댓글 관련 상태
const comments = ref([])
const newComment = ref('')
const replyToComment = ref(null)
const replyText = ref('')
const isLoadingComments = ref(false)

// 댓글 수정/삭제 관련 상태
const editingComment = ref(null)
const editText = ref('')
const showDeleteConfirm = ref(null)

// 댓글 조회
const fetchComments = async () => {
  if (!props.taskData.taskSeq) return
  
  try {
    isLoadingComments.value = true
    const response = await getComments(props.taskData.taskSeq)
    if (response.success) {
      comments.value = response.data.content || []
    }
  } catch (error) {
    console.error('댓글 조회 실패:', error)
  } finally {
    isLoadingComments.value = false
  }
}

// 모달이 열릴 때 댓글 조회
watch(isOpen, (newValue) => {
  if (newValue && props.taskData.taskSeq) {
    fetchComments()
  }
})

// 모달 닫기
const closeModal = () => {
  isOpen.value = false
}

// 상태 클래스 반환
const getStatusClass = (status) => {
  const statusMap = {
    'In Progress': 'status-progress',
    'TODO': 'status-todo',
    'IN_PROGRESS': 'status-progress',
    'COMPLETED': 'status-completed'
  }
  return statusMap[status] || 'status-default'
}

// 상태 텍스트 반환
const getStatusText = (status) => {
  const statusTextMap = {
    'TODO': '할 일',
    'IN_PROGRESS': '진행중',
    'COMPLETED': '완료',
    'In Progress': '진행중'
  }
  return statusTextMap[status] || status
}

// 사용자 이니셜
const getInitial = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

// 날짜 포맷팅
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  
  return date.toLocaleDateString('ko-KR')
}

// 댓글 작성
const postComment = async () => {
  if (!newComment.value.trim() || !props.taskData.taskSeq) return
  
  try {
    const commentData = {
      commentContent: newComment.value.trim()
    }
    
    const response = await createComment(props.taskData.taskSeq, commentData)
    if (response.success) {
      newComment.value = ''
      await fetchComments() // 댓글 목록 새로고침
    }
  } catch (error) {
    console.error('댓글 작성 실패:', error)
  }
}

// 대댓글 작성
const postReply = async (parentCommentSeq) => {
  if (!replyText.value.trim() || !props.taskData.taskSeq) return
  
  try {
    const commentData = {
      commentContent: replyText.value.trim(),
      parentCommentSeq: parentCommentSeq
    }
    
    const response = await createComment(props.taskData.taskSeq, commentData)
    if (response.success) {
      replyText.value = ''
      replyToComment.value = null
      await fetchComments() // 댓글 목록 새로고침
    }
  } catch (error) {
    console.error('대댓글 작성 실패:', error)
  }
}

// 답글 입력창 토글
const toggleReply = (commentSeq) => {
  if (replyToComment.value === commentSeq) {
    replyToComment.value = null
    replyText.value = ''
  } else {
    replyToComment.value = commentSeq
    replyText.value = ''
  }
}

// 댓글 작성자 권한 확인
const canEditComment = (comment) => {
  return authStore.memberSeq && Number(authStore.memberSeq) === Number(comment.memberSeq)
}

// 댓글 수정 시작
const startEditComment = (comment) => {
  editingComment.value = comment.commentSeq
  editText.value = comment.commentContent
}

// 댓글 수정 취소
const cancelEditComment = () => {
  editingComment.value = null
  editText.value = ''
}

// 댓글 수정 저장
const saveEditComment = async (commentSeq) => {
  if (!editText.value.trim()) return
  
  try {
    const commentData = {
      commentContent: editText.value.trim()
    }
    
    const response = await updateComment(commentSeq, commentData)
    if (response.success) {
      editingComment.value = null
      editText.value = ''
      await fetchComments() // 댓글 목록 새로고침
    }
  } catch (error) {
    console.error('댓글 수정 실패:', error)
  }
}

// 댓글 삭제 확인
const confirmDeleteComment = (commentSeq) => {
  showDeleteConfirm.value = commentSeq
}

// 댓글 삭제 취소
const cancelDeleteComment = () => {
  showDeleteConfirm.value = null
}

// 댓글 삭제 실행
const deleteCommentConfirm = async (commentSeq) => {
  try {
    const response = await deleteComment(commentSeq)
    if (response.success) {
      showDeleteConfirm.value = null
      await fetchComments() // 댓글 목록 새로고침
    }
  } catch (error) {
    console.error('댓글 삭제 실패:', error)
  }
}
</script>

<style scoped>
/* 모달 스타일 */
/* 디스코드 스타일 모달 */
.task-detail-modal {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
  background: rgb(var(--v-theme-surface));
}

/* 고정 크기 모달 */
.fixed-modal-detail {
  width: 1200px !important;
  max-height: 800px !important;
}

/* 개인 일정용 작은 모달 */
.fixed-modal-personal {
  width: 600px !important;
  max-height: 600px !important;
}

/* v-dialog 스크롤바 숨김 */
.no-scroll-dialog .v-overlay__content::-webkit-scrollbar {
  display: none;
}

.no-scroll-dialog .v-overlay__content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 모달 헤더 */
/* 디스코드 스타일 헤더 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  width: 32px;
  height: 32px;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: rgb(var(--v-theme-primary));
}

.modal-icon:hover {
  background: rgba(var(--v-theme-primary), 0.15);
}

.modal-icon .v-icon {
  font-size: 20px;
  color: rgb(var(--v-theme-primary));
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.close-btn {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.close-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.05) !important;
}

/* 본문 */
/* 디스코드 스타일 본문 */
.modal-body {
  display: flex;
  background: rgb(var(--v-theme-surface));
  min-height: 600px;
}

/* 개인 일정용 본문 */
.fixed-modal-personal .modal-body {
  min-height: 400px;
}

/* Task 정보 섹션 - 디스코드 스타일 */
.task-info-section {
  flex: 1;
  padding: 24px;
  background: rgb(var(--v-theme-schedule-header-bg));
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: rgb(var(--v-theme-schedule-text));
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid rgb(var(--v-theme-schedule-border));
}

/* 디스코드 스타일 정보 항목 */
.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 4px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  transition: all 0.15s ease;
}

.info-item:hover {
  border-color: rgb(var(--v-theme-schedule-border));
  background: rgb(var(--v-theme-schedule-hover-bg));
}

.info-row {
  display: flex;
  gap: 16px;
}

.info-item.half {
  flex: 1;
}

/* 컴팩트 가로 레이아웃 */
.info-compact-wrapper {
  margin-bottom: 24px;
}

.info-row-compact {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.info-row-compact:last-child {
  margin-bottom: 0;
}

/* 디스코드 스타일 인라인 정보 항목 */
.info-item-inline {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 4px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  transition: all 0.15s ease;
  min-width: 0;
}

.info-item-inline:hover {
  border-color: rgb(var(--v-theme-schedule-border));
  background: rgb(var(--v-theme-schedule-hover-bg));
}

.info-item-inline .info-label {
  font-size: 11px;
  font-weight: 700;
  color: #1976d2;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  margin-bottom: 0;
  flex-shrink: 0;
}

.info-item-inline .info-value {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-schedule-text));
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-item-inline .status-chip {
  padding: 4px 10px;
  font-size: 11px;
  gap: 6px;
  margin: 0;
}

.info-item-inline .status-dot {
  width: 6px;
  height: 6px;
}

.info-label {
  font-size: 12px;
  font-weight: 700;
  color: #1976d2;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.info-value {
  font-size: 15px;
  color: rgb(var(--v-theme-schedule-text));
  font-weight: 500;
  line-height: 1.5;
}

.task-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* 상태 칩 스타일 */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  width: fit-content;
}

.status-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-text {
  line-height: 1;
}

/* 할 일 상태 */
.status-todo {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.status-todo .status-dot {
  background: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

/* 진행중 상태 */
.status-progress {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffb74d;
}

.status-progress .status-dot {
  background: #ff9800;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2);
}

/* 완료 상태 */
.status-completed {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #81c784;
}

.status-completed .status-dot {
  background: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

/* 구분선 */
.divider {
  width: 1px;
  background: rgb(var(--v-theme-schedule-border));
  margin: 24px 0;
}

/* 댓글 섹션 */
/* 디스코드 스타일 댓글 섹션 */
.comments-section {
  flex: 1;
  padding: 24px;
  background: rgb(var(--v-theme-schedule-card-bg));
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgb(var(--v-theme-schedule-border));
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
}

/* 댓글 목록 스크롤바 */
.comments-list::-webkit-scrollbar {
  width: 6px;
}

.comments-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 디스코드 스타일 댓글 항목 */
.comment-item {
  background: rgb(var(--v-theme-schedule-header-bg));
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 8px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  transition: all 0.15s ease;
}

.comment-item:hover {
  background: rgb(var(--v-theme-schedule-hover-bg));
  border-color: rgb(var(--v-theme-schedule-border));
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-menu-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.comment-item:hover .comment-menu-btn {
  opacity: 1;
}

.comment-menu-list {
  min-width: 60px;
}

.comment-menu-item {
  min-height: 20px !important;
  padding: 1px 6px !important;
}

.comment-menu-item .v-list-item-title {
  line-height: 1.2 !important;
}

.comment-edit-section {
  margin: 8px 0;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.comment-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-avatar {
  background: #e0e0e0;
}

.comment-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-schedule-text));
}

.comment-time {
  font-size: 12px;
  color: rgb(var(--v-theme-schedule-text-tertiary));
}

.comment-text {
  font-size: 14px;
  color: rgb(var(--v-theme-schedule-text-secondary));
  line-height: 1.5;
  margin-bottom: 8px;
}

.comment-actions {
  margin-top: 8px;
}

.reply-link {
  font-size: 12px;
  color: #1976d2;
  text-decoration: none;
}

.reply-link:hover {
  text-decoration: underline;
}

/* 댓글 작성 */
.comment-input-section {
  border-top: 2px solid rgb(var(--v-theme-schedule-border));
  padding-top: 20px;
  margin-top: auto;
}

/* 디스코드 스타일 댓글 입력 */
.comment-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: rgb(var(--v-theme-schedule-header-bg));
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
}

.comment-input {
  flex: 1;
  margin-bottom: 0;
}

.comment-input :deep(.v-field) {
  background: rgb(var(--v-theme-schedule-card-bg));
  border-radius: 4px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  transition: all 0.15s ease;
}

.comment-input :deep(.v-field):hover {
  border-color: rgb(var(--v-theme-schedule-border));
}

.comment-input :deep(.v-field--focused) {
  border-color: #1976d2;
}

.post-btn {
  margin-bottom: 8px;
  color: #1976d2 !important;
  transition: all 0.15s ease;
  border-radius: 4px;
}

.post-btn:hover {
  color: #1565c0 !important;
  background: rgba(25, 118, 210, 0.1) !important;
  transform: scale(1.05);
}

.post-btn:active {
  transform: scale(0.95);
}

/* 대댓글 스타일 */
.replies-section {
  margin-left: 32px;
  margin-top: 12px;
  padding-left: 20px;
  border-left: 3px solid rgb(var(--v-theme-schedule-border));
}

/* 디스코드 스타일 답글 */
.reply-item {
  background: rgb(var(--v-theme-schedule-card-bg));
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 6px;
  border: 1px solid rgb(var(--v-theme-schedule-border));
  transition: all 0.15s ease;
}

.reply-item:hover {
  background: rgb(var(--v-theme-schedule-hover-bg));
  border-color: rgb(var(--v-theme-schedule-border));
}

.reply-item:last-child {
  margin-bottom: 0;
}

.reply-input-section {
  margin-left: 32px;
  margin-top: 10px;
  padding-left: 16px;
  border-left: 2px solid rgb(var(--v-theme-schedule-border));
}

/* 로딩 상태 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: rgb(var(--v-theme-schedule-text-secondary));
}

.loading-state p {
  margin-top: 16px;
  font-size: 14px;
}
</style>

