import { Router } from 'express'
import metaRoutes from './meta.routes.js'
import authRoutes from './auth.routes.js'
import teacherRoutes from './teacher.routes.js'
import studentRoutes from './student.routes.js'
import adminRoutes from './admin.routes.js'
import fileRoutes from './file.routes.js'
import notificationRoutes from './notification.routes.js'

const router = Router()

router.get('/health', (req, res) =>
  res.json({ code: 0, message: 'ok', data: { service: 'trs-backend', time: new Date().toISOString() } })
)

// 公开元数据：枚举、阶段模板
router.use('/meta', metaRoutes)
// 公共模块：登录
router.use('/auth', authRoutes)
// 教师 + 组长（本次负责范围，已实现接口骨架）
router.use('/teacher', teacherRoutes)
// 学生端 / 学院端 / 文件：契约占位，返回 501
router.use('/student', studentRoutes)
router.use('/admin', adminRoutes)
router.use('/files', fileRoutes)
router.use('/notifications', notificationRoutes)

export default router
