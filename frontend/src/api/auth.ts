import { http } from './request'
import type { LoginResponse, MeResponse } from '@/types'

export interface LoginPayload {
  username: string
  password: string
}

export const authApi = {
  login: (payload: LoginPayload) => http.post<LoginResponse>('/auth/login', payload),
  me: () => http.get<MeResponse>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.put<LoginResponse>('/auth/password', { oldPassword, newPassword }),
  switchRole: (roleCode: string) => http.post<LoginResponse>('/auth/switch-role', { roleCode }),
  logout: (token: string) => http.post<void>('/auth/logout', undefined, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  users: () => http.get<unknown[]>('/auth/users')
}
