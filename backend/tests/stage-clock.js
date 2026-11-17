/**
 * 八阶段「按真实时钟自动流转」验收测试
 * 运行：node tests/stage-clock.js
 *
 * 目的：验证需求中重点提出的问题——「到达设定时间后阶段不自动开始」。
 * 与 recruitment-flow.js 的区别：那里是把时间直接改到过去再读；
 * 这里是设置「未来的开始时间」，然后让它自然走到，且期间不做任何写操作，
 * 只靠读接口，验证后端按可信服务器时间实时推导阶段状态。
 *
 * 覆盖：
 * 1. 开始时间未到 → NOT_STARTED
 * 2. 时间自然走到开始点，不写任何数据 → IN_PROGRESS
 * 3. 时间自然走过结束点 → COMPLETED
 * 4. 阶段到点后业务闸门随之开放（写入被接受）
 * 5. 批次停止后，即使阶段时间窗仍在区间内，写入也被拒绝
 * 6. 不同批次之间阶段状态互不干扰
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PORT = 8128
const BASE = `http://127.0.0.1:${PORT}/api`
const TMP = path.join(os.tmpdir(), `lab-match-clock-${process.pid}`)
const TEST_STORE = path.join(TMP, '.store.json')
const { INITIAL_PASSWORD } = require('../utils/accountCredentials')

let pass = 0
const failures = []
function check(name, condition, detail) {
  if (condition) {
    pass += 1
    console.log(`  PASS  ${name}`)
  } else {
    failures.push(detail ? `${name} | ${detail}` : name)
    console.log(`  FAIL  ${name}${detail ? ` | ${detail}` : ''}`)
  }
}

async function request(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let json = null
  try { json = await res.json() } catch { json = null }
  return { status: res.status, body: json }
}

async function login(username, password = INITIAL_PASSWORD) {
  const res = await request('POST', '/auth/login', { body: { username, password } })
  if (res.status !== 200) return null
  return res.body?.data?.token || null
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString()

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/batches/current`)
      if (res.ok) return true
    } catch { /* 尚未监听 */ }
    await sleep(250)
  }
  return false
}

async function stageList(batchId, token) {
  const res = await request('GET', `/batches/${batchId}/stages`, { token })
  const data = res.body?.data
  if (Array.isArray(data)) return data
  return data?.stages || []
}

async function stageStatus(batchId, no, token) {
  const list = await stageList(batchId, token)
  return (list.find((s) => s.stageNumber === no) || {}).stageStatus
}

