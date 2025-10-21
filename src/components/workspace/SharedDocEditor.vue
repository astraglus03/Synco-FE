<template>
  <div class="shared-doc-editor">
    <!-- 헤더 -->
    <div class="editor-header">
      <div class="header-left">
        <v-btn 
          icon="mdi-arrow-left" 
          variant="text" 
          @click="goBack"
          class="back-btn"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <h2 class="document-title">문서 편집</h2>
      </div>
      
      <!-- 참여자 토글 버튼 -->
      <div class="participants-toggle">
        <v-btn
          variant="text"
          size="small"
          @click="showParticipants = !showParticipants"
          class="participants-btn"
        >
          <v-icon start>mdi-account-multiple</v-icon>
          {{ participants.length }}명
          <v-icon end>{{ showParticipants ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
        
        <!-- 참여자 드롭다운 -->
        <v-card
          v-if="showParticipants"
          class="participants-dropdown"
          elevation="4"
        >
          <div class="participants-header">
            <v-icon>mdi-account-multiple</v-icon>
            <span>참여자 ({{ participants.length }}명)</span>
          </div>
          <div class="participants-list">
            <div
              v-for="participant in participants"
              :key="participant.userId"
              class="participant-item"
              :class="{ 'is-current-user': participant.userId === user.id }"
            >
              <div class="participant-avatar">
                {{ participant.userName.charAt(0).toUpperCase() }}
              </div>
              <div class="participant-info">
                <div class="participant-name">{{ participant.userName }}</div>
                <div class="participant-status">
                  <v-icon size="small" color="success">mdi-circle</v-icon>
                  온라인
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <!-- 연결 상태 표시 -->
      <div class="connection-status" :class="connectionStatusClass">
        <v-chip 
          :color="connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'error'" 
          size="small"
          class="status-chip"
        >
          <v-icon start>
            {{ connectionStatus === 'connected' ? 'mdi-check-circle' : 
                connectionStatus === 'connecting' ? 'mdi-loading' : 'mdi-alert-circle' }}
          </v-icon>
          {{ connectionStatus === 'connecting' ? '서버 연결 중...' : 
             connectionStatus === 'connected' ? '실시간 협업 활성화' : 
             '오프라인 모드' }}
        </v-chip>
      </div>
    </div>

    <!-- 에디터 툴바 -->
    <div v-if="editor" class="editor-toolbar">
      <v-btn-toggle v-model="selectedFormat" mandatory>
        <v-btn 
          @click="editor.chain().focus().toggleBold().run()" 
          :class="{ 'is-active': editor.isActive('bold') }"
          size="small"
        >
          <v-icon>mdi-format-bold</v-icon>
        </v-btn>
        <v-btn 
          @click="editor.chain().focus().toggleItalic().run()" 
          :class="{ 'is-active': editor.isActive('italic') }"
          size="small"
        >
          <v-icon>mdi-format-italic</v-icon>
        </v-btn>
        <v-btn 
          @click="editor.chain().focus().toggleStrike().run()" 
          :class="{ 'is-active': editor.isActive('strike') }"
          size="small"
        >
          <v-icon>mdi-format-strikethrough</v-icon>
        </v-btn>
      </v-btn-toggle>

      <v-divider vertical class="mx-2"></v-divider>

      <v-btn-toggle v-model="selectedHeading" mandatory>
        <v-btn 
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
          size="small"
        >
          H1
        </v-btn>
        <v-btn 
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
          size="small"
        >
          H2
        </v-btn>
        <v-btn 
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" 
          :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
          size="small"
        >
          H3
        </v-btn>
        <v-btn 
          @click="editor.chain().focus().setParagraph().run()" 
          :class="{ 'is-active': editor.isActive('paragraph') }"
          size="small"
        >
          P
        </v-btn>
      </v-btn-toggle>

      <v-divider vertical class="mx-2"></v-divider>

      <v-btn-toggle v-model="selectedList" mandatory>
        <v-btn 
          @click="editor.chain().focus().toggleBulletList().run()" 
          :class="{ 'is-active': editor.isActive('bulletList') }"
          size="small"
        >
          <v-icon>mdi-format-list-bulleted</v-icon>
        </v-btn>
        <v-btn 
          @click="editor.chain().focus().toggleOrderedList().run()" 
          :class="{ 'is-active': editor.isActive('orderedList') }"
          size="small"
        >
          <v-icon>mdi-format-list-numbered</v-icon>
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- 에디터 컨테이너 -->
    <div class="editor-container" ref="editorContainerRef">
      <div v-if="isLoading" class="loading-container">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="loading-text">문서를 불러오는 중...</p>
      </div>
      <div v-else-if="editor">
        <editor-content :editor="editor" />
        
        <!-- 다른 사용자들의 커서를 렌더링하는 부분 -->
        <div
          v-for="cursor in remoteCursors"
          :key="cursor.senderId"
          class="remote-cursor"
          :style="{
            transform: `translate(${cursor.coords.left}px, ${cursor.coords.top}px)`,
            backgroundColor: cursor.user.color,
            height: cursor.height ? `${cursor.height}px` : '1.3em'
          }"
        >
          <div class="cursor-flag" :style="{ backgroundColor: cursor.user.color }">
            {{ cursor.user.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import { connectStomp, sendStompMessage, disconnectStomp } from '@/services/editorStompService';
import { documentApi } from '@/api/document/documentApi';
import { projectDriveApi } from '@/api/drive/driveApi';

// Props 정의 (라우트 파라미터에서 받음)
const props = defineProps({
  documentSeq: {
    type: [Number, String],
    required: true
  },
  driveChannelSeq: {
    type: [Number, String],
    required: true
  },
  currentUser: {
    type: Object,
    default: () => ({ id: 1, name: '홍길동' })
  }
});

// Emits 정의
const emit = defineEmits(['document-line-updated', 'document-line-deleted']);

// 라우터
const router = useRouter();

// 뒤로가기 함수
const goBack = () => {
  router.go(-1);
};

// 디바운싱 함수
const debounce = (func, delay) => {
  let timeoutId;
  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
  
  // 즉시 실행할 수 있는 flush 메서드 추가
  debounced.flush = () => {
    clearTimeout(timeoutId);
    if (pendingUpdates.size > 0) {
      sendUpdate(Array.from(pendingUpdates));
      pendingUpdates.clear();
    }
  };
  
  return debounced;
};

// 디바운싱된 업데이트 함수들
let debouncedUpdate = null;
let debouncedBatchUpdate = null;
let pendingUpdates = new Set();

// 실제 업데이트 전송 함수
const sendUpdate = (updates) => {
  if (updates.length === 1) {
    const id = updates[0];
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      const cleanedHtml = element.outerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, '');
      sendStompMessage({
        destination: '/publish/document/update',
        body: {
          messageType: 'UPDATE',
          documentId: props.documentSeq.toString(),
          senderId: user.name,
          lineId: id,
          content: cleanedHtml,
        },
      });
    }
  } else {
    const changes = updates.map(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      return element ? {
        lineId: id,
        content: element.outerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, ''),
      } : null;
    }).filter(c => c);

    console.log(`📦 BATCH_UPDATE: ${changes.length}개`);
    sendStompMessage({
      destination: '/publish/document/batch-update',
      body: {
        messageType: 'BATCH_UPDATE',
        documentId: props.documentSeq.toString(),
        senderId: user.name,
        changes: changes,
      },
    });
  }
};

