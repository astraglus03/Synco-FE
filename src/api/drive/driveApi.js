import axios from '@/utils/api'
import { DriveItem, DocumentDetail } from '@/models/drive/DriveModels'
import { useNotificationStore } from '@/store/notificationStore'

// 알림 갱신 헬퍼 함수
const refreshNotifications = async () => {
  try {
    const notificationStore = useNotificationStore()
    await notificationStore.fetchNotifications()
  } catch (error) {
    console.error('[Drive API] 알림 갱신 실패:', error)
  }
}

// API 엔드포인트 상수
const API_ENDPOINTS = {
  // 프로젝트 드라이브
  PROJECT_ITEMS: (channelSeq) => `/drive-service/drive/project/${channelSeq}/items`,
  PROJECT_FOLDER: '/drive-service/drive/project/folder',
  PROJECT_SHARED_DOC: '/drive-service/drive/project/create/shared-docs',
  PROJECT_UPLOAD: '/drive-service/drive/project/upload',
  PROJECT_MOVE: '/drive-service/drive/project/move',
  PROJECT_REORDER: '/drive-service/drive/project/reorder',
  PROJECT_DOWNLOAD: (channelSeq, docSeq) => `/drive-service/drive/project/${channelSeq}/download/${docSeq}`,
  PROJECT_RENAME_FOLDER: '/drive-service/drive/project/folder/rename',
  PROJECT_RENAME_DOCUMENT: '/drive-service/drive/project/document/rename',
  PROJECT_DELETE: (channelSeq) => `/drive-service/drive/project/${channelSeq}`,
  PROJECT_DOCUMENT: (channelSeq, docSeq) => `/drive-service/drive/project/${channelSeq}/documents/${docSeq}`,
  PROJECT_DOCUMENT_LOCK: '/drive-service/drive/project/documents/lock',
  PROJECT_DOCUMENT_DOWNLOAD: (channelSeq, docSeq) => `/drive-service/drive/project/${channelSeq}/documents/${docSeq}/download`,
  PROJECT_ALL_FOLDERS: (channelSeq) => `/drive-service/drive/project/${channelSeq}/folders/tree`,
  PROJECT_DOCUMENT_PARTICIPANTS: (documentId) => `/drive-service/drive/project/documents/${documentId}/participants`,
  PROJECT_DOCUMENT_LOCKS: (channelSeq, documentSeq) => `/drive-service/drive/project/${channelSeq}/document/${documentSeq}/locks`,
  
  // 개인 드라이브
  PERSONAL_ITEMS: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/items`,
  PERSONAL_FOLDER: '/drive-service/drive/personal/folder',
  PERSONAL_SHARED_DOC: '/drive-service/drive/personal/create/shared-docs',
  PERSONAL_UPLOAD: '/drive-service/drive/personal/upload',
  PERSONAL_MOVE: '/drive-service/drive/personal/move',
  PERSONAL_REORDER: '/drive-service/drive/personal/reorder',
  PERSONAL_DOWNLOAD: (channelSeq, docSeq) => `/drive-service/drive/personal/${channelSeq}/download/${docSeq}`,
  PERSONAL_RENAME_FOLDER: '/drive-service/drive/personal/folder/rename',
  PERSONAL_RENAME_DOCUMENT: '/drive-service/drive/personal/document/rename',
  PERSONAL_DELETE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}`,
  PERSONAL_DOCUMENT: (channelSeq, docSeq) => `/drive-service/drive/personal/${channelSeq}/documents/${docSeq}`,
  PERSONAL_DOCUMENT_LOCK: '/drive-service/drive/personal/documents/lock',
  PERSONAL_DOCUMENT_DOWNLOAD: (channelSeq, docSeq) => `/drive-service/drive/personal/${channelSeq}/documents/${docSeq}/download`,
  PERSONAL_ALL_FOLDERS: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/folders/tree`,
  PERSONAL_MOVE_TO_PROJECT: '/drive-service/drive/personal/move-to-project',
  
  // 개인 드라이브 라인 관리
  PERSONAL_DOCUMENT_LINES: (channelSeq, docSeq) => `/drive-service/drive/personal/${channelSeq}/documents/${docSeq}/lines`,
  PERSONAL_LINE_CREATE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/documents/lines/create`,
  PERSONAL_LINE_UPDATE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/documents/lines/update`,
  PERSONAL_LINE_DELETE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/documents/lines/delete`,
  PERSONAL_LINE_BATCH_CREATE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/documents/lines/batch-create`,
  PERSONAL_LINE_BATCH_UPDATE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/documents/lines/batch-update`,
  PERSONAL_LINE_BATCH_DELETE: (channelSeq) => `/drive-service/drive/personal/${channelSeq}/documents/lines/batch-delete`,
}

