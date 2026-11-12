import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { todo, ok } from '../utils/response.js'

const router = Router()

/**
 * 登录契约（待公共模块实现）：
 * POST /api/auth/login
 * { "username": "2025017001", "password": "******" }
 * → { "token": "<JWT>", "user": { "id": 1, "role": "STUDENT", "realName": "张明",
 *      "laboratoryId": 1, "laboratoryName": "智能感知与机器人实训室",
 *      "laboratories": [{ "id": 1, "name": "..." }] } }
 *
 * JWT payload 至少包含：sub、role、laboratoryId、laboratories[]。
 * 教师/组长的 laboratoryId 由服务端决定，前端不得传参指定。
 */
router.post('/login', (req, res) => todo(res, '账号登录', 'docs/API.md#12-认证与登录'))

router.get('/me', authenticate, (req, res) => ok(res, req.user))

export default router