// 디바운싱된 업데이트 함수 초기화
const initDebouncedFunctions = () => {
  debouncedUpdate = debounce((updates) => {
    console.log(`⏰ 디바운싱된 업데이트 전송: ${updates.length}개`);
    sendUpdate(updates);
    pendingUpdates.clear();
  }, 300); // 0.3초 디바운싱
};

// 문서 로딩 함수
const loadDocument = async () => {
  try {
    isLoading.value = true;
    
    // 파라미터를 명시적으로 숫자로 변환
    const driveChannelSeq = Number(props.driveChannelSeq);
    const documentSeq = Number(props.documentSeq);
    
    console.log('문서 로딩 시작:', {
      driveChannelSeq: driveChannelSeq,
      documentSeq: documentSeq,
      originalProps: {
        driveChannelSeq: props.driveChannelSeq,
        documentSeq: props.documentSeq
      }
    });

    const result = await documentApi.getDocument(driveChannelSeq, documentSeq);
    
    if (result.success) {
      console.log('문서 로딩 성공:', result.data);
      
      // 백엔드 ResponseDto 구조에 맞게 처리
      let blocks = [];
      if (result.data && result.data.success && Array.isArray(result.data.data)) {
        blocks = result.data.data;
      } else if (result.data && Array.isArray(result.data)) {
        blocks = result.data;
      }
      
      console.log('블록 데이터:', blocks);
      
      // 블록 데이터를 HTML로 변환
      if (blocks.length > 0) {
        documentContent.value = convertBlocksToHTML(blocks);
      } else {
        documentContent.value = '<p></p>';
      }
      
      console.log('변환된 HTML:', documentContent.value);
    } else {
      console.error('문서 로딩 실패:', result.error);
      documentContent.value = '<p>문서를 불러올 수 없습니다.</p>';
    }
  } catch (error) {
    console.error('문서 로딩 중 오류:', error);
    documentContent.value = '<p>문서를 불러오는 중 오류가 발생했습니다.</p>';
  } finally {
    isLoading.value = false;
  }
};

// 참여자 목록 초기 조회 함수
const loadParticipants = async () => {
  try {
    const documentSeq = Number(props.documentSeq);
    console.log('👥 참여자 목록 조회 시작:', documentSeq);
    
    const result = await projectDriveApi.getDocumentParticipants(documentSeq);
    
    if (result.success && result.data) {
      console.log('👥 참여자 목록 조회 성공:', result.data);
      
      // 백엔드 ParticipantsResponseDto 구조에 맞게 처리
      const participantsData = result.data.participants || [];
      
      // 현재 참여자 목록 초기화 후 추가
      participants.value = participantsData.map(participant => ({
        userId: participant.userId,
        userName: participant.userName,
        joinTime: Date.now() // 초기 조회 시점으로 설정
      }));
      
      console.log('👥 초기 참여자 목록 설정 완료:', participants.value);
    } else {
      console.warn('👥 참여자 목록 조회 실패:', result.error);
      // 실패해도 빈 배열로 초기화
      participants.value = [];
    }
  } catch (error) {
    console.error('👥 참여자 목록 조회 중 오류:', error);
    // 오류 발생 시에도 빈 배열로 초기화
    participants.value = [];
  }
};

// 라인 락 상태 초기 조회 함수
const loadLineLocks = async () => {
  try {
    const driveChannelSeq = Number(props.driveChannelSeq);
    const documentSeq = Number(props.documentSeq);
    console.log('🔒 라인 락 상태 조회 시작:', { driveChannelSeq, documentSeq });
    
    const result = await projectDriveApi.getDocumentLocks(driveChannelSeq, documentSeq);
    
    if (result.success && result.data) {
      console.log('🔒 라인 락 상태 조회 성공:', result.data);
      
      // 라인 락 맵 초기화
      lineLocks.value.clear();
      
      // 백엔드 LineLocksResponseDto 구조에 맞게 처리
      if (result.data.locks && Array.isArray(result.data.locks)) {
        result.data.locks.forEach(lock => {
          lineLocks.value.set(lock.lineId, {
            userId: lock.userId,
            userName: lock.userName,
            timestamp: lock.timestamp
          });
        });
      }
      
      console.log('🔒 초기 라인 락 상태 설정 완료:', Array.from(lineLocks.value.entries()));
      
      // 초기 락 상태 로딩 후 UI 업데이트
      setTimeout(() => {
        updateLineLockStatus();
      }, 1000); // 에디터가 완전히 로드된 후 실행
      
      // 추가로 2초 후에도 한 번 더 업데이트 (DOM이 완전히 렌더링된 후)
      setTimeout(() => {
        updateLineLockStatus();
      }, 3000);
    } else {
      console.warn('🔒 라인 락 상태 조회 실패:', result.error);
      lineLocks.value.clear();
    }
  } catch (error) {
    console.error('🔒 라인 락 상태 조회 중 오류:', error);
    lineLocks.value.clear();
  }
};

// 백엔드 블록 데이터를 HTML로 변환
const convertBlocksToHTML = (blocks) => {
  if (!blocks || blocks.length === 0) {
    return '<p></p>';
  }
  
  console.log('📦 받은 블록 데이터:', blocks);
  console.log('📦 첫 번째 블록 상세:', blocks[0]);
  console.log('📦 필드명 확인:', Object.keys(blocks[0]));
  
  // prevId 기반으로 정렬
  const sortedBlocks = sortBlocksByPrevId(blocks);
  
  console.log('✅ 정렬된 블록:', sortedBlocks.map(b => ({
    feId: b.feId,
    parentId: b.parentId,
    content: b.content?.substring(0, 50)
  })));
  
  // HTML 변환
  return sortedBlocks.map(block => {
    // content가 이미 완성된 HTML
    if (block.content) {
      return block.content;
    }
    
    // fallback: 없으면 빈 p 태그
    const lineId = block.feId || randomUUID();
    return `<p data-id="${lineId}"></p>`;
  }).join('');
};

