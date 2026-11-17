const { ownsChoice, scopedChoice } = require('../utils/applicationScope')
const { latestInterviews } = require('../services/interviewSelection')
// ============ 学院端统计（文档 6.6 学院负责人首页 + 第七/八阶段） ============
// GET /api/statistics/college    全院数据总览
// GET /api/statistics/capacity   各实训室名额与空缺
// GET /api/statistics/unplaced   尚未落实去向的学生（第三优先级安置）

const express = require('express')
const router = express.Router()
const { ok } = require('../utils/result')
const { getStore, ADMISSION_TYPE, ADJUSTMENT_TYPE } = require('../data/seed')
const { requireAuth, requireRole, ROLES, guardLab } = require('../middleware/auth')
const {
  currentBatch: resolveCurrentBatch,
  batchStages: resolveBatchStages,
  resolveCurrentStage,
  stageOf,
  isBatchStopped
} = require('../utils/recruitment')

function activeBatch(store) {
  return resolveCurrentBatch(store)
}

function batchStages(store, batchId) {
  return resolveBatchStages(store, batchId)
}

function currentStage(stages) {
  const current = resolveCurrentStage(stages)
  return { stages, current }
}

// 学院端待办：只统计"确实需要学院负责人处理"的事项
function collegeTodos(store, batch) {
  if (!batch) return []
  const todos = []
  const adjustments = store.adjustments.filter((a) => a.batchId === batch.id)
  const pendingCross = adjustments.filter(
    (a) => a.status === 'PENDING' && [ADJUSTMENT_TYPE.CROSS_LAB, ADJUSTMENT_TYPE.MANUAL_PLACEMENT].includes(a.adjustmentType)
  ).length
  if (pendingCross > 0) {
    todos.push({
      key: 'CROSS_ADJUSTMENT',
      title: '待审核跨实训室调剂',
      count: pendingCross,
      desc: '有学生申请跨实训室调剂或沟通安置，需学院统筹确认',
      path: '/college/allocation/cross',
      level: 'warning'
    })
  }

  const admitted = store.finalAdmissions.filter((f) => f.batchId === batch.id && f.finalStatus !== 'REJECTED')
  const review = store.finalReview && store.finalReview.batchId === batch.id ? store.finalReview : null
  const reviewApproved = review?.status === 'APPROVED'
  if (admitted.length > 0 && !reviewApproved) {
    todos.push({
      key: 'FINAL_REVIEW',
      title: '待审核最终录取名单',
      count: admitted.length,
      desc: review?.status === 'REJECTED' ? '最终名单已被驳回，请调整后重新提交审核' : '最终名单已生成，需学院审核通过后才能公示',
      path: '/college/final-list',
      level: review?.status === 'REJECTED' ? 'danger' : 'warning'
    })
  }

  const pendingObjections = (store.publicationObjections || []).filter(
    (o) => o.batchId === batch.id && o.status === 'PENDING'
  ).length
  if (pendingObjections > 0) {
    todos.push({
      key: 'OBJECTION',
      title: '待处理公示异议',
      count: pendingObjections,
      desc: '公示期间学生提出异议，需学院核实并答复',
      path: '/college/publicity',
      level: 'danger'
    })
  }

  if (reviewApproved) {
    const pub = store.publication && store.publication.batchId === batch.id ? store.publication : null
    if (!pub) {
      todos.push({
        key: 'PUBLICITY',
        title: '待发布录取结果公示',
        count: 1,
        desc: '最终名单已审核通过，请设置公示时间并发布',
        path: '/college/publicity',
        level: 'info'
      })
    } else if (pub.endAt && Date.parse(pub.endAt) <= Date.now() && admitted.some((f) => f.finalStatus === 'ADMITTED')) {
      todos.push({
        key: 'ENROLL',
        title: '待确认正式入组',
        count: admitted.filter((f) => f.finalStatus === 'ADMITTED').length,
        desc: '公示已结束，可批量确认正式入组',
        path: '/college/final-list',
        level: 'success'
      })
    }
  }

  // 第七阶段开始后仍有学生未落实去向
  const stage7 = stageOf(store, batch.id, 7)?.stageStatus
  if (stage7 === 'IN_PROGRESS' || stage7 === 'COMPLETED') {
    const placed = new Set()
    store.finalAdmissions
      .filter((f) => f.batchId === batch.id && f.finalStatus !== 'REJECTED')
      .forEach((f) => placed.add(f.studentId))
    adjustments.filter((a) => a.status === 'CONFIRMED').forEach((a) => placed.add(a.studentId))
    store.admissionIntentions
      .filter((a) => a.batchId === batch.id && a.status === 'CONFIRMED')
      .forEach((a) => placed.add(a.studentId))
    const submitted = new Set(
      store.studentPreferences
        .filter((p) => p.batchId === batch.id && p.status === 'SUBMITTED')
        .map((p) => p.studentId)
    )
    const unplaced = [...submitted].filter((id) => !placed.has(id)).length
    if (unplaced > 0) {
      todos.push({
        key: 'UNPLACED',
        title: '待沟通安置学生',
        count: unplaced,
        desc: '已填报志愿但尚未落实实训室，需学院统筹安置',
        path: '/college/allocation/placement',
        level: 'info'
      })
    }
  }
  return todos
}

