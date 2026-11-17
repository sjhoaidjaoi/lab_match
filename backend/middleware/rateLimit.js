// ============ 轻量接口限流 ============
// 目标：不引入额外依赖，防止暴力破解与接口被刷。
// 两个层次：
//   1) 登录失败限流（loginThrottle）：按 IP + 账号统计「失败次数」，成功即清零。
//      只对失败计数，正常登录不受影响，避免误伤自动化测试与批量导入。
//   2) 通用接口限流（apiThrottle）：按 IP 的滑动窗口，防止单来源高频刷接口。
//
// 说明：
// - 计数保存在进程内存，多实例部署时每个实例独立计数；面向单机部署足够，
//   若将来做多实例，应换 Redis 等共享存储（本阶段按现有部署形态实现）。
// - 过期键会被惰性清理，避免长期运行内存膨胀。
// - 通过 LAB_RATE_LIMIT=off 可整体关闭（仅限本地排障，生产不要关闭）。

const { fail, ResultCode } = require('../utils/result')

const DISABLED = String(process.env.LAB_RATE_LIMIT || '').toLowerCase() === 'off'

function clientIp(req) {
  // 仅在显式信任反向代理时才采信 X-Forwarded-For，避免伪造头绕过限流
  if (String(process.env.TRUST_PROXY || '') === '1') {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim()
    return req.ip
  }
  return req.ip
}

function createBucketStore(windowMs) {
  const buckets = new Map()
  let lastSweep = Date.now()
  function sweep(now) {
    // 每分钟最多清理一次，避免每次请求都遍历
    if (now - lastSweep < 60 * 1000) return
    lastSweep = now
    for (const [key, item] of buckets) {
      if (item.resetAt <= now) buckets.delete(key)
    }
  }
  return {
    hit(key, now, amount = 1) {
      sweep(now)
      let item = buckets.get(key)
      if (!item || item.resetAt <= now) {
        item = { count: 0, resetAt: now + windowMs }
        buckets.set(key, item)
      }
      item.count += amount
      return item
    },
    get(key, now) {
      const item = buckets.get(key)
      if (!item || item.resetAt <= now) return null
      return item
    },
    clear(key) {
      buckets.delete(key)
    },
    size() {
      return buckets.size
    }
  }
}

// ---- 通用接口限流：默认 3000 次 / 分钟 / IP ----
// 管理系统的正常操作远低于该量级；阈值主要拦截脚本刷接口，
// 不针对真实用户做严格节流，避免误伤批量导入/列表轮询。
const apiWindowMs = Number(process.env.API_RATE_WINDOW_MS) || 60 * 1000
const apiMax = Number(process.env.API_RATE_MAX) || 3000
const apiStore = createBucketStore(apiWindowMs)

function apiThrottle(req, res, next) {
  if (DISABLED) return next()
  const now = Date.now()
  const ip = clientIp(req)
  const bucket = apiStore.hit(ip, now)
  res.setHeader('X-RateLimit-Limit', String(apiMax))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, apiMax - bucket.count)))
  if (bucket.count > apiMax) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json(fail(ResultCode.BUSINESS_ERROR, '请求过于频繁，请稍后再试', null))
  }
  return next()
}

// ---- 登录失败限流：默认 10 次失败 / 10 分钟 /（IP + 账号）----
const loginWindowMs = Number(process.env.LOGIN_RATE_WINDOW_MS) || 10 * 60 * 1000
const loginMax = Number(process.env.LOGIN_RATE_MAX) || 10
const loginStore = createBucketStore(loginWindowMs)

function loginKey(req) {
  const username = String((req.body && req.body.username) || '').trim().toLowerCase()
  return `${clientIp(req)}|${username}`
}

// 在登录接口之前调用：已超出失败次数则直接拒绝
function loginThrottle(req, res, next) {
  if (DISABLED) return next()
  const item = loginStore.get(loginKey(req), Date.now())
  if (item && item.count >= loginMax) {
    const retryAfter = Math.max(1, Math.ceil((item.resetAt - Date.now()) / 1000))
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json(
      fail(ResultCode.BUSINESS_ERROR, '登录失败次数过多，请稍后再试', null)
    )
  }
  return next()
}

// 登录失败时记录一次；成功时清零
function recordLoginFailure(req) {
  if (DISABLED) return
  loginStore.hit(loginKey(req), Date.now())
}

function clearLoginFailure(req) {
  if (DISABLED) return
  loginStore.clear(loginKey(req))
}

module.exports = {
  apiThrottle,
  loginThrottle,
  recordLoginFailure,
  clearLoginFailure
}
