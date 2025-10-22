import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let client = null;
let subscription = null;
let lockSubscription = null; // 락 구독

/**
 * STOMP 클라이언트 연결
 * @param {string} documentId - 문서 ID
 * @param {function} onMessageCallback - 메시지 수신 콜백
 * @param {function} onConnectCallback - 연결 성공 콜백
 */
export const connectStomp = (documentId, onMessageCallback, onConnectCallback) => {
  // 이미 연결되어 있으면 재연결 시도 안함
  if (client && client.active) {
    console.log('STOMP is already connected');
    return;
  }
  
  // 기존 클라이언트가 있다면 정리
  if (client) {
    try {
      client.deactivate();
    } catch (error) {
      console.warn('Error deactivating existing client:', error);
    }
  }
  
  client = new Client({
    webSocketFactory: () => {
      return new SockJS('http://localhost:8080/drive-service/connect');
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: (str) => {
      // 개발 모드에서만 디버그 로그 출력
      if (import.meta.env.DEV) {
        console.log('STOMP Debug:', str);
      }
    },
  });

  client.onConnect = (frame) => {
    console.log('✅ STOMP 연결 성공');
    
    // 기존 구독 정리
    if (subscription) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing:', error);
      }
    }
    
    if (lockSubscription) {
      try {
        lockSubscription.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing lock:', error);
      }
    }
    
    // 서버로부터 메시지를 수신하기 위해 토픽 구독
    subscription = client.subscribe(`/topic/document/${documentId}/document-update`, (message) => {
      try {
        const parsedMessage = JSON.parse(message.body);
        if (onMessageCallback) {
          onMessageCallback(parsedMessage);
        }
      } catch (error) {
        console.error('메시지 파싱 에러:', error, message.body);
      }
    });
    
    console.log(`📡 구독 완료: /topic/document/${documentId}/document-update`);
    
    // 락 메시지 구독
    lockSubscription = client.subscribe(`/topic/document/${documentId}/line-locks`, (message) => {
      try {
        const parsedMessage = JSON.parse(message.body);
        console.log('🔒 락 메시지 수신:', parsedMessage);
        if (onMessageCallback) {
          onMessageCallback(parsedMessage);
        }
      } catch (error) {
        console.error('락 메시지 파싱 에러:', error, message.body);
      }
    });
    
    console.log(`🔒 락 구독 완료: /topic/document/${documentId}/line-locks`);

    // 온라인 사용자 메시지 구독
    if (onMessageCallback) {
      const onlineUsersSubscription = client.subscribe(`/topic/document/${documentId}/online-users`, (message) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          onMessageCallback(parsedMessage);
        } catch (error) {
          console.error('온라인 사용자 메시지 파싱 에러:', error, message.body);
        }
      });
      
      console.log(`👥 온라인 사용자 구독 완료: /topic/document/${documentId}/online-users`);
    }
    
    // 연결 성공 콜백 실행
    if (onConnectCallback) {
      onConnectCallback();
    }
  };

  client.onStompError = (frame) => {
    console.error('❌ STOMP Error:', frame.headers['message']);
    console.error('Details:', frame.body);
  };
  
  client.onWebSocketError = (error) => {
    console.error('❌ WebSocket Error:', error);
  };
  
  client.onDisconnect = () => {
    console.log('🔌 STOMP 연결 해제됨');
    subscription = null;
  };

  // 클라이언트 활성화
  client.activate();
};

/**
 * 서버로 메시지 전송
 * @param {object} params - 전송 파라미터
 * @param {string} params.destination - 목적지 경로
 * @param {object} params.body - 전송할 데이터
 */
export const sendStompMessage = ({ destination, body }) => {
  if (!client) {
    console.warn('⚠️ STOMP client not initialized');
    return false;
  }
  
  if (!client.active) {
    console.warn('⚠️ STOMP is not connected. Message not sent.');
    return false;
  }
  
  try {
    client.publish({
      destination,
      body: JSON.stringify(body),
    });
    return true;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return false;
  }
};

/**
 * STOMP 연결 해제
 */
export const disconnectStomp = () => {
  if (subscription) {
    try {
      subscription.unsubscribe();
      subscription = null;
    } catch (error) {
      console.warn('Error unsubscribing:', error);
    }
  }
  
  if (lockSubscription) {
    try {
      lockSubscription.unsubscribe();
      lockSubscription = null;
    } catch (error) {
      console.warn('Error unsubscribing lock:', error);
    }
  }
  
  if (client) {
    try {
      client.deㅇactivate();
      console.log('🔌 STOMP 연결 해제 완료');
    } catch (error) {
      console.error('Error disconnecting STOMP:', error);
    }
    client = null;
  }
};

/**
 * 현재 연결 상태 확인
 * @returns {boolean} 연결 여부
 */
export const isConnected = () => {
  return client && client.active;
};
/**
 * 라인 잠금 메시지 전송
 * @param {string} documentId - 문서 ID
 * @param {string} lineId - 라인 ID
 * @param {number} userId - 사용자 ID
 * @param {string} userName - 사용자 이름
 */
export const sendLineLock = (documentId, lineId, userId, userName) => {
  return sendStompMessage({
    destination: '/publish/document/lock',
    body: {
      messageType: 'LOCK',
      documentId: documentId.toString(),
      lineId,
      userId,
      userName,
    },
  });
};

/**
 * 라인 잠금 해제 메시지 전송
 * @param {string} documentId - 문서 ID
 * @param {string} lineId - 라인 ID
 * @param {number} userId - 사용자 ID
 * @param {string} userName - 사용자 이름
 */
export const sendLineUnlock = (documentId, lineId, userId, userName) => {
  return sendStompMessage({
    destination: '/publish/document/unlock',
    body: {
      messageType: 'UNLOCK',
      documentId: documentId.toString(),
      lineId,
      userId,
      userName,
    },
  });
};

