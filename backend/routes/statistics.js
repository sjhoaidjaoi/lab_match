// ============ 学院端统计（文档 6.6 学院负责人首页 + 第七/八阶段） ============
// GET /api/statistics/college    全院数据总览
// GET /api/statistics/capacity   各实训室名额与空缺
// GET /api/statistics/unplaced   尚未落实去向的学生（第三优先级安置）

const express = require('express')
const router = express.Router()
const { ok } = require('../utils/result')
const { getStore, ADMISSION_TYPE, ADJUSTMENT_TYPE } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

function activeBatch(store) {
  return store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0] || null
}

function batchStages(store, batchId) {
  return store.recruitmentStages
    .filter((s) => s.batchId === batchId)
    .sort((a, b) => a.stageNumber - b.stageNumber)
}

function currentStage(stages) {
  const now = new Date()
  const withRuntime = stages.map((s) => {
    const start = new Date(s.startTime)
    const end = new Date(s.endTime)
    let stageStatus = s.stageStatus
    if (now < start) stageStatus = 'NOT_STARTED'
    else if (now > end) stageStatus = 'COMPLETED'
    else stageStatus = 'IN_PROGRESS'
    return { ...s, stageStatus }
  })
  const current = withRuntime.find((s) => s.stageStatus === 'IN_PROGRESS')
    || withRuntime.find((s) => s.stageStatus === 'NOT_STARTED')
    || withRuntime[withRuntime.length - 1]
  return { stages: withRuntime, current: current || null }
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
  if (!batch) {
    return res.json(ok({
      batch: null, currentStage: null, students: { total: 0, submitted: 0, unsubmitted: 0 },
      perLab: [], totals: { quota: 0, admitted: 0, remaining: 0 },
      adjustments: { INTERNAL: 0, CROSS_LAB: 0, MANUAL_PLACEMENT: 0, confirmed: 0 },
      lists: { intended: 0, confirmed: 0, rejected: 0, alternate: 0 }
    }))
  }

  const students = store.users.filter((u) => u.role === ROLES.STUDENT && u.status === 'ACTIVE')
  const prefs = store.studentPreferences.filter((p) => p.batchId === batch.id && p.status === 'SUBMITTED')
  const submittedIds = new Set(prefs.map((p) => p.studentId))

  const interviews = store.interviews.filter((i) => i.batchId === batch.id)
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
    batch: { id: batch.id, batchName: batch.batchName, academicYear: batch.academicYear, status: batch.status, description: batch.description },
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
      const interviewList = store.interviews
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
      const interviews = store.interviews.filter(
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

module.exports = router
