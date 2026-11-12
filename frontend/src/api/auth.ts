import { post } from './request'
import type { ChangePasswordReq, LoginReq, LoginResp, TokenResp } from '@/types/auth'

export function login(data: LoginReq): Promise<LoginResp> {
  return post<LoginResp>('/auth/login', data)
}

export function logout(): Promise<void> {
  return post<void>('/auth/logout')
}

export function refreshToken(): Promise<TokenResp> {
  return post<TokenResp>('/auth/refresh')
}

export function changePassword(data: ChangePasswordReq): Promise<void> {
  return post<void>('/auth/change-password', data)
}