// 허용된 파일 확장자 목록
const ALLOWED_FILE_EXTENSIONS = [
  // 이미지 파일
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif',
  // 문서 파일
  '.pdf', '.txt', '.rtf', '.csv', '.xml', '.json', '.html', '.htm', '.css', '.js', '.yml', '.yaml',
  // Microsoft Office 파일
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // 압축 파일
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // 비디오 파일
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
  // 오디오 파일
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  // 프로그래밍 파일
  '.java', '.py', '.cpp', '.cc', '.cxx', '.c', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh', '.bat', '.ps1',
  // 기타 파일
  '.exe', '.dmg', '.iso', '.deb', '.rpm', '.apk', '.ipa'
]

// 공통 유틸리티 함수들
const createApiResponse = (success, data = null, error = null) => ({
  success,
  data,
  error
})

const handleApiError = (error, defaultMessage) => {
  console.error(error)
  return createApiResponse(false, null, error.response?.data?.message || defaultMessage)
}

const validateFileExtensions = (files) => {
  const invalidFiles = []
  files.forEach(file => {
    const fileName = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext))
    if (!hasValidExtension) {
      invalidFiles.push(file.name)
    }
  })
  
  if (invalidFiles.length > 0) {
    return {
      isValid: false,
      error: `허용되지 않은 파일 형식입니다: ${invalidFiles.join(', ')}`
    }
  }
  
  return { isValid: true }
}

const convertFolderTree = (folders, driveChannelSeq, isPersonal) => {
  return folders.map(folder => DriveItem.fromApiFormat({
    ...folder,
    driveChannelSeq,
    isPersonal,
    children: folder.children ? convertFolderTree(folder.children, driveChannelSeq, isPersonal) : []
  }))
}

// 드라이브 API 기본 클래스
class DriveApiBase {
  constructor(isPersonal) {
    this.isPersonal = isPersonal
    this.endpoints = isPersonal ? {
      items: API_ENDPOINTS.PERSONAL_ITEMS,
      folder: API_ENDPOINTS.PERSONAL_FOLDER,
      sharedDoc: API_ENDPOINTS.PERSONAL_SHARED_DOC,
      upload: API_ENDPOINTS.PERSONAL_UPLOAD,
      move: API_ENDPOINTS.PERSONAL_MOVE,
      reorder: API_ENDPOINTS.PERSONAL_REORDER,
      download: API_ENDPOINTS.PERSONAL_DOWNLOAD,
      renameFolder: API_ENDPOINTS.PERSONAL_RENAME_FOLDER,
      renameDocument: API_ENDPOINTS.PERSONAL_RENAME_DOCUMENT,
      delete: API_ENDPOINTS.PERSONAL_DELETE,
      document: API_ENDPOINTS.PERSONAL_DOCUMENT,
      documentLock: API_ENDPOINTS.PERSONAL_DOCUMENT_LOCK,
      documentDownload: API_ENDPOINTS.PERSONAL_DOCUMENT_DOWNLOAD,
      allFolders: API_ENDPOINTS.PERSONAL_ALL_FOLDERS,
      moveToProject: API_ENDPOINTS.PERSONAL_MOVE_TO_PROJECT,
      documentLines: API_ENDPOINTS.PERSONAL_DOCUMENT_LINES,
      lineCreate: API_ENDPOINTS.PERSONAL_LINE_CREATE,
      lineUpdate: API_ENDPOINTS.PERSONAL_LINE_UPDATE,
      lineDelete: API_ENDPOINTS.PERSONAL_LINE_DELETE,
      lineBatchCreate: API_ENDPOINTS.PERSONAL_LINE_BATCH_CREATE,
      lineBatchUpdate: API_ENDPOINTS.PERSONAL_LINE_BATCH_UPDATE,
      lineBatchDelete: API_ENDPOINTS.PERSONAL_LINE_BATCH_DELETE,
    } : {
      items: API_ENDPOINTS.PROJECT_ITEMS,
      folder: API_ENDPOINTS.PROJECT_FOLDER,
      sharedDoc: API_ENDPOINTS.PROJECT_SHARED_DOC,
      upload: API_ENDPOINTS.PROJECT_UPLOAD,
      move: API_ENDPOINTS.PROJECT_MOVE,
      reorder: API_ENDPOINTS.PROJECT_REORDER,
      download: API_ENDPOINTS.PROJECT_DOWNLOAD,
      renameFolder: API_ENDPOINTS.PROJECT_RENAME_FOLDER,
      renameDocument: API_ENDPOINTS.PROJECT_RENAME_DOCUMENT,
      delete: API_ENDPOINTS.PROJECT_DELETE,
      document: API_ENDPOINTS.PROJECT_DOCUMENT,
      documentLock: API_ENDPOINTS.PROJECT_DOCUMENT_LOCK,
      documentDownload: API_ENDPOINTS.PROJECT_DOCUMENT_DOWNLOAD,
      allFolders: API_ENDPOINTS.PROJECT_ALL_FOLDERS,
      documentParticipants: API_ENDPOINTS.PROJECT_DOCUMENT_PARTICIPANTS,
      documentLocks: API_ENDPOINTS.PROJECT_DOCUMENT_LOCKS,
    }
  }

