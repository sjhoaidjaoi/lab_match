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
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

// 合并生成最终名单（学院管理员）
router.post('/merge', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })

  // 合并规则：
  // 1. admissionIntentions 中 CONFIRMED 的 INTENDED
  // 2. adjustments 中 CONFIRMED 的 CROSS_LAB / INTERNAL（不重复计入 1）
  const confirmed = new Map() // studentId -> admission_source
  store.admissionIntentions
    .filter((a) => a.batchId === activeBatch.id && a.admissionType === 'INTENDED' && a.status === 'CONFIRMED')
    .forEach((a) => confirmed.set(a.studentId, { laboratoryId: a.laboratoryId, source: 'INTENDED_CONFIRMED' }))

  store.adjustments
    .filter((a) => a.batchId === activeBatch.id && a.status === 'CONFIRMED')
    .forEach((a) => {
      if (!confirmed.has(a.studentId)) {
        confirmed.set(a.studentId, { laboratoryId: a.targetLaboratoryId, source: a.adjustmentType })
      }
    })

  store.finalAdmissions = []
  confirmed.forEach((v, studentId) => {
    store.finalAdmissions.push({
      id: nextId(store.finalAdmissions),
      batchId: activeBatch.id, studentId, laboratoryId: v.laboratoryId,
      admissionSource: v.source, finalStatus: 'ADMITTED', confirmedAt: new Date().toISOString()
    })
  })
  persistStore(store)
  res.json(ok({ merged: store.finalAdmissions.length }))
})

// 查看最终名单
router.get('/list', requireAuth, (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const perLab = store.laboratories.map((lab) => {
    const students = store.finalAdmissions
      .filter((f) => f.batchId === activeBatch.id && f.laboratoryId === lab.id)
      .map((f) => {
        const stu = store.users.find((u) => u.id === f.studentId)
        return { ...f, studentName: stu?.realName || '', studentNumber: stu?.studentNumber || '' }
      })
    return { laboratoryId: lab.id, laboratoryName: lab.name, quota: lab.recruitmentQuota, students }
  })
  res.json(ok({ batchId: activeBatch?.id, batchName: activeBatch?.batchName, perLab }))
})

// 发布公示
router.post('/publicity', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = z.object({
    title: z.string().min(1),
    content: z.string().optional().default(''),
    startAt: z.string().datetime(),
    endAt: z.string().datetime()
  }).parse(req.body || {})
  const store = getStore()
  store.publication = { ...body, id: 1, status: 'PUBLISHED', createdAt: new Date().toISOString() }
  persistStore(store)
  res.json(ok(store.publication))
})

router.get('/publication', (_req, res) => {
  const store = getStore()
  res.json(ok(store.publication || null))
})

// 正式入组
router.post('/:id/enroll', requireAuth, requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_LEADER), (req, res) => {
  const store = getStore()
  const idx = store.finalAdmissions.findIndex((f) => f.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '记录不存在', data: null })
  store.finalAdmissions[idx].finalStatus = 'ENROLLED'
  persistStore(store)
  res.json(ok(store.finalAdmissions[idx]))
})

module.exports = router
