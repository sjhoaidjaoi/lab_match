const { z } = require('zod')
const { getStore, commitStore, nextId } = require('../data/seed')
const { ROLES } = require('../middleware/auth')
const { ok } = require('../utils/result')
const { participantRole, roomStatus, liveKitConfig } = require('../services/interviewVideo')
const { asyncMutation, membership } = require('./interviewWorkspace')
const recording = require('../services/interviewRecording')

const now = () => new Date().toISOString()

function listed(variable, id) {
  return (process.env[variable] || '').split(',').map(item => item.trim()).includes(String(id))
}

function permissions(store, user, interview) {
  const role = participantRole(store, user, interview)
  if (!role || role === 'CANDIDATE' || membership(store, interview, user.uid)?.removedAt) return null
  const college = user.activeRole === ROLES.COLLEGE_ADMIN
  const manage = college && listed('RECORDING_MANAGE_IDS', user.uid)
  return { play: !college || listed('RECORDING_COLLEGE_VIEW_IDS', user.uid),
    download: college && listed('RECORDING_DOWNLOAD_IDS', user.uid), manage }
}

function archiveRow(store, interview, user, access) {
  const student = store.users.find(item => item.id === interview.studentId)
  const examiners = store.interviewParticipants.filter(item => item.interviewId === interview.id &&
    ['HOST', 'PANEL'].includes(item.participantRole))
  return {
    id: interview.id, batchId: interview.batchId, laboratoryId: interview.laboratoryId,
    studentName: student?.realName, studentNumber: student?.studentNumber,
    laboratoryName: store.laboratories.find(item => item.id === interview.laboratoryId)?.name,
    batchName: store.recruitmentBatches.find(item => item.id === interview.batchId)?.batchName,
    interviewTime: interview.interviewTime, status: roomStatus(store, interview),
    startsAt: interview.onlineMediaStartedAt || interview.onlineStartedAt, endsAt: interview.onlineEndedAt,
    examiners: examiners.map(item => store.users.find(user => user.id === item.userId)?.realName),
    recording: recording.recordingView(store, interview, user.uid, true), access
  }
}

