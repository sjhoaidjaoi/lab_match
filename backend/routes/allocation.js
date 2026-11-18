// ============ 剩余名额 / 多轮补录 / 全院调剂池 ============
// GET  /api/allocation/surplus            各实训室剩余名额（学院、学生、组长可读）
// GET  /api/allocation/rounds             轮次状态
// POST /api/allocation/rounds/open        学院开启下一轮补录
// POST /api/allocation/rounds/:round/close 学院结束某一轮
// GET  /api/allocation/pool               全院调剂池：未录取学生 + 三级优先级候选
// POST /api/allocation/pool/confirm       学院逐条确认调剂
// GET  /api/allocation/my-supplement      学生：当前轮剩余名额与本人状态
// POST /api/allocation/supplement         学生：提交本轮补录志愿

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, commitStore, nextId } = require('../data/seed')
const { logOperation } = require('../utils/audit')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { asyncMutation } = require('./interviewWorkspace')
const { currentBatch, batchWritableError } = require('../utils/recruitment')
const { mentorCapacityError } = require('../utils/mentorCapacity')
// 名额口径只有一处实现：utils/labQuota.js（E宝 助手的事实快照也读它）
const { labName, labBreakdown, labSurplus } = require('../utils/labQuota')
const rounds = require('../utils/rounds')
const { collectConfirmed, confirmedCountByLab, syncFinalAdmissions } = require('../utils/finalSync')

const PRIORITY = { INTERNAL: 1, CROSS_LAB: 2, PLACEMENT: 3 }
const PRIORITY_LABELS = { 1: '实训室内部调剂', 2: '全院跨实训室调剂', 3: '未服从调剂学生安置' }

function activeBatchOf(store) {
  return currentBatch(store)
}

// ---- 剩余名额 ----
router.get('/surplus', requireAuth, (_req, res) => {
  const store = getStore()
  const batch = activeBatchOf(store)
  if (!batch) return res.json(ok({ batchId: null, labs: [], totals: { plan: 0, admitted: 0, pending: 0, remaining: 0 } }))
  const data = labSurplus(store, batch)
  res.json(ok({ batchId: batch.id, batchName: batch.batchName, round: rounds.roundView(store, batch.id), ...data }))
})

// ---- 轮次 ----
router.get('/rounds', requireAuth, (_req, res) => {
  const store = getStore()
  const batch = activeBatchOf(store)
  if (!batch) return res.json(ok(rounds.roundView(store, null)))
  res.json(ok(rounds.roundView(store, batch.id)))
})

router.post('/rounds/open', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = z.object({ round: z.number().int().min(1).max(3).optional() }).parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })
  const result = rounds.openRound(store, batch.id, body.round, req.user.uid)
  if (result.error) return res.status(409).json({ code: 'BUSINESS_ERROR', message: result.error, data: null })
  logOperation(store, req, {
    operationType: 'OPEN_ROUND', targetType: 'BATCH', targetId: batch.id,
    description: `开启第 ${result.round} 轮（补录）报名`
  })
  await commitStore(store)
  res.json(ok(rounds.roundView(store, batch.id)))
}))

router.post('/rounds/:round/close', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  const result = rounds.closeRound(store, batch.id, req.params.round, req.user.uid)
  if (result.error) return res.status(409).json({ code: 'BUSINESS_ERROR', message: result.error, data: null })
  logOperation(store, req, {
    operationType: 'CLOSE_ROUND', targetType: 'BATCH', targetId: batch.id,
    description: `结束第 ${result.round} 轮录取`
  })
  await commitStore(store)
  res.json(ok(rounds.roundView(store, batch.id)))
}))

