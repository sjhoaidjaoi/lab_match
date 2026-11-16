const express = require('express')
const { getStore, commitStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { BusinessError } = require('../middleware/error')
const { currentBatch, stageOf } = require('../utils/recruitment')
const { ownsChoice } = require('../utils/applicationScope')
const { logOperation } = require('../utils/audit')
const { ok } = require('../utils/result')
const video = require('../services/interviewVideo')
const { mountWorkspace, membership, roster, asyncMutation } = require('./interviewWorkspace')
const { mountArchive } = require('./interviewArchive')
const recording = require('../services/interviewRecording')

const router = express.Router()
router.use(requireAuth, (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

function fail(message, code = 'BUSINESS_ERROR', status = 409) {
  throw new BusinessError(message, code, status)
}

function describe(store, interview, role) {
  const { opensAt, closesAt } = video.windowFor(interview)
  return {
    id: interview.id,
    laboratoryName: store.laboratories.find(lab => lab.id === interview.laboratoryId)?.name,
    studentName: store.users.find(user => user.id === interview.studentId)?.realName,
    interviewTime: interview.interviewTime,
    durationMinutes: interview.durationMinutes,
    instructions: interview.instructions,
    status: video.roomStatus(store, interview),
    startsAt: interview.onlineMediaStartedAt || interview.onlineStartedAt,
    endsAt: interview.onlineEndedAt,
    opensAt: new Date(opensAt).toISOString(),
    closesAt: new Date(closesAt).toISOString(),
    role
  }
}

function access(req, write = false) {
  const store = write ? structuredClone(getStore()) : getStore()
  const interview = store.interviews.find(item => item.id === Number(req.params.id) && item.onlineRoomName)
  const role = interview && video.participantRole(store, req.user, interview)
  if (!role) fail('面试不存在或你无权访问', 'NOT_FOUND', 404)
  return { store, interview, role, member: membership(store, interview, req.user.uid) }
}

mountWorkspace(router, access, fail)
mountArchive(router, access, fail)

router.get('/panel', requireRole(ROLES.LAB_TEACHER), (req, res) => {
  const store = getStore()
  const list = store.users.filter(user => user.id !== req.user.uid && video.canPanel(user, req.user.laboratoryId))
    .map(user => ({ id: user.id, name: user.realName }))
  res.json(ok(list))
})

router.get('/', (req, res) => {
  const store = getStore()
  const batch = currentBatch(store)
  const list = store.interviews.filter(item => item.batchId === batch?.id && item.onlineRoomName)
    .flatMap(item => {
      const role = video.participantRole(store, req.user, item)
      return role ? [describe(store, item, role)] : []
    })
    .sort((a, b) => a.interviewTime.localeCompare(b.interviewTime))
  res.json(ok(list))
})

router.get('/:id', (req, res) => {
  const { store, interview, role } = access(req)
  const participants = roster(store, interview)
  res.json(ok({ ...describe(store, interview, role), participants }))
})

router.post('/:id/token', asyncMutation(async (req, res) => {
    let { store, interview, role, member } = access(req, true)
    const now = Date.now()
    const status = video.roomStatus(store, interview, now)
    if (status !== 'OPEN' && !(status === 'WAITING' && role === 'HOST' && req.body?.start === true)) {
      fail(status === 'WAITING' ? '请等主持人开启会议' :
        status === 'UPCOMING' ? '入会时间尚未到达' : '本场线上面试已关闭')
    }
    if (member?.removedAt) fail('你已被主持人移出会议', 'ROLE_FORBIDDEN', 403)
    if (recording.ackRequired(store, interview, req.user.uid)) {
      fail('录制已启用，请单独确认录制授权后入会', 'RECORDING_CONSENT_REQUIRED', 403)
    }
    if (role === 'CANDIDATE' && member.waitingStatus !== 'APPROVED') fail('请等待主持人批准入会', 'ADMISSION_REQUIRED', 403)
    if (role === 'OBSERVER' && interview.onlineLockedAt && !member?.grantedAt) fail('会议已锁定，暂不接受新的旁听人员')
    const choice = store.studentPreferences.find(item => item.id === interview.onlinePreferenceId)
    if (choice?.studentId !== interview.studentId || choice?.batchId !== interview.batchId ||
        choice?.laboratoryId !== interview.laboratoryId || choice?.status !== 'SUBMITTED' ||
        (role === 'HOST' && !ownsChoice(store, { ...req.user, activeRole: ROLES.LAB_TEACHER }, choice))) {
      fail('面试关联的报名已失效，请联系实训室', 'ROLE_FORBIDDEN', 403)
    }
    const config = video.requireConfig()
    const stageEnd = Date.parse(stageOf(store, interview.batchId, 4)?.endTime) || Infinity
    const ttl = Math.min(video.TOKEN_TTL_SECONDS,
      Math.floor((stageEnd - now) / 1000))
    if (ttl < 1) fail('本场线上面试已关闭')
    const credentials = await video.issueToken(config, interview, req.user.uid, role, ttl)
    if (res.destroyed) return
    if (status === 'WAITING') {
      interview.onlineStartedAt = new Date(now).toISOString()
      interview.interviewStatus = 'IN_PROGRESS'
      logOperation(store, req, { operationType: 'START_ONLINE_INTERVIEW', targetType: 'INTERVIEW',
        targetId: interview.id, description: '主持人开启线上面试' })
    }
    if (!member) {
      member = { id: nextId(store.interviewParticipants), interviewId: interview.id, userId: req.user.uid,
        participantRole: role, createdAt: new Date(now).toISOString() }
      store.interviewParticipants.push(member)
    }
    if (!member.grantedAt || status === 'WAITING') {
      member.grantedAt ||= new Date(now).toISOString()
      await commitStore(store)
    }
    res.json(ok(credentials))
}))

router.post('/:id/end', asyncMutation(async (req, res) => {
  const { store, interview, role } = access(req, true)
  if (role !== 'HOST') fail('只有主持人可以结束会议', 'ROLE_FORBIDDEN', 403)
  if (!interview.onlineStartedAt) fail('会议尚未开启')
  if (!interview.onlineEndedAt) {
    const now = Date.now()
    interview.onlineEndedAt = new Date(Math.max(Date.parse(interview.onlineStartedAt),
      video.scheduledEnd(store, interview, now) ?? now)).toISOString()
    interview.interviewStatus = 'COMPLETED'
    const item = recording.recordingFor(store, interview)
    if (item && recording.active.has(item.state) && !item.stopRequestedAt) {
      item.stopRequestedAt = new Date(now).toISOString()
      item.state = 'STOPPING'
      recording.audit(store, req, item, 'RECORDING_STOP_REQUEST', '会议结束，提交停止录制请求')
    }
    logOperation(store, req, { operationType: 'END_ONLINE_INTERVIEW', targetType: 'INTERVIEW',
      targetId: interview.id, description: '主持人结束线上面试' })
    await commitStore(store)
    const config = video.liveKitConfig()
    if (config) {
      try { await video.closeMeeting(config, interview, store.interviewParticipants) }
      catch { /* 后台会重试销毁房间并撤销凭证 */ }
    }
  }
  res.json(ok(describe(store, interview, role)))
}))

module.exports = router
