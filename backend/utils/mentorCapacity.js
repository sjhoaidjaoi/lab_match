const rounds = require('./rounds')
const { firstRoundEnded } = require('./applicationScope')

function labCapacity(store, batchId, lab) {
  const year = store.recruitmentBatches.find(batch => batch.id === batchId)?.academicYear
  return (store.labYearlyPlans || []).find(row => row.laboratoryId === lab.id && row.academicYear === year)?.totalQuota ??
    lab.recruitmentQuota
}

function teacherCapacity(store, batchId, teacher) {
  const year = store.recruitmentBatches.find(batch => batch.id === batchId)?.academicYear
  return (store.teacherYearlyQuotas || []).find(row => row.labTeacherId === teacher.id && row.academicYear === year)?.quota ??
    teacher.recruitmentQuota
}

function invitationExpired(store, item) {
  if (item.status !== 'PENDING') return false
  if (item.confirmationDeadline && Date.parse(item.confirmationDeadline) < Date.now()) return true
  if (!rounds.roundOpen(store, item.batchId, rounds.roundOf(item))) return true
  if (rounds.roundOf(item) > 1) return false
  return item.source === 'TEACHER_INVITATION' && firstRoundEnded(store, item.batchId)
}

function occupiesInvitation(store, item) {
  return item.admissionType === 'INTENDED' && (item.status === 'CONFIRMED' ||
    (item.status === 'PENDING' && !invitationExpired(store, item)))
}

function occupiedAdmissionStudents(store, batchId, { laboratoryId, mentorId } = {}) {
  const matches = (lab, mentor) => (laboratoryId == null || laboratoryId === lab) &&
    (mentorId == null || mentorId === mentor)
  const assignedMentor = item => item.labTeacherId ?? (mentorId == null ? null : store.studentPreferences.find(choice =>
    choice.batchId === batchId && choice.studentId === item.studentId &&
    choice.laboratoryId === item.laboratoryId && choice.status === 'SUBMITTED')?.labTeacherId)
  const occupied = new Set()
  for (const item of store.admissionIntentions) {
    if (item.batchId === batchId && matches(item.laboratoryId, assignedMentor(item)) && occupiesInvitation(store, item)) {
      occupied.add(item.studentId)
    }
  }
  for (const item of store.adjustments) {
    if (item.batchId === batchId && matches(item.targetLaboratoryId, item.targetLabTeacherId) && item.status === 'CONFIRMED') occupied.add(item.studentId)
  }
  for (const item of store.finalAdmissions) {
    if (item.batchId === batchId && matches(item.laboratoryId, assignedMentor(item)) && item.finalStatus !== 'REJECTED') occupied.add(item.studentId)
  }
  return occupied
}

function mentorCapacityError(store, batchId, teacherId, studentId) {
  if (!teacherId) return null
  const teacher = store.labTeachers.find(item => item.id === teacherId)
  if (!teacher || teacher.status === 'INACTIVE') return '指导教师当前不可用'
  const quota = teacherCapacity(store, batchId, teacher)
  if (quota == null) return null
  const occupied = occupiedAdmissionStudents(store, batchId, { mentorId: teacherId })
  occupied.delete(studentId)
  return occupied.size >= quota ? `「${teacher.name}」的导师招生名额已满` : null
}

module.exports = { invitationExpired, mentorCapacityError, occupiedAdmissionStudents, occupiesInvitation, labCapacity, teacherCapacity }

