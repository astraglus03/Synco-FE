<template>
  <div class="personal-text-editor">
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
        <h2 class="document-title">{{ documentName || '문서 편집' }}</h2>
        <v-chip v-if="isModified" color="warning" size="small" class="ml-2">
          <v-icon start>mdi-circle</v-icon>
          저장 필요
        </v-chip>
      </div>
      
      <div class="header-actions">
        <v-btn
          color="primary"
          variant="text"
          @click="shareToProjectDrive"
          class="share-btn"
        >
          <v-icon start>mdi-share-variant</v-icon>
          공유 문서로 변환
        </v-btn>
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
      </div>
    </div>

    <!-- 프로젝트로 이동 모달 -->
    <v-dialog v-model="showShareModal" max-width="600px" max-height="90vh" @click:outside="showShareModal = false">
      <v-card class="move-to-project-modal">
        <v-card-title class="modal-header">
          <div class="header-content">
            <v-icon class="header-icon" color="primary">mdi-share-variant</v-icon>
            <h3 class="modal-title">프로젝트로 이동</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showShareModal = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="modal-body">
          <div class="move-item-info mb-4">
            <v-icon class="mr-2" color="#4caf50">mdi-file-document</v-icon>
            <span class="text-body-1 font-weight-medium">{{ documentName || '문서' }}</span>
          </div>
          
          <!-- 새 문서 이름 (선택사항) -->
          <div class="mb-4">
            <v-text-field
              v-model="newDocumentName"
              label="새 문서 이름 (선택사항)"
              placeholder="비워두면 원본 이름 사용"
              variant="outlined"
            />
          </div>
          
          <!-- 프로젝트 드라이브 선택 -->
          <div class="project-selection mb-4">
            <label class="input-label">프로젝트 드라이브</label>
            <div class="project-list">
              <!-- 프로젝트 없음 -->
              <div v-if="projectWorkspaces.length === 0" class="empty-state">
                <v-icon size="48" color="grey">mdi-folder-off</v-icon>
                <p>이동할 프로젝트 드라이브가 없습니다</p>
              </div>
              
              <!-- 프로젝트 목록 -->
              <div 
                v-for="workspace in projectWorkspaces" 
                :key="workspace.workSpaceSeq"
                class="project-item"
                :class="{ 'selected': selectedProjectDriveChannel === workspace.workSpaceSeq }"
                @click="selectedProjectDriveChannel = workspace.workSpaceSeq"
              >
                <v-icon class="project-icon" color="#4caf50">mdi-folder-account</v-icon>
                <span class="project-name">{{ workspace.name }}</span>
                <span v-if="selectedProjectDriveChannel === workspace.workSpaceSeq" class="selected-indicator">
                  <v-icon color="primary" size="16">mdi-check</v-icon>
                </span>
              </div>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions class="modal-actions">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showShareModal = false">취소</v-btn>
          <v-btn 
            color="primary" 
            @click="confirmShare"
            :disabled="!selectedProjectDriveChannel"
          >
            이동하기
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { DOMSerializer } from 'prosemirror-model';
import StarterKit from '@tiptap/starter-kit';
import { usePersonalDriveStore } from '@/store/drive/personalDriveStore';
import { personalDriveApi } from '@/api/drive/driveApi';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

// Props 정의
const props = defineProps({
  documentSeq: {
    type: [Number, String],
    required: true
  },
  driveChannelSeq: {
    type: [Number, String],
    required: true
  }
});

// Emits 정의
const emit = defineEmits(['document-shared', 'close']);

// 라우터
const router = useRouter();

// Store
const driveStore = usePersonalDriveStore();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();

// 반응형 변수
const editor = ref(null);
const editorContainerRef = ref(null);
const isLoading = ref(true);
const isModified = ref(false);
const documentContent = ref('');
const documentName = ref('');
const typingTimer = ref(null);
const previousNodesById = ref(new Map());
const changesQueue = ref([]);

// 프로젝트로 이동 상태
const showShareModal = ref(false);
const newDocumentName = ref('');
const selectedProjectDriveChannel = ref(null);

// 프로젝트 워크스페이스 목록 필터링
const projectWorkspaces = computed(() => {
  return workspaceStore.workspaces.filter(w => w.type === 'project' && w.workSpaceSeq)
})

// 툴바 상태
const selectedFormat = ref(null);
const selectedHeading = ref(null);
const selectedList = ref(null);

