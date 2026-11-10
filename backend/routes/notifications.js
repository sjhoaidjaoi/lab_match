// ============ 站内消息通知 ============
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth } = require('../middleware/auth')

const NoticeSchema = z.object({
  targetRole: z.string().optional(),
  targetUserId: z.number().int().optional(),
  title: z.string().min(1),
  content: z.string().optional().default('')
})

// 给自己的消息
router.get('/my', requireAuth, (req, res) => {
  const store = getStore()
  const list = store.notices.filter((n) => n.targetUserId === req.user.uid || !n.targetUserId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(ok(list))
})

// 发消息（角色：学院管理员 / 组长 / 教师）
router.post('/', requireAuth, (req, res) => {
  const body = NoticeSchema.parse(req.body || {})
  const store = getStore()
  const id = nextId(store.notices)
  const item = { id, ...body, createdBy: req.user.uid, createdAt: new Date().toISOString(), read: false }
  store.notices.push(item); persistStore(store)
  res.json(ok(item))
})

router.post('/:id/read', requireAuth, (req, res) => {
  const store = getStore()
  const idx = store.notices.findIndex((n) => n.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '消息不存在', data: null })
  store.notices[idx].read = true; persistStore(store)
  res.json(ok(store.notices[idx]))
})

module.exports = router
