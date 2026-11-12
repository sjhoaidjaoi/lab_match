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
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

const ScheduleSchema = z.object({
  studentId: z.number().int(),
  laboratoryId: z.number().int(),
  interviewTime: z.string().datetime(),
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
router.post('/schedule', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER), (req, res) => {
  const body = ScheduleSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const interview = {
    id: nextId(store.interviews),
    batchId: activeBatch.id,
    interviewerId: req.user.uid,
    ...body,
    createdAt: new Date().toISOString()
  }
  store.interviews.push(interview)
  persistStore(store)
  res.json(ok(interview))
})

// 教师评分
router.post('/:id/score', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER), (req, res) => {
  const body = ScoreSchema.parse(req.body || {})
  const store = getStore()
  const idx = store.interviews.findIndex((i) => i.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '面试不存在', data: null })
  const record = store.interviews[idx]
  store.interviews[idx] = { ...record, ...body, interviewStatus: 'COMPLETED' }
  persistStore(store)
  res.json(ok(store.interviews[idx]))
})

// 实训室面试列表
router.get('/lab/:labId', requireAuth, (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.interviews
    .filter((i) => i.laboratoryId === Number(req.params.labId) && i.batchId === activeBatch.id)
    .map((i) => {
      const stu = store.users.find((u) => u.id === i.studentId)
      const interviewer = store.users.find((u) => u.id === i.interviewerId)
      return {
        ...i,
        studentName: stu?.realName || '', studentNumber: stu?.studentNumber || '',
        interviewerName: interviewer?.realName || ''
      }
    })
  res.json(ok(list))
})

// 学生查看自己的面试
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.interviews
    .filter((i) => i.studentId === req.user.uid && i.batchId === activeBatch.id)
    .map((i) => {
      const lab = store.laboratories.find((l) => l.id === i.laboratoryId)
      return { ...i, laboratoryName: lab?.name || `实训室#${i.laboratoryId}` }
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
