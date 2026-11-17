// ============ 拟录取 / 确认 ============
// POST   /api/admissions/intend            实训室组长/教师提交拟录取 / 递补名单
// POST   /api/admissions/:id/confirm       学生确认或放弃
// GET    /api/admissions/my                学生查看自己的拟录取意向
// GET    /api/admissions/lab/:labId        实训室确认情况
// GET    /api/admissions/overview          学院端汇总

const express = require('express')
const { latestInterviews, mentorEvaluated } = require('../services/interviewSelection')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, commitStore, nextId, ADMISSION_TYPE } = require('../data/seed')
const { requireAuth, requireRole, ROLES, guardLab, isLabLeader } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')
const { firstRoundEnded, scopedChoice, stageOpen } = require('../utils/applicationScope')
const { currentBatch, batchWritableError, stageOf } = require('../utils/recruitment')
const { invitationExpired, mentorCapacityError, occupiedAdmissionStudents, labCapacity, teacherCapacity } = require('../utils/mentorCapacity')

const TEACHER_INVITATION = 'TEACHER_INVITATION'

function activeBatchOf(store) {
  return currentBatch(store)
}

// 已占用名额：已确认的拟录取 + 已录取的最终名单（同一学生不重复计数）
function occupiedCount(store, batchId, laboratoryId) {
  return occupiedAdmissionStudents(store, batchId, { laboratoryId }).size
}

function isFirstRoundOpen(store, batchId) {
  return [4, 5].some(number => stageOpen(store, batchId, number)) &&
    !firstRoundEnded(store, batchId)
}

function visibleInvitation(store, item) {
  return invitationExpired(store, item)
    ? { ...item, status: 'EXPIRED' }
    : item
}

function withStudent(store, item) {
  const student = store.users.find(user => user.id === item.studentId)
  return { ...item, studentName: student?.realName || '', studentNumber: student?.studentNumber || '' }
}

function teacherRoom(store, user) {
  const lab = store.laboratories.find(item => item.id === user.laboratoryId)
  const profiles = store.labTeachers.filter(item => item.laboratoryId === lab?.id && item.userId === user.uid)
  const mentor = profiles.find(item => item.status !== 'INACTIVE') ?? profiles[0]
  return { lab, mentor }
}

function teacherPasses(store, batchId, user, labId) {
  return latestInterviews(store).filter(record => record.batchId === batchId && record.laboratoryId === labId &&
    record.interviewStatus === 'COMPLETED' && record.recommendation === 'INTENDED' &&
    mentorEvaluated(store, record) &&
    (record.scoredBy ?? record.interviewerId) === user.uid &&
    scopedChoice(store, user, batchId, record.studentId, labId))
}

router.get('/teacher-invitations', requireAuth, requireRole(ROLES.LAB_TEACHER), (req, res) => {
  const store = getStore()
  const batch = activeBatchOf(store)
  const { lab, mentor } = teacherRoom(store, req.user)
  const invitations = lab && mentor && batch ? store.admissionIntentions.filter(item => item.batchId === batch.id &&
    item.laboratoryId === lab.id && item.admissionType === ADMISSION_TYPE.INTENDED &&
    (item.labTeacherId != null ? item.labTeacherId === mentor.id :
      scopedChoice(store, req.user, batch.id, item.studentId, lab.id))) : []
  const open = Boolean(batch && lab?.status === 'ACTIVE' && mentor && mentor.status !== 'INACTIVE' && isFirstRoundOpen(store, batch.id))
  const occupied = batch && mentor ? occupiedAdmissionStudents(store, batch.id, { mentorId: mentor.id }).size : 0
  const candidates = batch && lab && mentor ? teacherPasses(store, batch.id, req.user, lab.id)
    .filter(item => !store.admissionIntentions.some(invitation => invitation.batchId === batch.id &&
      invitation.laboratoryId === lab.id && invitation.studentId === item.studentId))
    .map(item => withStudent(store, { studentId: item.studentId })) : []
  res.json(ok({ invitations: invitations.map(item => withStudent(store, visibleInvitation(store, item))),
    candidates, open, mentorConfigured: Boolean(mentor), quota: mentor && batch ? teacherCapacity(store, batch.id, mentor) : null, occupied }))
})