// ---- 全院调剂池 ----
function poolCandidates(store, batch) {
  const surplus = labSurplus(store, batch)
  const stats = new Map(surplus.labs.map((lab) => [lab.id, lab]))
  const { confirmed } = collectConfirmed(store, batch.id)
  const placed = new Set(confirmed.keys())

  const prefs = (store.studentPreferences || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && row.status === 'SUBMITTED')
  const byStudent = new Map()
  prefs.forEach((row) => {
    if (!byStudent.has(row.studentId)) byStudent.set(row.studentId, [])
    byStudent.get(row.studentId).push(row)
  })

  const rows = []
  byStudent.forEach((choices, studentId) => {
    if (placed.has(studentId)) return
    const student = (store.users || []).find((user) => user.id === studentId)
    const obeyCollege = choices.some((row) => row.obeyCollegeAdjustment)
    const obeyInternal = choices.some((row) => row.obeyInternalAdjustment)

    // 第一优先级：本人志愿室内仍有剩余名额，且该室已对其完成面试
    const openOwn = choices.filter((row) => (stats.get(Number(row.laboratoryId))?.remaining || 0) > 0)
    const interviewed = openOwn.find((row) => (store.interviews || []).some((item) =>
      Number(item.batchId) === Number(batch.id) && Number(item.studentId) === Number(studentId) &&
      Number(item.laboratoryId) === Number(row.laboratoryId) &&
      ['COMPLETED', 'PASSED'].includes(item.interviewStatus || '')))
    // 第二优先级：服从全院调剂，指向剩余名额最多的实训室
    const crossTarget = [...stats.values()].filter((lab) => lab.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)[0]

    let priority = 3
    let target = null
    let reason = '学生未填报服从调剂意愿，需学院人工安置'
    if (interviewed) {
      priority = 1
      target = stats.get(Number(interviewed.laboratoryId))
      reason = '已在本室完成面试且本室仍有余量，优先内部调剂'
    } else if (obeyCollege && crossTarget) {
      priority = 2
      target = crossTarget
      reason = '服从全院调剂，可跨实训室安排到有余量的实训室'
    } else if (!obeyCollege && !obeyInternal) {
      priority = 3
      reason = '两项调剂意愿均未服从，需学院人工安置'
    } else if (openOwn.length) {
      priority = 2
      target = stats.get(Number(openOwn[0].laboratoryId))
      reason = '志愿实训室仍有剩余名额'
    }

    rows.push({
      studentId,
      studentName: student?.realName || '',
      studentNumber: student?.studentNumber || '',
      priority,
      priorityLabel: PRIORITY_LABELS[priority],
      obeyInternalAdjustment: obeyInternal,
      obeyCollegeAdjustment: obeyCollege,
      preferredLabs: choices.map((row) => ({
        laboratoryId: row.laboratoryId, laboratoryName: labName(stats.get(Number(row.laboratoryId))) ||
          labName((store.laboratories || []).find((lab) => lab.id === row.laboratoryId))
      })),
      suggestedLaboratoryId: target?.id ?? null,
      suggestedLaboratoryName: target?.name ?? '',
      suggestedLabTeacherId: null,
      reason
    })
  })

  rows.sort((a, b) => a.priority - b.priority || a.studentNumber.localeCompare(b.studentNumber))
  return { surplus, rows }
}

router.get('/pool', requireAuth, requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_LEADER), (req, res) => {
  const store = getStore()
  const batch = activeBatchOf(store)
  if (!batch) return res.json(ok({ rows: [], summary: { pending: 0, internal: 0, cross: 0, placement: 0, remaining: 0 } }))
  const { surplus, rows } = poolCandidates(store, batch)
  if (req.user.activeRole === ROLES.LAB_LEADER) {
    const own = Number(req.user.laboratoryId)
    return res.json(ok({
      rows: rows.filter((row) => row.suggestedLaboratoryId === own),
      summary: { pending: rows.length, internal: 0, cross: 0, placement: 0, remaining: 0 },
      surplus: surplus.labs.find((lab) => lab.id === own) || null
    }))
  }
  res.json(ok({
    rows,
    summary: {
      pending: rows.length,
      internal: rows.filter((row) => row.priority === 1).length,
      cross: rows.filter((row) => row.priority === 2).length,
      placement: rows.filter((row) => row.priority === 3).length,
      remaining: surplus.totals.remaining
    },
    surplus
  }))
})

const ConfirmSchema = z.object({
  studentId: z.number().int().positive(),
  targetLaboratoryId: z.number().int().positive(),
  targetLabTeacherId: z.number().int().positive().nullable().optional(),
  reason: z.string().trim().max(240).optional()
})

