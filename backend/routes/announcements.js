// ============ 学院公告 ============
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

const AnnouncementSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(''),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional().default('PUBLISHED')
})

router.get('/', (_req, res) => {
  const store = getStore()
  const list = store.announcements
    .filter((a) => a.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(ok(list))
})

// 学院端：全部公告（含草稿）
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const list = [...store.announcements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(ok(list))
})

router.post('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = AnnouncementSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS')?.id || null
  const id = nextId(store.announcements)
  const item = { id, ...body, batchId: activeBatch, createdBy: req.user.uid, createdAt: new Date().toISOString() }
  store.announcements.push(item); persistStore(store)
  res.json(ok(item))
})

router.put('/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const idx = store.announcements.findIndex((a) => a.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '公告不存在', data: null })
  const body = AnnouncementSchema.partial().parse(req.body || {})
  store.announcements[idx] = { ...store.announcements[idx], ...body }; persistStore(store)
  res.json(ok(store.announcements[idx]))
})

router.delete('/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  store.announcements = store.announcements.filter((a) => a.id !== Number(req.params.id))
  persistStore(store); res.json(ok(null, '已删除'))
})

module.exports = router
