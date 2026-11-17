const { ROLES } = require('../middleware/auth')
const { scopedChoice } = require('../utils/applicationScope')

const dimensions = ['attitudeScore', 'logicScore', 'programmingScore', 'timeCommitmentScore', 'comprehensiveScore']
const equalWeights = Object.fromEntries(dimensions.map(key => [key, 20]))
const attempt = row => row.attemptNo || 1

function latestInterviews(store) {
  const latest = new Map()
  for (const interview of store.interviews) {
    const key = `${interview.batchId}/${interview.studentId}/${interview.laboratoryId}`
    if (!latest.has(key) || attempt(latest.get(key)) < attempt(interview)) latest.set(key, interview)
  }
  return [...latest.values()]
}

function linkedChoice(store, interview) {
  const explicit = interview.preferenceId ?? interview.onlinePreferenceId
  return store.studentPreferences.find(choice => (explicit == null || explicit === choice.id) &&
    choice.batchId === interview.batchId && choice.studentId === interview.studentId &&
    choice.laboratoryId === interview.laboratoryId && choice.status === 'SUBMITTED')
}

function scorePolicy(store, batchId) {
  return store.interviewScorePolicies.find(item => item.batchId === batchId) ||
    { batchId, weights: equalWeights, aggregation: 'MEAN', reviewThreshold: null }
}

function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100 }

function weighted(scores, weights) {
  return round(dimensions.reduce((total, key) => total + scores[key] * weights[key] / 100, 0))
}

function hasLegacyEvaluation(interview) {
  return Boolean(interview.scoredAt || (interview.interviewStatus === 'COMPLETED' &&
    dimensions.every(key => typeof interview[key] === 'number')))
}

function submittedEvaluations(store, interview) {
  const submitted = new Map()
  for (const item of store.interviewEvaluations) {
    if (item.interviewId === interview.id && item.state === 'SUBMITTED' &&
      (!submitted.has(item.reviewerId) || submitted.get(item.reviewerId).version < item.version)) {
      submitted.set(item.reviewerId, item)
    }
  }
  const owner = interview.scoredBy ?? interview.interviewerId
  if (owner && !submitted.has(owner) && hasLegacyEvaluation(interview)) {
    const scores = Object.fromEntries(dimensions.map(key => [key, interview[key]]))
    submitted.set(owner, { reviewerId: owner, version: 0, state: 'SUBMITTED', scores, total: null,
      evaluation: interview.evaluation, recommendation: interview.recommendation, createdAt: interview.scoredAt })
  }
  return [...submitted.values()]
}

function evaluationSummary(store, interview) {
  const rows = submittedEvaluations(store, interview)
  const scores = rows.filter(item => item.total != null).map(item => Number(item.total)).sort((a, b) => a - b)
  const policy = scorePolicy(store, interview.batchId)
  const middle = Math.floor(scores.length / 2)
  const spread = scores.length > 1 ? round(scores.at(-1) - scores[0]) : null
  return { count: rows.length, scoredCount: scores.length,
    total: !scores.length ? null : round(policy.aggregation === 'MEDIAN'
      ? (scores[middle] + scores[Math.floor((scores.length - 1) / 2)]) / 2
      : scores.reduce((sum, value) => sum + value, 0) / scores.length),
    spread, review: spread != null && policy.reviewThreshold != null && spread > Number(policy.reviewThreshold),
    aggregation: policy.aggregation }
}

function mentorEvaluated(store, interview) {
  if (!interview || interview.exceptionCode || interview.interviewStatus !== 'COMPLETED') return false
  const choice = linkedChoice(store, interview)
  if (!choice) return false
  const mentor = store.labTeachers.find(item => item.id === choice.labTeacherId && item.laboratoryId === interview.laboratoryId)
  return Boolean(mentor?.userId && submittedEvaluations(store, interview).some(item => item.reviewerId === mentor.userId))
}

function canEvaluate(store, user, interview) {
  if (user.activeRole !== ROLES.LAB_TEACHER || user.laboratoryId !== interview.laboratoryId || !linkedChoice(store, interview)) return false
  if ((!interview.interviewerId || interview.interviewerId === user.uid) &&
      scopedChoice(store, user, interview.batchId, interview.studentId, interview.laboratoryId)) return true
  return Boolean(interview.onlineRoomName && store.interviewParticipants.some(item => item.interviewId === interview.id &&
    item.userId === user.uid && item.participantRole === 'PANEL' && !item.removedAt))
}

function appointmentStatus(interview, time = Date.now()) {
  if (!interview?.interviewTime) return 'UNSCHEDULED'
  if (interview.interviewStatus === 'CANCELLED') return 'CANCELLED'
  if (['STUDENT_ABSENT', 'TEACHER_ABSENT'].includes(interview.exceptionCode)) return 'MISSED'
  if (interview.interviewStatus === 'COMPLETED') return 'COMPLETED'
  if (interview.interviewStatus === 'IN_PROGRESS') return 'IN_PROGRESS'
  const start = Date.parse(interview.interviewTime)
  if (interview.onlineRoomName && time >= start + (interview.durationMinutes || 30) * 60000) return 'UNHELD'
  if (interview.rescheduledAt) return 'RESCHEDULED'
  return time >= start - 10 * 60000 ? 'WAITING' : 'SCHEDULED'
}

module.exports = { dimensions, attempt, latestInterviews, linkedChoice, scorePolicy, weighted, mentorEvaluated,
  submittedEvaluations, evaluationSummary, canEvaluate, appointmentStatus }
