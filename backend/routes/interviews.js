// ============ 面试记录 ============
// POST   /api/interviews/schedule          教师创建面试安排
// POST   /api/interviews/:id/score         教师录入 5 维度评分 + 评价 + 建议
// GET    /api/interviews/lab/:labId        实训室面试列表（教师/组长/学院）
// GET    /api/interviews/my                学生查看自己的面试安排

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES, guardLab } = require('../middleware/auth')
const { currentBatch, scopedChoice, stageOpen } = require('../utils/applicationScope')
const { findBatch, batchWritableError } = require('../utils/recruitment')
const { logOperation } = require('../utils/audit')

const ScheduleSchema = z.object({
  studentId: z.number().int(),
  laboratoryId: z.number().int(),
  interviewTime: z.string().datetime(),
  location: z.string().trim().max(250).optional(),
  interviewForm: z.string().trim().max(50).optional(),
  instructions: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(180).default(30),
  interviewStatus: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional().default('SCHEDULED')
})

const ScoreSchema = z.object({
  attitudeScore: z.number().min(0).max(100).optional(),
  logicScore: z.number().min(0).max(100).optional(),
  programmingScore: z.number().min(0).max(100).optional(),
  timeCommitmentScore: z.number().min(0).max(100).optional(),
  comprehensiveScore: z.number().min(0).max(100).optional(),
  evaluation: z.string().optional().default(''),
  recommendation: z.enum(['INTENDED', 'ALTERNATE', 'REJECTED', 'PENDING']).optional().default('PENDING')
})

// 教师创建面试安排
router.post('/schedule', requireAuth, requireRole(ROLES.LAB_TEACHER), (req, res) => {
  const body = ScheduleSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = currentBatch(store)
  const lab = store.laboratories.find((l) => l.id === body.laboratoryId)
  if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有选拔批次', data: null })
  const stopError = batchWritableError(activeBatch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, body.laboratoryId)) return

  const applied = scopedChoice(store, req.user, activeBatch.id, body.studentId, body.laboratoryId)
  if (!applied) {
    return res.status(403).json({ message: '无权安排该学生的面试' })
  }
  if (!stageOpen(store, activeBatch.id, 4)) return res.status(409).json({ message: '面试阶段未开放' })
  if (body.interviewStatus === 'SCHEDULED' && !body.location && !body.interviewForm) {
    return res.status(400).json({ message: '请填写面试地点或线上会议方式' })
  }

  // 同一学生同一实训室只保留一条面试记录（重复安排视为更新时间）
  const existing = store.interviews.find(
    (i) => i.batchId === activeBatch.id && i.studentId === body.studentId && i.laboratoryId === body.laboratoryId
  )
  const start = Date.parse(body.interviewTime)
  const end = start + body.durationMinutes * 60000
  if (existing?.interviewStatus === 'COMPLETED') return res.status(409).json({ message: '已完成的面试不能重新安排' })
  if (body.interviewStatus === 'CANCELLED' && !existing?.interviewTime) return res.status(409).json({ message: '还没有可取消的面试安排' })
  if (existing && Object.entries(body).every(([key, value]) => existing[key] === value)) return res.json(ok(existing))
  if (body.interviewStatus !== 'CANCELLED' && store.interviews.some(item => item !== existing &&
    item.batchId === activeBatch.id && ['SCHEDULED', 'IN_PROGRESS'].includes(item.interviewStatus) &&
    (item.interviewerId === req.user.uid || item.studentId === body.studentId) &&
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
  Object.assign(interview, body, { interviewerId: req.user.uid })
  if (!existing) store.interviews.push(interview)
  interview.noticeId = nextId(store.notices)
  store.notices.push({
    id: interview.noticeId, targetUserId: body.studentId, targetRole: 'STUDENT',
    title: `${lab.name} · ${body.interviewStatus === 'CANCELLED' ? '面试已取消' : '面试安排已更新'}`,
    content: body.instructions || '请前往面试安排查看详情。',
    read: false, createdBy: req.user.uid, createdAt: new Date().toISOString()
  })
  logOperation(store, req, { operationType: 'SCHEDULE_INTERVIEW', targetType: 'INTERVIEW', targetId: interview.id,
    description: body.interviewStatus === 'CANCELLED' ? '取消面试并通知学生' : '保存面试安排并通知学生' })
  persistStore(store)
  res.json(ok(interview))
})

// 教师评分
router.post('/:id/score', requireAuth, requireRole(ROLES.LAB_TEACHER), (req, res) => {
  const body = ScoreSchema.parse(req.body || {})
  const store = getStore()
  const idx = store.interviews.findIndex((i) => i.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '面试不存在', data: null })
  const record = store.interviews[idx]
  if (!guardLab(req, res, record.laboratoryId)) return
  if (!scopedChoice(store, req.user, record.batchId, record.studentId, record.laboratoryId)) return res.status(403).json({ message: '无权评分该学生' })
  const stopError = batchWritableError(findBatch(store, record.batchId))
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  if (record.batchId !== currentBatch(store)?.id || !stageOpen(store, record.batchId, 4)) return res.status(409).json({ message: '本批次面试评分已关闭' })
  if (!record.interviewTime || record.interviewStatus === 'CANCELLED') return res.status(409).json({ message: '请先安排有效的面试' })
  if (body.recommendation !== 'INTENDED' && store.admissionIntentions.some(item =>
    item.source === 'TEACHER_INVITATION' && item.batchId === record.batchId && item.laboratoryId === record.laboratoryId &&
    item.studentId === record.studentId && ['PENDING', 'CONFIRMED'].includes(item.status))) {
    return res.status(409).json({ message: '该学生已收到入组邀请，面试通过结论不能直接撤销' })
  }

  // 五个考核维度必须全部评分后才能形成面试结论
  const dims = ['attitudeScore', 'logicScore', 'programmingScore', 'timeCommitmentScore', 'comprehensiveScore']
  if (body.recommendation && body.recommendation !== 'PENDING') {
    const missing = dims.filter((k) => body[k] === undefined || body[k] === null)
    if (missing.length) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请完成五个考核维度的评分', data: null })
    }
  }
  store.interviews[idx] = {
    ...record, ...body,
    interviewerId: record.interviewerId || req.user.uid,
    interviewStatus: 'COMPLETED',
    scoredBy: req.user.uid,
    scoredAt: new Date().toISOString()
  }
  logOperation(store, req, { operationType: 'SCORE_INTERVIEW', targetType: 'INTERVIEW', targetId: record.id,
    description: '保存面试评分与评价' })
  persistStore(store)
  res.json(ok(store.interviews[idx]))
})

