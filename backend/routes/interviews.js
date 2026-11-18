// ============ 面试记录 ============
// POST   /api/interviews/schedule          教师创建面试安排
// POST   /api/interviews/:id/score         教师录入 5 维度评分 + 评价 + 建议
// GET    /api/interviews/lab/:labId        实训室面试列表（教师/组长/学院）
// GET    /api/interviews/my                学生查看自己的面试安排

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, commitStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES, guardLab, isLabLeader } = require('../middleware/auth')
const { currentBatch, scopedChoice, stageOpen } = require('../utils/applicationScope')
const { findBatch, batchWritableError, stageOf } = require('../utils/recruitment')
const { logOperation } = require('../utils/audit')
const { BusinessError } = require('../middleware/error')
const { requireConfig, canPanel, newOnlineRoom, publicInterview, roomStatus } = require('../services/interviewVideo')
const { asyncMutation } = require('./interviewWorkspace')
const selection = require('../services/interviewSelection')

const ScheduleSchema = z.object({
  studentId: z.number().int(),
  preferenceId: z.number().int().positive().optional(),
  retryOf: z.number().int().positive().optional(),
  laboratoryId: z.number().int(),
  interviewTime: z.string().datetime(),
  location: z.string().trim().max(250).optional(),
  interviewForm: z.string().trim().max(50).optional(),
  instructions: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(180).default(30),
  interviewStatus: z.enum(['SCHEDULED', 'CANCELLED']).optional().default('SCHEDULED'),
  mode: z.enum(['STANDARD', 'LIVEKIT']).default('STANDARD'),
  panelIds: z.array(z.number().int().positive()).max(12).default([])
})

const ScoreSchema = z.object({
  attitudeScore: z.number().min(0).max(100).optional(),
  logicScore: z.number().min(0).max(100).optional(),
  programmingScore: z.number().min(0).max(100).optional(),
  timeCommitmentScore: z.number().min(0).max(100).optional(),
  comprehensiveScore: z.number().min(0).max(100).optional(),
  evaluation: z.string().trim().max(4000).optional().default(''),
  state: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
  recommendation: z.enum(['INTENDED', 'ALTERNATE', 'REJECTED', 'PENDING']).optional().default('PENDING')
})

