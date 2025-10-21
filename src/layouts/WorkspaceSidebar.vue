<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
  getChatChannels, 
  getMeetingChannels, 
  getScheduleChannels,
  changeChatChannelAuthority,
  changeScheduleChannelAuthority,
  changeMeetingChannelAuthority,
  renameChatChannel,
  renameMeetingChannel
} from '@/services/WorkspaceService'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Authority } from '@/models/workspace/WorkspaceModels'

const props = defineProps({
  collapsed: Boolean,
  workspaceType: String, // 'personal' 또는 'project'
  currentChannel: String,
  currentWorkspaceData: Object, // 프로젝트 워크스페이스 정보
  selectedSubChannel: String // 선택된 하위 채널 ID
})

const emit = defineEmits(['toggle', 'select-channel', 'select-subchannel', 'create-channel'])

// 채널 생성 모달 상태
const showCreateChannelModal = ref(false)
const newChannelName = ref('')

// 화상회의 생성 모달 상태
const showCreateMeetingModal = ref(false)
const newMeetingName = ref('')

// 팀 일정 생성 모달 상태
const showCreateScheduleModal = ref(false)
const newScheduleName = ref('')

// 채널 설정 모달 상태
const showChannelSettingsModal = ref(false)
const selectedChannel = ref(null)
const channelName = ref('')
const channelPermissions = ref({})

// 현재 선택된 채널의 멤버 목록
const channelMembers = computed(() => {
  if (!selectedChannel.value) return []
  
  let memberList = []
  
  if (selectedChannel.value.channelData) {
    // 채팅 하위 채널
    memberList = selectedChannel.value.channelData.channelMemberList || []
  } else if (selectedChannel.value.scheduleData) {
    // 일정관리 (ChannelMemberResDto 배열)
    memberList = selectedChannel.value.scheduleData || []
  } else if (selectedChannel.value.meetingData) {
    // 화상회의 (첫 번째 채널의 ChannelInfoResDto)
    memberList = selectedChannel.value.meetingData.channelMemberList || []
  }
  
  return memberList
})

// 호버 상태 관리
const hoveredChannel = ref(null)

// 스토어
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

// 실제 채널 데이터
const chatChannels = ref([])
const meetingChannels = ref([])
const scheduleChannels = ref([])
const isLoadingChannels = ref(false)

// 현재 사용자의 memberSeq를 채널 멤버 리스트에서 찾기
const getCurrentUserMemberSeq = (channelMemberList) => {
  // authStore에 memberSeq가 있으면 사용
  if (authStore.memberSeq) {
    return authStore.memberSeq
  }
  
  // 없으면 채널 멤버 리스트에서 이름으로 찾기
  if (!channelMemberList || !authStore.user?.name) {
    return null
  }
  
  const currentUser = channelMemberList.find(
    member => member.memberName === authStore.user.name
  )
  
  return currentUser?.memberSeq || null
}


// 개인 워크스페이스 채널 목록
const personalChannels = ref([
  { id: 'dashboard', name: '내 대시보드', icon: 'mdi-view-dashboard', type: 'main' },
  { id: 'friends', name: '내 친구관리', icon: 'mdi-account-group', type: 'main' },
  { id: 'drive', name: '내 드라이브', icon: 'mdi-folder-account', type: 'main' },
  { id: 'calendar', name: '내 일정관리', icon: 'mdi-calendar', type: 'main' },
  { id: 'profile', name: '마이페이지', icon: 'mdi-account-cog', type: 'main' }
])

// 프로젝트 워크스페이스 채널 목록
const projectChannels = ref([
  { id: 'dashboard', name: '프로젝트 대시보드', icon: 'mdi-view-dashboard', type: 'main' },
  { 
    id: 'chat', 
    name: '프로젝트 채팅', 
    icon: 'mdi-chat', 
    type: 'main',
    expanded: false,
    subChannels: [
      { id: 'general', name: '일반', type: 'text', unread: 3 },
      { id: 'marketing', name: '마케팅', type: 'text', unread: 0 },
      { id: 'development', name: '개발', type: 'text', unread: 1 }
    ]
  },
  { 
    id: 'schedule', 
    name: '프로젝트 일정관리', 
    icon: 'mdi-calendar-check', 
    type: 'main',
    expanded: false,
    subChannels: [
      { id: 'general-schedule', name: '일반 일정', type: 'schedule' },
      { id: 'project-schedule', name: '프로젝트 일정', type: 'schedule' },
      { id: 'meeting-schedule', name: '회의 일정', type: 'schedule' }
    ]
  },
  { id: 'drive', name: '드라이브', icon: 'mdi-folder', type: 'main' },
  { 
    id: 'meeting', 
    name: '화상회의', 
    icon: 'mdi-video', 
    type: 'main',
    expanded: false,
    subChannels: [
      { id: 'general-meeting', name: '일반 회의실', type: 'video', isActive: false },
      { id: 'project-meeting', name: '프로젝트 회의실', type: 'video', isActive: true },
      { id: 'brainstorming', name: '브레인스토밍', type: 'video', isActive: false }
    ]
  }
])

