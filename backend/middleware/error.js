const { send, fail, ResultCode } = require('../utils/result')

// 404 兜底
function notFound(req, res) {
  send(res, fail(ResultCode.NOT_FOUND, `接口不存在：${req.method} ${req.originalUrl}`), 404)
}

// 全局错误处理
function handleError(err, req, res, _next) {
  // Zod 参数校验错误
  if (err && err.name === 'ZodError') {
    const msg = err.issues?.map((i) => `${i.path.join('.')}: ${i.message}`).join('；') || '参数校验失败'
    return send(res, fail(ResultCode.VALIDATION_FAILED, msg), 400)
  }
  // 业务错误
  if (err && err.code && err.message) {
    return send(res, fail(err.code, err.message, err.data || null), err.status || 400)
  }
  console.error('[ERROR]', req.originalUrl, err)
  return send(res, fail(ResultCode.INTERNAL_ERROR, '服务器内部错误'), 500)
}

class BusinessError extends Error {
  constructor(message, code = ResultCode.BUSINESS_ERROR, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

module.exports = { notFound, handleError, BusinessError }
