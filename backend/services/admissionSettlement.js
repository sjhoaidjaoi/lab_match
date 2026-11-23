const { stageCompleted } = require('../utils/recruitment')
const rounds = require('../utils/rounds')
const { placedStudents } = require('../utils/allocationPool')
const { labCapacity, mentorCapacityError, occupiedAdmissionStudents } = require('../utils/mentorCapacity')
const { syncFinalAdmissions } = require('../utils/finalSync')
const { nextId } = require('../data/seed')

// Only settle after the first confirmation window closes: another mentor may still send an offer before then.
function settleFirstRound(store, batch) {
  if (!batch || batch.status === 'STOPPED' || !rounds.roundOpen(store, batch.id, 1) || !stageCompleted(store, batch.id, 5)) return 0
  const offers = store.admissionIntentions.filter(item => item.batchId === batch.id && rounds.roundOf(item) === 1)
  const intended = offers.filter(item => item.admissionType === 'INTENDED')
  const counts = new Map()
  for (const item of intended) counts.set(item.studentId, (counts.get(item.studentId) || 0) + 1)
  const placed = placedStudents(store, batch.id)
  let changed = 0
  const now = new Date().toISOString()
  function confirm(item) {
    const lab = store.laboratories.find(row => row.id === item.laboratoryId && row.status === 'ACTIVE')
    if (!lab || placed.has(item.studentId)) return false
    const taken = occupiedAdmissionStudents(store, batch.id, { laboratoryId: lab.id })
    taken.delete(item.studentId)
    if (taken.size >= labCapacity(store, batch.id, lab) || mentorCapacityError(store, batch.id, item.labTeacherId, item.studentId)) return false
    Object.assign(item, { admissionType: 'INTENDED', status: 'CONFIRMED', autoConfirmed: true, confirmedAt: now })
    placed.set(item.studentId, item)
    store.notices.push({ id: nextId(store.notices), batchId: batch.id, targetRole: 'STUDENT', targetUserId: item.studentId,
      title: '唯一拟录取已确认', content: `本轮唯一去向为「${lab.name}」，已自动确认。`, destination: 'STUDENT_ADMISSION', read: false, createdAt: now })
    return true
  }
  for (const item of intended.filter(row => row.status === 'PENDING')) {
    if (counts.get(item.studentId) !== 1 || !confirm(item)) Object.assign(item, { status: 'EXPIRED', releasedAt: now })
    changed++
  }
  // When places are released at the deadline, respect the submitted alternate order in each room.
  // A student with multiple possible destinations still needs to choose personally in a later round.
  const waitlist = offers.filter(item => item.admissionType === 'ALTERNATE' && item.status === 'PENDING' && !counts.has(item.studentId))
    .sort((a,b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id)
  const labs = new Map()
  for (const item of waitlist) {
    if (!labs.has(item.studentId)) labs.set(item.studentId, new Set())
    labs.get(item.studentId).add(item.laboratoryId)
  }
  for (const item of waitlist) {
    if (labs.get(item.studentId).size === 1 && confirm(item)) { item.promotedAt = now; changed++ }
  }
  if (changed) syncFinalAdmissions(store, batch.id, { strict: false })
  return changed
}
module.exports = { settleFirstRound }