// 1:1 채팅 목록 (개인 워크스페이스일 때만)
const directMessages = ref([
  { id: 'kim_minsu', name: '김민수', status: 'online', lastMessage: '안녕하세요!', time: '5분 전', unread: 2 },
  { id: 'lee_jihyun', name: '이지현', status: 'away', lastMessage: '회의 준비됐어요', time: '12분 전', unread: 0 },
  { id: 'park_junyoung', name: '박준영', status: 'offline', lastMessage: '파일 확인했습니다', time: '1시간 전', unread: 1 },
  { id: 'choi_sujin', name: '최수진', status: 'online', lastMessage: '내일 미팅 어때요?', time: '2시간 전', unread: 3 },
  { id: 'jung_hyunwoo', name: '정현우', status: 'away', lastMessage: '코드 리뷰 완료했어요', time: '3시간 전', unread: 0 },
  { id: 'han_soyoung', name: '한소영', status: 'online', lastMessage: '프레젠테이션 자료 보냈어요', time: '4시간 전', unread: 0 },
  { id: 'yoon_donghyun', name: '윤동현', status: 'busy', lastMessage: '데이터 분석 결과 나왔어요', time: '5시간 전', unread: 2 },
  { id: 'kang_minji', name: '강민지', status: 'online', lastMessage: '고객 피드백 정리했어요', time: '6시간 전', unread: 0 },
  { id: 'oh_seungmin', name: '오승민', status: 'away', lastMessage: '시스템 점검 완료했습니다', time: '7시간 전', unread: 1 },
  { id: 'lim_jiyeon', name: '임지연', status: 'online', lastMessage: '마케팅 계획 검토해주세요', time: '8시간 전', unread: 0 },
  { id: 'shin_taewon', name: '신태원', status: 'busy', lastMessage: '새 프로젝트 제안서 작성 중', time: '9시간 전', unread: 3 },
  { id: 'kwon_hyerim', name: '권혜림', status: 'online', lastMessage: '예산안 검토 부탁드려요', time: '10시간 전', unread: 0 },
  { id: 'ryu_jongho', name: '류종호', status: 'away', lastMessage: '보고서 초안 완성했어요', time: '11시간 전', unread: 1 },
  { id: 'song_jiwon', name: '송지원', status: 'online', lastMessage: '팀 미팅 일정 조율해주세요', time: '12시간 전', unread: 0 },
  { id: 'jang_myeongsu', name: '장명수', status: 'offline', lastMessage: '기술 문서 업데이트했습니다', time: '1일 전', unread: 2 },
  { id: 'kim_yeonju', name: '김연주', status: 'online', lastMessage: '고객 상담 일정 잡았어요', time: '1일 전', unread: 0 },
  { id: 'lee_hyunseok', name: '이현석', status: 'away', lastMessage: '품질 검사 결과 양호합니다', time: '1일 전', unread: 1 },
  { id: 'park_sunhee', name: '박선희', status: 'online', lastMessage: '교육 자료 준비 완료했어요', time: '2일 전', unread: 0 },
  { id: 'choi_jihoon', name: '최지훈', status: 'busy', lastMessage: '네트워크 보안 점검 중', time: '2일 전', unread: 1 },
  { id: 'jung_sohee', name: '정소희', status: 'offline', lastMessage: '인사팀과 급여 관련 논의', time: '3일 전', unread: 0 }
])

// 현재 채널 목록 (실제 API 데이터 사용)
const currentChannels = computed(() => {
  if (props.workspaceType === 'personal') {
    return personalChannels.value
  }

  // 프로젝트 워크스페이스의 경우 실제 API 데이터 사용
  return [
    { id: 'dashboard', name: '프로젝트 대시보드', icon: 'mdi-view-dashboard', type: 'main' },
    { 
      id: 'chat', 
      name: '프로젝트 채팅', 
      icon: 'mdi-chat', 
      type: 'main',
      expanded: true,
      subChannels: chatChannels.value?.map(channel => ({
        id: `chat_${channel.channelSeq}`,
        name: channel.channelName,
        type: 'text',
        unread: 0,
        channelData: channel
      })) || []
    },
    { 
      id: 'schedule', 
      name: '프로젝트 일정관리', 
      icon: 'mdi-calendar-check', 
      type: 'main',
      scheduleData: scheduleChannels.value // 멤버 정보를 위한 데이터
    },
    { id: 'drive', name: '드라이브', icon: 'mdi-folder', type: 'main' },
    { 
      id: 'meeting', 
      name: '화상회의', 
      icon: 'mdi-video', 
      type: 'main',
      // 화상회의는 첫 번째 채널의 멤버 정보만 사용
      meetingData: meetingChannels.value?.[0]
    }
  ]
})

// 채널 생성
const createChannel = () => {
  if (!newChannelName.value.trim()) return
  
  const newChannel = {
    id: `channel_${Date.now()}`,
    name: newChannelName.value.trim(),
    type: 'text',
    unread: 0
  }
  
  // 프로젝트 채팅의 하위 채널에 추가
  const chatChannel = projectChannels.value.find(ch => ch.id === 'chat')
  if (chatChannel && chatChannel.subChannels) {
    chatChannel.subChannels.push(newChannel)
  }
  
  // 부모 컴포넌트에 알림
  emit('create-channel', newChannel)
  
  // 폼 초기화
  newChannelName.value = ''
  showCreateChannelModal.value = false
}

// 모달 닫기
const closeCreateChannelModal = () => {
  showCreateChannelModal.value = false
  newChannelName.value = ''
}

