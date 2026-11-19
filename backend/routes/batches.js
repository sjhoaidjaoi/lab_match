// ============ 选拔批次 + 八阶段时间窗 ============
// GET  /api/batches/current      当前批次（含实时阶段状态）
// GET  /api/batches              批次列表
// POST /api/batches              创建批次
// GET  /api/batches/:id/stages   八阶段时间窗（有效状态实时推导）
// PUT  /api/batches/:batchId/stages/:stageId   调整时间/暂停/恢复
// POST /api/batches/:id/stop     停止批次（终止本次选拔）
// POST /api/batches/:id/reopen   恢复已停止批次（受权限控制的独立流程）

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId, STAGES_DEF } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')
const {
  STAGE_STATUS,
  BATCH_STATUS,
  STAGE_STATUS_LABELS,
  BATCH_STATUS_LABELS,
  currentBatch,
  findBatch,
  batchWritableError,
  batchStages,
  syncStageStatuses,
  resolveCurrentStage
} = require('../utils/recruitment')

const collge = requireRole(ROLES.COLLEGE_ADMIN)

// 读取前先把时间窗推导结果写回快照，保证接口/前端看到的状态与时间一致
function syncAndPersist(store) {
  if (syncStageStatuses(store) > 0) persistStore(store)
}

router.get('/current', (req, res) => {
  const store = getStore()
  syncAndPersist(store)
  const batch = currentBatch(store)
  if (!batch) return res.json(ok(null))
  const stages = batchStages(store, batch.id)
  const currentStage = resolveCurrentStage(stages)
  res.json(ok({
    ...batch,
    stages,
    currentStage: currentStage
      ? { no: currentStage.stageNumber, name: currentStage.stageName, key: currentStage.stageKey, status: currentStage.stageStatus }
      : null,
    writable: !batchWritableError(batch),
    statusLabel: BATCH_STATUS_LABELS[batch.status] || batch.status
  }))
})

router.get('/', requireAuth, (req, res) => {
  const store = getStore()
  syncAndPersist(store)
  res.json(ok(store.recruitmentBatches.map((b) => ({
    ...b,
    statusLabel: BATCH_STATUS_LABELS[b.status] || b.status,
    writable: !batchWritableError(b)
  }))))
})

