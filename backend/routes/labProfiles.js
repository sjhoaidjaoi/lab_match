// ============ 实训室资料统一管理 ============
// 学院端是唯一维护入口：基础资料 / 教师团队 / 学年招生名额 / 宣传资料
// 组长端只读基础资料与名额，仅可维护本实训室宣传资料
//
// GET    /api/lab-profiles/overview                  总览（含统计）
// GET    /api/lab-profiles/labs/:id                  详情（基础资料 + 教师 + 名额 + 宣传资料）
// POST   /api/lab-profiles/labs                      新建实训室
// PUT    /api/lab-profiles/labs/:id                  维护基础资料（学院）
// POST   /api/lab-profiles/labs/:id/teachers         新增教师（学院）
// PUT    /api/lab-profiles/labs/:id/teachers/:tid    编辑教师（学院）
// DELETE /api/lab-profiles/labs/:id/teachers/:tid    移除教师（学院，软删除）
// PUT    /api/lab-profiles/labs/:id/leader           设置/更换组长（学院）
// GET    /api/lab-profiles/labs/:id/quotas           招生名额（学院/本室只读）
// PUT    /api/lab-profiles/labs/:id/plan             学年总名额（学院）
// PUT    /api/lab-profiles/labs/:id/teacher-quotas   教师名额分配（学院）
// GET    /api/lab-profiles/files                     宣传资料全量（学院）
// GET    /api/lab-profiles/labs/:id/files            某室宣传资料
// POST   /api/lab-profiles/labs/:id/files            上传宣传资料（学院 / 本室组长）
// GET    /api/lab-profiles/files/:fileId/download    下载
// GET    /api/lab-profiles/files/:fileId/preview     预览
// DELETE /api/lab-profiles/files/:fileId             删除（学院 / 本室组长）

const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { randomUUID } = require('crypto')
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, ROLES, canAccessLab } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')
const L = require('../utils/labProfile')

const isCollege = (req) => req.user.activeRole === ROLES.COLLEGE_ADMIN
const isOwnLabLeader = (req, lab) =>
  req.user.activeRole === ROLES.LAB_LEADER && Number(req.user.laboratoryId) === Number(lab.id)

/** 可读取本室资料：学院 / 本室教师 / 本室组长 */
function canReadLab(req, lab) {
  return isCollege(req) || canAccessLab(req, lab.id)
}
/** 可维护本室资料：学院 / 本室组长 */
function canManageLab(req, lab) {
  return isCollege(req) || isOwnLabLeader(req, lab)
}
function forbid(res, message = '无权限执行该操作') {
  return res.status(403).json({ code: 'ROLE_FORBIDDEN', message, data: null })
}
function notFound(res, message = '实训室不存在') {
  return res.status(404).json({ code: 'NOT_FOUND', message, data: null })
}

/* ---------------- 基础资料校验 ---------------- */
const text = (max) => z.string().trim().max(max).optional()
const ProfileSchema = z.object({
  labCode: z.string().trim().max(32).optional(),
  name: text(128),
  college: text(128),
  location: text(128),
  description: text(5000),
  detail: text(20000),
  researchDirection: text(512),
  projectDirection: text(512),
  technologyStack: text(512),
  features: text(5000),
  achievements: text(10000),
  equipment: text(10000),
  contact: text(512),
  remark: text(5000),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
})

const TeacherSchema = z.object({
  name: z.string().trim().min(1, '请输入教师姓名').max(64),
  employeeNo: z.string().trim().max(64).optional().default(''),
  gender: z.enum(['男', '女', '']).optional().default(''),
  title: text(64),
  degree: text(64),
  direction: text(512),
  project: text(2000),
  intro: text(5000),
  email: z.union([z.literal(''), z.string().trim().email('请输入有效邮箱')]).optional().default(''),
  office: text(128),
  photoUrl: text(1024),
  remark: text(2000),
  identity: z.enum(['LEADER', 'TEACHER']).optional().default('TEACHER'),
  sortNo: z.number().int().min(1).max(9999).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  // 教师资料与登录账号分离：可选择性关联已有账号，但新增教师不会自动建号
  userId: z.number().int().nullable().optional()
})

