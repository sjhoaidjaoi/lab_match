import { get } from './request'
import type { CurrentRound } from '@/types/student'

/**
 * 当前轮次与时间窗状态。
 */
export function getCurrentRound(): Promise<CurrentRound> {
  return get<CurrentRound>('/public/rounds/current')
}
