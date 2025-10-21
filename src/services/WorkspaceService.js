import { apiGet, apiPost, apiPostFormData, apiPatchFormData } from '@/utils/api'
import { 
  TeamWorkSpaceCreateReqDto,
  TeamWorkSpaceEditReqDto,
  WorkSpaceResDto,
  WorkSpaceInfoResDto,
  WorkSpaceMemberInfoResDto,
  DelegateSuperAuthorityReqDto,
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
// 워크스페이스 수정 API
// ----------------------
export const updateWorkspace = async (workSpaceSeq, workSpaceName, workSpaceThumbnailImage) => {
  const reqDto = new TeamWorkSpaceEditReqDto(workSpaceSeq, workSpaceName, workSpaceThumbnailImage)
  const formData = reqDto.toFormData()
  
  const res = await apiPatchFormData('/workspace-service/workspace/edit', formData)
  return WorkSpaceResDto.fromJson(res)
}

// ----------------------
// Super 권한 위임 API
// ----------------------
export const delegateSuperAuthority = async (delegateMemberSeq, workSpaceSeq) => {
  console.log('delegateSuperAuthority API 호출:', { delegateMemberSeq, workSpaceSeq })
  
  const reqDto = new DelegateSuperAuthorityReqDto(delegateMemberSeq, workSpaceSeq)
  console.log('요청 DTO:', reqDto)
  
  const res = await apiPost('/workspace-service/workspace/delegateSuperAuthority', reqDto)
  console.log('API 응답:', res)
  return res
}

// ----------------------
// 친구 목록, 회원 검색 API는 friend.js에서 import하여 사용
// ----------------------
export { getFriendList, searchMembers } from '@/api/friend/friend'

