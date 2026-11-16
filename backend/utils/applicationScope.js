const { ROLES } = require('../middleware/auth')

function currentBatch(store) {
  return store.recruitmentBatches.find(batch => batch.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
}

function personalScope(user) {
  return user.activeRole === ROLES.LAB_LEADER ? { ...user, activeRole: ROLES.LAB_TEACHER } : user
}

function ownsChoice(store, user, choice) {
  if (!choice || choice.status !== 'SUBMITTED') return false
  if (user.activeRole === ROLES.COLLEGE_ADMIN) return true
  if (user.activeRole === ROLES.STUDENT) return choice.studentId === user.uid
  if (Number(user.laboratoryId) !== choice.laboratoryId) return false
  const mentor = store.labTeachers.find(item => item.id === choice.labTeacherId && item.laboratoryId === choice.laboratoryId)
  if (user.activeRole === ROLES.LAB_LEADER) return Boolean(mentor)
  return user.activeRole === ROLES.LAB_TEACHER && mentor?.userId === user.uid
}

function scopedChoice(store, user, batchId, studentId, laboratoryId) {
  return store.studentPreferences.find(choice => choice.batchId === batchId &&
    choice.studentId === studentId && choice.laboratoryId === laboratoryId && ownsChoice(store, user, choice))
}

function stageOpen(store, batchId, number) {
  const stage = store.recruitmentStages.find(item => item.batchId === batchId && item.stageNumber === number)
  const now = Date.now()
  return stage?.stageStatus === 'IN_PROGRESS' &&
    (!stage.startTime || Date.parse(stage.startTime) <= now) &&
    (!stage.endTime || Date.parse(stage.endTime) >= now)
}

function firstRoundEnded(store, batchId) {
  return store.recruitmentStages.some(stage => stage.batchId === batchId &&
    ((stage.stageNumber === 5 && stage.stageStatus === 'COMPLETED') ||
      (stage.stageNumber >= 6 && ['IN_PROGRESS', 'COMPLETED'].includes(stage.stageStatus))))
}

module.exports = { currentBatch, ownsChoice, personalScope, scopedChoice, stageOpen, firstRoundEnded }