router.post('/teacher-invitations', requireAuth, requireRole(ROLES.LAB_TEACHER), async (req, res, next) => {
  try {
    const { studentId } = z.object({ studentId: z.number().int().positive() }).strict().parse(req.body)
    const store = structuredClone(getStore())
    const batch = activeBatchOf(store)
    const { lab, mentor } = teacherRoom(store, req.user)
    const stopError = batchWritableError(batch)
    if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
    const choice = lab && batch && scopedChoice(store, req.user, batch.id, studentId, lab.id)
    if (!choice || choice.labTeacherId !== mentor?.id) return res.status(403).json({ message: '只能邀请明确选择本人的学生' })
    if (lab.status !== 'ACTIVE' || mentor.status === 'INACTIVE' || !isFirstRoundOpen(store, batch.id)) {
      return res.status(409).json({ message: '本室当前不能发送首轮邀请' })
    }
    const existing = store.admissionIntentions.find(item => item.batchId === batch.id &&
      item.laboratoryId === lab.id && item.studentId === studentId)
    if (existing) {
      if (existing.source === TEACHER_INVITATION && existing.labTeacherId === mentor.id && !invitationExpired(store, existing) && existing.status === 'PENDING') {
        return res.json(ok(existing))
      }
      return res.status(409).json({ message: '该学生已有本室录取记录' })
    }
    const interview = teacherPasses(store, batch.id, req.user, lab.id).find(item => item.studentId === studentId)
    if (!interview) return res.status(409).json({ message: '请在面试管理中完成评分并标记面试通过' })
    const student = store.users.find(user => user.id === studentId)
    if (!student || student.status !== 'ACTIVE') return res.status(409).json({ message: '该学生账号不可用' })
    if (store.admissionIntentions.some(item => item.batchId === batch.id && item.studentId === studentId &&
      item.admissionType === 'INTENDED' && item.status === 'CONFIRMED') ||
      store.adjustments.some(item => item.batchId === batch.id && item.studentId === studentId && item.status === 'CONFIRMED') ||
      store.finalAdmissions.some(item => item.batchId === batch.id && item.studentId === studentId && item.finalStatus !== 'REJECTED')) {
      return res.status(409).json({ message: '学生已确认其他去向' })
    }
    const capacityError = mentorCapacityError(store, batch.id, mentor.id, studentId)
    if (capacityError) return res.status(409).json({ message: capacityError })
    if (occupiedCount(store, batch.id, lab.id) >= labCapacity(store, batch.id, lab)) {
      return res.status(409).json({ message: '本实训室可用名额不足' })
    }
    const deadline = [5, 4].map(number => store.recruitmentStages.find(stage =>
      stage.batchId === batch.id && stage.stageNumber === number)?.endTime)
      .find(value => value && Date.parse(value) >= Date.now()) ?? null
    const createdAt = new Date().toISOString()
    const item = { id: nextId(store.admissionIntentions), batchId: batch.id, laboratoryId: lab.id,
      labTeacherId: mentor.id, studentId, admissionType: ADMISSION_TYPE.INTENDED, status: 'PENDING',
      source: TEACHER_INVITATION, reason: interview.evaluation, confirmationDeadline: deadline, createdAt }
    store.admissionIntentions.push(item)
    store.notices.push({ id: nextId(store.notices), targetRole: 'STUDENT', targetUserId: studentId, createdBy: req.user.uid,
      title: `${lab.name} · 面试通过与入组邀请`, content: `${mentor.name}老师邀请你加入小组，请前往「拟录取确认」接受或放弃。`,
      read: false, createdAt, batchId: batch.id, destination: 'STUDENT_ADMISSION' })
    logOperation(store, req, { operationType: 'SEND_TEACHER_INVITATION', targetType: 'ADMISSION', targetId: item.id, description: '发送面试通过与入组邀请' })
    await commitStore(store)
    res.json(ok(item))
  } catch (error) {
    next(error)
  }
})

router.get('/teacher-members', requireAuth, requireRole(ROLES.LAB_TEACHER), (req, res) => {
  const store = getStore()
  const batch = activeBatchOf(store)
  const { lab, mentor } = teacherRoom(store, req.user)
  if (!lab || !mentor || !batch) return res.json(ok([]))
  const members = new Map()
  for (const item of store.admissionIntentions) {
    if (item.batchId === batch.id && item.laboratoryId === lab.id && item.admissionType === ADMISSION_TYPE.INTENDED &&
      item.status === 'CONFIRMED' && (item.labTeacherId != null ? item.labTeacherId === mentor.id :
        scopedChoice(store, req.user, batch.id, item.studentId, lab.id))) {
      members.set(item.studentId, withStudent(store, { studentId: item.studentId, joinedAt: item.confirmedAt, source: 'INVITATION' }))
    }
  }
  for (const item of store.adjustments) {
    if (item.batchId === batch.id && item.targetLaboratoryId === lab.id && item.targetLabTeacherId === mentor.id &&
      item.status === 'CONFIRMED' && !members.has(item.studentId)) {
      members.set(item.studentId, withStudent(store, { studentId: item.studentId, joinedAt: item.confirmedAt, source: 'ADJUSTMENT' }))
    }
  }
  res.json(ok([...members.values()].sort((a, b) => a.studentNumber.localeCompare(b.studentNumber))))
})