// 教师创建面试安排
router.post('/schedule', requireAuth, requireRole(ROLES.LAB_TEACHER), asyncMutation(async (req, res) => {
  const body = ScheduleSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const activeBatch = currentBatch(store)
  const lab = store.laboratories.find((l) => l.id === body.laboratoryId)
  if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有选拔批次', data: null })
  const stopError = batchWritableError(activeBatch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, body.laboratoryId)) return

  const applied = scopedChoice(store, req.user, activeBatch.id, body.studentId, body.laboratoryId)
  if (!applied || (body.preferenceId && applied.id !== body.preferenceId)) {
    return res.status(403).json({ message: '无权安排该学生的面试' })
  }
  if (!stageOpen(store, activeBatch.id, 4)) return res.status(409).json({ message: '面试阶段未开放' })
  const { mode, panelIds, preferenceId, retryOf, ...details } = body
  const online = mode === 'LIVEKIT'
  if (body.interviewStatus === 'SCHEDULED' && !online && !body.location && !body.interviewForm) {
    return res.status(400).json({ message: '请填写面试地点或线上会议方式' })
  }

  const latest = selection.latestInterviews(store).find(
    (i) => i.batchId === activeBatch.id && i.studentId === body.studentId && i.laboratoryId === body.laboratoryId
  )
  if (retryOf && latest?.previousInterviewId === retryOf && latest.interviewerId === req.user.uid &&
      latest.interviewTime === body.interviewTime && online === Boolean(latest.onlineRoomName) &&
      latest.interviewStatus === 'SCHEDULED') return res.json(ok(publicInterview(store, latest)))
  if (retryOf && (!online || latest?.id !== retryOf || latest.interviewerId !== req.user.uid ||
      !latest.exceptionCode || (latest.onlineStartedAt && !latest.onlineEndedAt) ||
      selection.submittedEvaluations(store, latest).length || store.admissionIntentions.some(row =>
        row.batchId === activeBatch.id && row.studentId === body.studentId && row.laboratoryId === lab.id))) {
    throw new BusinessError('仅可为已登记异常、未提交正式评价且尚未进入录取流程的面试安排补面试', 'BUSINESS_ERROR', 409)
  }
  const existing = retryOf ? null : latest
  if (existing?.exceptionCode && body.interviewStatus !== 'CANCELLED') {
    throw new BusinessError('请通过补面试创建新场次，保留原异常记录', 'BUSINESS_ERROR', 409)
  }
  const start = Date.parse(body.interviewTime)
  const end = start + body.durationMinutes * 60000
  if (existing?.onlineRoomName && existing.interviewerId !== req.user.uid) {
    throw new BusinessError('只有主持人能管理这场线上面试', 'ROLE_FORBIDDEN', 403)
  }
  if (existing?.onlineStartedAt) throw new BusinessError('已经开始的线上面试请在会议内结束', 'BUSINESS_ERROR', 409)
  if (existing?.interviewStatus === 'CANCELLED' && body.interviewStatus === 'CANCELLED') {
    return res.json(ok(publicInterview(store, existing)))
  }
  if (existing?.interviewStatus === 'COMPLETED') return res.status(409).json({ message: '已完成的面试不能重新安排' })
  if (body.interviewStatus === 'CANCELLED' && !existing?.interviewTime) return res.status(409).json({ message: '还没有可取消的面试安排' })
  if (existing?.onlineRoomName && existing.interviewStatus !== 'CANCELLED' && body.interviewStatus !== 'CANCELLED' && !online) {
    throw new BusinessError('请先取消线上安排，再切换面试形式', 'BUSINESS_ERROR', 409)
  }
  const panel = [...new Set(panelIds)].filter(id => id !== req.user.uid)
  if (online) {
    if (body.interviewStatus !== 'SCHEDULED') throw new BusinessError('请选择有效的线上面试安排')
    requireConfig()
    if (!canPanel(store.users.find(user => user.id === req.user.uid), lab.id) ||
        panel.some(id => !canPanel(store.users.find(user => user.id === id), lab.id))) {
      throw new BusinessError('共同面试官必须是本实训室的在用教师账号', 'ROLE_FORBIDDEN', 403)
    }
    const stage = stageOf(store, activeBatch.id, 4)
    if (start <= Date.now()) {
      throw new BusinessError('面试时间必须晚于当前时间，请选择未来的时段', 'BUSINESS_ERROR', 409)
    }
    if (stage?.startTime && start < Date.parse(stage.startTime)) {
      throw new BusinessError('面试时间早于面试阶段开始时间，请在面试阶段内选择', 'BUSINESS_ERROR', 409)
    }
    if (stage?.endTime && end > Date.parse(stage.endTime)) {
      throw new BusinessError('面试结束时间超出面试阶段截止时间，请提前开始或缩短时长', 'BUSINESS_ERROR', 409)
    }
    details.location = ''
    details.interviewForm = '平台线上面试'
  }
  const oldPanel = store.interviewParticipants.filter(item => item.interviewId === existing?.id && item.participantRole === 'PANEL')
  if (existing && Object.entries(details).every(([key, value]) => existing[key] === value) &&
      online === Boolean(existing.onlineRoomName) && oldPanel.length === panel.length &&
      oldPanel.every(item => panel.includes(item.userId))) return res.json(ok(publicInterview(store, existing)))
  const staffIds = new Set([req.user.uid, ...panel])
  if (body.interviewStatus !== 'CANCELLED' && selection.latestInterviews(store).some(item => item !== existing && item.id !== retryOf &&
    item.batchId === activeBatch.id && !item.exceptionCode && ['SCHEDULED', 'IN_PROGRESS'].includes(item.interviewStatus) &&
    (staffIds.has(item.interviewerId) || item.studentId === body.studentId ||
      store.interviewParticipants.some(p => p.interviewId === item.id && staffIds.has(p.userId))) &&
    Date.parse(item.interviewTime) < end &&
    Date.parse(item.interviewTime) + (item.durationMinutes || 30) * 60000 > start)) {
    return res.status(409).json({ message: '面试时段存在冲突，请选择其他时间' })
  }
  const interview = existing || {
    id: nextId(store.interviews),
    batchId: activeBatch.id,
    interviewerId: req.user.uid,
    attitudeScore: null, logicScore: null, programmingScore: null,
    timeCommitmentScore: null, comprehensiveScore: null,
    evaluation: '', recommendation: 'PENDING',
    createdAt: new Date().toISOString()
  }
  const rescheduled = Boolean(existing?.interviewTime && body.interviewStatus !== 'CANCELLED' &&
    existing.interviewTime !== body.interviewTime)
  const stamp = new Date().toISOString()
  if (rescheduled || retryOf) interview.rescheduledAt = stamp
  Object.assign(interview, details, { interviewerId: req.user.uid, preferenceId: applied.id,
    attemptNo: retryOf ? selection.attempt(latest) + 1 : selection.attempt(interview), acknowledgedAt: null })
  if (retryOf) interview.previousInterviewId = retryOf
  if (!existing) store.interviews.push(interview)
  if (body.interviewStatus !== 'CANCELLED') {
    store.interviewParticipants = store.interviewParticipants.filter(item => item.interviewId !== interview.id)
  }
  if (online) {
    Object.assign(interview, newOnlineRoom(applied.id))
    const invitees = [[req.user.uid, 'HOST'], [body.studentId, 'CANDIDATE'], ...panel.map(id => [id, 'PANEL'])]
    for (const [userId, participantRole] of invitees) {
      store.interviewParticipants.push({ id: nextId(store.interviewParticipants), interviewId: interview.id,
        userId, participantRole, createdAt: new Date().toISOString() })
    }
    for (const userId of panel) {
      store.notices.push({ id: nextId(store.notices), targetUserId: userId, title: `${lab.name} · 共同面试邀请`,
        content: '请在教师端面试管理中查看线上面试时间。', read: false, createdBy: req.user.uid,
        createdAt: stamp, batchId: activeBatch.id, interviewId: interview.id, destination: 'TEACHER_INTERVIEW' })
    }
  } else if (body.interviewStatus !== 'CANCELLED' && interview.onlineRoomName) {
    Object.assign(interview, { onlineRoomName: null, onlinePreferenceId: null })
  }
  interview.noticeId = nextId(store.notices)
  store.notices.push({
    id: interview.noticeId, targetUserId: body.studentId, targetRole: 'STUDENT',
    title: `${lab.name} · ${body.interviewStatus === 'CANCELLED' ? '面试已取消' : retryOf ? '补面试邀请' :
      rescheduled ? '面试时间已变更' : online ? '线上面试邀请' : '面试安排已更新'}`,
    content: online ? '请前往「我的面试」查看预约时间，并提前测试摄像头和麦克风。' :
      body.instructions || '请前往面试安排查看详情。',
    read: false, createdBy: req.user.uid, createdAt: stamp, batchId: activeBatch.id, interviewId: interview.id, destination: 'STUDENT_INTERVIEW'
  })
  logOperation(store, req, { operationType: 'SCHEDULE_INTERVIEW', targetType: 'INTERVIEW', targetId: interview.id,
    description: body.interviewStatus === 'CANCELLED' ? '取消面试并通知学生' : '保存面试安排并通知学生' })
  await commitStore(store)
  res.json(ok(publicInterview(store, interview)))
}))

