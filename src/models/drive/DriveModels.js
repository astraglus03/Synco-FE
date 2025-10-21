// 통합 드라이브 아이템 모델
export class DriveItem {
  constructor(data = {}) {
    this.id = data.id || null
    this.name = data.name || ''
    this.type = data.type || 'file' // 'folder', 'file', 'shared-doc'
    this.size = data.size || '-'
    this.uploadDate = data.uploadDate || new Date().toISOString()
    this.modifiedDate = data.modifiedDate || new Date().toISOString()
    this.parentFolderSeq = data.parentFolderSeq || null
    this.driveChannelSeq = data.driveChannelSeq || null
    this.isPersonal = data.isPersonal || false
    this.isLocked = data.isLocked || false
    this.isShared = data.isShared || false
    this.content = data.content || ''
    this.icon = data.icon || this.getDefaultIcon()
    this.color = data.color || this.getDefaultColor()
    
    // 파일 관련
    this.documentUrl = data.documentUrl || null
    this.documentType = data.documentType || null
    this.memberSeq = data.memberSeq || null
    
    // 폴더 순서 (문서는 0)
    this.orders = data.orders
    
    // 하위 아이템 (폴더인 경우)
    this.children = data.children || []
  }

  getDefaultIcon() {
    switch (this.type) {
      case 'folder': return 'mdi-folder'
      case 'image': return 'mdi-image'
      case 'video': return 'mdi-video'
      case 'audio': return 'mdi-music'
      case 'pdf': return 'mdi-file-pdf-box'
      case 'word': return 'mdi-file-word-box'
      case 'excel': return 'mdi-file-excel-box'
      case 'powerpoint': return 'mdi-file-powerpoint-box'
      case 'text': return 'mdi-file-document'
      case 'shared-doc': return 'mdi-file-document-edit'
      default: return 'mdi-file'
    }
  }

  getDefaultColor() {
    switch (this.type) {
      case 'folder': return '#FFA726'
      case 'image': return '#4CAF50'
      case 'video': return '#F44336'
      case 'audio': return '#9C27B0'
      case 'pdf': return '#E91E63'
      case 'word': return '#2196F3'
      case 'excel': return '#4CAF50'
      case 'powerpoint': return '#FF5722'
      case 'text': return '#607D8B'
      case 'shared-doc': return '#3F51B5'
      default: return '#9E9E9E'
    }
  }

  // API 요청용 변환
  toApiFormat() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      size: this.size,
      uploadDate: this.uploadDate,
      modifiedDate: this.modifiedDate,
      parentFolderSeq: this.parentFolderSeq,
      driveChannelSeq: this.driveChannelSeq,
      isPersonal: this.isPersonal,
      isLocked: this.isLocked,
      isShared: this.isShared,
      content: this.content,
      documentUrl: this.documentUrl,
      documentType: this.documentType,
      memberSeq: this.memberSeq
    }
  }

  // API 응답에서 변환
  static fromApiFormat(apiData) {
    return new DriveItem({
      id: apiData.folderSeq || apiData.id, // 백엔드에서는 folderSeq 사용
      name: apiData.folderName || apiData.name, // 백엔드에서는 folderName 사용
      type: apiData.type || 'folder',
      size: apiData.size || '-',
      uploadDate: apiData.uploadDate,
      modifiedDate: apiData.modifiedDate,
      parentFolderSeq: apiData.parentFolderSeq,
      driveChannelSeq: apiData.driveChannelSeq,
      isPersonal: apiData.isPersonal || false,
      isLocked: apiData.isLocked || false,
      isShared: apiData.isShared || false,
      content: apiData.content || '',
      documentUrl: apiData.documentUrl,
      documentType: apiData.documentType,
      memberSeq: apiData.memberSeq,
      orders: apiData.orders || 0, // 폴더 순서 (문서는 0)
      children: apiData.children || []
    })
  }
}

// 문서 상세 정보 모델
export class DocumentDetail {
  constructor(data = {}) {
    this.id = data.id || null
    this.name = data.name || ''
    this.isLocked = data.isLocked || false
    this.content = data.content || [] // 라인별 배열
    this.fullContent = data.fullContent || '' // 전체 텍스트
  }

  static fromApiFormat(apiData) {
    return new DocumentDetail({
      id: apiData.id,
      name: apiData.name,
      isLocked: apiData.isLocked,
      content: apiData.content || [],
      fullContent: apiData.content ? apiData.content.join('\n') : ''
    })
  }
}

// 드라이브 채널 모델
export class DriveChannel {
  constructor(data = {}) {
    this.driveChannelSeq = data.driveChannelSeq || null
    this.workSpaceType = data.workSpaceType || 'PROJECT' // 'INDIVIDUAL', 'PROJECT'
    this.workspaceName = data.workspaceName || ''
    this.workspaceSeq = data.workspaceSeq || null
    this.isPersonal = data.workSpaceType === 'INDIVIDUAL'
  }

  static fromApiFormat(apiData) {
    return new DriveChannel({
      driveChannelSeq: apiData.driveChannelSeq,
      workSpaceType: apiData.workSpaceType,
      workspaceName: apiData.workspaceName,
      workspaceSeq: apiData.workspaceSeq
    })
  }
}
