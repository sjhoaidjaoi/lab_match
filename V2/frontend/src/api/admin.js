import request from './request'

/**
 * 学院端契约（学院端负责人实现）。
 * 组长提交审核后，状态流转依赖 approve / reject。
 */
export const getSubmissions = (params) => request.get('/admin/submissions', { params })
export const approveSubmission = (id, data) => request.post(`/admin/submissions/${id}/approve`, data)
export const rejectSubmission = (id, data) => request.post(`/admin/submissions/${id}/reject`, data)
export const setLabQuota = (labId, data) => request.put(`/admin/labs/${labId}/quota`, data)
export const publishResults = (batchId, data) => request.post(`/admin/batches/${batchId}/publish`, data)
