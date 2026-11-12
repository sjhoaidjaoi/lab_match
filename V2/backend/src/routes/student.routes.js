import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { todo } from '../utils/response.js'

const router = Router()
router.use(authenticate, requireRole('STUDENT'))

/**
 * 学生端接口占位（由学生端负责人实现）。
 * 教师端的「录取确认」页依赖这里的 confirm / abandon 两个动作。
 */

// 志愿：GET /api/student/preferences?batchId=1
router.get('/preferences', (req, res) => todo(res, '查询志愿', 'docs/API.md#9-学生端接口'))

// 提交/修改志愿：PUT /api/student/preferences
// { batchId, laboratoryIds: [1,2,3], obeyInternal, obeyCollege }
router.put('/preferences', (req, res) => todo(res, '提交志愿', 'docs/API.md#9-学生端接口'))

// 确认录取：POST /api/student/admissions/:studentId/confirm
router.post('/admissions/:studentId/confirm', (req, res) => todo(res, '学生确认录取', 'docs/API.md#9-学生端接口'))

// 超时/主动放弃：POST /api/student/admissions/:studentId/abandon
// 服务端负责：释放名额、按 alternates.order_no 补位、写 operation_logs
router.post('/admissions/:studentId/abandon', (req, res) => todo(res, '学生放弃录取', 'docs/API.md#9-学生端接口'))

// 个人结果：GET /api/student/result?batchId=1
router.get('/result', (req, res) => todo(res, '查询个人结果', 'docs/API.md#9-学生端接口'))

export default router