// 各实训室容量与录取情况
function capacityRows(store, batchId) {
  return store.laboratories.map((lab) => {
    const intended = store.admissionIntentions.filter(
      (a) => a.batchId === batchId && a.laboratoryId === lab.id && a.admissionType === ADMISSION_TYPE.INTENDED
    )
    const confirmed = intended.filter((a) => a.status === 'CONFIRMED').length
    const admitted = store.finalAdmissions.filter(
      (f) => f.batchId === batchId && f.laboratoryId === lab.id && f.finalStatus !== 'REJECTED'
    ).length
    return {
      laboratoryId: lab.id,
      laboratoryName: lab.name,
      leaderId: lab.leaderId,
      quota: lab.recruitmentQuota,
      intended: intended.length,
      confirmed,
      admitted,
      // 计划名额优先，已产生最终名单时以最终名单计算剩余
      remaining: Math.max(lab.recruitmentQuota - (admitted || confirmed), 0)
    }
  })
}

router.get('/college', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const batch = activeBatch(store)
  // 全院三指标：有效学生 / 有效实训室教师 / 有效实训室（组长与学院管理员不计入教师数）
  const overview = {
    students: store.users.filter((u) => u.role === ROLES.STUDENT && u.status === 'ACTIVE').length,
    teachers: store.users.filter((u) => u.role === ROLES.LAB_TEACHER && u.status === 'ACTIVE').length,
    laboratories: store.laboratories.filter((l) => !l.status || l.status === 'ACTIVE').length
  }
  if (!batch) {
    return res.json(ok({
      batch: null, currentStage: null, overview, todos: [],
      stages: [], perLab: [], totals: { quota: 0, admitted: 0, remaining: 0 },
      students: { total: overview.students, submitted: 0, unsubmitted: overview.students },
      adjustments: { INTERNAL: 0, CROSS_LAB: 0, MANUAL_PLACEMENT: 0, confirmed: 0 },
      lists: { intended: 0, confirmed: 0, rejected: 0, alternate: 0 }
    }))
  }

  const students = store.users.filter((u) => u.role === ROLES.STUDENT && u.status === 'ACTIVE')
  const prefs = store.studentPreferences.filter((p) => p.batchId === batch.id && p.status === 'SUBMITTED')
  const submittedIds = new Set(prefs.map((p) => p.studentId))

  const interviews = latestInterviews(store).filter((i) => i.batchId === batch.id)
  const intentions = store.admissionIntentions.filter((a) => a.batchId === batch.id)

  const perLab = store.laboratories.map((lab) => {
    const labInterviews = interviews.filter((i) => i.laboratoryId === lab.id)
    const labIntended = intentions.filter(
      (a) => a.laboratoryId === lab.id && a.admissionType === ADMISSION_TYPE.INTENDED
    )
    const labAlternate = intentions.filter(
      (a) => a.laboratoryId === lab.id && a.admissionType === ADMISSION_TYPE.ALTERNATE
    )
    const admitted = store.finalAdmissions.filter(
      (f) => f.batchId === batch.id && f.laboratoryId === lab.id && f.finalStatus !== 'REJECTED'
    ).length
    const confirmed = labIntended.filter((a) => a.status === 'CONFIRMED').length
    return {
      laboratoryId: lab.id,
      laboratoryName: lab.name,
      quota: lab.recruitmentQuota,
      applicationCount: prefs.filter((p) => p.laboratoryId === lab.id).length,
      interviewScheduled: labInterviews.filter((i) => i.interviewStatus === 'SCHEDULED').length,
      interviewCompleted: labInterviews.filter((i) => i.interviewStatus === 'COMPLETED').length,
      intended: labIntended.length,
      alternate: labAlternate.length,
      confirmed,
      rejected: labIntended.filter((a) => a.status === 'REJECTED').length,
      admitted,
      remaining: Math.max(lab.recruitmentQuota - (admitted || confirmed), 0)
    }
  })

  const adjustments = store.adjustments.filter((a) => a.batchId === batch.id)
  const { stages, current } = currentStage(batchStages(store, batch.id))
  const totalQuota = perLab.reduce((sum, l) => sum + l.quota, 0)
  const totalAdmitted = perLab.reduce((sum, l) => sum + l.admitted, 0)

  res.json(ok({
    batch: {
      id: batch.id, batchName: batch.batchName, academicYear: batch.academicYear,
      status: batch.status, description: batch.description,
      stoppedAt: batch.stoppedAt ?? null, stopReason: batch.stopReason ?? null,
      writable: !isBatchStopped(batch)
    },
    overview,
    todos: collegeTodos(store, batch),
    stages,
    currentStage: current ? {
      id: current.id, stageNumber: current.stageNumber, stageName: current.stageName,
      stageKey: current.stageKey, stageStatus: current.stageStatus,
      startTime: current.startTime, endTime: current.endTime
    } : null,
    students: { total: students.length, submitted: submittedIds.size, unsubmitted: Math.max(students.length - submittedIds.size, 0) },
    perLab,
    totals: { quota: totalQuota, admitted: totalAdmitted, remaining: Math.max(totalQuota - totalAdmitted, 0) },
    adjustments: {
      INTERNAL: adjustments.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.INTERNAL).length,
      CROSS_LAB: adjustments.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.CROSS_LAB).length,
      MANUAL_PLACEMENT: adjustments.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.MANUAL_PLACEMENT).length,
      confirmed: adjustments.filter((a) => a.status === 'CONFIRMED').length
    },
    lists: {
      intended: intentions.filter((a) => a.admissionType === ADMISSION_TYPE.INTENDED).length,
      alternate: intentions.filter((a) => a.admissionType === ADMISSION_TYPE.ALTERNATE).length,
      confirmed: intentions.filter((a) => a.status === 'CONFIRMED').length,
      rejected: intentions.filter((a) => a.status === 'REJECTED').length
    }
  }))
})

