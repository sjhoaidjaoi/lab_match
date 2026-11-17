// ============ 第八阶段：最终录取名单 / 公示 ============
// POST   /api/final/merge                 学院合并确认+调剂结果生成最终名单
// GET    /api/final/list                  最终名单（按实训室）
// POST   /api/final/publicity             发布公示
// GET    /api/final/publication           查询公示
// POST   /api/final/:id/enroll            正式入组

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, commitStore, nextId } = require('../data/seed')
const { asyncMutation } = require('./interviewWorkspace')
const { requireAuth, requireRole, ROLES, guardLab } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')
const { scopedChoice, currentBatch, stageOpen } = require('../utils/applicationScope')
const { batchWritableError } = require('../utils/recruitment')
const { labCapacity, teacherCapacity } = require('../utils/mentorCapacity')

// 批次已停止/结束/暂停时拒绝新的业务写入
function assertWritable(res, batch) {
  const error = batchWritableError(batch)
  if (error) {
    res.status(409).json({ code: 'BUSINESS_ERROR', message: error, data: null })
    return false
  }
  if (!stageOpen(getStore(), batch.id, 8)) {
    res.status(409).json({ message: '结果公示与正式入组阶段未开放' })
    return false
  }
  return true
}

// 合并生成最终名单（学院管理员）
router.post('/merge', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const activeBatch = currentBatch(store)
  if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  if (!assertWritable(res, activeBatch)) return
  if (store.publication?.batchId === activeBatch.id && store.publication.status === 'PUBLISHED') {
    return res.status(409).json({ message: '公示已发布，不能重新合并已审核名单' })
  }
  if ((store.recruitmentReviews || []).some(row => row.batchId === activeBatch.id && row.kind !== 'TEACHER' && row.status === 'SUBMITTED')) {
    return res.status(409).json({ message: '请先处理实训室待审核名单及内部调剂汇总' })
  }

  // 合并规则：
  // 1. admissionIntentions 中 CONFIRMED 的 INTENDED
  // 2. adjustments 中 CONFIRMED 的 CROSS_LAB / INTERNAL（不重复计入 1）
  const confirmed = new Map() // studentId -> admission_source
  const conflicting = new Set()
  function addConfirmed(studentId, value) {
    const existing = confirmed.get(studentId)
    if (existing && (existing.laboratoryId !== value.laboratoryId ||
        (existing.labTeacherId != null && value.labTeacherId != null && existing.labTeacherId !== value.labTeacherId))) {
      conflicting.add(studentId)
    }
    if (!existing) confirmed.set(studentId, value)
  }
  store.admissionIntentions
    .filter((a) => a.batchId === activeBatch.id && a.admissionType === 'INTENDED' && a.status === 'CONFIRMED')
    .forEach((a) => addConfirmed(a.studentId, { laboratoryId: a.laboratoryId, labTeacherId: a.labTeacherId, source: 'INTENDED_CONFIRMED' }))

  store.adjustments
    .filter((a) => a.batchId === activeBatch.id && a.status === 'CONFIRMED')
    .forEach((a) => {
      addConfirmed(a.studentId, { laboratoryId: a.targetLaboratoryId, labTeacherId: a.targetLabTeacherId, source: a.adjustmentType })
    })
  if (conflicting.size) return res.status(409).json({ message: '存在重复确认的录取去向，请先处理异常记录' })

  // 合并前校验：名额与重复录取
  const perLabCount = new Map()
  confirmed.forEach((v) => perLabCount.set(v.laboratoryId, (perLabCount.get(v.laboratoryId) || 0) + 1))
  const overQuota = store.laboratories
    .filter((lab) => (perLabCount.get(lab.id) || 0) > labCapacity(store, activeBatch.id, lab))
    .map((lab) => `${lab.name}（${perLabCount.get(lab.id)}/${labCapacity(store, activeBatch.id, lab)}）`)
  if (overQuota.length) {
    return res.status(400).json({
      code: 'BUSINESS_ERROR',
      message: `存在超额录取，无法生成最终名单：${overQuota.join('、')}`,
      data: null
    })
  }

  // 保留已正式入组记录的状态，避免重复合并丢失入组结果
  const enrolledMap = new Map(
    store.finalAdmissions
      .filter((f) => f.batchId === activeBatch.id && f.finalStatus === 'ENROLLED')
      .map((f) => [f.studentId, f])
  )
  store.finalAdmissions = store.finalAdmissions.filter(item => item.batchId !== activeBatch.id)
  confirmed.forEach((v, studentId) => {
    const wasEnrolled = enrolledMap.get(studentId)
    store.finalAdmissions.push({
      id: nextId(store.finalAdmissions),
      batchId: activeBatch.id, studentId, laboratoryId: v.laboratoryId,
      labTeacherId: v.labTeacherId ?? null,
      admissionSource: v.source,
      finalStatus: wasEnrolled && wasEnrolled.laboratoryId === v.laboratoryId ? 'ENROLLED' : 'ADMITTED',
      confirmedAt: wasEnrolled?.confirmedAt || new Date().toISOString()
    })
  })
  const validation = finalChecks(store, activeBatch)
  if (validation.overMentorQuota.length) return res.status(409).json({ message: '存在导师超额或归属异常，请先校正名单' })
  if (store.finalReview?.batchId === activeBatch.id) store.finalReview = null
  logOperation(store, req, {
    operationType: 'MERGE_FINAL_LIST', targetType: 'FINAL_LIST', targetId: activeBatch.id,
    description: `合并生成最终录取名单，共 ${store.finalAdmissions.length} 人`
  })
  await commitStore(store)
  res.json(ok({ merged: confirmed.size }))
}))

