// ============ 多轮补录：轮次口径 ============
// 第 1 轮为主线录取，第 2、3 轮为补录轮；三轮结束后剩余名额进入全院调剂池。
// 历史数据没有 round 字段，一律视为第 1 轮（见 data/seed.js migrateStore）。

const MAX_ROUND = 3

const ROUND_LABELS = { 1: '第一轮', 2: '第二轮补录', 3: '第三轮补录' }

function roundOf(row) {
  const value = Number(row?.round)
  return Number.isInteger(value) && value >= 1 ? value : 1
}

function nextIdOf(list) {
  return list.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1
}

function roundsOf(store, batchId) {
  return (store.recruitmentRounds || [])
    .filter((row) => Number(row.batchId) === Number(batchId))
    .sort((a, b) => a.round - b.round)
}

// 有效轮次视图：没有任何记录时，第 1 轮视为隐式开放（历史批次无需先迁移）
function effectiveRounds(store, batchId) {
  const list = roundsOf(store, batchId)
  if (list.length) return list
  return [{
    id: null, batchId: Number(batchId), round: 1, label: ROUND_LABELS[1],
    status: 'OPEN', openedAt: null, closedAt: null, virtual: true
  }]
}

// 取当前轮次号：有记录取最大值，否则视为第 1 轮
function currentRoundOf(store, batchId) {
  const list = effectiveRounds(store, batchId)
  return list[list.length - 1].round
}

// 正在开放报名的轮次（同一时间最多一个）
function openRoundOf(store, batchId) {
  return effectiveRounds(store, batchId).find((row) => row.status === 'OPEN') || null
}

// 该轮是否处于开放状态
function roundOpen(store, batchId, round) {
  return effectiveRounds(store, batchId).some((row) => row.round === Number(round) && row.status === 'OPEN')
}

function roundView(store, batchId) {
  const list = effectiveRounds(store, batchId)
  const current = currentRoundOf(store, batchId)
  const open = openRoundOf(store, batchId)
  return {
    current,
    max: MAX_ROUND,
    open: open ? open.round : null,
    canOpenNext: !open && current < MAX_ROUND,
    rounds: list.map((row) => ({
      round: row.round,
      label: row.label || ROUND_LABELS[row.round] || `第 ${row.round} 轮`,
      status: row.status,
      openedAt: row.openedAt || null,
      closedAt: row.closedAt || null
    }))
  }
}

// 补齐第 1 轮记录（幂等）。历史批次第一次被访问时自动补建。
function ensureBaseRound(store, batchId, operatorId) {
  const list = roundsOf(store, batchId)
  if (list.length) return list
  store.recruitmentRounds = store.recruitmentRounds || []
  store.recruitmentRounds.push({
    id: nextIdOf(store.recruitmentRounds),
    batchId: Number(batchId),
    round: 1,
    label: ROUND_LABELS[1],
    status: 'OPEN',
    openedAt: new Date().toISOString(),
    closedAt: null,
    createdBy: operatorId ?? null,
    createdAt: new Date().toISOString()
  })
  return roundsOf(store, batchId)
}

// 开启指定轮次；不传则自动开启下一轮
function openRound(store, batchId, round, operatorId) {
  const list = ensureBaseRound(store, batchId, operatorId)
  const target = round == null ? Math.min(MAX_ROUND, currentRoundOf(store, batchId) + 1) : Number(round)
  if (!Number.isInteger(target) || target < 1 || target > MAX_ROUND) return { error: `轮次必须是 1-${MAX_ROUND}` }
  if (list.some((row) => row.status === 'OPEN')) return { error: '已有轮次正在开放，请先结束当前轮' }
  if (target <= currentRoundOf(store, batchId) && list.some((row) => row.round === target)) {
    return { error: '该轮次已结束，不能重复开启' }
  }
  if (target > currentRoundOf(store, batchId) + 1) return { error: '只能按顺序开启下一轮' }
  store.recruitmentRounds.push({
    id: nextIdOf(store.recruitmentRounds),
    batchId: Number(batchId),
    round: target,
    label: ROUND_LABELS[target] || `第 ${target} 轮`,
    status: 'OPEN',
    openedAt: new Date().toISOString(),
    closedAt: null,
    createdBy: operatorId ?? null,
    createdAt: new Date().toISOString()
  })
  return { round: target }
}

function closeRound(store, batchId, round, operatorId) {
  const row = ensureBaseRound(store, batchId, operatorId).find((item) => item.round === Number(round))
  if (!row) return { error: '轮次不存在' }
  if (row.status !== 'OPEN') return { error: '该轮次不是开放状态' }
  row.status = 'CLOSED'
  row.closedAt = new Date().toISOString()
  row.closedBy = operatorId ?? null
  return { round: row.round }
}

module.exports = {
  MAX_ROUND, ROUND_LABELS, roundOf, roundsOf, effectiveRounds, currentRoundOf, openRoundOf,
  roundOpen, roundView, ensureBaseRound, openRound, closeRound
}