// 채널 설정 모달 열기
const openChannelSettings = (channel) => {
  selectedChannel.value = channel
  channelName.value = channel.name
  
  // 채널 타입에 따라 멤버 목록 가져오기
  let memberList = []
  
  if (channel.channelData) {
    // 채팅 하위 채널
    memberList = channel.channelData.channelMemberList || []
  } else if (channel.scheduleData) {
    // 일정관리 (ChannelMemberResDto 배열)
    memberList = channel.scheduleData || []
  } else if (channel.meetingData) {
    // 화상회의 (첫 번째 채널의 ChannelInfoResDto)
    memberList = channel.meetingData.channelMemberList || []
  }
  
  // 권한 정보를 객체로 변환
  channelPermissions.value = {}
  memberList.forEach(member => {
    channelPermissions.value[member.memberSeq] = member.authority
  })
  
  showChannelSettingsModal.value = true
}

// 채널 설정 모달 닫기
const closeChannelSettings = () => {
  showChannelSettingsModal.value = false
  selectedChannel.value = null
  channelName.value = ''
  channelPermissions.value = {}
}

// 현재 사용자가 SUPER 권한을 가지고 있는지 확인
const isCurrentUserSuper = computed(() => {
  const currentMemberSeq = getCurrentUserMemberSeq(channelMembers.value)
  if (!currentMemberSeq) return false
  
  return channelPermissions.value[currentMemberSeq] === 'SUPER'
})

// 권한 업데이트
const updateChannelPermission = async (memberSeq, newPermission) => {
  const currentMemberSeq = getCurrentUserMemberSeq(channelMembers.value)
  const currentPermission = channelPermissions.value[memberSeq]
  
  // SUPER 권한자만 권한 변경 가능
  if (!isCurrentUserSuper.value) {
    alert('권한 변경은 SUPER 권한을 가진 사용자만 가능합니다.')
    return
  }
  
  // 자기 자신의 SUPER 권한은 변경 불가
  if (memberSeq == currentMemberSeq && currentPermission === 'SUPER') {
    alert('SUPER 권한을 가진 사용자는 자신의 권한을 변경할 수 없습니다.')
    return
  }
  
  // SUPER 권한으로 변경 시도 차단
  if (newPermission === 'SUPER' && currentPermission !== 'SUPER') {
    alert('채널에서는 SUPER 권한을 위임할 수 없습니다.')
    return
  }
  
  try {
    const workSpaceSeq = props.currentWorkspaceData.workSpaceSeq
    
    // 채널 타입에 따라 적절한 API 호출
    if (selectedChannel.value.channelData) {
      // 채팅 하위 채널
      const channelSeq = selectedChannel.value.channelData.channelSeq
      await changeChatChannelAuthority(workSpaceSeq, memberSeq, channelSeq, newPermission)
    } else if (selectedChannel.value.scheduleData) {
      // 일정관리
      await changeScheduleChannelAuthority(workSpaceSeq, memberSeq, newPermission)
    } else if (selectedChannel.value.meetingData) {
      // 화상회의
      await changeMeetingChannelAuthority(workSpaceSeq, memberSeq, newPermission)
    }
    
    // 권한 변경 성공 시 로컬 상태 업데이트
    channelPermissions.value[memberSeq] = newPermission
    
    // 채널 데이터 새로고침
    await loadChannels()
    
    // 모달의 멤버 리스트도 다시 로드
    const channel = selectedChannel.value
    if (channel.channelData) {
      // 채팅: chatChannels에서 찾기
      const updatedChannel = chatChannels.value.find(c => c.channelSeq === channel.channelData.channelSeq)
      if (updatedChannel) {
        selectedChannel.value.channelData = updatedChannel
      }
    } else if (channel.scheduleData) {
      // 일정관리: scheduleChannels 업데이트
      selectedChannel.value.scheduleData = scheduleChannels.value
    } else if (channel.meetingData) {
      // 화상회의: meetingChannels에서 첫 번째 채널 찾기
      if (meetingChannels.value.length > 0) {
        selectedChannel.value.meetingData = meetingChannels.value[0]
      }
    }
    
    // 권한 정보 다시 설정
    const memberList = channelMembers.value
    channelPermissions.value = {}
    memberList.forEach(member => {
      channelPermissions.value[member.memberSeq] = member.authority
    })
  } catch (error) {
    console.error('권한 변경 실패:', error)
    alert('권한 변경에 실패했습니다.')
  }
}

// 채널 설정 저장
const saveChannelSettings = async () => {
  try {
    // 채널 이름이 변경되었는지 확인
    const originalName = selectedChannel.value.name
    const hasNameChanged = channelName.value !== originalName
    
    if (hasNameChanged) {
      // 채팅 채널만 이름 변경 가능
      if (selectedChannel.value.channelData) {
        // 채팅 하위 채널
        const channelSeq = selectedChannel.value.channelData.channelSeq
        await renameChatChannel(channelSeq, channelName.value)
        
        // 채널 데이터 새로고침
        await loadChannels()
        
        // 사이드바에 표시된 이름도 즉시 업데이트
        selectedChannel.value.name = channelName.value
      } else if (selectedChannel.value.meetingData) {
        // 화상회의는 이름 변경 불가
        alert('화상회의는 채널 이름을 변경할 수 없습니다.')
        return
      } else if (selectedChannel.value.scheduleData) {
        // 일정관리는 이름 변경 불가
        alert('일정관리는 채널 이름을 변경할 수 없습니다.')
        return
      }
    }
    
    closeChannelSettings()
  } catch (error) {
    console.error('채널 설정 저장 실패:', error)
    alert('채널 설정 저장에 실패했습니다.')
  }
}

