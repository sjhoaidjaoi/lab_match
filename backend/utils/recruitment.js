// ============ 选拔流程状态服务 ============
// 统一负责：批次有效性、八阶段有效状态推导、业务写入闸门。
// 设计原则：阶段"有效状态"一律由时间窗实时推导，数据库里的 stageStatus 只是快照，
// 只保留人工干预（PAUSED）语义，避免"到点不开始"或"暂停被自动恢复"。

const STAGE_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED'
}

const BATCH_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  STOPPED: 'STOPPED'
}

const STAGE_STATUS_LABELS = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  PAUSED: '已暂停'
}

const BATCH_STATUS_LABELS = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  STOPPED: '已停止'
}

function listBatches(store) {
  return Array.isArray(store.recruitmentBatches) ? store.recruitmentBatches : []
}

function findBatch(store, batchId) {
  return listBatches(store).find((b) => b.id === Number(batchId)) || null
}

// 当前批次：取最新创建的批次（批次按学期顺序建立，最新的一条即正在推进的批次）
// 这样「停止最新批次」后系统不会回退到更早的批次继续收业务，符合"停止 ≠ 暂停"的语义。
// 批次状态按本批阶段时间窗实时推导，避免"阶段在跑但批次显示已结束"。
function currentBatch(store, now = Date.now()) {
  const list = listBatches(store)
  if (!list.length) return null
  const newest = [...list].sort((a, b) => {
    const byTime = String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    return byTime !== 0 ? byTime : Number(a.id) - Number(b.id)
  })[list.length - 1]
  return { ...newest, status: deriveBatchStatus(newest, rawStagesOf(store, newest.id), now) }
}

function isBatchStopped(batch) {
  return Boolean(batch) && batch.status === BATCH_STATUS.STOPPED
}

// 业务写入闸门：返回错误文案或 null
function batchWritableError(batch) {
  if (!batch) return '当前没有选拔批次'
  if (batch.status === BATCH_STATUS.STOPPED) {
    return `选拔批次「${batch.batchName || batch.id}」已停止，不再接受新的业务操作`
  }
  if (batch.status === BATCH_STATUS.COMPLETED) {
    return `选拔批次「${batch.batchName || batch.id}」已结束`
  }
  return null
}

// 阶段有效状态：人工干预优先，其余按时间窗判定
// 人工干预有两类：暂停（PAUSED）、提前结束（COMPLETED），记录在 statusOverride 上，
// 不会被定时同步覆盖；恢复自动流转需显式清空 statusOverride。
// 边界：now < start → 未开始；start <= now < end → 进行中；now >= end → 已结束
function deriveStageStatus(stage, now = Date.now()) {
  if (!stage) return null
  const override = stage.statusOverride
    || (stage.stageStatus === STAGE_STATUS.PAUSED ? STAGE_STATUS.PAUSED : null)
  if (override === STAGE_STATUS.PAUSED) return STAGE_STATUS.PAUSED
  if (override === STAGE_STATUS.COMPLETED) return STAGE_STATUS.COMPLETED
  const start = stage.startTime ? Date.parse(stage.startTime) : NaN
  const end = stage.endTime ? Date.parse(stage.endTime) : NaN
  const hasStart = Number.isFinite(start)
  const hasEnd = Number.isFinite(end)
  if (!hasStart && !hasEnd) return stage.stageStatus || STAGE_STATUS.NOT_STARTED
  if (hasStart && now < start) return STAGE_STATUS.NOT_STARTED
  if (hasEnd && now >= end) return STAGE_STATUS.COMPLETED
  return STAGE_STATUS.IN_PROGRESS
}

function stageWithRuntimeStatus(stage, now = Date.now()) {
  if (!stage) return null
  return { ...stage, stageStatus: deriveStageStatus(stage, now) }
}

function rawStagesOf(store, batchId) {
  return (store.recruitmentStages || [])
    .filter((s) => s.batchId === Number(batchId))
    .sort((a, b) => a.stageNumber - b.stageNumber)
}

