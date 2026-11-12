import request from './request'

/**
 * 认证契约（公共模块实现前返回 501，见 docs/API.md#12-认证与登录）
 * login → { token, user: { id, role, realName, laboratoryId, laboratoryName, laboratories[] } }
 */
export const login = (data) => request.post('/auth/login', data)
export const getMe = () => request.get('/auth/me')
