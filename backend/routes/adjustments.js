// ============ 调剂（第六阶段内部 + 第七阶段统筹） ============
// POST   /api/adjustments/internal           实训室组长提交内部调剂
// POST   /api/adjustments/cross              学院管理员创建跨实训室调剂
// POST   /api/adjustments/:id/confirm        学生确认调剂
// GET    /api/adjustments/my                 学生查看自己的调剂情况
// GET    /api/adjustments/lab/:labId         实训室查看本室调剂
// GET    /api/adjustments/overview           学院统筹视图

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId, ADJUSTMENT_TYPE } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')

const AdjustmentSchema = z.object({
  studentId: z.number().int(),
  sourceLaboratoryId: z.number().int().optional().nullable(),
  targetLaboratoryId: z.number().int(),
  reason: z.string().optional().default(''),
  priorityLevel: z.number().int().min(1).max(3).optional().default(1)
})

// 调剂业务规则校验（文档第七阶段调剂规则）：
// 1. 不允许突破实训室最终招生名额
// 2. 已确认正式录取的学生不重复进入调剂池
function validateAdjustment(store, batch, body, ignoreAdjustmentId) {
  const student = store.users.find((u) => u.id === body.studentId)
  if (!student || student.role !== ROLES.STUDENT) return '学生不存在'
  const target = store.laboratories.find((l) => l.id === body.targetLaboratoryId)
  if (!target) return '目标实训室不存在'
  if (target.status && target.status !== 'ACTIVE') return `「${target.name}」已停用`

  const finalRecord = store.finalAdmissions.find(
    (f) => f.batchId === batch.id && f.studentId === body.studentId && f.finalStatus !== 'REJECTED'
  )
  const confirmedIntention = store.admissionIntentions.find(
    (a) => a.batchId === batch.id && a.studentId === body.studentId && a.admissionType === 'INTENDED' && a.status === 'CONFIRMED'
  )
  if (finalRecord || confirmedIntention) return `${student.realName} 已确认录取，不能重复进入调剂池`

  const confirmed = store.admissionIntentions.filter(
    (a) => a.batchId === batch.id && a.laboratoryId === target.id && a.admissionType === 'INTENDED' && a.status === 'CONFIRMED'
  ).length
  const admitted = store.finalAdmissions.filter(
    (f) => f.batchId === batch.id && f.laboratoryId === target.id && f.finalStatus !== 'REJECTED'
  ).length
  const adjusted = store.adjustments.filter(
    (a) => a.batchId === batch.id && a.targetLaboratoryId === target.id && a.status === 'CONFIRMED' && a.id !== ignoreAdjustmentId
  ).length
  const occupied = Math.max(confirmed, admitted) + adjusted
  if (occupied >= target.recruitmentQuota) {
    return `「${target.name}」名额已满（${occupied}/${target.recruitmentQuota}），不允许突破招生名额`
  }
  return null
}

// 实训室内部调剂（第六阶段）
router.post('/internal', requireAuth, requireRole(ROLES.LAB_LEADER), (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const invalid = validateAdjustment(store, activeBatch, body)
  if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  const item = {
    id: nextId(store.adjustments),
    batchId: activeBatch.id,
    ...body,
    adjustmentType: ADJUSTMENT_TYPE.INTERNAL,
    operatorId: req.user.uid,
    status: 'PENDING', // PENDING / CONFIRMED / REJECTED
    createdAt: new Date().toISOString()
  }
  store.adjustments.push(item)
  persistStore(store)
  res.json(ok(item))
})

// 学院跨实训室调剂（第七阶段）
router.post('/cross', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const invalid = validateAdjustment(store, activeBatch, body)
  if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  const item = {
    id: nextId(store.adjustments),
    batchId: activeBatch.id,
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
  persistStore(store)
  res.json(ok(item))
})

// 批量创建跨实训室调剂方案
router.post('/cross-batch', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = z.object({ items: z.array(AdjustmentSchema).min(1, '请选择至少一名学生') }).parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const created = []
  const failed = []
  body.items.forEach((item) => {
    const invalid = validateAdjustment(store, activeBatch, item)
    if (invalid) {
      failed.push({ studentId: item.studentId, targetLaboratoryId: item.targetLaboratoryId, reason: invalid })
      return
    }
    const record = {
      id: nextId(store.adjustments),
      batchId: activeBatch.id,
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
  persistStore(store)
  res.json(ok({ created: created.length, failed }))
})

// 学院沟通安置（第七阶段第三优先级）
router.post('/placement', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const invalid = validateAdjustment(store, activeBatch, body)
  if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  const item = {
    id: nextId(store.adjustments),
    batchId: activeBatch.id,
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
  persistStore(store)
  res.json(ok(item))
})

// 学院端：调剂明细列表
router.get('/list', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
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
router.put('/:id/status', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const status = z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).parse(req.body?.status)
  const reason = z.string().optional().parse(req.body?.reason)
  const store = getStore()
  const item = store.adjustments.find((a) => a.id === Number(req.params.id))
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: '调剂记录不存在', data: null })
  if (status === 'CONFIRMED') {
    const batch = store.recruitmentBatches.find((b) => b.id === item.batchId)
    const invalid = validateAdjustment(store, batch, item, item.id)
    if (invalid) return res.status(400).json({ code: 'BUSINESS_ERROR', message: invalid, data: null })
  }
  item.status = status
  if (reason) item.reason = reason
  logOperation(store, req, {
    operationType: 'REVIEW_ADJUSTMENT', targetType: 'ADJUSTMENT', targetId: item.id,
    description: `审核调剂记录#${item.id}，结果：${status}`
  })
  persistStore(store)
  res.json(ok(item))
})

// 学生确认
router.post('/:id/confirm', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const confirmed = z.boolean().parse(req.body?.confirmed)
  const store = getStore()
  const idx = store.adjustments.findIndex((a) => a.id === Number(req.params.id) && a.studentId === req.user.uid)
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '未找到此调剂通知', data: null })
  store.adjustments[idx].status = confirmed ? 'CONFIRMED' : 'REJECTED'
  persistStore(store)
  res.json(ok(store.adjustments[idx]))
})

// 学生查看
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.adjustments
    .filter((a) => a.studentId === req.user.uid && a.batchId === activeBatch.id)
    .map((a) => {
      const source = a.sourceLaboratoryId ? store.laboratories.find((l) => l.id === a.sourceLaboratoryId) : null
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      return { ...a, sourceLabName: source?.name || null, targetLabName: target?.name || '' }
    })
  res.json(ok(list))
})

// 实训室查看
router.get('/lab/:labId', requireAuth, (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.adjustments
    .filter((a) => (a.sourceLaboratoryId === Number(req.params.labId) || a.targetLaboratoryId === Number(req.params.labId)) && a.batchId === activeBatch.id)
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
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const all = store.adjustments.filter((a) => a.batchId === activeBatch.id)
  const grouped = {
    INTERNAL: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.INTERNAL).length,
    CROSS_LAB: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.CROSS_LAB).length,
    MANUAL_PLACEMENT: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.MANUAL_PLACEMENT).length
  }
  res.json(ok({ total: all.length, grouped }))
})

module.exports = router