// 递补：出现空缺时，按提交时间将最早的递补候选提升为拟录取
function promoteAlternate(store, batchId, laboratoryId) {
  if (!stageOpen(store, batchId, 5)) return null
  const lab = store.laboratories.find((l) => l.id === laboratoryId)
  if (!lab) return null
  if (occupiedCount(store, batchId, laboratoryId) >= labCapacity(store, batchId, lab)) return null
  const alternate = store.admissionIntentions
    .filter((a) => a.batchId === batchId && a.laboratoryId === laboratoryId &&
      a.admissionType === ADMISSION_TYPE.ALTERNATE && a.status === 'PENDING' &&
      !mentorCapacityError(store, batchId, a.labTeacherId, a.studentId) &&
      !store.admissionIntentions.some(other => other.batchId === batchId && other.studentId === a.studentId &&
        other.admissionType === ADMISSION_TYPE.INTENDED && other.status === 'CONFIRMED'))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0]
  if (!alternate) return null
  alternate.admissionType = ADMISSION_TYPE.INTENDED
  alternate.status = 'PENDING'
  alternate.promotedAt = new Date().toISOString()
  alternate.confirmationDeadline = store.recruitmentStages.find(stage => stage.batchId === batchId && stage.stageNumber === 5)?.endTime || null
  store.notices.push({ id: nextId(store.notices), targetRole: 'STUDENT', targetUserId: alternate.studentId,
    title: `${lab.name} · 递补拟录取`, content: '请前往拟录取确认页面处理。', read: false, createdAt: alternate.promotedAt })
  return alternate
}

// 正式通知由学院审核实训室名单后发布。
router.post('/intend', requireAuth, requireRole(ROLES.LAB_LEADER, ROLES.LAB_TEACHER), (_req, res) => {
  res.status(409).json({ message: '请通过选拔名单工作流提交，正式通知由学院审核后发布' })
})

// 学生确认或放弃
router.post('/:id/confirm', requireAuth, requireRole(ROLES.STUDENT), async (req, res, next) => {
  try {
    const confirmed = z.boolean().parse(req.body?.confirmed)
    const store = structuredClone(getStore())
    const batch = activeBatchOf(store)
    const stopError = batchWritableError(batch)
    if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
    const idx = store.admissionIntentions.findIndex((a) => a.id === Number(req.params.id) && a.studentId === req.user.uid)
    if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '未找到此意向', data: null })
    const item = store.admissionIntentions[idx]
    const hasOtherConfirmedOffer = batch && store.admissionIntentions.some(a =>
      a.batchId === batch.id && a.studentId === item.studentId && a.id !== item.id &&
      a.admissionType === ADMISSION_TYPE.INTENDED && a.status === 'CONFIRMED')
    const hasConfirmedAdjustment = batch && store.adjustments.some(a => a.batchId === batch.id &&
      a.studentId === item.studentId && a.status === 'CONFIRMED')
    if (!batch || item.batchId !== batch.id || (confirmed && (hasOtherConfirmedOffer || hasConfirmedAdjustment))) {
      return res.status(409).json({ code: 'BUSINESS_ERROR', message: '当前批次不可确认该意向，或已有确认结果', data: null })
    }
    const canConfirm = item.source === TEACHER_INVITATION
      ? isFirstRoundOpen(store, batch.id) : stageOpen(store, batch.id, 5)
    if (!canConfirm) return res.status(409).json({ message: '当前确认阶段未开放' })
    if (item.admissionType !== ADMISSION_TYPE.INTENDED) {
      return res.status(400).json({ code: 'BUSINESS_ERROR', message: '递补记录无需确认', data: null })
    }
    if (item.status !== 'PENDING') {
      return res.status(400).json({ code: 'BUSINESS_ERROR', message: '该意向已处理，请勿重复提交', data: null })
    }
    if (invitationExpired(store, item)) {
      return res.status(400).json({ code: 'BUSINESS_ERROR', message: '确认已超时，意向已失效', data: null })
    }

    item.status = confirmed ? 'CONFIRMED' : 'REJECTED'
    item.confirmedAt = new Date().toISOString()

    if (confirmed) {
      // 学生只能选择一个去向：确认后自动放弃其他待确认拟录取，释放名额
      store.admissionIntentions.forEach((a) => {
        if (a.batchId === batch.id && a.studentId === item.studentId && a.id !== item.id &&
          a.admissionType === ADMISSION_TYPE.INTENDED && a.status === 'PENDING') {
          a.status = 'REJECTED'
          a.releasedAt = new Date().toISOString()
          if (a.source !== TEACHER_INVITATION) promoteAlternate(store, batch.id, a.laboratoryId)
        }
      })
    } else if (item.source !== TEACHER_INVITATION) {
      promoteAlternate(store, batch.id, item.laboratoryId)
    }

    logOperation(store, req, {
      operationType: 'CONFIRM_ADMISSION', targetType: 'ADMISSION', targetId: item.id,
      description: confirmed ? '学生确认拟录取' : '学生放弃拟录取'
    })
    await commitStore(store)
    res.json(ok(item))
  } catch (error) {
    next(error)
  }
})

