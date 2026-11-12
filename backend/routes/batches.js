// ============ 选拔批次 + 八阶段时间窗 ============
// GET  /api/batches/current   当前批次
// GET  /api/batches           批次列表
// POST /api/batches           创建批次
// GET  /api/batches/:id/stages  八阶段时间窗（用于前端时间轴和阶段状态）

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId, STAGES_DEF } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')

router.get('/current', (req, res) => {
  const store = getStore()
  const batch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  if (!batch) return res.json(ok(null))
  // 附带阶段时间窗并计算当前阶段
  const stages = store.recruitmentStages.filter((s) => s.batchId === batch.id).sort((a, b) => a.stageNumber - b.stageNumber)
  const now = new Date()
  stages.forEach((s) => {
    const start = new Date(s.startTime)
    const end = new Date(s.endTime)
    if (now < start) s.stageStatus = 'NOT_STARTED'
    else if (now > end) s.stageStatus = 'COMPLETED'
    else s.stageStatus = 'IN_PROGRESS'
  })
  const currentStage = stages.find((s) => s.stageStatus === 'IN_PROGRESS') || stages.find((s) => s.stageStatus === 'NOT_STARTED') || stages[stages.length - 1]
  res.json(ok({ ...batch, stages, currentStage: currentStage ? { no: currentStage.stageNumber, name: currentStage.stageName, key: currentStage.stageKey } : null }))
})

router.get('/', requireAuth, (_req, res) => {
  const store = getStore()
  res.json(ok(store.recruitmentBatches))
})

router.post('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const schema = z.object({
    batchName: z.string().min(2),
    academicYear: z.string().min(4),
    description: z.string().optional()
  })
  const body = schema.parse(req.body || {})
  const store = getStore()
  const id = nextId(store.recruitmentBatches)
  // 同一时间只允许一个进行中的批次
  store.recruitmentBatches.forEach((b) => { if (b.status === 'IN_PROGRESS') b.status = 'COMPLETED' })
  const batch = { id, ...body, status: 'IN_PROGRESS', createdAt: new Date().toISOString() }
  store.recruitmentBatches.push(batch)
  // 自动生成八阶段时间窗（默认各 1 天）
  const base = new Date()
  STAGES_DEF.forEach((s, idx) => {
    const start = new Date(base); start.setDate(start.getDate() + idx)
    const end = new Date(base); end.setDate(end.getDate() + idx + 1)
    store.recruitmentStages.push({
      id: nextId(store.recruitmentStages),
      batchId: id, stageNumber: s.no, stageName: s.name, stageKey: s.key,
      startTime: start.toISOString(), endTime: end.toISOString(), stageStatus: 'NOT_STARTED', description: s.desc
    })
  })
  logOperation(store, req, {
    operationType: 'CREATE_BATCH', targetType: 'BATCH', targetId: id,
    description: `创建选拔批次「${batch.batchName}」（${batch.academicYear}）`
  })
  persistStore(store)
  res.json(ok(batch))
})

router.get('/:id/stages', requireAuth, (req, res) => {
  const store = getStore()
  const list = store.recruitmentStages.filter((s) => s.batchId === Number(req.params.id)).sort((a, b) => a.stageNumber - b.stageNumber)
  res.json(ok(list))
})

// 更新阶段时间（学院管理员）
router.put('/:batchId/stages/:stageId', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const { startTime, endTime, stageStatus } = req.body || {}
  const store = getStore()
  const stage = store.recruitmentStages.find((s) => s.id === Number(req.params.stageId) && s.batchId === Number(req.params.batchId))
  if (!stage) return res.status(404).json({ code: 'NOT_FOUND', message: '阶段不存在', data: null })
  if (startTime) stage.startTime = startTime
  if (endTime) stage.endTime = endTime
  if (stageStatus) stage.stageStatus = stageStatus
  logOperation(store, req, {
    operationType: 'UPDATE_STAGE', targetType: 'STAGE', targetId: stage.id,
    description: `调整阶段「第${stage.stageNumber}阶段 ${stage.stageName}」时间：${stage.startTime} ~ ${stage.endTime}`
  })
  persistStore(store)
  res.json(ok(stage))
})

module.exports = router
