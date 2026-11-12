import { ERROR_CODES } from '../constants/enums.js'

export function ok(res, data = null, message = 'ok') {
  return res.json({ code: ERROR_CODES.OK, message, data })
}

export function fail(res, message = 'error', code = 1, status = 400) {
  return res.status(status).json({ code, message, data: null })
}

/**
 * 未实现接口的统一占位：返回 501 + 契约位置，避免前端拿到 404 猜字段。
 * 后端同学实现时把 todo(...) 换成真实逻辑即可。
 */
export function todo(res, feature, doc = 'docs/API.md') {
  return res.status(501).json({
    code: ERROR_CODES.NOT_IMPLEMENTED,
    message: `${feature} 尚未实现，契约见 ${doc}`,
    data: null
  })
}

export function notFound(req, res) {
  return res.status(404).json({ code: 404, message: `接口不存在: ${req.method} ${req.originalUrl}`, data: null })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err)
  return res.status(500).json({ code: 500, message: err.message || '服务器内部错误', data: null })
}