// 查看最终名单（学院全院 / 教师组长本室）
router.get('/list', requireAuth, requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_TEACHER, ROLES.LAB_LEADER), (req, res) => {
  const store = getStore()
  const activeBatch = currentBatch(store)
  const isAdmin = req.user.roles.includes(ROLES.COLLEGE_ADMIN)
  const labs = isAdmin
    ? store.laboratories
    : store.laboratories.filter((l) => Number(l.id) === Number(req.user.laboratoryId))
  const perLab = labs.map((lab) => {
    const students = store.finalAdmissions
      .filter((f) => f.batchId === activeBatch?.id && f.laboratoryId === lab.id &&
        (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, f.batchId, f.studentId, lab.id)))
      .map((f) => {
        const stu = store.users.find((u) => u.id === f.studentId)
        return { ...f, studentName: stu?.realName || '', studentNumber: stu?.studentNumber || '' }
      })
    return { laboratoryId: lab.id, laboratoryName: lab.name, quota: labCapacity(store, activeBatch?.id, lab), students }
  })
  res.json(ok({ batchId: activeBatch?.id, batchName: activeBatch?.batchName, perLab }))
})

// 学生查看本人最终录取结果
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const batch = currentBatch(store)
  if (!batch) return res.json(ok(null))
  if (!store.publication || store.publication.batchId !== batch.id ||
      store.publication.status !== 'PUBLISHED' || !(Date.parse(store.publication.startAt) <= Date.now())) {
    return res.json(ok(null))
  }
  const record = store.finalAdmissions.find((f) => f.batchId === batch.id && f.studentId === req.user.uid)
  if (!record) return res.json(ok(null))
  const lab = store.laboratories.find((l) => l.id === record.laboratoryId)
  const teacher = store.labTeachers.find(t => t.id === record.labTeacherId && t.laboratoryId === record.laboratoryId)
  res.json(ok({ ...record, laboratoryName: lab?.name || '', labTeacherName: teacher?.name, published: true }))
})

