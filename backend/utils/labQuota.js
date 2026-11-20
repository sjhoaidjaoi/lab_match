// ============ 名额口径（唯一实现处）============
// 剩余名额 = 学年计划 − 已录取 − 待确认占位（min 0）。
// 学院端「各实训室剩余名额」接口、调剂池、学生补录、E宝 助手的事实快照都走这里，
// 避免「卡片显示 5 个、助教说 6 个」这种两套口径的问题。

const { labCapacity, teacherCapacity, invitationExpired } = require('./mentorCapacity')

function labName(lab) {
  if (!lab) return ''
  return lab.name || (lab.labCode ? `${lab.labCode} 实训室` : `实训室#${lab.id}`)
}

// 单个实训室的名额明细：计划 / 已录取 / 待确认占位 / 剩余
function labBreakdown(store, batchId, lab) {
  const plan = Math.max(0, Number(labCapacity(store, batchId, lab)) || 0)
  const admitted = new Set()
  const pending = new Set()

  ;(store.admissionIntentions || []).forEach((row) => {
    if (Number(row.batchId) !== Number(batchId) || Number(row.laboratoryId) !== Number(lab.id)) return
    if (row.admissionType !== 'INTENDED') return
    if (row.status === 'CONFIRMED') admitted.add(row.studentId)
    else if (row.status === 'PENDING' && !invitationExpired(store, row)) pending.add(row.studentId)
  })
  ;(store.adjustments || []).forEach((row) => {
    if (Number(row.batchId) === Number(batchId) || row.status !== 'CONFIRMED') return
    if (Number(row.targetLaboratoryId) === Number(lab.id)) admitted.add(row.studentId)
  })
  ;(store.finalAdmissions || []).forEach((row) => {
    if (Number(row.batchId) !== Number(batchId) || row.finalStatus === 'REJECTED') return
    if (Number(row.laboratoryId) === Number(lab.id)) admitted.add(row.studentId)
  })

  const confirmedOnly = admitted.size
  const pendingOnly = [...pending].filter((id) => !admitted.has(id)).length
  return {
    plan,
    admitted: confirmedOnly,
    pending: pendingOnly,
    remaining: Math.max(0, plan - confirmedOnly - pendingOnly)
  }
}

// 全部在用实训室的名额与导师名额明细
function labSurplus(store, batch, options = {}) {
  const year = batch.academicYear || ''
  const labs = (store.laboratories || [])
    .filter((lab) => (lab.status || 'ACTIVE') === 'ACTIVE')
    .map((lab) => {
      const stats = labBreakdown(store, batch.id, lab)
      const teachers = (store.labTeachers || [])
        .filter((teacher) => Number(teacher.laboratoryId) === Number(lab.id) && teacher.status !== 'INACTIVE')
        .map((teacher) => {
          const raw = teacherCapacity(store, batch.id, teacher)
          // 未单独设定导师名额时表示「不单独设限」，用 null 表达，前端显示为「不限」
          const quota = raw == null ? null : Math.max(0, Number(raw) || 0)
          const taken = new Set()
          ;(store.admissionIntentions || []).forEach((row) => {
            if (Number(row.batchId) === Number(batch.id) && row.status === 'CONFIRMED' &&
              Number(row.labTeacherId) === Number(teacher.id)) taken.add(row.studentId)
          })
          ;(store.adjustments || []).forEach((row) => {
            if (Number(row.batchId) === Number(batch.id) && row.status === 'CONFIRMED' &&
              Number(row.targetLabTeacherId) === Number(teacher.id)) taken.add(row.studentId)
          })
          return {
            id: teacher.id, name: teacher.name, identity: teacher.identity,
            quota, admitted: taken.size,
            remaining: quota == null ? null : Math.max(0, quota - taken.size)
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
      return {
        id: lab.id, labCode: lab.labCode || '', name: labName(lab),
        college: lab.college || '', location: lab.location || '',
        researchDirection: lab.researchDirection || '',
        academicYear: year, ...stats, teachers
      }
    })

  const totals = labs.reduce((sum, lab) => ({
    plan: sum.plan + lab.plan,
    admitted: sum.admitted + lab.admitted,
    pending: sum.pending + lab.pending,
    remaining: sum.remaining + lab.remaining
  }), { plan: 0, admitted: 0, pending: 0, remaining: 0 })

  return { academicYear: year, labs, totals }
}

module.exports = { labName, labBreakdown, labSurplus }
