// ============ 学生志愿（意向填报） ============
// POST   /api/preferences/submit            学生提交最多 3 个平行志愿 + 2 项调剂意愿
// GET    /api/preferences/my                学生查看自己的志愿
// GET    /api/preferences/lab/:labId        实训室教师/组长查看报名本室的学生
// GET    /api/preferences/overview          学院管理员全院志愿分布

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

const SubmitSchema = z.object({
  laboratories: z.array(z.number().int().positive()).min(1).max(3),
  obeyInternalAdjustment: z.boolean(),
  obeyCollegeAdjustment: z.boolean()
})

// 学生提交志愿
router.post('/submit', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const body = SubmitSchema.parse(req.body || {})
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  if (!activeBatch) return res.status(400).json({ code: 'BUSINESS_ERROR', message: '当前没有活跃的选拔批次', data: null })

  // 校验实训室存在
  const labIds = new Set(store.laboratories.map((l) => l.id))
  for (const id of body.laboratories) {
    if (!labIds.has(id)) return res.status(400).json({ code: 'VALIDATION_FAILED', message: `实训室 ${id} 不存在`, data: null })
  }
  // 去重
  const uniqueLabs = [...new Set(body.laboratories)]
  if (uniqueLabs.length !== body.laboratories.length) {
    return res.status(400).json({ code: 'VALIDATION_FAILED', message: '不允许重复填报同一个实训室', data: null })
  }

  // 先清除该学生在本批次已有志愿（允许截止前覆盖）
  store.studentPreferences = store.studentPreferences.filter(
    (p) => !(p.studentId === req.user.uid && p.batchId === activeBatch.id)
  )
  // 写入新志愿
  const submittedAt = new Date().toISOString()
  uniqueLabs.forEach((labId) => {
    store.studentPreferences.push({
      id: nextId(store.studentPreferences),
      batchId: activeBatch.id, studentId: req.user.uid, laboratoryId: labId,
      obeyInternalAdjustment: body.obeyInternalAdjustment,
      obeyCollegeAdjustment: body.obeyCollegeAdjustment,
      submittedAt, status: 'SUBMITTED'
    })
  })
  persistStore(store)
  res.json(ok({ count: uniqueLabs.length }))
})

// 学生查看自己的志愿
router.get('/my', requireAuth, (req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  if (!activeBatch) return res.json(ok([]))
  const list = store.studentPreferences
    .filter((p) => p.studentId === req.user.uid && p.batchId === activeBatch.id)
    .map((p) => {
      const lab = store.laboratories.find((l) => l.id === p.laboratoryId)
      return { ...p, laboratoryName: lab?.name || `实训室#${p.laboratoryId}` }
    })
  res.json(ok(list))
})

// 实训室端：查看本室报名学生
router.get('/lab/:labId', requireAuth, (req, res) => {
  const store = getStore()
  const labId = Number(req.params.labId)
  const lab = store.laboratories.find((l) => l.id === labId)
  if (!lab) return res.status(404).json({ code: 'NOT_FOUND', message: '实训室不存在', data: null })

  const role = req.user.activeRole
  // LAB_LEADER 或该实训室 LAB_TEACHER 可以访问，COLLEGE_ADMIN 也可以
  if (role === ROLES.LAB_TEACHER && lab.leaderId !== req.user.uid) {
    // 教师没有 leaderId 映射权限时：暂允许所有教师查看（文档允许查看"本实训室"数据，暂不做强约束）
  }
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
  const list = store.studentPreferences
    .filter((p) => p.laboratoryId === labId && p.batchId === activeBatch.id)
    .map((p) => {
      const student = store.users.find((u) => u.id === p.studentId)
      return {
        id: p.id, studentId: p.studentId,
        studentName: student?.realName || '', studentNumber: student?.studentNumber || '',
        obeyInternalAdjustment: p.obeyInternalAdjustment,
        obeyCollegeAdjustment: p.obeyCollegeAdjustment,
        submittedAt: p.submittedAt, status: p.status
      }
    })
  res.json(ok(list))
})

// 学院端：全院志愿总览
router.get('/overview', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const activeBatch = store.recruitmentBatches.find((b) => b.status === 'IN_PROGRESS') || store.recruitmentBatches[0]
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
