// ============ 用户与角色管理（学院总负责人端） ============
// GET    /api/users                用户列表（支持 role / keyword 过滤）
// GET    /api/users/staff          教师与组长列表（实训室负责人下拉用）
// POST   /api/users                新建账号
// PUT    /api/users/:id            修改账号资料 / 角色 / 状态
// POST   /api/users/:id/reset-password  重置密码
// DELETE /api/users/:id            停用账号（软删除，保留业务数据）

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const bcrypt = require('bcryptjs')
const { ok, fail, ResultCode } = require('../utils/result')
const { getStore, persistStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')

const ROLE_ENUM = z.enum([ROLES.STUDENT, ROLES.LAB_TEACHER, ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN])
const STATUS_ENUM = z.enum(['ACTIVE', 'INACTIVE'])

const CreateSchema = z.object({
  username: z.string().min(2, '账号至少 2 位'),
  password: z.string().min(6, '密码至少 6 位').optional().default('123456'),
  realName: z.string().min(1, '请输入姓名'),
  studentNumber: z.string().optional().nullable(),
  role: ROLE_ENUM,
  phone: z.string().optional().nullable(),
  laboratoryId: z.number().int().nullable().optional(),
  status: STATUS_ENUM.optional().default('ACTIVE')
})

const UpdateSchema = z.object({
  realName: z.string().min(1).optional(),
  studentNumber: z.string().optional().nullable(),
  role: ROLE_ENUM.optional(),
  phone: z.string().optional().nullable(),
  laboratoryId: z.number().int().nullable().optional(),
  status: STATUS_ENUM.optional()
})

function toView(u) {
  return {
    id: u.id, username: u.username, realName: u.realName,
    studentNumber: u.studentNumber, role: u.role, phone: u.phone,
    laboratoryId: u.laboratoryId ?? null,
    status: u.status, createdAt: u.createdAt
  }
}

function roleLabel(code) {
  return ({
    STUDENT: '学生',
    LAB_TEACHER: '实训室教师',
    LAB_LEADER: '实训室组长',
    COLLEGE_ADMIN: '学院总负责人'
  })[code] || code
}

// 用户列表
router.get('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const role = (req.query.role || '').toString().trim()
  const keyword = (req.query.keyword || '').toString().trim()
  const laboratoryId = req.query.laboratoryId ? Number(req.query.laboratoryId) : null
  const list = store.users
    .filter((u) => (role ? u.role === role : true))
    .filter((u) => (laboratoryId ? u.laboratoryId === laboratoryId : true))
    .filter((u) => {
      if (!keyword) return true
      return u.username.includes(keyword) || u.realName.includes(keyword) || (u.studentNumber || '').includes(keyword)
    })
    .map(toView)
  res.json(ok(list))
})

// 教师与组长列表（供实训室负责人下拉使用）
router.get('/staff', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (_req, res) => {
  const store = getStore()
  const list = store.users
    .filter((u) => u.role === ROLES.LAB_TEACHER || u.role === ROLES.LAB_LEADER)
    .map((u) => ({ id: u.id, realName: u.realName, role: u.role, roleName: roleLabel(u.role), laboratoryId: u.laboratoryId ?? null, status: u.status }))
  res.json(ok(list))
})

// 批量导入学生账号（学院统一导入，默认密码 123456）
router.post('/import', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = z.object({
    students: z.array(z.object({
      studentNumber: z.string().min(1, '学号不能为空'),
      realName: z.string().min(1, '姓名不能为空'),
      phone: z.string().optional().default('')
    })).min(1, '导入数据不能为空')
  }).parse(req.body || {})
  const store = getStore()
  const created = []
  const skipped = []
  body.students.forEach((s) => {
    const studentNumber = s.studentNumber.trim()
    const exists = store.users.some((u) => u.username === studentNumber || u.studentNumber === studentNumber)
    if (exists) {
      skipped.push({ studentNumber, realName: s.realName, reason: '学号已存在' })
      return
    }
    const user = {
      id: nextId(store.users),
      username: studentNumber,
      passwordHash: bcrypt.hashSync('123456', 10),
      realName: s.realName.trim(),
      studentNumber,
      role: ROLES.STUDENT,
      phone: s.phone || null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    store.users.push(user)
    created.push(toView(user))
  })
  logOperation(store, req, {
    operationType: 'IMPORT_STUDENTS', targetType: 'USER', targetId: null,
    description: `批量导入学生账号：成功 ${created.length} 个，跳过 ${skipped.length} 个`
  })
  persistStore(store)
  res.json(ok({ created: created.length, skipped }))
})

// 新建账号
router.post('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = CreateSchema.parse(req.body || {})
  const store = getStore()
  if (store.users.some((u) => u.username === body.username)) {
    return res.status(400).json(fail(ResultCode.VALIDATION_FAILED, '账号已存在'))
  }
  const user = {
    id: nextId(store.users),
    username: body.username,
    passwordHash: bcrypt.hashSync(body.password, 10),
    realName: body.realName,
    studentNumber: body.studentNumber || (body.role === ROLES.STUDENT ? body.username : null),
    role: body.role,
    phone: body.phone || null,
    laboratoryId: body.laboratoryId ?? null,
    status: body.status,
    createdAt: new Date().toISOString()
  }
  store.users.push(user)
  logOperation(store, req, {
    operationType: 'CREATE_USER', targetType: 'USER', targetId: user.id,
    description: `新建${roleLabel(user.role)}账号 ${user.username}（${user.realName}）`
  })
  persistStore(store)
  res.json(ok(toView(user)))
})

// 修改账号
router.put('/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = UpdateSchema.parse(req.body || {})
  const store = getStore()
  const idx = store.users.findIndex((u) => u.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json(fail(ResultCode.NOT_FOUND, '用户不存在'))
  const before = store.users[idx]
  store.users[idx] = { ...before, ...body }
  logOperation(store, req, {
    operationType: 'UPDATE_USER', targetType: 'USER', targetId: before.id,
    description: `修改账号 ${before.username} 资料（${before.realName}）`
  })
  persistStore(store)
  res.json(ok(toView(store.users[idx])))
})

// 重置密码
router.post('/:id/reset-password', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const password = z.string().min(6, '密码至少 6 位').parse(req.body?.password || '123456')
  const store = getStore()
  const user = store.users.find((u) => u.id === Number(req.params.id))
  if (!user) return res.status(404).json(fail(ResultCode.NOT_FOUND, '用户不存在'))
  user.passwordHash = bcrypt.hashSync(password, 10)
  logOperation(store, req, {
    operationType: 'RESET_PASSWORD', targetType: 'USER', targetId: user.id,
    description: `重置账号 ${user.username} 的密码`
  })
  persistStore(store)
  res.json(ok(null, '密码已重置'))
})

// 停用账号（软删除）
router.delete('/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const user = store.users.find((u) => u.id === Number(req.params.id))
  if (!user) return res.status(404).json(fail(ResultCode.NOT_FOUND, '用户不存在'))
  if (user.role === ROLES.COLLEGE_ADMIN) {
    return res.status(400).json(fail(ResultCode.BUSINESS_ERROR, '学院总负责人账号不允许停用'))
  }
  user.status = 'INACTIVE'
  logOperation(store, req, {
    operationType: 'DISABLE_USER', targetType: 'USER', targetId: user.id,
    description: `停用账号 ${user.username}（${user.realName}）`
  })
  persistStore(store)
  res.json(ok(toView(user)))
})

module.exports = router
