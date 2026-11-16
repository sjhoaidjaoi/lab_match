// ============ 实训室 ============
// GET    /api/laboratories                 列表（所有登录用户）
// GET    /api/laboratories/:id             详情
// POST   /api/laboratories                 新增（学院管理员）
// PUT    /api/laboratories/:id             组长维护本室资料，学院管理员负责指定组长

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES, isLabLeader } = require('../middleware/auth')
const { currentBatch } = require('../utils/applicationScope')
const { logOperation } = require('../utils/audit')

const videoAddress = z.string().trim().max(2048).refine(value => {
  if (/^\/uploads\/[\w.-]+$/.test(value)) return true
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, '请输入有效的视频地址')

const LabSchema = z.object({
  name: z.string().trim().min(1, '请输入实训室名称').max(128),
  description: z.string().trim().max(5000).optional().default(''),
  projectDirection: z.string().trim().max(255).optional().default(''),
  technologyStack: z.string().trim().max(255).optional().default(''),
  recruitmentQuota: z.number().int().min(0).max(4294967295).optional().default(5),
  leaderId: z.number().int().optional().nullable(),
  // 集中宣讲：每个实训室的文字介绍 + 外部视频（教师线下宣讲录制）
  briefingText: z.string().optional().default(''),
  briefingVideoUrl: videoAddress.optional().nullable(),
  briefingVideoType: z.enum(['MP4', 'LINK', 'EMBED']).optional().default('LINK'),
  tourVideoUrl: videoAddress.nullable().optional(),
  tourVideoType: z.enum(['MP4', 'LINK', 'EMBED']).optional(),
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
      briefingText: l.briefingText || '',
      briefingVideoUrl: l.briefingVideoUrl || null,
      briefingVideoType: l.briefingVideoType || 'LINK',
      introductionVideo: l.introductionVideo, panoramicResource: l.panoramicResource,
      status: l.status, createdAt: l.createdAt
    }
  })
  res.json(ok(list))
})

// 学院端：全部实训室（含停用），用于管理页面
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const list = store.laboratories.map((l) => {
    const leader = store.users.find((u) => u.id === l.leaderId)
    const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
    const applicationCount = activeBatch
      ? store.studentPreferences.filter((p) => p.batchId === activeBatch.id && p.laboratoryId === l.id && p.status === 'SUBMITTED').length
      : 0
    return {
      ...l,
      leaderName: leader ? leader.realName : null,
      applicationCount
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
  const teachers = (store.labTeachers || [])
    .filter((t) => t.laboratoryId === l.id && t.status !== 'INACTIVE')
    .sort((a, b) => a.sortNo - b.sortNo)
    .map(t => ({ ...t, acceptsPreferences: store.users.some(user => user.id === t.userId && user.laboratoryId === l.id &&
      user.status === 'ACTIVE' && [ROLES.LAB_TEACHER, ROLES.LAB_LEADER].includes(user.role)) }))
  const { briefingMaterials, ...detail } = l
  res.json(ok({ ...detail, leaderName: leader?.realName || null, teachers, videos, panoramas }))
})

router.post('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const { name } = LabSchema.pick({ name: true }).parse(req.body || {})
  const body = LabSchema.parse({ name, recruitmentQuota: 0 })
  const store = getStore()
  const id = nextId(store.laboratories)
  const lab = { id, ...body, createdAt: new Date().toISOString() }
  store.laboratories.push(lab)
  logOperation(store, req, {
    operationType: 'CREATE_LAB', targetType: 'LABORATORY', targetId: id,
    description: `新增实训室「${lab.name}」，招生名额 ${lab.recruitmentQuota}`
  })
  persistStore(store)
  res.json(ok(lab))
})

