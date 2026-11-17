const router = require('express').Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { BusinessError } = require('../middleware/error')
const { requireAuth, requireRole, ROLES, canAccessLab } = require('../middleware/auth')
const { getStore, commitStore, nextId } = require('../data/seed')
const { currentBatch, personalScope, scopedChoice, stageOpen } = require('../utils/applicationScope')
const { batchWritableError, stageOf } = require('../utils/recruitment')
const { mentorCapacityError, occupiedAdmissionStudents, occupiesInvitation, labCapacity } = require('../utils/mentorCapacity')
const { logOperation } = require('../utils/audit')
const { resumeView } = require('./resumes')
const selection = require('../services/interviewSelection')

const staff = requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN)
const entry = z.object({
  studentId: z.number().int().positive(),
  type: z.enum(['INTENDED', 'ALTERNATE']),
  reason: z.string().trim().max(1000)
})
const entriesSchema = z.array(entry).min(1).max(500)
const noteSchema = z.string().trim().min(1).max(1000)
const surnameOrder = new Intl.Collator('zh-Hans-CN-u-co-pinyin')

function reject(message, status = 409) {
  throw new BusinessError(message, 'REVIEW_ERROR', status)
}

function context(req) {
  const store = structuredClone(getStore())
  const batch = currentBatch(store)
  if (!batch) reject('没有选拔批次')
  // 批次已停止/结束时不再接受新的名单提交与审核
  const stopError = batchWritableError(batch)
  if (stopError) reject(stopError)
  store.recruitmentReviews ||= []
  return { store, batch, rows: store.recruitmentReviews, user: req.user }
}

function handler(fn) {
  return async (req, res, next) => {
    const pending = Promise.resolve().then(() => fn(req))
    res.locals.mutationPending = pending
    try { res.json(ok(await pending)) } catch (error) { next(error) }
  }
}

function findReview(ctx, id, kind) {
  const row = ctx.rows.find(item => item.id === Number(id) && item.batchId === ctx.batch.id && item.kind === kind)
  if (!row) reject('当前批次没有该名单', 404)
  return row
}

function selectEntries(ctx, raw, labId, requireReason = true) {
  const items = entriesSchema.parse(raw)
  if (requireReason && items.some(item => !item.reason)) reject('请填写每一项建议的原因', 400)
  if (new Set(items.map(item => item.studentId)).size !== items.length) reject('名单存在重复学生', 400)
  return items.map(item => {
    const choice = scopedChoice(ctx.store, ctx.user, ctx.batch.id, item.studentId, labId)
    if (!choice) reject('名单包含无权处理的学生', 403)
    const interview = selection.latestInterviews(ctx.store).find(record => record.batchId === ctx.batch.id &&
      record.laboratoryId === labId && record.studentId === item.studentId)
    if (!selection.mentorEvaluated(ctx.store, interview)) reject('请先完成名单中每位学生的导师正式面试评价')
    return { ...item, labTeacherId: choice.labTeacherId }
  })
}

async function save(ctx, req, row, operationType) {
  logOperation(ctx.store, req, { operationType, targetType: 'RECRUITMENT_REVIEW', targetId: row.id, description: `名单版本 ${row.version} · ${row.status}` })
  await commitStore(ctx.store)
  return row
}

router.get('/', requireAuth, staff, handler(req => {
  const store = getStore()
  const batch = currentBatch(store)
  if (!batch) return []
  const rows = store.recruitmentReviews || []
  const user = req.user
  return rows.filter(row => row.batchId === batch.id && canAccessLab(req, row.laboratoryId) &&
    (user.activeRole === ROLES.COLLEGE_ADMIN ? row.kind !== 'TEACHER'
      : user.activeRole === ROLES.LAB_LEADER ? row.kind !== 'TEACHER' || row.status !== 'DRAFT'
      : row.kind === 'TEACHER' && row.authorId === user.uid))
    .map(row => ({ ...row, laboratoryName: store.laboratories.find(lab => lab.id === row.laboratoryId)?.name,
      authorName: store.users.find(item => item.id === row.authorId)?.realName,
      labStatus: row.kind === 'TEACHER' && row.status === 'SUBMITTED'
        ? rows.filter(item => item.kind === 'LAB' && item.batchId === row.batchId && item.laboratoryId === row.laboratoryId)
          .sort((a, b) => b.version - a.version)[0]?.status : undefined,
      entries: (row.entries || []).map(item => ({
        ...item,
        studentName: store.users.find(u => u.id === item.studentId)?.realName,
        resume: resumeView((store.applicationResumes || []).find(resume => resume.batchId === row.batchId &&
          resume.studentId === item.studentId && resume.submittedAt))
      })) }))
}))