function mountArchive(router, access, fail) {
  router.get('/archives', (req, res) => {
    if (req.user.activeRole === ROLES.STUDENT) fail('无权查看面试档案', 'ROLE_FORBIDDEN', 403)
    const { batchId, laboratoryId, keyword, offset } = z.object({
      batchId: z.coerce.number().int().positive().optional(), laboratoryId: z.coerce.number().int().positive().optional(),
      keyword: z.string().trim().max(60).default(''), offset: z.coerce.number().int().nonnegative().default(0)
    }).parse(req.query)
    const store = getStore()
    const rows = store.interviews.filter(item => item.onlineRoomName &&
      (!batchId || item.batchId === batchId) && (!laboratoryId || item.laboratoryId === laboratoryId))
      .flatMap(item => {
        const access = permissions(store, req.user, item)
        return access ? [archiveRow(store, item, req.user, access)] : []
      })
      .filter(item => !keyword || [item.studentName, item.studentNumber].some(value => String(value || '').includes(keyword)))
      .sort((a, b) => String(b.interviewTime).localeCompare(String(a.interviewTime)))
    res.json(ok({ items: rows.slice(offset, offset + 25), total: rows.length }))
  })

  function archive(req, write = false) {
    const { store, interview } = access(req, write)
    const allowed = permissions(store, req.user, interview)
    if (!allowed) fail('无权查看该面试档案', 'ROLE_FORBIDDEN', 403)
    return { store, interview, item: recording.recordingFor(store, interview), allowed }
  }

  router.get('/:id/archive', (req, res) => {
    const { store, interview, allowed, item } = archive(req)
    const after = z.coerce.number().int().nonnegative().safe().parse(req.query.after ?? 0)
    const connected = new Map()
    const sessions = store.interviewAttendance.filter(row => row.interviewId === interview.id)
      .sort((a, b) => String(a.joinedAt || a.leftAt).localeCompare(String(b.joinedAt || b.leftAt)))
      .map(row => {
        const first = connected.get(row.userId)
        if (!first && row.joinedAt) connected.set(row.userId, row.joinedAt)
        return { id: row.id, userId: row.userId, name: store.users.find(user => user.id === row.userId)?.realName,
          role: membership(store, interview, row.userId)?.participantRole, joinedAt: row.joinedAt, leftAt: row.leftAt,
          onlineSeconds: row.onlineSeconds, disconnectReason: row.disconnectReason, removed: Boolean(row.removedAt),
          rejoined: Boolean(first && row.joinedAt), abnormal: row.disconnectReason && row.disconnectReason !== 'UNKNOWN'
            ? ['CONNECTION_ABORTED', 'SIGNAL_CLOSE', 'CONNECTION_TIMEOUT', 'STATE_MISMATCH',
              'JOIN_FAILURE', 'MEDIA_FAILURE', 'SERVER_SHUTDOWN'].includes(row.disconnectReason) : null }
      })
    const chat = store.interviewMessages.filter(row => row.interviewId === interview.id && row.id > after).sort((a, b) => a.id - b.id)
    const logs = store.operationLogs.filter(log => log.targetType === 'INTERVIEW' && log.targetId === interview.id)
      .map(log => ({ id: log.id, operator: store.users.find(user => user.id === log.operatorId)?.realName,
        occurredAt: log.createdAt, type: log.operationType, text: log.operationDescription, result: log.detail?.result || 'SUCCESS' }))
    const { attitudeScore, logicScore, programmingScore, timeCommitmentScore, comprehensiveScore, evaluation, recommendation } = interview
    res.json(ok({ ...archiveRow(store, interview, req.user, allowed), sessions, logs,
      messages: chat.slice(0, 100).map(row => ({ id: row.id, senderId: row.senderId,
        senderName: store.users.find(user => user.id === row.senderId)?.realName, content: row.content, createdAt: row.createdAt })),
      hasMore: chat.length > 100, score: { attitudeScore, logicScore, programmingScore, timeCommitmentScore,
        comprehensiveScore, evaluation, recommendation },
      summary: { transcriptionState: item?.transcriptionState || 'NOT_STARTED', taskId: item?.summaryTaskId ?? null } }))
  })

  router.post('/:id/recording/enable', asyncMutation(async (req, res) => {
    const { store, interview, role } = access(req, true)
    if (role !== 'HOST') fail('只有主持人可以启用本场录制', 'ROLE_FORBIDDEN', 403)
    if (!['UPCOMING', 'WAITING'].includes(roomStatus(store, interview))) fail('请在主持人开启会议前启用录制告知')
    const existing = recording.recordingFor(store, interview)
    if (existing) return res.json(ok(recording.recordingView(store, interview, req.user.uid, true)))
    const storage = recording.storageConfig()
    const policy = recording.policyConfig()
    if (!storage || !policy || !liveKitConfig()) fail('请先配置私有对象存储及学校录制告知', 'VIDEO_UNAVAILABLE', 503)
    const item = recording.newRecording(interview, req.user.uid, storage, policy)
    store.interviewRecordings.push(item)
    recording.audit(store, req, item, 'RECORDING_ENABLE', '主持人启用录制告知')
    await commitStore(store)
    res.json(ok(recording.recordingView(store, interview, req.user.uid, true)))
  }))

  router.post('/:id/recording/consent', asyncMutation(async (req, res) => {
    const { store, interview, member } = access(req, true)
    if (member?.removedAt) fail('你已被移出会议', 'ROLE_FORBIDDEN', 403)
    const item = recording.recordingFor(store, interview)
    const { accept, policyVersion } = z.object({ accept: z.boolean(), policyVersion: z.string().min(1) }).parse(req.body)
    if (!item || item.policy.version !== policyVersion || !['WAITING', 'STARTING', 'RECORDING', 'STOPPING'].includes(item.state) ||
        ['ENDED', 'CANCELLED', 'CLOSED'].includes(roomStatus(store, interview))) fail('录制告知已变更或已关闭，请刷新页面')
    const before = recording.consentFor(store, item, req.user.uid)
    const decision = accept ? 'ACCEPTED' : 'DECLINED'
    if (before !== decision) {
      store.interviewRecordingConsents.push({ id: nextId(store.interviewRecordingConsents), recordingId: item.id,
        userId: req.user.uid, decision, decidedAt: now() })
      recording.audit(store, req, item, 'RECORDING_CONSENT', accept ? '同意录制' : '拒绝或撤回录制授权')
      const withdrawal = !accept && before === 'ACCEPTED' && recording.active.has(item.state)
      if (withdrawal) {
        item.stopRequestedAt ||= now()
        item.state = 'STOPPING'
        recording.audit(store, req, item, 'RECORDING_STOP_REQUEST', '参会者撤回同意，提交停止请求')
      }
      await commitStore(store)
      if (withdrawal && member?.grantedAt) {
        try { await require('../services/interviewVideo').revokeParticipant(liveKitConfig(), interview, req.user.uid) }
        catch { /* 后台继续停止录制。 */ }
      }
    }
    res.json(ok(recording.recordingView(store, interview, req.user.uid)))
  }))

  router.post('/:id/recording/stop', asyncMutation(async (req, res) => {
    const { store, interview, role } = access(req, true)
    if (role !== 'HOST') fail('只有主持人可以停止本场录制', 'ROLE_FORBIDDEN', 403)
    const item = recording.recordingFor(store, interview)
    if (!item) fail('本场面试尚未启用录制')
    if (!item.stopRequestedAt && (item.state === 'WAITING' || recording.active.has(item.state))) {
      item.stopRequestedAt = now()
      item.state = item.state === 'WAITING' ? 'CANCELLED' : 'STOPPING'
      recording.audit(store, req, item, 'RECORDING_STOP_REQUEST', '主持人请求停止录制')
      await commitStore(store)
    }
    res.json(ok(recording.recordingView(store, interview, req.user.uid, true)))
  }))

  router.post('/:id/recording/link', asyncMutation(async (req, res) => {
    const { store, item, allowed } = archive(req, true)
    const download = z.boolean().default(false).parse(req.body?.download)
    if (download ? !allowed.download : !allowed.play) fail('账号未获录像访问授权', 'ROLE_FORBIDDEN', 403)
    if (!item || item.state !== 'COMPLETE' || (!item.holdAt && Date.parse(item.expiresAt) <= Date.now())) fail('录像尚不可用或已过期')
    const op = download ? 'RECORDING_DOWNLOAD' : 'RECORDING_VIEW'
    let link
    try { link = await recording.signAccess(item, download) }
    catch {
      recording.audit(store, req, item, op, '签发录像访问地址失败', 'FAILED')
      await commitStore(store)
      fail('对象存储暂不可用', 'VIDEO_UNAVAILABLE', 503)
    }
    recording.audit(store, req, item, op, download ? '签发短期录像下载地址' : '签发短期录像播放地址')
    await commitStore(store)
    res.json(ok(link))
  }))

  router.post('/:id/recording/retention', asyncMutation(async (req, res) => {
    const { store, interview, item, allowed } = archive(req, true)
    if (!allowed.manage) fail('账号未获录像保留和删除权限', 'ROLE_FORBIDDEN', 403)
    const { action, reason } = z.object({ action: z.enum(['hold', 'release', 'delete']), reason: z.string().trim().min(1).max(240) }).parse(req.body)
    if (!item || !['COMPLETE', 'FAILED', 'PROCESSING'].includes(item.state)) fail('当前录像状态不能执行该操作')
    if (action === 'delete') {
      if (item.holdAt) fail('录像正在保留，请先解除保留')
      if (item.state === 'PROCESSING') fail('请等待录像处理完成')
      item.state = 'DELETING'
      item.deleteRequestedBy = req.user.uid
    } else {
      item.holdAt = action === 'hold' ? now() : null
      item.holdBy = action === 'hold' ? req.user.uid : null
      item.holdReason = action === 'hold' ? reason : null
    }
    recording.audit(store, req, item, action === 'delete' ? 'RECORDING_DELETE_REQUEST' : 'RECORDING_HOLD',
      `${{ delete: '提交录像删除', hold: '暂停到期清理', release: '解除暂停保留' }[action]} · ${reason}`)
    await commitStore(store)
    res.json(ok(recording.recordingView(store, interview, req.user.uid, true)))
  }))
}

module.exports = { mountArchive }
