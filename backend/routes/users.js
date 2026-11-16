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
const { requireAuth, requireRole, ROLES, isLabLeader } = require('../middleware/auth')
const { BusinessError } = require('../middleware/error')
const { logOperation } = require('../utils/audit')
const { paginate } = require('../utils/pagination')
const { INITIAL_PASSWORD, isManagedAccount } = require('../utils/accountCredentials')

const ROLE_ENUM = z.enum([ROLES.STUDENT, ROLES.LAB_TEACHER, ROLES.LAB_LEADER, ROLES.COLLEGE_ADMIN])
const STATUS_ENUM = z.enum(['ACTIVE', 'INACTIVE'])
const AccountNumber = z.string().trim().min(1, '账号编号不能为空').max(64, '账号编号最多 64 位')

const CreateSchema = z.object({
  username: AccountNumber.optional(),
  password: z.string().optional(),
  realName: z.string().trim().min(1, '请输入姓名'),
  studentNumber: AccountNumber.optional().nullable(),
  employeeNumber: AccountNumber.optional(),
  role: ROLE_ENUM,
  phone: z.string().optional().nullable(),
  laboratoryId: z.number().int().nullable().optional(),
  status: STATUS_ENUM.optional().default('ACTIVE')
})

const UpdateSchema = z.object({
  realName: z.string().min(1).optional(),
  studentNumber: AccountNumber.optional().nullable(),
  role: ROLE_ENUM.optional(),
  phone: z.string().optional().nullable(),
  laboratoryId: z.number().int().nullable().optional(),
  status: STATUS_ENUM.optional()
})

function accountExists(users, accountNumber, excludingId) {
  const key = accountNumber.toLowerCase()
  return users.some(user => user.id !== excludingId &&
    (user.username.toLowerCase() === key || user.studentNumber?.toLowerCase() === key))
}

function installPassword(user, password) {
  user.passwordHash = bcrypt.hashSync(password, 10)
  user.mustChangePassword = isManagedAccount(user.role)
  user.credentialVersion = (user.credentialVersion ?? 0) + 1
}

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

const LabTeacherAccount = z.object({
  employeeNumber: AccountNumber,
  realName: z.string().trim().min(1, '请输入教师姓名').max(64),
  phone: z.string().trim().max(20).nullable().optional(),
  status: STATUS_ENUM.optional().default('ACTIVE')
}).strict()
const leader = requireRole(ROLES.LAB_LEADER)

function staffContext(req, selectTeacher = false) {
  const store = getStore()
  const lab = store.laboratories.find(item => item.id === Number(req.params.labId))
  if (!lab || !isLabLeader(req, lab)) throw new BusinessError('只能维护本人负责实训室的教师', ResultCode.ROLE_FORBIDDEN, 403)
  const teacher = selectTeacher ? store.users.find(user => user.id === Number(req.params.userId) &&
    user.laboratoryId === lab.id && user.role === ROLES.LAB_TEACHER) : undefined
  if (selectTeacher && !teacher) throw new BusinessError('本室没有该教师账号', ResultCode.NOT_FOUND, 404)
  return { store, lab, teacher }
}

router.get('/labs/:labId/staff', requireAuth, leader, (req, res) => {
  const { store, lab } = staffContext(req)
  res.json(ok(store.users.filter(user => user.laboratoryId === lab.id &&
    [ROLES.LAB_TEACHER, ROLES.LAB_LEADER].includes(user.role)).map(toView)))
})

router.post('/labs/:labId/staff', requireAuth, leader, (req, res) => {
  const { store, lab } = staffContext(req)
  const { employeeNumber, realName, phone, status } = LabTeacherAccount.parse(req.body || {})
  if (accountExists(store.users, employeeNumber)) return res.status(409).json(fail(ResultCode.VALIDATION_FAILED, '工号已存在'))
  const user = { id: nextId(store.users), username: employeeNumber, realName, phone: phone || null,
    role: ROLES.LAB_TEACHER, laboratoryId: lab.id, status, createdAt: new Date().toISOString() }
  installPassword(user, INITIAL_PASSWORD)
  store.users.push(user)
  logOperation(store, req, { operationType: 'CREATE_LAB_STAFF', targetType: 'USER', targetId: user.id, description: '新增本实训室教师账号' })
  persistStore(store)
  res.json(ok(toView(user)))
})

router.put('/labs/:labId/staff/:userId', requireAuth, leader, (req, res) => {
  const { store, teacher } = staffContext(req, true)
  const { employeeNumber, ...profile } = LabTeacherAccount.partial().parse(req.body || {})
  if (employeeNumber && accountExists(store.users, employeeNumber, teacher.id)) {
    return res.status(409).json(fail(ResultCode.VALIDATION_FAILED, '工号已存在'))
  }
  if (employeeNumber && employeeNumber !== teacher.username) {
    teacher.username = employeeNumber
    teacher.studentNumber = null
    teacher.credentialVersion = (teacher.credentialVersion ?? 0) + 1
  }
  if (profile.realName !== undefined) {
    const mentor = store.labTeachers.find(item => item.userId === teacher.id && item.laboratoryId === teacher.laboratoryId)
    if (mentor) mentor.name = profile.realName
  }
  Object.assign(teacher, profile)
  logOperation(store, req, { operationType: 'UPDATE_LAB_STAFF', targetType: 'USER', targetId: teacher.id, description: '修改本实训室教师账号资料' })
  persistStore(store)
  res.json(ok(toView(teacher)))
})