router.get('/capacity', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const batch = activeBatch(store)
  if (!batch) return res.json(ok([]))
  res.json(ok(capacityRows(store, batch.id)))
})

// 已落实去向的学生（最终名单 / 已确认拟录取 / 已确认调剂）
function placedStudentIds(store, batchId) {
  const placedIds = new Set()
  store.finalAdmissions
    .filter((f) => f.batchId === batchId && f.finalStatus !== 'REJECTED')
    .forEach((f) => placedIds.add(f.studentId))
  store.admissionIntentions
    .filter((a) => a.batchId === batchId && a.admissionType === ADMISSION_TYPE.INTENDED && a.status === 'CONFIRMED')
    .forEach((a) => placedIds.add(a.studentId))
  store.adjustments
    .filter((a) => a.batchId === batchId && a.status === 'CONFIRMED')
    .forEach((a) => placedIds.add(a.studentId))
  return placedIds
}

// 尚未落实去向的学生：无有效拟录取确认，也无已确认调剂
router.get('/unplaced', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const batch = activeBatch(store)
  if (!batch) return res.json(ok([]))

  const placedIds = placedStudentIds(store, batch.id)

  const students = store.users.filter((u) => u.role === ROLES.STUDENT && u.status === 'ACTIVE')
  const list = students
    .filter((s) => !placedIds.has(s.id))
    .map((s) => {
      const prefs = store.studentPreferences.filter(
        (p) => p.batchId === batch.id && p.studentId === s.id && p.status === 'SUBMITTED'
      )
      const labNames = prefs
        .map((p) => store.laboratories.find((l) => l.id === p.laboratoryId)?.name || `实训室#${p.laboratoryId}`)
      const interviewList = latestInterviews(store)
        .filter((i) => i.batchId === batch.id && i.studentId === s.id)
        .map((i) => ({
          laboratoryId: i.laboratoryId,
          laboratoryName: store.laboratories.find((l) => l.id === i.laboratoryId)?.name || '',
          interviewStatus: i.interviewStatus,
          comprehensiveScore: i.comprehensiveScore,
          recommendation: i.recommendation
        }))
      const intentions = store.admissionIntentions.filter((a) => a.batchId === batch.id && a.studentId === s.id)
      return {
        studentId: s.id,
        studentName: s.realName,
        studentNumber: s.studentNumber,
        phone: s.phone,
        preferenceLabs: labNames,
        obeyInternalAdjustment: prefs.some((p) => p.obeyInternalAdjustment),
        obeyCollegeAdjustment: prefs.some((p) => p.obeyCollegeAdjustment),
        interviewList,
        admittedIntended: intentions.filter((a) => a.admissionType === ADMISSION_TYPE.INTENDED).length,
        alternateIntended: intentions.filter((a) => a.admissionType === ADMISSION_TYPE.ALTERNATE).length,
        hasPreference: prefs.length > 0
      }
    })
  res.json(ok(list))
})

