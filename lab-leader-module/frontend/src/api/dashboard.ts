import { get } from './request'
import type { LeaderDashboard, StudentDashboard, TeacherDashboard } from '@/types/dashboard'

/**
 * 学生工作台聚合数据。
 */
export function getStudentDashboard(): Promise<StudentDashboard> {
  return get<StudentDashboard>('/student/dashboard')
}

/**
 * 导师工作台聚合数据。
 */
export function getTeacherDashboard(): Promise<TeacherDashboard> {
  return get<TeacherDashboard>('/teacher/dashboard')
}

/**
 * 本室负责人工作台聚合数据。
 */
export function getLeaderDashboard(): Promise<LeaderDashboard> {
  return get<LeaderDashboard>('/leader/dashboard')
}
