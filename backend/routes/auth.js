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
const { requireAuth, ROLES } = require('../middleware/auth')
const { BusinessError } = require('../middleware/error')

const LoginSchema = z.object({
  username: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码')
})

router.post('/login', (req, res) => {
  const { username, password } = LoginSchema.parse(req.body || {})
  const store = getStore()
  const user = store.users.find((u) => u.username === username || u.studentNumber === username)
  if (!user) {
    throw new BusinessError('账号或密码错误', ResultCode.UNAUTHORIZED, 401)
  }
  if (user.status !== 'ACTIVE') {
    throw new BusinessError('账号已停用，请联系学院管理员', ResultCode.UNAUTHORIZED, 401)
  }
  const verified = bcrypt.compareSync(password, user.passwordHash)
  if (!verified) {
    throw new BusinessError('账号或密码错误', ResultCode.UNAUTHORIZED, 401)
  }

  // 多角色支持：LAB_LEADER 同时是 LAB_TEACHER，可切换
  const roles = [{ roleCode: user.role, roleName: roleLabel(user.role) }]
  if (user.role === ROLES.LAB_LEADER) {
    roles.push({ roleCode: ROLES.LAB_TEACHER, roleName: roleLabel(ROLES.LAB_TEACHER) })
  }

  const token = sign({
    uid: user.id,
    username: user.username,
    activeRole: user.role,
    roles: roles.map((r) => r.roleCode)
  })

  res.json(ok({
    token,
    user: {
      id: user.id, username: user.username, realName: user.realName,
      studentNumber: user.studentNumber, role: user.role, phone: user.phone
    },
    roles,
    activeRole: user.role
  }))
})

router.post('/logout', requireAuth, (_req, res) => {
  res.json(ok(null, '已退出登录'))
})

router.get('/me', requireAuth, (req, res) => {
  const store = getStore()
  const user = store.users.find((u) => u.id === req.user.uid)
  if (!user) throw new BusinessError('用户不存在', ResultCode.NOT_FOUND, 404)
  const roles = [{ roleCode: user.role, roleName: roleLabel(user.role) }]
  if (user.role === ROLES.LAB_LEADER) {
    roles.push({ roleCode: ROLES.LAB_TEACHER, roleName: roleLabel(ROLES.LAB_TEACHER) })
  }
  res.json(ok({
    user: { id: user.id, username: user.username, realName: user.realName, studentNumber: user.studentNumber, role: user.role, phone: user.phone },
    roles,
    activeRole: req.user.activeRole || user.role
  }))
})

// 角色切换（多角色账号）
router.post('/switch-role', requireAuth, (req, res) => {
  const roleCode = z.string().parse(req.body?.roleCode || '')
  const store = getStore()
  const user = store.users.find((u) => u.id === req.user.uid)
  if (!user) throw new BusinessError('用户不存在', ResultCode.NOT_FOUND, 404)

  const allowed = [user.role]
  if (user.role === ROLES.LAB_LEADER) allowed.push(ROLES.LAB_TEACHER)
  if (!allowed.includes(roleCode)) {
    throw new BusinessError(`该账号不支持切换到 ${roleCode}`, ResultCode.ROLE_FORBIDDEN, 403)
  }

  const token = sign({ uid: user.id, username: user.username, activeRole: roleCode, roles: allowed })
  res.json(ok({
    token,
    user: { id: user.id, username: user.username, realName: user.realName, studentNumber: user.studentNumber, role: user.role, phone: user.phone },
    roles: allowed.map((r) => ({ roleCode: r, roleName: roleLabel(r) })),
    activeRole: roleCode
  }))
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

function roleLabel(code) {
  return ({
    STUDENT: '学生',
    LAB_TEACHER: '实训室教师',
    LAB_LEADER: '实训室组长',
    COLLEGE_ADMIN: '学院总负责人'
  })[code] || code
}

module.exports = router
