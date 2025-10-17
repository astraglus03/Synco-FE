import { apiGet, apiPatch } from '@/utils/api'
import apiClient from '@/utils/api'

// API 엔드포인트 상수
const API_ENDPOINTS = {
  // 문서 관리
  GET_DOCUMENT: (driveChannelSeq, documentSeq) => `/drive-service/drive/project/${driveChannelSeq}/share-docs/${documentSeq}/list`,
  TOGGLE_DOCUMENT_LOCK: '/drive-service/drive/project/documents/lock',
  RENAME_DOCUMENT: '/drive-service/drive/project/document/rename',
  DOWNLOAD_DOCUMENT: (driveChannelSeq, documentSeq) => `/drive-service/drive/project/${driveChannelSeq}/documents/${documentSeq}/download`,
  SAVE_DOCUMENT_CONTENT: (driveChannelSeq, documentSeq) => `/drive-service/drive/project/${driveChannelSeq}/documents/${documentSeq}/content`,
}

/**
 * 문서 관리 API 함수들
 * 백엔드와의 문서 관련 통신을 담당
 */
export const documentApi = {
  // 문서 조회
  async getDocument(driveChannelSeq, documentSeq) {
    try {
      const data = await apiGet(API_ENDPOINTS.GET_DOCUMENT(driveChannelSeq, documentSeq))
      return { success: true, data }
    } catch (error) {
      console.error('문서 조회 실패:', error)
      return { success: false, error: error.message }
    }
  },

  // 문서 잠금/해제 토글
  async toggleDocumentLock(driveChannelSeq, documentSeq) {
    try {
      const data = await apiPatch(API_ENDPOINTS.TOGGLE_DOCUMENT_LOCK, {
        driveChannelSeq,
        documentSeq
      })
      return { success: true, data }
    } catch (error) {
      console.error('문서 잠금 상태 변경 실패:', error)
      return { success: false, error: error.message }
    }
  },

  // 문서 이름 변경
  async renameDocument(driveChannelSeq, documentSeq, newName) {
    try {
      const data = await apiPatch(API_ENDPOINTS.RENAME_DOCUMENT, {
        driveChannelSeq,
        documentSeq,
        newDocumentName: newName
      })
      return { success: true, data }
    } catch (error) {
      console.error('문서 이름 변경 실패:', error)
      return { success: false, error: error.message }
    }
  },

  // 문서 다운로드
  async downloadDocument(driveChannelSeq, documentSeq, fileName) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOWNLOAD_DOCUMENT(driveChannelSeq, documentSeq), {
        responseType: 'blob'
      })
      
      // 파일 다운로드 처리
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${fileName || 'document'}.txt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      return { success: true }
    } catch (error) {
      console.error('문서 다운로드 실패:', error)
      return { success: false, error: error.message }
    }
  },

  // 문서 내용 저장 (YJS 업데이트)
  async saveDocumentContent(driveChannelSeq, documentSeq, content) {
    try {
      const data = await apiPatch(API_ENDPOINTS.SAVE_DOCUMENT_CONTENT(driveChannelSeq, documentSeq), {
        content
      })
      return { success: true, data }
    } catch (error) {
      console.error('문서 내용 저장 실패:', error)
      return { success: false, error: error.message }
    }
  }
}
