import request from './request'

/**
 * 学生端契约（学生端负责人实现）。
 * 教师端录取确认页依赖 confirm / abandon 的真实写入。
 */
export const getPreferences = (params) => request.get('/student/preferences', { params })
export const savePreferences = (data) => request.put('/student/preferences', data)
export const confirmAdmission = (studentId, data) =>
  request.post(`/student/admissions/${studentId}/confirm`, data)
export const abandonAdmission = (studentId, data) =>
  request.post(`/student/admissions/${studentId}/abandon`, data)
export const getResult = (params) => request.get('/student/result', { params })
