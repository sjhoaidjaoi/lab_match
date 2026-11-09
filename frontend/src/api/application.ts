import { http } from './request'
import type { ApplicationView } from '@/types'

export interface ApplicationPayload {
  cycleId: number
  round: number
  mentorIds: number[]
  acceptL1: boolean
  acceptL2: boolean
}

export const applicationApi = {
  mine: (cycleId: number, round: number) =>
    http.get<ApplicationView>('/applications/mine', { cycleId, round }),
  save: (payload: ApplicationPayload) => http.put<ApplicationView>('/applications/mine', payload),
  submit: (payload: ApplicationPayload) => http.post<ApplicationView>('/applications/mine/submit', payload)
}
