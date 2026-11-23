/**
 * 多轮补录 + 全院调剂池验收测试
 * 运行：node tests/allocation.js
 *
 * 覆盖：
 * 1. 各实训室剩余名额口径（计划 / 已录取 / 待确认 / 剩余，室级与导师级一致）
 * 2. 轮次模型：第 1 轮隐式开放、不能跳轮、结束后开下一轮、最多三轮
 * 3. 补录志愿：未开放轮次拒绝、重复提交拒绝、已录取学生拒绝、名额为 0 拒绝
 * 4. 全院调剂池：三级优先级排序、组长只看本室、逐条确认写调剂并自动同步最终名单
 * 5. 学院端不再需要「合并名单」，学生确认/调剂确认后最终名单自动同步
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PORT = 8131
const BASE = `http://127.0.0.1:${PORT}/api`
const TMP = path.join(os.tmpdir(), `lab-match-allocation-${process.pid}`)
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

async function request(method, url, { token, body, role } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(role ? { 'X-Role': role } : {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let json = null
  try { json = await res.json() } catch { json = null }
  return { status: res.status, body: json }
}

const ACTIVATED_PASSWORD = 'LabMatch#2026'

// 登录；学生/教师首次登录须先改初始密码，这里自动完成
async function login(username, password = INITIAL_PASSWORD) {
  const res = await request('POST', '/auth/login', { body: { username, password } })
  if (res.status !== 200) return null
  const { token, user } = res.body.data
  if (!user?.mustChangePassword) return token
  const updated = await request('PUT', '/auth/password', {
    token, body: { oldPassword: password, newPassword: ACTIVATED_PASSWORD }
  })
  if (updated.status !== 200) return null
  return updated.body?.data?.token || null
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
    const leader = await login('L001')
    check('学院与组长均可登录', Boolean(admin && leader))
    if (!admin || !leader) throw new Error('登录失败')

    // ---- 1. 剩余名额口径 ----
    console.log('\n== 1. 各实训室剩余名额 ==')
    const surplusRes = await request('GET', '/allocation/surplus', { token: admin })
    const surplus = surplusRes.body?.data
    check('剩余名额接口可用', surplusRes.status === 200 && Array.isArray(surplus?.labs),
      JSON.stringify(surplusRes.body).slice(0, 160))
    check('覆盖全部在办实训室', (surplus?.labs || []).length === 5, `实际 ${(surplus?.labs || []).length}`)
    const consistent = (surplus?.labs || []).every((lab) =>
      lab.remaining === Math.max(0, lab.plan - lab.admitted - lab.pending) &&
      lab.plan >= lab.admitted + lab.pending - lab.remaining)
    check('每室口径自洽（剩余 = 计划 - 已录取 - 待确认）', consistent,
      JSON.stringify((surplus?.labs || [])[0]))
    const sumOk = ['plan', 'admitted', 'pending', 'remaining'].every((key) =>
      surplus.totals[key] === surplus.labs.reduce((sum, lab) => sum + lab[key], 0))
    check('汇总行等于各室之和', sumOk, JSON.stringify(surplus.totals))
    check('导师级名额明细随室返回',
      (surplus.labs || []).every((lab) => Array.isArray(lab.teachers) &&
        lab.teachers.every((t) => (t.quota == null
          ? t.remaining == null
          : t.remaining === Math.max(0, t.quota - t.admitted)))))

    // ---- 2. 轮次模型 ----
    console.log('\n== 2. 轮次模型 ==')
    const rounds1 = await request('GET', '/allocation/rounds', { token: admin })
    check('第 1 轮隐式开放', rounds1.body?.data?.current === 1 && rounds1.body?.data?.open === 1,
      JSON.stringify(rounds1.body?.data))
    check('有轮次开放时不能直接开下一轮',
      (await request('POST', '/allocation/rounds/open', { token: admin })).status === 409)
    check('组长不能开启轮次',
      (await request('POST', '/allocation/rounds/1/close', { token: leader })).status === 403)

    const stages = (await request('GET', '/batches/1/stages', { token: admin })).body.data
    async function changeStage(number, status) {
      const stage = stages.find(item => item.stageNumber === number)
      const result = await request('PUT', '/batches/1/stages/' + stage.id, { token: admin, body: { stageStatus: status } })
      if (result.status !== 200) throw Error(JSON.stringify(result.body))
    }
    check('首轮确认结束前不能关闭首轮', (await request('POST', '/allocation/rounds/1/close', { token: admin })).status === 409)
    await changeStage(5, 'COMPLETED')
    await changeStage(6, 'STARTED')
    const closed1 = await request('POST', '/allocation/rounds/1/close', { token: admin })
    check('学院可结束第 1 轮录取', closed1.status === 200 && closed1.body?.data?.open === null,
      JSON.stringify(closed1.body).slice(0, 160))
    check('结束后允许开启下一轮', closed1.body?.data?.canOpenNext === true)
    check('已结束的轮次不能重复结束',
      (await request('POST', '/allocation/rounds/1/close', { token: admin })).status === 409)
    check('未开启的轮次不能结束',
      (await request('POST', '/allocation/rounds/3/close', { token: admin })).status === 409)

    const opened2 = await request('POST', '/allocation/rounds/open', { token: admin })
    check('学院可开启第二轮补录', opened2.status === 200 && opened2.body?.data?.open === 2,
      JSON.stringify(opened2.body?.data))
    check('第二轮开放时不能跳到第三轮',
      (await request('POST', '/allocation/rounds/open', { token: admin, body: { round: 3 } })).status === 409)

    // ---- 3. 补录志愿（学生端） ----
    console.log('\n== 3. 学生补录志愿 ==')
    const student = await login('2022011')
    check('未录取学生可登录', Boolean(student))
    const mine = await request('GET', '/allocation/my-supplement', { token: student })
    check('学生可见当前开放轮次与剩余名额',
      mine.status === 200 && mine.body?.data?.round?.open === 2 && mine.body?.data?.placed === false,
      `HTTP ${mine.status} ` + JSON.stringify(mine.body).slice(0, 240))
    const openLab = mine.body?.data?.labs?.find((lab) => lab.remaining > 0 && lab.teachers.length)
    check('剩余名额页只列出仍有余量的导师', Boolean(openLab),
      JSON.stringify(mine.body?.data?.labs?.map((l) => [l.id, l.remaining])))

    const supplement = await request('POST', '/allocation/supplement', {
      token: student,
      body: {
        choices: [{ laboratoryId: openLab.id, labTeacherId: openLab.teachers[0].id }],
        obeyInternalAdjustment: true,
        obeyCollegeAdjustment: true
      }
    })
    check('学生可提交第二轮补录志愿',
      supplement.status === 200 && supplement.body?.data?.round === 2,
      JSON.stringify(supplement.body).slice(0, 200))
    check('同一轮不能重复提交',
      (await request('POST', '/allocation/supplement', {
        token: student,
        body: {
          choices: [{ laboratoryId: openLab.id, labTeacherId: openLab.teachers[0].id }],
          obeyInternalAdjustment: true, obeyCollegeAdjustment: true
        }
      })).status === 409)
    const afterSubmit = await request('GET', '/allocation/my-supplement', { token: student })
    check('补录志愿进入本人记录',
      (afterSubmit.body?.data?.choices || []).some((row) => row.round === 2 && row.status === 'SUBMITTED'),
      JSON.stringify(afterSubmit.body?.data?.choices))

    const fixture = JSON.parse(fs.readFileSync(TEST_STORE, 'utf8'))
    // Exercise the cutoff on an isolated copy, including a repeated settlement.
    const cutoff = structuredClone(fixture)
    cutoff.recruitmentRounds = []
    cutoff.adjustments = []
    cutoff.finalAdmissions = []
    cutoff.admissionIntentions = [[1,6,1],[2,7,1],[3,7,2],[4,8,1]].map(([id,studentId,laboratoryId]) => ({
      id, batchId: 1, studentId, laboratoryId, round: 1, admissionType: id === 4 ? 'ALTERNATE' : 'INTENDED',
      status: 'PENDING', createdAt: new Date().toISOString()
    }))
    const { settleFirstRound } = require('../services/admissionSettlement')
    const cutoffBatch = cutoff.recruitmentBatches.find(row => row.id === 1)
    settleFirstRound(cutoff, cutoffBatch)
    check('唯一拟录取截止后自动确认', cutoff.admissionIntentions[0].autoConfirmed && cutoff.admissionIntentions[0].status === 'CONFIRMED')
    check('多意向逾期全部释放', cutoff.admissionIntentions.slice(1,3).every(item => item.status === 'EXPIRED'))
    check('释放席位由顺位候补补充', cutoff.admissionIntentions[3].status === 'CONFIRMED' && cutoff.admissionIntentions[3].promotedAt)
    check('截止结算重复执行不会重发通知', settleFirstRound(cutoff, cutoffBatch) === 0)
    const mentor = fixture.labTeachers.find(row => row.id === openLab.teachers[0].id)
    const mentorUser = fixture.users.find(row => row.id === mentor.userId)
    const actor = { token: mentorUser.username === 'L001' ? leader : await login(mentorUser.username), role: 'LAB_TEACHER' }
    const studentId = fixture.users.find(user => user.username === '2022011').id
    async function interviewAndOffer(round, accept) {
      const scheduled = await request('POST', '/interviews/schedule', { ...actor, body: {
        studentId, laboratoryId: openLab.id, interviewTime: new Date(Date.now() - 3600000).toISOString(), location: '测试面试室'
      } })
      check('第' + round + '轮独立排期', scheduled.status === 200, JSON.stringify(scheduled.body).slice(0,160))
      const scored = await request('POST', '/interviews/' + scheduled.body?.data?.id + '/score', { ...actor, body: {
        attitudeScore: 90, logicScore: 90, programmingScore: 90, timeCommitmentScore: 90,
        comprehensiveScore: 90, recommendation: 'INTENDED', evaluation: '本轮面试通过'
      } })
      check('第' + round + '轮导师评分', scored.status === 200, JSON.stringify(scored.body).slice(0,160))
      const offer = await request('POST', '/admissions/teacher-invitations', { ...actor, body: { studentId } })
      check('第' + round + '轮发送邀请', offer.body?.data?.round === round, JSON.stringify(offer.body).slice(0,150))
      const result = await request('POST', '/admissions/' + offer.body?.data?.id + '/confirm', { token: student, body: { confirmed: accept } })
      check('第' + round + '轮学生处理邀请', result.status === 200, JSON.stringify(result.body).slice(0,160))
    }
    await interviewAndOffer(2, false)
    check('三轮结束前调剂池为空', (await request('GET', '/allocation/pool', { token: admin })).body.data.rows.length === 0)
    check('三轮结束前禁止办理调剂', (await request('POST', '/allocation/pool/confirm', { token: admin,
      body: { studentId, targetLaboratoryId: openLab.id } })).status === 409)
    // ---- 5. 三轮之后进入调剂池 ----
    console.log('\n== 5. 三轮结束与轮次上限 ==')
    await request('POST', '/allocation/rounds/2/close', { token: admin })
    const opened3 = await request('POST', '/allocation/rounds/open', { token: admin })
    check('可开启第三轮补录', opened3.body?.data?.open === 3, JSON.stringify(opened3.body?.data))
    const third = await request('POST', '/allocation/supplement', { token: student, body: {
      choices: [{ laboratoryId: openLab.id, labTeacherId: mentor.id }], obeyInternalAdjustment: false, obeyCollegeAdjustment: false
    } })
    check('第三轮允许重报同一实训室', third.body?.data?.round === 3)
    check('旧轮次评分不能作为本轮邀请依据', (await request('POST', '/admissions/teacher-invitations', { ...actor, body: { studentId } })).status === 409)
    const latestIntentStudents = []
    for (const user of fixture.users.filter(user => user.role === 'STUDENT' && user.id !== studentId &&
      fixture.studentPreferences.some(pref => pref.studentId === user.id && pref.obeyInternalAdjustment))) {
      if (latestIntentStudents.length === 2) break
      const token = await login(user.username)
      if (!token) continue
      if ((await request('GET', '/allocation/my-supplement', { token })).body.data.placed) continue
      const obeyCollegeAdjustment = latestIntentStudents.length === 0
      const saved = await request('POST', '/allocation/supplement', { token, body: {
        choices: [{ laboratoryId: openLab.id, labTeacherId: mentor.id }], obeyInternalAdjustment: false, obeyCollegeAdjustment
      } })
      if (saved.status !== 200) throw Error(JSON.stringify(saved.body))
      latestIntentStudents.push(user.id)
    }
    await interviewAndOffer(3, true)
    await request('POST', '/allocation/rounds/3/close', { token: admin })
    const roundsEnd = await request('GET', '/allocation/rounds', { token: admin })
    check('三轮结束后不再开放新轮次',
      roundsEnd.body?.data?.open === null && roundsEnd.body?.data?.canOpenNext === false,
      JSON.stringify(roundsEnd.body?.data))
    check('轮次上限为 3', roundsEnd.body?.data?.max === 3)
    check('超上限无法开启',
      (await request('POST', '/allocation/rounds/open', { token: admin, body: { round: 4 } })).status >= 400)
    await changeStage(6, 'COMPLETED')
    await changeStage(7, 'STARTED')
    // ---- 4. 全院调剂池 ----
    console.log('\n== 4. 全院调剂池 ==')
    const poolRes = await request('GET', '/allocation/pool', { token: admin })
    const pool = poolRes.body?.data
    check('调剂池接口可用', poolRes.status === 200 && Array.isArray(pool?.rows),
      JSON.stringify(poolRes.body).slice(0, 160))
    const priorities = (pool?.rows || []).map((row) => row.priority)
    check('候选按三级优先级升序排列',
      priorities.every((value, index) => index === 0 || priorities[index - 1] <= value),
      priorities.join(','))
    check('每条候选都带优先级说明与建议去向',
      (pool?.rows || []).every((row) => row.priorityLabel && 'suggestedLaboratoryId' in row && row.reason))
    check('优先级统计与明细一致',
      pool?.summary?.pending === pool?.rows?.length &&
      pool?.summary?.internal === priorities.filter((p) => p === 1).length &&
      pool?.summary?.cross === priorities.filter((p) => p === 2).length &&
      pool?.summary?.placement === priorities.filter((p) => p === 3).length,
      JSON.stringify(pool?.summary))
    check('三级优先级都出现在演示数据中',
      new Set(priorities).size === 3, priorities.join(','))

    const crossOnly = pool.rows.find(row => row.studentId === latestIntentStudents[0])
    const neither = pool.rows.find(row => row.studentId === latestIntentStudents[1])
    check('最新轮拒绝室内调剂，覆盖历史同意', crossOnly?.priority === 2 && !crossOnly.eligibleLaboratoryIds.includes(openLab.id))
    check('拒绝两种调剂的学生没有可分配目标', neither?.priority === 3 && !neither.eligibleLaboratoryIds.length)
    check('学院不能越过尚可办理的室内调剂', (await request('POST', '/allocation/pool/confirm', { token: admin,
      body: { studentId: crossOnly.studentId, targetLaboratoryId: crossOnly.suggestedLaboratoryId } })).status === 409)
    check('不能强制分配拒绝调剂的学生', (await request('POST', '/allocation/pool/confirm', { token: admin,
      body: { studentId: neither.studentId, targetLaboratoryId: openLab.id } })).status === 409)
    const leaderPool = await request('GET', '/allocation/pool', { token: leader })
    check('组长只能看到建议流向本室的候选',
      (leaderPool.body?.data?.rows || []).every((row) => row.suggestedLaboratoryId === 1),
      JSON.stringify((leaderPool.body?.data?.rows || []).map((r) => r.suggestedLaboratoryId)))

    const candidate = pool.rows.find(row => row.priority === 1)
    const target = pool.surplus.labs.find(lab => candidate?.eligibleLaboratoryIds.includes(lab.id))
    check('室内候选只能安排在志愿室', candidate?.eligibleLaboratoryIds.every(id => candidate.preferredLabs.some(lab => lab.laboratoryId === id)))
    const outside = surplus.labs.find(lab => !candidate?.eligibleLaboratoryIds.includes(lab.id))
    check('禁止把室内候选直接安排到其他室', (await request('POST', '/allocation/pool/confirm', {
      token: admin, body: { studentId: candidate.studentId, targetLaboratoryId: outside.id }
    })).status === 409)
    const confirm = await request('POST', '/allocation/pool/confirm', {
      token: admin,
      body: {
        studentId: candidate.studentId,
        targetLaboratoryId: target.id,
        targetLabTeacherId: target.teachers[0].id,
        reason: '验收测试：统筹安排'
      }
    })
    check('学院可逐条确认调剂',
      confirm.status === 200 && Boolean(confirm.body?.data?.adjustment),
      JSON.stringify(confirm.body).slice(0, 200))
    check('调剂后立即同步进最终名单',
      (confirm.body?.data?.synced || 0) >= 1, JSON.stringify(confirm.body?.data?.synced))

    const finalList = await request('GET', '/final/list', { token: admin })
    const placed = (finalList.body?.data?.perLab || [])
      .flatMap((lab) => lab.students.map((s) => ({ ...s, laboratoryName: lab.laboratoryName })))
      .find((row) => row.studentId === candidate.studentId)
    check('学院端最终名单无需合并即包含该学生',
      Boolean(placed) && placed.laboratoryId === target.id, JSON.stringify(placed))

    const dup = await request('POST', '/allocation/pool/confirm', {
      token: admin,
      body: { studentId: candidate.studentId, targetLaboratoryId: target.id }
    })
    check('已有录取去向的学生不能重复安排', dup.status === 409, JSON.stringify(dup.body))

    const surplusAfter = await request('GET', '/allocation/surplus', { token: admin })
    const targetAfter = (surplusAfter.body?.data?.labs || []).find((lab) => lab.id === target.id)
    check('调剂后目标实训室剩余名额减少',
      targetAfter.admitted === (target.admitted || 0) + 1 &&
      targetAfter.remaining === Math.max(0, targetAfter.plan - targetAfter.admitted - targetAfter.pending),
      JSON.stringify({ before: target.admitted, after: targetAfter.admitted, remaining: targetAfter.remaining }))

    const candidateToken = await login(placed?.studentNumber) || await login(placed?.studentNumber, ACTIVATED_PASSWORD)
    if (candidateToken) {
      check('已被录取的学生不能再填报补录志愿',
        (await request('POST', '/allocation/supplement', {
          token: candidateToken,
          body: { choices: [{ laboratoryId: target.id, labTeacherId: target.teachers[0].id }], obeyInternalAdjustment: true, obeyCollegeAdjustment: true }
        })).status === 409)
      const placedView = await request('GET', '/allocation/my-supplement', { token: candidateToken })
      check('学生端显示已被录取的实训室', placedView.body?.data?.placed === true,
        JSON.stringify({ placed: placedView.body?.data?.placed, lab: placedView.body?.data?.placedLaboratoryName }))
    }

    for (let count = 0; count < fixture.users.length; count++) {
      const current = (await request('GET', '/allocation/pool', { token: admin })).body.data
      const first = current.rows.find(row => row.priority < 3)
      if (!first) break
      const handled = await request('POST', '/allocation/pool/confirm', { token: admin,
        body: { studentId: first.studentId, targetLaboratoryId: first.suggestedLaboratoryId } })
      if (handled.status !== 200) throw Error('顺序调剂失败：' + handled.body.message)
    }
    const lastPool = (await request('GET', '/allocation/pool', { token: admin })).body.data
    const proposalLab = lastPool.surplus.labs.find(lab => lab.remaining > 0)
    const proposal = { discussion: true, studentId: neither.studentId, targetLaboratoryId: proposalLab.id, reason: '测试沟通方案' }
    const invited = await request('POST', '/allocation/pool/confirm', { token: admin, body: proposal })
    check('谈话安置仅发方案，未直接录取', invited.body?.data?.adjustment?.status === 'PENDING')
    const reply = (id, token, accept) => request('POST', '/allocation/proposals/' + id + '/respond', { token, body: { accept } })
    const ownToken = await login(neither.studentNumber, ACTIVATED_PASSWORD)
    const firstProposal = invited.body.data.adjustment.id
    check('其他学生不能答复安置方案', (await reply(firstProposal, student, true)).status === 404)
    check('学生可拒绝谈话安置', (await reply(firstProposal, ownToken, false)).body?.data?.status === 'REJECTED')
    const second = await request('POST', '/allocation/pool/confirm', { token: admin, body: proposal })
    check('本人接受后同步为正式去向', (await reply(second.body.data.adjustment.id, ownToken, true)).body?.data?.status === 'CONFIRMED' &&
      (await request('GET', '/allocation/my-supplement', { token: ownToken })).body.data.placed)
  } finally {
    child.kill()
    try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  console.log(`\n===== 补录与调剂验收结果：通过 ${pass}，失败 ${failures.length} =====`)
  if (failures.length) {
    failures.forEach((f) => console.log('  FAILED:', f))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