// 사용자 정보
const user = computed(() => {
  const userId = authStore.memberSeq || null;
  const userName = authStore.user?.name || '사용자';
  
  return {
    id: userId,
    name: userName
  };
});

// 고유 ID 생성 함수
function generateUniqueId(userId) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `line-${userId || 'user'}-${timestamp}-${randomPart}`;
}

// 고유 ID 확장 (SharedDocEditor와 동일한 구조)
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

// 뒤로가기 함수
const goBack = () => {
  if (isModified.value) {
    if (confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')) {
      // 모달을 닫도록 이벤트 emit
      emit('close');
    }
  } else {
    // 모달을 닫도록 이벤트 emit
    emit('close');
  }
};

// 문서 로딩 함수 (라인별 조회)
const loadDocument = async () => {
  try {
    isLoading.value = true;
    const driveChannelSeq = Number(props.driveChannelSeq);
    const documentSeq = Number(props.documentSeq);
    
    // 문서 이름 설정
    const docInfo = driveStore.items.find(item => item.id === documentSeq);
    if (docInfo) {
      documentName.value = docInfo.name;
    }
    
    // 라인별 조회
    const result = await personalDriveApi.getDocumentLines(driveChannelSeq, documentSeq);
    
    if (result.success && result.data) {
      const blocks = result.data;
      if (blocks && blocks.length > 0) {
        documentContent.value = convertBlocksToHTML(blocks);
      } else {
        documentContent.value = '<p></p>';
      }
    } else {
      documentContent.value = '<p></p>';
    }
  } catch (error) {
    console.error('문서 로딩 중 오류:', error);
    documentContent.value = '<p>문서를 불러오는 중 오류가 발생했습니다.</p>';
  } finally {
    isLoading.value = false;
  }
};

// 백엔드 블록 데이터를 HTML로 변환
const convertBlocksToHTML = (blocks) => {
  if (!blocks || blocks.length === 0) {
    return '<p></p>';
  }
  
  const sortedBlocks = sortBlocksByPrevId(blocks);
  
  return sortedBlocks.map(block => {
    const lineId = block.lineId || block.feId || generateUniqueId(user.value.id || user.value.name);
    const content = block.content || block.documentContent || '';
    if (content.trim()) {
      // data-id 속성을 포함한 HTML 태그 반환
      return content.includes('data-id') 
        ? content 
        : `<p data-id="${lineId}">${content}</p>`;
    }
    return `<p data-id="${lineId}"></p>`;
  }).join('');
};

// prevId 기반 정렬 함수
const sortBlocksByPrevId = (blocks) => {
  if (blocks.length <= 1) return blocks;
  
  const first = blocks.find(b => !b.prevId || b.prevId === 'NULL' || b.prevId === null);
  
  if (!first) {
    return blocks;
  }
  
  const sorted = [first];
  const used = new Set([first.lineId || first.feId]);
  
  let iteration = 0;
  while (sorted.length < blocks.length && iteration < 100) {
    iteration++;
    const lastId = sorted[sorted.length - 1].lineId || sorted[sorted.length - 1].feId;
    
    const next = blocks.find(b => {
      const prevId = b.prevId || b.parentId;
      return (prevId === lastId || prevId === `line-${lastId}`) && !used.has(b.lineId || b.feId);
    });
    
    if (!next) {
      break;
    }
    
    sorted.push(next);
    used.add(next.lineId || next.feId);
  }
  
  return sorted;
};

// 배치 변경사항 전송 함수
const sendBatchChanges = async () => {
  if (changesQueue.value.length === 0) {
    return;
  }

  const driveChannelSeq = Number(props.driveChannelSeq);
  const documentSeq = props.documentSeq.toString();

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
        await personalDriveApi.createDocumentLine(driveChannelSeq, {
          messageType: 'CREATE',
          documentId: documentSeq,
          lineId: change.lineId,
          prevLineId: change.prevLineId,
          content: change.content,
        });
      } else if (change.type === 'DELETE') {
        await personalDriveApi.deleteDocumentLine(driveChannelSeq, {
          messageType: 'DELETE',
          documentId: documentSeq,
          lineId: change.lineId,
          prevLineId: change.prevLineId,
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
        await personalDriveApi.createDocumentLines(driveChannelSeq, {
          messageType: 'BATCH_CREATE',
          documentId: documentSeq,
          changes: creates,
        });
      }
      
      if (deletes.length > 0) {
        await personalDriveApi.deleteDocumentLines(driveChannelSeq, {
          messageType: 'BATCH_DELETE',
          documentId: documentSeq,
          changes: deletes,
        });
      }
    }
  }

  // 디바운싱된 전송 (UPDATE)
  if (debouncedChanges.length > 0) {
    if (debouncedChanges.length === 1) {
      const change = debouncedChanges[0];
      await personalDriveApi.updateDocumentLine(driveChannelSeq, {
        messageType: 'UPDATE',
        documentId: documentSeq,
        lineId: change.lineId,
        content: change.content,
      });
    } else {
      const changes = debouncedChanges.map(c => ({
        lineId: c.lineId,
        content: c.content
      }));
      await personalDriveApi.updateDocumentLines(driveChannelSeq, {
        messageType: 'BATCH_UPDATE',
        documentId: documentSeq,
        changes: changes,
      });
    }
  }

  changesQueue.value = [];
  isModified.value = false;
};