// 教师评分
router.post('/:id/score', requireAuth, requireRole(ROLES.LAB_TEACHER), asyncMutation(async (req, res) => {
  const body = ScoreSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const idx = store.interviews.findIndex((i) => i.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '面试不存在', data: null })
  const record = store.interviews[idx]
  if (!guardLab(req, res, record.laboratoryId)) return
  if (!selection.canEvaluate(store, req.user, record)) return res.status(403).json({ message: '无权评分该学生' })
  const host = !record.interviewerId || record.interviewerId === req.user.uid
  if (record.onlineRoomName && roomStatus(store, record) !== 'ENDED') return res.status(409).json({ message: '请先结束线上面试' })
  const stopError = batchWritableError(findBatch(store, record.batchId))
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  if (record.batchId !== currentBatch(store)?.id || !stageOpen(store, record.batchId, 4)) return res.status(409).json({ message: '本批次面试评分已关闭' })
  if (!record.interviewTime || Date.parse(record.interviewTime) > Date.now() || record.interviewStatus === 'CANCELLED' || record.exceptionCode ||
      !selection.latestInterviews(store).includes(record)) return res.status(409).json({ message: '当前场次不能提交评价' })
  if (host && body.state === 'SUBMITTED' && body.recommendation !== 'INTENDED' && store.admissionIntentions.some(item =>
    item.source === 'TEACHER_INVITATION' && item.batchId === record.batchId && item.laboratoryId === record.laboratoryId &&
    item.studentId === record.studentId && ['PENDING', 'CONFIRMED'].includes(item.status))) {
    return res.status(409).json({ message: '该学生已收到入组邀请，面试通过结论不能直接撤销' })
  }

  // 五个考核维度必须全部评分后才能形成面试结论
  const scores = Object.fromEntries(selection.dimensions.map(key => [key, body[key] ?? null]))
  if (body.state === 'SUBMITTED') {
    const missing = selection.dimensions.filter(key => scores[key] == null)
    if (missing.length) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请完成五个考核维度的评分', data: null })
    }
  }
  const policy = selection.scorePolicy(store, record.batchId)
  const previous = store.interviewEvaluations.filter(row => row.interviewId === record.id && row.reviewerId === req.user.uid)
    .sort((a, b) => b.version - a.version)[0]
  const total = selection.dimensions.every(key => scores[key] != null) ? selection.weighted(scores, policy.weights) : null
  const entry = { id: nextId(store.interviewEvaluations), interviewId: record.id, reviewerId: req.user.uid,
    version: (previous?.version || 0) + 1, state: body.state, scores, weights: policy.weights, total,
    evaluation: body.evaluation, recommendation: body.recommendation, createdAt: new Date().toISOString() }
  if (previous && previous.state === entry.state && Number(previous.total) === Number(entry.total) &&
      previous.evaluation === entry.evaluation && previous.recommendation === entry.recommendation &&
      selection.dimensions.every(key => previous.scores[key] === scores[key])) return res.json(ok(host ? publicInterview(store, record) : previous))
  store.interviewEvaluations.push(entry)
  if (host && body.state === 'SUBMITTED') {
    Object.assign(record, scores, { interviewerId: req.user.uid, interviewStatus: 'COMPLETED',
      scoredBy: req.user.uid, scoredAt: entry.createdAt, evaluation: body.evaluation, recommendation: body.recommendation })
  }
  logOperation(store, req, { operationType: 'SCORE_INTERVIEW', targetType: 'INTERVIEW', targetId: record.id,
    description: body.state === 'DRAFT' ? '保存本人面试评价草稿' : '提交本人正式面试评价',
    detail: { version: entry.version, evaluationId: entry.id } })
  await commitStore(store)
  res.json(ok(host ? publicInterview(store, record) : entry))
}))

