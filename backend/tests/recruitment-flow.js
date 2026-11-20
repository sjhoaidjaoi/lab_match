// ============ 选拔流程 / 批次停止 / 分级账号 验收测试 ============
// 独立于 api.smoke.js：使用全新演示数据副本，验证阶段自动流转、批次停止、四端账号分级。
// 运行：npm run test:flow

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PORT = 8098
const BASE = `http://127.0.0.1:${PORT}/api`
const TMP = path.join(os.tmpdir(), `lab-match-flow-${process.pid}`)
const TEST_STORE = path.join(TMP, '.store.json')
const PASSWORD = '123456'

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

async function login(username, password = PASSWORD) {
  const res = await request('POST', '/auth/login', { body: { username, password } })
  return res.body?.data?.token || null
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString()

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
  child.stderr.on('data', (data) => console.error('[server]', data.toString().trim()))

  try {
    if (!(await waitForServer())) throw new Error('后端未能启动')

    const admin = await login('admin')
    check('学院管理员可登录', Boolean(admin))
    if (!admin) throw new Error('管理员登录失败，后续用例无法执行')

    // ========== 一、阶段自动流转 ==========
    console.log('\n== 一、八阶段时间窗自动流转 ==')
    // 先清场：停掉演示数据里既有的批次，保证"当前批次"就是本次验收批次
    const existing = (await request('GET', '/batches', { token: admin })).body?.data || []
    for (const batch of existing) {
      if (batch.status === 'STOPPED') continue
      await request('POST', `/batches/${batch.id}/stop`, { token: admin, body: { reason: '验收前清理演示批次' } })
    }
    const created = await request('POST', '/batches', {
      token: admin,
      body: { batchName: '流程验收批次', academicYear: '2099-2100', description: '自动化验收' }
    })
    const batchId = created.body?.data?.id
    check('创建批次成功', Boolean(batchId), JSON.stringify(created.body?.message))
    if (!batchId) throw new Error('批次创建失败')

    let stages = (await request('GET', `/batches/${batchId}/stages`, { token: admin })).body?.data || []
    check('自动生成八阶段', stages.length === 8, `实际 ${stages.length}`)
    check('首阶段创建即进入时间窗', stages[0]?.stageStatus === 'IN_PROGRESS', stages[0]?.stageStatus)
    check('后续阶段初始为未开始', stages.slice(1).every((s) => s.stageStatus === 'NOT_STARTED'))

    const stageOf = (no) => stages.find((s) => s.stageNumber === no)
    const saveStage = (no, body) => request('PUT', `/batches/${batchId}/stages/${stageOf(no).id}`, { token: admin, body })
    const reload = async () => {
      stages = (await request('GET', `/batches/${batchId}/stages`, { token: admin })).body?.data || []
      return stages
    }

    // 阶段 1 到点自动开始
    await saveStage(1, { startTime: iso(-60 * 60 * 1000), endTime: iso(60 * 60 * 1000) })
    await reload()
    check('阶段 1 到点自动进入进行中', stageOf(1).stageStatus === 'IN_PROGRESS', stageOf(1).stageStatus)

    // 阶段 1 超时自动结束（不依赖管理员点按钮）
    await saveStage(1, { startTime: iso(-120 * 60 * 1000), endTime: iso(-1000) })
    await reload()
    check('阶段 1 超时自动结束', stageOf(1).stageStatus === 'COMPLETED', stageOf(1).stageStatus)

    // 阶段 2 暂停后不被自动推导覆盖
    await saveStage(2, { startTime: iso(-60 * 60 * 1000), endTime: iso(60 * 60 * 1000), stageStatus: 'PAUSED' })
    await reload()
    check('阶段 2 可人工暂停', stageOf(2).stageStatus === 'PAUSED', stageOf(2).stageStatus)
    await sleep(1200)
    await reload()
    check('暂停状态不被时间窗自动覆盖', stageOf(2).stageStatus === 'PAUSED', stageOf(2).stageStatus)

    // 恢复后回到时间窗判定
    await saveStage(2, { stageStatus: 'IN_PROGRESS' })
    await reload()
    check('恢复后按时间窗判定为进行中', stageOf(2).stageStatus === 'IN_PROGRESS', stageOf(2).stageStatus)

    // 提前结束（人工干预，窗口未到也生效）
    await saveStage(3, { startTime: iso(2 * 60 * 60 * 1000), endTime: iso(4 * 60 * 60 * 1000), stageStatus: 'COMPLETED' })
    await reload()
    check('管理员可提前结束阶段', stageOf(3).stageStatus === 'COMPLETED', stageOf(3).stageStatus)
    await saveStage(3, { stageStatus: 'NOT_STARTED' })
    await reload()
    check('撤销提前结束后回到未开始', stageOf(3).stageStatus === 'NOT_STARTED', stageOf(3).stageStatus)

    // 时间校验
    const badRange = await saveStage(4, { startTime: iso(3 * 60 * 60 * 1000), endTime: iso(1 * 60 * 60 * 1000) })
    check('开始时间晚于结束时间被拒绝', badRange.status === 400, `HTTP ${badRange.status}`)
    const inverted = await saveStage(4, { startTime: iso(-5 * 60 * 60 * 1000), endTime: iso(2 * 60 * 60 * 1000) })
    check('阶段开始时间不能早于上一阶段', inverted.status === 400, `HTTP ${inverted.status}`)

    // ========== 二、批次停止 ==========
    console.log('\n== 二、批次停止与恢复 ==')
    const current = await request('GET', '/batches/current')
    check('接口实时返回可写状态', typeof current.body?.data?.writable === 'boolean')

    const noReason = await request('POST', `/batches/${batchId}/stop`, { token: admin, body: { reason: '' } })
    check('停止批次必须填写原因', noReason.status === 400, `HTTP ${noReason.status}`)

    const stopped = await request('POST', `/batches/${batchId}/stop`, { token: admin, body: { reason: '验收测试：终止本次选拔' } })
    check('停止批次成功', stopped.body?.data?.status === 'STOPPED', JSON.stringify(stopped.body?.data?.status))
    check('停止后状态文案为已停止', stopped.body?.data?.statusLabel === '已停止', stopped.body?.data?.statusLabel)

    const again = await request('POST', `/batches/${batchId}/stop`, { token: admin, body: { reason: '重复停止' } })
    check('重复停止被拒绝', again.status === 409, `HTTP ${again.status}`)

    const listAfterStop = await request('GET', '/batches', { token: admin })
    const stoppedRow = (listAfterStop.body?.data || []).find((b) => b.id === batchId)
    check('批次列表同步为已停止', stoppedRow?.status === 'STOPPED', stoppedRow?.status)
    check('已停止批次标记不可写', stoppedRow?.writable === false, String(stoppedRow?.writable))

    const stagesFrozen = await request('GET', `/batches/${batchId}/stages`, { token: admin })
    check('停止后阶段数据保留', (stagesFrozen.body?.data || []).length === 8)

    const writeBlocked = await request('POST', '/final/merge', { token: admin })
    check('停止后业务写入被拒绝', writeBlocked.status >= 400, `HTTP ${writeBlocked.status}`)

    const reopened = await request('POST', `/batches/${batchId}/reopen`, { token: admin, body: { reason: '验收测试：恢复批次' } })
    check('受控流程可恢复批次', reopened.body?.data?.status === 'IN_PROGRESS', JSON.stringify(reopened.body?.message || reopened.body?.data?.status))

    // ========== 三、分级账号管理 ==========
    console.log('\n== 三、四端分级账号 ==')
    const labRes = await request('POST', '/laboratories', { token: admin, body: { name: '验收测试实训室' } })
    const labId = labRes.body?.data?.id
    check('学院可新建实训室', Boolean(labId), String(labRes.body?.message))

    const leaderBody = (username) => ({
      username, employeeNumber: username, realName: `验收组长${username}`, password: PASSWORD,
      role: 'LAB_LEADER', laboratoryId: labId, status: 'ACTIVE'
    })
    const leaderCreated = await request('POST', '/users', { token: admin, body: leaderBody('L7001') })
    check('学院可创建组长并绑定实训室', leaderCreated.body?.data?.laboratoryId === labId, JSON.stringify(leaderCreated.body?.message))

    const dupLeader = await request('POST', '/users', { token: admin, body: leaderBody('L7002') })
    check('一个实训室只能有一名有效组长', dupLeader.status === 409, `HTTP ${dupLeader.status}`)

    const noLab = await request('POST', '/users', {
      token: admin,
      body: { username: 'L7003', employeeNumber: 'L7003', realName: '无室组长', password: PASSWORD, role: 'LAB_LEADER', status: 'ACTIVE' }
    })
    check('组长必须绑定实训室', noLab.status === 400, `HTTP ${noLab.status}`)

    const leaderTokenRaw = await login('L7001')
    check('新建组长可登录', Boolean(leaderTokenRaw))
    // 首次登录必须改密后才能办理业务
    const changed = await request('PUT', '/auth/password', {
      token: leaderTokenRaw, body: { oldPassword: PASSWORD, newPassword: 'L7001pass' }
    })
    check('首次登录可修改初始密码', changed.status === 200, JSON.stringify(changed.body?.message))
    const leaderToken = await login('L7001', 'L7001pass')
    check('改密后组长可正常登录', Boolean(leaderToken))

    const staffCreated = await request('POST', `/users/labs/${labId}/staff`, {
      token: leaderToken, body: { employeeNumber: 'T7001', realName: '验收教师', phone: '', status: 'ACTIVE' }
    })
    check('组长可创建本室教师账号', staffCreated.body?.data?.username === 'T7001', JSON.stringify(staffCreated.body?.message))
    const staffId = staffCreated.body?.data?.id

    const otherLab = (await listLabs(admin)).find((l) => l.id !== labId)
    if (otherLab) {
      const crossLab = await request('POST', `/users/labs/${otherLab.id}/staff`, {
        token: leaderToken, body: { employeeNumber: 'T7002', realName: '越权教师', phone: '', status: 'ACTIVE' }
      })
      check('组长不能管理其他实训室教师', crossLab.status === 403, `HTTP ${crossLab.status}`)
    }

    const forbidden = await request('GET', '/users', { token: leaderToken })
    check('组长无权读取全院账号列表', forbidden.status === 403, `HTTP ${forbidden.status}`)

    if (staffId) {
      const disabled = await request('PUT', `/users/labs/${labId}/staff/${staffId}/status`, { token: leaderToken, body: { status: 'INACTIVE' } })
      check('组长可停用本室教师', disabled.body?.data?.status === 'INACTIVE', JSON.stringify(disabled.body?.message))
      const staffToken = await login('T7001')
      check('停用后教师无法登录', staffToken === null)
      const removed = await request('DELETE', `/users/labs/${labId}/staff/${staffId}`, { token: leaderToken })
      check('组长可删除本室教师账号', removed.status === 200, `HTTP ${removed.status}`)
      const staffList = await request('GET', `/users/labs/${labId}/staff`, { token: leaderToken })
      const stillThere = (staffList.body?.data || []).some((u) => u.id === staffId)
      check('删除后不再出现在本室成员列表', stillThere === false)
    }

    if (leaderCreated.body?.data?.id) {
      const leaderId = leaderCreated.body.data.id
      const off = await request('PUT', `/users/${leaderId}/status`, { token: admin, body: { status: 'INACTIVE' } })
      check('学院可停用组长账号', off.body?.data?.status === 'INACTIVE')
      const stale = await request('GET', '/preferences/lab/1', { token: leaderToken })
      check('停用后旧会话立即失效', stale.status === 401, `HTTP ${stale.status}`)
      const labs = await listLabs(admin)
      check('停用后自动解除实训室组长绑定', (labs.find((l) => l.id === labId)?.leaderName ?? null) === null)
    }
  } finally {
    child.kill()
    fs.rmSync(TMP, { recursive: true, force: true })
  }

  console.log(`\n===== 流程验收结果：通过 ${pass}，失败 ${failures.length} =====`)
  failures.forEach((item) => console.log(` - ${item}`))
  if (failures.length) process.exitCode = 1
}

async function listLabs(token) {
  const res = await request('GET', '/laboratories/all', { token })
  return res.body?.data || []
}

main().catch((err) => {
  console.error('验收脚本异常:', err.message)
  process.exitCode = 1
})
