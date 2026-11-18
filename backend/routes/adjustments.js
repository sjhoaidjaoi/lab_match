// ============ 调剂（第六阶段内部 + 第七阶段统筹） ============
// POST   /api/adjustments/internal           实训室组长提交内部调剂
// POST   /api/adjustments/cross              学院管理员创建跨实训室调剂
// POST   /api/adjustments/placement          学院管理员沟通安置
// POST   /api/adjustments/:id/confirm        学生确认调剂
// GET    /api/adjustments/my                 学生查看自己的调剂情况
// GET    /api/adjustments/lab/:labId         实训室查看本室调剂
// GET    /api/adjustments/overview           学院统筹视图

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, commitStore, nextId, ADJUSTMENT_TYPE } = require('../data/seed')
const { asyncMutation } = require('./interviewWorkspace')
const { requireAuth, requireRole, ROLES, guardLab } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')
const { mentorCapacityError, occupiesInvitation, labCapacity } = require('../utils/mentorCapacity')
const { scopedChoice, stageOpen } = require('../utils/applicationScope')
const { currentBatch, batchWritableError, stageOf } = require('../utils/recruitment')
const { syncFinalAdmissions } = require('../utils/finalSync')

const AdjustmentSchema = z.object({
  studentId: z.number().int(),
  sourceLaboratoryId: z.number().int().optional().nullable(),
  targetLaboratoryId: z.number().int(),
  sourceLabTeacherId: z.number().int().positive().nullable().optional(),
  targetLabTeacherId: z.number().int().positive().nullable().optional(),
  reason: z.string().optional().default(''),
  priorityLevel: z.number().int().min(1).max(3).optional().default(1)
})

function activeBatchOf(store) {
  return currentBatch(store)
}

// 目标实训室已占用名额（学生去重，避免重复计数）
function occupiedStudents(store, batchId, laboratoryId, ignoreAdjustmentId) {
  const ids = new Set()
  store.admissionIntentions
    .filter((a) => a.batchId === batchId && a.laboratoryId === laboratoryId && occupiesInvitation(store, a))
    .forEach((a) => ids.add(a.studentId))
  store.finalAdmissions
    .filter((f) => f.batchId === batchId && f.laboratoryId === laboratoryId && f.finalStatus !== 'REJECTED')
    .forEach((f) => ids.add(f.studentId))
  store.adjustments
    .filter((a) => a.batchId === batchId && a.targetLaboratoryId === laboratoryId &&
      a.status === 'CONFIRMED' && a.id !== ignoreAdjustmentId)
    .forEach((a) => ids.add(a.studentId))
  return ids
}

// 调剂业务规则校验（文档第七阶段调剂规则）
// 1. 已正式录取/已确认录取的学生不得再次进入调剂池
// 2. 不允许突破实训室招生名额
// 3. 内部调剂须学生服从内部调剂；跨实训室调剂须学生服从全院调剂
function validateAdjustment(store, batch, body, ignoreAdjustmentId) {
  if (!batch) return '没有活跃批次'
  const student = store.users.find((u) => u.id === body.studentId)
  if (!student || student.role !== ROLES.STUDENT) return '学生不存在'
  if (student.status !== 'ACTIVE') return '学生账号已停用'
  const target = store.laboratories.find((l) => l.id === body.targetLaboratoryId)
  if (!target) return '目标实训室不存在'
  if (target.status && target.status !== 'ACTIVE') return `「${target.name}」已停用`
  if (body.targetLabTeacherId && !store.labTeachers.some(t => t.id === body.targetLabTeacherId && t.laboratoryId === target.id)) {
    return '目标导师不属于目标实训室'
  }
  const quotaError = mentorCapacityError(store, batch.id, body.targetLabTeacherId, body.studentId)
  if (quotaError) return quotaError

  const finalRecord = store.finalAdmissions.find(
    (f) => f.batchId === batch.id && f.studentId === body.studentId && f.finalStatus !== 'REJECTED'
  )
  const confirmedIntention = store.admissionIntentions.find(
    (a) => a.batchId === batch.id && a.studentId === body.studentId &&
      a.admissionType === 'INTENDED' && a.status === 'CONFIRMED'
  )
  if (finalRecord || confirmedIntention) return `${student.realName} 已确认录取，不能重复进入调剂池`

  const confirmedAdjustment = store.adjustments.find(
    (a) => a.batchId === batch.id && a.studentId === body.studentId &&
      a.status === 'CONFIRMED' && a.id !== ignoreAdjustmentId
  )
  if (confirmedAdjustment) return `${student.realName} 已有确认的调剂结果，不能重复进入调剂池`

  const duplicated = store.adjustments.find(
    (a) => a.batchId === batch.id && a.studentId === body.studentId &&
      a.targetLaboratoryId === body.targetLaboratoryId &&
      a.status === 'PENDING' && a.id !== ignoreAdjustmentId
  )
  if (duplicated) return '该学生已在目标实训室的待确认调剂名单中'

  // 调剂意愿校验
  const prefs = store.studentPreferences.filter(
    (p) => p.batchId === batch.id && p.studentId === body.studentId && p.status === 'SUBMITTED'
  )
  if (!prefs.length) return `${student.realName} 未填报志愿，不能进入调剂池`
  const source = body.sourceLaboratoryId || prefs[0].laboratoryId
  const isInternal = Number(source) === Number(target.id)
  if (isInternal) {
    if (!prefs.some((p) => p.obeyInternalAdjustment)) return `${student.realName} 未选择服从实训室内部调剂`
  } else {
    if (!prefs.some((p) => p.obeyCollegeAdjustment)) return `${student.realName} 未选择服从全院统筹调剂`
  }

  const occupied = occupiedStudents(store, batch.id, target.id, ignoreAdjustmentId)
  const quota = labCapacity(store, batch.id, target)
  if (occupied.size >= quota) {
    return `「${target.name}」名额已满（${occupied.size}/${quota}），不允许突破招生名额`
  }
  return null
}