function canOversee(req, store, labId) {
  return req.user.activeRole === ROLES.COLLEGE_ADMIN ||
    store.laboratories.some(lab => lab.id === labId && isLabLeader(req, lab))
}

router.get('/:id/evaluation', requireAuth, requireRole(ROLES.LAB_TEACHER), (req, res) => {
  const store = getStore()
  const interview = store.interviews.find(row => row.id === Number(req.params.id))
  if (!interview || !selection.canEvaluate(store, req.user, interview)) return res.status(404).json({ message: '面试不存在或无权评价' })
  const history = store.interviewEvaluations.filter(row => row.interviewId === interview.id && row.reviewerId === req.user.uid)
    .sort((a, b) => b.version - a.version)
  const legacy = selection.submittedEvaluations(store, interview).find(row => row.reviewerId === req.user.uid && !row.version)
  if (legacy) history.push(legacy)
  const editable = currentBatch(store)?.id === interview.batchId && stageOpen(store, interview.batchId, 4) &&
    selection.latestInterviews(store).includes(interview) && Date.parse(interview.interviewTime) <= Date.now() &&
    !interview.exceptionCode && interview.interviewStatus !== 'CANCELLED' &&
    (!interview.onlineRoomName || roomStatus(store, interview) === 'ENDED')
  res.json(ok({ history, editable, policy: selection.scorePolicy(store, interview.batchId),
    studentName: store.users.find(user => user.id === interview.studentId)?.realName,
    online: Boolean(interview.onlineRoomName) }))
})

router.post('/:id/evaluations/read', requireAuth, requireRole(ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const interview = store.interviews.find(row => row.id === Number(req.params.id))
  if (!interview || !canOversee(req, store, interview.laboratoryId)) return res.status(404).json({ message: '面试不存在或无权查看' })
  const rows = selection.submittedEvaluations(store, interview).map(row => ({
    ...row, reviewerName: store.users.find(user => user.id === row.reviewerId)?.realName
  }))
  logOperation(store, req, { operationType: 'READ_INTERVIEW_EVALUATIONS', targetType: 'INTERVIEW', targetId: interview.id,
    description: '查阅正式面试评价', detail: { result: 'SUCCESS' } })
  await commitStore(store)
  res.json(ok({ rows, summary: selection.evaluationSummary(store, interview) }))
}))

