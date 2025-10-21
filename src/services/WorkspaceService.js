import { apiGet, apiPostFormData } from '@/utils/api'
import { 
  TeamWorkSpaceCreateReqDto, 
  WorkSpaceResDto,
  WorkSpaceInfoResDto,
  WorkSpaceMemberInfoResDto,
  Authority
} from '@/models/workspace/WorkspaceModels'

// ----------------------
// 워크스페이스 생성 API
// ----------------------
export const createWorkspace = async (workSpaceName, workSpaceThumbnailImage, memberList) => {
  const reqDto = new TeamWorkSpaceCreateReqDto(workSpaceName, workSpaceThumbnailImage, memberList)
  const formData = reqDto.toFormData()
  
  const res = await apiPostFormData('/workspace-service/workspace/create', formData)
  return WorkSpaceResDto.fromJson(res)
}

// ----------------------
// 내 워크스페이스 목록 조회 API
// ----------------------
export const getMyWorkspaces = async () => {
  const res = await apiGet('/workspace-service/workspace/me')
  
  // 배열 응답 처리
  if (Array.isArray(res)) {
    return res.map(workspace => WorkSpaceInfoResDto.fromJson(workspace))
  }
  
  return []
}

// ----------------------
// 워크스페이스 멤버 목록 조회 API
// ----------------------
export const getWorkspaceMembers = async (workSpaceSeq) => {
  const res = await apiGet(`/workspace-service/workspace/${workSpaceSeq}/members`)
  
  // 배열 응답 처리
  if (Array.isArray(res)) {
    return res.map(member => WorkSpaceMemberInfoResDto.fromJson(member))
  }
  
  return []
}

// ----------------------
// 워크스페이스 권한 체크 API
// ----------------------
export const checkWorkspaceAuthority = async (workSpaceSeq) => {
  const res = await apiGet(`/workspace-service/workspace/checkAuthority/${workSpaceSeq}`)
  
  // 백엔드에서 Authority enum을 string으로 반환 (SUPER 또는 PARTICIPANT)
  return res
}

// ----------------------
// 친구 목록, 회원 검색 API는 friend.js에서 import하여 사용
// ----------------------
export { getFriendList, searchMembers } from '@/api/friend/friend'