// 全院递补与调剂候选名单（文档 2.4-17 / 第七阶段-5）
router.get('/candidates', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const batch = activeBatch(store)
  if (!batch) return res.json(ok([]))

  const placedIds = placedStudentIds(store, batch.id)
  const students = store.users.filter((u) => u.role === ROLES.STUDENT && u.status === 'ACTIVE')

  const list = students
    .filter((s) => !placedIds.has(s.id))
    .map((s) => {
      const prefs = store.studentPreferences.filter(
        (p) => p.batchId === batch.id && p.studentId === s.id && p.status === 'SUBMITTED'
      )
      const interviews = latestInterviews(store).filter(
        (i) => i.batchId === batch.id && i.studentId === s.id && i.interviewStatus === 'COMPLETED'
      )
      const scores = interviews.map((i) => i.comprehensiveScore).filter((v) => typeof v === 'number')
      const alternates = store.admissionIntentions.filter(
        (a) => a.batchId === batch.id && a.studentId === s.id && a.admissionType === ADMISSION_TYPE.ALTERNATE
      )
      const adjustments = store.adjustments.filter(
        (a) => a.batchId === batch.id && a.studentId === s.id
      )
      const active = adjustments.find((a) => a.status === 'PENDING') || adjustments[adjustments.length - 1] || null
      const obeyInternal = prefs.some((p) => p.obeyInternalAdjustment)
      const obeyCollege = prefs.some((p) => p.obeyCollegeAdjustment)
      return {
        studentId: s.id,
        studentName: s.realName,
        studentNumber: s.studentNumber,
        phone: s.phone,
        preferenceLabs: prefs.map((p) => store.laboratories.find((l) => l.id === p.laboratoryId)?.name || `实训室#${p.laboratoryId}`),
        alternateLabs: alternates.map((a) => store.laboratories.find((l) => l.id === a.laboratoryId)?.name || ''),
        obeyInternalAdjustment: obeyInternal,
        obeyCollegeAdjustment: obeyCollege,
        interviewCount: interviews.length,
        averageScore: scores.length ? Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 10) / 10 : null,
        adjustment: active ? {
          id: active.id, adjustmentType: active.adjustmentType, status: active.status,
          targetLabName: store.laboratories.find((l) => l.id === active.targetLaboratoryId)?.name || ''
        } : null,
        // 三级调剂优先级：1 内部递补 → 2 跨实训室 → 3 沟通安置
        suggestedPriority: alternates.length > 0 ? 1 : (obeyCollege ? 2 : 3),
        hasPreference: prefs.length > 0
      }
    })
    .sort((a, b) => a.suggestedPriority - b.suggestedPriority || (b.averageScore || 0) - (a.averageScore || 0))

  res.json(ok(list))
})