router.post('/labs/:labId/staff/:userId/reset-password', requireAuth, leader, (req, res) => {
  const { store, teacher } = staffContext(req, true)
  installPassword(teacher, INITIAL_PASSWORD)
  logOperation(store, req, { operationType: 'RESET_PASSWORD', targetType: 'USER', targetId: teacher.id, description: '组长重置本室教师密码' })
  persistStore(store)
  res.json(ok(null, '密码已重置'))
})

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
  res.json(ok(paginate(list, req)))
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
      studentNumber: AccountNumber,
      realName: z.string().trim().min(1, '姓名不能为空'),
      phone: z.string().optional().default('')
    })).min(1, '导入数据不能为空')
  }).parse(req.body || {})
  const store = getStore()
  const created = []
  const skipped = []
  body.students.forEach((s) => {
    const { studentNumber } = s
    if (accountExists(store.users, studentNumber)) {
      skipped.push({ studentNumber, realName: s.realName, reason: '学号已存在' })
      return
    }
    const user = {
      id: nextId(store.users),
      username: studentNumber,
      realName: s.realName,
      studentNumber,
      role: ROLES.STUDENT,
      phone: s.phone || null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    installPassword(user, INITIAL_PASSWORD)
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
  if (body.role === ROLES.LAB_TEACHER && body.laboratoryId != null) {
    return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '本室教师由该实训室组长建档'))
  }
  const store = getStore()
  const managed = isManagedAccount(body.role)
  const username = body.role === ROLES.STUDENT
    ? body.studentNumber ?? body.username
    : managed ? body.employeeNumber ?? body.username : body.username
  if (!username) {
    const field = body.role === ROLES.STUDENT ? '学号' : managed ? '工号' : '账号'
    return res.status(400).json(fail(ResultCode.VALIDATION_FAILED, `请输入${field}`))
  }
  if (accountExists(store.users, username)) {
    return res.status(400).json(fail(ResultCode.VALIDATION_FAILED, '账号已存在'))
  }
  const user = {
    id: nextId(store.users),
    username,
    realName: body.realName,
    studentNumber: body.role === ROLES.STUDENT ? username : null,
    role: body.role,
    phone: body.phone || null,
    laboratoryId: body.laboratoryId ?? null,
    status: body.status,
    createdAt: new Date().toISOString()
  }
  const password = managed ? INITIAL_PASSWORD
    : z.string().min(6, '密码至少 6 位').parse(body.password ?? INITIAL_PASSWORD)
  installPassword(user, password)
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
  if (before.role === ROLES.LAB_TEACHER && before.laboratoryId != null) {
    return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '本室教师由该实训室组长维护'))
  }
  const user = { ...before, ...body }
  if (user.role === ROLES.STUDENT && (body.studentNumber !== undefined || before.role !== ROLES.STUDENT)) {
    const studentNumber = user.studentNumber ?? user.username
    if (accountExists(store.users, studentNumber, user.id)) {
      return res.status(400).json(fail(ResultCode.VALIDATION_FAILED, '学号已存在'))
    }
    user.studentNumber = studentNumber
    user.username = studentNumber
  }
  if (before.role !== user.role) {
    if (!isManagedAccount(user.role)) user.mustChangePassword = false
    if (isManagedAccount(user.role) && bcrypt.compareSync(INITIAL_PASSWORD, user.passwordHash)) user.mustChangePassword = true
  }
  store.users[idx] = user
  logOperation(store, req, {
    operationType: 'UPDATE_USER', targetType: 'USER', targetId: before.id,
    description: `修改账号 ${before.username} 资料（${before.realName}）`
  })
  persistStore(store)
  res.json(ok(toView(store.users[idx])))
})

// 重置密码
router.post('/:id/reset-password', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const user = store.users.find((u) => u.id === Number(req.params.id))
  if (!user) return res.status(404).json(fail(ResultCode.NOT_FOUND, '用户不存在'))
  if (user.role === ROLES.LAB_TEACHER && user.laboratoryId != null) {
    return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '本室教师密码由该实训室组长重置'))
  }
  const password = isManagedAccount(user.role) ? INITIAL_PASSWORD
    : z.string().min(6, '密码至少 6 位').parse(req.body?.password || INITIAL_PASSWORD)
  installPassword(user, password)
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
  if (user.role === ROLES.LAB_TEACHER && user.laboratoryId != null) {
    return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '本室教师由该实训室组长维护'))
  }
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
