import request from './request'

// 通知契约（公共模块实现前返回 501）
export const getNotifications = (params) => request.get('/notifications', { params })
export const markNotificationsRead = (ids) => request.post('/notifications/read', { ids })