// 最终名单校验（文档第八阶段：检查招生名额 / 检查重复录取 / 检查学生最终去向）
function finalChecks(store, batch) {
  const finals = store.finalAdmissions.filter((f) => f.batchId === batch.id && ['ADMITTED', 'ENROLLED'].includes(f.finalStatus))
  const perLab = store.laboratories.map((lab) => {
    const count = finals.filter((f) => f.laboratoryId === lab.id).length
    return {
      laboratoryId: lab.id, laboratoryName: lab.name,
      quota: labCapacity(store, batch.id, lab), count,
      over: count > labCapacity(store, batch.id, lab)
    }
  })
  const counter = new Map()
  finals.forEach((f) => counter.set(f.studentId, (counter.get(f.studentId) || 0) + 1))
  const duplicates = [...counter.entries()]
    .filter(([, n]) => n > 1)
    .map(([studentId, count]) => ({
      studentId, count,
      studentName: store.users.find((u) => u.id === studentId)?.realName || '',
      studentNumber: store.users.find((u) => u.id === studentId)?.studentNumber || ''
    }))
  const activeStudents = store.users.filter((u) => u.role === ROLES.STUDENT && u.status === 'ACTIVE')
  const placedIds = new Set(finals.map((f) => f.studentId))
  const review = store.finalReview && store.finalReview.batchId === batch.id ? store.finalReview : null
  const mentorCounts = new Map()
  const overMentorQuota = []
  for (const row of finals) {
    if (row.labTeacherId == null) continue
    const mentor = store.labTeachers.find(item => item.id === row.labTeacherId && item.laboratoryId === row.laboratoryId)
    if (!mentor) { overMentorQuota.push({ mentorId: row.labTeacherId, laboratoryId: row.laboratoryId }); continue }
    mentorCounts.set(mentor.id, (mentorCounts.get(mentor.id) || 0) + 1)
  }
  for (const mentor of store.labTeachers) {
    const count = mentorCounts.get(mentor.id) || 0
    const quota = teacherCapacity(store, batch.id, mentor)
    if (quota != null && count > quota) overMentorQuota.push({ mentorId: mentor.id, name: mentor.name, quota, count })
  }
  return {
    batchId: batch.id, batchName: batch.batchName,
    quotaTotal: perLab.reduce((s, l) => s + l.quota, 0),
    admittedTotal: finals.length,
    perLab,
    overQuota: perLab.filter((l) => l.over),
    duplicates, overMentorQuota,
    unplacedCount: activeStudents.filter((u) => !placedIds.has(u.id)).length,
    review,
    canReview: finals.length > 0 && perLab.every((l) => !l.over) && duplicates.length === 0 && !overMentorQuota.length
  }
}

// 检查最终名单
router.get('/check', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const batch = currentBatch(store)
  if (!batch) return res.json(ok(null))
  res.json(ok(finalChecks(store, batch)))
})

// 审核最终名单
router.post('/review', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().optional().default('')
  }).parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = currentBatch(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  if (!assertWritable(res, batch)) return
  if (store.publication?.batchId === batch.id && store.publication.status === 'PUBLISHED') {
    return res.status(409).json({ message: '已公示名单不能再次更改审核状态' })
  }
  const checks = finalChecks(store, batch)
  if (body.status === 'APPROVED' && !checks.canReview) {
    const reasons = []
    if (!checks.admittedTotal) reasons.push('最终名单为空')
    if (checks.overQuota.length) reasons.push(`存在超额实训室：${checks.overQuota.map((l) => l.laboratoryName).join('、')}`)
    if (checks.duplicates.length) reasons.push(`存在重复录取学生：${checks.duplicates.map((d) => d.studentName).join('、')}`)
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: `无法审核通过：${reasons.join('；')}`, data: null })
  }
  store.finalReview = {
    batchId: batch.id, status: body.status, comment: body.comment,
    reviewerId: req.user.uid, reviewedAt: new Date().toISOString()
  }
  logOperation(store, req, {
    operationType: 'REVIEW_FINAL_LIST', targetType: 'FINAL_LIST', targetId: batch.id,
    description: `审核最终录取名单：${body.status === 'APPROVED' ? '通过' : '驳回'}${body.comment ? `（${body.comment}）` : ''}`
  })
  await commitStore(store)
  res.json(ok(store.finalReview))
}))

