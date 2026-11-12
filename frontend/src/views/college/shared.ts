// 学院总负责人端共享常量与工具

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: '学生',
  LAB_TEACHER: '实训室教师',
  LAB_LEADER: '实训室组长',
  COLLEGE_ADMIN: '学院总负责人'
}

export const STAGE_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  PAUSED: '已暂停'
}

export const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: '待面试',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
}

export const RECOMMENDATION_LABELS: Record<string, string> = {
  PENDING: '待定',
  INTENDED: '建议拟录取',
  ALTERNATE: '建议递补',
  REJECTED: '不建议录取'
}

export const ADMISSION_TYPE_LABELS: Record<string, string> = {
  INTENDED: '拟录取',
  ALTERNATE: '递补'
}

export const ADMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: '待学生确认',
  CONFIRMED: '已确认',
  REJECTED: '已放弃',
  EXPIRED: '已逾期'
}

export const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  INTERNAL: '内部调剂',
  CROSS_LAB: '跨实训室调剂',
  MANUAL_PLACEMENT: '沟通安置'
}

export const ADJUSTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: '待审核',
  CONFIRMED: '已确认',
  REJECTED: '已驳回'
}

export const FINAL_STATUS_LABELS: Record<string, string> = {
  ADMITTED: '拟录取',
  ENROLLED: '已入组',
  REJECTED: '已取消'
}

export const SOURCE_LABELS: Record<string, string> = {
  INTENDED_CONFIRMED: '拟录取确认',
  INTERNAL: '内部调剂',
  CROSS_LAB: '跨实训室调剂',
  MANUAL_PLACEMENT: '沟通安置'
}

export type TagType = 'success' | 'info' | 'warning' | 'danger' | 'primary'

export function statusTag(status?: string | null): TagType {
  if (!status) return 'info'
  if (['IN_PROGRESS', 'CONFIRMED', 'COMPLETED', 'ENROLLED', 'PUBLISHED'].includes(status)) return 'success'
  if (['PENDING', 'SCHEDULED', 'NOT_STARTED', 'DRAFT'].includes(status)) return 'warning'
  if (['REJECTED', 'CANCELLED', 'EXPIRED', 'INACTIVE'].includes(status)) return 'danger'
  return 'info'
}

export function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 导出 Excel（真正的 .xlsx 文件，按需加载 xlsx 以减小首屏体积） */
export async function exportExcel(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const XLSX = await import('xlsx')
  const data = [headers, ...rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : v)))]
  const sheet = XLSX.utils.aoa_to_sheet(data)
  sheet['!cols'] = headers.map((h, idx) => {
    const maxLen = rows.reduce((max, r) => Math.max(max, String(r[idx] ?? '').length), h.length)
    return { wch: Math.min(maxLen + 2, 40) }
  })
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1')
  XLSX.writeFile(book, filename.endsWith('.xlsx') ? filename : filename.replace(/\.csv$/i, '') + '.xlsx')
}