// 批次有效状态：已停止是人工干预，永久优先；其余按本批阶段推导
// 任一阶段进行中/已暂停 → 进行中；全部结束 → 已结束；首阶段未开始 → 未开始
function deriveBatchStatus(batch, stages, now = Date.now()) {
  if (!batch) return null
  if (batch.status === BATCH_STATUS.STOPPED) return BATCH_STATUS.STOPPED
  const list = (stages || []).slice().sort((a, b) => a.stageNumber - b.stageNumber)
  if (!list.length) return batch.status || BATCH_STATUS.NOT_STARTED
  const derived = list.map((stage) => deriveStageStatus(stage, now))
  if (derived.some((status) => status === STAGE_STATUS.IN_PROGRESS || status === STAGE_STATUS.PAUSED)) {
    return BATCH_STATUS.IN_PROGRESS
  }
  if (derived.every((status) => status === STAGE_STATUS.COMPLETED)) return BATCH_STATUS.COMPLETED
  if (derived.every((status) => status === STAGE_STATUS.NOT_STARTED)) return BATCH_STATUS.NOT_STARTED
  // 阶段之间有空档：前段已结束、后段未开始，仍视为批次推进中
  return BATCH_STATUS.IN_PROGRESS
}

function batchStages(store, batchId, now = Date.now()) {
  return (store.recruitmentStages || [])
    .filter((s) => s.batchId === Number(batchId))
    .sort((a, b) => a.stageNumber - b.stageNumber)
    .map((s) => stageWithRuntimeStatus(s, now))
}

function stageOf(store, batchId, stageNumber, now = Date.now()) {
  const stage = (store.recruitmentStages || []).find(
    (s) => s.batchId === Number(batchId) && s.stageNumber === Number(stageNumber)
  )
  return stageWithRuntimeStatus(stage, now)
}

function stageOpen(store, batchId, stageNumber, now = Date.now()) {
  const batch = findBatch(store, batchId)
  if (isBatchStopped(batch)) return false
  const stage = stageOf(store, batchId, stageNumber, now)
  return stage?.stageStatus === STAGE_STATUS.IN_PROGRESS
}

function stageCompleted(store, batchId, stageNumber, now = Date.now()) {
  const stage = stageOf(store, batchId, stageNumber, now)
  return stage?.stageStatus === STAGE_STATUS.COMPLETED
}

// 把推导结果回写数据库快照（保持接口/前端读取一致），返回变更条数
// 已停止批次冻结，不自动推进
function syncStageStatuses(store, now = Date.now()) {
  let changed = 0
  for (const stage of store.recruitmentStages || []) {
    const batch = findBatch(store, stage.batchId)
    if (isBatchStopped(batch)) continue
    const next = deriveStageStatus(stage, now)
    if (next && next !== stage.stageStatus) {
      stage.stageStatus = next
      changed += 1
    }
  }
  for (const batch of listBatches(store)) {
    if (isBatchStopped(batch)) continue
    const next = deriveBatchStatus(batch, rawStagesOf(store, batch.id), now)
    if (next && next !== batch.status) {
      batch.status = next
      changed += 1
    }
  }
  return changed
}

// 当前阶段：进行中优先；否则第一个未开始；否则最后一个已结束
function resolveCurrentStage(stages) {
  if (!stages || !stages.length) return null
  return (
    stages.find((s) => s.stageStatus === STAGE_STATUS.IN_PROGRESS) ||
    stages.find((s) => s.stageStatus === STAGE_STATUS.PAUSED) ||
    stages.find((s) => s.stageStatus === STAGE_STATUS.NOT_STARTED) ||
    stages[stages.length - 1]
  )
}

module.exports = {
  STAGE_STATUS,
  BATCH_STATUS,
  STAGE_STATUS_LABELS,
  BATCH_STATUS_LABELS,
  currentBatch,
  findBatch,
  isBatchStopped,
  batchWritableError,
  deriveStageStatus,
  deriveBatchStatus,
  stageWithRuntimeStatus,
  batchStages,
  stageOf,
  stageOpen,
  stageCompleted,
  syncStageStatuses,
  resolveCurrentStage
}
