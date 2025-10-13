import { ref, onUnmounted } from 'vue'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import * as Y from 'yjs'
import { useDocumentStore } from '@/store/documentStore'

export function useWebSocket() {
  const documentStore = useDocumentStore()
  const client = ref(null)
  const isConnecting = ref(false)
  const connectionError = ref(null)
  const yjsUpdateCallback = ref(null) // YJS 업데이트 콜백
  
  // 하드코딩된 설정
  const WS_URL = 'http://localhost:8080/drive-service/connect'
  const MOCK_TOKEN = 'mock-jwt-token'
  const MOCK_MODE = false // 백엔드 실행으로 실제 연결 사용
  
  const connect = (documentId) => {
    if (isConnecting.value) return Promise.resolve()
    
    isConnecting.value = true
    connectionError.value = null
    
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 WebSocket 연결 시작:', WS_URL)
        
        // SockJS 연결 생성
        const socket = new SockJS(WS_URL)
        
        client.value = new Client({
          webSocketFactory: () => socket,
          connectHeaders: {
            // Authorization: `Bearer ${MOCK_TOKEN}` // 테스트용으로 토큰 검증 비활성화
          },
          debug: (str) => {
            console.log('STOMP Debug:', str)
          },
          onConnect: (frame) => {
            console.log('✅ WebSocket 연결 성공:', frame)
            documentStore.setConnectionStatus(true)
            isConnecting.value = false
            
            // 문서 구독
            subscribeToDocument(documentId)
            
            // 사용자 접속 알림
            joinDocument(documentId)
            
            resolve(frame)
          },
          onStompError: (frame) => {
            console.error('❌ STOMP 오류:', frame)
            connectionError.value = frame.headers.message || 'STOMP 연결 오류'
            documentStore.setConnectionStatus(false)
            isConnecting.value = false
            reject(new Error(frame.headers.message || 'STOMP 연결 실패'))
          },
          onWebSocketError: (error) => {
            console.error('❌ WebSocket 오류:', error)
            connectionError.value = 'WebSocket 연결 오류'
            documentStore.setConnectionStatus(false)
            isConnecting.value = false
            reject(error)
          }
        })
        
        // 연결 시작
        client.value.activate()
        
      } catch (error) {
        console.error('❌ 연결 설정 오류:', error)
        connectionError.value = error.message
        isConnecting.value = false
        reject(error)
      }
    })
  }
  
  const disconnect = () => {
    if (client.value && client.value.connected) {
      // 사용자 이탈 알림
      if (documentStore.currentDocument) {
        leaveDocument(documentStore.currentDocument.id)
      }
      
      client.value.deactivate()
    }
    
    documentStore.setConnectionStatus(false)
    documentStore.clearDocument()
  }
  
  const subscribeToDocument = (documentId) => {
    if (!client.value || !client.value.connected) return
    
    console.log('📡 문서 구독 시작:', documentId)
    
    // YJS 업데이트 구독
    client.value.subscribe(`/topic/document/${documentId}/yjs-update`, (message) => {
      try {
        const update = JSON.parse(message.body)
        console.log('📝 YJS 업데이트 수신:', update)
        
        // YJS 업데이트를 ydoc에 적용
        if (update.update && typeof update.update === 'string' && yjsUpdateCallback.value) {
          try {
            // Base64 디코딩
            const binaryString = atob(update.update)
            const updateArray = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              updateArray[i] = binaryString.charCodeAt(i)
            }
            
            // YJS 업데이트 적용
            yjsUpdateCallback.value(updateArray)
          } catch (error) {
            console.error('❌ YJS 업데이트 적용 오류:', error)
          }
        }
      } catch (error) {
        console.error('❌ YJS 업데이트 파싱 오류:', error)
      }
    })
    
    // 커서 업데이트 구독
    client.value.subscribe(`/topic/document/${documentId}/cursor`, (message) => {
      try {
        const cursorData = JSON.parse(message.body)
        console.log('👆 커서 업데이트 수신:', cursorData)
        
        // 다른 사용자의 커서만 업데이트 (자신 제외)
        if (cursorData.userId !== documentStore.currentUser.id) {
          documentStore.updateUserCursor(cursorData.userId, {
            position: cursorData.position,
            selection: cursorData.selection,
            userName: cursorData.userName,
            timestamp: Date.now()
          })
        }
      } catch (error) {
        console.error('❌ 커서 업데이트 파싱 오류:', error)
      }
    })
    
    // 온라인 사용자 목록 구독
    client.value.subscribe(`/topic/document/${documentId}/online-users`, (message) => {
      try {
        const users = JSON.parse(message.body)
        console.log('👥 온라인 사용자 목록 수신:', users)
        
        // 온라인 사용자 목록 업데이트
        documentStore.onlineUsers.clear()
        Object.entries(users).forEach(([userId, userName]) => {
          documentStore.addOnlineUser({
            id: parseInt(userId),
            name: userName,
            avatar: userName.charAt(0),
            color: generateUserColor(parseInt(userId))
          })
        })
      } catch (error) {
        console.error('❌ 온라인 사용자 목록 파싱 오류:', error)
      }
    })
    
    // 문서 동기화 응답 구독
    client.value.subscribe(`/topic/document/${documentId}/sync`, (message) => {
      try {
        const syncData = JSON.parse(message.body)
        console.log('🔄 문서 동기화 데이터 수신:', syncData)
        
        // 온라인 사용자 목록 업데이트
        if (syncData.onlineUsers) {
          documentStore.onlineUsers.clear()
          Object.entries(syncData.onlineUsers).forEach(([userId, userName]) => {
            documentStore.addOnlineUser({
              id: parseInt(userId),
              name: userName,
              avatar: userName.charAt(0),
              color: generateUserColor(parseInt(userId))
            })
          })
        }
        
        // 커서 위치들 업데이트
        if (syncData.cursors) {
          Object.entries(syncData.cursors).forEach(([userId, cursorData]) => {
            if (parseInt(userId) !== documentStore.currentUser.id) {
              documentStore.updateUserCursor(parseInt(userId), cursorData)
            }
          })
        }
      } catch (error) {
        console.error('❌ 문서 동기화 데이터 파싱 오류:', error)
      }
    })
  }
  
  const joinDocument = (documentId) => {
    if (!client.value || !client.value.connected) return
    
    const joinMessage = {
      userId: documentStore.currentUser.id,
      userName: documentStore.currentUser.name
    }
    
    client.value.publish({
      destination: `/publish/document/${documentId}/join`,
      body: JSON.stringify(joinMessage)
    })
    
    console.log('📤 문서 접속 알림 전송:', joinMessage)
  }
  
  const leaveDocument = (documentId) => {
    if (!client.value || !client.value.connected) return
    
    const leaveMessage = {
      userId: documentStore.currentUser.id,
      userName: documentStore.currentUser.name
    }
    
    client.value.publish({
      destination: `/publish/document/${documentId}/leave`,
      body: JSON.stringify(leaveMessage)
    })
    
    console.log('📤 문서 이탈 알림 전송:', leaveMessage)
  }
  
  const sendYjsUpdate = (documentId, yjsUpdate, textContent = null) => {
    if (!client.value || !client.value.connected) return
    
    const updateMessage = {
      update: yjsUpdate, // YJS 바이너리 업데이트 (Base64)
      textContent: textContent // 텍스트 내용 (DB 저장용)
    }
    
    client.value.publish({
      destination: `/publish/document/${documentId}/yjs-update`,
      body: JSON.stringify(updateMessage)
    })
    
    console.log('📤 YJS 업데이트 전송:', documentId)
  }
  
  const sendCursorUpdate = (documentId, position, selection = null) => {
    if (!client.value || !client.value.connected) return
    
    const cursorMessage = {
      userId: documentStore.currentUser.id,
      userName: documentStore.currentUser.name,
      position: position,
      selection: selection
    }
    
    client.value.publish({
      destination: `/publish/document/${documentId}/cursor`,
      body: JSON.stringify(cursorMessage)
    })
    
    console.log('📤 커서 업데이트 전송:', position)
  }
  
  const requestDocumentSync = (documentId) => {
    if (!client.value || !client.value.connected) return
    
    client.value.publish({
      destination: `/publish/document/${documentId}/sync`,
      body: JSON.stringify({})
    })
    
    console.log('📤 문서 동기화 요청 전송')
  }
  
  // 사용자별 색상 생성
  const generateUserColor = (userId) => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ]
    return colors[userId % colors.length]
  }
  
  // YJS 업데이트 콜백 설정
  const setYjsUpdateCallback = (callback) => {
    yjsUpdateCallback.value = callback
  }
  
  // 컴포넌트 언마운트 시 연결 해제
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    client,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    sendYjsUpdate,
    sendCursorUpdate,
    requestDocumentSync,
    setYjsUpdateCallback
  }
}
