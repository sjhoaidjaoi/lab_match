import { get, post, put } from './request'
import type {
  PageResult,
  StudentCreateReq,
  StudentImportResult,
  StudentListItem,
  StudentSaveReq
} from '@/types/basic'

/**
 * 学生账号列表（管理端）。
 */
export function listStudents(params: {
  keyword?: string
  status?: number
  pageNum?: number
  pageSize?: number
}): Promise<PageResult<StudentListItem>> {
  return get<PageResult<StudentListItem>>('/admin/students', { params })
}

/**
 * 新增学生账号。
 */
export function createStudent(payload: StudentCreateReq): Promise<number> {
  return post<number>('/admin/students', payload)
}

/**
 * 编辑学生账号，学号创建后不可修改。
 */
export function updateStudent(id: number, payload: StudentSaveReq): Promise<void> {
  return put<void>(`/admin/students/${id}`, payload)
}

/**
 * 启用 / 禁用学生账号。
 */
export function updateStudentStatus(id: number, status: number): Promise<void> {
  return put<void>(`/admin/students/${id}/status`, { status })
}

/**
 * 重置学生密码为系统初始密码。
 */
export function resetStudentPassword(id: number): Promise<void> {
  return post<void>(`/admin/students/${id}/reset-password`)
}

/**
 * 批量导入学生，返回成功与失败明细。
 */
export function importStudents(file: File): Promise<StudentImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  return post<StudentImportResult>('/admin/students/import', formData)
}