function labCandidates(store, batchId, user, labId) {
  const choices = store.studentPreferences.filter(choice => choice.batchId === batchId &&
    choice.laboratoryId === labId && choice.status === 'SUBMITTED')
  const interviews = new Map(selection.latestInterviews(store).filter(interview => interview.batchId === batchId &&
    interview.laboratoryId === labId && selection.mentorEvaluated(store, interview))
    .map(interview => [interview.studentId, interview]))
  const submitted = new Map()
  const invitations = new Map(store.admissionIntentions.filter(item => item.batchId === batchId &&
    item.laboratoryId === labId && item.source === 'TEACHER_INVITATION')
    .map(item => [item.studentId, item]))
  for (const row of store.recruitmentReviews || []) {
    if (row.kind !== 'TEACHER' || row.status !== 'SUBMITTED' || row.batchId !== batchId ||
      row.laboratoryId !== labId) continue
    for (const item of row.entries || []) {
      submitted.set(item.studentId, { ...item, authorId: row.authorId, submittedAt: row.submittedAt })
    }
  }

  return choices.flatMap(choice => {
    const interview = interviews.get(choice.studentId)
    if (!interview) return []
    const mentor = store.labTeachers.find(item => item.id === choice.labTeacherId && item.laboratoryId === labId)
    if (!mentor?.userId) return []
    const suggestion = submitted.get(choice.studentId)
    const submittedByMentor = suggestion?.authorId === mentor.userId && suggestion.labTeacherId === mentor.id
    const invitation = invitations.get(choice.studentId)
    if (invitation && !occupiesInvitation(store, invitation)) return []
    const invitedByMentor = invitation?.labTeacherId === mentor.id
    const ownPass = mentor.userId === user.uid && (interview.scoredBy ?? interview.interviewerId) === user.uid &&
      interview.recommendation === 'INTENDED'
    if (!submittedByMentor && !invitedByMentor && !ownPass) return []
    const student = store.users.find(item => item.id === choice.studentId)
    if (!student) return []
    return [{
      studentId: student.id, studentName: student.realName, studentNumber: student.studentNumber,
      labTeacherId: mentor.id, labTeacherName: mentor.name, interview,
      source: invitedByMentor ? 'INVITATION' : mentor.userId === user.uid ? 'LEADER' : 'TEACHER',
      suggestedType: invitedByMentor ? 'INTENDED' : submittedByMentor ? suggestion.type : 'INTENDED',
      reason: invitedByMentor ? invitation.reason || '面试通过' : submittedByMentor ? suggestion.reason : interview.evaluation,
      submittedAt: invitedByMentor ? invitation.createdAt : submittedByMentor ? suggestion.submittedAt : interview.scoredAt,
      resume: resumeView((store.applicationResumes || []).find(record =>
        record.batchId === batchId && record.studentId === student.id && record.submittedAt))
    }]
  }).sort((a, b) => surnameOrder.compare(a.labTeacherName, b.labTeacherName) ||
    surnameOrder.compare(a.studentName, b.studentName))
}

router.get('/lab-candidates', requireAuth, requireRole(ROLES.LAB_LEADER), handler(req => {
  const store = getStore()
  const batch = currentBatch(store)
  const labId = Number(req.user.laboratoryId)
  if (!batch || !labId) return []
  return labCandidates(store, batch.id, req.user, labId)
}))