function adjustmentWindow(store, batch, stageNumber) {
  if (!batch) return '没有活跃批次'
  const stage = stageOf(store, batch.id, stageNumber)
  if (stageNumber === 6) {
    const firstRound = stageOf(store, batch.id, 5)
    if ([4, 5].some(number => stageOpen(store, batch.id, number)) ||
      firstRound?.stageStatus !== 'COMPLETED') {
      return '首轮录取确认结束后才能进行实训室内部调剂'
    }
  }
  if (stageNumber === 7 && stageOf(store, batch.id, 6)?.stageStatus !== 'COMPLETED') {
    return '实训室内部调剂结束后才能进行学院统筹调剂'
  }
  if (stage?.stageStatus !== 'IN_PROGRESS') return '当前调剂阶段未开放'
  return null
}

// 实训室内部调剂（第六阶段）：组长只能处理本实训室内部调剂
router.post('/internal', requireAuth, requireRole(ROLES.LAB_LEADER), asyncMutation(async (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  if (!guardLab(req, res, body.targetLaboratoryId)) return
  if (!scopedChoice(store, req.user, batch.id, body.studentId, body.targetLaboratoryId)) return res.status(403).json({ message: '学生未选择本室导师' })
  const windowError = adjustmentWindow(store, batch, 6)
  if (windowError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: windowError, data: null })
  // 内部调剂的来源与目标必须是组长本人负责的实训室
  if (body.sourceLaboratoryId && Number(body.sourceLaboratoryId) !== Number(body.targetLaboratoryId)) {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '内部调剂的来源与目标实训室必须一致', data: null })
  }
  const preference = store.studentPreferences.find(item => item.batchId === batch.id &&
    item.studentId === body.studentId && item.laboratoryId === body.targetLaboratoryId)
  const normalized = { ...body, sourceLaboratoryId: body.targetLaboratoryId, sourceLabTeacherId: preference?.labTeacherId ?? null }
  const invalid = validateAdjustment(store, batch, normalized)
  if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  if (!body.reason.trim() || !body.targetLabTeacherId || body.targetLabTeacherId === preference?.labTeacherId) {
    return res.status(400).json({ message: '请选择另一位本室导师并填写调剂原因' })
  }
  const item = {
    id: nextId(store.adjustments),
    batchId: batch.id,
    ...normalized,
    adjustmentType: ADJUSTMENT_TYPE.INTERNAL,
    operatorId: req.user.uid,
    status: 'PENDING', // PENDING / CONFIRMED / REJECTED
    createdAt: new Date().toISOString()
  }
  store.adjustments.push(item)
  store.notices.push({
    id: nextId(store.notices), targetRole: 'STUDENT', targetUserId: item.studentId,
    title: '实训室内部调剂通知', content: '请在内部调剂阶段前往「调剂与补录」确认。',
    read: false, createdBy: req.user.uid, createdAt: item.createdAt
  })
  logOperation(store, req, {
    operationType: 'CREATE_INTERNAL_ADJUSTMENT', targetType: 'ADJUSTMENT', targetId: item.id,
    description: `提交内部调剂：学生#${item.studentId} → 实训室#${item.targetLaboratoryId}`
  })
  await commitStore(store)
  res.json(ok(item))
}))

