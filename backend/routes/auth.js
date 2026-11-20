// ============ 鉴权接口 ============
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me
// POST /api/auth/switch-role

const express = require('express')
const { z } = require('zod')
const bcrypt = require('bcryptjs')
const router = express.Router()
const { ok, fail, ResultCode } = require('../utils/result')
const { sign } = require('../utils/hash')
const { getStore, persistStore } = require('../data/seed')
const { requireAuth, requireAccountAuth, ROLES, allowedRolesOf } = require('../middleware/auth')
const { BusinessError } = require('../middleware/error')
const { logOperation } = require('../utils/audit')
const { INITIAL_PASSWORD, isManagedAccount } = require('../utils/accountCredentials')
const {
  loginThrottle,
  recordLoginFailure,
  clearLoginFailure
} = require('../middleware/rateLimit')

const LoginSchema = z.object({
  username: z.string().trim().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码')
})

router.post('/login', loginThrottle, (req, res) => {
  const { username, password } = LoginSchema.parse(req.body || {})
  const store = getStore()
  const user = store.users.find((u) => u.username === username || u.studentNumber === username)
  if (!user) {
    recordLoginFailure(req)
    throw new BusinessError('账号或密码错误', ResultCode.UNAUTHORIZED, 401)
  }
  if (user.status !== 'ACTIVE') {
    recordLoginFailure(req)
    throw new BusinessError('账号已停用，请联系学院管理员', ResultCode.UNAUTHORIZED, 401)
  }
  const verified = bcrypt.compareSync(password, user.passwordHash)
  if (!verified) {
    recordLoginFailure(req)
    throw new BusinessError('账号或密码错误', ResultCode.UNAUTHORIZED, 401)
  }

  clearLoginFailure(req)
  res.json(ok(sessionFor(user, user.role)))
})

router.post('/logout', requireAccountAuth, (_req, res) => {
  res.json(ok(null, '已退出登录'))
})

// 查看个人信息
router.get('/me', requireAccountAuth, (req, res) => {
  const store = getStore()
  const user = store.users.find((u) => u.id === req.user.uid)
  if (!user) throw new BusinessError('用户不存在', ResultCode.NOT_FOUND, 404)
  res.json(ok(accountInfo(user, req.user.activeRole)))
})

// 修改个人信息（手机号 / 邮箱；姓名与学号由学院统一维护）
router.put('/profile', requireAuth, (req, res) => {
  const body = z.object({
    phone: z.string().max(20).optional().nullable(),
    email: z.string().email('邮箱格式不正确').max(128).optional().nullable().or(z.literal(''))
  }).parse(req.body || {})
  const store = getStore()
  const user = store.users.find((u) => u.id === req.user.uid)
  if (!user) throw new BusinessError('用户不存在', ResultCode.NOT_FOUND, 404)
  if (body.phone !== undefined) user.phone = body.phone || null
  if (body.email !== undefined) user.email = body.email || null
  logOperation(store, req, {
    operationType: 'UPDATE_PROFILE', targetType: 'USER', targetId: user.id,
    description: '修改个人信息（手机号 / 邮箱）'
  })
  persistStore(store)
  res.json(ok({
    id: user.id, username: user.username, realName: user.realName,
    studentNumber: user.studentNumber, role: user.role,
    phone: user.phone, email: user.email ?? null,
    laboratoryId: user.laboratoryId ?? null
  }))
})

// 修改密码
router.put('/password', requireAccountAuth, (req, res) => {
  const body = z.object({
    oldPassword: z.string().min(1, '请输入原密码'),
    newPassword: z.string().min(6, '新密码至少 6 位')
      .refine(password => Buffer.byteLength(password, 'utf8') <= 72, '新密码最多 72 字节')
  }).parse(req.body || {})
  const store = getStore()
  const user = store.users.find((u) => u.id === req.user.uid)
  if (!user) throw new BusinessError('用户不存在', ResultCode.NOT_FOUND, 404)
  if (!bcrypt.compareSync(body.oldPassword, user.passwordHash)) {
    throw new BusinessError('原密码不正确', ResultCode.VALIDATION_FAILED, 400)
  }
  if ((isManagedAccount(user.role) && body.newPassword === INITIAL_PASSWORD) ||
      bcrypt.compareSync(body.newPassword, user.passwordHash)) {
    throw new BusinessError('新密码不能与当前密码或初始密码相同', ResultCode.VALIDATION_FAILED, 400)
  }
  user.passwordHash = bcrypt.hashSync(body.newPassword, 10)
  user.mustChangePassword = false
  user.credentialVersion = (user.credentialVersion ?? 0) + 1
  logOperation(store, req, {
    operationType: 'CHANGE_PASSWORD', targetType: 'USER', targetId: user.id,
    description: '修改登录密码'
  })
  persistStore(store)
  res.json(ok(sessionFor(user, req.user.activeRole), '密码已修改'))
})

// 角色切换（多角色账号）
router.post('/switch-role', requireAuth, (req, res) => {
  const roleCode = z.string().parse(req.body?.roleCode || '')
  const store = getStore()
  const user = store.users.find((u) => u.id === req.user.uid)
  if (!user) throw new BusinessError('用户不存在', ResultCode.NOT_FOUND, 404)

  const allowed = allowedRolesOf(user)
  if (!allowed.includes(roleCode)) {
    throw new BusinessError(`该账号不支持切换到 ${roleCode}`, ResultCode.ROLE_FORBIDDEN, 403)
  }

  res.json(ok(sessionFor(user, roleCode)))
})

// 账号列表（COLLEGE_ADMIN）
router.get('/users', requireAuth, (req, res) => {
  if (req.user.activeRole !== ROLES.COLLEGE_ADMIN) {
    return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '只有学院管理员可查看'))
  }
  const store = getStore()
  const keyword = (req.query.keyword || '').toString().trim()
  const list = store.users.filter((u) => {
    if (!keyword) return true
    return (
      u.username.includes(keyword) ||
      u.realName.includes(keyword) ||
      (u.studentNumber || '').includes(keyword)
    )
  }).map((u) => ({
    id: u.id, username: u.username, realName: u.realName,
    studentNumber: u.studentNumber, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt
  }))
  res.json(ok(list))
})

function accountInfo(user, activeRole) {
  return {
    user: {
      id: user.id, username: user.username, realName: user.realName,
      studentNumber: user.studentNumber, role: user.role, phone: user.phone,
      email: user.email ?? null, laboratoryId: user.laboratoryId ?? null,
      mustChangePassword: Boolean(user.mustChangePassword)
    },
    roles: allowedRolesOf(user).map(roleCode => ({ roleCode, roleName: roleLabel(roleCode) })),
    activeRole
  }
}

function sessionFor(user, activeRole) {
  const info = accountInfo(user, activeRole)
  return {
    ...info,
    token: sign({
      uid: user.id, username: user.username, activeRole,
      roles: info.roles.map(role => role.roleCode),
      credentialVersion: user.credentialVersion ?? 0
    })
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

module.exports = router
