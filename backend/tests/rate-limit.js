/**
 * 限流中间件验收测试（限流开启状态）
 * 运行：node tests/rate-limit.js
 *
 * 覆盖：
 * 1. 通用接口限流：超过阈值返回 429，并带 Retry-After 与 X-RateLimit-* 头
 * 2. 登录失败限流：同一 IP+账号连续失败超阈值后返回 429
 * 3. 限流按「IP + 账号」隔离：别的账号不受影响
 * 4. 登录成功后清零失败计数
 * 5. LAB_RATE_LIMIT=off 可关闭（排障开关有效）
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-match-rate-'))
const { INITIAL_PASSWORD } = require('../utils/accountCredentials')
const PASSWORD = INITIAL_PASSWORD

let passed = 0
const failures = []
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${name}`)
  } else {
    failures.push(`${name}${detail ? ' | ' + detail : ''}`)
    console.log(`  FAIL  ${name}${detail ? ' | ' + detail : ''}`)
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function startServer(port, extraEnv) {
  const store = path.join(TMP, `store-${port}.json`)
  const child = spawn(process.execPath, ['app.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      DB_DRIVER: 'file',
      PORT: String(port),
      LAB_STORE_FILE: store,
      LAB_SEED_DEMO: 'true',
      LAB_RESUME_DIR: path.join(TMP, `resumes-${port}`),
      LAB_BRIEFING_DIR: path.join(TMP, `briefing-${port}`),
      LAB_PROMOTION_DIR: path.join(TMP, `promotion-${port}`),
      LAB_ADMIN_PASSWORD: '',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => {
    const text = d.toString().trim()
    if (text) console.error('[server]', text)
  })
  return child
}

async function waitReady(base, tries = 100) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(`${base}/health`)
      if (res.ok) return true
    } catch { /* retry */ }
    await sleep(150)
  }
  return false
}

async function postLogin(base, username, password) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  let json = null
  try { json = await res.json() } catch { /* ignore */ }
  return {
    status: res.status,
    body: json,
    retryAfter: res.headers.get('retry-after'),
    limit: res.headers.get('x-ratelimit-limit')
  }
}

