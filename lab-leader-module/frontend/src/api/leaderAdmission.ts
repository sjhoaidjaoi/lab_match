import request, { get } from './request'
import type { LeaderAdmissionSummary } from '@/types/admission'

/**
 * 本室录取确认汇总与名单。
 */
export function getLeaderAdmissions(params: {
  roundId?: number
  finalOnly?: boolean
}): Promise<LeaderAdmissionSummary> {
  return get<LeaderAdmissionSummary>('/leader/admissions', { params })
}

/**
 * 导出本室最终名单 Excel。
 */
export async function exportLeaderAdmissions(roundId?: number): Promise<Blob> {
  const response = await request.get<Blob>('/leader/admissions/export', {
    params: roundId ? { roundId } : undefined,
    responseType: 'blob'
  })
  return response.data
}