router.post('/', requireAuth, collge, (req, res) => {
  const schema = z.object({
    batchName: z.string().min(2),
    academicYear: z.string().min(4),
    description: z.string().optional()
  })
  const body = schema.parse(req.body || {})
  const store = getStore()
  const id = nextId(store.recruitmentBatches)
  // 批次状态由八阶段时间窗推导，这里不再强行改写历史批次状态；
  // 当前批次按"进行中优先、最新优先"选取，新建批次即成为当前批次（见 currentBatch）
  const batch = { id, ...body, status: BATCH_STATUS.IN_PROGRESS, createdAt: new Date().toISOString() }
  store.recruitmentBatches.push(batch)
  // 自动生成八阶段时间窗（默认各 1 天）
  const base = new Date()
  STAGES_DEF.forEach((s, idx) => {
    const start = new Date(base); start.setDate(start.getDate() + idx)
    const end = new Date(base); end.setDate(end.getDate() + idx + 1)
    store.recruitmentStages.push({
      id: nextId(store.recruitmentStages),
      batchId: id, stageNumber: s.no, stageName: s.name, stageKey: s.key,
      startTime: start.toISOString(), endTime: end.toISOString(),
      stageStatus: STAGE_STATUS.NOT_STARTED, description: s.desc
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
  syncAndPersist(store)
  res.json(ok(batchStages(store, Number(req.params.id))))
})

// 更新阶段时间 / 暂停 / 恢复
router.put('/:batchId/stages/:stageId', requireAuth, collge, (req, res) => {
  const schema = z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    // PAUSED=暂停；COMPLETED=提前结束；STARTED=提前开始；
    // IN_PROGRESS/NOT_STARTED=清除人工干预、恢复按时间自动流转
    stageStatus: z.enum([
      STAGE_STATUS.PAUSED,
      STAGE_STATUS.COMPLETED,
      STAGE_STATUS.STARTED,
      STAGE_STATUS.IN_PROGRESS,
      STAGE_STATUS.NOT_STARTED
    ]).optional()
  })
  const body = schema.parse(req.body || {})
  const store = getStore()
  const batchId = Number(req.params.batchId)
  const batch = findBatch(store, batchId)
  if (!batch) return res.status(404).json({ code: 'NOT_FOUND', message: '批次不存在', data: null })
  if (batch.status === BATCH_STATUS.STOPPED) {
    return res.status(409).json({
      code: 'BUSINESS_ERROR',
      message: '该批次已停止，请先在批次管理中恢复批次再调整阶段',
      data: null
    })
  }
  const stage = store.recruitmentStages.find((s) => s.id === Number(req.params.stageId) && s.batchId === batchId)
  if (!stage) return res.status(404).json({ code: 'NOT_FOUND', message: '阶段不存在', data: null })

  const nextStart = body.startTime ?? stage.startTime
  const nextEnd = body.endTime ?? stage.endTime
  const startTs = Date.parse(nextStart)
  const endTs = Date.parse(nextEnd)
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
    return res.status(400).json({ code: 'VALIDATION_FAILED', message: '阶段起止时间格式不正确', data: null })
  }
  if (startTs >= endTs) {
    return res.status(400).json({ code: 'VALIDATION_FAILED', message: '开始时间必须早于结束时间', data: null })
  }
  // 提前开始只提前起点，结束时间照旧生效；结束时间已过就没法「开始」了
  if (body.stageStatus === STAGE_STATUS.STARTED && endTs <= Date.now()) {
    return res.status(400).json({
      code: 'VALIDATION_FAILED',
      message: '该阶段结束时间已过，请先把结束时间调整到当前之后，再提前开始',
      data: null
    })
  }
  // 阶段顺序：不允许早于上一阶段的开始时间
  const siblings = store.recruitmentStages
    .filter((s) => s.batchId === batchId && s.stageNumber < stage.stageNumber)
    .sort((a, b) => b.stageNumber - a.stageNumber)
  const previous = siblings[0]
  if (previous) {
    const prevStart = Date.parse(previous.startTime)
    if (Number.isFinite(prevStart) && startTs < prevStart) {
      return res.status(400).json({
        code: 'VALIDATION_FAILED',
        message: `开始时间不能早于上一阶段「${previous.stageName}」的开始时间`,
        data: null
      })
    }
  }

  const before = {
    startTime: stage.startTime,
    endTime: stage.endTime,
    stageStatus: stage.stageStatus,
    statusOverride: stage.statusOverride || null
  }
  stage.startTime = new Date(startTs).toISOString()
  stage.endTime = new Date(endTs).toISOString()
  if (body.stageStatus) {
    // 人工干预写入 statusOverride，避免被定时同步按时间窗覆盖
    stage.statusOverride = [STAGE_STATUS.PAUSED, STAGE_STATUS.COMPLETED, STAGE_STATUS.STARTED]
      .includes(body.stageStatus)
      ? body.stageStatus
      : null
    stage.stageStatus = body.stageStatus
  }

  // 时间/人工状态变更后立即重算，避免快照与时间窗不一致
  syncStageStatuses(store)

  const statusText = body.stageStatus === STAGE_STATUS.PAUSED ? '，并暂停该阶段'
    : body.stageStatus === STAGE_STATUS.COMPLETED ? '，并提前结束该阶段'
      : body.stageStatus === STAGE_STATUS.STARTED ? '，并提前开始该阶段'
        : body.stageStatus === STAGE_STATUS.IN_PROGRESS ? '，并恢复该阶段自动流转'
          : body.stageStatus === STAGE_STATUS.NOT_STARTED ? '，并撤销人工干预' : ''
  logOperation(store, req, {
    operationType: 'UPDATE_STAGE', targetType: 'STAGE', targetId: stage.id,
    description: `调整阶段「第${stage.stageNumber}阶段 ${stage.stageName}」时间：${stage.startTime} ~ ${stage.endTime}${statusText}`,
    detail: {
      before,
      after: { startTime: stage.startTime, endTime: stage.endTime, stageStatus: stage.stageStatus, statusOverride: stage.statusOverride || null }
    }
  })
  persistStore(store)
  res.json(ok({ ...stage, stageStatusLabel: STAGE_STATUS_LABELS[stage.stageStatus] || stage.stageStatus }))
})

// 停止批次：终止本次选拔，默认不可恢复
router.post('/:id/stop', requireAuth, collge, (req, res) => {
  const schema = z.object({
    reason: z.string().trim().min(2, '请填写停止原因').max(200)
  })
  const body = schema.parse(req.body || {})
  const store = getStore()
  const batch = findBatch(store, req.params.id)
  if (!batch) return res.status(404).json({ code: 'NOT_FOUND', message: '批次不存在', data: null })
  if (batch.status === BATCH_STATUS.STOPPED) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: '该批次已停止', data: null })
  }
  const before = batch.status
  batch.status = BATCH_STATUS.STOPPED
  batch.stoppedAt = new Date().toISOString()
  batch.stoppedBy = req.user.uid
  batch.stopReason = body.reason
  // 尚未结束的阶段保持当前快照，之后不再自动推进
  logOperation(store, req, {
    operationType: 'STOP_BATCH', targetType: 'BATCH', targetId: batch.id,
    description: `停止选拔批次「${batch.batchName}」，原因：${body.reason}`,
    detail: { before, after: BATCH_STATUS.STOPPED }
  })
  persistStore(store)
  res.json(ok({
    id: batch.id, status: batch.status, statusLabel: BATCH_STATUS_LABELS[batch.status],
    stoppedAt: batch.stoppedAt, stopReason: batch.stopReason
  }))
})

// 恢复已停止批次：独立流程，必须填写原因，恢复后进行中的批次互斥
router.post('/:id/reopen', requireAuth, collge, (req, res) => {
  const schema = z.object({ reason: z.string().trim().min(2, '请填写恢复原因').max(200) })
  const body = schema.parse(req.body || {})
  const store = getStore()
  const batch = findBatch(store, req.params.id)
  if (!batch) return res.status(404).json({ code: 'NOT_FOUND', message: '批次不存在', data: null })
  if (batch.status !== BATCH_STATUS.STOPPED) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: '只有已停止的批次可以恢复', data: null })
  }
  const running = store.recruitmentBatches.find((b) => b.id !== batch.id && b.status === BATCH_STATUS.IN_PROGRESS)
  if (running) {
    return res.status(409).json({
      code: 'BUSINESS_ERROR',
      message: `批次「${running.batchName}」正在进行中，请先停止该批次再恢复`,
      data: null
    })
  }
  batch.status = BATCH_STATUS.IN_PROGRESS
  batch.reopenedAt = new Date().toISOString()
  batch.reopenedBy = req.user.uid
  batch.reopenReason = body.reason
  logOperation(store, req, {
    operationType: 'REOPEN_BATCH', targetType: 'BATCH', targetId: batch.id,
    description: `恢复已停止批次「${batch.batchName}」，原因：${body.reason}`
  })
  persistStore(store)
  res.json(ok({ id: batch.id, status: batch.status, statusLabel: BATCH_STATUS_LABELS[batch.status] }))
})

module.exports = router
