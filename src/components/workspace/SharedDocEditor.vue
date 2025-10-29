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
              :class="{ 'is-current-user': user.id && participant.userId === user.id }"
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
        <!-- 원격 선택 영역 하이라이트 -->
        <div
          v-for="highlight in remoteSelectionHighlights"
          :key="highlight.key"
          :style="highlight.style"
          class="remote-selection-highlight"
        ></div>

        <editor-content :editor="editor" />
        
        <!-- 다른 사용자들의 커서를 decorations로 렌더링 -->
        <div
          v-for="cursor in remoteCursors"
          :key="cursor.senderId"
          class="remote-cursor"
          :style="{
            top: `${cursor.coords.top}px`,
            left: `${cursor.coords.left}px`,
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
import { DOMSerializer } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import StarterKit from '@tiptap/starter-kit';
import { connectStomp, sendStompMessage, disconnectStomp } from '@/services/editorStompService';
import { documentApi } from '@/api/document/documentApi';
import { projectDriveApi } from '@/api/drive/driveApi';
import { useAuthStore } from '@/store/authStore';

// Props 정의
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
    required: true
  }
});

// Emits 정의
const emit = defineEmits(['document-line-updated', 'document-line-deleted']);

// 라우터
const router = useRouter();

// Auth Store
const authStore = useAuthStore();

// 뒤로가기 함수
const goBack = () => {
  router.go(-1);
};

// 고유 ID 생성 함수
function generateUniqueId(userId) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `line-${userId}-${timestamp}-${randomPart}`;
}

// 고유 ID 확장 (제공된 코드 방식)
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
          const duplicateIds = new Set();

          // 첫 번째 순회: 중복된 ID를 모두 찾습니다.
          newState.doc.descendants((node) => {
            if (!this.options.types.includes(node.type.name)) return;
            const id = node.attrs[this.options.attributeName];
            if (id) {
              if (seenIds.has(id)) {
                duplicateIds.add(id);
              } else {
                seenIds.add(id);
              }
            }
          });

          // 중복된 ID가 없으면, ID가 없는 노드만 처리합니다.
          if (duplicateIds.size === 0) {
            newState.doc.descendants((node, pos) => {
              if (!this.options.types.includes(node.type.name)) return;
              const id = node.attrs[this.options.attributeName];
              if (id === null || id === undefined) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  [this.options.attributeName]: generateUniqueId(user.value.id || user.value.name),
                });
                modified = true;
              }
            });
          } else {
            // 중복된 ID가 있는 경우: 문서 순서상 나중에 등장하는 노드(붙여넣기된 노드)에 새 ID를 부여
            const processedIds = new Set();
            newState.doc.descendants((node, pos) => {
              if (!this.options.types.includes(node.type.name)) return;
              
              const id = node.attrs[this.options.attributeName];
              
              if (id && duplicateIds.has(id)) {
                // 이미 처리된 ID가 아닌 경우 (첫 번째 등장은 유지, 두 번째부터 변경)
                if (!processedIds.has(id)) {
                  processedIds.add(id);
                  // 첫 번째 등장은 원본 ID 유지
                } else {
                  // 두 번째 등장부터는 새 ID 부여 (붙여넣기된 노드)
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    [this.options.attributeName]: generateUniqueId(user.value.id || user.value.name),
                  });
                  modified = true;
                }
              } else if (id === null || id === undefined) {
                // ID가 없는 노드도 처리합니다.
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  [this.options.attributeName]: generateUniqueId(user.value.id || user.value.name),
                });
                modified = true;
              }
            });
          }

          if (modified) {
            return tr;
          }
        },
      }),
    ];
  },
});