// 实训室教师/组长工作台统计（仅限本人所属实训室）
router.get('/lab/:labId', requireAuth, requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_TEACHER, ROLES.LAB_LEADER), (req, res) => {
  const store = getStore()
  const batch = activeBatch(store)
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  const labInfo = { id: lab.id, name: lab.name, quota: lab.recruitmentQuota, projectDirection: lab.projectDirection, technologyStack: lab.technologyStack }
  if (!batch) return res.json(ok({
    lab: labInfo, quota: lab.recruitmentQuota, remaining: lab.recruitmentQuota,
    applicationCount: 0, interviewed: 0, pendingInterview: 0, intended: 0, confirmed: 0,
    rejected: 0, admitted: 0, adjustments: { internal: 0, cross: 0, confirmed: 0 },
    vacancyReport: null
  }))

  const prefs = store.studentPreferences.filter(
    (p) => p.batchId === batch.id && p.laboratoryId === labId && p.status === 'SUBMITTED' &&
      (req.user.activeRole !== ROLES.LAB_TEACHER || ownsChoice(store, req.user, p))
  )
  const interviews = latestInterviews(store).filter((i) => i.batchId === batch.id && i.laboratoryId === labId && (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, batch.id, i.studentId, labId)))
  const intentions = store.admissionIntentions.filter(
    (a) => a.batchId === batch.id && a.laboratoryId === labId && (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, batch.id, a.studentId, labId)) && a.admissionType === ADMISSION_TYPE.INTENDED
  )
  const confirmed = intentions.filter((a) => a.status === 'CONFIRMED').length
  const admitted = store.finalAdmissions.filter(
    (f) => f.batchId === batch.id && f.laboratoryId === labId && (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, batch.id, f.studentId, labId)) && f.finalStatus !== 'REJECTED'
  ).length
  const adjustments = store.adjustments.filter(
    (a) => a.batchId === batch.id && (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, batch.id, a.studentId, labId)) && (a.sourceLaboratoryId === labId || a.targetLaboratoryId === labId)
  )
  res.json(ok({
    lab: labInfo,
    quota: lab.recruitmentQuota,
    applicationCount: new Set(prefs.map(item => item.studentId)).size,
    interviewed: interviews.filter((i) => i.interviewStatus === 'COMPLETED').length,
    pendingInterview: interviews.filter((i) => i.interviewStatus === 'SCHEDULED').length,
    intended: intentions.filter((a) => a.status !== 'REJECTED').length,
    confirmed,
    rejected: intentions.filter((a) => a.status === 'REJECTED').length,
    admitted,
    remaining: Math.max(lab.recruitmentQuota - (admitted || confirmed), 0),
    adjustments: {
      internal: adjustments.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.INTERNAL).length,
      cross: adjustments.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.CROSS_LAB).length,
      confirmed: adjustments.filter((a) => a.status === 'CONFIRMED').length
    },
    vacancyReport: lab.vacancyReport || null
  }))
})

// 本室内部调剂候选学生：未确认任何录取、服从内部调剂
router.get('/lab/:labId/candidates', requireAuth, requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_TEACHER, ROLES.LAB_LEADER), (req, res) => {
  const store = getStore()
  const batch = activeBatch(store)
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  if (!batch) return res.json(ok([]))

  const list = store.studentPreferences
    .filter((p) => p.batchId === batch.id && p.laboratoryId === labId && ownsChoice(store, req.user, p))
    .map((p) => {
      const stu = store.users.find((u) => u.id === p.studentId)
      const interview = latestInterviews(store).find(
        (i) => i.batchId === batch.id && i.studentId === p.studentId && i.laboratoryId === labId
      )
      const intention = store.admissionIntentions.find(
        (a) => a.batchId === batch.id && a.studentId === p.studentId && a.laboratoryId === labId
      )
      const confirmedElsewhere = store.admissionIntentions.some(
        (a) => a.batchId === batch.id && a.studentId === p.studentId && a.status === 'CONFIRMED'
      )
      const finalAdmission = store.finalAdmissions.find(
        (f) => f.batchId === batch.id && f.studentId === p.studentId && f.finalStatus !== 'REJECTED'
      )
      const adjustment = store.adjustments.find(
        (a) => a.batchId === batch.id && a.studentId === p.studentId && a.status === 'PENDING'
      )
      const eligible = !confirmedElsewhere && !finalAdmission && !adjustment && p.obeyInternalAdjustment
      return {
        studentId: p.studentId,
        studentName: stu?.realName || '',
        studentNumber: stu?.studentNumber || '',
        phone: stu?.phone || '',
        obeyInternalAdjustment: p.obeyInternalAdjustment,
        obeyCollegeAdjustment: p.obeyCollegeAdjustment,
        interviewStatus: interview?.interviewStatus || null,
        attitudeScore: interview?.attitudeScore ?? null,
        logicScore: interview?.logicScore ?? null,
        programmingScore: interview?.programmingScore ?? null,
        timeCommitmentScore: interview?.timeCommitmentScore ?? null,
        comprehensiveScore: interview?.comprehensiveScore ?? null,
        recommendation: interview?.recommendation || null,
        evaluation: interview?.evaluation || '',
        admissionType: intention?.admissionType || null,
        admissionStatus: intention?.status || null,
        adjustmentStatus: adjustment?.status || null,
        placed: Boolean(confirmedElsewhere || finalAdmission),
        eligible
      }
    })
  res.json(ok(list))
})

module.exports = router
