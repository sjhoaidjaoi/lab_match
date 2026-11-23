const { collectConfirmed } = require('./finalSync')
const { labName, labSurplus } = require('./labQuota')
const rounds = require('./rounds')

const PRIORITY_LABELS = { 1: '实训室内部调剂', 2: '全院跨实训室调剂', 3: '暂无符合意愿的去向' }

function placedStudents(store, batchId) {
  const { confirmed } = collectConfirmed(store, batchId)
  for (const item of store.finalAdmissions || []) {
    if (item.batchId === batchId && item.finalStatus !== 'REJECTED' && !confirmed.has(item.studentId)) confirmed.set(item.studentId, item)
  }
  return confirmed
}

function poolCandidates(store, batch) {
  const surplus = labSurplus(store, batch)
  const stats = new Map(surplus.labs.map((lab) => [lab.id, lab]))
  const placed = placedStudents(store, batch.id)

  const prefs = (store.studentPreferences || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && row.status === 'SUBMITTED')
  const byStudent = new Map()
  prefs.forEach((row) => {
    if (!byStudent.has(row.studentId)) byStudent.set(row.studentId, [])
    byStudent.get(row.studentId).push(row)
  })

  const rows = []
  byStudent.forEach((history, studentId) => {
    const latest = Math.max(...history.map(rounds.roundOf))
    const choices = history.filter(row => rounds.roundOf(row) === latest)
    if (placed.has(studentId)) return
    const student = (store.users || []).find((user) => user.id === studentId)
    if (!student || student.status !== 'ACTIVE') return
    const obeyCollege = choices.some((row) => row.obeyCollegeAdjustment)
    const obeyInternal = choices.some((row) => row.obeyInternalAdjustment)

    const preferred = new Set(choices.map(row => Number(row.laboratoryId)))
    const vacancies = surplus.labs.filter(lab => lab.remaining > 0)
    const internal = vacancies.filter(lab => choices.some(row =>
      Number(row.laboratoryId) === lab.id && row.obeyInternalAdjustment))
    const cross = obeyCollege ? vacancies.filter(lab => !preferred.has(lab.id)) : []
    const eligible = internal.length ? internal : cross
    const priority = internal.length ? 1 : cross.length ? 2 : 3
    const target = eligible[0]
    const reason = ['','志愿实训室有余量，学生同意室内调剂','学生同意全院调剂，可安排到其他实训室','当前没有同时满足本人意愿和名额条件的去向'][priority]

    rows.push({
      studentId,
      studentName: student?.realName || '',
      studentNumber: student?.studentNumber || '',
      priority,
      priorityLabel: PRIORITY_LABELS[priority],
      obeyInternalAdjustment: obeyInternal,
      obeyCollegeAdjustment: obeyCollege,
      preferredLabs: choices.map((row) => ({
        laboratoryId: row.laboratoryId, laboratoryName: labName(stats.get(Number(row.laboratoryId))) ||
          labName((store.laboratories || []).find((lab) => lab.id === row.laboratoryId))
      })),
      pendingProposal: store.adjustments.some(item => item.batchId === batch.id && item.studentId === studentId && item.requiresConsent && item.status === 'PENDING'),
      eligibleLaboratoryIds: eligible.map(lab => lab.id),
      suggestedLaboratoryId: target?.id ?? null,
      suggestedLaboratoryName: target?.name ?? '',
      suggestedLabTeacherId: null,
      reason
    })
  })

  rows.sort((a, b) => a.priority - b.priority || a.studentNumber.localeCompare(b.studentNumber))
  return { surplus, rows }
}

module.exports = { poolCandidates, placedStudents }