/** 校验教师关联的登录账号必须是本室教师/组长账号 */
function accountBindError(store, lab, userId, selfTeacherId) {
  if (userId == null) return null
  const account = (store.users || []).find((u) => u.id === userId)
  if (!account) return '关联账号不存在'
  if (Number(account.laboratoryId) !== Number(lab.id)) return '只能关联本实训室的教师账号'
  if (![ROLES.LAB_LEADER, ROLES.LAB_TEACHER].includes(account.role)) return '只能关联教师或组长账号'
  if (account.deletedAt) return '该账号已删除，无法关联'
  const taken = (store.labTeachers || []).some((item) =>
    item.id !== selfTeacherId && !item.deletedAt && item.userId === userId)
  return taken ? '该账号已关联其他教师档案' : null
}

function teacherList(store, lab, year, options = {}) {
  const withAccount = options.withAccount === true
  return (store.labTeachers || [])
    .filter((item) => item.laboratoryId === lab.id && !item.deletedAt)
    .sort((a, b) => (a.sortNo || 999) - (b.sortNo || 999) || a.id - b.id)
    .map((item) => {
      const account = item.userId == null ? null : (store.users || []).find((u) => u.id === item.userId)
      const base = L.normalizeTeacher(item, store, year)
      // 账号绑定关系属于本室内部数据，仅学院与本室成员可见
      if (!withAccount) return { ...base, userId: null, accountName: null, accountStatus: null }
      return {
        ...base,
        accountName: account?.username || null,
        accountStatus: account?.status || null
      }
    })
}

function fileList(store, labId) {
  return (store.labPromotionFiles || [])
    .filter((item) => item.laboratoryId === labId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

/** 空名额：新增 / 去掉教师后需要重算的共享逻辑 */
function quotaSummary(store, lab, year) {
  const batch = L.batchOfYear(store, year)
  const totalQuota = L.totalQuotaOf(store, lab, year)
  const teachers = teacherList(store, lab, year)
  const allocatedQuota = teachers
    .filter((item) => item.active)
    .reduce((sum, item) => sum + item.quota, 0)
  return {
    academicYear: year,
    batchId: batch?.id || null,
    totalQuota,
    allocatedQuota,
    unallocatedQuota: Math.max(0, totalQuota - allocatedQuota),
    enrolled: L.enrolledOf(store, lab.id, batch?.id),
    teacherCount: teachers.filter((item) => item.active).length,
    // 教师名额分配明细：详情页与名额接口共用同一口径
    teachers: teachers.map((item) => {
      const enrolled = L.teacherEnrolledOf(store, item.id, batch?.id)
      return {
        id: item.id,
        name: item.name,
        employeeNo: item.employeeNo,
        identity: item.identity,
        quota: item.quota,
        enrolled,
        remaining: Math.max(0, item.quota - enrolled),
        active: item.active
      }
    })
  }
}

/* ---------------- 总览 ---------------- */
router.get('/overview', requireAuth, (req, res) => {
  const store = getStore()
  const year = L.normalizeYear(store, req.query.academicYear)
  const scoped = !isCollege(req)
  const labs = (store.laboratories || [])
    .filter((lab) => (scoped ? Number(lab.id) === Number(req.user.laboratoryId) : true))
    .map((lab) => {
      const summary = quotaSummary(store, lab, year)
      const leader = lab.leaderId == null ? null : (store.users || []).find((u) => u.id === lab.leaderId)
      return {
        id: lab.id,
        labCode: lab.labCode || '',
        name: lab.name || '',
        displayName: L.displayName(lab),
        college: lab.college || '',
        location: lab.location || '',
        researchDirection: lab.researchDirection || '',
        projectDirection: lab.projectDirection || '',
        status: lab.status,
        leaderId: lab.leaderId ?? null,
        leaderName: leader?.realName || null,
        teacherCount: summary.teacherCount,
        totalQuota: summary.totalQuota,
        allocatedQuota: summary.allocatedQuota,
        unallocatedQuota: summary.unallocatedQuota,
        enrolled: summary.enrolled,
        completeness: L.completenessOf(lab)
      }
    })
    .sort((a, b) => String(a.labCode || a.displayName).localeCompare(String(b.labCode || b.displayName)))

  const stats = {
    labCount: labs.length,
    teacherCount: labs.reduce((sum, item) => sum + item.teacherCount, 0),
    totalQuota: labs.reduce((sum, item) => sum + item.totalQuota, 0),
    allocatedQuota: labs.reduce((sum, item) => sum + item.allocatedQuota, 0),
    unallocatedQuota: labs.reduce((sum, item) => sum + item.unallocatedQuota, 0),
    enrolled: labs.reduce((sum, item) => sum + item.enrolled, 0)
  }
  res.json(ok({ academicYear: year, academicYears: L.academicYears(store), stats, labs }))
})

/* ---------------- 详情 ---------------- */
router.get('/labs/:id', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!canReadLab(req, lab) && lab.status !== 'ACTIVE') return forbid(res, '无权查看该实训室资料')
  const year = L.normalizeYear(store, req.query.academicYear)
  const leader = lab.leaderId == null ? null : (store.users || []).find((u) => u.id === lab.leaderId)
  const files = fileList(store, lab.id)
  res.json(ok({
    ...L.normalizeLab(lab),
    displayName: L.displayName(lab),
    leaderName: leader?.realName || null,
    completeness: L.completenessOf(lab),
    academicYear: year,
    academicYears: L.academicYears(store),
    teachers: teacherList(store, lab, year, { withAccount: canReadLab(req, lab) }),
    quota: quotaSummary(store, lab, year),
    files,
    permissions: { editable: isCollege(req), fileEditable: canManageLab(req, lab) }
  }))
})

