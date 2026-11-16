// ============ 学生志愿（意向填报） ============
// POST   /api/preferences/submit            学生提交最多 3 个平行志愿 + 2 项调剂意愿
// GET    /api/preferences/my                学生查看自己的志愿
// GET    /api/preferences/lab/:labId        实训室教师/组长查看报名本室的学生
// GET    /api/preferences/overview          学院管理员全院志愿分布

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, commitStore, nextId } = require('../data/seed')
const { logOperation } = require('../utils/audit')
const { requireAuth, requireRole, ROLES, guardLab } = require('../middleware/auth')
const { ownsChoice } = require('../utils/applicationScope')
const { currentBatch, stageOf, batchWritableError } = require('../utils/recruitment')
const { router: resumes, resumeFile, resumeView } = require('./resumes')
const fs = require('fs')

router.use('/resumes', resumes)

const SubmitSchema = z.object({
  choices: z.array(z.object({
    laboratoryId: z.number().int().positive(),
    labTeacherId: z.number().int().positive()
  })).min(1).max(3),
  resumeId: z.string({ required_error: '请先上传个人简历' }).uuid('简历无效，请重新上传'),
  obeyInternalAdjustment: z.boolean(),
  obeyCollegeAdjustment: z.boolean()
})

// 取当前批次
function activeBatchOf(store) {
  return currentBatch(store)
}

// 判断意向填报阶段是否开放（阶段有效状态由时间窗实时推导）
function preferenceWindowError(store, batch) {
  const stage = stageOf(store, batch.id, 3)
  if (!stage) return '当前批次未配置意向填报阶段'
  if (stage.stageStatus === 'PAUSED') return '意向填报阶段已暂停，志愿已锁定'
  if (stage.stageStatus === 'COMPLETED') return '意向填报阶段已结束，志愿已锁定'
  if (stage.stageStatus !== 'IN_PROGRESS') return '意向填报阶段尚未开始'
  return null
}

// 学生提交志愿
router.post('/submit', requireAuth, requireRole(ROLES.STUDENT), async (req, res, next) => {
  try {
    const body = SubmitSchema.parse(req.body || {})
    const store = structuredClone(getStore())
    const activeBatch = activeBatchOf(store)
    if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '当前没有活跃的选拔批次', data: null })
    const stopError = batchWritableError(activeBatch)
    if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
    if (store.studentPreferences.some(p => p.studentId === req.user.uid && p.batchId === activeBatch.id && p.status === 'SUBMITTED')) {
      return res.status(409).json({ code: 'BUSINESS_ERROR', message: '本批次志愿已提交，请查看提交回执', data: null })
    }

    // 阶段时间窗校验：截止后志愿自动锁定，不再允许修改
    const windowError = preferenceWindowError(store, activeBatch)
    if (windowError) return res.status(400).json({ code: 'BUSINESS_ERROR', message: windowError, data: null })
    const resume = (store.applicationResumes || []).find(item => item.id === body.resumeId &&
      item.batchId === activeBatch.id && item.studentId === req.user.uid && !item.submittedAt)
    if (!resume || !resumeFile(resume.id) || !fs.existsSync(resumeFile(resume.id))) {
      return res.status(400).json({ message: '请先上传本批次有效简历' })
    }

    // 校验实训室存在且启用
    const labMap = new Map(store.laboratories.map((l) => [l.id, l]))
    for (const { laboratoryId: id, labTeacherId } of body.choices) {
      const lab = labMap.get(id)
      if (!lab) return res.status(400).json({ code: 'VALIDATION_FAILED', message: `实训室 ${id} 不存在`, data: null })
      if (lab.status && lab.status !== 'ACTIVE') {
        return res.status(400).json({ code: 'VALIDATION_FAILED', message: `「${lab.name}」已停用，不能填报`, data: null })
      }
      if (!store.labTeachers.some(teacher => teacher.id === labTeacherId && teacher.laboratoryId === id &&
        teacher.status !== 'INACTIVE' && store.users.some(user => user.id === teacher.userId &&
          user.laboratoryId === id && user.status === 'ACTIVE' && [ROLES.LAB_TEACHER, ROLES.LAB_LEADER].includes(user.role)))) {
        return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请选择该实训室的指导教师', data: null })
      }
    }
    // 去重
    const uniqueLabs = new Set(body.choices.map(choice => choice.laboratoryId))
    if (uniqueLabs.size !== body.choices.length) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: '不允许重复填报同一个实训室', data: null })
    }

    // 清除旧草稿，已提交记录在上方拦截。
    store.studentPreferences = store.studentPreferences.filter(
      (p) => !(p.studentId === req.user.uid && p.batchId === activeBatch.id)
    )
    // 写入新志愿
    const submittedAt = new Date().toISOString()
    resume.submittedAt = submittedAt
    body.choices.forEach(({ laboratoryId: labId, labTeacherId }) => {
      store.studentPreferences.push({
        id: nextId(store.studentPreferences),
        batchId: activeBatch.id, studentId: req.user.uid, laboratoryId: labId,
        labTeacherId,
        obeyInternalAdjustment: body.obeyInternalAdjustment,
        obeyCollegeAdjustment: body.obeyCollegeAdjustment,
        submittedAt, status: 'SUBMITTED'
      })
      // 报名学生自动获得该实训室面试资格（不覆盖已有面试记录）
      const exists = store.interviews.some(
        (i) => i.batchId === activeBatch.id && i.studentId === req.user.uid && i.laboratoryId === labId
      )
      if (!exists) {
        const mentor = store.labTeachers.find(item => item.id === labTeacherId)
        store.interviews.push({
          id: nextId(store.interviews),
          batchId: activeBatch.id,
          studentId: req.user.uid,
          laboratoryId: labId,
          interviewerId: mentor?.userId ?? null,
          interviewTime: null,
          interviewStatus: 'SCHEDULED',
          attitudeScore: null, logicScore: null, programmingScore: null,
          timeCommitmentScore: null, comprehensiveScore: null,
          evaluation: '', recommendation: 'PENDING',
          createdAt: submittedAt
        })
      }
    })
    logOperation(store, req, { operationType: 'SUBMIT_PREFERENCES', targetType: 'BATCH', targetId: activeBatch.id, description: '学生提交平行志愿' })
    await commitStore(store, { batchId: activeBatch.id, studentId: req.user.uid, submittedAt })
    res.json(ok({ count: uniqueLabs.size }))
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('student_preference_submissions')) {
      return res.status(409).json({ code: 'BUSINESS_ERROR', message: '本批次志愿已提交', data: null })
    }
    next(error)
  }
})

