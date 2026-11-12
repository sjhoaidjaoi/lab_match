import request from './request'

/**
 * 文件与简历附件契约（公共模块）。
 * 教师端「学生简历 → 附件查看」改为调用 getFileUrl(id)。
 */
export const uploadFile = (formData) =>
  request.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getFileUrl = (id) => request.get(`/files/${id}`)