/* ---------------- 基础资料维护 ---------------- */
router.post('/labs', requireAuth, (req, res) => {
  if (!isCollege(req)) return forbid(res, '仅学院管理员可新增实训室')
  const body = ProfileSchema.parse(req.body || {})
  const labCode = (body.labCode || '').trim()
  if (!labCode) return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请输入实训室编号', data: null })
  const store = getStore()
  if ((store.laboratories || []).some((lab) => (lab.labCode || '').trim().toLowerCase() === labCode.toLowerCase())) {
    return res.status(409).json({ code: 'CONFLICT', message: `实训室编号「${labCode}」已存在`, data: null })
  }
  const id = nextId(store.laboratories)
  const lab = {
    id,
    ...body,
    labCode,
    recruitmentQuota: 0,
    leaderId: null,
    briefingText: '',
    status: body.status || 'ACTIVE',
    createdAt: new Date().toISOString()
  }
  store.laboratories.push(lab)
  logOperation(store, req, {
    operationType: 'CREATE_LAB', targetType: 'LABORATORY', targetId: id,
    description: `新增实训室「${L.displayName(lab)}」`
  })
  persistStore(store)
  res.json(ok(L.normalizeLab(lab)))
})

router.put('/labs/:id', requireAuth, (req, res) => {
  const store = getStore()
  const index = (store.laboratories || []).findIndex((item) => item.id === Number(req.params.id))
  if (index < 0) return notFound(res)
  if (!isCollege(req)) return forbid(res, '实训室基础资料由学院统一维护')
  const lab = store.laboratories[index]
  const body = ProfileSchema.parse(req.body || {})
  const nextCode = body.labCode === undefined ? lab.labCode : (body.labCode || '').trim()
  if (!nextCode) return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请输入实训室编号', data: null })
  const duplicated = (store.laboratories || []).some((item) =>
    item.id !== lab.id && (item.labCode || '').trim().toLowerCase() === nextCode.toLowerCase())
  if (duplicated) return res.status(409).json({ code: 'CONFLICT', message: `实训室编号「${nextCode}」已被占用`, data: null })

  const before = { ...lab }
  store.laboratories[index] = { ...lab, ...body, labCode: nextCode }
  logOperation(store, req, {
    operationType: 'UPDATE_LAB', targetType: 'LABORATORY', targetId: lab.id,
    description: `更新实训室「${L.displayName(store.laboratories[index])}」基础资料`,
    detail: {
      before: Object.fromEntries(Object.keys(body).map((key) => [key, before[key]])),
      after: Object.fromEntries(Object.keys(body).map((key) => [key, store.laboratories[index][key]]))
    }
  })
  persistStore(store)
  res.json(ok(L.normalizeLab(store.laboratories[index])))
})

/* ---------------- 教师管理 ---------------- */
router.get('/labs/:id/teachers', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!canReadLab(req, lab) && lab.status !== 'ACTIVE') return forbid(res, '无权查看该实训室教师信息')
  const year = L.normalizeYear(store, req.query.academicYear)
  res.json(ok(teacherList(store, lab, year, { withAccount: canReadLab(req, lab) })))
})

