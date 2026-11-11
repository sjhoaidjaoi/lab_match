import { del, get, post, put } from './request'
import type {
  InterviewSchedule,
  InterviewSession,
  InterviewSessionSaveReq,
  PublishScheduleResp,
  ScheduleAdjustReq
} from '@/types/interview'

/**
 * 本室面试场次列表。
 */
export function listInterviewSessions(roundId?: number): Promise<InterviewSession[]> {
  return get<InterviewSession[]>('/leader/interview-sessions', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 新增面试场次。
 */
export function createInterviewSession(payload: InterviewSessionSaveReq): Promise<number> {
  return post<number>('/leader/interview-sessions', payload)
}

/**
 * 修改面试场次。
 */
export function updateInterviewSession(
  id: number,
  payload: InterviewSessionSaveReq
): Promise<void> {
  return put<void>(`/leader/interview-sessions/${id}`, payload)
}

/**
 * 删除面试场次。
 */
export function deleteInterviewSession(id: number): Promise<void> {
  return del<void>(`/leader/interview-sessions/${id}`)
}

/**
 * 发布本室面试排期。
 */
export function publishInterviewSchedules(roundId: number): Promise<PublishScheduleResp> {
  return post<PublishScheduleResp>('/leader/interview-sessions/publish', { roundId })
}

/**
 * 本室面试排期列表。
 */
export function listInterviewSchedules(roundId?: number): Promise<InterviewSchedule[]> {
  return get<InterviewSchedule[]>('/leader/interview-schedules', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 按意向导师聚合自动分配本室学生。
 */
export function autoScheduleInterviews(roundId: number): Promise<void> {
  return post<void>('/leader/interview-schedules/auto', { roundId })
}

/**
 * 手工调整排期到草稿场次。
 */
export function adjustInterviewSchedules(payload: ScheduleAdjustReq): Promise<void> {
  return put<void>('/leader/interview-schedules', payload)
}
