import request, { get, post } from './request'
import type {
  AdmissionAdjustReq,
  AdmissionAdjustResp,
  ResultOverview,
  ResultQuery,
  RoundLockResp,
  RoundSnapshotItem,
  RoundUnlockResp,
  SnapshotGenerateResp,
  SnapshotType
} from '@/types/archive'

/**
 * 全院录取总览，归档后由后端从最终快照渲染。
 */
export function getResultOverview(query: ResultQuery): Promise<ResultOverview> {
  const { roundId, labId, mentorId, keyword, status, pageNum, pageSize } = query
  return get<ResultOverview>('/admin/results', {
    params: { roundId, labId, mentorId, keyword, status, pageNum, pageSize }
  })
}

/**
 * 导出录取 Excel，后端直接返回文件流。
 */
export async function exportResultExcel(query: ResultQuery): Promise<Blob> {
  const { roundId, labId, mentorId } = query
  const response = await request.get<Blob>('/admin/results/export', {
    params: { roundId, labId, mentorId },
    responseType: 'blob'
  })
  return response.data
}

/**
 * 阶段内调整录取：确认 / 取消 / 改派 / 置放弃，必须填写原因。
 */
export function adjustAdmission(
  id: number,
  payload: AdmissionAdjustReq
): Promise<AdmissionAdjustResp> {
  return post<AdmissionAdjustResp>(`/admin/admissions/${id}/adjust`, payload)
}

/**
 * 生成轮次快照，追加写入并返回新版本号。
 */
export function generateSnapshot(roundId: number, snapshotType: SnapshotType): Promise<SnapshotGenerateResp> {
  return post<SnapshotGenerateResp>(`/admin/rounds/${roundId}/snapshot`, { snapshotType })
}

/**
 * 查询轮次快照历史。
 */
export function listSnapshots(roundId: number, snapshotType?: SnapshotType): Promise<RoundSnapshotItem[]> {
  return get<RoundSnapshotItem[]>(`/admin/rounds/${roundId}/snapshots`, {
    params: { snapshotType }
  })
}

/**
 * 批次锁定。
 */
export function lockRound(roundId: number, reason: string): Promise<RoundLockResp> {
  return post<RoundLockResp>(`/admin/rounds/${roundId}/lock`, { reason })
}

/**
 * 批次解锁，需要管理员密码二次验证。
 */
export function unlockRound(
  roundId: number,
  confirmPassword: string,
  reason: string
): Promise<RoundUnlockResp> {
  return post<RoundUnlockResp>(`/admin/rounds/${roundId}/unlock`, { confirmPassword, reason })
}