router.post('/labs/:id/teachers', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!isCollege(req)) return forbid(res, '教师信息由学院统一维护')
  const body = TeacherSchema.parse(req.body || {})
  if (body.employeeNo && (store.labTeachers || []).some((item) =>
    !item.deletedAt && (item.employeeNo || '').toLowerCase() === body.employeeNo.toLowerCase())) {
    return res.status(409).json({ code: 'CONFLICT', message: `教师编号「${body.employeeNo}」已存在`, data: null })
  }
  const bindError = accountBindError(store, lab, body.userId ?? null, null)
  if (bindError) return res.status(400).json({ code: 'VALIDATION_FAILED', message: bindError, data: null })
  if (!store.labTeachers) store.labTeachers = []
  const peers = store.labTeachers.filter((item) => item.laboratoryId === lab.id && !item.deletedAt)
  const item = {
    id: nextId(store.labTeachers),
    laboratoryId: lab.id,
    userId: null,
    recruitmentQuota: null,
    ...body,
    // 教师资料与登录账号分离：新增教师不自动创建登录账号
    sortNo: body.sortNo ?? peers.length + 1,
    createdAt: new Date().toISOString()
  }
  store.labTeachers.push(item)
  logOperation(store, req, {
    operationType: 'CREATE_LAB_TEACHER', targetType: 'LABORATORY', targetId: lab.id,
    description: `为「${L.displayName(lab)}」新增教师 ${item.name}`
  })
  persistStore(store)
  const year = L.normalizeYear(store, req.query.academicYear)
  res.json(ok(L.normalizeTeacher(item, store, year)))
})

router.put('/labs/:id/teachers/:teacherId', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!isCollege(req)) return forbid(res, '教师信息由学院统一维护')
  const index = (store.labTeachers || []).findIndex((item) =>
    item.id === Number(req.params.teacherId) && item.laboratoryId === lab.id && !item.deletedAt)
  if (index < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '教师不存在', data: null })
  const body = TeacherSchema.partial().parse(req.body || {})
  if (body.employeeNo && (store.labTeachers || []).some((item) =>
    item.id !== Number(req.params.teacherId) && !item.deletedAt &&
    (item.employeeNo || '').toLowerCase() === body.employeeNo.toLowerCase())) {
    return res.status(409).json({ code: 'CONFLICT', message: `教师编号「${body.employeeNo}」已存在`, data: null })
  }
  if (body.userId !== undefined) {
    const bindError = accountBindError(store, lab, body.userId, Number(req.params.teacherId))
    if (bindError) return res.status(400).json({ code: 'VALIDATION_FAILED', message: bindError, data: null })
  }
  store.labTeachers[index] = { ...store.labTeachers[index], ...body }
  logOperation(store, req, {
    operationType: 'UPDATE_LAB_TEACHER', targetType: 'LABORATORY', targetId: lab.id,
    description: `更新教师「${store.labTeachers[index].name}」资料`
  })
  persistStore(store)
  const year = L.normalizeYear(store, req.query.academicYear)
  res.json(ok(L.normalizeTeacher(store.labTeachers[index], store, year)))
})

router.delete('/labs/:id/teachers/:teacherId', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!isCollege(req)) return forbid(res, '教师信息由学院统一维护')
  const index = (store.labTeachers || []).findIndex((item) =>
    item.id === Number(req.params.teacherId) && item.laboratoryId === lab.id)
  if (index < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '教师不存在', data: null })
  const teacher = store.labTeachers[index]
  // 有关联业务记录时只解除关联（软删除），历史面试/志愿/录取记录保持可追溯
  const referenced = (store.studentPreferences || []).some((item) => item.labTeacherId === teacher.id) ||
    (store.interviews || []).some((item) => item.labTeacherId === teacher.id) ||
    (store.admissionIntentions || []).some((item) => item.labTeacherId === teacher.id)
  teacher.status = 'INACTIVE'
  teacher.deletedAt = new Date().toISOString()
  teacher.removedAt = teacher.deletedAt
  logOperation(store, req, {
    operationType: 'DELETE_LAB_TEACHER', targetType: 'LABORATORY', targetId: lab.id,
    description: `移除教师「${teacher.name}」${referenced ? '（保留历史业务记录）' : ''}`
  })
  persistStore(store)
  res.json(ok({ id: teacher.id, retainedHistory: referenced }, referenced ? '已解除关联，历史记录保留' : '已移除'))
})

