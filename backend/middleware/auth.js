const { verify } = require('../utils/hash')
const { fail, ResultCode } = require('../utils/result')
const { getStore } = require('../data/seed')

// 从 Authorization: Bearer xxx 解析 token
function extractToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// RBAC 角色常量（严格对齐文档 5.1 节）
const ROLES = {
  STUDENT: 'STUDENT',
  LAB_TEACHER: 'LAB_TEACHER',
  LAB_LEADER: 'LAB_LEADER',
  COLLEGE_ADMIN: 'COLLEGE_ADMIN'
}

// 账号实际拥有的角色（组长同时具备教师权限）
function allowedRolesOf(user) {
  const roles = [user.role]
  if (user.role === ROLES.LAB_LEADER) roles.push(ROLES.LAB_TEACHER)
  return roles
}

// JWT 鉴权中间件，挂载 req.user
// 注意：角色必须以数据库中的账号角色为准，不能信任客户端发送的 X-Role
function requireAuth(req, res, next) {
  return authenticate(req, res, next, false)
}

function requireAccountAuth(req, res, next) {
  return authenticate(req, res, next, true)
}

function hasCurrentCredentials(user, payload) {
  const createdAt = Date.parse(user.createdAt)
  return payload.username === user.username &&
    (!Number.isFinite(createdAt) || payload.iat >= Math.floor(createdAt / 1000)) &&
    (payload.credentialVersion ?? 0) === (user.credentialVersion ?? 0)
}

function authenticate(req, res, next, allowPendingPassword) {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json(fail(ResultCode.UNAUTHORIZED, '未登录或 token 已过期'))
  }
  let payload
  try {
    payload = verify(token)
  } catch (err) {
    return res.status(401).json(fail(ResultCode.UNAUTHORIZED, 'token 无效或已过期'))
  }
  const store = getStore()
  const user = store.users.find((u) => u.id === payload.uid)
  if (!user) {
    return res.status(401).json(fail(ResultCode.UNAUTHORIZED, '账号不存在'))
  }
  if (!hasCurrentCredentials(user, payload)) {
    return res.status(401).json(fail(ResultCode.UNAUTHORIZED, '登录会话已失效，请重新登录'))
  }
  if (user.status !== 'ACTIVE') {
    return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '账号已停用'))
  }
  if (user.mustChangePassword && !allowPendingPassword) {
    return res.status(403).json(fail(ResultCode.PASSWORD_CHANGE_REQUIRED, '请先修改初始密码'))
  }
  const roles = allowedRolesOf(user)
  const requested = req.headers['x-role'] || payload.activeRole || user.role
  req.user = {
    uid: user.id,
    username: user.username,
    actualRole: user.role,
    roles,
    activeRole: roles.includes(requested) ? requested : user.role,
    laboratoryId: user.laboratoryId ?? null
  }
  return next()
}

// 可选鉴权：有 token 就挂载 req.user，没有也放行
function optionalAuth(req, _res, next) {
  const token = extractToken(req)
  if (token) {
    try {
      const payload = verify(token)
      const store = getStore()
      const user = store.users.find((u) => u.id === payload.uid)
      if (user && user.status === 'ACTIVE' && !user.mustChangePassword && hasCurrentCredentials(user, payload)) {
        const roles = allowedRolesOf(user)
        const requested = req.headers['x-role'] || payload.activeRole || user.role
        req.user = {
          uid: user.id,
          username: user.username,
          actualRole: user.role,
          roles,
          activeRole: roles.includes(requested) ? requested : user.role,
          laboratoryId: user.laboratoryId ?? null
        }
      }
    } catch {
      // 忽略
    }
  }
  next()
}

// 角色守卫：允许一个或多个角色
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(fail(ResultCode.UNAUTHORIZED, '未登录'))
    }
    const activeRole = req.user.activeRole
    if (!activeRole || !req.user.roles.includes(activeRole) || !allowed.includes(activeRole)) {
      return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, `需要角色：${allowed.join('/')}`))
    }
    next()
  }
}

// 实训室数据范围：学院管理员可访问全部；教师/组长只能访问本人所属实训室
function canAccessLab(req, labId) {
  if (!req.user) return false
  if (req.user.roles.includes(ROLES.COLLEGE_ADMIN)) return true
  return req.user.laboratoryId !== null && Number(req.user.laboratoryId) === Number(labId)
}

function isLabLeader(req, lab) {
  return req.user?.activeRole === ROLES.LAB_LEADER && req.user.laboratoryId === lab.id &&
    (lab.leaderId == null || lab.leaderId === req.user.uid)
}

// 在路由中直接返回 403（便于一行调用）
function guardLab(req, res, labId) {
  if (canAccessLab(req, labId)) return true
  res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, '无权访问其他实训室的数据'))
  return false
}

module.exports = {
  requireAuth, requireAccountAuth, optionalAuth, requireRole, ROLES,
  extractToken, canAccessLab, guardLab, allowedRolesOf, isLabLeader
}