  // 드라이브 아이템 목록 조회
  async getItems(driveChannelSeq, parentFolderSeq = null) {
    try {
      const endpoint = this.endpoints.items(driveChannelSeq)
      const response = await axios.get(endpoint, {
        params: { parentFolderId: parentFolderSeq }
      })
      
      console.log(`${this.isPersonal ? '개인' : '프로젝트'} 드라이브 응답:`, response.data)
      
      if (!response.data?.data?.content) {
        console.warn(`${this.isPersonal ? '개인' : '프로젝트'} 드라이브 응답 구조가 예상과 다릅니다:`, response.data)
        return createApiResponse(true, [])
      }
      
      const items = response.data.data.content
      return createApiResponse(true, items.map(item => DriveItem.fromApiFormat({
        ...item,
        driveChannelSeq,
        isPersonal: this.isPersonal
      })))
    } catch (error) {
      return handleApiError(error, '목록 조회에 실패했습니다.')
    }
  }

  // 폴더 생성
  async createFolder(name, driveChannelSeq, parentFolderSeq = null) {
    try {
      const response = await axios.post(this.endpoints.folder, {
        folderName: name,
        parentFolderSeq,
        driveChannelSeq
      })
      
      return createApiResponse(true, DriveItem.fromApiFormat({
        ...response.data.data,
        driveChannelSeq,
        isPersonal: this.isPersonal
      }))
    } catch (error) {
      return handleApiError(error, '폴더 생성에 실패했습니다.')
    }
  }

  // 공유 문서 생성
  async createSharedDocument(name, driveChannelSeq, parentFolderSeq = null, isLocked = false) {
    try {
      const response = await axios.post(this.endpoints.sharedDoc, {
        documentName: name,
        parentFolderSeq,
        driveChannelSeq,
        isLocked
      })
      
      // 프로젝트 드라이브 공유 문서 생성 시 알림 갱신 (백그라운드에서 실행, 실패해도 무시)
      if (!this.isPersonal) {
        refreshNotifications().catch(() => {})
      }
      
      return createApiResponse(true, DriveItem.fromApiFormat({
        ...response.data.data,
        driveChannelSeq,
        isPersonal: this.isPersonal
      }))
    } catch (error) {
      return handleApiError(error, '공유문서 생성에 실패했습니다.')
    }
  }

  // 파일 업로드
  async uploadFiles(files, driveChannelSeq, parentFolderSeq = null) {
    try {
      const validation = validateFileExtensions(files)
      if (!validation.isValid) {
        return createApiResponse(false, null, validation.error)
      }
      
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('driveChannelSeq', driveChannelSeq)
      if (parentFolderSeq) {
        formData.append('parentFolderSeq', parentFolderSeq)
      }
      
      const response = await axios.post(this.endpoints.upload, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'X-Member-Seq': '1'
        }
      })
      
