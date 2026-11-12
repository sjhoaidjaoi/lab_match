import { get, put } from '@/api/request'
import type { ProfileInfo, ProfileUpdateReq } from '@/types/profile'

/** 查询学生个人信息 */
export function getStudentProfile(): Promise<ProfileInfo> {
  return get<ProfileInfo>('/student/profile')
}

/** 修改学生个人信息 */
export function updateStudentProfile(data: ProfileUpdateReq): Promise<void> {
  return put<void>('/student/profile', data)
}

/** 查询导师个人信息 */
export function getTeacherProfile(): Promise<ProfileInfo> {
  return get<ProfileInfo>('/teacher/profile')
}

/** 修改导师个人信息 */
export function updateTeacherProfile(data: ProfileUpdateReq): Promise<void> {
  return put<void>('/teacher/profile', data)
}
