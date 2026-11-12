import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { todo } from '../utils/response.js'

const router = Router()
router.use(authenticate, requireRole('COLLEGE_ADMIN'))

/**
 * 学院端接口占位（由学院端负责人实现）。
 * 教师/组长端的「提交学院审核」「名额」「最终名单」依赖以下接口。
 */

// 本室提交列表：GET /api/admin/submissions?batchId=1&status=REVIEWING
router.get('/submissions', (req, res) => todo(res, '查询提交审核列表', 'docs/API.md#10-学院端接口'))

// 审核通过：POST /api/admin/submissions/:id/approve
router.post('/submissions/:id/approve', (req, res) => todo(res, '审核通过', 'docs/API.md#10-学院端接口'))

// 审核退回：POST /api/admin/submissions/:id/reject  { reason }
router.post('/submissions/:id/reject', (req, res) => todo(res, '审核退回', 'docs/API.md#10-学院端接口'))

// 调整名额：PUT /api/admin/labs/:id/quota  { quota, reason }
router.put('/labs/:id/quota', (req, res) => todo(res, '调整实训室名额', 'docs/API.md#10-学院端接口'))

// 发布公示：POST /api/admin/batches/:id/publish
router.post('/batches/:id/publish', (req, res) => todo(res, '发布录取公示', 'docs/API.md#10-学院端接口'))

export default router
