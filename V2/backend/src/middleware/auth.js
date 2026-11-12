import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-only-secret'

export function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ code: 401, message: '未登录', data: null })
  try {
    req.user = jwt.verify(token, SECRET)
    return next()
  } catch {
    return res.status(401).json({ code: 401, message: '登录已失效', data: null })
  }
}

/**
 * 角色鉴权。组长继承教师权限，所以写 teacher 时要把 LAB_LEADER 一起放行。
 * 例：requireRole('LAB_TEACHER', 'LAB_LEADER')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ code: 401, message: '未登录', data: null })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '无权访问该资源', data: null })
    }
    return next()
  }
}

/**
 * 防越权：实训室数据一律以 token 中的 laboratoryId 为准，
 * 不信任前端传入的 labId（除学院负责人外）。
 */
export function scopeLab(req, res, next) {
  const { role, laboratoryId } = req.user || {}
  if (role === 'COLLEGE_ADMIN') return next()
  const paramLabId = Number(req.params.labId || req.body.laboratoryId || req.query.laboratoryId)
  if (paramLabId && Number(laboratoryId) !== paramLabId) {
    return res.status(403).json({ code: 403, message: '不能访问其他实训室数据', data: null })
  }
  req.labId = Number(laboratoryId)
  return next()
}