// 批量确认正式入组（公示结束后）
router.post('/enroll-all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const batch = currentBatch(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  if (!assertWritable(res, batch)) return
  const review = store.finalReview && store.finalReview.batchId === batch.id ? store.finalReview : null
  if (!review || review.status !== 'APPROVED') {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '请先审核通过最终录取名单', data: null })
  }
  const checks = finalChecks(store, batch)
  if (checks.overQuota.length || checks.duplicates.length) {
    return res.status(400).json({
      code: 'BUSINESS_ERROR',
      message: '最终名单存在超额或重复录取，不能正式入组',
      data: null
    })
  }
  const pub = store.publication
  const force = Boolean(req.body && req.body.force)
  if (pub && pub.endAt && new Date(pub.endAt) > new Date() && !force) {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '公示尚未结束，暂不能确认正式入组', data: null })
  }
  let count = 0
  store.finalAdmissions
    .filter((f) => f.batchId === batch.id && f.finalStatus === 'ADMITTED')
    .forEach((f) => { f.finalStatus = 'ENROLLED'; count += 1 })
  logOperation(store, req, {
    operationType: 'ENROLL_ALL', targetType: 'FINAL_LIST', targetId: batch.id,
    description: `批量确认正式入组，共 ${count} 人`
  })
  await commitStore(store)
  res.json(ok({ enrolled: count }))
}))

// ---- 公示期间异议处理 ----
// 学生本人提交异议（公示期间）
router.post('/objections/student', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const body = z.object({
    type: z.string().min(1),
    content: z.string().min(1)
  }).parse(req.body || {})
  const store = getStore()
  const pub = store.publication
  if (!assertWritable(res, currentBatch(store))) return
  if (!pub) {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '当前没有进行中的公示，无法提交异议', data: null })
  }
  if (!store.publicationObjections) store.publicationObjections = []
  const item = {
    id: store.publicationObjections.length + 1,
    studentId: req.user.uid,
    ...body, status: 'PENDING', handlerId: null, handlingNote: '',
    createdAt: new Date().toISOString(), handledAt: null
  }
  store.publicationObjections.push(item)
  logOperation(store, req, {
    operationType: 'CREATE_OBJECTION', targetType: 'OBJECTION', targetId: item.id,
    description: `学生提交公示异议：${body.type}`
  })
  persistStore(store)
  res.json(ok(item))
})

// 学生查看本人异议
router.get('/objections/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const list = (store.publicationObjections || [])
    .filter((o) => o.studentId === req.user.uid)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(ok(list))
})

router.get('/objections', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const list = (store.publicationObjections || [])
    .map((o) => ({
      ...o,
      studentName: store.users.find((u) => u.id === o.studentId)?.realName || '',
      studentNumber: store.users.find((u) => u.id === o.studentId)?.studentNumber || '',
      handlerName: store.users.find((u) => u.id === o.handlerId)?.realName || ''
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json(ok(list))
})

router.post('/objections', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = z.object({
    studentId: z.number().int(),
    type: z.string().min(1),
    content: z.string().min(1)
  }).parse(req.body || {})
  const store = getStore()
  const student = store.users.find((u) => u.id === body.studentId)
  if (!student || student.role !== ROLES.STUDENT) {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '学生不存在', data: null })
  }
  if (!store.publicationObjections) store.publicationObjections = []
  const item = {
    id: store.publicationObjections.length + 1,
    ...body, status: 'PENDING', handlerId: null, handlingNote: '',
    createdAt: new Date().toISOString(), handledAt: null
  }
  store.publicationObjections.push(item)
  logOperation(store, req, {
    operationType: 'CREATE_OBJECTION', targetType: 'OBJECTION', targetId: item.id,
    description: `登记公示异议：${student.realName}（${body.type}）`
  })
  persistStore(store)
  res.json(ok(item))
})

router.put('/objections/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
    handlingNote: z.string().optional().default('')
  }).parse(req.body || {})
  const store = getStore()
  const item = (store.publicationObjections || []).find((o) => o.id === Number(req.params.id))
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: '异议记录不存在', data: null })
  item.status = body.status
  item.handlingNote = body.handlingNote
  item.handlerId = req.user.uid
  item.handledAt = new Date().toISOString()
  logOperation(store, req, {
    operationType: 'HANDLE_OBJECTION', targetType: 'OBJECTION', targetId: item.id,
    description: `处理公示异议#${item.id}，结果：${body.status}`
  })
  persistStore(store)
  res.json(ok(item))
})