router.post('/pool/confirm', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), asyncMutation(async (req, res) => {
  const body = ConfirmSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })

  const lab = (store.laboratories || []).find((item) => Number(item.id) === Number(body.targetLaboratoryId))
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '目标实训室不存在', data: null })

  const { confirmed } = collectConfirmed(store, batch.id)
  if (confirmed.has(body.studentId)) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: '该学生已有确认的录取去向', data: null })
  }
  const stats = labBreakdown(store, batch.id, lab)
  if (stats.remaining <= 0) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: `「${labName(lab)}」已无剩余名额`, data: null })
  }
  if (body.targetLabTeacherId) {
    const teacherError = mentorCapacityError(store, batch.id, body.targetLabTeacherId, body.studentId)
    if (teacherError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: teacherError, data: null })
    const teacher = (store.labTeachers || []).find((item) => Number(item.id) === Number(body.targetLabTeacherId))
    if (!teacher || Number(teacher.laboratoryId) !== Number(lab.id)) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: '所选导师不属于该实训室', data: null })
    }
  }

  const preference = (store.studentPreferences || []).find((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.studentId) === Number(body.studentId) &&
    Number(row.laboratoryId) === Number(lab.id))
  const sameLab = Boolean(preference)
  const item = {
    id: nextId(store.adjustments),
    batchId: batch.id,
    studentId: body.studentId,
    sourceLaboratoryId: preference?.laboratoryId ?? null,
    sourceLabTeacherId: preference?.labTeacherId ?? null,
    targetLaboratoryId: lab.id,
    targetLabTeacherId: body.targetLabTeacherId ?? preference?.labTeacherId ?? null,
    adjustmentType: sameLab ? 'INTERNAL' : 'CROSS_LAB',
    round: rounds.currentRoundOf(store, batch.id),
    reason: body.reason || '全院调剂池统筹安排',
    operatorId: req.user.uid,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  }
  store.adjustments.push(item)
  store.notices = store.notices || []
  store.notices.push({
    id: nextId(store.notices), targetRole: 'STUDENT', targetUserId: item.studentId,
    title: '调剂结果通知',
    content: `你已被调剂至「${labName(lab)}」，请前往「我的录取结果」查看。`,
    read: false, createdBy: req.user.uid, createdAt: item.createdAt
  })
  const sync = syncFinalAdmissions(store, batch.id, { strict: false })
  logOperation(store, req, {
    operationType: 'ALLOCATION_POOL_CONFIRM', targetType: 'ADJUSTMENT', targetId: item.id,
    description: `调剂池确认：学生#${item.studentId} → 实训室#${lab.id}，同步最终名单 ${sync.merged} 人`
  })
  await commitStore(store)
  res.json(ok({ adjustment: item, synced: sync.merged }))
}))

// ---- 学生端补录志愿 ----
router.get('/my-supplement', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const batch = activeBatchOf(store)
  if (!batch) return res.json(ok({ round: null, placed: false, labs: [], choices: [] }))
  const { confirmed } = collectConfirmed(store, batch.id)
  const view = rounds.roundView(store, batch.id)
  const surplus = labSurplus(store, batch)
  const placedInfo = confirmed.get(req.user.uid)
  const choices = (store.studentPreferences || [])
    .filter((row) => Number(row.batchId) === Number(batch.id) && Number(row.studentId) === Number(req.user.uid))
    .map((row) => ({
      id: row.id, round: rounds.roundOf(row), laboratoryId: row.laboratoryId,
      laboratoryName: labName((store.laboratories || []).find((lab) => lab.id === row.laboratoryId)),
      labTeacherId: row.labTeacherId, status: row.status, submittedAt: row.submittedAt
    }))
  res.json(ok({
    round: view,
    placed: Boolean(placedInfo),
    placedLaboratoryName: placedInfo ? labName((store.laboratories || []).find((lab) => lab.id === placedInfo.laboratoryId)) : '',
    labs: surplus.labs.map((lab) => ({
      id: lab.id, name: lab.name, labCode: lab.labCode,
      college: lab.college, researchDirection: lab.researchDirection,
      plan: lab.plan, remaining: lab.remaining,
      teachers: lab.teachers.filter((teacher) => teacher.remaining === null || teacher.remaining > 0)
    })),
    choices
  }))
})

