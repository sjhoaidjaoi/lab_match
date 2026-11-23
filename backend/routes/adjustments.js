// 历史调剂查询与旧写入入口兼容提示
const express = require('express')
const router = express.Router()
const { ok } = require('../utils/result')
const { getStore, ADJUSTMENT_TYPE } = require('../data/seed')
const { requireAuth, requireRole, ROLES, guardLab } = require('../middleware/auth')
const { scopedChoice } = require('../utils/applicationScope')
const { currentBatch } = require('../utils/recruitment')

function activeBatchOf(store) {
  return currentBatch(store)
}

// 历史调剂记录仍可查阅，新录取统一使用学院调剂池核对轮次、名额和学生意愿。
function retired(_req, res) {
  return res.status(410).json({ message: '请由学院负责人在统筹调剂录取中办理' })
}
router.post(['/internal', '/cross', '/cross-batch', '/placement'], requireAuth, retired)

router.get('/list', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.adjustments
    .filter((a) => a.batchId === activeBatch?.id)
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      const source = a.sourceLaboratoryId ? store.laboratories.find((l) => l.id === a.sourceLaboratoryId) : null
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      const operator = store.users.find((u) => u.id === a.operatorId)
      return {
        ...a,
        studentName: stu?.realName || '',
        studentNumber: stu?.studentNumber || '',
        sourceLabName: source?.name || null,
        targetLabName: target?.name || '',
        operatorName: operator?.realName || ''
      }
    })
  res.json(ok(list))
})

// 学院端：审核调剂结果
router.put('/:id/status', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), retired)
router.post('/:id/confirm', requireAuth, requireRole(ROLES.STUDENT), retired)

router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  if (!activeBatch) return res.json(ok([]))
  const list = store.adjustments
    .filter((a) => a.studentId === req.user.uid && a.batchId === activeBatch?.id)
    .map((a) => {
      const source = a.sourceLaboratoryId ? store.laboratories.find((l) => l.id === a.sourceLaboratoryId) : null
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      const teacher = store.labTeachers.find(t => t.id === a.targetLabTeacherId && t.laboratoryId === a.targetLaboratoryId)
      return { ...a, sourceLabName: source?.name || null, targetLabName: target?.name || '', targetTeacherName: teacher?.name || null }
    })
  res.json(ok(list))
})

// 实训室查看
router.get('/lab/:labId', requireAuth, requireRole(ROLES.LAB_TEACHER, ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })
  if (!guardLab(req, res, labId)) return
  const activeBatch = activeBatchOf(store)
  const list = store.adjustments
    .filter((a) => (a.sourceLaboratoryId === labId || a.targetLaboratoryId === labId) && a.batchId === activeBatch?.id &&
      (req.user.activeRole !== ROLES.LAB_TEACHER || scopedChoice(store, req.user, a.batchId, a.studentId, labId)))
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      const target = store.laboratories.find((l) => l.id === a.targetLaboratoryId)
      return { ...a, studentName: stu?.realName || '', targetLabName: target?.name || '' }
    })
  res.json(ok(list))
})

// 学院总览
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = activeBatchOf(store)
  const all = store.adjustments.filter((a) => a.batchId === activeBatch?.id)
  const grouped = {
    INTERNAL: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.INTERNAL).length,
    CROSS_LAB: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.CROSS_LAB).length,
    MANUAL_PLACEMENT: all.filter((a) => a.adjustmentType === ADJUSTMENT_TYPE.MANUAL_PLACEMENT).length
  }
  res.json(ok({ total: all.length, grouped }))
})

module.exports = router
