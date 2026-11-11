import request, { get } from './request'
import type { QuotaOverviewItem } from '@/types/quota'

/** 全院名额总览 */
export function getQuotaOverview(): Promise<QuotaOverviewItem[]> {
  return get<QuotaOverviewItem[]>('/admin/quotas')
}

/** 导出名额 Excel */
export async function exportQuotas(): Promise<Blob> {
  const response = await request.get<Blob>('/admin/quotas/export', { responseType: 'blob' })
  return response.data
}
