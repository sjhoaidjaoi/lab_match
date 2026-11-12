// ============ 宣讲视频 + 720° 全景云游 ============
// 严格对齐新文档第一阶段 / 第二阶段需求

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

const VideoSchema = z.object({
  laboratoryId: z.number().int(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  videoType: z.enum(['MP4', 'LINK', 'EMBED']),
  videoUrl: z.string().min(1),
  coverUrl: z.string().optional().nullable(),
  durationSeconds: z.number().int().optional().nullable(),
  sortNo: z.number().int().optional().default(1),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional().default('PUBLISHED')
})

const PanoramaSchema = z.object({
  laboratoryId: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  panoramaType: z.enum(['LINK', 'IMAGE']),
  panoramaUrl: z.string().min(1),
  coverUrl: z.string().optional().nullable(),
  sortNo: z.number().int().optional().default(1),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional().default('PUBLISHED')
})

// ==== 视频：学生/教师公开读 ====
router.get('/videos', (_req, res) => {
  const store = getStore()
  const labId = Number(_req.query.labId || 0) || null
  let list = store.mediaVideos.filter((v) => v.status === 'PUBLISHED')
  if (labId) list = list.filter((v) => v.laboratoryId === labId)
  list = list.map((v) => {
    const lab = store.laboratories.find((l) => l.id === v.laboratoryId)
    return { ...v, laboratoryName: lab?.name || `实训室#${v.laboratoryId}` }
  }).sort((a, b) => a.sortNo - b.sortNo)
  res.json(ok(list))
})

router.get('/labs/:labId/videos', (_req, res) => {
  const store = getStore()
  const list = store.mediaVideos.filter((v) => v.laboratoryId === Number(_req.params.labId) && v.status === 'PUBLISHED')
  res.json(ok(list.sort((a, b) => a.sortNo - b.sortNo)))
})

// ==== 全景：学生/教师公开读 ====
router.get('/panoramas', (_req, res) => {
  const store = getStore()
  const labId = Number(_req.query.labId || 0) || null
  let list = store.mediaPanoramas.filter((p) => p.status === 'PUBLISHED')
  if (labId) list = list.filter((p) => p.laboratoryId === labId)
  list = list.map((p) => {
    const lab = store.laboratories.find((l) => l.id === p.laboratoryId)
    return { ...p, laboratoryName: lab?.name || `实训室#${p.laboratoryId}` }
  }).sort((a, b) => a.sortNo - b.sortNo)
  res.json(ok(list))
})

router.get('/labs/:labId/panoramas', (_req, res) => {
  const store = getStore()
  const list = store.mediaPanoramas.filter((p) => p.laboratoryId === Number(_req.params.labId) && p.status === 'PUBLISHED')
  res.json(ok(list.sort((a, b) => a.sortNo - b.sortNo)))
})

// ==== 管理端 CRUD：学院管理员 + 组长 ====
const isAdminOrLeader = requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_LEADER)

router.get('/admin/videos', requireAuth, isAdminOrLeader, (_req, res) => {
  const store = getStore()
  res.json(ok(store.mediaVideos))
})
router.post('/admin/videos', requireAuth, isAdminOrLeader, (req, res) => {
  const body = VideoSchema.parse(req.body || {})
  const store = getStore()
  const id = nextId(store.mediaVideos)
  const item = { id, ...body, createdAt: new Date().toISOString() }
  store.mediaVideos.push(item); persistStore(store)
  res.json(ok(item))
})
router.put('/admin/videos/:id', requireAuth, isAdminOrLeader, (req, res) => {
  const store = getStore()
  const idx = store.mediaVideos.findIndex((v) => v.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '视频不存在', data: null })
  const body = VideoSchema.partial().parse(req.body || {})
  store.mediaVideos[idx] = { ...store.mediaVideos[idx], ...body }; persistStore(store)
  res.json(ok(store.mediaVideos[idx]))
})
router.delete('/admin/videos/:id', requireAuth, isAdminOrLeader, (req, res) => {
  const store = getStore()
  store.mediaVideos = store.mediaVideos.filter((v) => v.id !== Number(req.params.id))
  persistStore(store); res.json(ok(null, '已删除'))
})

router.get('/admin/panoramas', requireAuth, isAdminOrLeader, (_req, res) => {
  const store = getStore()
  res.json(ok(store.mediaPanoramas))
})
router.post('/admin/panoramas', requireAuth, isAdminOrLeader, (req, res) => {
  const body = PanoramaSchema.parse(req.body || {})
  const store = getStore()
  const id = nextId(store.mediaPanoramas)
  const item = { id, ...body, createdAt: new Date().toISOString() }
  store.mediaPanoramas.push(item); persistStore(store)
  res.json(ok(item))
})
router.put('/admin/panoramas/:id', requireAuth, isAdminOrLeader, (req, res) => {
  const store = getStore()
  const idx = store.mediaPanoramas.findIndex((p) => p.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '全景不存在', data: null })
  const body = PanoramaSchema.partial().parse(req.body || {})
  store.mediaPanoramas[idx] = { ...store.mediaPanoramas[idx], ...body }; persistStore(store)
  res.json(ok(store.mediaPanoramas[idx]))
})
router.delete('/admin/panoramas/:id', requireAuth, isAdminOrLeader, (req, res) => {
  const store = getStore()
  store.mediaPanoramas = store.mediaPanoramas.filter((p) => p.id !== Number(req.params.id))
  persistStore(store); res.json(ok(null, '已删除'))
})

module.exports = router
