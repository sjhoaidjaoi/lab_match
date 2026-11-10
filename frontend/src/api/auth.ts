import { http } from './request'
import type { LoginResponse, MeResponse } from '@/types'

export interface LoginPayload {
  username: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) => http.post<LoginResponse>('/auth/login', payload),
  me: () => http.get<MeResponse>('/auth/me'),
  switchRole: (roleCode: string) => http.post<LoginResponse>('/auth/switch-role', { roleCode }),
  logout: () => http.post<void>('/auth/logout'),
  users: () => http.get<unknown[]>('/auth/users')
}
