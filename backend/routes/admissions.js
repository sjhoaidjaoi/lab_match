// ============ 拟录取 / 确认 ============
// POST   /api/admissions/intend            实训室组长提交拟录取 / 递补名单
// POST   /api/admissions/:id/confirm       学生确认或放弃
// GET    /api/admissions/my                学生查看自己的拟录取意向
// GET    /api/admissions/lab/:labId        实训室确认情况
// GET    /api/admissions/overview          学院端汇总

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId, ADMISSION_TYPE } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

const IntendSchema = z.object({
  studentId: z.number().int(),
  laboratoryId: z.number().int(),
  admissionType: z.enum([ADMISSION_TYPE.INTENDED, ADMISSION_TYPE.ALTERNATE]),
  confirmationDeadline: z.string().datetime().optional()
})

// 实训室组长/教师 提交拟录取或递补
router.post('/intend', requireAuth, requireRole(ROLES.LAB_LEADER, ROLES.LAB_TEACHER), (req, res) => {
  const body = IntendSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  // 同批次同学生同实训室只保留一条（覆盖）
  store.admissionIntentions = store.admissionIntentions.filter(
    (a) => !(a.batchId === activeBatch.id && a.studentId === body.studentId && a.laboratoryId === body.laboratoryId)
  )
  const item = {
    id: nextId(store.admissionIntentions),
    batchId: activeBatch.id,
    ...body,
    status: 'PENDING', // PENDING / CONFIRMED / REJECTED / EXPIRED
    confirmedAt: null,
    createdAt: new Date().toISOString()
  }
  store.admissionIntentions.push(item)
  persistStore(store)
  res.json(ok(item))
})

// 学生确认或放弃
router.post('/:id/confirm', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const confirmed = z.boolean().parse(req.body?.confirmed)
  const store = getStore()
  const idx = store.admissionIntentions.findIndex((a) => a.id === Number(req.params.id) && a.studentId === req.user.uid)
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '未找到此意向', data: null })
  store.admissionIntentions[idx].status = confirmed ? 'CONFIRMED' : 'REJECTED'
  store.admissionIntentions[idx].confirmedAt = new Date().toISOString()

  // 自动规则：若该学生只有一个 INTENDED 意向，则自动确认（文档第 5 阶段情况一）
  // 这里只处理本次显式操作，自动逻辑留待服务端批处理

  persistStore(store)
  res.json(ok(store.admissionIntentions[idx]))
})

// 学生查看自己的拟录取意向
router.get('/my', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.admissionIntentions
    .filter((a) => a.studentId === req.user.uid && a.batchId === activeBatch.id)
    .map((a) => {
      const lab = store.laboratories.find((l) => l.id === a.laboratoryId)
      return { ...a, laboratoryName: lab?.name || `实训室#${a.laboratoryId}` }
    })
  res.json(ok(list))
})

// 实训室查看本室确认情况
router.get('/lab/:labId', requireAuth, (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.admissionIntentions
    .filter((a) => a.laboratoryId === Number(req.params.labId) && a.batchId === activeBatch.id)
    .map((a) => {
      const stu = store.users.find((u) => u.id === a.studentId)
      return {
        ...a, studentName: stu?.realName || '', studentNumber: stu?.studentNumber || ''
      }
    })
  res.json(ok(list))
})

// 学院端：全院拟录取/递补明细
router.get('/all', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
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

// 学院端：逾期未确认的拟录取意向自动释放名额
router.post('/expire', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const nowTs = Date.now()
  let count = 0
  store.admissionIntentions
    .filter((a) => a.batchId === activeBatch.id && a.status === 'PENDING')
    .forEach((a) => {
      if (a.confirmationDeadline && new Date(a.confirmationDeadline).getTime() < nowTs) {
        a.status = 'EXPIRED'
        count += 1
      }
    })
  persistStore(store)
  res.json(ok({ expired: count }))
})

// 学院汇总
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const all = store.admissionIntentions.filter((a) => a.batchId === activeBatch.id)
  const perLab = store.laboratories.map((lab) => {
    const list = all.filter((a) => a.laboratoryId === lab.id && a.admissionType === ADMISSION_TYPE.INTENDED)
    return {
      laboratoryId: lab.id, laboratoryName: lab.name,
      intended: list.length,
      confirmed: list.filter((a) => a.status === 'CONFIRMED').length,
      rejected: list.filter((a) => a.status === 'REJECTED').length,
      quota: lab.recruitmentQuota
    }
  })
  res.json(ok({ totalIntended: all.filter((a) => a.admissionType === ADMISSION_TYPE.INTENDED).length, perLab }))
})

module.exports = router
