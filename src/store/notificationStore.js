import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import sseConnection from '@/api/notification/sseApi'
import { apiGet, apiPatch, apiDelete } from '@/utils/api'
import { emitter } from '@/eventBus'
import { useWorkspaceStore } from '@/store/workspaceStore'

export const useNotificationStore = defineStore('notification', () => {
  // ===== 상태 =====
  
  // 알림 사이드바 표시 여부
  const notificationSidebarVisible = ref(false)
  
  // 현재 활성화된 필터
  const activeFilter = ref('all')
  
  // 알림 목록
  const notifications = ref([])
  
  // SSE 연결 상태
  const sseConnected = ref(false)
  
  // 현재 워크스페이스 타입 ('personal' | 'project')
  const currentWorkspaceType = ref('personal')
  
  // 현재 워크스페이스 번호 (팀 프로젝트 필터링용)
  const currentWorkspaceSeq = ref(null)
  
  // 채널별 알림 개수 (channelSeq -> count)
  // 로컬 스토리지에서 복원 (새로고침 후에도 유지)
  const loadChannelNotificationCounts = () => {
    try {
      const stored = localStorage.getItem('channelNotificationCounts')
      return stored ? JSON.parse(stored) : {}
    } catch (e) {
      console.warn('로컬 스토리지에서 채널 알림 개수 복원 실패:', e)
      return {}
    }
  }
  
  const saveChannelNotificationCounts = () => {
    try {
      localStorage.setItem('channelNotificationCounts', JSON.stringify(channelNotificationCounts.value))
    } catch (e) {
      console.warn('로컬 스토리지에 채널 알림 개수 저장 실패:', e)
    }
  }
  
  const channelNotificationCounts = ref(loadChannelNotificationCounts())
  
  // channelNotificationCounts 변경 시 자동 저장
  watch(channelNotificationCounts, () => {
    saveChannelNotificationCounts()
  }, { deep: true })

  // ===== Computed =====
  
  // 필터링된 알림 목록 (프론트엔드 필터링)
  const filteredNotifications = computed(() => {
    
    let filtered = notifications.value
    
    // alarm-chat 타입은 알림 목록에서 제외 (채널별 알림 개수로만 표시)
    filtered = filtered.filter(n => n.type !== 'alarm-chat')
    
    // 1. 워크스페이스 타입별 필터링
    if (currentWorkspaceType.value === 'project') {
      // 요구사항: 프로젝트의 '모든 알림' 탭에서는 친구 요청 포함 (개인 대시보드와 동일)
      if (activeFilter.value === 'all') {
        // 프로젝트 상관없이 전체 표시 (친구 요청 포함)
        // 필터링 없음
      } else if (activeFilter.value === 'workspace') {
        // 현재 프로젝트만 표시 (친구 요청은 workSpaceSeq가 없으면 제외됨)
        filtered = filtered.filter(n => !n.workSpaceSeq || n.workSpaceSeq === currentWorkspaceSeq.value)
      } else {
        // 기타 타입 탭: 기존 로직 유지. 필요 시 프로젝트 범위 필터는 유지 가능
        // 여기서는 별도 workspaceSeq 필터링은 하지 않음
      }
    } else {
      // 개인 워크스페이스: 프로젝트 전용 알림 제외
      // alarm-drive(공유문서/파일 공유)와 alarm-meeting(화상회의)는 프로젝트에서만 사용
      filtered = filtered.filter(n => 
        n.type !== 'alarm-drive' && n.type !== 'alarm-meeting'
      )
    }
    
    // 2. 필터 타입별 필터링
    if (activeFilter.value !== 'all' && activeFilter.value !== 'workspace') {
      // console.log('  - 🔍 타입 필터링 적용:', activeFilter.value)
      
      const filterMap = {
        'friend': 'alarm-friend',
        'task': 'alarm-task',
        'project': 'alarm-project',
        'meeting': 'alarm-meeting',
        'drive': 'alarm-drive'
      }
      const targetType = filterMap[activeFilter.value]
      // console.log('  - 목표 타입:', targetType)
      
      if (targetType) {
        filtered = filtered.filter(n => n.type === targetType)
        // console.log('  - 타입 필터링 후 개수:', filtered.length)
      }
    }
    
    // console.log('[알림 Store] 최종 필터링 결과:', filtered.length, '개')
    return filtered
  })
  
  // 특정 채널의 알림 개수 가져오기
  const getChannelNotificationCount = (channelSeq) => {
    const key = String(channelSeq)
    return channelNotificationCounts.value[key] || 0
  }
  
  // 특정 채널의 알림 개수 초기화
  const clearChannelNotificationCount = (channelSeq) => {
    const key = String(channelSeq)
    channelNotificationCounts.value[key] = 0
    saveChannelNotificationCounts()
  }
  
  // 특정 채널에 알림이 있는지 확인 (bold 처리용)
  const hasChannelNotification = (channelSeq) => {
    return getChannelNotificationCount(channelSeq) > 0
  }
  
  // 워크스페이스별 채팅 채널 알림 개수 계산
  // (채널 목록을 받아서 각 채널의 알림 개수를 합산)
  const getWorkspaceChatNotificationCount = (chatChannels) => {
    if (!chatChannels || !Array.isArray(chatChannels) || chatChannels.length === 0) {
      return 0
    }
    
    return chatChannels.reduce((total, channel) => {
      const count = getChannelNotificationCount(channel.channelSeq)
      return total + count
    }, 0)
  }
  
  // 워크스페이스에 채팅 알림이 있는지 확인
  const hasWorkspaceChatNotification = (chatChannels) => {
    return getWorkspaceChatNotificationCount(chatChannels) > 0
  }
  
  // 읽지 않은 알림 개수 (필터링된 알림 기준)
  const notificationCount = computed(() => {
    return filteredNotifications.value.filter(n => !n.read).length
  })

  // ===== Actions =====
  
  // 타입 표준화 헬퍼
  const normalizeType = (rawType) => {
    const t = String(rawType || '').toLowerCase()
    if (!t) return 'UNKNOWN'
    if (t.includes('friend')) return 'alarm-friend'
    if (t.includes('project') || t.includes('invite')) return 'alarm-project'
    if (t.includes('task') || t.includes('comment')) return 'alarm-task'
    if (t.includes('meeting')) return 'alarm-meeting'
    if (t.includes('drive')) return 'alarm-drive'
    if (t.includes('chat')) return 'alarm-chat'
    return rawType || 'UNKNOWN'
  }

  /**
   * SSE 메시지 핸들러 (단일 인스턴스)
   */
  const sseMessageHandler = (data) => {
    console.log('[알림 Store] 📬 메시지 수신:', data)
    handleNotification(data)
  }

  /**
   * SSE 연결 시작
   */
  const connectSSE = () => {
    console.log('[알림 Store] 🔌 SSE 연결 요청')

    // 이미 연결되어 있으면 무시
    if (sseConnection.isConnected()) {
      console.log('[알림 Store] ✅ 이미 연결됨')
      sseConnected.value = true
      return
    }

    // 메시지 콜백 등록 (중복 방지는 sseConnection에서 처리)
    console.log('[알림 Store] 📝 콜백 등록 중...')
    sseConnection.onMessage(sseMessageHandler)

    // SSE 연결
    console.log('[알림 Store] 📡 sseConnection.connect() 호출')
    sseConnection.connect()

    // 연결 상태 확인 (여러 번 체크)
    console.log('[알림 Store] ⏳ 연결 상태 확인 스케줄링...')
    
    // 1초 후 첫 확인
    setTimeout(() => {
      const status = sseConnection.getConnectionStatus()
      const isConnected = sseConnection.isConnected()
      console.log('[알림 Store] 📊 1초 후 연결 상태:', status, '/ isConnected:', isConnected)
      sseConnected.value = isConnected
    }, 1000)
    
    // 3초 후 재확인
    setTimeout(() => {
      const status = sseConnection.getConnectionStatus()
      const isConnected = sseConnection.isConnected()
      console.log('[알림 Store] 📊 3초 후 연결 상태:', status, '/ isConnected:', isConnected)
      sseConnected.value = isConnected
    }, 3000)
    
    // 5초 후 최종 확인
    setTimeout(() => {
      const status = sseConnection.getConnectionStatus()
      const isConnected = sseConnection.isConnected()
      console.log('[알림 Store] 📊 5초 후 연결 상태:', status, '/ isConnected:', isConnected)
      sseConnected.value = isConnected
      
      if (isConnected) {
        console.log('[알림 Store] ✅ SSE 연결 성공!')
      } else {
        console.error('[알림 Store] ❌ 5초 후에도 연결 안 됨!')
        console.error('[알림 Store] 🔍 백엔드 확인 필요:')
        console.error('[알림 Store]    1. 백엔드 서버가 실행 중인가?')
        console.error('[알림 Store]    2. /workspace-service/alarms/sse/connect 엔드포인트가 동작하는가?')
        console.error('[알림 Store]    3. 백엔드 로그에 오류가 있는가?')
        console.error('[알림 Store]    4. SseEmitter를 제대로 반환하는가?')
      }
    }, 5000)
  }

  /**
   * SSE 연결 종료
   */
  const disconnectSSE = () => {
    console.log('[알림 Store] 🔌 SSE 연결 종료 요청')

    // 콜백 제거
    sseConnection.offMessage(sseMessageHandler)

    // 연결 종료
    sseConnection.disconnect()
    sseConnected.value = false

    console.log('[알림 Store] ✅ SSE 연결 종료 완료')
  }

  /**
   * SSE 재연결 카운터 초기화
   */
  const resetSSEReconnection = () => {
    console.log('[알림 Store] 🔄 재연결 카운터 초기화')
    sseConnection.resetReconnection()
  }
  
  /**
   * 알림 처리 (SSE 메시지 → 알림 객체 변환 → 목록 추가)
   */
  const handleNotification = (data) => {
    console.log('[알림 Store] 🔔 알림 추가 시작')
    console.log('[알림 Store] 📦 데이터:', data)

    // 알림 타입 정규화
    const notificationType = normalizeType(data.alarmType || data.type || 'UNKNOWN')

    // alarm-chat 타입 특별 처리
    if (notificationType === 'alarm-chat') {
      const targetSeq = data.targetSeq || data.channelSeq || data.data?.targetSeq || data.data?.channelSeq
      const workSpaceSeq = data.workSpaceSeq || data.data?.workSpaceSeq
      
      if (targetSeq) {
        // ✅ 1:1 채팅과 프로젝트 채팅 구분
        // workSpaceSeq가 없으면 1:1 채팅, 있으면 프로젝트 채팅
        const isPersonalChat = !workSpaceSeq || workSpaceSeq === null || workSpaceSeq === undefined
        
        if (isPersonalChat) {
          // 1:1 채팅은 현재 워크스페이스 타입과 관계없이 항상 1:1 채팅으로 처리
          // (다른 워크스페이스를 선택 중이어도 1:1 채팅 알림은 처리해야 함)
          
          // 현재 선택된 채널인지 확인 (모든 워크스페이스 타입에서 체크)
          const workspaceStore = useWorkspaceStore()
          const currentSelectedChannel = workspaceStore.selectedSubChannel
          const currentMainChannel = workspaceStore.currentChannel
          
          const targetSeqStr = String(targetSeq)
          // 1:1 채팅이 선택되어 있는지 확인
          // currentMainChannel이 'chat'이고 selectedSubChannel이 channelSeq와 같으면 선택된 상태
          const isCurrentlySelected = 
            currentMainChannel === 'chat' && 
            (currentSelectedChannel === targetSeqStr || 
             currentSelectedChannel?.replace('chat_', '') === targetSeqStr)
          
          if (isCurrentlySelected) {
            // 현재 선택된 1:1 채팅 채널이면 알림을 증가시키지 않음
            console.log('[알림 Store] ⏭️ 현재 선택된 1:1 채팅 채널이므로 알림 스킵:', targetSeq, '현재 워크스페이스:', currentWorkspaceType.value)
            return
          }
          
          // ✅ 1:1 채팅 알림 처리
          // 프로젝트 채팅처럼 channelNotificationCounts에만 증가
          // (개인/프로젝트 워크스페이스 모두 동일하게 처리)
          const key = String(targetSeq)
          channelNotificationCounts.value[key] = (channelNotificationCounts.value[key] || 0) + 1
          console.log('[알림 Store] 📢 1:1 채팅 알림, 채널:', targetSeq, '개수:', channelNotificationCounts.value[key])
          
          // 마지막 메시지 업데이트
          const messageContent = data.message || data.content || data.chatMessageText || '';
          if (messageContent) {
            emitter.emit('update-direct-message-last-message', {
              channelSeq: targetSeq,
              lastMessage: messageContent
            });
          }
        } else {
          // 프로젝트 채팅 채널: channelNotificationCounts 사용
          // workSpaceSeq가 있으면 프로젝트 채팅이므로 현재 워크스페이스 타입과 관계없이 항상 처리
          // (개인 워크스페이스에 있어도 프로젝트 채팅 알림은 쌓여야 함)
          
          // 현재 선택된 채널인지 확인 (현재 워크스페이스가 프로젝트이고 해당 채널을 보고 있을 때만 스킵)
          const workspaceStore = useWorkspaceStore()
          const currentSelectedChannel = workspaceStore.selectedSubChannel
          const currentMainChannel = workspaceStore.currentChannel
          
          // 현재 선택된 채널인지 확인
          // selectedSubChannel이 'chat_${channelSeq}' 형식이거나 그냥 channelSeq 문자열일 수 있음
          const targetSeqStr = String(targetSeq)
          const isCurrentlySelected = 
            currentMainChannel === 'chat' && 
            (currentSelectedChannel === targetSeqStr || 
             currentSelectedChannel === `chat_${targetSeqStr}` ||
             currentSelectedChannel?.replace('chat_', '') === targetSeqStr)
          
          if (isCurrentlySelected) {
            // 현재 선택된 채널이면 알림을 증가시키지 않음
            console.log('[알림 Store] ⏭️ 현재 선택된 채널이므로 알림 스킵:', targetSeq)
            return
          }
          
          // 선택된 채널이 아니면 알림 개수 증가 (현재 워크스페이스 타입과 관계없이 항상 처리)
          const key = String(targetSeq)
          channelNotificationCounts.value[key] = (channelNotificationCounts.value[key] || 0) + 1
          console.log('[알림 Store] 📢 프로젝트 채팅 알림, 채널:', targetSeq, '개수:', channelNotificationCounts.value[key], '워크스페이스:', workSpaceSeq || '미지정', '현재 워크스페이스:', currentWorkspaceType.value)
        }
        
        // alarm-chat은 알림 목록에 추가하지 않음
        return
      }
    }

    // message가 없으면 알림을 추가하지 않음
    let notificationMessage = data.message
    
    // 친구 요청 알림 특별 처리
    if (data.type === 'FRIEND_REQUEST' || data.alarmType === 'alarm-friend') {
      notificationMessage = data.message || (data.sender ? `${data.sender}가 친구 요청을 보냈습니다` : null)
    }
    
    // message가 없으면 알림을 추가하지 않음
    if (!notificationMessage) {
      console.log('[알림 Store] ⏭️ message가 없어서 알림 스킵')
      return
    }

    // 알림 객체 생성
    const notification = {
      id: String(data.alarmSeq || data.id || Date.now()),
      type: notificationType,
      message: notificationMessage,
      time: '방금 전',
      read: false,
      priority: data.priority || 'normal',
      sender: data.sender,
      workSpaceSeq: data.workSpaceSeq,
      alarmSeq: data.alarmSeq,
      data: data
    }

    // 친구 요청 알림 특별 처리
    if (data.type === 'FRIEND_REQUEST' || data.alarmType === 'alarm-friend') {
      notification.user = {
        name: data.sender || '알 수 없음',
        avatar: data.sender?.charAt(0) || '?',
        status: 'online'
      }
    }

    console.log('[알림 Store] 📊 추가 전 알림 개수:', notifications.value.length)

    // 중복 방지: 같은 alarmSeq가 이미 있으면 갱신만 수행
    if (notification.alarmSeq) {
      const existingIndex = notifications.value.findIndex(n => String(n.alarmSeq) === String(notification.alarmSeq))
      if (existingIndex > -1) {
        notifications.value[existingIndex] = {
          ...notifications.value[existingIndex],
          ...notification,
          read: notifications.value[existingIndex].read && notification.read
        }
        console.log('[알림 Store] 🔁 기존 알림 갱신(alarmSeq 중복)')
      } else {
        // 알림 목록 맨 앞에 추가 (최신순)
        notifications.value.unshift(notification)
      }
    } else {
      // alarmSeq가 없으면 안전하게 추가만
      notifications.value.unshift(notification)
    }

    console.log('[알림 Store] ✅ 알림 추가 완료, 현재 개수:', notifications.value.length)
    console.log('[알림 Store] 📋 추가된 알림:', notification.message)

    // 브라우저 알림 표시
    showBrowserNotification(notification)
  }
  
  /**
   * 브라우저 알림 표시
   */
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Synco', {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }
  }
  
  /**
   * 브라우저 알림 권한 요청
   */
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      // console.log('[알림 Store] 브라우저 알림 권한:', permission)
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }
  
  /**
   * 워크스페이스 정보 설정
   */
  const setWorkspace = (type, workspaceSeq = null) => {
    currentWorkspaceType.value = type
    currentWorkspaceSeq.value = workspaceSeq
    // console.log('[알림 Store] 🔄 setWorkspace 호출:', { type, workspaceSeq })
    // console.log('[알림 Store] 🔄 설정 후 currentWorkspaceSeq:', currentWorkspaceSeq.value)
    // console.log('[알림 Store] 🔄 현재 알림 개수:', notifications.value.length)
  }
  
  /**
   * 워크스페이스 타입 설정 (하위 호환)
   */
  const setWorkspaceType = (type) => {
    currentWorkspaceType.value = type
    // console.log('[알림 Store] 워크스페이스 타입 변경:', type)
  }
  
  /**
   * 필터 변경
   */
  const setActiveFilter = (filterKey) => {
    activeFilter.value = filterKey
  }
  
  /**
   * 단건 알림 읽음 처리 (API 연동)
   */
  const markAsRead = async (notificationId) => {
    try {
      const notification = notifications.value.find(n => n.id === notificationId)
      if (!notification) {
        // console.warn('[알림 Store] 알림을 찾을 수 없습니다:', notificationId)
        return
      }

      // alarmSeq 추출
      const alarmSeq = notification.alarmSeq
      if (!alarmSeq) {
        // console.error('[알림 Store] alarmSeq가 없습니다:', notification)
        // alarmSeq가 없어도 UI 업데이트는 진행
        notification.read = true
        return
      }

      // console.log('[알림 Store] 🔄 알림 읽음 처리 시작:', alarmSeq)

      // API 호출
      await apiPatch(`/workspace-service/alarms/${alarmSeq}`)
      
      // console.log('[알림 Store] ✅ 알림 읽음 처리 완료:', alarmSeq)
      
      // 읽음 처리 후 알림 목록 다시 불러오기 (최신화)
      await fetchNotifications()
      // console.log('[알림 Store] ✅ 알림 목록 최신화 완료')
    } catch (error) {
      // console.error('[알림 Store] ❌ 알림 읽음 처리 실패:', error)
      // console.error('[알림 Store] ❌ 에러 상세:', error.response?.data || error.message)
      
      // 에러가 나도 UI는 업데이트 (낙관적 업데이트)
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      }
    }
  }
  
  /**
   * 전체 알림 읽음 처리 (API 연동)
   * 개인 페이지: 개인의 모든 알림 읽음
   * 프로젝트 페이지 - "모든 알림" 탭: 개인의 모든 알림 읽음 (개인과 동일)
   * 프로젝트 페이지 - "프로젝트" 탭: 해당 프로젝트의 모든 알림 읽음
   */
  const markAllAsRead = async () => {
    try {
      // console.log('[알림 Store] 🔄 전체 알림 읽음 처리 시작...')
      console.log('  - 워크스페이스 타입:', currentWorkspaceType.value)
      console.log('  - 워크스페이스 번호:', currentWorkspaceSeq.value)
      console.log('  - 활성 필터:', activeFilter.value)
      
      // 프로젝트 페이지의 "모든 알림" 탭은 개인 전체 읽음과 동일
      // 프로젝트 페이지의 "프로젝트" 탭만 해당 프로젝트 알림 읽음
      const isProjectWorkspaceFilter = currentWorkspaceType.value === 'project' && activeFilter.value === 'workspace'
      
      const endpoint = isProjectWorkspaceFilter
        ? '/workspace-service/alarms/project' 
        : '/workspace-service/alarms/personal'
      
      // 요청 DTO
      // 개인 또는 "모든 알림" 탭: DTO 없음 (null)
      // 프로젝트 "프로젝트" 탭: AlarmFindReqDto { workSpaceSeq }
      let requestDto = null
      
      if (isProjectWorkspaceFilter) {
        requestDto = {
          workSpaceSeq: currentWorkspaceSeq.value
        }
      }
      
      console.log('  - API 엔드포인트:', endpoint)
      console.log('  - 요청 데이터:', requestDto)
      
      // API 호출
      await apiPatch(endpoint, requestDto)
      
      // console.log('[알림 Store] ✅ 전체 알림 읽음 처리 완료')
      
      // 읽음 처리 후 알림 목록 다시 불러오기 (최신화)
      await fetchNotifications()
      // console.log('[알림 Store] ✅ 알림 목록 최신화 완료')
    } catch (error) {
      // console.error('[알림 Store] ❌ 전체 알림 읽음 처리 실패:', error)
      // console.error('[알림 Store] ❌ 에러 상세:', error.response?.data || error.message)
      
      // 에러가 나도 로컬 상태는 업데이트 (낙관적 업데이트)
    notifications.value.forEach(n => n.read = true)
    }
  }
  
  /**
   * 타입(탭)별 알림 읽음 처리 (API 연동)
   * @param {string} alarmType - 알림 타입 (alarm-friend, alarm-task, etc.)
   */
  const markFilterAsRead = async (alarmType) => {
    try {
      // console.log('[알림 Store] 🔄 타입별 알림 읽음 처리 시작')
      console.log('  - 알림 타입:', alarmType)
      console.log('  - 워크스페이스 타입:', currentWorkspaceType.value)
      console.log('  - 워크스페이스 번호:', currentWorkspaceSeq.value)
      
      // 개인/프로젝트 페이지에 따라 다른 API 엔드포인트 사용
      const endpoint = currentWorkspaceType.value === 'personal' 
        ? '/workspace-service/alarms/personal/type' 
        : '/workspace-service/alarms/project/type'
      
      // 요청 DTO (AlarmFindReqDto)
      // 개인일 때는 workSpaceSeq 필드 없음, 프로젝트일 때만 포함
      const requestDto = {
        alarmType: alarmType
      }
      
      // 프로젝트 워크스페이스일 때만 workSpaceSeq 추가
      if (currentWorkspaceType.value === 'project') {
        requestDto.workSpaceSeq = currentWorkspaceSeq.value
      }
      
      console.log('  - API 엔드포인트:', endpoint)
      console.log('  - 요청 데이터:', requestDto)
      
      // API 호출
      await apiPatch(endpoint, requestDto)
      
      // console.log('[알림 Store] ✅ 타입별 알림 읽음 처리 완료')
      
      // 읽음 처리 후 알림 목록 다시 불러오기 (최신화)
      await fetchNotifications()
      // console.log('[알림 Store] ✅ 알림 목록 최신화 완료')
    } catch (error) {
      // console.error('[알림 Store] ❌ 타입별 알림 읽음 처리 실패:', error)
      // console.error('[알림 Store] ❌ 에러 상세:', error.response?.data || error.message)
      
      // 에러가 나도 로컬 상태는 업데이트 (낙관적 업데이트)
      notifications.value
        .filter(n => n.type === alarmType)
        .forEach(n => n.read = true)
    }
  }
  
  /**
   * 단건 알림 삭제 (API 연동)
   */
  const deleteNotification = async (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (!notification) {
      return
    }

    const alarmSeq = notification.alarmSeq
    if (!alarmSeq) {
      const indexNoSeq = notifications.value.findIndex(n => n.id === notificationId)
      if (indexNoSeq > -1) notifications.value.splice(indexNoSeq, 1)
      return
    }

    // 기본 경로: DELETE /alarms/{alarmSeq}
    const tryPrimary = async () => apiDelete(`/workspace-service/alarms/${alarmSeq}`)
    // 대체 경로 1: DELETE /alarms (body 포함)
    const tryAltBodyDelete = async () => apiDelete('/workspace-service/alarms', { alarmSeq })
    // 대체 경로 2: PATCH /alarms/delete (body 포함)
    const tryAltPatchDelete = async () => apiPatch('/workspace-service/alarms/delete', { alarmSeq })

    let deleted = false
    try {
      await tryPrimary()
      deleted = true
    } catch (e1) {
      try {
        await tryAltBodyDelete()
        deleted = true
      } catch (e2) {
        try {
          await tryAltPatchDelete()
          deleted = true
        } catch (e3) {
          // 마지막 실패: 로그만 남기고 계속 진행(낙관적 UI)
          // console.error('[알림 Store] 삭제 API 모두 실패:', e1?.response?.data || e1?.message, e2?.response?.data || e2?.message, e3?.response?.data || e3?.message)
        }
      }
    }

    // 성공 여부와 상관없이 로컬에서도 즉시 제거하여 UX 보장
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index > -1) notifications.value.splice(index, 1)

    // 서버 동기화를 위해 성공했을 때만 재조회 시도 (조용히 실패 허용)
    if (deleted) {
      fetchNotifications().catch(() => {})
    }
  }
  
  /**
   * 전체 알림 삭제 (API 연동)
   * 개인 페이지: 개인의 모든 알림 삭제
   * 프로젝트 페이지 - "모든 알림" 탭: 개인의 모든 알림 삭제 (개인과 동일)
   * 프로젝트 페이지 - "프로젝트" 탭: 해당 프로젝트의 모든 알림 삭제
   */
  const clearAllNotifications = async () => {
    try {
      console.log('  - 워크스페이스 타입:', currentWorkspaceType.value)
      console.log('  - 워크스페이스 번호:', currentWorkspaceSeq.value)
      console.log('  - 활성 필터:', activeFilter.value)
      
      // 프로젝트 페이지의 "모든 알림" 탭은 개인 전체 삭제와 동일
      // 프로젝트 페이지의 "프로젝트" 탭만 해당 프로젝트 알림 삭제
      const isProjectWorkspaceFilter = currentWorkspaceType.value === 'project' && activeFilter.value === 'workspace'
      
      const endpoint = isProjectWorkspaceFilter
        ? '/workspace-service/alarms/project' 
        : '/workspace-service/alarms/personal'
      
      let requestDto = null
      if (isProjectWorkspaceFilter) {
        requestDto = { workSpaceSeq: currentWorkspaceSeq.value }
      }
      console.log('  - API 엔드포인트:', endpoint)
      console.log('  - 요청 데이터:', requestDto)

      let deleted = false
      try {
        await apiDelete(endpoint, requestDto)
        deleted = true
      } catch (e1) {
        try {
          await apiPatch(endpoint, requestDto)
          deleted = true
        } catch (e2) {
          const clearEndpoint = endpoint + '/clear'
          try {
            await apiPatch(clearEndpoint, requestDto)
            deleted = true
          } catch (e3) {
            // 마지막 실패는 무시
          }
        }
      }

      // 로컬 즉시 비우기
      notifications.value = []
      if (deleted) {
        await fetchNotifications()
      }
    } catch (error) {
      notifications.value = []
    }
  }
  
  /**
   * 타입(탭)별 알림 삭제 (API 연동)
   * @param {string} alarmType - 알림 타입 (alarm-friend, alarm-task, etc.)
   */
  const deleteFilterNotifications = async (alarmType) => {
    try {
      console.log('  - 알림 타입:', alarmType)
      console.log('  - 워크스페이스 타입:', currentWorkspaceType.value)
      console.log('  - 워크스페이스 번호:', currentWorkspaceSeq.value)
      const endpoint = currentWorkspaceType.value === 'personal' 
        ? '/workspace-service/alarms/personal/type' 
        : '/workspace-service/alarms/project/type'
      const requestDto = { alarmType }
      if (currentWorkspaceType.value === 'project') {
        requestDto.workSpaceSeq = currentWorkspaceSeq.value
      }
      console.log('  - API 엔드포인트:', endpoint)
      console.log('  - 요청 데이터:', requestDto)

      let deleted = false
      try {
        await apiDelete(endpoint, requestDto)
        deleted = true
      } catch (e1) {
        try {
          await apiPatch(endpoint, requestDto)
          deleted = true
        } catch (e2) {
          const clearEndpoint = endpoint + '/clear'
          try {
            await apiPatch(clearEndpoint, requestDto)
            deleted = true
          } catch (e3) {
            // 마지막 실패는 무시
          }
        }
      }

      // 로컬에서 해당 타입 제거
      notifications.value = notifications.value.filter(n => n.type !== alarmType)
      if (deleted) {
        await fetchNotifications()
      }
    } catch (error) {
      notifications.value = notifications.value.filter(n => n.type !== alarmType)
    }
  }

  /**
   * 알림 목록 불러오기 (서버에서 전체 조회 후 프론트엔드 필터링)
   */
  const fetchNotifications = async () => {
    try {
      // console.log('[알림 Store] 📥 알림 목록 불러오기 시작...')
      
      const response = await apiGet('/workspace-service/alarms')
      
      // console.log('[알림 Store] 🔍 서버 응답:', response)
      // console.log('[알림 Store] 🔍 응답 타입:', typeof response)
      // console.log('[알림 Store] 🔍 배열 여부:', Array.isArray(response))
      
      // 응답 데이터 추출
      let data = response
      
      // response.data가 실제 배열인 경우
      if (response && response.data && Array.isArray(response.data)) {
        data = response.data
        // console.log('[알림 Store] 📦 response.data 사용')
      }
      // response 자체가 배열인 경우
      else if (Array.isArray(response)) {
        data = response
        // console.log('[알림 Store] 📦 response 자체가 배열')
      }
      
      if (data && Array.isArray(data)) {
        // console.log('[알림 Store] 📊 받은 알림 개수:', data.length)
        
        // 서버에서 받은 알림을 최신순으로 정렬 (가장 최근 것이 먼저)
        const sortedNotifications = data.sort((a, b) => {
          const timeA = new Date(a.time || 0).getTime()
          const timeB = new Date(b.time || 0).getTime()
          return timeB - timeA // 내림차순 (최신순)
        })
        
        // 알림 변환 (AlarmResDto 기준)
        // message가 없는 알림은 제외
        notifications.value = sortedNotifications
          .filter((alarm) => {
            // 친구 요청의 경우 sender가 있으면 메시지 생성 가능
            if (alarm.alarmType === 'alarm-friend' || alarm.type === 'FRIEND_REQUEST') {
              return alarm.message || alarm.sender
            }
            // 그 외에는 message가 필수
            return alarm.message
          })
          .map((alarm, index) => {
            // 디버깅: ynRead 값 확인
            if (index === 0) {
              // console.log('[알림 Store] 🔍 첫 번째 알림 원본 데이터:', alarm)
              // console.log('[알림 Store] 🔍 ynRead 값:', alarm.ynRead)
              // console.log('[알림 Store] 🔍 read 변환 결과:', alarm.ynRead === 'Y')
            }
            
            // message 생성 (친구 요청의 경우 특별 처리)
            let message = alarm.message
            if (!message && (alarm.alarmType === 'alarm-friend' || alarm.type === 'FRIEND_REQUEST')) {
              message = alarm.sender ? `${alarm.sender}가 친구 요청을 보냈습니다` : null
            }
            
            return {
              id: String(alarm.alarmSeq || `${alarm.receiverId}_${new Date(alarm.time).getTime()}_${index}`),
              type: normalizeType(alarm.alarmType || alarm.type || 'UNKNOWN'),
              message: message,
              time: formatTime(alarm.time),
              read: alarm.ynRead === 'Y', // 읽음 여부 (Y/N)
              priority: 'normal',
              sender: alarm.sender,
              workSpaceSeq: alarm.workSpaceSeq,
              alarmSeq: alarm.alarmSeq, // 읽음 처리 API 호출을 위해 필요
              data: alarm // 원본 데이터 보관
            }
          })
        
        // console.log('[알림 Store] ✅ 알림 목록 불러오기 성공:', notifications.value.length, '개')
        // console.log('[알림 Store] 📋 변환된 알림 샘플:', notifications.value[0])
      } else {
        // console.warn('[알림 Store] ⚠️ 응답 데이터가 배열이 아닙니다:', data)
        notifications.value = []
      }
    } catch (error) {
      // console.error('[알림 Store] ❌ 알림 목록 불러오기 실패:', error)
      // console.error('[알림 Store] ❌ 에러 상세:', error.response?.data || error.message)
      // 에러가 나도 빈 배열로 초기화
    notifications.value = []
    }
  }
  
  /**
   * 시간 포맷 변환 (상대 시간)
   */
  const formatTime = (time) => {
    if (!time) return '방금 전'
    
    const now = new Date()
    const created = new Date(time)
    const diffMs = now - created
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffSec < 60) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
    return created.toLocaleDateString('ko-KR')
  }

  return {
    // State
    notificationSidebarVisible,
    activeFilter,
    notifications,
    sseConnected,
    currentWorkspaceType,
    currentWorkspaceSeq,
    channelNotificationCounts,
    
    // Getters
    notificationCount,
    filteredNotifications,
    
    // Actions
    connectSSE,
    disconnectSSE,
    resetSSEReconnection,
    handleNotification,
    requestNotificationPermission,
    setWorkspace,
    setWorkspaceType,
    setActiveFilter,
    markAsRead,
    markAllAsRead,
    markFilterAsRead,
    deleteNotification,
    clearAllNotifications,
    deleteFilterNotifications,
    fetchNotifications,
    getChannelNotificationCount,
    clearChannelNotificationCount,
    hasChannelNotification,
    getWorkspaceChatNotificationCount,
    hasWorkspaceChatNotification
  }
})