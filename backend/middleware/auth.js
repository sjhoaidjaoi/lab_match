const { verify } = require('../utils/hash')
const { fail, ResultCode } = require('../utils/result')

// 从 Authorization: Bearer xxx 解析 token
function extractToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// JWT 鉴权中间件，挂载到 req.user
function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json(fail(ResultCode.UNAUTHORIZED, '未登录或 token 已过期'))
  }
  try {
    const payload = verify(token)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json(fail(ResultCode.UNAUTHORIZED, 'token 无效或已过期'))
  }
}

// 可选鉴权：有 token 就挂载 req.user，没有也放行
function optionalAuth(req, _res, next) {
  const token = extractToken(req)
  if (token) {
    try {
      req.user = verify(token)
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
    // 支持多角色账号：取 X-Role 头指定当前角色，没有则用 payload 里的 activeRole
    const activeRole = req.headers['x-role'] || req.user.activeRole || req.user.role
    if (!activeRole || !allowed.includes(activeRole)) {
      return res.status(403).json(fail(ResultCode.ROLE_FORBIDDEN, `需要角色：${allowed.join('/')}`))
    }
    req.user.activeRole = activeRole
    next()
  }
}

// RBAC 角色常量（严格对齐文档 5.1 节）
const ROLES = {
  STUDENT: 'STUDENT',
  LAB_TEACHER: 'LAB_TEACHER',
  LAB_LEADER: 'LAB_LEADER',
  COLLEGE_ADMIN: 'COLLEGE_ADMIN'
}

module.exports = { requireAuth, optionalAuth, requireRole, ROLES, extractToken }
