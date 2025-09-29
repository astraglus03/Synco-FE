import { ref, computed } from 'vue'

// 권한 타입 정의
export const PERMISSION_TYPES = {
  SUPER: 'SUPER',      // 방장 - 모든 권한
  MANAGER: 'MANAGER',  // 매니저 - 대부분의 권한
  PARTICIPANT: 'PARTICIPANT' // 참여자 - 기본 권한
}

// 권한별 기능 정의
export const PERMISSIONS = {
  // 채널 관리
  CREATE_CHANNEL: 'create_channel',
  EDIT_CHANNEL: 'edit_channel',
  DELETE_CHANNEL: 'delete_channel',
  
  // 멤버 관리
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  MANAGE_ROLES: 'manage_roles',
  
  // 업무 관리
  CREATE_TASKS: 'create_tasks',
  EDIT_TASKS: 'edit_tasks',
  DELETE_TASKS: 'delete_tasks',
  ASSIGN_TASKS: 'assign_tasks',
  
  // 화상회의 관리
  START_MEETING: 'start_meeting',
  END_MEETING: 'end_meeting',
  RECORD_MEETING: 'record_meeting',
  
  // 드라이브 관리
  UPLOAD_FILES: 'upload_files',
  DELETE_FILES: 'delete_files',
  MANAGE_FOLDERS: 'manage_folders',
  
  // 기본 권한 (모든 사용자)
  VIEW_CHANNELS: 'view_channels',
  SEND_MESSAGES: 'send_messages',
  JOIN_MEETING: 'join_meeting',
  VIEW_FILES: 'view_files',
  DOWNLOAD_FILES: 'download_files'
}

// 권한별 허용 기능 매핑
const PERMISSION_MATRIX = {
  [PERMISSION_TYPES.SUPER]: Object.values(PERMISSIONS),
  [PERMISSION_TYPES.MANAGER]: [
    PERMISSIONS.CREATE_CHANNEL,
    PERMISSIONS.EDIT_CHANNEL,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.CREATE_TASKS,
    PERMISSIONS.EDIT_TASKS,
    PERMISSIONS.DELETE_TASKS,
    PERMISSIONS.ASSIGN_TASKS,
    PERMISSIONS.START_MEETING,
    PERMISSIONS.END_MEETING,
    PERMISSIONS.RECORD_MEETING,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.DELETE_FILES,
    PERMISSIONS.MANAGE_FOLDERS,
    PERMISSIONS.VIEW_CHANNELS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.JOIN_MEETING,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.DOWNLOAD_FILES
  ],
  [PERMISSION_TYPES.PARTICIPANT]: [
    PERMISSIONS.VIEW_CHANNELS,
    PERMISSIONS.SEND_MESSAGES,
    PERMISSIONS.JOIN_MEETING,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.DOWNLOAD_FILES,
    PERMISSIONS.UPLOAD_FILES
  ]
}

// 현재 사용자 권한 상태
const currentUserRole = ref(PERMISSION_TYPES.PARTICIPANT)
const currentWorkspaceId = ref(null)

// 권한 관리 composable
export function usePermissions() {
  // 권한 확인 함수
  const hasPermission = (permission) => {
    const userPermissions = PERMISSION_MATRIX[currentUserRole.value] || []
    return userPermissions.includes(permission)
  }

  // 여러 권한 확인 함수
  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission))
  }

  // 모든 권한 확인 함수
  const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission))
  }

  // 권한 설정 함수
  const setUserRole = (role, workspaceId = null) => {
    currentUserRole.value = role
    currentWorkspaceId.value = workspaceId
  }

  // 현재 권한 정보
  const currentRole = computed(() => currentUserRole.value)
  const currentPermissions = computed(() => 
    PERMISSION_MATRIX[currentUserRole.value] || []
  )

  // 권한 레벨 확인
  const isSuper = computed(() => currentUserRole.value === PERMISSION_TYPES.SUPER)
  const isManager = computed(() => 
    currentUserRole.value === PERMISSION_TYPES.MANAGER || 
    currentUserRole.value === PERMISSION_TYPES.SUPER
  )
  const isParticipant = computed(() => 
    currentUserRole.value === PERMISSION_TYPES.PARTICIPANT ||
    currentUserRole.value === PERMISSION_TYPES.MANAGER ||
    currentUserRole.value === PERMISSION_TYPES.SUPER
  )

  // 권한별 UI 표시 여부
  const canShow = (permission) => hasPermission(permission)
  const canShowAny = (permissions) => hasAnyPermission(permissions)
  const canShowAll = (permissions) => hasAllPermissions(permissions)

  return {
    // 권한 확인 함수들
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // 권한 설정
    setUserRole,
    
    // 현재 상태
    currentRole,
    currentPermissions,
    currentWorkspaceId,
    
    // 권한 레벨 확인
    isSuper,
    isManager,
    isParticipant,
    
    // UI 표시 여부
    canShow,
    canShowAny,
    canShowAll,
    
    // 상수
    PERMISSION_TYPES,
    PERMISSIONS
  }
}

// 권한 디렉티브를 위한 함수
export function checkPermission(permission) {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}