// prevId 기반 정렬 함수
const sortBlocksByPrevId = (blocks) => {
  if (blocks.length <= 1) return blocks;
  
  console.log('🔧 정렬 시작 - 모든 블록:', blocks.map(b => ({
    feId: b.feId,
    parentId: b.parentId,
    content: b.content?.substring(0, 30)
  })));
  
  // parentId가 NULL인 첫 번째 블록 찾기
  const first = blocks.find(b => !b.parentId || b.parentId === 'NULL');
  
  if (!first) {
    console.warn('⚠️ 첫 블록을 찾을 수 없음. 모든 parentId:', blocks.map(b => b.parentId));
    return blocks;
  }
  
  console.log('✅ 첫 번째 블록 찾음:', first.feId);
  
  const sorted = [first];
  const used = new Set([first.feId]);
  
  // 연결리스트 따라가기
  let iteration = 0;
  while (sorted.length < blocks.length && iteration < 100) {
    iteration++;
    const lastId = sorted[sorted.length - 1].feId;
    
    console.log(`🔗 [${iteration}] lastId = "${lastId}", 다음 찾는 중...`);
    
    const next = blocks.find(b => {
      const match = b.parentId === lastId && !used.has(b.feId);
      console.log(`  검사: feId="${b.feId}", parentId="${b.parentId}", 매칭=${match}`);
      return match;
    });
    
    if (!next) {
      console.warn(`⚠️ 다음 블록을 찾을 수 없음. lastId="${lastId}"`);
      break;
    }
    
    console.log(`✅ 다음 블록 찾음: ${next.feId}`);
    sorted.push(next);
    used.add(next.feId);
  }
  
  console.log('🎯 최종 정렬 완료:', sorted.length, '/', blocks.length);
  return sorted;
};

// 고유 ID 생성 함수
function randomUUID() {
  return 'line-' + Math.random().toString(36).substring(2, 11);
}

// 참여자 관련 함수들
const addParticipant = (userInfo) => {
  const existingIndex = participants.value.findIndex(p => p.userId === userInfo.userId);
  if (existingIndex === -1) {
    participants.value.push({
      userId: userInfo.userId,
      userName: userInfo.userName,
      joinTime: Date.now()
    });
    console.log(`👋 참여자 추가: ${userInfo.userName}`);
  }
};

const removeParticipant = (userId) => {
  const index = participants.value.findIndex(p => p.userId === userId);
  if (index !== -1) {
    const removedUser = participants.value.splice(index, 1)[0];
    console.log(`👋 참여자 제거: ${removedUser.userName}`);
  }
};

const joinDocument = () => {
  // STOMP로 참여 알림 (간단하게)
  sendStompMessage({
    destination: `/publish/document/${props.documentSeq}/join`,
    body: {
      userId: user.id,
      userName: user.name
    },
  });
};

const leaveDocument = () => {
  // 현재 락된 라인이 있다면 해제
  if (currentUserLockedLineId.value) {
    unlockLine(currentUserLockedLineId.value);
  }
  
  // STOMP로 떠남 알림 (간단하게)
  sendStompMessage({
    destination: `/publish/document/${props.documentSeq}/leave`,
    body: {
      userId: user.id,
      userName: user.name
    },
  });
};

// 라인 락 함수
const lockLine = (lineId) => {
  console.log('🔒 라인 락 시도:', lineId);
  console.log('🔒 현재 사용자:', { id: user.id, name: user.name });
  
  const lockMessage = {
    messageType: 'LOCK',
    documentId: props.documentSeq.toString(),
    lineId: lineId,
    userId: user.id,
    userName: user.name
  };
  
  console.log('🔒 락 메시지 전송:', lockMessage);
  
  sendStompMessage({
    destination: '/publish/document/lock',
    body: lockMessage,
  });
};

// 라인 락 해제 함수
const unlockLine = (lineId) => {
  if (!lineId) {
    return;
  }
  
  console.log('🔓 라인 락 해제 시도:', lineId);
  
  sendStompMessage({
    destination: '/publish/document/unlock',
    body: {
      messageType: 'UNLOCK',
      documentId: props.documentSeq.toString(),
      lineId: lineId,
      userId: user.id,
      userName: user.name
    },
  });
};

// 라인 락 전환 함수
const switchLineLock = (newLineId) => {
  console.log('🔄 라인 락 전환 시도:', {
    from: currentUserLockedLineId.value,
    to: newLineId
  });
  
  // 이전 라인 락 해제
  if (currentUserLockedLineId.value && currentUserLockedLineId.value !== newLineId) {
    console.log('🔓 이전 라인 락 해제:', currentUserLockedLineId.value);
    unlockLine(currentUserLockedLineId.value);
  }
  
  // 새 라인 락
  if (newLineId && currentUserLockedLineId.value !== newLineId) {
    console.log('🔒 새 라인 락 설정:', newLineId);
    currentUserLockedLineId.value = newLineId;
    lockLine(newLineId);
  }
};

