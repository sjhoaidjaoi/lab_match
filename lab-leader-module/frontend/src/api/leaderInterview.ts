import { del, get, post, put } from './request'
import type {
  InterviewSchedule,
  InterviewSession,
  InterviewSessionSaveReq,
  PublishScheduleResp,
  ScheduleAdjustReq,
  ScheduleAssignReq,
  UnassignedStudent
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
 * 取消发布并重排，已发布场次回退为草稿并通知学生。
 */
export function cancelInterviewPublish(
  roundId: number,
  reason: string
): Promise<PublishScheduleResp> {
  return post<PublishScheduleResp>('/leader/interview-sessions/publish/cancel', { roundId, reason })
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

/**
 * 本室已提交意向但尚未排期的学生。
 */
export function listUnassignedStudents(roundId?: number): Promise<UnassignedStudent[]> {
  return get<UnassignedStudent[]>('/leader/interview-schedules/unassigned', {
    params: roundId ? { roundId } : undefined
  })
}

/**
 * 将未排期学生分配到草稿场次。
 */
export function assignInterviewSchedule(payload: ScheduleAssignReq): Promise<number> {
  return post<number>('/leader/interview-schedules/assign', payload)
}

/**
 * 登记面试状态：2 已完成、3 缺席。
 */
export function updateInterviewScheduleStatus(id: number, status: number): Promise<void> {
  return put<void>(`/leader/interview-schedules/${id}/status`, { status })
}
