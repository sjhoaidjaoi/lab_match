// 统一响应格式：{ code, message, data }
// 成功 code = "OK"，失败为字符串错误码（见 ResultCode）

const ResultCode = {
  OK: 'OK',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR'
}

function ok(data, message = 'ok') {
  return { code: ResultCode.OK, message, data }
}

function fail(code, message, data = null) {
  return { code, message, data }
}

function send(res, payload, status = 200) {
  if (payload.code === ResultCode.OK) {
    return res.status(status).json(payload)
  }
  // 失败码映射 HTTP status
  const map = {
    UNAUTHORIZED: 401,
    ROLE_FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_FAILED: 400,
    BUSINESS_ERROR: 400
  }
  const httpStatus = map[payload.code] || 500
  return res.status(httpStatus).json(payload)
}

module.exports = { ResultCode, ok, fail, send }