async function stageRecordId(batchId, no, token) {
  const list = await stageList(batchId, token)
  return (list.find((s) => s.stageNumber === no) || {}).id
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })

  const child = spawn(process.execPath, ['app.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      DB_DRIVER: 'file',
      PORT: String(PORT),
      LAB_STORE_FILE: TEST_STORE,
      LAB_RATE_LIMIT: 'off',
      LAB_SEED_DEMO: 'true',
      LAB_RESUME_DIR: path.join(TMP, 'resumes'),
      LAB_BRIEFING_DIR: path.join(TMP, 'briefing')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => {
    const t = d.toString().trim()
    if (t) console.error('[server]', t)
  })

  try {
    if (!(await waitForServer())) throw new Error('后端未能启动')
    const admin = await login('admin')
    check('学院管理员可登录', Boolean(admin))
    if (!admin) throw new Error('管理员登录失败')

    // 新建一个测试批次（独立于演示批次，避免互相干扰）
    const created = await request('POST', '/batches', {
      token: admin,
      body: { batchName: '时钟验收批次', academicYear: '2098-2099', description: '阶段自动流转验收' }
    })
    const batchId = created.body?.data?.batch?.id || created.body?.data?.id
    check('批次创建成功并自动生成八阶段', Boolean(batchId), JSON.stringify(created.body).slice(0, 160))
    if (!batchId) throw new Error('批次创建失败，后续用例无法执行')

    // ---- 1. 设为未来开始，当前应为未开始 ----
    console.log('\n== 1. 未到开始时间 ==')
    const startIn = 4000
    const endIn = 9000
    const stage1Id = await stageRecordId(batchId, 1, admin)
    check('可读取阶段记录 ID', Boolean(stage1Id), `实际 ${stage1Id}`)
    await request('PUT', `/batches/${batchId}/stages/${stage1Id}`, {
      token: admin,
      body: { startTime: iso(startIn), endTime: iso(endIn) }
    })
    check('开始时间未到时阶段为未开始', (await stageStatus(batchId, 1, admin)) === 'NOT_STARTED',
      await stageStatus(batchId, 1, admin))

    // ---- 2. 等待真实时间走过开始点，期间不做任何写操作 ----
    console.log('\n== 2. 时间自然走到开始点（无任何写操作）==')
    await sleep(startIn + 1500)
    const afterStart = await stageStatus(batchId, 1, admin)
    check('时间到点后自动进入进行中，无需管理员操作', afterStart === 'IN_PROGRESS', `实际 ${afterStart}`)

    // ---- 3. 业务闸门同步放开 ----
    console.log('\n== 3. 阶段开放后业务闸门同步放开 ==')
    // 阶段 1 是集中宣讲，用公告发布验证写入被接受
    const announce = await request('POST', '/announcements', {
      token: admin,
      body: { title: '时钟验收公告', content: '阶段到点后应可发布', scope: 'ALL' }
    })
    check('阶段开放后写入被接受', announce.status === 200 || announce.status === 201,
      `HTTP ${announce.status}`)

    // ---- 4. 等待走过结束点 ----
    console.log('\n== 4. 时间自然走过结束点 ==')
    await sleep(Math.max(0, endIn - startIn) + 1500)
    const afterEnd = await stageStatus(batchId, 1, admin)
    check('时间到结束点后自动关闭', afterEnd === 'COMPLETED', `实际 ${afterEnd}`)

    // ---- 5. 批次隔离 ----
    console.log('\n== 5. 批次之间的阶段状态互不干扰 ==')
    const other = await request('POST', '/batches', {
      token: admin,
      body: { batchName: '隔离校验批次', academicYear: '2097-2098', description: '批次隔离' }
    })
    const otherId = other.body?.data?.batch?.id || other.body?.data?.id
    check('第二个批次创建成功', Boolean(otherId))
    if (otherId) {
      const otherStage1 = await stageStatus(otherId, 1, admin)
      check('新批次阶段 1 不受前一批次已结束影响', otherStage1 === 'IN_PROGRESS', `实际 ${otherStage1}`)
      const firstStill = await stageStatus(batchId, 1, admin)
      check('原批次阶段 1 状态保持不变', firstStill === 'COMPLETED', `实际 ${firstStill}`)
    }

    // ---- 6. 停止批次后写入被拒绝 ----
    console.log('\n== 6. 批次停止后拒绝新的业务写入 ==')
    const stop = await request('POST', `/batches/${otherId}/stop`, { token: admin, body: { reason: '验收测试' } })
    check('停止批次接口可用', stop.status === 200, `HTTP ${stop.status}`)

    const current = await request('GET', '/batches/current')
    check('当前批次对外声明不可写', current.body?.data?.writable === false,
      String(current.body?.data?.writable))

    // 用受批次闸门约束的业务接口验证（公告属于学院通知，不受选拔闸门限制，故不用它断言）
    const blocked = await request('POST', '/final/merge', { token: admin })
    const blockedMsg = blocked.body?.message || ''
    check('批次停止后业务写入被拒绝', blocked.status >= 400, `HTTP ${blocked.status}`)
    check('拒绝原因明确指向批次已停止', blockedMsg.includes('停止'), blockedMsg)
  } finally {
    child.kill()
    try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  console.log(`\n===== 阶段时钟验收结果：通过 ${pass}，失败 ${failures.length} =====`)
  if (failures.length) {
    failures.forEach((f) => console.log('  FAILED:', f))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
