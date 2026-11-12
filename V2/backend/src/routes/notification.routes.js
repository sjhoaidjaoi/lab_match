import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { todo } from '../utils/response.js'

const router = Router()
router.use(authenticate)

/**
 * 站内通知占位（公共模块）。
 * 触发场景：学生确认/放弃、学院退回、调剂结果、阶段变更。
 */
// GET /api/notifications?unread=1
router.get('/', (req, res) => todo(res, '查询通知', 'docs/API.md#15-通知'))

// POST /api/notifications/read  { ids: [1,2] }
router.post('/read', (req, res) => todo(res, '标记通知已读', 'docs/API.md#15-通知'))

export default router
