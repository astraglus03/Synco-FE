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

  getFileExtension() {
    if (!this.name || this.type === 'folder' || this.type === 'shared-doc') return null
    const parts = this.name.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null
  }

  getDefaultIcon() {
    // 폴더와 공유문서는 타입으로 처리
    if (this.type === 'folder') return 'mdi-folder'
    if (this.type === 'shared-doc') return 'mdi-file-document-edit'
    
    // 파일 확장자 기반으로 아이콘 결정
    const ext = this.getFileExtension()
    if (!ext) return 'mdi-file'
    
    // 프로그래밍 언어 파일
    if (ext === 'vue') return 'mdi-vuejs'
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'mdi-language-javascript'
    if (['java', 'kt'].includes(ext)) return 'mdi-language-java'
    if (['py', 'pyc'].includes(ext)) return 'mdi-language-python'
    if (['rb', 'erb'].includes(ext)) return 'mdi-language-ruby'
    if (['go'].includes(ext)) return 'mdi-language-go'
    if (['php'].includes(ext)) return 'mdi-language-php'
    if (['swift'].includes(ext)) return 'mdi-language-swift'
    if (['c', 'cpp', 'cxx', 'h', 'hpp'].includes(ext)) return 'mdi-language-cpp'
    if (['cs'].includes(ext)) return 'mdi-language-csharp'
    if (['rs'].includes(ext)) return 'mdi-language-rust'
    if (['html', 'htm', 'xhtml'].includes(ext)) return 'mdi-language-html5'
    if (['css', 'scss', 'sass', 'less'].includes(ext)) return 'mdi-language-css3'
    if (['xml', 'yml', 'yaml', 'json'].includes(ext)) return 'mdi-code-json'
    
    // 이미지 파일
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'].includes(ext)) {
      return 'mdi-file-image'
    }
    
    // 비디오 파일
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp'].includes(ext)) {
      return 'mdi-file-video'
    }
    
    // 오디오 파일
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
      return 'mdi-file-music'
    }
    
    // 문서 파일
    if (ext === 'pdf') return 'mdi-file-pdf-box'
    if (['doc', 'docx'].includes(ext)) return 'mdi-file-word-box'
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'mdi-file-excel-box'
    if (['ppt', 'pptx'].includes(ext)) return 'mdi-file-powerpoint-box'
    if (['txt', 'md', 'markdown'].includes(ext)) return 'mdi-file-document'
    
    // 아카이브 파일
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'mdi-folder-zip'
    
    // 기타
    return 'mdi-file'
  }

  getDefaultColor() {
    // 폴더와 공유문서는 타입으로 처리
    if (this.type === 'folder') return '#FFA726'
    if (this.type === 'shared-doc') return '#3F51B5'
    
    // 파일 확장자 기반으로 색상 결정
    const ext = this.getFileExtension()
    if (!ext) return '#9E9E9E'
    
    // 프로그래밍 언어 파일
    if (ext === 'vue') return '#42B883' // Vue 공식 색상
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return '#F7DF1E' // JavaScript 노란색
    if (['java', 'kt'].includes(ext)) return '#ED8B00' // Java 오렌지
    if (['py', 'pyc'].includes(ext)) return '#3776AB' // Python 파란색
    if (['rb', 'erb'].includes(ext)) return '#CC342D' // Ruby 빨간색
    if (['go'].includes(ext)) return '#00ADD8' // Go 청록색
    if (['php'].includes(ext)) return '#777BB4' // PHP 보라색
    if (['swift'].includes(ext)) return '#FA7343' // Swift 오렌지
    if (['c', 'cpp', 'cxx', 'h', 'hpp'].includes(ext)) return '#00599C' // C++ 파란색
    if (['cs'].includes(ext)) return '#239120' // C# 초록색
    if (['rs'].includes(ext)) return '#000000' // Rust 검정
    if (['html', 'htm', 'xhtml'].includes(ext)) return '#E34F26' // HTML 주황색
    if (['css', 'scss', 'sass', 'less'].includes(ext)) return '#1572B6' // CSS 파란색
    if (['xml', 'yml', 'yaml', 'json'].includes(ext)) return '#2C3E50' // JSON 어두운 파란색
    
    // 이미지 파일
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'].includes(ext)) {
      return '#4CAF50'
    }
    
    // 비디오 파일
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp'].includes(ext)) {
      return '#F44336'
    }
    
    // 오디오 파일
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
      return '#9C27B0'
    }
    
    // 문서 파일
    if (ext === 'pdf') return '#E91E63'
    if (['doc', 'docx'].includes(ext)) return '#2196F3'
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#4CAF50'
    if (['ppt', 'pptx'].includes(ext)) return '#FF5722'
    if (['txt', 'md', 'markdown'].includes(ext)) return '#607D8B'
    
    // 아카이브 파일
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return '#FF9800'
    
    // 기타
    return '#9E9E9E'
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