// 学生查看自己的志愿
router.get('/my', requireAuth, (req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.studentPreferences
    .filter((p) => p.studentId === req.user.uid && p.batchId === activeBatch.id)
    .map((p) => {
      const lab = store.laboratories.find((l) => l.id === p.laboratoryId)
      const teacher = store.labTeachers.find(t => t.id === p.labTeacherId && t.laboratoryId === p.laboratoryId)
      const resume = (store.applicationResumes || []).find(item => item.batchId === p.batchId && item.studentId === p.studentId && item.submittedAt)
      return { ...p, laboratoryName: lab?.name || `实训室#${p.laboratoryId}`, labTeacherName: teacher?.name, resume: resumeView(resume) }
    })
  res.json(ok(list))
})

// 实训室端：查看本室报名学生
router.get('/lab/:labId', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  // 数据范围：学院管理员全院可见，教师/组长仅限本人所属实训室
  if (!guardLab(req, res, labId)) return

  const activeBatch = activeBatchOf(store)
  const list = store.studentPreferences
    .filter((p) => p.laboratoryId === labId && p.batchId === activeBatch?.id && ownsChoice(store, req.user, p))
    .map((p) => {
      const student = store.users.find((u) => u.id === p.studentId)
      const resume = (store.applicationResumes || []).find(item => item.batchId === p.batchId && item.studentId === p.studentId && item.submittedAt)
      const interview = store.interviews.find(item => item.batchId === p.batchId && item.studentId === p.studentId && item.laboratoryId === labId)
      return {
        id: p.id, studentId: p.studentId, laboratoryId: labId,
        studentName: student?.realName || '', studentNumber: student?.studentNumber || '',
        laboratoryName: lab.name, resume: resumeView(resume), interview,
        labTeacherId: p.labTeacherId,
        labTeacherName: store.labTeachers.find(t => t.id === p.labTeacherId && t.laboratoryId === labId)?.name,
        obeyInternalAdjustment: p.obeyInternalAdjustment,
        obeyCollegeAdjustment: p.obeyCollegeAdjustment,
        submittedAt: p.submittedAt, status: p.status
      }
    })
  res.json(ok(list))
})

// 学院端：全院志愿明细（含学生与实训室名称）
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.studentPreferences
    .filter((p) => p.batchId === activeBatch.id)
    .map((p) => {
      const student = store.users.find((u) => u.id === p.studentId)
      const lab = store.laboratories.find((l) => l.id === p.laboratoryId)
      return {
        ...p,
        studentName: student?.realName || '',
        studentNumber: student?.studentNumber || '',
        laboratoryName: lab?.name || `实训室#${p.laboratoryId}`
      }
    })
  res.json(ok(list))
})

// 学院端：全院志愿总览
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok({ totalStudents: 0, perLab: [] }))
  const prefs = store.studentPreferences.filter((p) => p.batchId === activeBatch.id && p.status === 'SUBMITTED')
  const perLab = store.laboratories.map((lab) => {
    const count = prefs.filter((p) => p.laboratoryId === lab.id).length
    return { laboratoryId: lab.id, laboratoryName: lab.name, quota: lab.recruitmentQuota, applicationCount: count }
  })
  const uniqueStudents = new Set(prefs.map((p) => p.studentId))
  res.json(ok({ totalStudents: uniqueStudents.size, perLab }))
})

module.exports = router