// 고유 ID 확장
const UniqueIdExtension = Extension.create({
  name: 'uniqueId',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      attributeName: 'id',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: element => element.getAttribute('data-id'),
            renderHTML: attributes => {
              if (!attributes[this.options.attributeName]) {
                return {};
              }
              return { 'data-id': attributes[this.options.attributeName] };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('uniqueId'),
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some(transaction => transaction.docChanged);
          if (!docChanged) {
            return;
          }

          const tr = newState.tr;
          let modified = false;
          const seenIds = new Set();

          newState.doc.descendants((node, pos) => {
            if (!this.options.types.includes(node.type.name)) {
              return;
            }

            const id = node.attrs[this.options.attributeName];

            if (id === null || id === undefined) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                [this.options.attributeName]: randomUUID(),
              });
              modified = true;
            } else if (seenIds.has(id)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                [this.options.attributeName]: randomUUID(),
              });
              modified = true;
            } else {
              seenIds.add(id);
            }
          });

          if (modified) {
            return tr;
          }
        },
      }),
      // 락된 라인 삭제 차단 플러그인
      new Plugin({
        key: new PluginKey('lockProtection'),
        props: {
          handleKeyDown: (view, event) => {
            // 삭제 키 (Delete, Backspace) 확인
            if (event.key === 'Delete' || event.key === 'Backspace') {
              const { from, to } = view.state.selection;
              
              // 선택 범위 내의 모든 라인 확인
              const selectedLines = new Set();
              view.state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.isBlock && node.attrs.id) {
                  selectedLines.add(node.attrs.id);
                }
              });
              
              // 락된 라인이 포함되어 있는지 확인
              for (const lineId of selectedLines) {
                if (isLineLocked(lineId)) {
                  const lockInfo = getLineLockUser(lineId);
                  if (lockInfo && lockInfo.userId !== user.id) {
                    console.log('🚫 락된 라인 삭제 차단:', lineId, lockInfo.userName);
                    
                    // 에러 메시지 표시
                    showLockError(`${lockInfo.userName}님이 편집 중입니다.`);
                    
                    event.preventDefault();
                    event.stopPropagation();
                    return true; // 이벤트 차단
                  }
                }
              }
            }
            
            // 타이핑 차단 (기존 로직 유지)
            const { from } = view.state.selection;
            const resolvedPos = view.state.doc.resolve(from);
            let currentLineId = null;
            
            for (let i = resolvedPos.depth; i > 0; i--) {
              const node = resolvedPos.node(i);
              if (node.isBlock && node.attrs.id) {
                currentLineId = node.attrs.id;
                break;
              }
            }
            
            if (currentLineId && isLineLocked(currentLineId)) {
              const lockInfo = getLineLockUser(currentLineId);
              if (lockInfo && lockInfo.userId !== user.id) {
                console.log('🚫 락된 라인 타이핑 차단:', currentLineId, lockInfo.userName);
                event.preventDefault();
                event.stopPropagation();
                return true; // 이벤트 차단
              }
            }
            
            return false;
          },
          handleDOMEvents: {
            mousedown: (view, event) => {
              // 드래그 시작 표시
              isDragging.value = true;
              console.log('🖱️ 드래그 시작');
              
              const target = event.target;
              const lineElement = target.closest('[data-id]');
              if (lineElement) {
                const lineId = lineElement.getAttribute('data-id');
                if (isLineLocked(lineId)) {
                  const lockInfo = getLineLockUser(lineId);
                  if (lockInfo && lockInfo.userId !== user.id) {
                    console.log('🚫 락된 라인 마우스다운 차단:', lineId, lockInfo.userName);
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return true; // 이벤트 차단
                  }
                }
              }
              return false;
            },
            click: (view, event) => {
              const target = event.target;
              const lineElement = target.closest('[data-id]');
              if (lineElement) {
                const lineId = lineElement.getAttribute('data-id');
                if (isLineLocked(lineId)) {
                  const lockInfo = getLineLockUser(lineId);
                  if (lockInfo && lockInfo.userId !== user.id) {
                    console.log('🚫 락된 라인 클릭 차단:', lineId, lockInfo.userName);
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return true; // 이벤트 차단
                  }
                }
              }
              return false;
            },
            selectstart: (view, event) => {
              // 드래그 선택 시작 차단
              const target = event.target;
              const lineElement = target.closest('[data-id]');
              if (lineElement) {
                const lineId = lineElement.getAttribute('data-id');
                if (isLineLocked(lineId)) {
                  const lockInfo = getLineLockUser(lineId);
                  if (lockInfo && lockInfo.userId !== user.id) {
                    console.log('🚫 락된 라인 선택시작 차단:', lineId, lockInfo.userName);
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return true; // 이벤트 차단
                  }
                }
              }
              return false;
            },
            mousemove: (view, event) => {
              // 드래그 중 실시간 차단
              if (event.buttons === 1) { // 왼쪽 마우스 버튼이 눌린 상태
                const target = event.target;
                const lineElement = target.closest('[data-id]');
                if (lineElement) {
                  const lineId = lineElement.getAttribute('data-id');
                  if (isLineLocked(lineId)) {
                    const lockInfo = getLineLockUser(lineId);
                    if (lockInfo && lockInfo.userId !== user.id) {
                      console.log('🚫 드래그 중 락된 라인 차단:', lineId, lockInfo.userName);
                      event.preventDefault();
                      event.stopPropagation();
                      event.stopImmediatePropagation();
                      
                      // 선택 강제 해제
                      if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                      }
                      
                      return true; // 이벤트 차단
                    }
                  }
                }
              }
              return false;
            },
            mouseup: (view, event) => {
              // 드래그 종료 표시
              isDragging.value = false;
              console.log('🖱️ 드래그 종료');
              
              // 드래그 종료 시 선택 범위 검사
              const { from, to } = view.state.selection;
              if (from !== to) { // 선택이 있는 경우
                const selectedLines = new Set();
                view.state.doc.nodesBetween(from, to, (node, pos) => {
                  if (node.isBlock && node.attrs.id) {
                    selectedLines.add(node.attrs.id);
                  }
                });
                
                // 락된 라인이 포함되어 있는지 확인
                for (const lineId of selectedLines) {
                  if (isLineLocked(lineId)) {
                    const lockInfo = getLineLockUser(lineId);
                    if (lockInfo && lockInfo.userId !== user.id) {
                      console.log('🚫 드래그 종료 시 락된 라인 선택 차단:', lineId, lockInfo.userName);
                      
                      // 선택 강제 해제
                      if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                      }
                      
                      event.preventDefault();
                      event.stopPropagation();
                      event.stopImmediatePropagation();
                      return true; // 이벤트 차단
                    }
                  }
                }
              }
              return false;
            }
          }
        }
      }),
    ];
  },
});

// 반응형 변수 선언
const editor = ref(null);
const connectionStatus = ref('connecting'); // 'connecting' | 'connected' | 'offline'
const isUpdatingFromRemote = ref(false);
const editorContainerRef = ref(null); // 에디터 컨테이너 DOM 참조
const remoteCursorsMap = ref({}); // 다른 사용자 커서 정보 객체
const lastCursorUpdate = ref(0); // 커서 업데이트 throttle용
const previousNodesById = ref(new Map()); // "이전 상태"를 저장

// 참여자 관련 상태
const participants = ref([]); // 참여자 목록
const showParticipants = ref(false); // 참여자 목록 표시 여부

// 라인 락 상태 관리
const lineLocks = ref(new Map()); // lineId -> {userId, userName, timestamp}
const currentUserLockedLineId = ref(null); // 현재 사용자가 락한 라인 ID
const isDragging = ref(false); // 드래그 상태 추적

// 락된 라인인지 확인하는 computed
const isLineLocked = (lineId) => {
  return lineLocks.value.has(lineId);
};

// 라인이 다른 사용자에게 락되어 있는지 확인하는 computed
const isLineLockedByOthers = (lineId) => {
  const lock = lineLocks.value.get(lineId);
  return lock && lock.userId !== user.id;
};

// 락된 라인의 사용자 정보를 가져오는 computed
const getLineLockUser = (lineId) => {
  return lineLocks.value.get(lineId);
};

