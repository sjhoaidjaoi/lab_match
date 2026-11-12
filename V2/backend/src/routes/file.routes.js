import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { todo } from '../utils/response.js'

const router = Router()
router.use(authenticate)

/**
 * 文件与简历附件占位（公共模块）。
 * 教师端「学生简历 → 附件查看」依赖 GET /api/files/:id。
 */

// 上传：POST /api/files (multipart/form-data) → { id, name, size, url }
router.post('/', (req, res) => todo(res, '文件上传', 'docs/API.md#11-文件与附件'))

// 下载/预览：GET /api/files/:id → 302 或文件流，需鉴权与范围校验
router.get('/:id', (req, res) => todo(res, '文件下载', 'docs/API.md#11-文件与附件'))

export default router