// 实训室面试列表
router.get('/lab/:labId', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  const activeBatch = currentBatch(store)
  const list = store.interviews
    .filter((i) => i.laboratoryId === labId && i.batchId === activeBatch?.id &&
      scopedChoice(store, req.user, i.batchId, i.studentId, labId))
    .map((i) => {
      const stu = store.users.find((u) => u.id === i.studentId)
      const interviewer = store.users.find((u) => u.id === i.interviewerId)
      return {
        ...i,
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
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  if (!activeBatch) return res.json(ok([]))
  const list = store.interviews
    .filter((i) => i.studentId === req.user.uid && i.batchId === activeBatch.id)
    .map((i) => {
      const lab = store.laboratories.find((l) => l.id === i.laboratoryId)
      const interviewer = store.users.find(user => user.id === i.interviewerId)
      const choice = store.studentPreferences.find(p => p.batchId === i.batchId && p.studentId === i.studentId && p.laboratoryId === i.laboratoryId)
      const teacher = store.labTeachers.find(t => t.id === choice?.labTeacherId)
      return { ...i, laboratoryName: lab?.name || `实训室#${i.laboratoryId}`, interviewerName: interviewer?.realName, labTeacherName: teacher?.name }
    })
  res.json(ok(list))
})

// 学院端：全部面试明细（含学生、实训室、面试官名称）
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  if (!activeBatch) return res.json(ok([]))
  const list = store.interviews
    .filter((i) => i.batchId === activeBatch.id)
    .map((i) => {
      const stu = store.users.find((u) => u.id === i.studentId)
      const interviewer = store.users.find((u) => u.id === i.interviewerId)
      const lab = store.laboratories.find((l) => l.id === i.laboratoryId)
      return {
        ...i,
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
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const all = store.interviews.filter((i) => i.batchId === activeBatch.id)
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