// 락 에러 메시지 표시 함수
const showLockError = (message) => {
  // 간단한 알림으로 표시 (나중에 더 예쁜 토스트로 교체 가능)
  alert(`🚫 ${message}`);
  
  // 또는 Vuetify 스낵바 사용 (더 예쁜 UI)
  // this.$toast.error(message);
};

// 기존 플로팅 라벨 로직은 제거됨. CSS ::after로 표시.

// 라인 락 상태 업데이트 함수
const updateLineLockStatus = () => {
  // DOM이 완전히 업데이트될 때까지 기다린 후 실행
  setTimeout(() => {
    nextTick(() => {
      // 모든 라인 요소에 대해 락 상태 적용
      const allLines = document.querySelectorAll('[data-id]');
      console.log('🔒 락 상태 업데이트 시작 - 총 라인 수:', allLines.length);
      
      allLines.forEach(lineElement => {
        const lineId = lineElement.getAttribute('data-id');
        if (!lineId) return;
        
        // 기존 락 클래스 제거 (모든 line-locked-by-* 패턴 제거)
        const classList = Array.from(lineElement.classList);
        classList.forEach(className => {
          if (className.startsWith('line-locked-by-')) {
            lineElement.classList.remove(className);
          }
        });
        
        // 이전에 설정한 락 라벨 속성 제거
        lineElement.removeAttribute('data-locked-by');
        
        if (isLineLocked(lineId)) {
          const lockInfo = getLineLockUser(lineId);
          if (lockInfo) {
            // 사용자 ID를 포함한 클래스명으로 락 상태 표시
            lineElement.classList.add(`line-locked-by-${lockInfo.userId}`);
            lineElement.setAttribute('data-locked-by', `${lockInfo.userName}가 편집 중`);
            console.log('🔒 라인 락 적용:', lineId, lockInfo.userName, `line-locked-by-${lockInfo.userId}`);
            // 라벨은 CSS ::after로 표시됨
          }
        }
      });
      
      console.log('🔒 락 상태 업데이트 완료');
    });
  }, 100); // 100ms 지연으로 DOM 업데이트 보장
};

// 드롭다운 외부 클릭 시 닫기
const handleClickOutside = (event) => {
  if (showParticipants.value && !event.target.closest('.participants-toggle')) {
    showParticipants.value = false;
  }
};

