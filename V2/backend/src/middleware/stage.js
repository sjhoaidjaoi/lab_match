import { getCurrentStage } from '../services/stage.service.js'
import { ERROR_CODES } from '../constants/enums.js'

/**
 * 阶段门禁：写操作必须处于允许的阶段。
 * 前端禁用按钮只是体验，这里才是真正的防线。
 *
 * 用法：router.post('/admissions/submit', requireStage(5), handler)
 */
export function requireStage(...allowed) {
  return (req, res, next) => {
    const current = getCurrentStage()
    if (!current || !allowed.includes(current.no)) {
      return res.status(409).json({
        code: ERROR_CODES.STAGE_CLOSED,
        message: current
          ? `当前为第 ${current.no} 阶段（${current.name}），该操作仅在阶段 ${allowed.join('/')} 开放`
          : `当前不在任何选拔阶段，该操作仅在阶段 ${allowed.join('/')} 开放`,
        data: current ? { currentStage: current.no } : null
      })
    }
    req.stage = current
    return next()
  }
}
