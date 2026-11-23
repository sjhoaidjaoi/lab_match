const { ROLES } = require('../middleware/auth')
const {
  currentBatch: resolveCurrentBatch,
  stageOpen: isStageOpen,
  stageOf
} = require('./recruitment')

function currentBatch(store) {
  return resolveCurrentBatch(store)
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

function scopedChoice(store, user, batchId, studentId, laboratoryId, round) {
  return store.studentPreferences.filter(choice => choice.batchId === batchId &&
    choice.studentId === studentId && choice.laboratoryId === laboratoryId && (round == null || (choice.round || 1) === round) && ownsChoice(store, user, choice))
    .sort((a, b) => (b.round || 1) - (a.round || 1))[0]
}

// 阶段是否开放：统一走时间窗实时判定（不再依赖数据库里的 stageStatus 快照）
function stageOpen(store, batchId, number) {
  return isStageOpen(store, batchId, number)
}

function firstRoundEnded(store, batchId) {
  return stageOf(store, batchId, 5)?.stageStatus === 'COMPLETED'
}

module.exports = { currentBatch, ownsChoice, personalScope, scopedChoice, stageOpen, firstRoundEnded }