router.get('/lab-students', requireAuth, requireRole(ROLES.LAB_LEADER), handler(req => {
  const store = getStore()
  const batch = currentBatch(store)
  const labId = req.user.laboratoryId
  if (!labId) return []
  const choices = store.studentPreferences.filter(item => item.batchId === batch?.id &&
    item.laboratoryId === labId && item.status === 'SUBMITTED')
  const localInterviews = new Map(selection.latestInterviews(store).filter(item => item.batchId === batch?.id && item.laboratoryId === labId)
    .map(item => [item.studentId, item]))
  const localInvitations = new Map(store.admissionIntentions.filter(item => item.batchId === batch?.id &&
    item.laboratoryId === labId && item.admissionType === 'INTENDED').map(item => [item.studentId, item]))
  const mentors = store.labTeachers.filter(mentor => mentor.laboratoryId === labId &&
    (mentor.status !== 'INACTIVE' || choices.some(choice => choice.labTeacherId === mentor.id)))
  const groups = mentors.map(mentor => ({
      key: `mentor-${mentor.id}`,
      mentorId: mentor.id,
      teacherName: store.users.find(user => user.id === mentor.userId)?.realName || mentor.name,
      students: choices.filter(choice => choice.labTeacherId === mentor.id).flatMap(choice => {
        const student = store.users.find(user => user.id === choice.studentId)
        if (!student) return []
        const interview = localInterviews.get(student.id)
        const invitation = localInvitations.get(student.id)
        const status = invitation?.status === 'PENDING' && !occupiesInvitation(store, invitation) ? 'EXPIRED' : invitation?.status
        return [{ studentId: student.id, studentName: student.realName, studentNumber: student.studentNumber,
          interviewStatus: interview?.interviewStatus, appointmentStatus: selection.appointmentStatus(interview),
          interviewId: interview?.id, direction: mentor.direction, online: Boolean(interview?.onlineRoomName),
          evaluated: selection.mentorEvaluated(store, interview), evaluationSummary: interview && selection.evaluationSummary(store, interview),
          recommendation: interview?.recommendation, invitationStatus: status }]
      }).sort((a, b) => surnameOrder.compare(a.studentName, b.studentName))
    }))
  for (const teacher of store.users) {
    if (teacher.laboratoryId === labId && teacher.status === 'ACTIVE' &&
      [ROLES.LAB_TEACHER, ROLES.LAB_LEADER].includes(teacher.role) && !mentors.some(mentor => mentor.userId === teacher.id)) {
      groups.push({ key: `staff-${teacher.id}`, mentorId: null, teacherName: teacher.realName, students: [] })
    }
  }
  return groups.sort((a, b) => surnameOrder.compare(a.teacherName, b.teacherName) || a.key.localeCompare(b.key))
}))

router.post('/teacher', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER), handler(async req => {
  const ctx = context(req)
  const labId = Number(ctx.user.laboratoryId)
  if (!labId || !stageOpen(ctx.store, ctx.batch.id, 4)) reject('当前不在面试与建议提交阶段')
  const submit = z.boolean().parse(req.body?.submit)
  // 组长的个人建议也只能使用明确选择自己的志愿。
  const entries = selectEntries({ ...ctx, user: personalScope(ctx.user) }, req.body?.entries, labId, submit)
  let row = ctx.rows.find(item => item.kind === 'TEACHER' && item.batchId === ctx.batch.id &&
    item.laboratoryId === labId && item.authorId === ctx.user.uid)
  if (row?.status === 'SUBMITTED') reject('名单已提交，需组长退回后才能编辑')
  if (!row) {
    row = { id: nextId(ctx.rows), batchId: ctx.batch.id, laboratoryId: labId, kind: 'TEACHER', authorId: ctx.user.uid, version: 0 }
    ctx.rows.push(row)
  }
  Object.assign(row, { entries, status: submit ? 'SUBMITTED' : 'DRAFT', returnReason: null })
  if (submit) { row.version++; row.submittedAt = new Date().toISOString() }
  return save(ctx, req, row, submit ? 'SUBMIT_TEACHER_LIST' : 'SAVE_TEACHER_DRAFT')
}))