const SupplementSchema = z.object({
  choices: z.array(z.object({
    laboratoryId: z.number().int().positive(),
    labTeacherId: z.number().int().positive()
  })).min(1).max(3),
  obeyInternalAdjustment: z.boolean(),
  obeyCollegeAdjustment: z.boolean()
})

router.post('/supplement', requireAuth, requireRole(ROLES.STUDENT), asyncMutation(async (req, res) => {
  const body = SupplementSchema.parse(req.body || {})
  const store = structuredClone(getStore())
  const batch = activeBatchOf(store)
  if (!batch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '没有活跃批次', data: null })
  const stopError = batchWritableError(batch)
  if (stopError) return res.status(409).json({ code: 'BUSINESS_ERROR', message: stopError, data: null })

  const openRound = rounds.openRoundOf(store, batch.id)
  if (!openRound || openRound.round < 2) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: '当前没有开放补录轮次', data: null })
  }
  const { confirmed } = collectConfirmed(store, batch.id)
  if (confirmed.has(req.user.uid)) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: '你已被录取，无需再填报补录志愿', data: null })
  }
  if ((store.studentPreferences || []).some((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.studentId) === Number(req.user.uid) &&
    row.status === 'SUBMITTED' && rounds.roundOf(row) === openRound.round)) {
    return res.status(409).json({ code: 'BUSINESS_ERROR', message: '本轮补录志愿已提交，不能重复提交', data: null })
  }

  const unique = new Set(body.choices.map((choice) => choice.laboratoryId))
  if (unique.size !== body.choices.length) {
    return res.status(400).json({ code: 'VALIDATION_FAILED', message: '不允许重复填报同一个实训室', data: null })
  }

  const surplus = labSurplus(store, batch)
  const stats = new Map(surplus.labs.map((lab) => [lab.id, lab]))
  for (const choice of body.choices) {
    const lab = stats.get(choice.laboratoryId)
    if (!lab) return res.status(400).json({ code: 'VALIDATION_FAILED', message: '实训室不存在或已停用', data: null })
    if (lab.remaining <= 0) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: `「${lab.name}」已无剩余名额`, data: null })
    }
    const teacher = lab.teachers.find((item) => Number(item.id) === Number(choice.labTeacherId))
    if (!teacher) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请选择该实训室内的指导教师', data: null })
    }
    if (teacher.remaining !== null && teacher.remaining <= 0) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: `「${teacher.name}」的导师招生名额已满`, data: null })
    }
  }

  const submittedAt = new Date().toISOString()
  body.choices.forEach(({ laboratoryId, labTeacherId }) => {
    const preferenceId = nextId(store.studentPreferences)
    store.studentPreferences.push({
      id: preferenceId,
      batchId: batch.id, round: openRound.round,
      studentId: req.user.uid, laboratoryId, labTeacherId,
      obeyInternalAdjustment: body.obeyInternalAdjustment,
      obeyCollegeAdjustment: body.obeyCollegeAdjustment,
      submittedAt, status: 'SUBMITTED'
    })
    const exists = (store.interviews || []).some((item) =>
      Number(item.batchId) === Number(batch.id) && Number(item.studentId) === Number(req.user.uid) &&
      Number(item.laboratoryId) === Number(laboratoryId) && rounds.roundOf(item) === openRound.round)
    if (!exists) {
      const mentor = (store.labTeachers || []).find((item) => Number(item.id) === Number(labTeacherId))
      store.interviews.push({
        id: nextId(store.interviews),
        batchId: batch.id, round: openRound.round,
        studentId: req.user.uid, laboratoryId,
        preferenceId, attemptNo: 1,
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

  logOperation(store, req, {
    operationType: 'SUBMIT_SUPPLEMENT', targetType: 'BATCH', targetId: batch.id,
    description: `提交第 ${openRound.round} 轮补录志愿，共 ${body.choices.length} 个`
  })
  await commitStore(store, { batchId: batch.id, studentId: req.user.uid, submittedAt })
  res.json(ok({ round: openRound.round, count: unique.size }))
}))

module.exports = router