// 전역 드래그 차단 핸들러
const handleGlobalSelectStart = (event) => {
  const target = event.target;
  const lineElement = target.closest('[data-id]');
  if (lineElement) {
    const lineId = lineElement.getAttribute('data-id');
    if (isLineLocked(lineId)) {
      const lockInfo = getLineLockUser(lineId);
      if (lockInfo && lockInfo.userId !== user.id) {
        console.log('🚫 전역 선택시작 차단:', lineId, lockInfo.userName);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }
  }
};

const handleGlobalMouseMove = (event) => {
  // 드래그 중 실시간 차단
  if (event.buttons === 1) { // 왼쪽 마우스 버튼이 눌린 상태
    const target = event.target;
    const lineElement = target.closest('[data-id]');
    if (lineElement) {
      const lineId = lineElement.getAttribute('data-id');
      if (isLineLocked(lineId)) {
        const lockInfo = getLineLockUser(lineId);
        if (lockInfo && lockInfo.userId !== user.id) {
          console.log('🚫 전역 드래그 중 차단:', lineId, lockInfo.userName);
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          // 선택 강제 해제
          if (window.getSelection) {
            window.getSelection().removeAllRanges();
          }
          
          return false;
        }
      }
    }
  }
};

// 문서 로딩 상태
const isLoading = ref(true);
const documentContent = ref('');

// 툴바 상태
const selectedFormat = ref(null);
const selectedHeading = ref(null);
const selectedList = ref(null);

const user = {
  id: Math.floor(Math.random() * 10000), // 랜덤 ID (테스트용)
  name: 'User ' + Math.floor(Math.random() * 100),
  color: '#' + Math.floor(Math.random()*16777215).toString(16),
};

const connectionStatusClass = computed(() => ({
  'status-connecting': connectionStatus.value === 'connecting',
  'status-connected': connectionStatus.value === 'connected',
  'status-offline': connectionStatus.value === 'offline',
}));

const remoteCursors = computed(() => {
  if (!editor.value || !editor.value.view || !editorContainerRef.value) {
    return [];
  }

  const editorDom = editor.value.view.dom;
  if (!editorDom) return [];
  
  const containerRect = editorContainerRef.value.getBoundingClientRect();
  const cursors = [];

  for (const senderId in remoteCursorsMap.value) {
    const cursor = remoteCursorsMap.value[senderId];
    try {
      const maxPos = editor.value.state.doc.content.size;
      const safePos = maxPos > 1
        ? Math.min(Math.max(cursor.pos, 1), maxPos - 1)
        : 0;

      const coords = editor.value.view.coordsAtPos(safePos, -1);
      const cursorHeight = coords.bottom - coords.top;
      const relativeLeft = coords.left - containerRect.left;
      const relativeTop = coords.top - containerRect.top;

      cursors.push({
        senderId,
        user: cursor.user,
        coords: {
          left: relativeLeft,
          top: relativeTop,
        },
        height: cursorHeight,
      });
    } catch (error) {
      console.warn('Invalid cursor position:', cursor.pos, error);
    }
  }

  return cursors;
});

// 라이프사이클 훅
onMounted(async () => {
  console.log('SharedDocEditor 마운트됨:', {
    documentSeq: props.documentSeq,
    driveChannelSeq: props.driveChannelSeq,
    currentUser: props.currentUser
  });

  // 디바운싱 함수 초기화
  initDebouncedFunctions();

  // 먼저 문서 로딩
  await loadDocument();
  
  // 참여자 목록 초기 조회
  await loadParticipants();
  
  // 라인 락 상태 초기 조회
  await loadLineLocks();

  editor.value = new Editor({
    extensions: [
      StarterKit,
      UniqueIdExtension,
    ],
    content: documentContent.value || '<p></p>', // 로딩된 문서 내용 사용
    onCreate: ({ editor }) => {
      // 에디터 생성 시, 초기 상태를 "이전 상태"로 저장
      editor.state.doc.descendants((node) => {
        if (node.isBlock && node.attrs.id) {
          previousNodesById.value.set(node.attrs.id, node.toJSON());
        }
      });
    },
    onUpdate: ({ editor, transaction }) => {
      if (isUpdatingFromRemote.value || !transaction.docChanged) {
        return;
      }

      // 타이핑 중인 라인에 락 유지
      const { from } = editor.state.selection;
      const resolvedPos = editor.state.doc.resolve(from);
      let currentLineId = null;
      
      for (let i = resolvedPos.depth; i > 0; i--) {
        const node = resolvedPos.node(i);
        if (node.isBlock && node.attrs.id) {
          currentLineId = node.attrs.id;
          break;
        }
      }
      
      // 현재 라인에 락이 없다면 락 설정
      if (currentLineId && currentUserLockedLineId.value !== currentLineId) {
        switchLineLock(currentLineId);
      }

      // 1. 현재 상태 수집
      const currentNodes = [];
      const currentNodesById = new Map();
      editor.state.doc.descendants((node) => {
        if (node.isBlock && node.attrs.id) {
          const nodeJSON = node.toJSON();
          currentNodes.push(nodeJSON);
          currentNodesById.set(node.attrs.id, nodeJSON);
        }
      });
      
      // 변경사항 수집
      const updates = [];
      const deletes = [];
      const creates = [];
      
      // 2. "수정"된 라인 찾기
      for (const [id, nodeJSON] of previousNodesById.value.entries()) {
        const currentNode = currentNodesById.get(id);
        if (currentNode) {
          // content, type, attrs 모두 비교 (포맷팅 변경 감지)
          const contentChanged = JSON.stringify(currentNode.content) !== JSON.stringify(nodeJSON.content);
          const typeChanged = currentNode.type !== nodeJSON.type;
          const attrsChanged = JSON.stringify(currentNode.attrs) !== JSON.stringify(nodeJSON.attrs);
          
          if (contentChanged || typeChanged || attrsChanged) {
            updates.push(id);
          }
        }
      }

      // 3. "삭제"된 라인 찾기
      const previousIds = Array.from(previousNodesById.value.keys());
      for (let i = 0; i < previousIds.length; i++) {
        const oldId = previousIds[i];
        if (!currentNodesById.has(oldId)) {
          // 아직 존재하는 이전 라인 찾기
          let prevLineId = null;
          for (let j = i - 1; j >= 0; j--) {
            if (currentNodesById.has(previousIds[j])) {
              prevLineId = previousIds[j];
              break;
            }
          }
          deletes.push({ lineId: oldId, prevLineId });
        }
      }

      // 4. "생성"된 라인 찾기
      for (let i = 0; i < currentNodes.length; i++) {
        const currentNode = currentNodes[i];
        const id = currentNode.attrs.id;

        if (!previousNodesById.value.has(id)) {
          const prevLineId = i > 0 ? currentNodes[i-1].attrs.id : null;
          creates.push({ lineId: id, prevLineId });
        }
      }

      // 5. 변경사항 전송 (디바운싱 적용)
      nextTick(() => {
        // UPDATE 전송 - 디바운싱 적용
        if (updates.length > 0) {
          // 대기 중인 업데이트에 추가
          updates.forEach(id => pendingUpdates.add(id));
          
          // 디바운싱된 업데이트 호출
          if (debouncedUpdate) {
            debouncedUpdate(Array.from(pendingUpdates));
          }
        }

        // DELETE 전송
        if (deletes.length > 0) {
          if (deletes.length === 1) {
            const { lineId, prevLineId } = deletes[0];
            console.log(`❌ DELETE: ${lineId}`);
            sendStompMessage({
              destination: '/publish/document/delete',
              body: {
                messageType: 'DELETE',
                documentId: props.documentSeq.toString(),
                senderId: user.name,
                lineId,
                prevLineId,
              },
            });
          } else {
            console.log(`📦 BATCH_DELETE: ${deletes.length}개`);
            sendStompMessage({
              destination: '/publish/document/batch-delete',
              body: {
                messageType: 'BATCH_DELETE',
                documentId: props.documentSeq.toString(),
                senderId: user.name,
                changes: deletes,
              },
            });
          }
        }

        // CREATE 전송
        if (creates.length > 0) {
          if (creates.length === 1) {
            const { lineId, prevLineId } = creates[0];
            const element = document.querySelector(`[data-id="${lineId}"]`);
            if (element) {
              const cleanedHtml = element.outerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, '');
              console.log(`✅ CREATE: ${lineId}`);
              sendStompMessage({
                destination: '/publish/document/create',
                body: {
                  messageType: 'CREATE',
                  documentId: props.documentSeq.toString(),
                  senderId: user.name,
                  lineId,
                  prevLineId,
                  content: cleanedHtml,
                },
              });
            }
          } else {
            const changes = creates.map(({ lineId, prevLineId }) => {
              const element = document.querySelector(`[data-id="${lineId}"]`);
              return element ? {
                lineId,
                prevLineId,
                content: element.outerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, ''),
              } : null;
            }).filter(c => c);

            console.log(`📦 BATCH_CREATE: ${changes.length}개`);
            sendStompMessage({
              destination: '/publish/document/batch-create',
              body: {
                messageType: 'BATCH_CREATE',
                documentId: props.documentSeq.toString(),
                senderId: user.name,
                changes,
              },
            });
          }
        }
      });

      // 6. 현재 상태를 "이전 상태"로 갱신
      previousNodesById.value = currentNodesById;
    },
    onSelectionUpdate: ({ editor }) => {
      if (isUpdatingFromRemote.value || connectionStatus.value !== 'connected') return;
      
      const now = Date.now();
      if (now - lastCursorUpdate.value < 100) return; // 100ms throttle
      lastCursorUpdate.value = now;

      // 1. 현재 커서 위치의 lineId와 offset 계산
      const { from } = editor.state.selection;
      const resolvedPos = editor.state.doc.resolve(from);
      let cursorLineId = null;
      let cursorOffset = 0;

      for (let i = resolvedPos.depth; i > 0; i--) {
        const node = resolvedPos.node(i);
        if (node.isBlock && node.attrs.id) {
          cursorLineId = node.attrs.id;
          const nodePos = resolvedPos.start(i);
          cursorOffset = from - nodePos;
          break;
        }
      }

      // 2. 계산된 정보로 메시지 전송
      if (cursorLineId) {
        // 드래그 중이 아닐 때만 라인 락 전환
        if (!isDragging.value) {
          switchLineLock(cursorLineId);
        }
        
        sendStompMessage({
          destination: '/publish/document/cursor',
          body: {
            messageType: 'CURSOR_UPDATE',
            documentId: props.documentSeq.toString(),
            senderId: user.name,
            content: JSON.stringify({ lineId: cursorLineId, offset: cursorOffset, user }),
          },
        });
      }
    },
  });

  connectStomp(
    Number(props.documentSeq).toString(),
    handleIncomingMessage, // 메시지 수신 콜백
    () => { // 연결 성공 콜백
      console.log('✅ STOMP 연결 성공 - DocumentId:', props.documentSeq);
      connectionStatus.value = 'connected';
      editor.value.setOptions({ editable: true });
    }
  );

    setTimeout(() => {
      if (connectionStatus.value === 'connecting') {
        connectionStatus.value = 'offline';
        editor.value.setOptions({ editable: false });
      }
    }, 5000);

    // 문서 참여
    setTimeout(() => {
      joinDocument();
    }, 1000);

    // 외부 클릭 이벤트 리스너 추가
    document.addEventListener('click', handleClickOutside);
    
    // 드래그 차단을 위한 전역 이벤트 리스너 추가
    document.addEventListener('selectstart', handleGlobalSelectStart);
    document.addEventListener('mousemove', handleGlobalMouseMove);
  });