router.put('/:id', requireAuth, (req, res) => {
  const store = getStore()
  const idx = store.laboratories.findIndex((l) => l.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  const lab = store.laboratories[idx]

  const role = req.user.activeRole
  if (role !== ROLES.COLLEGE_ADMIN && !isLabLeader(req, lab)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: '无权限修改此实训室', data: null })
  }

  const body = LabSchema.partial().parse(req.body || {})
  if (role === ROLES.COLLEGE_ADMIN) {
    if (Object.keys(body).some(key => key !== 'leaderId')) {
      return res.status(403).json({ message: '实训室资料与名额由本室组长维护' })
    }
    if (body.leaderId != null && !store.users.some(user => user.id === body.leaderId &&
      user.role === ROLES.LAB_LEADER && user.laboratoryId === lab.id && user.status === 'ACTIVE')) {
      return res.status(400).json({ message: '请选择已绑定本室的有效组长账号' })
    }
  } else {
    if (body.leaderId !== undefined && body.leaderId !== lab.leaderId) {
      return res.status(403).json({ message: '组长账号由学院统筹绑定' })
    }
    if (body.recruitmentQuota !== undefined) {
      const planned = store.labTeachers.filter(item => item.laboratoryId === lab.id && item.status !== 'INACTIVE')
        .reduce((sum, item) => sum + (item.recruitmentQuota ?? 0), 0)
      const batchId = currentBatch(store)?.id
      const occupied = new Set([
        ...store.admissionIntentions.filter(item => item.batchId === batchId && item.laboratoryId === lab.id &&
          item.admissionType === 'INTENDED' && ['PENDING', 'CONFIRMED'].includes(item.status)),
        ...store.adjustments.filter(item => item.batchId === batchId && item.targetLaboratoryId === lab.id && item.status === 'CONFIRMED'),
        ...store.finalAdmissions.filter(item => item.batchId === batchId && item.laboratoryId === lab.id && item.finalStatus !== 'REJECTED')
      ].map(item => item.studentId)).size
      if (body.recruitmentQuota < Math.max(planned, occupied)) {
        return res.status(409).json({ message: `计划名额不能少于已分配导师名额（${planned}）或已占用名额（${occupied}）` })
      }
    }
  }
  store.laboratories[idx] = { ...lab, ...body }
  logOperation(store, req, {
    operationType: 'UPDATE_LAB', targetType: 'LABORATORY', targetId: lab.id,
    description: `修改实训室「${store.laboratories[idx].name}」信息`
  })
  persistStore(store)
  res.json(ok(store.laboratories[idx]))
})

// ---- 导师团队管理（学院管理员 / 本实训室组长） ----
const TeacherSchema = z.object({
  name: z.string().min(1, '请输入导师姓名'),
  title: z.string().optional().default(''),
  direction: z.string().optional().default(''),
  intro: z.string().optional().default(''),
  userId: z.number().int().nullable().optional(),
  sortNo: z.number().int().optional().default(1),
  recruitmentQuota: z.number().int().min(0).max(1000).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE')
})

function mentorPlanError(store, lab, body, id) {
  if (body.userId != null && !store.users.some(user => user.id === body.userId &&
    user.laboratoryId === lab.id && [ROLES.LAB_LEADER, ROLES.LAB_TEACHER].includes(user.role))) {
    return '导师只能绑定学院已分配给本室的账号'
  }
  const others = store.labTeachers.filter(item => item.laboratoryId === lab.id && item.id !== id && item.status !== 'INACTIVE')
  if (body.userId != null && others.some(item => item.userId === body.userId)) return '该账号已有本室导师记录'
  const total = others.reduce((sum, item) => sum + (item.recruitmentQuota ?? 0), 0)
  if (body.status !== 'INACTIVE' && body.recruitmentQuota != null && total + body.recruitmentQuota > lab.recruitmentQuota) {
    return '导师计划名额之和不能超过实训室总名额'
  }
}

router.get('/:id/teachers', (req, res) => {
  const store = getStore()
  const lab = store.laboratories.find((l) => l.id === Number(req.params.id))
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  const list = (store.labTeachers || [])
    .filter((t) => t.laboratoryId === lab.id && t.status !== 'INACTIVE')
    .sort((a, b) => a.sortNo - b.sortNo)
  res.json(ok(list))
})

router.get('/:id/teachers/manage', requireAuth, (req, res) => {
  const store = getStore()
  const lab = store.laboratories.find(item => item.id === Number(req.params.id))
  if (!lab || !isLabLeader(req, lab)) return res.status(403).json({ message: '只能维护本人负责实训室的导师团队' })
  res.json(ok(store.labTeachers.filter(item => item.laboratoryId === lab.id).sort((a, b) => a.sortNo - b.sortNo)))
})