// 学院跨实训室调剂（第七阶段）
router.post('/cross', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  const windowError = adjustmentWindow(store, batch, 7)
  if (windowError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: windowError, data: null })
  const invalid = validateAdjustment(store, batch, body)
  if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  const item = {
    id: nextId(store.adjustments),
    batchId: batch.id,
    ...body,
    adjustmentType: ADJUSTMENT_TYPE.CROSS_LAB,
    operatorId: req.user.uid,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  }
  store.adjustments.push(item)
  logOperation(store, req, {
    operationType: 'CREATE_CROSS_ADJUSTMENT', targetType: 'ADJUSTMENT', targetId: item.id,
    description: `创建跨实训室调剂：学生#${item.studentId} → 实训室#${item.targetLaboratoryId}`
  })
  await commitStore(store)
  res.json(ok(item))
}))

// 批量创建跨实训室调剂方案
router.post('/cross-batch', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = z.object({ items: z.array(AdjustmentSchema).min(1, '请选择至少一名学生') }).parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  const windowError = adjustmentWindow(store, batch, 7)
  if (windowError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: windowError, data: null })
  const created = []
  const failed = []
  body.items.forEach((item) => {
    const invalid = validateAdjustment(store, batch, item)
    if (invalid) {
      failed.push({ studentId: item.studentId, targetLaboratoryId: item.targetLaboratoryId, reason: invalid })
      return
    }
    const record = {
      id: nextId(store.adjustments),
      batchId: batch.id,
      ...item,
      adjustmentType: ADJUSTMENT_TYPE.CROSS_LAB,
      operatorId: req.user.uid,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
    store.adjustments.push(record)
    created.push(record)
  })
  logOperation(store, req, {
    operationType: 'CREATE_CROSS_BATCH', targetType: 'ADJUSTMENT', targetId: null,
    description: `批量创建跨实训室调剂方案：成功 ${created.length} 条，失败 ${failed.length} 条`
  })
  await commitStore(store)
  res.json(ok({ created: created.length, failed }))
}))

// 学院沟通安置（第七阶段第三优先级）
router.post('/placement', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  const windowError = adjustmentWindow(store, batch, 7)
  if (windowError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: windowError, data: null })
  const invalid = validateAdjustment(store, batch, body)
  if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  const item = {
    id: nextId(store.adjustments),
    batchId: batch.id,
    ...body,
    adjustmentType: ADJUSTMENT_TYPE.MANUAL_PLACEMENT,
    operatorId: req.user.uid,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  }
  store.adjustments.push(item)
  logOperation(store, req, {
    operationType: 'MANUAL_PLACEMENT', targetType: 'ADJUSTMENT', targetId: item.id,
    description: `沟通安置：学生#${item.studentId} → 实训室#${item.targetLaboratoryId}，原因：${item.reason || '未填写'}`
  })
  await commitStore(store)
  res.json(ok(item))
}))

// 学院端：调剂明细列表
router.get('/list', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.adjustments
    .filter((a) => a.batchId === activeBatch.id)
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      const source = a.sourceLaboratoryId ? store.laboratories.find((l) => l.id === a.sourceLaboratoryId) : null
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      const operator = store.users.find((u) => u.id === a.operatorId)
      return {
        ...a,
        studentName: stu?.realName || '',
        studentNumber: stu?.studentNumber || '',
        sourceLabName: source?.name || null,
        targetLabName: target?.name || '',
        operatorName: operator?.realName || ''
      }
    })
  res.json(ok(list))
})