onBeforeUnmount(() => {
  // 대기 중인 업데이트 즉시 전송
  if (pendingUpdates.size > 0 && debouncedUpdate) {
    console.log('🚀 페이지 이탈 - 대기 중인 업데이트 즉시 전송:', pendingUpdates.size);
    debouncedUpdate.flush();
  }
  
  // 문서에서 떠남
  leaveDocument();
  
  // 이벤트 리스너 제거
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('selectstart', handleGlobalSelectStart);
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  
  disconnectStomp();
  if (editor.value) {
    editor.value.destroy();
  }
});

const handleIncomingMessage = (message) => {
  console.log('📥 메시지 수신:', message);
  
  // 락 메시지는 본인 메시지라도 처리해야 함 (상태 동기화를 위해)
  if (!editor.value) {
    console.log('🚫 메시지 무시 - 에디터 없음');
    return;
  }
  
  // 락 메시지가 아닌 경우에만 본인 메시지 무시
  if (message.messageType !== 'LOCK' && message.messageType !== 'UNLOCK' && message.senderId === user.name) {
    console.log('🚫 메시지 무시 - 본인 메시지');
    return;
  }

  // 원격 업데이트 플래그 설정
  isUpdatingFromRemote.value = true;
  
  try {
    // 메시지 종류에 따라 변경사항 적용
    if (message.messageType === 'CREATE') {
      console.log('🆕 CREATE 처리:', message.lineId);
      let insertPos = 1;
      if (message.prevLineId) {
        let found = false;
        editor.value.state.doc.descendants((node, pos) => {
          if (!found && node.isBlock && node.attrs.id === message.prevLineId) {
            insertPos = pos + node.nodeSize;
            found = true;
          }
        });
        if (!found) {
          insertPos = editor.value.state.doc.content.size;
        }
      }
      editor.value.chain().insertContentAt(insertPos, message.content).run();
      
      // 이전 상태 맵 업데이트 (원격에서 생성된 것도 추가)
      nextTick(() => {
        editor.value.state.doc.descendants((node) => {
          if (node.isBlock && node.attrs.id === message.lineId) {
            previousNodesById.value.set(node.attrs.id, node.toJSON());
          }
        });
      });

    } else if (message.messageType === 'UPDATE') {
      console.log('✏️ UPDATE 처리:', message.lineId);
      let nodeToUpdate = null;
      let nodeToUpdatePos = -1;
      editor.value.state.doc.descendants((node, pos) => {
        if (node.isBlock && node.attrs.id === message.lineId) {
          nodeToUpdate = node;
          nodeToUpdatePos = pos;
        }
      });

      if (nodeToUpdate) {
        editor.value.chain()
          .deleteRange({ from: nodeToUpdatePos, to: nodeToUpdatePos + nodeToUpdate.nodeSize })
          .insertContentAt(nodeToUpdatePos, message.content)
          .run();
        
        // 이전 상태 맵 업데이트
        nextTick(() => {
          editor.value.state.doc.descendants((node) => {
            if (node.isBlock && node.attrs.id === message.lineId) {
              previousNodesById.value.set(node.attrs.id, node.toJSON());
            }
          });
        });
      }

    } else if (message.messageType === 'DELETE') {
      console.log('🗑️ DELETE 처리:', message.lineId);
      let nodeToDelete = null;
      let nodeToDeletePos = -1;
      editor.value.state.doc.descendants((node, pos) => {
        if (node.isBlock && node.attrs.id === message.lineId) {
          nodeToDelete = node;
          nodeToDeletePos = pos;
        }
      });

      if (nodeToDelete) {
        editor.value.chain()
          .deleteRange({ from: nodeToDeletePos, to: nodeToDeletePos + nodeToDelete.nodeSize })
          .run();
        
        // 이전 상태 맵에서 제거
        previousNodesById.value.delete(message.lineId);
      }

    } else if (message.messageType === 'BATCH_CREATE') {
      console.log('📦 BATCH_CREATE 처리:', message.changes?.length);
      if (message.changes) {
        message.changes.forEach(change => {
          let insertPos = 1;
          if (change.prevLineId) {
            let found = false;
            editor.value.state.doc.descendants((node, pos) => {
              if (!found && node.isBlock && node.attrs.id === change.prevLineId) {
                insertPos = pos + node.nodeSize;
                found = true;
              }
            });
            if (!found) {
              insertPos = editor.value.state.doc.content.size;
            }
          }
          editor.value.chain().insertContentAt(insertPos, change.content).run();
        });
        
        // 이전 상태 맵 업데이트
        nextTick(() => {
          message.changes.forEach(change => {
            editor.value.state.doc.descendants((node) => {
              if (node.isBlock && node.attrs.id === change.lineId) {
                previousNodesById.value.set(node.attrs.id, node.toJSON());
              }
            });
          });
        });
      }

    } else if (message.messageType === 'BATCH_UPDATE') {
      console.log('📦 BATCH_UPDATE 처리:', message.changes?.length);
      if (message.changes) {
        message.changes.forEach(change => {
          let nodeToUpdate = null;
          let nodeToUpdatePos = -1;
          editor.value.state.doc.descendants((node, pos) => {
            if (node.isBlock && node.attrs.id === change.lineId) {
              nodeToUpdate = node;
              nodeToUpdatePos = pos;
            }
          });

          if (nodeToUpdate) {
            editor.value.chain()
              .deleteRange({ from: nodeToUpdatePos, to: nodeToUpdatePos + nodeToUpdate.nodeSize })
              .insertContentAt(nodeToUpdatePos, change.content)
              .run();
          }
        });
        
        // 이전 상태 맵 업데이트
        nextTick(() => {
          message.changes.forEach(change => {
            editor.value.state.doc.descendants((node) => {
              if (node.isBlock && node.attrs.id === change.lineId) {
                previousNodesById.value.set(node.attrs.id, node.toJSON());
              }
            });
          });
        });
      }

    } else if (message.messageType === 'BATCH_DELETE') {
      console.log('📦 BATCH_DELETE 처리:', message.changes?.length);
      if (message.changes) {
        message.changes.forEach(change => {
          let nodeToDelete = null;
          let nodeToDeletePos = -1;
          editor.value.state.doc.descendants((node, pos) => {
            if (node.isBlock && node.attrs.id === change.lineId) {
              nodeToDelete = node;
              nodeToDeletePos = pos;
            }
          });

          if (nodeToDelete) {
            editor.value.chain()
              .deleteRange({ from: nodeToDeletePos, to: nodeToDeletePos + nodeToDelete.nodeSize })
              .run();
            
            // 이전 상태 맵에서 제거
            previousNodesById.value.delete(change.lineId);
          }
        });
      }

    } else if (message.messageType === 'CURSOR_UPDATE') {
      // 커서 업데이트는 원격 플래그 영향 안받음
      const cursorData = JSON.parse(message.content);
      
      let absolutePos = -1;
      editor.value.state.doc.descendants((node, pos) => {
        if (absolutePos === -1 && node.isBlock && node.attrs.id === cursorData.lineId) {
          absolutePos = pos + cursorData.offset;
        }
      });

      if (absolutePos !== -1) {
        remoteCursorsMap.value = {
          ...remoteCursorsMap.value,
          [message.senderId]: {
            user: cursorData.user,
            pos: absolutePos,
          }
        };
      }
    } else if (message.messageType === 'USER_JOIN') {
      // 사용자 참여 메시지 처리 (간단하게)
      console.log('👋 사용자 참여 메시지:', message);
      addParticipant({
        userId: message.userId,
        userName: message.userName
      });
    } else if (message.messageType === 'USER_LEAVE') {
      // 사용자 떠남 메시지 처리 (간단하게)
      console.log('👋 사용자 떠남 메시지:', message);
      removeParticipant(message.userId);
    } else if (message.messageType === 'LOCK') {
      // 라인 락 메시지 처리
      console.log('🔒 라인 락 메시지 수신:', message);
      console.log('🔒 현재 락 상태 (락 전):', Array.from(lineLocks.value.entries()));
      
      lineLocks.value.set(message.lineId, {
        userId: message.userId,
        userName: message.userName,
        timestamp: Date.now()
      });
      
      console.log('🔒 락 상태 업데이트 후:', Array.from(lineLocks.value.entries()));
      console.log('🔒 UI 업데이트 시작...');
      updateLineLockStatus();
    } else if (message.messageType === 'UNLOCK') {
      // 라인 락 해제 메시지 처리
      console.log('🔓 라인 락 해제 메시지 수신:', message);
      console.log('🔓 현재 락 상태 (해제 전):', Array.from(lineLocks.value.entries()));
      
      lineLocks.value.delete(message.lineId);
      
      console.log('🔓 락 상태 업데이트 후:', Array.from(lineLocks.value.entries()));
      console.log('🔓 UI 업데이트 시작...');
      updateLineLockStatus();
    }
  } catch (error) {
    console.error('❌ 메시지 처리 오류:', error);
  } finally {
    // 원격 업데이트 플래그 해제
    nextTick(() => {
      isUpdatingFromRemote.value = false;
      console.log('✅ 원격 메시지 처리 완료');
    });
  }
};
</script>