router.post('/teacher/:id/return', requireAuth, requireRole(ROLES.LAB_LEADER), handler(async req => {
  const ctx = context(req)
  const row = findReview(ctx, req.params.id, 'TEACHER')
  if (!canAccessLab(req, row.laboratoryId)) reject('无权处理其他实训室名单', 403)
  if (row.status !== 'SUBMITTED') reject('只能退回已提交名单')
  if (ctx.rows.some(item => item.batchId === ctx.batch.id && item.laboratoryId === row.laboratoryId &&
    item.kind === 'LAB' && ['SUBMITTED', 'APPROVED'].includes(item.status))) reject('本室名单已经报送学院')
  row.returnReason = noteSchema.parse(req.body?.reason)
  row.status = 'RETURNED'
  return save(ctx, req, row, 'RETURN_TEACHER_LIST')
}))

router.post('/lab', requireAuth, requireRole(ROLES.LAB_LEADER), handler(async req => {
  const ctx = context(req)
  const labId = Number(ctx.user.laboratoryId)
  if (!labId || ![4, 5].some(stage => stageOpen(ctx.store, ctx.batch.id, stage))) reject('当前不在名单提交阶段')
  const last = ctx.rows.filter(row => row.kind === 'LAB' && row.batchId === ctx.batch.id && row.laboratoryId === labId)
    .sort((a, b) => b.version - a.version)[0]
  if (last && last.status !== 'RETURNED') reject('本室已有等待审核或已审核的名单')
  const entries = selectEntries(ctx, req.body?.entries, labId)
  const candidates = new Map(labCandidates(ctx.store, ctx.batch.id, ctx.user, labId).map(item => [item.studentId, item]))
  if (entries.some(item => !candidates.has(item.studentId))) reject('名单须来自教师已发邀请、已提交建议或组长本人面试通过的学生')
  if (entries.some(item => candidates.get(item.studentId).source === 'INVITATION' && item.type !== 'INTENDED')) {
    reject('已发出的入组邀请只能以拟录取报送')
  }
  const row = { id: nextId(ctx.rows), batchId: ctx.batch.id, laboratoryId: labId,
    kind: 'LAB', authorId: ctx.user.uid, entries,
    version: (last?.version || 0) + 1, status: 'SUBMITTED', submittedAt: new Date().toISOString() }
  ctx.rows.push(row)
  return save(ctx, req, row, 'SUBMIT_LAB_LIST')
}))