      return createApiResponse(true, response.data.data.map(item => DriveItem.fromApiFormat({
        ...item,
        driveChannelSeq,
        isPersonal: this.isPersonal
      })))
    } catch (error) {
      return handleApiError(error, '파일 업로드에 실패했습니다.')
    }
  }

  // 폴더 이름 변경
  async renameFolder(folderSeq, newFolderName, driveChannelSeq) {
    try {
      const response = await axios.patch(this.endpoints.renameFolder, {
        driveChannelSeq,
        folderSeq,
        newFolderName
      })
      
      return createApiResponse(true, DriveItem.fromApiFormat({
        ...response.data.data,
        driveChannelSeq,
        isPersonal: this.isPersonal
      }))
    } catch (error) {
      return handleApiError(error, '이름 변경에 실패했습니다.')
    }
  }

  // 문서 이름 변경
  async renameDocument(documentSeq, newDocumentName, driveChannelSeq) {
    try {
      const response = await axios.patch(this.endpoints.renameDocument, {
        driveChannelSeq,
        documentSeq,
        newDocumentName
      })
      
      return createApiResponse(true, DriveItem.fromApiFormat({
        ...response.data.data,
        driveChannelSeq,
        isPersonal: this.isPersonal
      }))
    } catch (error) {
      return handleApiError(error, '문서 이름 변경에 실패했습니다.')
    }
  }

  // 아이템 삭제
  async deleteItem(itemId, itemType, driveChannelSeq) {
    try {
      await axios.delete(this.endpoints.delete(driveChannelSeq), {
        data: { itemId, itemType }
      })
      
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '삭제에 실패했습니다.')
    }
  }

  // 파일 다운로드
  async downloadFile(documentSeq, driveChannelSeq) {
    try {
      const response = await axios.get(this.endpoints.download(driveChannelSeq, documentSeq), { 
        responseType: 'blob' 
      })
      
      return createApiResponse(true, response.data)
    } catch (error) {
      return handleApiError(error, '다운로드에 실패했습니다.')
    }
  }

  // 공유 문서 다운로드
  async downloadDocument(documentSeq, driveChannelSeq) {
    try {
      const response = await axios.get(this.endpoints.documentDownload(driveChannelSeq, documentSeq), { 
        responseType: 'blob' 
      })
      
      return createApiResponse(true, response.data)
    } catch (error) {
      return handleApiError(error, '문서 다운로드에 실패했습니다.')
    }
  }

  // 공유 문서 내용 조회
  async getDocumentContent(documentSeq, driveChannelSeq) {
    try {
      const response = await axios.get(this.endpoints.document(driveChannelSeq, documentSeq))
      
      return createApiResponse(true, new DocumentDetail(response.data.data))
    } catch (error) {
      return handleApiError(error, '문서 내용 조회에 실패했습니다.')
    }
  }

  // 공유 문서 내용 저장
  async saveDocumentContent(documentSeq, driveChannelSeq, content) {
    try {
      await axios.patch(this.endpoints.document(driveChannelSeq, documentSeq), {
        driveChannelSeq,
        documentSeq,
        content
      })
      
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '문서 저장에 실패했습니다.')
    }
  }

  // 공유 문서 잠금/해제 토글
  async toggleDocumentLock(documentSeq, driveChannelSeq) {
    try {
      const response = await axios.patch(this.endpoints.documentLock, {
        driveChannelSeq,
        documentSeq
      })
      
      return createApiResponse(true, DriveItem.fromApiFormat({
        ...response.data.data,
        driveChannelSeq,
        isPersonal: this.isPersonal
      }))
    } catch (error) {
      return handleApiError(error, '잠금 상태 변경에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 라인 목록 조회
  async getDocumentLines(driveChannelSeq, documentSeq) {
    if (!this.isPersonal || !this.endpoints.documentLines) {
      throw new Error('라인 조회는 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      const response = await axios.get(this.endpoints.documentLines(driveChannelSeq, documentSeq))
      return createApiResponse(true, response.data?.data || [])
    } catch (error) {
      return handleApiError(error, '라인 목록 조회에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 단일 라인 생성
  async createDocumentLine(driveChannelSeq, message) {
    if (!this.isPersonal || !this.endpoints.lineCreate) {
      throw new Error('라인 생성은 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      await axios.post(this.endpoints.lineCreate(driveChannelSeq), message)
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '라인 생성에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 단일 라인 수정
  async updateDocumentLine(driveChannelSeq, message) {
    if (!this.isPersonal || !this.endpoints.lineUpdate) {
      throw new Error('라인 수정은 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      await axios.put(this.endpoints.lineUpdate(driveChannelSeq), message)
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '라인 수정에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 단일 라인 삭제
  async deleteDocumentLine(driveChannelSeq, message) {
    if (!this.isPersonal || !this.endpoints.lineDelete) {
      throw new Error('라인 삭제는 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      await axios.delete(this.endpoints.lineDelete(driveChannelSeq), { data: message })
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '라인 삭제에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 배치 라인 생성
  async createDocumentLines(driveChannelSeq, message) {
    if (!this.isPersonal || !this.endpoints.lineBatchCreate) {
      throw new Error('배치 라인 생성은 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      await axios.post(this.endpoints.lineBatchCreate(driveChannelSeq), message)
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '배치 라인 생성에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 배치 라인 수정
  async updateDocumentLines(driveChannelSeq, message) {
    if (!this.isPersonal || !this.endpoints.lineBatchUpdate) {
      throw new Error('배치 라인 수정은 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      await axios.put(this.endpoints.lineBatchUpdate(driveChannelSeq), message)
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '배치 라인 수정에 실패했습니다.')
    }
  }

  // 개인 드라이브 전용: 배치 라인 삭제
  async deleteDocumentLines(driveChannelSeq, message) {
    if (!this.isPersonal || !this.endpoints.lineBatchDelete) {
      throw new Error('배치 라인 삭제는 개인 드라이브에서만 사용 가능합니다.')
    }
    try {
      await axios.delete(this.endpoints.lineBatchDelete(driveChannelSeq), { data: message })
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '배치 라인 삭제에 실패했습니다.')
    }
  }

  // 아이템 이동
  async moveItem(itemId, itemType, newParentId, driveChannelSeq) {
    try {
      await axios.patch(this.endpoints.move, {
        itemId,
        driveChannelSeq,
        itemType,
        newParentSeq: newParentId
      })
      
      return createApiResponse(true)
    } catch (error) {
      return handleApiError(error, '이동에 실패했습니다.')
    }
  }

  // 폴더 순서 변경
  async reorderFolder(folderId, newOrder, driveChannelSeq) {
    try {
      await axios.patch(this.endpoints.reorder, {
        itemId: folderId,
        driveChannelSeq,
        newOrder: newOrder
      })
      
      console.log('✅ 폴더 순서 변경 성공')
      return createApiResponse(true)
    } catch (error) {
      console.error('❌ 폴더 순서 변경 실패:', error)
      return handleApiError(error, '순서 변경에 실패했습니다.')
    }
  }

  // 전체 폴더 계층구조 조회
  async getAllFolders(driveChannelSeq) {
    try {
      const response = await axios.get(this.endpoints.allFolders(driveChannelSeq))
      
      return createApiResponse(true, convertFolderTree(response.data.data, driveChannelSeq, this.isPersonal))
    } catch (error) {
      return handleApiError(error, '폴더 목록 조회에 실패했습니다.')
    }
  }

  // 개인 공유문서를 프로젝트로 이동
  async movePersonalToProject(personalDriveChannelSeq, personalDocumentSeq, projectDriveChannelSeq, newDocumentName = null) {
    try {
      if (!this.isPersonal) {
        return createApiResponse(false, null, '개인 드라이브에서만 사용 가능합니다.')
      }

      const response = await axios.post(
        this.endpoints.moveToProject,
        {
          personalDocumentSeq,
          personalDriveChannelSeq,
          projectDriveChannelSeq,
          newDocumentName
        }
      )
      
      return createApiResponse(true, DriveItem.fromApiFormat({
        ...response.data.data,
        driveChannelSeq: projectDriveChannelSeq,
        isPersonal: false
      }))
    } catch (error) {
      return handleApiError(error, '프로젝트로 이동에 실패했습니다.')
    }
  }

  // 문서 참여자 목록 조회
  async getDocumentParticipants(documentId) {
    try {
      const response = await axios.get(this.endpoints.documentParticipants(documentId))
      
      return createApiResponse(true, response.data.data)
    } catch (error) {
      return handleApiError(error, '참여자 목록 조회에 실패했습니다.')
    }
  }

  // 문서 라인 락 목록 조회
  async getDocumentLocks(driveChannelSeq, documentSeq) {
    try {
      const response = await axios.get(this.endpoints.documentLocks(driveChannelSeq, documentSeq))
      
      return createApiResponse(true, response.data.data)
    } catch (error) {
      return handleApiError(error, '라인 락 목록 조회에 실패했습니다.')
    }
  }
}

// 프로젝트 드라이브 API 인스턴스
export const projectDriveApi = new DriveApiBase(false)

// 개인 드라이브 API 인스턴스
export const personalDriveApi = new DriveApiBase(true)

// 인스턴스에 downloadDocument 함수 추가 (기존 인스턴스에 함수 추가)
projectDriveApi.downloadDocument = async function(documentSeq, driveChannelSeq) {
  try {
    const response = await axios.get(this.endpoints.documentDownload(driveChannelSeq, documentSeq), { 
      responseType: 'blob' 
    })
    
    return createApiResponse(true, response.data)
  } catch (error) {
    return handleApiError(error, '문서 다운로드에 실패했습니다.')
  }
}

personalDriveApi.downloadDocument = async function(documentSeq, driveChannelSeq) {
  try {
    const response = await axios.get(this.endpoints.documentDownload(driveChannelSeq, documentSeq), { 
      responseType: 'blob' 
    })
    
    return createApiResponse(true, response.data)
  } catch (error) {
    return handleApiError(error, '문서 다운로드에 실패했습니다.')
  }
}

// 통합 드라이브 API (하위 호환성을 위해 유지)
export const driveApi = {
  // 드라이브 아이템 목록 조회
  async getItems(driveChannelSeq, parentFolderSeq = null, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.getItems(driveChannelSeq, parentFolderSeq)
  },

  // 폴더 생성
  async createFolder(name, driveChannelSeq, parentFolderSeq = null, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.createFolder(name, driveChannelSeq, parentFolderSeq)
  },

  // 공유문서 생성
  async createSharedDocument(name, driveChannelSeq, parentFolderSeq = null, isPersonal = false, isLocked = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.createSharedDocument(name, driveChannelSeq, parentFolderSeq, isLocked)
  },

  // 파일 업로드
  async uploadFiles(files, driveChannelSeq, parentFolderSeq = null, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.uploadFiles(files, driveChannelSeq, parentFolderSeq)
  },

  // 아이템 삭제
  async deleteItem(itemId, itemType, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.deleteItem(itemId, itemType, driveChannelSeq)
  },

  // 폴더 이름 변경
  async renameFolder(folderId, newName, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.renameFolder(folderId, newName, driveChannelSeq)
  },

  // 문서 이름 변경
  async renameDocument(documentId, newName, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.renameDocument(documentId, newName, driveChannelSeq)
  },

  // 파일 다운로드
  async downloadFile(documentId, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.downloadFile(documentId, driveChannelSeq)
  },

  // 공유문서 내용 조회
  async getDocumentContent(documentId, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.getDocumentContent(documentId, driveChannelSeq)
  },

  // 공유문서 내용 저장
  async saveDocumentContent(documentId, driveChannelSeq, content, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.saveDocumentContent(documentId, driveChannelSeq, content)
  },

  // 공유문서 잠금/해제 토글
  async toggleDocumentLock(documentId, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.toggleDocumentLock(documentId, driveChannelSeq)
  },

  // 공유문서 다운로드
  async downloadDocument(documentId, driveChannelSeq, isPersonal = false) {
    try {
      const endpoint = isPersonal 
        ? `/drive/personal/${driveChannelSeq}/documents/${documentId}/download`
        : `/drive/project/${driveChannelSeq}/documents/${documentId}/download`
      
      const response = await axios.get(endpoint, { responseType: 'blob' })
      
      return createApiResponse(true, response.data)
    } catch (error) {
      return handleApiError(error, '문서 다운로드에 실패했습니다.')
    }
  },

  // 아이템 이동
  async moveItem(itemId, itemType, newParentSeq, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.moveItem(itemId, itemType, newParentSeq, driveChannelSeq)
  },

  // 폴더 순서 변경
  async reorderFolder(folderId, newOrder, driveChannelSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.reorderFolder(folderId, newOrder, driveChannelSeq)
  },

  // 문서 참여자 목록 조회
  async getDocumentParticipants(documentId, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.getDocumentParticipants(documentId)
  },

  // 문서 라인 락 목록 조회
  async getDocumentLocks(driveChannelSeq, documentSeq, isPersonal = false) {
    const api = isPersonal ? personalDriveApi : projectDriveApi
    return api.getDocumentLocks(driveChannelSeq, documentSeq)
  }
}