// 学院端：审核调剂结果
router.put('/:id/status', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const status = z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).parse(req.body?.status)
  const reason = z.string().optional().parse(req.body?.reason)
  const store = structuredClone(getStore())
  const item = store.adjustments.find((a) => a.id === Number(req.params.id))
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: '调剂记录不存在', data: null })
  const batchStopError = batchWritableError(store.recruitmentBatches.find((b) => b.id === item.batchId))
  if (batchStopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: batchStopError, data: null })
  if (status === 'CONFIRMED') {
    const batch = store.recruitmentBatches.find((b) => b.id === item.batchId)
    if (batch?.id !== activeBatchOf(store)?.id) return res.status(409).json({ message: '该调剂不属于当前批次' })
    const windowError = adjustmentWindow(store, batch, item.adjustmentType === ADJUSTMENT_TYPE.INTERNAL ? 6 : 7)
    if (windowError) return res.status(409).json({ message: windowError })
    const invalid = validateAdjustment(store, batch, item, item.id)
    if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  }
  item.status = status
  if (reason) item.reason = reason
  logOperation(store, req, {
    operationType: 'REVIEW_ADJUSTMENT', targetType: 'ADJUSTMENT', targetId: item.id,
    description: `审核调剂记录#${item.id}，结果：${status}`
  })
  await commitStore(store)
  res.json(ok(item))
}))

// 学生确认
router.post('/:id/confirm', requireAuth, requireRole(ROLES.STUDENT), asyncMutation(async (req, res) => {
  const confirmed = z.boolean().parse(req.body?.confirmed)
  const store = structuredClone(getStore())
  const idx = store.adjustments.findIndex((a) => a.id === Number(req.params.id) && a.studentId === req.user.uid)
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '未找到此调剂通知', data: null })
  const item = store.adjustments[idx]
  const activeBatch = activeBatchOf(store)
  const stopError = batchWritableError(activeBatch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  const windowError = item.batchId !== activeBatch?.id ? '该调剂不属于当前批次'
    : adjustmentWindow(store, activeBatch, item.adjustmentType === ADJUSTMENT_TYPE.INTERNAL ? 6 : 7)
  if (windowError) return res.status(409).json({ message: windowError })
  if (item.status === 'CONFIRMED' || item.status === 'REJECTED') {
    return res.status(400).json({ code: 'BUSINESS_ERROR', message: '该调剂结果已处理，请勿重复提交', data: null })
  }
  if (confirmed) {
    const batch = store.recruitmentBatches.find((b) => b.id === item.batchId)
    const invalid = validateAdjustment(store, batch, item, item.id)
    if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  }
  item.status = confirmed ? 'CONFIRMED' : 'REJECTED'
  item.confirmedAt = new Date().toISOString()
  // 调剂确认即生效：直接同步进学院端最终名单，不再需要学院二次确认
  syncFinalAdmissions(store, item.batchId, { strict: false })
  logOperation(store, req, {
    operationType: 'CONFIRM_ADJUSTMENT', targetType: 'ADJUSTMENT', targetId: item.id,
    description: confirmed ? '学生确认调剂结果' : '学生拒绝调剂结果'
  })
  await commitStore(store)
  res.json(ok(item))
}))

// 学生查看
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.adjustments
    .filter((a) => a.studentId === req.user.uid && a.batchId === activeBatch.id)
    .map((a) => {
      const source = a.sourceLaboratoryId ? store.laboratories.find((l) => l.id === a.sourceLaboratoryId) : null
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      const teacher = store.labTeachers.find(t => t.id === a.targetLabTeacherId && t.laboratoryId === a.targetLaboratoryId)
      return { ...a, sourceLabName: source?.name || null, targetLabName: target?.name || '', targetTeacherName: teacher?.name || null }
    })
  res.json(ok(list))
})

// 实训室查看
router.get('/lab/:labId', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  const activeBatch = activeBatchOf(store)
  const list = store.adjustments
    .filter((a) => (a.sourceLaboratoryId === labId || a.targetLaboratoryId === labId) && a.batchId === activeBatch?.id &&
      (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, a.batchId, a.studentId, labId)))
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      return { ...a, studentName: stu?.realName || '', targetLabName: target?.name || '' }
    })
  res.json(ok(list))
})

// 学院总览
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  const all = store.adjustments.filter((a) => a.batchId === activeBatch.id)
  const grouped = {
    INTERNAL: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.INTERNAL).length,
    CROSS_LAB: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.CROSS_LAB).length,
    MANUAL_PLACEMENT: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.MANUAL_PLACEMENT).length
  }
  res.json(ok({ total: all.length, grouped }))
})

module.exports = router
