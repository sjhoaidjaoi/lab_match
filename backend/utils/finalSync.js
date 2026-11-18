// ============ 最终名单自动同步 ============
// 学院端不再设「名单审核 / 录取确认」环节：学生确认录取、调剂确认、调剂池确认之后，
// 由本模块把结果直接同步进 finalAdmissions，学院端只做汇总与公示。
const { nextId } = require('../data/seed')
const { labCapacity } = require('./mentorCapacity')

// 汇总当前批次已确认的录取去向
function collectConfirmed(store, batchId) {
  const confirmed = new Map()
  const conflicting = new Set()

  function add(studentId, value) {
    const existing = confirmed.get(studentId)
    if (existing && (existing.laboratoryId !== value.laboratoryId ||
      (existing.labTeacherId != null && value.labTeacherId != null && existing.labTeacherId !== value.labTeacherId))) {
      conflicting.add(studentId)
      return
    }
    if (!existing) confirmed.set(studentId, value)
  }

  ;(store.admissionIntentions || [])
    .filter((row) => Number(row.batchId) === Number(batchId) && row.admissionType === 'INTENDED' && row.status === 'CONFIRMED')
    .forEach((row) => add(row.studentId, {
      laboratoryId: row.laboratoryId, labTeacherId: row.labTeacherId ?? null, source: 'INTENDED_CONFIRMED', round: row.round || 1
    }))

  ;(store.adjustments || [])
    .filter((row) => Number(row.batchId) === Number(batchId) && row.status === 'CONFIRMED')
    .forEach((row) => add(row.studentId, {
      laboratoryId: row.targetLaboratoryId, labTeacherId: row.targetLabTeacherId ?? null,
      source: row.adjustmentType, round: row.round || 1
    }))

  return { confirmed, conflicting }
}

// 已确认录取人数（按实训室）
function confirmedCountByLab(store, batchId) {
  const { confirmed } = collectConfirmed(store, batchId)
  const map = new Map()
  confirmed.forEach((value) => map.set(value.laboratoryId, (map.get(value.laboratoryId) || 0) + 1))
  return map
}

// 把已确认结果写进 finalAdmissions；返回同步结果
function syncFinalAdmissions(store, batchId, options = {}) {
  const { confirmed, conflicting } = collectConfirmed(store, batchId)
  if (conflicting.size && options.strict !== false) {
    return { merged: 0, conflicts: [...conflicting], overQuota: [] }
  }

  const perLab = new Map()
  confirmed.forEach((value) => perLab.set(value.laboratoryId, (perLab.get(value.laboratoryId) || 0) + 1))
  const overQuota = (store.laboratories || [])
    .filter((lab) => (perLab.get(lab.id) || 0) > labCapacity(store, batchId, lab))
    .map((lab) => ({ laboratoryId: lab.id, name: lab.name, count: perLab.get(lab.id), capacity: labCapacity(store, batchId, lab) }))
  if (overQuota.length && options.strict !== false) {
    return { merged: 0, conflicts: [], overQuota }
  }

  // 保留已正式入组记录，避免重复同步丢失入组状态
  const enrolled = new Map(
    (store.finalAdmissions || [])
      .filter((row) => Number(row.batchId) === Number(batchId) && row.finalStatus === 'ENROLLED')
      .map((row) => [row.studentId, row])
  )
  store.finalAdmissions = (store.finalAdmissions || []).filter((row) => Number(row.batchId) !== Number(batchId))
  confirmed.forEach((value, studentId) => {
    const was = enrolled.get(studentId)
    store.finalAdmissions.push({
      id: nextId(store.finalAdmissions),
      batchId: Number(batchId),
      studentId,
      laboratoryId: value.laboratoryId,
      labTeacherId: value.labTeacherId ?? null,
      admissionSource: value.source,
      round: value.round || 1,
      finalStatus: was && was.laboratoryId === value.laboratoryId ? 'ENROLLED' : 'ADMITTED',
      confirmedAt: was?.confirmedAt || new Date().toISOString()
    })
  })
  return { merged: confirmed.size, conflicts: [], overQuota: [] }
}

module.exports = { collectConfirmed, confirmedCountByLab, syncFinalAdmissions }