router.post('/score-policy', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const batch = currentBatch(store)
  const body = z.object({ batchId: z.number().int().positive(), weights: z.object(Object.fromEntries(
    selection.dimensions.map(key => [key, z.number().int().min(0).max(100)]))).strict(),
    aggregation: z.enum(['MEAN', 'MEDIAN']), reviewThreshold: z.number().min(0).max(100).nullable() }).strict().parse(req.body)
  if (!batch || batch.id !== body.batchId || batchWritableError(batch)) return res.status(409).json({ message: '批次已切换或不可编辑' })
  const stage = stageOf(store, batch.id, 4)
  if (!stage || !['NOT_STARTED', 'IN_PROGRESS'].includes(stage.stageStatus)) return res.status(409).json({ message: '面试阶段已关闭或暂停' })
  if (Object.values(body.weights).reduce((sum, value) => sum + value, 0) !== 100) return res.status(400).json({ message: '五项权重之和必须为 100' })
  if (store.interviewEvaluations.some(row => row.state === 'SUBMITTED' &&
    store.interviews.some(item => item.id === row.interviewId && item.batchId === batch.id))) {
    return res.status(409).json({ message: '本批次已存在正式评价，评分规则已锁定' })
  }
  const existing = store.interviewScorePolicies.find(item => item.batchId === batch.id)
  const row = { id: existing?.id || nextId(store.interviewScorePolicies), ...body, updatedAt: new Date().toISOString() }
  if (existing) Object.assign(existing, row)
  else store.interviewScorePolicies.push(row)
  logOperation(store, req, { operationType: 'SET_INTERVIEW_SCORE_POLICY', targetType: 'BATCH', targetId: batch.id,
    description: '配置面试评分权重及汇总规则' })
  await commitStore(store)
  res.json(ok(row))
}))

router.post('/:id/exception', requireAuth, requireRole(ROLES.LAB_TEACHER), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const interview = store.interviews.find(row => row.id === Number(req.params.id))
  if (!interview || interview.interviewerId !== req.user.uid || !selection.canEvaluate(store, req.user, interview)) {
    return res.status(404).json({ message: '面试不存在或无权处理' })
  }
  const { code, reason } = z.object({ code: z.enum(['STUDENT_ABSENT', 'TEACHER_ABSENT', 'NETWORK', 'OTHER']),
    reason: z.string().trim().min(1).max(400) }).strict().parse(req.body)
  if (currentBatch(store)?.id !== interview.batchId || !stageOpen(store, interview.batchId, 4) ||
      !selection.latestInterviews(store).includes(interview) || !interview.interviewTime || Date.parse(interview.interviewTime) > Date.now() ||
      (interview.onlineStartedAt && !interview.onlineEndedAt) || selection.submittedEvaluations(store, interview).length ||
      store.admissionIntentions.some(row => row.batchId === interview.batchId && row.studentId === interview.studentId &&
        row.laboratoryId === interview.laboratoryId)) {
    return res.status(409).json({ message: '请在面试阶段处理已到预约时间、已结束连接且未提交正式评价的场次' })
  }
  if (interview.exceptionCode === code && interview.exceptionNote === reason) return res.json(ok({ id: interview.id }))
  const stamp = new Date().toISOString()
  Object.assign(interview, { exceptionCode: code, exceptionNote: reason, exceptionAt: stamp })
  store.notices.push({ id: nextId(store.notices), targetUserId: interview.studentId, targetRole: 'STUDENT',
    title: '面试安排待处理', content: '本场面试已登记异常，请留意导师的后续安排。', read: false,
    createdAt: stamp, createdBy: req.user.uid, batchId: interview.batchId, interviewId: interview.id, destination: 'STUDENT_INTERVIEW' })
  logOperation(store, req, { operationType: 'INTERVIEW_EXCEPTION', targetType: 'INTERVIEW', targetId: interview.id,
    description: '登记面试异常', detail: { code, reason } })
  await commitStore(store)
  res.json(ok({ id: interview.id }))
}))

