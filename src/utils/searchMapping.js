// 검색 결과 타입별 아이콘/색/라벨 매핑
export const getSearchItemMeta = (type) => {
  const map = {
    message: { icon: 'mdi-message', color: 'primary', label: 'MESSAGE' },
    file: { icon: 'mdi-file-document', color: 'orange', label: 'FILE' },
    task: { icon: 'mdi-checkbox-marked-outline', color: 'purple', label: 'TASK' },
    meeting: { icon: 'mdi-video', color: 'red', label: 'MEETING' },
  }
  return map[type] || { icon: 'mdi-file', color: 'grey', label: type?.toUpperCase?.() || 'ITEM' }
}

// 결과 항목을 라우트 경로로 변환
// workspaceSeq: number|string, item: { id, type, channelId? }
export const buildSearchNavigationPath = (workspaceSeq, item) => {
  if (!workspaceSeq || !item?.type) return '/'

  // id는 "type_seq" 포맷("task_123")일 수 있으므로 숫자 추출
  const extractSeq = (str) => {
    if (typeof str !== 'string') return str
    const m = str.match(/_(\d+)$/)
    return m ? m[1] : str
  }

  const ws = String(workspaceSeq)
  const idSeq = extractSeq(item.id)
  const channelSeq = extractSeq(item.channelId)

  switch (item.type) {
    case 'message':
      return channelSeq ? `/workspaces/${ws}/chats?channel=${channelSeq}&messageId=${idSeq}` : `/workspaces/${ws}/chats`
    case 'file':
      return `/workspaces/${ws}/drive?fileId=${idSeq}`
    case 'task':
      return `/workspaces/${ws}/tasks/${idSeq}`
    case 'meeting':
      return `/workspaces/${ws}/meetings/${idSeq}`
    default:
      return `/workspaces/${ws}`
  }
}