// 学生查看自己的拟录取意向
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.admissionIntentions
    .filter((a) => a.studentId === req.user.uid && a.batchId === activeBatch.id)
    .map((a) => {
      const lab = store.laboratories.find((l) => l.id === a.laboratoryId)
      const teacher = store.labTeachers.find(t => t.id === a.labTeacherId)
      const { reason, ...studentView } = visibleInvitation(store, a)
      return { ...studentView, laboratoryName: lab?.name || `实训室#${a.laboratoryId}`, labTeacherName: teacher?.name }
    })
  res.json(ok(list))
})

// 实训室查看本室确认情况
router.get('/lab/:labId', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  const activeBatch = activeBatchOf(store)
  const list = store.admissionIntentions
    .filter((a) => a.laboratoryId === labId && a.batchId === activeBatch?.id &&
      (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, a.batchId, a.studentId, labId)))
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      return {
        ...visibleInvitation(store, a), studentName: stu?.realName || '', studentNumber: stu?.studentNumber || '',
        labTeacherName: store.labTeachers.find(t => t.id === a.labTeacherId)?.name
      }
    })
  res.json(ok(list))
})

// 学院端：全院拟录取/递补明细
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.admissionIntentions
    .filter((a) => a.batchId === activeBatch.id)
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      const lab = store.laboratories.find((l) => l.id === a.laboratoryId)
      return {
        ...a,
        studentName: stu?.realName || '',
        studentNumber: stu?.studentNumber || '',
        laboratoryName: lab?.name || `实训室#${a.laboratoryId}`
      }
    })
  res.json(ok(list))
})

// 组长处理本实训室逾期未确认的拟录取意向
router.post('/expire', requireAuth, requireRole(ROLES.LAB_LEADER), (req, res) => {
  const store = getStore()
  const lab = store.laboratories.find(item => item.id === req.user.laboratoryId)
  if (!lab || !isLabLeader(req, lab)) return res.status(403).json({ message: '只能处理本人负责实训室的录取' })
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  const stopError = batchWritableError(activeBatch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  let count = 0
  store.admissionIntentions
    .filter((a) => a.batchId === activeBatch.id && a.status === 'PENDING' &&
      a.laboratoryId === lab.id &&
      a.admissionType === ADMISSION_TYPE.INTENDED)
    .forEach((a) => {
      if (invitationExpired(store, a)) {
        a.status = 'EXPIRED'
        count += 1
        if (a.source !== TEACHER_INVITATION) promoteAlternate(store, activeBatch.id, a.laboratoryId)
      }
    })
  if (count) {
    logOperation(store, req, {
      operationType: 'EXPIRE_ADMISSIONS', targetType: 'ADMISSION', targetId: null,
      description: `逾期未确认自动释放 ${count} 条拟录取意向`
    })
  }
  persistStore(store)
  res.json(ok({ expired: count }))
})

// 学院汇总
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  const all = store.admissionIntentions.filter((a) => a.batchId === activeBatch.id)
  const perLab = store.laboratories.map((lab) => {
    const list = all.filter((a) => a.laboratoryId === lab.id && a.admissionType === ADMISSION_TYPE.INTENDED)
    return {
      laboratoryId: lab.id, laboratoryName: lab.name,
      intended: list.length,
      confirmed: list.filter((a) => a.status === 'CONFIRMED').length,
      rejected: list.filter((a) => a.status === 'REJECTED').length,
      quota: batch ? labCapacity(store, batch.id, lab) : lab.recruitmentQuota
    }
  })
  res.json(ok({
    totalIntended: all.filter((a) => a.admissionType === ADMISSION_TYPE.INTENDED).length,
    totalAlternate: all.filter((a) => a.admissionType === ADMISSION_TYPE.ALTERNATE).length,
    perLab
  }))
})

module.exports = router