// 实训室面试列表
router.get('/lab/:labId', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  const activeBatch = currentBatch(store)
  const list = selection.latestInterviews(store)
    .filter((i) => i.laboratoryId === labId && i.batchId === activeBatch?.id &&
      scopedChoice(store, req.user, i.batchId, i.studentId, labId))
    .map((i) => {
      const stu = store.users.find((u) => u.id === i.studentId)
      const interviewer = store.users.find((u) => u.id === i.interviewerId)
      return {
        ...publicInterview(store, i),
        appointmentStatus: selection.appointmentStatus(i),
        panelIds: store.interviewParticipants.filter(item => item.interviewId === i.id && item.participantRole === 'PANEL').map(item => item.userId),
        canMarkException: req.user.uid === i.interviewerId && Boolean(i.interviewTime) && Date.parse(i.interviewTime) <= Date.now() &&
          (!i.onlineStartedAt || Boolean(i.onlineEndedAt)) && !selection.submittedEvaluations(store, i).length,
        studentName: stu?.realName || '', studentNumber: stu?.studentNumber || '',
        interviewerName: interviewer?.realName || '',
        noticeStatus: !i.noticeId ? 'NOT_SENT' : store.notices.find(notice => notice.id === i.noticeId)?.read ? 'READ' : 'SENT'
      }
    })
  res.json(ok(list))
})

// 学生查看自己的面试
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = currentBatch(store)
  if (!activeBatch) return res.json(ok([]))
  const list = selection.latestInterviews(store)
    .filter((i) => i.studentId === req.user.uid && i.batchId === activeBatch.id)
    .map((i) => {
      const lab = store.laboratories.find((l) => l.id === i.laboratoryId)
      const interviewer = store.users.find(user => user.id === i.interviewerId)
      const choice = store.studentPreferences.find(p => p.batchId === i.batchId && p.studentId === i.studentId && p.laboratoryId === i.laboratoryId)
      const teacher = store.labTeachers.find(t => t.id === choice?.labTeacherId)
      const { online } = publicInterview(store, i)
      const appointmentStatus = selection.appointmentStatus(i)
      return { id: i.id, batchId: i.batchId, laboratoryId: i.laboratoryId, interviewerId: i.interviewerId,
        interviewTime: i.interviewTime, interviewStatus: i.interviewStatus, location: i.location,
        interviewForm: i.interviewForm, instructions: i.instructions, durationMinutes: i.durationMinutes,
        appointmentStatus, acknowledgedAt: i.acknowledgedAt,
        canAcknowledge: stageOpen(store, i.batchId, 4) && ['SCHEDULED', 'WAITING', 'RESCHEDULED', 'IN_PROGRESS'].includes(appointmentStatus),
        rescheduledAt: i.rescheduledAt, followUp: Boolean(i.exceptionCode),
        online, laboratoryName: lab?.name || `实训室#${i.laboratoryId}`, interviewerName: interviewer?.realName, labTeacherName: teacher?.name }
    })
  res.json(ok(list))
})

router.post('/:id/acknowledge', requireAuth, requireRole(ROLES.STUDENT), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const row = selection.latestInterviews(store).find(item => item.id === Number(req.params.id) &&
    item.studentId === req.user.uid && item.batchId === currentBatch(store)?.id && selection.linkedChoice(store, item))
  if (!row) return res.status(404).json({ message: '面试不存在' })
  if (!stageOpen(store, row.batchId, 4) || !['SCHEDULED', 'WAITING', 'RESCHEDULED', 'IN_PROGRESS'].includes(selection.appointmentStatus(row))) {
    return res.status(409).json({ message: '该面试邀请已关闭' })
  }
  if (!row.acknowledgedAt) {
    row.acknowledgedAt = new Date().toISOString()
    const notice = store.notices.find(item => item.id === row.noticeId && item.targetUserId === req.user.uid)
    if (notice) notice.read = true
    logOperation(store, req, { operationType: 'ACK_INTERVIEW', targetType: 'INTERVIEW', targetId: row.id, description: '确认收到面试邀请' })
    await commitStore(store)
  }
  res.json(ok({ acknowledgedAt: row.acknowledgedAt }))
}))