// 채널 데이터 로드
const loadChannels = async () => {
  if (props.workspaceType !== 'project' || !props.currentWorkspaceData?.workSpaceSeq) {
    return
  }

  try {
    isLoadingChannels.value = true
    const workSpaceSeq = props.currentWorkspaceData.workSpaceSeq

    // 병렬로 모든 채널 데이터 로드
    const [chatData, meetingData, scheduleData] = await Promise.all([
      getChatChannels(workSpaceSeq),
      getMeetingChannels(workSpaceSeq),
      getScheduleChannels(workSpaceSeq)
    ])

    // 채널 데이터 업데이트
    chatChannels.value = chatData
    meetingChannels.value = meetingData
    scheduleChannels.value = scheduleData

  } catch (error) {
    console.error('채널 데이터 로딩 실패:', error)
  } finally {
    isLoadingChannels.value = false
  }
}

// 사용자 권한 확인 (워크스페이스 SUPER 또는 채널 권한)
const hasChannelPermission = (channelData) => {
  if (!channelData) {
    return false
  }
  
  // 현재 사용자의 memberSeq 가져오기 (채널 멤버 리스트에서 이름으로 찾기)
  const currentMemberSeq = getCurrentUserMemberSeq(channelData.channelMemberList)
  
  if (!currentMemberSeq) {
    return false
  }
  
  // 채널 멤버 권한 확인 (타입 불일치 대비 == 사용)
  const memberInChannel = channelData.channelMemberList?.find(
    member => member.memberSeq == currentMemberSeq
  )
  
  return memberInChannel && (
    memberInChannel.authority === Authority.SUPER || 
    memberInChannel.authority === 'MANAGER'
  )
}

// 일정관리 권한 확인 (scheduleData는 ChannelMemberResDto 배열)
const hasSchedulePermission = (scheduleData) => {
  if (!scheduleData || scheduleData.length === 0) {
    return false
  }
  
  // scheduleData는 ChannelMemberResDto 배열이므로 직접 권한 확인
  const currentMemberSeq = getCurrentUserMemberSeq(scheduleData)
  
  if (!currentMemberSeq) {
    return false
  }
  
  const currentMember = scheduleData.find(
    member => member.memberSeq == currentMemberSeq
  )
  
  return currentMember && (
    currentMember.authority === Authority.SUPER || 
    currentMember.authority === 'MANAGER'
  )
}

// 화상회의 권한 확인 (meetingData는 첫 번째 채널의 ChannelInfoResDto)
const hasMeetingPermission = (meetingData) => {
  if (!meetingData) {
    return false
  }
  
  // meetingData는 ChannelInfoResDto이므로 channelMemberList에서 권한 확인
  const currentMemberSeq = getCurrentUserMemberSeq(meetingData.channelMemberList)
  
  if (!currentMemberSeq) {
    return false
  }
  
  const currentMember = meetingData.channelMemberList?.find(
    member => member.memberSeq == currentMemberSeq
  )
  
  return currentMember && (
    currentMember.authority === Authority.SUPER || 
    currentMember.authority === 'MANAGER'
  )
}

// 컴포넌트 마운트 시 채널 데이터 로드
onMounted(() => {
  loadChannels()
})

// 워크스페이스 변경 시 채널 데이터 다시 로드
watch(() => props.currentWorkspaceData, () => {
  loadChannels()
}, { deep: true })

// workspaceType 변경 감지
watch(() => props.workspaceType, (newType) => {
  if (newType === 'project') {
    loadChannels()
  }
})

// 화상회의 생성
const createMeeting = () => {
  if (!newMeetingName.value.trim()) return
  
  const newMeeting = {
    id: `meeting_${Date.now()}`,
    name: newMeetingName.value.trim(),
    type: 'video',
    isActive: false
  }
  
  // 프로젝트 화상회의의 하위 채널에 추가
  const meetingChannel = projectChannels.value.find(ch => ch.id === 'meeting')
  if (meetingChannel && meetingChannel.subChannels) {
    meetingChannel.subChannels.push(newMeeting)
  }
  
  // 폼 초기화
  newMeetingName.value = ''
  showCreateMeetingModal.value = false
}

// 화상회의 모달 닫기
const closeCreateMeetingModal = () => {
  showCreateMeetingModal.value = false
  newMeetingName.value = ''
}

// 팀 일정 생성
const createSchedule = () => {
  if (!newScheduleName.value.trim()) return
  
  const newSchedule = {
    id: `schedule_${Date.now()}`,
    name: newScheduleName.value.trim(),
    type: 'schedule'
  }
  
  // 프로젝트 일정관리의 하위 채널에 추가
  const scheduleChannel = projectChannels.value.find(ch => ch.id === 'schedule')
  if (scheduleChannel && scheduleChannel.subChannels) {
    scheduleChannel.subChannels.push(newSchedule)
  }
  
  // 폼 초기화
  newScheduleName.value = ''
  showCreateScheduleModal.value = false
}

// 팀 일정 모달 닫기
const closeCreateScheduleModal = () => {
  showCreateScheduleModal.value = false
  newScheduleName.value = ''
}



// 채널 선택 함수
const selectChannel = (channelId) => {
  const channel = projectChannels.value.find(c => c.id === channelId)
  if (channel && channel.subChannels) {
    // 하위 채널이 있는 경우 토글
    toggleChannel(channelId)
  } else {
    // 일반 채널인 경우 선택
    emit('select-channel', channelId)
  }
}