/** 设置 / 更换实训室组长：按账号指定（账号须已绑定本室且角色为组长） */
router.put('/labs/:id/leader', requireAuth, (req, res) => {
  if (!isCollege(req)) return forbid(res, '组长由学院统一指定')
  const body = z.object({
    teacherId: z.number().int().nullable().optional(),
    userId: z.number().int().nullable().optional()
  }).parse(req.body || {})
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)

  // 通过教师档案指定时，需要该教师已关联组长账号
  let accountId = body.userId ?? null
  if (body.teacherId != null) {
    const teacher = (store.labTeachers || []).find((item) =>
      item.id === body.teacherId && item.laboratoryId === lab.id && !item.deletedAt)
    if (!teacher) return res.status(404).json({ code: 'NOT_FOUND', message: '该实训室下没有此教师', data: null })
    if (teacher.userId == null) {
      return res.status(400).json({
        code: 'VALIDATION_FAILED',
        message: '该教师尚未关联登录账号，请先为其绑定组长账号',
        data: null
      })
    }
    accountId = teacher.userId
  }

  if (accountId == null) {
    const target = store.laboratories.find((item) => item.id === lab.id)
    target.leaderId = null
    ;(store.labTeachers || [])
      .filter((item) => item.laboratoryId === lab.id && !item.deletedAt)
      .forEach((item) => { item.identity = 'TEACHER' })
    logOperation(store, req, {
      operationType: 'UPDATE_LAB_LEADER', targetType: 'LABORATORY', targetId: lab.id,
      description: `解除「${L.displayName(lab)}」组长绑定`
    })
    persistStore(store)
    return res.json(ok({ leaderId: null }))
  }

  const account = (store.users || []).find((u) => u.id === accountId)
  if (!account || account.role !== ROLES.LAB_LEADER || account.status !== 'ACTIVE' || account.deletedAt ||
    Number(account.laboratoryId) !== Number(lab.id)) {
    return res.status(400).json({
      code: 'VALIDATION_FAILED',
      message: '请选择已绑定本室的有效组长账号',
      data: null
    })
  }
  const teachers = (store.labTeachers || []).filter((item) => item.laboratoryId === lab.id && !item.deletedAt)
  teachers.forEach((item) => { item.identity = item.userId === accountId ? 'LEADER' : 'TEACHER' })
  lab.leaderId = account.id
  logOperation(store, req, {
    operationType: 'UPDATE_LAB_LEADER', targetType: 'LABORATORY', targetId: lab.id,
    description: `将「${L.displayName(lab)}」组长设置为 ${account.realName}`
  })
  persistStore(store)
  res.json(ok({ leaderId: account.id, leaderName: account.realName }))
})

/* ---------------- 招生名额 ---------------- */
router.get('/labs/:id/quotas', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!canReadLab(req, lab) && lab.status !== 'ACTIVE') return forbid(res, '无权查看该实训室名额')
  const year = L.normalizeYear(store, req.query.academicYear)
  const summary = quotaSummary(store, lab, year)
  res.json(ok({ ...summary, academicYears: L.academicYears(store), editable: isCollege(req) }))
})