router.get('/selection-progress', requireAuth, requireRole(ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const batch = currentBatch(store)
  const labs = store.laboratories.filter(lab => canOversee(req, store, lab.id))
  const interviews = selection.latestInterviews(store).filter(row => row.batchId === batch?.id)
  const perLab = labs.map(lab => {
    const local = interviews.filter(item => item.laboratoryId === lab.id)
    const completed = local.filter(item => selection.appointmentStatus(item) === 'COMPLETED' && !item.exceptionCode)
    const evaluated = completed.filter(item => selection.mentorEvaluated(store, item)).length
    const abnormal = local.filter(item => item.exceptionCode || selection.appointmentStatus(item) === 'UNHELD' ||
      store.interviewRecordings.some(record => record.interviewId === item.id && record.state === 'FAILED') ||
      store.interviewAiJobs.some(job => job.interviewId === item.id && job.status === 'FAILED') ||
      store.interviewAttendance.some(record => record.interviewId === item.id &&
        ['CONNECTION_ABORTED', 'SIGNAL_CLOSE', 'CONNECTION_TIMEOUT', 'MEDIA_FAILURE'].includes(record.disconnectReason)) ||
      selection.evaluationSummary(store, item).review).length
    return { laboratoryId: lab.id, laboratoryName: lab.name,
      applications: new Set(store.studentPreferences.filter(row => row.laboratoryId === lab.id && row.batchId === batch?.id &&
        row.status === 'SUBMITTED').map(row => row.studentId)).size,
      scheduled: local.filter(item => ['SCHEDULED', 'RESCHEDULED', 'WAITING', 'IN_PROGRESS'].includes(selection.appointmentStatus(item))).length,
      completed: completed.length, evaluated, pendingEvaluation: completed.length - evaluated, abnormal,
      intended: store.admissionIntentions.filter(row => row.laboratoryId === lab.id && row.batchId === batch?.id &&
        row.admissionType === 'INTENDED' && ['PENDING', 'CONFIRMED'].includes(row.status)).length,
      pendingLabReview: (store.recruitmentReviews || []).filter(row => row.laboratoryId === lab.id && row.batchId === batch?.id &&
        row.kind === 'LAB' && row.status === 'SUBMITTED').length,
      pendingAdjustment: store.adjustments.filter(row => row.targetLaboratoryId === lab.id && row.batchId === batch?.id &&
        row.status === 'PENDING').length }
  })
  res.json(ok({ batchId: batch?.id, policy: batch && selection.scorePolicy(store, batch.id), perLab,
    policyLocked: interviews.some(interview => store.interviewEvaluations.some(row => row.interviewId === interview.id && row.state === 'SUBMITTED')) }))
})

// 学院端：全部面试明细（含学生、实训室、面试官名称）
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = currentBatch(store)
  if (!activeBatch) return res.json(ok([]))
  const list = selection.latestInterviews(store)
    .filter((i) => i.batchId === activeBatch.id)
    .map((i) => {
      const stu = store.users.find((u) => u.id === i.studentId)
      const interviewer = store.users.find((u) => u.id === i.interviewerId)
      const lab = store.laboratories.find((l) => l.id === i.laboratoryId)
      return {
        id: i.id, studentId: i.studentId, laboratoryId: i.laboratoryId, interviewerId: i.interviewerId,
        interviewTime: i.interviewTime, interviewStatus: i.interviewStatus, appointmentStatus: selection.appointmentStatus(i),
        evaluationSummary: selection.evaluationSummary(store, i),
        online: i.onlineRoomName ? { status: roomStatus(store, i) } : undefined,
        studentName: stu?.realName || '',
        studentNumber: stu?.studentNumber || '',
        interviewerName: interviewer?.realName || '',
        laboratoryName: lab?.name || `实训室#${i.laboratoryId}`
      }
    })
  res.json(ok(list))
})

// 学院端：全部面试进度
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = currentBatch(store)
  if (!activeBatch) return res.json(ok({ total: 0, perLab: [] }))
  const all = selection.latestInterviews(store).filter((i) => i.batchId === activeBatch.id)
  const perLab = store.laboratories.map((lab) => {
    const labList = all.filter((i) => i.laboratoryId === lab.id)
    return {
      laboratoryId: lab.id, laboratoryName: lab.name,
      scheduled: labList.filter((i) => i.interviewStatus === 'SCHEDULED').length,
      completed: labList.filter((i) => i.interviewStatus === 'COMPLETED').length
    }
  })
  res.json(ok({ total: all.length, perLab }))
})

module.exports = router