router.post('/:id/teachers', requireAuth, (req, res) => {
  const store = getStore()
  const lab = store.laboratories.find((l) => l.id === Number(req.params.id))
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!isLabLeader(req, lab)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: '只能维护本人负责实训室的导师团队', data: null })
  }
  const body = TeacherSchema.parse(req.body || {})
  if (!store.labTeachers) store.labTeachers = []
  const error = mentorPlanError(store, lab, body)
  if (error) return res.status(400).json({ message: error })
  const item = {
    id: nextId(store.labTeachers),
    laboratoryId: lab.id,
    ...body,
    createdAt: new Date().toISOString()
  }
  store.labTeachers.push(item)
  logOperation(store, req, {
    operationType: 'CREATE_LAB_TEACHER', targetType: 'LABORATORY', targetId: lab.id,
    description: `为「${lab.name}」新增导师 ${item.name}`
  })
  persistStore(store)
  res.json(ok(item))
})

router.put('/:id/teachers/:teacherId', requireAuth, (req, res) => {
  const store = getStore()
  const lab = store.laboratories.find((l) => l.id === Number(req.params.id))
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!isLabLeader(req, lab)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: '只能维护本人负责实训室的导师团队', data: null })
  }
  const idx = (store.labTeachers || []).findIndex(
    (t) => t.id === Number(req.params.teacherId) && t.laboratoryId === lab.id
  )
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '导师记录不存在', data: null })
  const body = TeacherSchema.partial().parse(req.body || {})
  if (store.labTeachers[idx].userId != null && body.userId !== undefined && body.userId !== store.labTeachers[idx].userId &&
    store.studentPreferences.some(choice => choice.labTeacherId === store.labTeachers[idx].id && choice.status === 'SUBMITTED')) {
    return res.status(409).json({ message: '该导师已有提交记录，不能变更账号归属' })
  }
  const error = mentorPlanError(store, lab, { ...store.labTeachers[idx], ...body }, store.labTeachers[idx].id)
  if (error) return res.status(400).json({ message: error })
  store.labTeachers[idx] = { ...store.labTeachers[idx], ...body }
  logOperation(store, req, {
    operationType: 'UPDATE_LAB_TEACHER', targetType: 'LABORATORY', targetId: lab.id,
    description: `修改「${lab.name}」导师 ${store.labTeachers[idx].name} 信息`
  })
  persistStore(store)
  res.json(ok(store.labTeachers[idx]))
})

router.delete('/:id/teachers/:teacherId', requireAuth, (req, res) => {
  const store = getStore()
  const lab = store.laboratories.find((l) => l.id === Number(req.params.id))
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!isLabLeader(req, lab)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: '只能维护本人负责实训室的导师团队', data: null })
  }
  const before = (store.labTeachers || []).length
  if (store.studentPreferences.some(choice => choice.labTeacherId === Number(req.params.teacherId) && choice.laboratoryId === lab.id)) {
    return res.status(409).json({ message: '该导师已有志愿记录，请停用而非删除' })
  }
  store.labTeachers = store.labTeachers.filter(
    (t) => !(t.id === Number(req.params.teacherId) && t.laboratoryId === lab.id)
  )
  if (store.labTeachers.length === before) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '导师记录不存在', data: null })
  }
  logOperation(store, req, {
    operationType: 'DELETE_LAB_TEACHER', targetType: 'LABORATORY', targetId: lab.id,
    description: `移除「${lab.name}」一名导师`
  })
  persistStore(store)
  res.json(ok(null, '已移除'))
})

// 实训室组长向学院上报剩余名额（第六阶段）
router.post('/:id/vacancy-report', requireAuth, requireRole(ROLES.LAB_LEADER), (req, res) => {
  const body = z.object({
    remaining: z.number().int().min(0),
    note: z.string().optional().default('')
  }).parse(req.body || {})
  const store = getStore()
  const idx = store.laboratories.findIndex((l) => l.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  const lab = store.laboratories[idx]
  if (!isLabLeader(req, lab)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: '只能上报本人负责实训室的剩余名额', data: null })
  }
  if (body.remaining > lab.recruitmentQuota) {
    return res.status(400).json({ code: 'VALIDATION_FAILED', message: '剩余名额不能大于计划名额', data: null })
  }
  lab.vacancyReport = {
    remaining: body.remaining, note: body.note,
    reportedBy: req.user.uid, reportedAt: new Date().toISOString()
  }
  logOperation(store, req, {
    operationType: 'REPORT_VACANCY', targetType: 'LABORATORY', targetId: lab.id,
    description: `上报「${lab.name}」剩余名额 ${body.remaining} 个`
  })
  persistStore(store)
  res.json(ok(lab.vacancyReport))
})

module.exports = router
