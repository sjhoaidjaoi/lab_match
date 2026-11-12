import { get, post, put } from './request'
import type {
  MentorCreateReq,
  MentorListItem,
  MentorSaveReq,
  PageResult,
  StudentImportResult
} from '@/types/basic'

/**
 * 教师账号列表（管理端）。
 */
export function listMentors(params: {
  labId?: number
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<MentorListItem>> {
  return get<PageResult<MentorListItem>>('/admin/mentors', { params })
}

/**
 * 新增教师账号。
 */
export function createMentor(payload: MentorCreateReq): Promise<number> {
  return post<number>('/admin/mentors', payload)
}

/**
 * 编辑教师账号，工号创建后不可修改。
 */
export function updateMentor(id: number, payload: MentorSaveReq): Promise<void> {
  return put<void>(`/admin/mentors/${id}`, payload)
}

/**
 * 批量导入教师，返回成功数与失败明细。
 */
export function importMentors(file: File): Promise<StudentImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  return post<StudentImportResult>('/admin/mentors/import', formData)
}

/**
 * 重置教师密码为系统初始密码。
 */
export function resetMentorPassword(id: number): Promise<void> {
  return post<void>(`/admin/mentors/${id}/reset-password`)
}

/**
 * 启用 / 禁用教师账号。
 */
export function updateMentorStatus(id: number, status: number): Promise<void> {
  return put<void>(`/admin/mentors/${id}/status`, { status })
}

/**
 * 管理员强制调整导师名额，必须填写理由并留痕。
 */
export function forceAdjustMentorQuota(
  id: number,
  payload: { quota: number; reason: string }
): Promise<void> {
  return put<void>(`/admin/mentors/${id}/quota`, payload)
}