// 공유 문서로 변환 (프로젝트로 이동 모달 열기)
const shareToProjectDrive = () => {
  newDocumentName.value = ''
  selectedProjectDriveChannel.value = null
  showShareModal.value = true
  
  // 워크스페이스 목록이 없으면 로드
  if (workspaceStore.workspaces.length === 0) {
    workspaceStore.loadMyWorkspaces()
  }
}

// 프로젝트로 이동
const confirmShare = async () => {
  if (!selectedProjectDriveChannel.value) return
  
  try {
    const projectWorkspace = workspaceStore.workspaces.find(
      w => w.type === 'project' && w.workSpaceSeq === selectedProjectDriveChannel.value
    )
    
    if (!projectWorkspace) {
      alert('선택한 프로젝트 드라이브를 찾을 수 없습니다.')
      return
    }
    
    const driveChannelSeq = Number(props.driveChannelSeq)
    const documentSeq = Number(props.documentSeq)
    
    // 이동할 문서 이름 저장 (성공 메시지용)
    const originalDocumentName = documentName.value
    
    const result = await personalDriveApi.movePersonalToProject(
      driveChannelSeq,
      documentSeq,
      selectedProjectDriveChannel.value,
      newDocumentName.value.trim() || null
    )
    
    if (result.success) {
      const successName = newDocumentName.value.trim() || originalDocumentName
      
      newDocumentName.value = ''
      selectedProjectDriveChannel.value = null
      showShareModal.value = false
      
      alert(`"${successName}"이(가) 프로젝트 드라이브로 이동되었습니다.`)
      
      // 모달 닫기
      emit('close')
      
      // 목록 새로고침을 위해 이벤트 emit
      emit('document-shared', result.data)
    } else {
      alert(result.error || '프로젝트로 이동 중 오류가 발생했습니다.')
    }
  } catch (error) {
    console.error('프로젝트로 이동 실패:', error)
    alert('프로젝트로 이동 중 오류가 발생했습니다.')
  }
}

// 라이프사이클
onMounted(async () => {
  await loadDocument();
  
  editor.value = new Editor({
    extensions: [
      StarterKit,
      UniqueIdExtension,
    ],
    content: documentContent.value || '<p></p>',
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
      if (!transaction.docChanged) {
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
        typingTimer.value = setTimeout(async () => {
          if (changesQueue.value.length > 0) {
            await sendBatchChanges();
          }
        }, 500);
      }

      isModified.value = true;
    },
  });
});

onBeforeUnmount(() => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value);
  }
  
  // 저장되지 않은 변경사항이 있으면 저장
  if (isModified.value && changesQueue.value.length > 0) {
    sendBatchChanges();
  }
  
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<style scoped>
.personal-text-editor {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-btn {
  margin-right: 8px;
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

.move-to-project-modal {
  display: flex;
  flex-direction: column;
}

.move-to-project-modal .modal-body {
  min-height: auto;
  max-height: 70vh;
  overflow-y: auto;
  padding: 24px;
  transition: max-height 0.3s ease;
}

.move-item-info {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 8px;
}

.project-selection {
  margin-top: 16px;
}

.input-label {
  display: block;
  font-weight: 500;
  margin-bottom: 12px;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.project-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.project-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.project-item:last-child {
  border-bottom: none;
}

.project-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

.project-item.selected {
  background: rgba(var(--v-theme-primary), 0.1);
}

.project-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.project-name {
  flex: 1;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.selected-indicator {
  margin-left: 8px;
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  margin-right: 8px;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.modal-actions {
  flex-shrink: 0;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
</style>