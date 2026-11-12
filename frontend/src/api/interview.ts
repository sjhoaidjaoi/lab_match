import { get } from './request'
import type { StudentInterview } from '@/types/interview'

/**
 * 我的面试安排。
 */
export function listMyInterviews(roundId?: number): Promise<StudentInterview[]> {
  return get<StudentInterview[]>('/student/interviews', {
    params: roundId ? { roundId } : undefined
  })
}