// 发布公示
router.post('/publicity', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = z.object({
    title: z.string().min(1),
    content: z.string().optional().default(''),
    startAt: z.string().datetime(),
    endAt: z.string().datetime()
  }).parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = currentBatch(store)
  if (!assertWritable(res, batch)) return
  const review = store.finalReview && store.finalReview.batchId === batch.id ? store.finalReview : null
  if (!review || review.status !== 'APPROVED') {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '最终名单尚未审核通过，不能发布公示', data: null })
  }
  if (!finalChecks(store, batch).canReview) return res.status(409).json({ message: '名额或名单已变更，请处理校验异常后发布' })
  if (new Date(body.startAt).getTime() >= new Date(body.endAt).getTime()) {
    return res.status(400).json({ code: 'VALIDATION_FAILED', message: '公示结束时间必须晚于开始时间', data: null })
  }
  const prior = store.publication
  if (prior?.batchId === batch.id && prior.status === 'PUBLISHED' && Object.keys(body).every(key => body[key] === prior[key])) {
    return res.json(ok(prior))
  }
  const stamp = new Date().toISOString()
  store.publication = { ...body, id: 1, batchId: batch.id, status: 'PUBLISHED', createdAt: stamp }
  const recipients = new Set(store.studentPreferences.filter(item => item.batchId === batch.id && item.status === 'SUBMITTED')
    .map(item => item.studentId))
  for (const studentId of recipients) {
    const existing = store.notices.find(item => item.batchId === batch.id && item.targetUserId === studentId && item.destination === 'STUDENT_RESULT')
    if (existing) { existing.visibleAt = body.startAt; continue }
    store.notices.push({ id: nextId(store.notices), batchId: batch.id, targetUserId: studentId, targetRole: 'STUDENT',
      title: '选拔结果公示', content: '请前往「最终结果」查看本批次已发布的结果。', destination: 'STUDENT_RESULT',
      read: false, visibleAt: body.startAt, createdAt: stamp, createdBy: req.user.uid })
  }
  logOperation(store, req, {
    operationType: 'PUBLISH_RESULT', targetType: 'PUBLICATION', targetId: 1,
    description: `发布录取结果公示「${body.title}」（${body.startAt} ~ ${body.endAt}）`
  })
  await commitStore(store)
  res.json(ok(store.publication))
}))

router.get('/publication', (req, res) => {
  const store = getStore()
  if (req.query.visible === 'true') {
    const batch = currentBatch(store)
    const publication = store.publication
    return res.json(ok(publication && batch && publication.batchId === batch.id &&
      publication.status === 'PUBLISHED' && Date.parse(publication.startAt) <= Date.now() ? publication : null))
  }
  res.json(ok(store.publication || null))
})

// 正式入组
router.post('/:id/enroll', requireAuth, requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_LEADER), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const idx = store.finalAdmissions.findIndex((f) => f.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '记录不存在', data: null })
  const record = store.finalAdmissions[idx]
  if (!assertWritable(res, currentBatch(store))) return
  // 组长只能确认本实训室学生入组
  if (req.user.activeRole === ROLES.LAB_LEADER && !guardLab(req, res, record.laboratoryId)) return
  const publication = store.publication
  if (record.batchId !== currentBatch(store)?.id || store.finalReview?.batchId !== record.batchId ||
    store.finalReview.status !== 'APPROVED' || publication?.batchId !== record.batchId ||
    publication.status !== 'PUBLISHED' || !(Date.parse(publication.endAt) <= Date.now())) {
    return res.status(409).json({ message: '本批次最终名单通过审核且公示结束后才能正式入组' })
  }
  if (record.finalStatus === 'ENROLLED') {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '该学生已正式入组，请勿重复操作', data: null })
  }
  if (record.finalStatus !== 'ADMITTED') return res.status(409).json({ message: '该记录不是有效的正式录取' })
  record.finalStatus = 'ENROLLED'
  record.enrolledAt = new Date().toISOString()
  const stu = store.users.find((u) => u.id === record.studentId)
  logOperation(store, req, {
    operationType: 'ENROLL_STUDENT', targetType: 'FINAL_LIST', targetId: store.finalAdmissions[idx].id,
    description: `确认 ${stu?.realName || '学生'} 正式入组`
  })
  await commitStore(store)
  res.json(ok(store.finalAdmissions[idx]))
}))

module.exports = router