// 채널 토글
const toggleChannel = (channelId) => {
  const channel = projectChannels.value.find(c => c.id === channelId)
  if (channel && channel.subChannels) {
    channel.expanded = !channel.expanded
  }
}

// 하위 채널 선택
const selectSubChannel = (parentId, subChannelId) => {
  emit('select-subchannel', parentId, subChannelId)
}

// 1:1 채팅 선택 함수
const selectDirectMessage = (dmId) => {
  emit('select-channel', '1-1-chat') // 1:1 채팅 채널로 이동
  // PersonalChat 컴포넌트에서 selectedChat을 업데이트하도록 전역 이벤트 발생
  window.dispatchEvent(new CustomEvent('select-chat', { detail: dmId }))
}

// 사용자 상태 색상
const getStatusColor = (status) => {
  switch (status) {
    case 'online': return 'success'
    case 'away': return 'warning'
    case 'busy': return 'error'
    case 'offline': return 'grey'
    default: return 'grey'
  }
}
</script>

<template>
  <!-- 워크스페이스 사이드바 -->
  <div 
    class="workspace-sidebar"
    :class="{ 'collapsed': collapsed && workspaceType === 'project' }"
  >
    <!-- 메인 채널들 -->
    <div class="channels-section">
      <!-- 프로젝트 정보 (프로젝트 워크스페이스일 때만 표시) -->
      <div v-if="workspaceType === 'project' && currentWorkspaceData" class="project-info">
        <div class="toggle-button" @click="emit('toggle')">
          <v-icon>{{ collapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
        </div>
        <span v-if="!collapsed" class="project-name">{{ currentWorkspaceData.name }}</span>
      </div>
      
      <div class="section-title">
        <span v-if="!collapsed || workspaceType === 'personal'">{{ workspaceType === 'personal' ? '내 워크스페이스' : '' }}</span>
      </div>
      
      <div class="channel-list">
        <!-- 로딩 상태 표시 -->
        <div v-if="isLoadingChannels" class="loading-channels">
          <v-progress-circular indeterminate size="20" width="2" />
          <span v-if="!collapsed || workspaceType === 'personal'" class="loading-text">채널 로딩 중...</span>
        </div>
        
        <div
          v-for="channel in currentChannels"
          :key="channel.id"
          class="channel-group"
        >
          <!-- 메인 채널 -->
          <div
            class="channel-item"
            :class="{ 
              'active': currentChannel === channel.id, 
              'collapsed': collapsed && workspaceType === 'project',
              'has-subchannels': channel.subChannels
            }"
            @click="selectChannel(channel.id)"
            @mouseenter="hoveredChannel = channel.id"
            @mouseleave="hoveredChannel = null"
          >
            <v-icon class="channel-icon">{{ channel.icon }}</v-icon>
            <span v-if="!collapsed || workspaceType === 'personal'" class="channel-name">{{ channel.name }}</span>
            
            <!-- 채널 생성 버튼 (프로젝트 채팅일 때만) -->
            <v-icon 
              v-if="channel.id === 'chat' && workspaceType === 'project' && (!collapsed || workspaceType === 'personal')"
              class="create-channel-btn"
              @click.stop="showCreateChannelModal = true"
            >
              mdi-plus
            </v-icon>
            
            <!-- 화상회의 생성 버튼 (프로젝트 화상회의일 때만) -->
            <v-icon 
              v-if="channel.id === 'meeting' && workspaceType === 'project' && (!collapsed || workspaceType === 'personal')"
              class="create-channel-btn"
              @click.stop="showCreateMeetingModal = true"
            >
              mdi-plus
            </v-icon>
            
            <!-- 프로젝트 일정 생성 버튼 (프로젝트 일정관리일 때만) -->
            <v-icon 
              v-if="channel.id === 'schedule' && workspaceType === 'project' && (!collapsed || workspaceType === 'personal')"
              class="create-channel-btn"
              @click.stop="showCreateScheduleModal = true"
            >
              mdi-plus
            </v-icon>
            
            <!-- 채널 설정 버튼 (일정관리, 화상회의만 최상위에 표시, 드라이브 제외) -->
            <v-icon 
              v-if="hoveredChannel === channel.id && (channel.id === 'schedule' || channel.id === 'meeting') && channel.id !== 'drive' && (!collapsed || workspaceType === 'personal') && (channel.id === 'schedule' ? hasSchedulePermission(channel.scheduleData) : hasMeetingPermission(channel.meetingData))"
              class="channel-settings-btn"
              @click.stop="openChannelSettings(channel)"
            >
              mdi-cog
            </v-icon>
            
            <v-icon 
              v-if="channel.subChannels && (!collapsed || workspaceType === 'personal')" 
              class="expand-icon"
              :class="{ 'expanded': channel.expanded }"
            >
              mdi-chevron-down
            </v-icon>
          </div>
          
          <!-- 하위 채널들 -->
          <div 
            v-if="channel.subChannels && channel.expanded && (!collapsed || workspaceType === 'personal')" 
            class="subchannel-list"
          >
            <div
              v-for="subChannel in channel.subChannels"
              :key="subChannel.id"
              class="subchannel-item"
              :class="{ 'active': selectedSubChannel === subChannel.id }"
              @click="selectSubChannel(channel.id, subChannel.id)"
              @mouseenter="hoveredChannel = subChannel.id"
              @mouseleave="hoveredChannel = null"
            >
              <v-icon class="subchannel-icon">
                {{ subChannel.type === 'video' ? 'mdi-video' : subChannel.type === 'schedule' ? 'mdi-calendar' : 'mdi-pound' }}
              </v-icon>
              <span class="subchannel-name">{{ subChannel.name }}</span>
              
              <!-- 하위 채널 설정 버튼 (권한이 있는 사용자만 표시) -->
              <v-icon 
                v-if="hoveredChannel === subChannel.id && hasChannelPermission(subChannel.channelData)"
                class="subchannel-settings-btn"
                @click.stop="openChannelSettings(subChannel)"
              >
                mdi-cog
              </v-icon>
              
              <div 
                v-if="subChannel.unread > 0" 
                class="unread-badge"
              >
                {{ subChannel.unread }}
              </div>
              <div 
                v-if="subChannel.participants > 0" 
                class="participants-count"
              >
                {{ subChannel.participants }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1:1 채팅 (개인 워크스페이스일 때만) -->
    <div v-if="workspaceType === 'personal'" class="direct-messages-section">
      <div class="section-title">
        개인 메시지
      </div>
      
      <div class="dm-list">
        <div
          v-for="dm in directMessages"
          :key="dm.id"
          class="dm-item"
          :class="{ 'active': currentChannel === dm.id, 'collapsed': collapsed && workspaceType === 'project' }"
          @click="selectDirectMessage(dm.id)"
        >
          <div class="dm-avatar">
            <v-avatar size="24" :color="getStatusColor(dm.status)">
              {{ dm.name.charAt(0) }}
            </v-avatar>
            <div 
              class="status-dot"
              :class="dm.status"
            />
          </div>
          <div v-if="!collapsed || workspaceType === 'personal'" class="dm-info">
            <div class="dm-name">{{ dm.name }}</div>
            <div class="dm-last-message">{{ dm.lastMessage }}</div>
          </div>
          <div v-if="!collapsed || workspaceType === 'personal'" class="dm-meta">
            <div class="dm-time">{{ dm.time }}</div>
            <div v-if="dm.unread > 0" class="unread-badge">
              {{ dm.unread }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 채널 생성 모달 -->
  <v-dialog v-model="showCreateChannelModal" max-width="400">
    <v-card class="create-channel-modal">
      <div class="modal-header">
        <div class="header-content">
          <v-icon class="header-icon">mdi-plus-circle</v-icon>
          <h3 class="modal-title">새 채널 만들기</h3>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="closeCreateChannelModal"
        />
      </div>
      
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">채널 이름</label>
          <v-text-field
            v-model="newChannelName"
            placeholder="예: 프로젝트-알파"
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="createChannel"
          />
        </div>
      </div>
      
      <div class="modal-actions">
        <v-btn
          variant="text"
          @click="closeCreateChannelModal"
        >
          취소
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!newChannelName.trim()"
          @click="createChannel"
        >
          만들기
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- 화상회의 생성 모달 -->
  <v-dialog v-model="showCreateMeetingModal" max-width="400">
    <v-card class="create-meeting-modal">
      <div class="modal-header">
        <div class="header-content">
          <v-icon class="header-icon">mdi-video-plus</v-icon>
          <h3 class="modal-title">새 회의실 만들기</h3>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="closeCreateMeetingModal"
        />
      </div>
      
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">회의실 이름</label>
          <v-text-field
            v-model="newMeetingName"
            placeholder="예: 프로젝트 회의실"
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="createMeeting"
          />
        </div>
      </div>
      
      <div class="modal-actions">
        <v-btn
          variant="text"
          @click="closeCreateMeetingModal"
        >
          취소
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!newMeetingName.trim()"
          @click="createMeeting"
        >
          만들기
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- 팀 일정 생성 모달 -->
  <v-dialog v-model="showCreateScheduleModal" max-width="400">
    <v-card class="create-schedule-modal">
      <div class="modal-header">
        <div class="header-content">
          <v-icon class="header-icon">mdi-calendar-plus</v-icon>
          <h3 class="modal-title">새 일정 만들기</h3>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="closeCreateScheduleModal"
        />
      </div>
      
      <div class="modal-body">
        <div class="input-group">
          <label class="input-label">일정 이름</label>
          <v-text-field
            v-model="newScheduleName"
            placeholder="예: 프로젝트 일정"
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="createSchedule"
          />
        </div>
      </div>
      
      <div class="modal-actions">
        <v-btn
          variant="text"
          @click="closeCreateScheduleModal"
        >
          취소
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!newScheduleName.trim()"
          @click="createSchedule"
        >
          만들기
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- 채널 설정 모달 -->
  <v-dialog v-model="showChannelSettingsModal" max-width="600" scrollable>
    <v-card class="channel-settings-dialog">
      <!-- 헤더 -->
      <div class="dialog-header">
        <div class="header-content">
          <div class="header-left">
            <v-icon class="header-icon">mdi-cog</v-icon>
            <h2 class="dialog-title">채널 설정</h2>
          </div>
          <v-btn 
            icon
            variant="text" 
            @click="closeChannelSettings"
            class="close-btn"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <v-divider />

      <!-- 채널 이름 섹션 -->
      <div class="channel-name-section">
        <div class="section-header">
          <v-icon class="section-icon">mdi-pound</v-icon>
          <h3 class="section-title">채널 정보</h3>
        </div>
        
        <v-text-field
          v-model="channelName"
          label="채널 이름"
          variant="outlined"
          density="comfortable"
          placeholder="채널 이름을 입력하세요"
          :disabled="selectedChannel?.scheduleData !== undefined || selectedChannel?.meetingData !== undefined"
          :hint="selectedChannel?.scheduleData ? '일정관리는 채널 이름을 변경할 수 없습니다.' : selectedChannel?.meetingData ? '화상회의는 채널 이름을 변경할 수 없습니다.' : ''"
          persistent-hint
        />
      </div>

      <v-divider />

      <!-- 멤버 권한 관리 섹션 -->
      <div class="permissions-section">
        <div class="section-header">
          <v-icon class="section-icon">mdi-shield-account</v-icon>
          <h3 class="section-title">멤버 권한 관리</h3>
        </div>
        
        <div class="members-section">
          <div class="members-header">
            <span class="members-title">채널 멤버 권한</span>
            <div class="permission-legend">
              <div class="legend-item super">
                <v-icon size="14">mdi-shield-crown</v-icon>
                <span>소유자</span>
              </div>
              <div class="legend-item manager">
                <v-icon size="14">mdi-account-star</v-icon>
                <span>관리자</span>
              </div>
              <div class="legend-item participant">
                <v-icon size="14">mdi-account</v-icon>
                <span>참여자</span>
              </div>
            </div>
          </div>
          
          <div class="members-list">
            <!-- 멤버 목록이 없는 경우 -->
            <div v-if="channelMembers.length === 0" class="empty-state">
              <v-icon size="48" color="grey">mdi-account-group-outline</v-icon>
              <span>멤버가 없습니다.</span>
            </div>
            
            <!-- 멤버 목록 -->
            <div 
              v-else
              v-for="member in channelMembers" 
              :key="member.memberSeq"
              class="member-item"
            >
              <div class="member-info">
                <v-avatar size="32" color="primary">
                  <v-img 
                    v-if="member.memberProfileUrl" 
                    :src="member.memberProfileUrl"
                  />
                  <span v-else class="text-white font-weight-bold">
                    {{ member.memberName?.charAt(0) || '?' }}
                  </span>
                </v-avatar>
                <div class="member-details">
                  <div class="member-name">{{ member.memberName }}</div>
                </div>
              </div>
              
              <div class="permission-toggle">
                <!-- SUPER 권한자만 권한 변경 가능 -->
                <v-btn-toggle
                  v-if="isCurrentUserSuper"
                  :model-value="channelPermissions[member.memberSeq]"
                  @update:model-value="updateChannelPermission(member.memberSeq, $event)"
                  :disabled="member.memberSeq == authStore.memberSeq && channelPermissions[member.memberSeq] === 'SUPER'"
                  mandatory
                  density="compact"
                  class="permission-buttons"
                >
                  <v-btn value="SUPER" size="small" class="super-btn" disabled>
                    <v-icon size="14">mdi-shield-crown</v-icon>
                    <span>소유자</span>
                  </v-btn>
                  <v-btn value="MANAGER" size="small" class="manager-btn">
                    <v-icon size="14">mdi-account-star</v-icon>
                    <span>관리자</span>
                  </v-btn>
                  <v-btn value="PARTICIPANT" size="small" class="participant-btn">
                    <v-icon size="14">mdi-account</v-icon>
                    <span>참여</span>
                  </v-btn>
                </v-btn-toggle>
                
                <!-- SUPER 권한이 아닌 경우 현재 권한만 표시 -->
                <v-chip 
                  v-else
                  :color="channelPermissions[member.memberSeq] === 'SUPER' ? '#f44336' : channelPermissions[member.memberSeq] === 'MANAGER' ? '#ffa726' : '#42a5f5'"
                  size="small"
                  variant="outlined"
                >
                  <v-icon 
                    size="14" 
                    :icon="channelPermissions[member.memberSeq] === 'SUPER' ? 'mdi-shield-crown' : channelPermissions[member.memberSeq] === 'MANAGER' ? 'mdi-account-star' : 'mdi-account'"
                  ></v-icon>
                  <span>{{ channelPermissions[member.memberSeq] === 'SUPER' ? '소유자' : channelPermissions[member.memberSeq] === 'MANAGER' ? '관리자' : '참여자' }}</span>
                </v-chip>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="dialog-actions">
        <v-btn 
          variant="outlined"
          @click="closeChannelSettings"
          class="cancel-btn"
        >
          취소
        </v-btn>
        <v-btn 
          color="primary" 
          @click="saveChannelSettings"
          class="save-btn"
        >
          <v-icon left>mdi-content-save</v-icon>
          저장
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

</template>

<style scoped>
.workspace-sidebar {
  width: 260px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px 0 80px 0;
  margin-left: 72px;
  position: fixed;
  left: 0;
  top: 60px;
  bottom: 0;
  z-index: 99;
  overflow-y: auto;
  transition: transform 0.3s ease;
}


.workspace-sidebar.collapsed {
  width: 72px;
}


.channels-section,
.direct-messages-section {
  margin-bottom: 16px;
}

/* 프로젝트 정보 */
.project-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 8px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.workspace-sidebar.collapsed .project-info {
  justify-content: center;
  padding: 8px 12px;
}

.toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgb(var(--v-theme-primary));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.toggle-button:hover {
  background: rgba(var(--v-theme-primary), 0.8);
  transform: scale(1.05);
}

.toggle-button .v-icon {
  font-size: 16px;
  color: white;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.section-title {
  padding: 0 24px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  display: flex;
  align-items: center;
}


.channel-list,
.dm-list {
  display: flex;
  flex-direction: column;
}

.channel-group {
  margin-bottom: 4px;
}

.channel-item,
.dm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.channel-item.has-subchannels {
  padding-right: 8px;
}

.channel-item:hover,
.dm-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-on-surface));
  opacity: 1;
}

.channel-item.active,
.dm-item.active {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-on-surface));
  opacity: 1;
  border-right: 2px solid rgb(var(--v-theme-primary));
}

