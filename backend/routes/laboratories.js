// ============ 实训室 ============
// GET    /api/laboratories                 列表（所有登录用户）
// GET    /api/laboratories/:id             详情
// POST   /api/laboratories                 新增（学院管理员）
// PUT    /api/laboratories/:id             修改（学院管理员 + 组长管理自己的实训室）

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

const LabSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  projectDirection: z.string().optional().default(''),
  technologyStack: z.string().optional().default(''),
  recruitmentQuota: z.number().int().positive().optional().default(5),
  leaderId: z.number().int().optional().nullable(),
  introductionVideo: z.string().optional().nullable(),
  panoramicResource: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
})

router.get('/', (req, res) => {
  const store = getStore()
  const list = store.laboratories.filter((l) => l.status !== 'INACTIVE').map((l) => {
    const leader = store.users.find((u) => u.id === l.leaderId)
    return {
      id: l.id, name: l.name, description: l.description,
      projectDirection: l.projectDirection, technologyStack: l.technologyStack,
      recruitmentQuota: l.recruitmentQuota,
      leaderName: leader ? leader.realName : null,
      leaderId: l.leaderId,
      introductionVideo: l.introductionVideo, panoramicResource: l.panoramicResource,
      status: l.status, createdAt: l.createdAt
    }
  })
  res.json(ok(list))
})

router.get('/:id', (req, res) => {
  const store = getStore()
  const l = store.laboratories.find((i) => i.id === Number(req.params.id))
  if (!l) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  const leader = store.users.find((u) => u.id === l.leaderId)
  // 附上宣讲视频和全景
  const videos = store.mediaVideos.filter((v) => v.laboratoryId === l.id && v.status === 'PUBLISHED')
  const panoramas = store.mediaPanoramas.filter((p) => p.laboratoryId === l.id && p.status === 'PUBLISHED')
  res.json(ok({ ...l, leaderName: leader?.realName || null, videos, panoramas }))
})

router.post('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = LabSchema.parse(req.body || {})
  const store = getStore()
  const id = nextId(store.laboratories)
  const lab = { id, ...body, createdAt: new Date().toISOString() }
  store.laboratories.push(lab)
  persistStore(store)
  res.json(ok(lab))
})

router.put('/:id', requireAuth, (req, res) => {
  const store = getStore()
  const idx = store.laboratories.findIndex((l) => l.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  const lab = store.laboratories[idx]

  const role = req.user.activeRole
  if (role !== ROLES.COLLEGE_ADMIN && !(role === ROLES.LAB_LEADER && lab.leaderId === req.user.uid)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: '无权限修改此实训室', data: null })
  }

  const body = LabSchema.partial().parse(req.body || {})
  store.laboratories[idx] = { ...lab, ...body }
  persistStore(store)
  res.json(ok(store.laboratories[idx]))
})

module.exports = router