// 라인 락 Extension (제공된 코드 방식 - decorations 사용)
const LineLockingExtension = Extension.create({
  name: 'lineLocking',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('lineLocking'),
        props: {
          decorations(state) {
            const decorations = [];
            const lockedLinesValue = lockedLines.value; 
            if (!lockedLinesValue) return DecorationSet.empty;
            
            const currentUserId = Number(user.value.id);
            
            state.doc.descendants((node, pos) => {
              if (node && node.isBlock && node.attrs && node.attrs.id) {
                const lockInfo = lockedLinesValue.get(node.attrs.id);
                if (lockInfo) {
                  const lockUserId = Number(lockInfo.userId);
                  // 다른 사용자가 잠근 라인만 표시 (자기 자신이 잠근 라인은 표시 안함)
                  if (lockUserId !== currentUserId) {
                    decorations.push(
                      Decoration.node(pos, pos + node.nodeSize, {
                        class: 'locked-line',
                        'data-locked-by': `${lockInfo.userName}가 편집 중`,
                      })
                    );
                  }
                }
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
          handleDOMEvents: {
            mousedown: (view, event) => {
              // 원격 업데이트 중이면 허용
              if (isUpdatingFromRemote.value) {
                return false;
              }
              
              // 클릭한 실제 위치 확인
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!pos) {
                return false;
              }
              
              const resolvedPos = view.state.doc.resolve(pos.pos);
              let currentLineId = null;
              
              // 클릭한 위치의 블록 노드 찾기
              for (let i = resolvedPos.depth; i > 0; i--) {
                const node = resolvedPos.node(i);
                if (node.isBlock && node.attrs.id) {
                  currentLineId = node.attrs.id;
                  break;
                }
              }
              
              // 락 상태 확인
              if (currentLineId) {
                const lockInfo = lockedLines.value.get(currentLineId);
                if (lockInfo) {
                  const currentUserId = Number(user.value.id);
                  const lockUserId = Number(lockInfo.userId);
                  // 다른 사용자가 잠근 라인만 차단 (자기 자신이 잠근 라인은 허용)
                  if (lockUserId !== currentUserId) {
                    console.log('🚫 락된 라인 클릭 차단:', currentLineId, lockInfo);
                    event.preventDefault();
                    event.stopPropagation();
                    return true;
                  }
                }
              }
              
              // 드래그 시작 위치 저장
              dragStartPos.value = pos.pos;
              lastValidSelection.value = { from: view.state.selection.from, to: view.state.selection.to };
              
              return false;
            },
            selectstart: (view, event) => {
              // 원격 업데이트 중이면 허용
              if (isUpdatingFromRemote.value) {
                return false;
              }
              
              const { from, to } = view.state.selection;
              const lockedLinesValue = lockedLines.value;
              if (!lockedLinesValue || lockedLinesValue.size === 0) {
                return false;
              }
              
              const currentUserId = Number(user.value.id);
              let shouldBlock = false;
              
              // 현재 선택 범위 내의 모든 라인 확인
              view.state.doc.nodesBetween(from, to, (node, pos) => {
                if (node && node.isBlock && node.attrs && node.attrs.id) {
                  const lockInfo = lockedLinesValue.get(node.attrs.id);
                  if (lockInfo) {
                    const lockUserId = Number(lockInfo.userId);
                    // 다른 사용자가 잠근 라인만 차단 (자기 자신이 잠근 라인은 허용)
                    if (lockUserId !== currentUserId) {
                      shouldBlock = true;
                    }
                  }
                }
              });
              
              // 드래그 시작 위치도 확인
              if (!shouldBlock) {
                const pos = view.posAtCoords({ left: event.clientX || 0, top: event.clientY || 0 });
                if (pos) {
                  const resolvedPos = view.state.doc.resolve(pos.pos);
                  for (let i = resolvedPos.depth; i > 0; i--) {
                    const node = resolvedPos.node(i);
                    if (node.isBlock && node.attrs && node.attrs.id) {
                      const lockInfo = lockedLinesValue.get(node.attrs.id);
                      if (lockInfo) {
                        const lockUserId = Number(lockInfo.userId);
                        if (lockUserId !== currentUserId) {
                          shouldBlock = true;
                        }
                      }
                      break;
                    }
                  }
                }
              }
              
              if (shouldBlock) {
                console.log('🚫 락된 라인 드래그 선택 차단 (다른 사용자가 편집 중)');
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              
              return false;
            },
            mousemove: (view, event) => {
              // 원격 업데이트 중이면 허용
              if (isUpdatingFromRemote.value) {
                return false;
              }
              
              // 마우스가 눌린 상태에서 이동 중일 때만 확인 (드래그 중)
              if (!(event.buttons & 1)) {
                dragStartPos.value = null;
                lastValidSelection.value = null;
                return false;
              }
              
              // 드래그 시작 위치가 없으면 무시
              if (dragStartPos.value === null) {
                return false;
              }
              
              const lockedLinesValue = lockedLines.value;
              if (!lockedLinesValue || lockedLinesValue.size === 0) {
                // 락이 없으면 현재 선택을 유효한 선택으로 저장
                const { from, to } = view.state.selection;
                if (from !== to) {
                  lastValidSelection.value = { from, to };
                }
                return false;
              }
              
              const { from: currentFrom, to: currentTo } = view.state.selection;
              const currentUserId = Number(user.value.id);
              
              // 현재 선택 범위 내에 락된 라인이 포함되어 있는지 확인
              const lockedRanges = [];
              view.state.doc.nodesBetween(currentFrom, currentTo, (node, pos) => {
                if (node.isBlock && node.attrs && node.attrs.id) {
                  const lockInfo = lockedLinesValue.get(node.attrs.id);
                  if (lockInfo) {
                    const lockUserId = Number(lockInfo.userId);
                    if (lockUserId !== currentUserId) {
                      lockedRanges.push({
                        start: pos,
                        end: pos + node.nodeSize
                      });
                    }
                  }
                }
              });
              
              // 락된 라인이 선택 범위에 포함되어 있으면 선택 범위를 제한
              if (lockedRanges.length > 0) {
                const dragStart = dragStartPos.value;
                let newFrom = currentFrom;
                let newTo = currentTo;
                let needsAdjustment = false;
                
                // 드래그 방향 확인
                const isForward = dragStart < currentTo;
                
                if (isForward) {
                  // 아래로 드래그: 첫 번째 락된 라인 전까지로 제한
                  for (const range of lockedRanges) {
                    if (range.start >= dragStart && range.start < currentTo) {
                      newTo = range.start;
                      needsAdjustment = true;
                      break; // 첫 번째 락된 라인에서 멈춤
                    }
                  }
                } else {
                  // 위로 드래그: 마지막 락된 라인 후부터로 제한
                  for (let i = lockedRanges.length - 1; i >= 0; i--) {
                    const range = lockedRanges[i];
                    if (range.end <= dragStart && range.end > currentFrom) {
                      newFrom = range.end;
                      needsAdjustment = true;
                      break; // 첫 번째 락된 라인에서 멈춤
                    }
                  }
                }
                
                if (needsAdjustment && newFrom < newTo) {
                  // 선택 범위 조정
                  const tr = view.state.tr;
                  tr.setSelection(
                    view.state.selection.constructor.create(view.state.doc, newFrom, newTo)
                  );
                  view.dispatch(tr);
                  lastValidSelection.value = { from: newFrom, to: newTo };
                  return true; // 선택 확장 차단
                }
              } else {
                // 락된 라인이 포함되지 않으면 현재 선택을 유효한 선택으로 저장
                if (currentFrom !== currentTo) {
                  lastValidSelection.value = { from: currentFrom, to: currentTo };
                }
              }
              
              return false;
            },
            mouseup: (view, event) => {
              // 드래그 종료 시 상태 초기화
              dragStartPos.value = null;
              // lastValidSelection은 유지 (다음 선택에 사용할 수 있음)
              return false;
            },
            keydown: (view, event) => {
              // 원격 업데이트 중이면 허용
              if (isUpdatingFromRemote.value) {
                return false;
              }
              
              const { from, to } = view.state.selection;
              const lockedLinesValue = lockedLines.value;
              if (!lockedLinesValue || lockedLinesValue.size === 0) {
                return false;
              }
              
              const currentUserId = Number(user.value.id);
              let shouldBlock = false;
              
              // 삭제 키인 경우 선택 범위 확인
              const isDeleteKey = event.key === 'Backspace' || event.key === 'Delete' || 
                                 event.keyCode === 8 || event.keyCode === 46;
              
              // 현재 선택 범위 내의 모든 라인 확인
              view.state.doc.nodesBetween(from, to, (node, pos) => {
                if (node && node.isBlock && node.attrs && node.attrs.id) {
                  const lockInfo = lockedLinesValue.get(node.attrs.id);
                  if (lockInfo) {
                    const lockUserId = Number(lockInfo.userId);
                    // 다른 사용자가 잠근 라인만 차단 (자기 자신이 잠근 라인은 허용)
                    if (lockUserId !== currentUserId) {
                      shouldBlock = true;
                    }
                  }
                }
              });
              
              if (shouldBlock) {
                console.log('🚫 락된 라인 키 입력 차단 (다른 사용자가 편집 중)', {
                  key: event.key,
                  isDeleteKey
                });
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              
              return false;
            }
          }
        },
        filterTransaction: (transaction, state) => {
          // 원격 업데이트는 항상 허용
          if (isUpdatingFromRemote.value) {
            return true;
          }

          if (!transaction.docChanged) {
            return true;
          }

          const lockedLinesValue = lockedLines.value;
          if (!lockedLinesValue || lockedLinesValue.size === 0) {
            return true;
          }

          const currentUserId = Number(user.value.id);

          // 현재 선택 범위 확인
          let shouldBlockSelection = false;
          
          if (transaction.selection) {
            const { from, to } = transaction.selection;
            // 유효한 범위인지 확인
            if (from >= 0 && to <= state.doc.content.size && from <= to) {
              state.doc.nodesBetween(from, to, (node, pos) => {
                if (node && node.isBlock && node.attrs && node.attrs.id) {
                  const lockInfo = lockedLinesValue.get(node.attrs.id);
                  if (lockInfo) {
                    const lockUserId = Number(lockInfo.userId);
                    // 다른 사용자가 잠근 라인만 차단 (자기 자신이 잠근 라인은 허용)
                    if (lockUserId !== currentUserId) {
                      console.log('🚫 락된 라인 트랜잭션 차단 (선택):', node.attrs.id, lockInfo);
                      shouldBlockSelection = true;
                    }
                  }
                }
              });
            }
          }
          
          if (shouldBlockSelection) {
            return false;
          }

          // 변경된 노드를 확인 (이전 상태에서만 확인 - 새로 생성되는 라인은 ID가 없으므로 제외)
          const changedNodeIds = new Set();
          transaction.steps.forEach(step => {
            try {
              const stepMap = step.getMap();
              if (!stepMap) return;
              
              stepMap.forEach((oldStart, oldEnd) => {
                // 이전 문서 상태에서만 확인 (유효한 범위인지 체크)
                if (oldStart >= 0 && oldEnd <= state.doc.content.size && oldStart < oldEnd) {
                  state.doc.nodesBetween(oldStart, oldEnd, (node, pos) => {
                    if (node && node.isBlock && node.attrs && node.attrs.id) {
                      changedNodeIds.add(node.attrs.id);
                    }
                  });
                }
              });
            } catch (error) {
              // step이 맵을 가지지 않는 경우(예: 새 노드 생성) 무시
              console.debug('Step map 처리 중 오류 (정상일 수 있음):', error);
            }
          });

          // 변경된 라인이 락되어 있는지 확인
          for (const lineId of changedNodeIds) {
            const lockInfo = lockedLinesValue.get(lineId);
            if (lockInfo) {
              const lockUserId = Number(lockInfo.userId);
              // 다른 사용자가 잠근 라인만 차단 (자기 자신이 잠근 라인은 허용)
              if (lockUserId !== currentUserId) {
                console.log('🚫 락된 라인 편집 차단:', lineId, lockInfo);
                return false;
              }
            }
          }

          return true;
        }
      })
    ];
  }
});

// 반응형 변수 선언
const editor = ref(null);
const connectionStatus = ref('connecting');
const isUpdatingFromRemote = ref(false);
const editorContainerRef = ref(null);
const remoteCursorsMap = ref({});
const lastCursorUpdate = ref(0);
const previousNodesById = ref(new Map());
const changesQueue = ref([]);
const typingTimer = ref(null);
const currentSelectionIds = ref(new Set());
const lockedLines = ref(new Map()); // lineId -> {userId, userName, timestamp}
const dragStartPos = ref(null); // 드래그 시작 위치 저장
const lastValidSelection = ref(null); // 마지막 유효한 선택 위치 저장

// 참여자 관련 상태
const participants = ref([]);
const showParticipants = ref(false);

// 툴바 상태
const selectedFormat = ref(null);
const selectedHeading = ref(null);
const selectedList = ref(null);

// 문서 로딩 상태
const isLoading = ref(true);
const documentContent = ref('');

// 현재 사용자 정보
const user = computed(() => {
  const userInfo = props.currentUser || {
    id: authStore.memberSeq,
    name: authStore.user?.name || '사용자'
  };
  
  const userId = userInfo?.id || authStore.memberSeq || null;
  const userName = userInfo?.name || authStore.user?.name || '사용자';
  
  if (!userId) {
    return {
      id: null,
      name: '사용자',
      color: '#1976d2'
    };
  }
  
  // 고유 색상 생성
  const hash = String(userId).split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue = Math.abs(hash % 360);
  const color = `hsl(${hue}, 70%, 50%)`;
  
  return {
    id: userId,
    name: userName,
    color: color
  };
});

// 유틸리티 함수
const userColors = {};
const availableColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7D842', '#8A63D2', '#F29E4C'];

const getUserColor = (userId) => {
  if (!userColors[userId]) {
    userColors[userId] = availableColors[Object.keys(userColors).length % availableColors.length];
  }
  return userColors[userId];
};

const connectionStatusClass = computed(() => ({
  'status-connecting': connectionStatus.value === 'connecting',
  'status-connected': connectionStatus.value === 'connected',
  'status-offline': connectionStatus.value === 'offline',
}));

// 원격 커서 computed (제공된 코드 방식)
const remoteCursors = computed(() => {
  if (!editor.value || !editor.value.view || !editorContainerRef.value) {
    return [];
  }

  const editorDom = editor.value.view.dom;
  if (!editorDom) return [];
  
  const containerRect = editorContainerRef.value.getBoundingClientRect();
  const cursors = [];

  for (const senderId in remoteCursorsMap.value) {
    const remoteUser = remoteCursorsMap.value[senderId];
    if (!remoteUser.selections || remoteUser.selections.length === 0) continue;

    // 첫 번째 선택 영역의 시작 위치를 커서 위치로 사용
    const firstSelection = remoteUser.selections[0];

    try {
      let nodePos = -1;
      editor.value.state.doc.descendants((node, pos) => {
        if (nodePos !== -1) return false;
        if (node.isBlock && node.attrs.id === firstSelection.lineId) {
          nodePos = pos;
        }
      });
      if (nodePos === -1) continue;

      const node = editor.value.state.doc.nodeAt(nodePos);
      if (!node) continue;

      const safeOffset = Math.min(firstSelection.startOffset, node.content.size);
      const absolutePos = nodePos + 1 + safeOffset;

      const maxPos = editor.value.state.doc.content.size;
      const safePos = maxPos > 1
        ? Math.min(Math.max(absolutePos, 1), maxPos - 1)
        : 0;

      const coords = editor.value.view.coordsAtPos(safePos, -1);
      const cursorHeight = coords.bottom - coords.top;
      const relativeLeft = coords.left - containerRect.left;
      const relativeTop = coords.top - containerRect.top;

      cursors.push({
        senderId,
        user: remoteUser.user,
        coords: {
          left: relativeLeft,
          top: relativeTop,
        },
        height: cursorHeight,
      });
    } catch (error) {
      // console.warn('Invalid cursor position:', error);
    }
  }

  return cursors;
});

// 원격 선택 영역 하이라이트 (제공된 코드 방식)
const remoteSelectionHighlights = computed(() => {
  if (!editor.value || !editor.value.view || !editorContainerRef.value) {
    return [];
  }
  const containerRect = editorContainerRef.value.getBoundingClientRect();
  const highlights = [];

  for (const senderId in remoteCursorsMap.value) {
    const remoteUser = remoteCursorsMap.value[senderId];
    if (!remoteUser.selections) continue;

    const userColor = remoteUser.user.color;

    remoteUser.selections.forEach((selection, index) => {
      let nodeWithPos = null;
      editor.value.state.doc.descendants((node, pos) => {
        if (nodeWithPos) return false;
        if (node.isBlock && node.attrs.id === selection.lineId) {
          nodeWithPos = { node, pos };
        }
      });

      if (!nodeWithPos) return;

      const { node: selectedNode, pos: nodePos } = nodeWithPos;
      
      const contentStartPos = nodePos + 1;
      const contentEndPos = contentStartPos + selectedNode.content.size;

      const from = Math.max(nodePos + selection.startOffset, contentStartPos);
      const to = Math.min(nodePos + selection.endOffset, contentEndPos);

      if (from >= to) return;

      try {
        const fromDom = editor.value.view.domAtPos(from);
        const toDom = editor.value.view.domAtPos(to);
        const range = document.createRange();
        range.setStart(fromDom.node, fromDom.offset);
        range.setEnd(toDom.node, toDom.offset);

        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          highlights.push({
            key: `${senderId}-${selection.lineId}-${index}-${i}`,
            style: {
              position: 'absolute',
              left: `${rect.left - containerRect.left}px`,
              top: `${rect.top - containerRect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: userColor,
              opacity: 0.3,
              pointerEvents: 'none',
              zIndex: 5,
            }
          });
        }
      } catch (error) {
        // console.warn('Could not calculate selection highlight rects', error);
      }
    });
  }
  return highlights;
});

// 문서 로딩 함수
const loadDocument = async () => {
  try {
    isLoading.value = true;
    
    const driveChannelSeq = Number(props.driveChannelSeq);
    const documentSeq = Number(props.documentSeq);
    
    console.log('문서 로딩 시작:', { driveChannelSeq, documentSeq });

    const result = await documentApi.getDocument(driveChannelSeq, documentSeq);
    
    if (result.success) {
      console.log('문서 로딩 성공:', result.data);
      
      let blocks = [];
      if (result.data && result.data.success && Array.isArray(result.data.data)) {
        blocks = result.data.data;
      } else if (result.data && Array.isArray(result.data)) {
        blocks = result.data;
      }
      
      if (blocks.length > 0) {
        documentContent.value = convertBlocksToHTML(blocks);
      } else {
        documentContent.value = '<p></p>';
      }
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
      const participantsData = result.data.participants || [];
      
      participants.value = participantsData.map(participant => ({
        userId: participant.userId,
        userName: participant.userName,
        joinTime: Date.now()
      }));
    } else {
      participants.value = [];
    }
  } catch (error) {
    console.error('👥 참여자 목록 조회 중 오류:', error);
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
      lockedLines.value.clear();
      
      if (result.data.locks && Array.isArray(result.data.locks)) {
        result.data.locks.forEach(lock => {
          lockedLines.value.set(lock.lineId, {
            userId: lock.userId,
            userName: lock.userName,
            timestamp: lock.timestamp
          });
        });
      }
      
      console.log('🔒 초기 라인 락 상태 설정 완료');
    } else {
      lockedLines.value.clear();
    }
  } catch (error) {
    console.error('🔒 라인 락 상태 조회 중 오류:', error);
    lockedLines.value.clear();
  }
};

// 백엔드 블록 데이터를 HTML로 변환
const convertBlocksToHTML = (blocks) => {
  if (!blocks || blocks.length === 0) {
    return '<p></p>';
  }
  
  const sortedBlocks = sortBlocksByPrevId(blocks);
  
  return sortedBlocks.map(block => {
    if (block.content) {
      return block.content;
    }
    
    const lineId = block.feId || generateUniqueId(user.value.id || user.value.name);
    return `<p data-id="${lineId}"></p>`;
  }).join('');
};

// prevId 기반 정렬 함수
const sortBlocksByPrevId = (blocks) => {
  if (blocks.length <= 1) return blocks;
  
  const first = blocks.find(b => !b.parentId || b.parentId === 'NULL');
  
  if (!first) {
    return blocks;
  }
  
  const sorted = [first];
  const used = new Set([first.feId]);
  
  let iteration = 0;
  while (sorted.length < blocks.length && iteration < 100) {
    iteration++;
    const lastId = sorted[sorted.length - 1].feId;
    
    const next = blocks.find(b => {
      return b.parentId === lastId && !used.has(b.feId);
    });
    
    if (!next) {
      break;
    }
    
    sorted.push(next);
    used.add(next.feId);
  }
  
  return sorted;
};

// 참여자 관련 함수들
const addParticipant = (userInfo) => {
  const existingIndex = participants.value.findIndex(p => p.userId === userInfo.userId);
  if (existingIndex === -1) {
    participants.value.push({
      userId: userInfo.userId,
      userName: userInfo.userName,
      joinTime: Date.now()
    });
  }
};

const removeParticipant = (userId) => {
  const index = participants.value.findIndex(p => p.userId === userId);
  if (index !== -1) {
    participants.value.splice(index, 1);
  }
};

const joinDocument = () => {
  sendStompMessage({
    destination: `/publish/document/${props.documentSeq}/join`,
    body: {
      userId: user.value.id,
      userName: user.value.name
    },
  });
};

const leaveDocument = () => {
  // 현재 선택된 모든 라인 락 해제
  if (currentSelectionIds.value.size > 0) {
    const changesList = Array.from(currentSelectionIds.value).map(lineId => ({ lineId }));
    sendStompMessage({
      destination: `/publish/document/${props.documentSeq}/leave`,
      body: {
        messageType: 'USER_LEAVE',
        documentId: props.documentSeq.toString(),
        userId: user.value.id,
        userName: user.value.name,
      },
    });
  }
};

// 배치 변경사항 전송 함수
const sendBatchChanges = () => {
  if (changesQueue.value.length === 0) {
    return;
  }

  const immediateChanges = [];
  const debouncedChanges = [];

  changesQueue.value.forEach(change => {
    if (change.type === 'CREATE' || change.type === 'DELETE') {
      immediateChanges.push(change);
    } else {
      debouncedChanges.push(change);
    }
  });

  // 즉시 전송 (CREATE, DELETE)
  if (immediateChanges.length > 0) {
    if (immediateChanges.length === 1) {
      const change = immediateChanges[0];
      if (change.type === 'CREATE') {
        sendStompMessage({
          destination: '/publish/document/create',
          body: {
            messageType: 'CREATE',
            documentId: props.documentSeq.toString(),
            senderId: user.value.name,
            lineId: change.lineId,
            prevLineId: change.prevLineId,
            content: change.content,
          },
        });
      } else if (change.type === 'DELETE') {
        sendStompMessage({
          destination: '/publish/document/delete',
          body: {
            messageType: 'DELETE',
            documentId: props.documentSeq.toString(),
            senderId: user.value.name,
            lineId: change.lineId,
            prevLineId: change.prevLineId,
          },
        });
      }
    } else {
      const creates = immediateChanges.filter(c => c.type === 'CREATE').map(c => ({
        lineId: c.lineId,
        prevLineId: c.prevLineId,
        content: c.content
      }));
      const deletes = immediateChanges.filter(c => c.type === 'DELETE').map(c => ({
        lineId: c.lineId,
        prevLineId: c.prevLineId
      }));
      
      if (creates.length > 0) {
        sendStompMessage({
          destination: '/publish/document/batch-create',
          body: {
            messageType: 'BATCH_CREATE',
            documentId: props.documentSeq.toString(),
            senderId: user.value.name,
            changes: creates,
          },
        });
      }
      
      if (deletes.length > 0) {
        sendStompMessage({
          destination: '/publish/document/batch-delete',
          body: {
            messageType: 'BATCH_DELETE',
            documentId: props.documentSeq.toString(),
            senderId: user.value.name,
            changes: deletes,
          },
        });
      }
    }
  }

  // 디바운싱된 전송 (UPDATE)
  if (debouncedChanges.length > 0) {
    if (debouncedChanges.length === 1) {
      const change = debouncedChanges[0];
      sendStompMessage({
        destination: '/publish/document/update',
        body: {
          messageType: 'UPDATE',
          documentId: props.documentSeq.toString(),
          senderId: user.value.name,
          lineId: change.lineId,
          content: change.content,
        },
      });
    } else {
      const changes = debouncedChanges.map(c => ({
        lineId: c.lineId,
        content: c.content
      }));
      sendStompMessage({
        destination: '/publish/document/batch-update',
        body: {
          messageType: 'BATCH_UPDATE',
          documentId: props.documentSeq.toString(),
          senderId: user.value.name,
          changes: changes,
        },
      });
    }
  }

  changesQueue.value = [];
};

// 라이프사이클 훅
onMounted(async () => {
  console.log('SharedDocEditor 마운트됨:', {
    documentSeq: props.documentSeq,
    driveChannelSeq: props.driveChannelSeq,
    currentUser: props.currentUser
  });

  await loadDocument();
  await loadParticipants();
  await loadLineLocks();

  editor.value = new Editor({
    extensions: [
      StarterKit,
      UniqueIdExtension,
      LineLockingExtension,
    ],
    content: documentContent.value || '<p></p>',
    editorProps: {
      handleDrop: (view, event, slice, moved) => {
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!pos) return false;

        const resolvedPos = view.state.doc.resolve(pos.pos);
        let targetNode = null;
        for (let i = resolvedPos.depth; i > 0; i--) {
          const node = resolvedPos.node(i);
          if (node.isBlock && node.attrs.id) {
            targetNode = node;
            break;
          }
        }

        if (targetNode) {
          const lockInfo = lockedLines.value.get(targetNode.attrs.id);
          if (lockInfo && lockInfo.userId !== user.value.id) {
            return true; // 드롭 차단
          }
        }

        // 기존 ID를 제거하여 새 ID 할당
        const nodesWithoutIds = [];
        slice.content.forEach(node => {
          const newNodeAttrs = { ...node.attrs };
          delete newNodeAttrs.id;
          
          const newNode = node.type.create(newNodeAttrs, node.content, node.marks);
          nodesWithoutIds.push(newNode);
        });

        const fragment = view.state.schema.node("doc", null, nodesWithoutIds).content;
        const newSlice = new slice.constructor(fragment, slice.openStart, slice.openEnd);

        let tr = view.state.tr;
        if (moved) {
          tr.deleteSelection();
        }
        
        const insertPos = tr.mapping.map(pos.pos);
        tr.replace(insertPos, insertPos, newSlice);
        view.dispatch(tr.scrollIntoView());

        return true;
      }
    },
    onCreate: ({ editor }) => {
      editor.state.doc.descendants((node) => {
        if (node.isBlock && node.attrs.id) {
          previousNodesById.value.set(node.attrs.id, {
            json: node.toJSON(),
            node,
          });
        }
      });
    },
    onUpdate: ({ editor, transaction }) => {
      if (isUpdatingFromRemote.value || !transaction.docChanged) {
        return;
      }

      // 1. 현재 상태 수집
      const currentNodesById = new Map();
      editor.state.doc.descendants((node) => {
        if (node.isBlock && node.attrs.id) {
          currentNodesById.set(node.attrs.id, { 
            json: node.toJSON(), 
            node: node 
          });
        }
      });
      
      // 2. "수정"된 라인 찾아 큐에 추가
      const allChanges = [];
      for (const [id, prevNodeData] of previousNodesById.value.entries()) {
        const currentNodeData = currentNodesById.get(id);
        if (currentNodeData && JSON.stringify(currentNodeData.json) !== JSON.stringify(prevNodeData.json)) {
          const domNode = DOMSerializer.fromSchema(editor.state.schema).serializeNode(currentNodeData.node);
          const wrapper = document.createElement('div');
          wrapper.appendChild(domNode);
          const content = wrapper.innerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, '');

          allChanges.push({
            type: 'UPDATE',
            lineId: id,
            content: content,
          });
        }
      }

      // 3. "삭제"된 라인 찾아 큐에 추가
      const previousIds = Array.from(previousNodesById.value.keys());
      const deletedChanges = [];
      
      for (let i = 0; i < previousIds.length; i++) {
        const oldId = previousIds[i];
        if (!currentNodesById.has(oldId)) {
          const prevLineId = i > 0 ? previousIds[i - 1] : null;
          deletedChanges.push({
            type: 'DELETE',
            lineId: oldId,
            prevLineId: prevLineId,
          });
        }
      }
      
      allChanges.push(...deletedChanges);

      // 4. "생성"된 라인 찾아 큐에 추가
      const currentNodes = Array.from(currentNodesById.values());
      for (let i = 0; i < currentNodes.length; i++) {
        const currentNodeData = currentNodes[i];
        const id = currentNodeData.json.attrs.id;

        if (!previousNodesById.value.has(id)) {
          const prevLineId = i > 0 ? currentNodes[i-1].json.attrs.id : null;
          
          const domNode = DOMSerializer.fromSchema(editor.state.schema).serializeNode(currentNodeData.node);
          const wrapper = document.createElement('div');
          wrapper.appendChild(domNode);
          const content = wrapper.innerHTML.replace(/<br class="ProseMirror-trailingBreak">/g, '');

          allChanges.push({
            type: 'CREATE',
            lineId: id,
            prevLineId: prevLineId,
            content: content,
          });
        }
      }

      // 5. 현재 상태를 "이전 상태"로 갱신
      previousNodesById.value = currentNodesById;

      // 변경사항을 '즉시 전송'과 '지연 전송'으로 분리
      const immediateChanges = [];
      const debouncedChanges = [];

      allChanges.forEach(change => {
        if (change.type === 'CREATE' || change.type === 'DELETE') {
          immediateChanges.push(change);
        } else {
          debouncedChanges.push(change);
        }
      });

      // '생성', '삭제' 변경사항은 즉시 전송
      if (immediateChanges.length > 0) {
        changesQueue.value.push(...immediateChanges);
        sendBatchChanges();
        changesQueue.value = [];
      }

      // '수정' 변경사항은 디바운싱하여 전송
      if (debouncedChanges.length > 0) {
        debouncedChanges.forEach(change => {
          const index = changesQueue.value.findIndex(c => c.lineId === change.lineId && c.type === 'UPDATE');
          if (index !== -1) {
            changesQueue.value.splice(index, 1);
          }
          changesQueue.value.push(change);
        });

        if (typingTimer.value) {
          clearTimeout(typingTimer.value);
        }
        typingTimer.value = setTimeout(() => {
          if (changesQueue.value.length > 0) {
            sendBatchChanges();
          }
        }, 250);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (isUpdatingFromRemote.value || connectionStatus.value !== 'connected') return;

      // --- 잠금 로직 (서버 중재 모델) ---
      let { from, to } = editor.state.selection;
      const currentUserId = Number(user.value.id);
      const lockedLinesValue = lockedLines.value;
      
      // 1. 선택 범위에 락된 라인이 포함되어 있으면 선택 범위를 제한
      if (lockedLinesValue && lockedLinesValue.size > 0 && from !== to && dragStartPos.value !== null) {
        const lockedRanges = [];
        editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isBlock && node.attrs && node.attrs.id) {
            const lockInfo = lockedLinesValue.get(node.attrs.id);
            if (lockInfo) {
              const lockUserId = Number(lockInfo.userId);
              if (lockUserId !== currentUserId) {
                lockedRanges.push({
                  start: pos,
                  end: pos + node.nodeSize
                });
              }
            }
          }
        });
        
        if (lockedRanges.length > 0) {
          const dragStart = dragStartPos.value;
          let newFrom = from;
          let newTo = to;
          let needsAdjustment = false;
          
          const isForward = dragStart < to;
          
          if (isForward) {
            // 아래로 드래그: 첫 번째 락된 라인 전까지로 제한
            for (const range of lockedRanges) {
              if (range.start >= dragStart && range.start < to) {
                newTo = range.start;
                needsAdjustment = true;
                break;
              }
            }
          } else {
            // 위로 드래그: 마지막 락된 라인 후부터로 제한
            for (let i = lockedRanges.length - 1; i >= 0; i--) {
              const range = lockedRanges[i];
              if (range.end <= dragStart && range.end > from) {
                newFrom = range.end;
                needsAdjustment = true;
                break;
              }
            }
          }
          
          if (needsAdjustment && newFrom < newTo) {
            editor.commands.setTextSelection({ from: newFrom, to: newTo });
            from = newFrom;
            to = newTo;
          }
        }
      }
      
      // 2. 현재 선택된 모든 라인의 ID를 수집 (락된 라인 제외)
      const newSelectionIds = new Set();
      editor.state.doc.nodesBetween(from, to, (node) => {
        if (node.isBlock && node.attrs.id) {
          // 락 체크하여 확실히 락된 라인 제외
          if (lockedLinesValue && lockedLinesValue.size > 0) {
            const lockInfo = lockedLinesValue.get(node.attrs.id);
            if (lockInfo) {
              const lockUserId = Number(lockInfo.userId);
              if (lockUserId !== currentUserId) {
                return; // 락된 라인은 선택에서 제외
              }
            }
          }
          newSelectionIds.add(node.attrs.id);
        }
      });
      
      // 4. 이전에 선택했던 라인과 비교하여 잠금 해제/요청할 라인 식별
      const oldSelectionIds = currentSelectionIds.value;
      const linesToRelease = [...oldSelectionIds].filter(id => !newSelectionIds.has(id));
      const linesToRequest = [...newSelectionIds].filter(id => !oldSelectionIds.has(id));

      // 5. 잠금 해제 요청 전송
      if (linesToRelease.length > 0) {
        // UI 반응성을 위해 내가 잠근 라인은 로컬에서 먼저 해제
        linesToRelease.forEach(lineId => {
          const lockInfo = lockedLines.value.get(lineId);
          if (lockInfo && lockInfo.userId === user.value.id) {
            lockedLines.value.delete(lineId);
          }
        });

        linesToRelease.forEach(lineId => {
          sendStompMessage({
            destination: '/publish/document/unlock',
            body: {
              messageType: 'UNLOCK',
              documentId: props.documentSeq.toString(),
              lineId: lineId,
              userId: user.value.id,
              userName: user.value.name
            },
          });
        });
      }

      // 6. 잠금 요청 전송
      if (linesToRequest.length > 0) {
        linesToRequest.forEach(lineId => {
          sendStompMessage({
            destination: '/publish/document/lock',
            body: {
              messageType: 'LOCK',
              documentId: props.documentSeq.toString(),
              lineId: lineId,
              userId: user.value.id,
              userName: user.value.name
            },
          });
        });
      }
      
      // 7. 현재 선택 상태를 업데이트
      // 잠금 해제/요청이 있을 때만 업데이트
      if (linesToRelease.length > 0 || linesToRequest.length > 0) {
        currentSelectionIds.value = newSelectionIds;
        lockedLines.value = new Map(lockedLines.value);
        if (editor.value) {
          editor.value.view.dispatch(editor.value.state.tr);
        }
      }

      // --- 커서 위치 전송 로직 (100ms throttle) ---
      const now = Date.now();
      if (now - lastCursorUpdate.value < 100) return;
      lastCursorUpdate.value = now;

      // 현재 커서 및 선택 영역 정보 계산
      const selections = [];
      if (from !== to) { // 드래그 선택
        editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isBlock && node.attrs.id) {
            const nodeStart = pos;
            const nodeEnd = pos + node.nodeSize;
            const selectionStartInNode = Math.max(from, nodeStart);
            const selectionEndInNode = Math.min(to, nodeEnd);
            selections.push({
              lineId: node.attrs.id,
              startOffset: selectionStartInNode - nodeStart,
              endOffset: selectionEndInNode - nodeStart,
            });
          }
        });
      } else { // 단순 커서
        const resolvedPos = editor.state.doc.resolve(from);
        for (let i = resolvedPos.depth; i > 0; i--) {
          const node = resolvedPos.node(i);
          if (node.isBlock && node.attrs.id) {
            const nodePos = resolvedPos.start(i);
            const offset = from - (nodePos + 1);
            selections.push({
              lineId: node.attrs.id,
              startOffset: offset + 1,
              endOffset: offset + 1,
            });
            break;
          }
        }
      }

      // 커서 정보 메시지 전송
      if (selections.length > 0) {
        sendStompMessage({
          destination: `/publish/document/${props.documentSeq}/cursor`,
          body: {
            messageType: 'CURSOR_UPDATE',
            documentId: props.documentSeq.toString(),
            senderId: user.value.name,
            content: JSON.stringify({ selections, user: user.value }),
          },
        });
      }
    },
  });

  connectStomp(
    Number(props.documentSeq).toString(),
    handleIncomingMessage,
    () => {
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
  document.addEventListener('click', (event) => {
    if (showParticipants.value && !event.target.closest('.participants-toggle')) {
      showParticipants.value = false;
    }
  });
});

onBeforeUnmount(() => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value);
  }
  
  // 남은 변경사항 즉시 전송
  if (changesQueue.value.length > 0) {
    sendBatchChanges();
  }
  
  leaveDocument();
  disconnectStomp();
  if (editor.value) {
    editor.value.destroy();
  }
});

// 변경사항 적용 함수들
const applyCreate = (change) => {
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
  
  // 이전 상태 맵 업데이트
  nextTick(() => {
    editor.value.state.doc.descendants((node) => {
      if (node.isBlock && node.attrs.id === change.lineId) {
        previousNodesById.value.set(node.attrs.id, {
          json: node.toJSON(),
          node,
        });
      }
    });
  });
};

const applyUpdate = (change) => {
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
    
    // 이전 상태 맵 업데이트
    nextTick(() => {
      editor.value.state.doc.descendants((node) => {
        if (node.isBlock && node.attrs.id === change.lineId) {
          previousNodesById.value.set(node.attrs.id, {
            json: node.toJSON(),
            node,
          });
        }
      });
    });
  }
};

const applyDelete = (change) => {
  let nodeToDelete = null;
  let nodeToDeletePos = -1;
  
  editor.value.state.doc.descendants((node, pos) => {
    if (node.isBlock && node.attrs.id === change.lineId) {
      if (nodeToDelete === null) {
        nodeToDelete = node;
        nodeToDeletePos = pos;
      }
    }
  });

  if (nodeToDelete) {
    editor.value.chain()
      .deleteRange({ from: nodeToDeletePos, to: nodeToDeletePos + nodeToDelete.nodeSize })
      .run();
    
    // 이전 상태 맵에서 제거
    previousNodesById.value.delete(change.lineId);
  }
};

const handleIncomingMessage = (message) => {
  if (!editor.value) {
    return;
  }
  
  // 락 메시지는 본인 메시지라도 처리
  const isMyMessage = message.senderId === user.value.name || (!message.senderId && message.userId === user.value.id);
  
  // LOCK/UNLOCK 메시지는 별도 처리 (docChanged가 발생하지 않으므로)
  if (message.messageType === 'LOCK') {
    console.log('🔒 LOCK 메시지 처리:', message);
    lockedLines.value.set(message.lineId, {
      userId: message.userId,
      userName: message.userName,
      timestamp: Date.now()
    });
    lockedLines.value = new Map(lockedLines.value);
    console.log('🔒 락 상태 업데이트:', Array.from(lockedLines.value.entries()));
    
    // decorations 강제 업데이트를 위한 빈 트랜잭션
    if (editor.value) {
      const tr = editor.value.state.tr;
      tr.setMeta('addToHistory', false);
      editor.value.view.dispatch(tr);
    }
    return;
  }
  
  if (message.messageType === 'UNLOCK') {
    console.log('🔓 UNLOCK 메시지 처리:', message);
    lockedLines.value.delete(message.lineId);
    lockedLines.value = new Map(lockedLines.value);
    console.log('🔓 락 상태 업데이트:', Array.from(lockedLines.value.entries()));
    
    // decorations 강제 업데이트를 위한 빈 트랜잭션
    if (editor.value) {
      const tr = editor.value.state.tr;
      tr.setMeta('addToHistory', false);
      editor.value.view.dispatch(tr);
    }
    return;
  }
  
  if (message.messageType !== 'LOCK' && message.messageType !== 'UNLOCK' && isMyMessage) {
    return;
  }

  isUpdatingFromRemote.value = true;
  
  // 1. 커서의 "상대 위치" 저장
  const { selection } = editor.value.state;
  const resolvedPos = editor.value.state.doc.resolve(selection.from);
  let anchorNodeId = null;
  let startOffset = 0;
  
  for (let i = resolvedPos.depth; i > 0; i--) {
    const node = resolvedPos.node(i);
    if (node.isBlock && node.attrs.id) {
      anchorNodeId = node.attrs.id;
      const nodePos = resolvedPos.start(i);
      startOffset = selection.from - (nodePos + 1);
      break;
    }
  }

  try {
    // 메시지 종류에 따라 변경사항 적용
    if (message.messageType === 'CREATE') {
      applyCreate(message);
    } else if (message.messageType === 'UPDATE') {
      applyUpdate(message);
    } else if (message.messageType === 'DELETE') {
      applyDelete(message);
    } else if (message.messageType === 'BATCH_CREATE') {
      if (message.changes) {
        message.changes.forEach(change => {
          applyCreate(change);
        });
      }
    } else if (message.messageType === 'BATCH_UPDATE') {
      if (message.changes) {
        message.changes.forEach(change => {
          applyUpdate(change);
        });
      }
    } else if (message.messageType === 'BATCH_DELETE') {
      if (message.changes) {
        message.changes.forEach(change => {
          applyDelete(change);
        });
      }
    } else if (message.messageType === 'CURSOR_UPDATE') {
      const cursorData = JSON.parse(message.content);
      
      remoteCursorsMap.value = {
        ...remoteCursorsMap.value,
        [message.senderId]: {
          user: cursorData.user,
          selections: cursorData.selections,
        }
      };
    } else if (message.messageType === 'USER_JOIN') {
      addParticipant({
        userId: message.userId,
        userName: message.userName
      });
    } else if (message.messageType === 'USER_LEAVE') {
      removeParticipant(message.userId);
      
      // 떠난 사용자가 잠근 라인을 모두 해제
      let changed = false;
      for (const [lineId, lockInfo] of lockedLines.value.entries()) {
        if (lockInfo.userId === message.userId) {
          lockedLines.value.delete(lineId);
          changed = true;
        }
      }
      if (changed) {
        lockedLines.value = new Map(lockedLines.value);
        if (editor.value) {
          editor.value.view.dispatch(editor.value.state.tr);
        }
      }

      // 떠난 사용자의 커서 정보를 삭제
      if (remoteCursorsMap.value[message.userId] || remoteCursorsMap.value[message.senderId]) {
        delete remoteCursorsMap.value[message.userId];
        delete remoteCursorsMap.value[message.senderId];
        remoteCursorsMap.value = { ...remoteCursorsMap.value };
      }
    }
  } catch (error) {
    console.error('❌ 메시지 처리 오류:', error);
  } finally {
    // 원격 업데이트 플래그 해제
    setTimeout(() => {
      isUpdatingFromRemote.value = false;
    }, 50);
    
    // "상대 위치"를 기반으로 커서 위치 복원
    if (anchorNodeId && (message.messageType === 'CREATE' || message.messageType === 'UPDATE' || 
        message.messageType === 'DELETE' || message.messageType === 'BATCH_CREATE' || 
        message.messageType === 'BATCH_UPDATE' || message.messageType === 'BATCH_DELETE')) {
      let newAnchorPos = -1;
      editor.value.state.doc.descendants((node, pos) => {
        if (newAnchorPos === -1 && node.isBlock && node.attrs.id === anchorNodeId) {
          newAnchorPos = pos;
        }
      });

      if (newAnchorPos !== -1) {
        const node = editor.value.state.doc.nodeAt(newAnchorPos);
        const newAbsolutePos = newAnchorPos + 1 + startOffset;
        const finalPos = Math.max(newAnchorPos + 1, Math.min(newAbsolutePos, newAnchorPos + node.nodeSize - 1));
        editor.value.commands.setTextSelection(finalPos);
      }
    }
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
  transition: top 0.1s linear, left 0.1s linear;
}

.cursor-flag {
  position: absolute;
  top: -1.6em;
  left: -2px;
  color: white;
  font-size: 0.8em;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  line-height: 1.3;
  transition: background-color 0.3s ease;
}

.remote-selection-highlight {
  pointer-events: none;
  z-index: 5;
}

/* 라인 락 관련 스타일 */
:deep(.locked-line) {
  position: relative !important;
  background-color: #fff3e0 !important;
  border-left: 4px solid #ff9800 !important;
  opacity: 0.7 !important;
  pointer-events: none !important;
}

:deep(.locked-line)::after {
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