<style scoped>
.shared-doc-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #fafafa;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  margin-right: 8px;
}

.document-title {
  margin: 0;
  font-size: 1.2em;
  font-weight: 500;
}

.connection-status {
  display: flex;
  align-items: center;
}

.status-chip {
  font-weight: 500;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  gap: 8px;
}

.editor-toolbar .v-btn {
  min-width: 36px;
}

/* 참여자 토글 스타일 */
.participants-toggle {
  position: relative;
  margin-right: 16px;
}

.participants-btn {
  background-color: #f5f5f5 !important;
  border-radius: 20px !important;
  padding: 0 12px !important;
  height: 32px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #333 !important;
  text-transform: none !important;
}

.participants-btn:hover {
  background-color: #e0e0e0 !important;
}

.participants-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  min-width: 280px;
  z-index: 1000;
  border-radius: 8px;
  overflow: hidden;
}

.participants-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #333;
}

.participants-list {
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.participant-item:hover {
  background-color: #f8f9fa;
}

.participant-item.is-current-user {
  background-color: #e3f2fd;
  border: 1px solid #1976d2;
}

.participant-item.is-current-user:hover {
  background-color: #bbdefb;
}

.participant-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
  flex-shrink: 0;
  background-color: #1976d2;
}

.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.participant-item.is-current-user .participant-name {
  color: #1976d2;
  font-weight: 600;
}

.participant-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.editor-container {
  flex: 1;
  position: relative;
  background-color: white;
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-y: auto;
  overflow-x: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

/* TipTap 에디터 스타일 */
:deep(.ProseMirror) {
  outline: none;
  min-height: 400px;
  padding: 24px;
  font-size: 16px;
  line-height: 1.6;
}

:deep(.ProseMirror p) {
  margin: 8px 0;
}

:deep(.ProseMirror h1),
:deep(.ProseMirror h2),
:deep(.ProseMirror h3),
:deep(.ProseMirror h4),
:deep(.ProseMirror h5),
:deep(.ProseMirror h6) {
  margin: 16px 0 8px 0;
  font-weight: bold;
}

:deep(.ProseMirror h1) { font-size: 2em; }
:deep(.ProseMirror h2) { font-size: 1.5em; }
:deep(.ProseMirror h3) { font-size: 1.17em; }
:deep(.ProseMirror h4) { font-size: 1em; }
:deep(.ProseMirror h5) { font-size: 0.83em; }
:deep(.ProseMirror h6) { font-size: 0.67em; }

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 24px;
  margin: 8px 0;
}

:deep(.ProseMirror li) {
  margin: 4px 0;
}

/* 원격 커서 스타일 */
.remote-cursor {
  position: absolute;
  pointer-events: none;
  width: 2px;
  z-index: 10;
  transform-origin: top left;
}

.cursor-flag {
  position: absolute;
  top: -1.5em;
  left: 2px;
  color: white;
  font-size: 0.75em;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  line-height: 1.2;
}

/* 라인 락 관련 스타일 - 사용자 ID별 클래스 */
:deep([class*="line-locked-by-"]) {
  position: relative !important;
  background-color: #fff3e0 !important;
  border-left: 4px solid #ff9800 !important;
  opacity: 0.7 !important;
  pointer-events: none !important;
}

/* 락된 라인의 끝부분에 "{이름}가 편집 중" 라벨 표시 */
::deep([data-locked-by])::after {
  content: attr(data-locked-by);
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background-color: #ff9800;
  border-radius: 4px;
  vertical-align: middle;
}

</style>