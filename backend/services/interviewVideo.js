const { createHash, randomUUID } = require('node:crypto')
const { AccessToken, RoomServiceClient, DataPacket_Kind } = require('livekit-server-sdk')
const { BusinessError } = require('../middleware/error')
const { ROLES, isLabLeader } = require('../middleware/auth')
const { currentBatch, stageOpen, stageOf } = require('../utils/recruitment')

const EARLY_JOIN_MS = 10 * 60_000
const TOKEN_TTL_SECONDS = 30

function liveKitConfig() {
  const { LIVEKIT_URL: value, LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret } = process.env
  let url
  try { url = new URL(value) } catch { return null }
  if (url.protocol !== 'wss:' || url.username || url.password || !key?.trim() || !secret?.trim()) return null
  return { url: url.origin, key, secret }
}

function requireConfig() {
  const config = liveKitConfig()
  if (!config) throw new BusinessError('线上面试服务尚未配置，请联系学院管理员', 'VIDEO_UNAVAILABLE', 503)
  return config
}

function canPanel(user, labId) {
  return labId != null && user?.status === 'ACTIVE' && user.laboratoryId === labId &&
    [ROLES.LAB_TEACHER, ROLES.LAB_LEADER].includes(user.role)
}

function participantRole(store, user, interview) {
  const lab = store.laboratories.find(item => item.id === interview.laboratoryId)
  const entry = store.interviewParticipants.find(item => item.interviewId === interview.id && item.userId === user.uid)
  if (entry?.participantRole === 'CANDIDATE' && user.activeRole === ROLES.STUDENT && interview.studentId === user.uid) return 'CANDIDATE'
  if (user.laboratoryId === interview.laboratoryId &&
    [ROLES.LAB_TEACHER, ROLES.LAB_LEADER].includes(user.activeRole) &&
    ['HOST', 'PANEL'].includes(entry?.participantRole)) return entry.participantRole
  if (user.activeRole === ROLES.COLLEGE_ADMIN || (lab && isLabLeader({ user }, lab))) return 'OBSERVER'
  return null
}

function windowFor(interview) {
  const start = Date.parse(interview.interviewTime)
  return { opensAt: start - EARLY_JOIN_MS, closesAt: start + interview.durationMinutes * 60_000 }
}

function scheduledEnd(store, interview, now = Date.now()) {
  const { closesAt } = windowFor(interview)
  if (!interview.onlineStartedAt && now >= closesAt) return closesAt
  if (currentBatch(store, now)?.id !== interview.batchId || !stageOpen(store, interview.batchId, 4, now)) {
    const stageEnd = Date.parse(stageOf(store, interview.batchId, 4, now)?.endTime)
    return Number.isFinite(stageEnd) && stageEnd < now ? stageEnd : now
  }
  return null
}

function roomStatus(store, interview, now = Date.now()) {
  if (interview.interviewStatus === 'CANCELLED') return 'CANCELLED'
  if (interview.onlineEndedAt) return 'ENDED'
  if (scheduledEnd(store, interview, now) !== null) return 'CLOSED'
  if (now < windowFor(interview).opensAt) return 'UPCOMING'
  return interview.onlineStartedAt ? 'OPEN' : 'WAITING'
}

function publicInterview(store, interview) {
  const { onlineRoomName, onlinePreferenceId, onlineRoomCleanedAt, onlineLockedAt, onlineMediaStartedAt, ...rest } = interview
  if (!onlineRoomName) return rest
  return { ...rest, online: { status: roomStatus(store, interview) } }
}

function newOnlineRoom(preferenceId) {
  return { onlineRoomName: `labmatch-${randomUUID()}`, onlinePreferenceId: preferenceId,
    onlineStartedAt: null, onlineEndedAt: null, onlineRoomCleanedAt: null, onlineLockedAt: null, onlineMediaStartedAt: null }
}

function identityFor(interview, userId) {
  return createHash('sha256').update(`${interview.onlineRoomName}:${userId}`).digest('hex')
}

async function issueToken(config, interview, userId, role, ttl) {
  const token = new AccessToken(config.key, config.secret, { identity: identityFor(interview, userId), ttl })
  token.addGrant({
    roomJoin: true, room: interview.onlineRoomName, canSubscribe: true,
    canPublish: role !== 'OBSERVER', canPublishData: false, canUpdateOwnMetadata: false
  })
  return { url: config.url, token: await token.toJwt() }
}

function roomClient(config) {
  return new RoomServiceClient(config.url.replace(/^wss:/, 'https:'), config.key, config.secret, { requestTimeout: 5 })
}

async function revokeParticipant(config, interview, userId) {
  await roomClient(config).removeParticipant(interview.onlineRoomName, identityFor(interview, userId), {
    revokeTokenTs: BigInt(Math.floor(Date.now() / 1000) + 2)
  })
}

function notifyRoom(config, interview) {
  if (config) void roomClient(config).sendData(interview.onlineRoomName, new Uint8Array([1]),
    DataPacket_Kind.RELIABLE, { topic: 'lab-match-state' }).catch(() => {})
}

async function deleteRoom(config, name) {
  try {
    await roomClient(config).deleteRoom(name)
  } catch (error) {
    if (error.code !== 'not_found' && error.status !== 404) throw error
  }
}

async function closeMeeting(config, interview, participants) {
  const entries = participants.filter(item => item.interviewId === interview.id)
  const results = await Promise.allSettled(entries.map(item => revokeParticipant(config, interview, item.userId)))
  await deleteRoom(config, interview.onlineRoomName)
  const failed = results.find(result => result.status === 'rejected')
  if (failed) throw failed.reason
}

module.exports = {
  TOKEN_TTL_SECONDS, requireConfig, liveKitConfig, canPanel, participantRole, windowFor, scheduledEnd,
  roomStatus, publicInterview, newOnlineRoom, identityFor, issueToken, closeMeeting, revokeParticipant, notifyRoom
}
