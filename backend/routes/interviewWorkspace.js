const { z } = require('zod')
const { getStore, commitStore, nextId } = require('../data/seed')
const { logOperation } = require('../utils/audit')
const { ok } = require('../utils/result')
const { resumeFile, resumeView } = require('./resumes')
const { existsSync } = require('node:fs')
const video = require('../services/interviewVideo')
const recording = require('../services/interviewRecording')

function asyncMutation(handler) {
  return (req, res, next) => {
    const pending = Promise.resolve().then(() => handler(req, res))
    res.locals.mutationPending = pending
    pending.catch(next)
  }
}

function membership(store, interview, uid) {
  return store.interviewParticipants.find(item => item.interviewId === interview.id && item.userId === uid)
}

function roster(store, interview) {
  return store.interviewParticipants.filter(item => item.interviewId === interview.id).map(item => ({
    identity: video.identityFor(interview, item.userId),
    name: store.users.find(user => user.id === item.userId)?.realName,
    role: item.participantRole,
    handOrder: item.handOrder ?? null,
    removed: Boolean(item.removedAt)
  }))
}

function audit(store, req, interview, action, note, detail) {
  logOperation(store, req, { operationType: action, targetType: 'INTERVIEW', targetId: interview.id,
    description: note, detail })
}

function mountWorkspace(router, access, fail) {
  const now = () => new Date().toISOString()
  function writable(req, role, allowed = ['OPEN']) {
    const data = access(req, true)
    if (role && data.role !== role) fail('无权执行该会议操作', 'ROLE_FORBIDDEN', 403)
    if (!allowed.includes(video.roomStatus(data.store, data.interview))) fail('当前会议状态无法执行该操作')
    if (data.member?.removedAt) fail('你已被主持人移出会议', 'ROLE_FORBIDDEN', 403)
    return data
  }

  function requireAttendance(data) {
    if (!data.member?.grantedAt || data.member.removedAt) fail('请先获得会议入会权限', 'ROLE_FORBIDDEN', 403)
  }

  function presenter(store, item) {
    return { id: item.id, senderId: item.senderId, content: item.content, createdAt: item.createdAt,
      senderName: store.users.find(user => user.id === item.senderId)?.realName || '参会人员' }
  }

  async function save(store, interview) {
    await commitStore(store)
    if (video.roomStatus(store, interview) === 'OPEN') video.notifyRoom(video.liveKitConfig(), interview)
  }

  router.get('/:id/state', (req, res) => {
    const data = access(req)
    const { store, interview, role, member } = data
    const after = z.coerce.number().int().nonnegative().safe().parse(req.query.after ?? 0)
    const all = member?.grantedAt && !member.removedAt
      ? store.interviewMessages.filter(item => item.interviewId === interview.id && item.id > after).sort((a, b) => a.id - b.id)
      : []
    const waiting = role === 'HOST' ? store.interviewParticipants.filter(item => item.interviewId === interview.id &&
      item.waitingStatus === 'WAITING' && !item.removedAt).map(item => {
      const user = store.users.find(user => user.id === item.userId)
      return { identity: video.identityFor(interview, item.userId), name: user?.realName,
        studentNumber: user?.studentNumber, requestedAt: item.requestedAt }
    }) : []
    res.json(ok({ status: video.roomStatus(store, interview), locked: Boolean(interview.onlineLockedAt),
      startsAt: interview.onlineMediaStartedAt || interview.onlineStartedAt, endsAt: interview.onlineEndedAt,
      waitingStatus: member?.waitingStatus ?? null, removed: Boolean(member?.removedAt),
      removalReason: member?.removalReason ?? null, muteRequestedAt: member?.muteRequestedAt ?? null,
      waiting, participants: roster(store, interview), canReadChat: Boolean(member?.grantedAt && !member.removedAt),
      messages: all.slice(0, 100).map(item => presenter(store, item)), hasMore: all.length > 100,
      recording: recording.recordingView(store, interview, req.user.uid, role === 'HOST') }))
  })

  router.post('/:id/waiting', asyncMutation(async (req, res) => {
    const { store, interview, member } = writable(req, 'CANDIDATE', ['WAITING', 'OPEN'])
    const action = z.enum(['request', 'cancel']).parse(req.body?.action)
    if (action === 'request') {
      if (['WAITING', 'APPROVED'].includes(member.waitingStatus)) return res.json(ok({ status: member.waitingStatus }))
      if (interview.onlineLockedAt) fail('会议已锁定，请等待主持人解锁')
      Object.assign(member, { waitingStatus: 'WAITING', requestedAt: now(), decidedAt: null })
      audit(store, req, interview, 'VIDEO_WAITING_REQUEST', '申请加入等候室')
    } else {
      if (member.waitingStatus !== 'WAITING') return res.json(ok({ status: member.waitingStatus }))
      Object.assign(member, { waitingStatus: 'CANCELLED', decidedAt: now() })
      audit(store, req, interview, 'VIDEO_WAITING_CANCEL', '取消等候室申请')
    }
    await save(store, interview)
    res.json(ok({ status: member.waitingStatus }))
  }))

  function target(store, interview, identity) {
    const entry = store.interviewParticipants.find(item => item.interviewId === interview.id &&
      video.identityFor(interview, item.userId) === identity)
    if (!entry || entry.participantRole === 'HOST') fail('找不到可管理的参会人员', 'NOT_FOUND', 404)
    return entry
  }

  router.post('/:id/waiting/decision', asyncMutation(async (req, res) => {
    const { store, interview } = writable(req, 'HOST')
    const { identity, approve } = z.object({ identity: z.string().length(64), approve: z.boolean() }).parse(req.body)
    const entry = target(store, interview, identity)
    if (entry.waitingStatus !== 'WAITING' || entry.removedAt) fail('申请已处理或已取消')
    if (approve && interview.onlineLockedAt) fail('请先解锁会议再批准新的申请')
    Object.assign(entry, { waitingStatus: approve ? 'APPROVED' : 'REJECTED', decidedAt: now() })
    audit(store, req, interview, 'VIDEO_WAITING_DECISION', approve ? '批准学生入会' : '拒绝学生入会', { userId: entry.userId })
    await save(store, interview)
    res.json(ok({ status: entry.waitingStatus }))
  }))

  router.post('/:id/lock', asyncMutation(async (req, res) => {
    const { store, interview } = writable(req, 'HOST')
    const locked = z.boolean().parse(req.body?.locked)
    if (Boolean(interview.onlineLockedAt) !== locked) {
      interview.onlineLockedAt = locked ? now() : null
      audit(store, req, interview, 'VIDEO_LOCK', locked ? '锁定会议' : '解锁会议')
      await save(store, interview)
    }
    res.json(ok({ locked }))
  }))

  router.post('/:id/moderate', asyncMutation(async (req, res) => {
    const { store, interview } = writable(req, 'HOST')
    const { identity, action, reason } = z.object({
      identity: z.string().length(64), action: z.enum(['remove', 'request-mute']),
      reason: z.string().trim().max(200).optional()
    }).parse(req.body)
    const entry = target(store, interview, identity)
    if (!entry.grantedAt) fail('该人员尚未获得会议访问权限')
    if (action === 'request-mute') {
      if (entry.removedAt) fail('该成员已被移出会议')
      entry.muteRequestedAt = now()
      audit(store, req, interview, 'VIDEO_REQUEST_MUTE', '请求关闭麦克风', { userId: entry.userId })
      await save(store, interview)
      return res.json(ok({ requested: true }))
    }
    if (!reason && !entry.removedAt) fail('请填写移除原因')
    const config = video.requireConfig()
    if (!entry.removedAt) {
      Object.assign(entry, { removedAt: now(), removedBy: req.user.uid, removalReason: reason, handOrder: null })
      audit(store, req, interview, 'VIDEO_REMOVE', '移除参会人员', { userId: entry.userId, reason })
      await save(store, interview)
    }
    if (!entry.revokedAt) {
      try { await video.revokeParticipant(config, interview, entry.userId) }
      catch { fail('已禁止该成员领取新凭证，Cloud 撤销暂未确认，后台将重试', 'VIDEO_UNAVAILABLE', 503) }
      const updated = structuredClone(getStore())
      membership(updated, interview, entry.userId).revokedAt = now()
      await commitStore(updated)
    }
    res.json(ok({ removed: true }))
  }))

  router.post('/:id/hand', asyncMutation(async (req, res) => {
    const data = writable(req)
    requireAttendance(data)
    const { store, interview, member } = data
    if (data.role === 'OBSERVER') fail('旁听人员无权举手', 'ROLE_FORBIDDEN', 403)
    const raised = z.boolean().parse(req.body?.raised)
    if (raised && !member.handOrder) {
      member.handOrder = 1 + store.interviewParticipants.reduce((max, item) =>
        item.interviewId === interview.id ? Math.max(max, item.handOrder || 0) : max, 0)
    } else if (!raised) member.handOrder = null
    await save(store, interview)
    res.json(ok({ raised }))
  }))

  router.post('/:id/messages', asyncMutation(async (req, res) => {
    const data = access(req, true)
    requireAttendance(data)
    const { store, interview } = data
    const { clientId, content } = z.object({ clientId: z.string().uuid(), content: z.string().trim().min(1).max(1000) })
      .strict().parse(req.body)
    const old = store.interviewMessages.find(item => item.interviewId === interview.id &&
      item.senderId === req.user.uid && item.clientId === clientId)
    if (old) {
      if (old.content !== content) fail('这条消息的重试内容已变化')
      return res.json(ok(presenter(store, old)))
    }
    if (video.roomStatus(store, interview) !== 'OPEN') fail('会议已关闭，聊天记录可继续查看')
    const previous = store.interviewMessages.findLast(item => item.interviewId === interview.id && item.senderId === req.user.uid)
    if (previous && Date.now() - Date.parse(previous.createdAt) < 500) fail('消息发送过快，请稍后重试')
    const item = { id: nextId(store.interviewMessages), interviewId: interview.id, senderId: req.user.uid,
      clientId, content, createdAt: now() }
    store.interviewMessages.push(item)
    await save(store, interview)
    res.json(ok(presenter(store, item)))
  }))

  function dossier(req) {
    const { store, interview, role, member } = access(req)
    if (!['HOST', 'PANEL'].includes(role) || member?.removedAt) fail('无权查看该面试的学生资料', 'ROLE_FORBIDDEN', 403)
    const choice = store.studentPreferences.find(item => item.id === interview.onlinePreferenceId &&
      item.batchId === interview.batchId && item.studentId === interview.studentId &&
      item.laboratoryId === interview.laboratoryId && item.status === 'SUBMITTED')
    if (!choice) fail('未找到报名资料', 'NOT_FOUND', 404)
    const student = store.users.find(item => item.id === interview.studentId)
    const lab = store.laboratories.find(item => item.id === interview.laboratoryId)
    const mentor = store.labTeachers.find(item => item.id === choice.labTeacherId && item.laboratoryId === interview.laboratoryId)
    const resume = (store.applicationResumes || []).find(item => item.studentId === student?.id &&
      item.batchId === interview.batchId && item.submittedAt)
    return { student, lab, mentor, choice, resume }
  }

  router.get('/:id/profile', (req, res) => {
    const { student, lab, mentor, choice, resume } = dossier(req)
    res.json(ok({ studentName: student?.realName, studentNumber: student?.studentNumber,
      major: student?.major ?? null, className: student?.className ?? null, laboratoryName: lab?.name,
      mentorName: mentor?.name, direction: choice.direction || mentor?.direction || null,
      introduction: choice.introduction || null, resume: resumeView(resume) }))
  })
  router.get('/:id/profile/resume', (req, res) => {
    const { resume } = dossier(req)
    const file = resume && resumeFile(resume.id)
    if (!file || !existsSync(file)) fail('简历不存在', 'NOT_FOUND', 404)
    res.set('X-Content-Type-Options', 'nosniff')
    res.download(file, resume.name, { headers: { 'Content-Type': resume.mime } })
  })

  router.get('/:id/attendance', (req, res) => {
    const { store, interview, role, member } = access(req)
    if (!['HOST', 'PANEL'].includes(role) || member?.removedAt) fail('无权查看参会记录', 'ROLE_FORBIDDEN', 403)
    const rows = store.interviewAttendance.filter(item => item.interviewId === interview.id)
      .sort((a, b) => String(a.joinedAt || a.leftAt).localeCompare(String(b.joinedAt || b.leftAt)))
    const first = new Map()
    for (const item of rows) if (item.joinedAt && !first.has(item.userId)) first.set(item.userId, item.joinedAt)
    const abnormal = new Set(['CONNECTION_ABORTED', 'SIGNAL_CLOSE', 'CONNECTION_TIMEOUT', 'STATE_MISMATCH',
      'JOIN_FAILURE', 'MEDIA_FAILURE', 'SERVER_SHUTDOWN'])
    res.json(ok(rows.map(item => ({
      id: item.id, name: store.users.find(user => user.id === item.userId)?.realName,
      firstJoinedAt: first.get(item.userId) || null, joinedAt: item.joinedAt, leftAt: item.leftAt,
      onlineSeconds: item.onlineSeconds, removed: Boolean(item.removedAt),
      disconnectReason: item.disconnectReason, abnormal: item.disconnectReason && item.disconnectReason !== 'UNKNOWN'
        ? abnormal.has(item.disconnectReason) : null
    }))))
  })
}

module.exports = { mountWorkspace, membership, roster, asyncMutation }