async function run() {
  // ============ A. 登录失败限流（API 限流放宽，避免互相干扰）============
  console.log('\n== A. 登录失败限流 ==')
  const portLogin = 8121
  const baseLogin = `http://127.0.0.1:${portLogin}/api`
  const loginServer = startServer(portLogin, {
    LOGIN_RATE_MAX: '3',
    API_RATE_MAX: '100000',
    LAB_RATE_LIMIT: ''
  })

  try {
    if (!(await waitReady(baseLogin))) throw new Error('限流测试服务未启动')

    // 连续 3 次错误密码 → 正常 401
    for (let i = 1; i <= 3; i += 1) {
      const res = await postLogin(baseLogin, 'L001', 'definitely-wrong-password')
      check(`第 ${i} 次错误密码返回 401`, res.status === 401, `实际 ${res.status}`)
    }

    // 第 4 次 → 429（已被限流，不再校验密码）
    const blocked = await postLogin(baseLogin, 'L001', 'definitely-wrong-password')
    check('超出阈值后被限流（429）', blocked.status === 429, `实际 ${blocked.status}`)
    check('限流响应带 Retry-After', Boolean(blocked.retryAfter), `实际 ${blocked.retryAfter}`)

    // 即使密码正确，也仍被限流（防止绕过）
    const blockedCorrect = await postLogin(baseLogin, 'L001', PASSWORD)
    check('被限流后正确密码同样被拒绝', blockedCorrect.status === 429, `实际 ${blockedCorrect.status}`)

    // 账号隔离：同一 IP 的其他账号不受影响
    const otherUser = await postLogin(baseLogin, 'T1001', PASSWORD)
    check('限流按 IP+账号隔离，其他账号可正常登录', otherUser.status === 200, `实际 ${otherUser.status}`)
  } finally {
    loginServer.kill()
  }

  // ============ B. 登录成功后清零失败计数 ============
  console.log('\n== B. 成功登录清零计数 ==')
  const portReset = 8122
  const baseReset = `http://127.0.0.1:${portReset}/api`
  const resetServer = startServer(portReset, {
    LOGIN_RATE_MAX: '3',
    API_RATE_MAX: '100000',
    LAB_RATE_LIMIT: ''
  })
  try {
    if (!(await waitReady(baseReset))) throw new Error('清零测试服务未启动')
    const before = await postLogin(baseReset, 'T1002', 'wrong-password-1')
    check('失败 1 次', before.status === 401, `实际 ${before.status}`)
    const ok = await postLogin(baseReset, 'T1002', PASSWORD)
    check('随后成功登录', ok.status === 200, `实际 ${ok.status}`)
    // 计数已清零，还能再失败 3 次才被限流
    let lastStatus = 0
    for (let i = 1; i <= 3; i += 1) {
      const res = await postLogin(baseReset, 'T1002', `wrong-password-again-${i}`)
      lastStatus = res.status
    }
    check('成功登录后失败计数已清零（再失败 3 次仍为 401）', lastStatus === 401, `实际 ${lastStatus}`)
    const nowBlocked = await postLogin(baseReset, 'T1002', 'wrong-password-next')
    check('清零后重新累计到阈值仍会限流', nowBlocked.status === 429, `实际 ${nowBlocked.status}`)
  } finally {
    resetServer.kill()
  }

  // ============ C. 通用接口限流 ============
  console.log('\n== C. 通用接口限流 ==')
  const portApi = 8123
  const baseApi = `http://127.0.0.1:${portApi}/api`
  const apiServer = startServer(portApi, {
    API_RATE_MAX: '25',
    LOGIN_RATE_MAX: '1000',
    LAB_RATE_LIMIT: ''
  })
  try {
    if (!(await waitReady(baseApi))) throw new Error('接口限流测试服务未启动')
    // 预热请求也算入计数，这里以固定次数触发阈值
    let hit429 = false
    let sawLimitHeader = false
    let retryAfter = null
    const startIndex = 0
    for (let i = startIndex; i < 60; i += 1) {
      const res = await fetch(`${baseApi}/health`)
      if (res.headers.get('x-ratelimit-limit')) sawLimitHeader = true
      if (res.status === 429) {
        hit429 = true
        retryAfter = res.headers.get('retry-after')
        break
      }
    }
    check('超过阈值后接口返回 429', hit429)
    check('响应带 X-RateLimit-Limit 头', sawLimitHeader)
    check('429 响应带 Retry-After', Boolean(retryAfter), `实际 ${retryAfter}`)
  } finally {
    apiServer.kill()
  }

  // ============ D. 关闭开关有效 ============
  console.log('\n== D. LAB_RATE_LIMIT=off 关闭限流 ==')
  const portOff = 8124
  const baseOff = `http://127.0.0.1:${portOff}/api`
  const offServer = startServer(portOff, {
    API_RATE_MAX: '5',
    LOGIN_RATE_MAX: '1',
    LAB_RATE_LIMIT: 'off'
  })
  try {
    if (!(await waitReady(baseOff))) throw new Error('关闭限流测试服务未启动')
    let any429 = false
    for (let i = 0; i < 30; i += 1) {
      const res = await fetch(`${baseOff}/health`)
      if (res.status === 429) any429 = true
    }
    check('关闭开关后不再限流', !any429)
    for (let i = 0; i < 5; i += 1) {
      const res = await postLogin(baseOff, 'T1003', 'wrong-password')
      if (res.status === 429) any429 = true
    }
    check('关闭开关后登录失败也不限流', !any429)
  } finally {
    offServer.kill()
  }

  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* ignore */ }

  console.log(`\n===== 限流验收结果：通过 ${passed}，失败 ${failures.length} =====`)
  if (failures.length) {
    failures.forEach((f) => console.log('  FAILED:', f))
    process.exit(1)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
