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

const AdjustmentSchema = z.object({
  studentId: z.number().int(),
  sourceLaboratoryId: z.number().int().optional().nullable(),
  targetLaboratoryId: z.number().int(),
  reason: z.string().optional().default(''),
  priorityLevel: z.number().int().min(1).max(3).optional().default(1)
})

// 实训室内部调剂（第六阶段）
router.post('/internal', requireAuth, requireRole(ROLES.LAB_LEADER), (req, res) => {
  const body = AdjustmentSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
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