.channel-item.collapsed,
.dm-item.collapsed {
  justify-content: center;
  padding: 8px 12px;
  min-height: 40px;
}

.channel-item.collapsed .channel-icon,
.dm-item.collapsed .dm-avatar {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.channel-name {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.expand-icon {
  font-size: 16px;
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.subchannel-list {
  margin-left: 16px;
  margin-top: 4px;
}

.subchannel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  font-size: 13px;
}

.subchannel-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.8;
}

.subchannel-item.active {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  font-weight: 500;
}

.subchannel-icon {
  font-size: 14px;
  opacity: 0.7;
}

.subchannel-name {
  flex: 1;
  font-size: 13px;
}

.unread-badge {
  font-size: 10px;
  height: 16px;
  min-width: 16px;
  background: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.participants-count {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  margin-left: auto;
}


.dm-avatar {
  position: relative;
  flex-shrink: 0;
}

.status-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid rgb(var(--v-theme-background));
}

.status-dot.online {
  background: rgb(var(--v-theme-success));
}

.status-dot.away {
  background: rgb(var(--v-theme-warning));
}

.status-dot.busy {
  background: rgb(var(--v-theme-error));
}

.status-dot.offline {
  background: rgb(var(--v-theme-grey));
}

.dm-info {
  flex: 1;
  min-width: 0;
}

.dm-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dm-last-message {
  font-size: 12px;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dm-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.dm-time {
  font-size: 11px;
  opacity: 0.6;
  text-align: right;
}

.unread-badge {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  padding: 0 6px;
}

/* 채널 생성 버튼 */
.create-channel-btn {
  margin-left: auto;
  margin-right: 8px;
  font-size: 18px;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.create-channel-btn:hover {
  color: white;
  background: rgba(0, 0, 0, 0.1);
}

/* 채널 생성 모달 */
.create-channel-modal,
.create-meeting-modal,
.create-schedule-modal {
  background: rgb(var(--v-theme-surface));
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-primary), 0.05));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 24px;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.modal-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group:last-child {
  margin-bottom: 0;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

/* 멤버 선택 */
.members-selection {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  padding: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.member-item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.member-item.selected {
  background: rgba(var(--v-theme-primary), 0.15);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.member-info {
  flex: 1;
  margin-left: 12px;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.member-status {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.check-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .workspace-sidebar {
    width: 240px;
    margin-left: 60px;
  }
}

/* 채널 설정 버튼 스타일 */
.channel-settings-btn,
.subchannel-settings-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
  font-size: 16px;
  color: rgb(var(--v-theme-on-surface));
}

.channel-item:hover .channel-settings-btn,
.subchannel-item:hover .subchannel-settings-btn {
  opacity: 1;
}

/* 채널 설정 모달 스타일 (AppHeader 스타일 적용) */
.channel-settings-dialog {
  background: rgb(var(--v-theme-surface));
  border-radius: 16px;
  overflow: hidden;
}

.dialog-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-primary), 0.02) 100%);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 24px;
}

.dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.close-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.close-btn:hover {
  opacity: 1;
}

.channel-name-section {
  padding: 24px;
}

.permissions-section {
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-icon {
  color: rgb(var(--v-theme-primary));
  font-size: 20px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.members-section {
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 12px;
  padding: 16px;
}

.members-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.members-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.8;
}

.permission-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.legend-item.super {
  color: #f44336; /* 빨간색 */
}

.legend-item.manager {
  color: #ffa726; /* 노란색 */
}

.legend-item.participant {
  color: #42a5f5; /* 파란색 */
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition: all 0.2s ease;
}

.member-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.08);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.permission-toggle {
  display: flex;
  gap: 8px;
}

.permission-buttons {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 8px;
  overflow: hidden;
}

.permission-buttons .v-btn {
  font-size: 12px;
  text-transform: none;
  letter-spacing: 0;
}

.super-btn.v-btn--active {
  background: rgba(244, 67, 54, 0.15) !important; /* 빨간색 */
  color: #f44336 !important;
}

.manager-btn.v-btn--active {
  background: rgba(255, 167, 38, 0.15) !important; /* 노란색 */
  color: #ffa726 !important;
}

.participant-btn.v-btn--active {
  background: rgba(66, 165, 245, 0.15) !important; /* 파란색 */
  color: #42a5f5 !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.5;
}

.empty-state span {
  font-size: 14px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.cancel-btn,
.save-btn {
  text-transform: none;
  font-weight: 500;
  padding: 8px 24px;
}

/* 로딩 상태 스타일 */
.loading-channels {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
}

.loading-text {
  font-size: 14px;
}
</style>