router.put('/labs/:id/plan', requireAuth, (req, res) => {
  if (!isCollege(req)) return forbid(res, '招生名额由学院统一设置')
  const body = z.object({
    academicYear: z.string().regex(/^\d{4}-\d{4}$/, '学年格式应为 2026-2027'),
    totalQuota: z.number().int().min(0, '招生名额必须为非负整数').max(100000)
  }).parse(req.body || {})
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  const allocated = L.allocatedQuotaOf(store, lab.id, body.academicYear)
  if (body.totalQuota < allocated) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: `总名额不能小于已分配给教师的名额合计（${allocated} 人），请先调整教师名额`,
      data: null
    })
  }
  if (!store.labYearlyPlans) store.labYearlyPlans = []
  const existing = store.labYearlyPlans.find((item) =>
    item.laboratoryId === lab.id && item.academicYear === body.academicYear)
  if (existing) {
    existing.totalQuota = body.totalQuota
    existing.updatedAt = new Date().toISOString()
    existing.updatedBy = req.user.uid
  } else {
    store.labYearlyPlans.push({
      id: nextId(store.labYearlyPlans),
      laboratoryId: lab.id,
      academicYear: body.academicYear,
      totalQuota: body.totalQuota,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    })
  }
  // 当前学年的计划同步到实训室历史字段，保证旧业务（容量校验）口径一致
  if (body.academicYear === L.currentAcademicYear(store)) lab.recruitmentQuota = body.totalQuota
  logOperation(store, req, {
    operationType: 'UPDATE_LAB_PLAN', targetType: 'LABORATORY', targetId: lab.id,
    description: `设置「${L.displayName(lab)}」${body.academicYear} 学年招生总名额 ${body.totalQuota} 人`
  })
  persistStore(store)
  res.json(ok(quotaSummary(store, lab, body.academicYear)))
})