router.post('/lab/:id/review', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), handler(async req => {
  const ctx = context(req)
  const row = findReview(ctx, req.params.id, 'LAB')
  if (row.status !== 'SUBMITTED') reject('该版本已经处理')
  if (!z.boolean().parse(req.body?.approve)) {
    row.status = 'RETURNED'
    row.returnReason = noteSchema.parse(req.body?.reason)
    return save(ctx, req, row, 'RETURN_LAB_LIST')
  }
  if (!stageOpen(ctx.store, ctx.batch.id, 5)) reject('仅在拟录取确认阶段发布学生通知')
  const lab = ctx.store.laboratories.find(item => item.id === row.laboratoryId)
  if (!lab || lab.status !== 'ACTIVE') reject('实训室当前不可用')
  const stage = ctx.store.recruitmentStages.find(item => item.batchId === ctx.batch.id && item.stageNumber === 5)
  for (const item of selectEntries(ctx, row.entries, lab.id)) {
    const active = ctx.store.admissionIntentions.filter(record => record.batchId === ctx.batch.id && occupiesInvitation(ctx.store, record))
    const existing = ctx.store.admissionIntentions.find(record => record.batchId === ctx.batch.id &&
      record.laboratoryId === lab.id && record.studentId === item.studentId)
    if (existing) {
      if (existing.source === 'TEACHER_INVITATION' && existing.labTeacherId === item.labTeacherId && item.type === 'INTENDED') continue
      reject('名单与已有录取记录重复')
    }
    if (active.some(record => record.studentId === item.studentId && record.status === 'CONFIRMED')) reject('名单中有学生已确认其他拟录取')
    if (item.type === 'INTENDED') {
      const error = mentorCapacityError(ctx.store, ctx.batch.id, item.labTeacherId, item.studentId)
      if (error) reject(error)
      if (occupiedAdmissionStudents(ctx.store, ctx.batch.id, { laboratoryId: lab.id }).size >= labCapacity(ctx.store, ctx.batch.id, lab)) reject('实训室拟录取名额不足')
    }
    const now = new Date().toISOString()
    ctx.store.admissionIntentions.push({ id: nextId(ctx.store.admissionIntentions), batchId: ctx.batch.id,
      laboratoryId: lab.id, studentId: item.studentId, labTeacherId: item.labTeacherId, reason: item.reason,
      admissionType: item.type, status: 'PENDING', createdAt: now, confirmationDeadline: stage.endTime || null })
    if (item.type === 'INTENDED') ctx.store.notices.push({ id: nextId(ctx.store.notices), targetUserId: item.studentId,
      targetRole: 'STUDENT', title: `${lab.name} · 拟录取通知`, content: '请在截止前前往拟录取确认页面处理。',
      read: false, createdBy: ctx.user.uid, createdAt: now })
  }
  row.status = 'APPROVED'
  row.reviewedAt = new Date().toISOString()
  return save(ctx, req, row, 'PUBLISH_LAB_LIST')
}))

router.post('/internal', requireAuth, requireRole(ROLES.LAB_LEADER), handler(async req => {
  const ctx = context(req)
  const labId = Number(ctx.user.laboratoryId)
  const stageStatus = stageOf(ctx.store, ctx.batch.id, 6)?.stageStatus
  if (!labId || stageStatus !== 'COMPLETED') reject('内部调剂结束后才能提交最终情况')
  const adjustments = ctx.store.adjustments.filter(item => item.batchId === ctx.batch.id &&
    item.targetLaboratoryId === labId && item.adjustmentType === 'INTERNAL')
  const expiredAt = new Date().toISOString()
  for (const item of adjustments.filter(record => record.status === 'PENDING')) {
    item.status = 'REJECTED'
    item.expiredAt = expiredAt
    logOperation(ctx.store, req, { operationType: 'EXPIRE_INTERNAL_ADJUSTMENT', targetType: 'ADJUSTMENT',
      targetId: item.id, description: '内部调剂阶段结束，未确认的通知已失效' })
  }
  const previous = ctx.rows.filter(item => item.kind === 'INTERNAL' && item.batchId === ctx.batch.id && item.laboratoryId === labId)
  if (previous.some(item => ['SUBMITTED', 'APPROVED'].includes(item.status))) reject('已有待处理或已通过的版本')
  const row = { id: nextId(ctx.rows), batchId: ctx.batch.id, laboratoryId: labId, kind: 'INTERNAL',
    authorId: ctx.user.uid, adjustments, version: previous.length + 1, status: 'SUBMITTED', submittedAt: new Date().toISOString() }
  ctx.rows.push(row)
  return save(ctx, req, row, 'SUBMIT_INTERNAL_LIST')
}))

router.post('/internal/:id/review', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), handler(async req => {
  const ctx = context(req)
  const row = findReview(ctx, req.params.id, 'INTERNAL')
  if (row.status !== 'SUBMITTED') reject('该版本已经处理')
  const approve = z.boolean().parse(req.body?.approve)
  row.status = approve ? 'APPROVED' : 'RETURNED'
  if (!approve) row.returnReason = noteSchema.parse(req.body?.reason)
  row.reviewedAt = new Date().toISOString()
  return save(ctx, req, row, 'REVIEW_INTERNAL_LIST')
}))

module.exports = router