router.put('/labs/:id/teacher-quotas', requireAuth, (req, res) => {
  if (!isCollege(req)) return forbid(res, '招生名额由学院统一设置')
  const body = z.object({
    academicYear: z.string().regex(/^\d{4}-\d{4}$/, '学年格式应为 2026-2027'),
    items: z.array(z.object({
      labTeacherId: z.number().int(),
      quota: z.number().int().min(0, '教师名额必须为非负整数').max(100000)
    })).max(200)
  }).parse(req.body || {})
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  const total = L.totalQuotaOf(store, lab, body.academicYear)
  const batch = L.batchOfYear(store, body.academicYear)
  const teachers = (store.labTeachers || []).filter((item) =>
    item.laboratoryId === lab.id && !item.deletedAt && item.status !== 'INACTIVE')
  const patch = new Map(body.items.map((item) => [item.labTeacherId, item.quota]))

  for (const [teacherId] of patch) {
    if (!teachers.some((item) => item.id === teacherId)) {
      return res.status(400).json({ code: 'VALIDATION_FAILED', message: '名额分配中存在不属于本实训室的教师', data: null })
    }
  }
  // 未提交的教师保留原名额，合计仍需受总名额约束
  const plan = teachers.map((item) => ({
    teacher: item,
    quota: patch.has(item.id) ? patch.get(item.id) : L.teacherQuotaOf(store, item, body.academicYear)
  }))
  const sum = plan.reduce((acc, item) => acc + item.quota, 0)
  if (sum > total) {
    return res.status(409).json({
      code: 'CONFLICT',
      message: `教师名额合计 ${sum} 人，超过实训室 ${body.academicYear} 学年总名额 ${total} 人`,
      data: null
    })
  }
  for (const { teacher, quota } of plan) {
    const enrolled = L.teacherEnrolledOf(store, teacher.id, batch?.id)
    if (quota < enrolled) {
      return res.status(409).json({
        code: 'CONFLICT',
        message: `教师「${teacher.name}」已录取 ${enrolled} 人，名额不能低于已录取人数`,
        data: null
      })
    }
  }
  if (!store.teacherYearlyQuotas) store.teacherYearlyQuotas = []
  for (const { teacher, quota } of plan) {
    const row = store.teacherYearlyQuotas.find((item) =>
      item.labTeacherId === teacher.id && item.academicYear === body.academicYear)
    if (row) {
      row.quota = quota
      row.updatedAt = new Date().toISOString()
    } else {
      store.teacherYearlyQuotas.push({
        id: nextId(store.teacherYearlyQuotas),
        laboratoryId: lab.id,
        labTeacherId: teacher.id,
        academicYear: body.academicYear,
        quota,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
    // 当前学年同步历史字段，保证拟录取 / 容量校验使用同一份口径
    if (body.academicYear === L.currentAcademicYear(store)) teacher.recruitmentQuota = quota
  }
  logOperation(store, req, {
    operationType: 'UPDATE_TEACHER_QUOTA', targetType: 'LABORATORY', targetId: lab.id,
    description: `调整「${L.displayName(lab)}」${body.academicYear} 学年教师名额分配（合计 ${sum} 人）`
  })
  persistStore(store)
  res.json(ok(quotaSummary(store, lab, body.academicYear)))
})

/* ---------------- 宣传资料 ---------------- */
const FILE_DIR = process.env.LAB_PROMOTION_DIR
  ? path.resolve(process.env.LAB_PROMOTION_DIR)
  : path.join(__dirname, '..', 'data', 'promotion-files')

const FILE_TYPES = {
  '.ppt': { type: 'PPT', mime: 'application/vnd.ms-powerpoint', preview: false },
  '.pptx': { type: 'PPT', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', preview: false },
  '.pdf': { type: 'PDF', mime: 'application/pdf', preview: true },
  '.doc': { type: 'WORD', mime: 'application/msword', preview: false },
  '.docx': { type: 'WORD', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', preview: false },
  '.mp4': { type: 'VIDEO', mime: 'video/mp4', preview: true },
  '.webm': { type: 'VIDEO', mime: 'video/webm', preview: true },
  '.mov': { type: 'VIDEO', mime: 'video/quicktime', preview: true },
  '.png': { type: 'IMAGE', mime: 'image/png', preview: true },
  '.jpg': { type: 'IMAGE', mime: 'image/jpeg', preview: true },
  '.jpeg': { type: 'IMAGE', mime: 'image/jpeg', preview: true },
  '.webp': { type: 'IMAGE', mime: 'image/webp', preview: true },
  '.gif': { type: 'IMAGE', mime: 'image/gif', preview: true }
}
const MAX_FILE_SIZE = 200 * 1024 * 1024

/** multipart 文件名默认按 latin1 解码，中文会乱码，这里还原为 UTF-8 */
function decodeFileName(name) {
  if (!name) return ''
  if (/[^\u0000-\u00ff]/.test(name)) return name
  const recovered = Buffer.from(name, 'latin1').toString('utf8')
  return recovered.includes('\ufffd') ? name : recovered
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        fs.mkdirSync(FILE_DIR, { recursive: true })
        cb(null, FILE_DIR)
      } catch (error) {
        cb(error)
      }
    },
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(decodeFileName(file.originalname)).toLowerCase()}`)
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 }
}).single('file')

function fileUrlOf(file) {
  return `/api/lab-profiles/files/${file.id}/${file.type === 'IMAGE' || file.type === 'PDF' || file.type === 'VIDEO' ? 'preview' : 'download'}`
}

function decorateFile(file, store, lab) {
  return {
    ...file,
    laboratoryName: lab ? L.displayName(lab) : '',
    url: fileUrlOf(file),
    previewable: ['IMAGE', 'PDF', 'VIDEO'].includes(file.type)
  }
}

router.get('/files', requireAuth, (req, res) => {
  if (!isCollege(req)) return forbid(res, '全院宣传资料仅学院管理员可查看')
  const store = getStore()
  const labs = store.laboratories || []
  const labId = req.query.laboratoryId ? Number(req.query.laboratoryId) : null
  const keyword = String(req.query.keyword || '').trim().toLowerCase()
  const list = (store.labPromotionFiles || [])
    .filter((file) => (labId ? file.laboratoryId === labId : true))
    .filter((file) => (keyword ? file.fileName.toLowerCase().includes(keyword) : true))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((file) => decorateFile(file, store, labs.find((lab) => lab.id === file.laboratoryId)))
  res.json(ok(list))
})

router.get('/labs/:id/files', requireAuth, (req, res) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  if (!canReadLab(req, lab) && lab.status !== 'ACTIVE') return forbid(res, '无权查看该实训室宣传资料')
  res.json(ok(fileList(store, lab.id).map((file) => decorateFile(file, store, lab))))
})

router.post('/labs/:id/files', requireAuth, (req, res, next) => {
  const store = getStore()
  const lab = (store.laboratories || []).find((item) => item.id === Number(req.params.id))
  if (!lab) return notFound(res)
  // 组长只能上传本实训室资料；学院可上传任意实训室
  if (!canManageLab(req, lab)) return forbid(res, '只能管理本人负责实训室的宣传资料')
  upload(req, res, (error) => {
    if (error) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? `文件超过 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB 上限`
        : '上传失败，请重试'
      return res.status(400).json({ code: 'VALIDATION_FAILED', message, data: null })
    }
    const file = req.file
    if (!file) return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请选择文件', data: null })
    const originalName = decodeFileName(file.originalname)
    const extension = path.extname(originalName).toLowerCase()
    const meta = FILE_TYPES[extension]
    if (!meta) {
      fs.unlink(file.path, () => {})
      return res.status(400).json({
        code: 'VALIDATION_FAILED',
        message: '仅支持 PPT / PDF / Word / 视频(MP4、WebM、MOV) / 图片(PNG、JPG、WebP、GIF)',
        data: null
      })
    }
    try {
      const store2 = getStore()
      const current = store2.laboratories.find((item) => item.id === lab.id)
      if (!store2.labPromotionFiles) store2.labPromotionFiles = []
      const record = {
        id: randomUUID(),
        laboratoryId: lab.id,
        fileName: path.basename(originalName).slice(0, 180) || `file${extension}`,
        storeName: file.filename,
        type: meta.type,
        mimeType: meta.mime,
        size: file.size,
        uploadedBy: req.user.uid,
        uploaderName: (store2.users || []).find((u) => u.id === req.user.uid)?.realName || req.user.username,
        createdAt: new Date().toISOString()
      }
      store2.labPromotionFiles.push(record)
      logOperation(store2, req, {
        operationType: 'UPLOAD_LAB_FILE', targetType: 'LABORATORY', targetId: lab.id,
        description: `上传「${L.displayName(current || lab)}」宣传资料 ${record.fileName}`
      })
      persistStore(store2)
      res.json(ok(decorateFile(record, store2, current || lab)))
    } catch (err) {
      fs.unlink(file.path, () => {})
      next(err)
    }
  })
})

/** 文件访问：学院 / 本室成员 / 任意登录用户（仅启用实训室的公开资料） */
function locateFile(req, res) {
  const store = getStore()
  const file = (store.labPromotionFiles || []).find((item) => item.id === req.params.fileId)
  if (!file) { notFound(res, '文件不存在'); return null }
  const lab = (store.laboratories || []).find((item) => item.id === file.laboratoryId)
  if (!lab) { notFound(res); return null }
  if (!canReadLab(req, lab) && lab.status !== 'ACTIVE') { forbid(res, '无权访问该文件'); return null }
  const diskPath = path.join(FILE_DIR, file.storeName)
  if (!fs.existsSync(diskPath)) {
    res.status(410).json({ code: 'GONE', message: '文件已从存储中移除，请重新上传', data: null })
    return null
  }
  return { store, file, lab, diskPath }
}

router.get('/files/:fileId/download', requireAuth, (req, res) => {
  const found = locateFile(req, res)
  if (!found) return
  res.set('X-Content-Type-Options', 'nosniff')
  res.download(found.diskPath, found.file.fileName, { headers: { 'Content-Type': found.file.mimeType } })
})

router.get('/files/:fileId/preview', requireAuth, (req, res) => {
  const found = locateFile(req, res)
  if (!found) return
  const inline = ['IMAGE', 'PDF', 'VIDEO'].includes(found.file.type)
  res.set('X-Content-Type-Options', 'nosniff')
  if (!inline) {
    return res.download(found.diskPath, found.file.fileName, { headers: { 'Content-Type': found.file.mimeType } })
  }
  res.set('Content-Type', found.file.mimeType)
  res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(found.file.fileName)}`)
  fs.createReadStream(found.diskPath).pipe(res)
})

router.delete('/files/:fileId', requireAuth, (req, res) => {
  const store = getStore()
  const index = (store.labPromotionFiles || []).findIndex((item) => item.id === req.params.fileId)
  if (index < 0) return notFound(res, '文件不存在')
  const file = store.labPromotionFiles[index]
  const lab = (store.laboratories || []).find((item) => item.id === file.laboratoryId)
  if (!lab) return notFound(res)
  if (!canManageLab(req, lab)) return forbid(res, '只能删除本人负责实训室的宣传资料')
  store.labPromotionFiles.splice(index, 1)
  logOperation(store, req, {
    operationType: 'DELETE_LAB_FILE', targetType: 'LABORATORY', targetId: lab.id,
    description: `删除「${L.displayName(lab)}」宣传资料 ${file.fileName}`
  })
  persistStore(store)
  fs.unlink(path.join(FILE_DIR, file.storeName), (error) => {
    if (error && error.code !== 'ENOENT') console.error('[lab-profiles] 宣传资料文件清理失败', error.message)
  })
  res.json(ok(null, '文件已删除'))
})

module.exports = router
