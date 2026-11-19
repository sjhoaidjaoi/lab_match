/**
 * 后端接口冒烟测试（使用独立数据副本，不修改业务数据）
 * 运行：node tests/api.smoke.js
 */
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const TEST_STORE = path.join(ROOT, 'data', `.store.test-${process.pid}.json`)
const RESUME_DIR = path.join(require('os').tmpdir(), 'lab-match-resumes-' + process.pid)
const PORT = 8099
const BASE = `http://localhost:${PORT}/api`

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

async function request(method, url, { token, role, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (role) headers['X-Role'] = role
  const res = await fetch(BASE + url, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  })
  let json = null
  try { json = await res.json() } catch { /* ignore */ }
  return { status: res.status, body: json }
}

const testPasswords = new Map()
const ACTIVATED_PASSWORD = 'Smoke-test-2026'

async function login(username) {
  const password = testPasswords.get(username) ?? '123456'
  const res = await request('POST', '/auth/login', { body: { username, password } })
  if (res.status !== 200) throw new Error(`登录失败 ${username}: ${JSON.stringify(res.body)}`)
  const { token, user } = res.body.data
  if (!user.mustChangePassword) return token
  const updated = await request('PUT', '/auth/password', {
    token, body: { oldPassword: password, newPassword: ACTIVATED_PASSWORD }
  })
  if (updated.status !== 200) throw new Error(`测试账号未能修改初始密码：${username}`)
  testPasswords.set(username, ACTIVATED_PASSWORD)
  return updated.body.data.token
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + '/health')
      if (res.ok) return true
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

async function main() {
  const child = spawn(process.execPath, ['app.js'], {
    cwd: ROOT,
    env: {
      ...process.env, DB_DRIVER: 'file', PORT: String(PORT),
      LAB_STORE_FILE: TEST_STORE, LAB_SEED_DEMO: 'true', LAB_RESUME_DIR: RESUME_DIR,
      LAB_RATE_LIMIT: 'off',
      LAB_BRIEFING_DIR: path.join(RESUME_DIR, 'briefing')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => console.error('[server]', d.toString().trim()))

  try {
    const ready = await waitForServer()
    if (!ready) throw new Error('后端未能启动')
    console.log('\n== 0. 基础连通性 ==')
    const health = await request('GET', '/health')
    check('健康检查返回 200', health.status === 200)

    const admin = await login('admin')
    const leader = await login('L001')
    const teacher = await login('T1001')
    const student = await login('2022012')
    check('四种角色均可登录', Boolean(admin && leader && teacher && student))
    const teacherAccount = await request('GET', '/auth/me', { token: teacher })
    const leaderAccount = await request('GET', '/auth/me', { token: leader })
    check('普通教师只有教师身份，组长可切换教师身份',
      teacherAccount.body?.data?.roles?.map(item => item.roleCode).join(',') === 'LAB_TEACHER' &&
      leaderAccount.body?.data?.roles?.some(item => item.roleCode === 'LAB_TEACHER') &&
      (await request('POST', '/auth/switch-role', { token: teacher, body: { roleCode: 'LAB_LEADER' } })).status === 403)

    const studentImport = await request('POST', '/users/import', {
      token: admin, body: { students: [{ studentNumber: ' 099991 ', realName: '测试学生' }] }
    })
    const newTeacher = await request('POST', '/users/labs/1/staff', {
      token: leader, body: {
        employeeNumber: ' F00991 ', realName: '测试教师', status: 'ACTIVE'
      }
    })
    check('学院创建学生账号、组长创建本室教师账号，分别以学号和工号登录',
      studentImport.body?.data?.created === 1 && newTeacher.body?.data?.username === 'F00991')
    const editStaff = await request('PUT', `/users/labs/1/staff/${newTeacher.body.data.id}`, {
      token: leader, body: { realName: '已修改的教师' }
    })
    check('组长可修改本室教师信息，不能修改其他实训室账号或提升角色',
      editStaff.body?.data?.realName === '已修改的教师' &&
      (await request('PUT', '/users/labs/1/staff/4', { token: leader, body: { realName: '越权' } })).status === 404 &&
      (await request('PUT', `/users/labs/1/staff/${newTeacher.body.data.id}`, { token: leader, body: { role: 'COLLEGE_ADMIN' } })).status === 400 &&
      (await request('GET', '/users/labs/2/staff', { token: leader })).status === 403)
    const rawLogin = (username, password = '123456') =>
      request('POST', '/auth/login', { body: { username, password } })
    const teacherLogin = await rawLogin('F00991')
    const studentLogin = await rawLogin('099991')
    const pendingTeacher = teacherLogin.body?.data?.token
    const pendingStudent = studentLogin.body?.data?.token
    const blockedTeacher = await request('GET', '/preferences/lab/1', { token: pendingTeacher })
    const blockedStudent = await request('GET', '/preferences/my', { token: pendingStudent })
    const blockedSwitch = await request('POST', '/auth/switch-role', {
      token: pendingTeacher, body: { roleCode: 'LAB_TEACHER' }
    })
    check('初始密码登录后，学生和教师均须改密才可访问业务接口',
      teacherLogin.body?.data?.user?.mustChangePassword === true &&
      studentLogin.body?.data?.user?.mustChangePassword === true &&
      blockedTeacher.body?.code === 'PASSWORD_CHANGE_REQUIRED' &&
      blockedStudent.body?.code === 'PASSWORD_CHANGE_REQUIRED' && blockedSwitch.status === 403)
    const samePassword = await request('PUT', '/auth/password', {
      token: pendingStudent, body: { oldPassword: '123456', newPassword: '123456' }
    })
    const wrongPassword = await request('PUT', '/auth/password', {
      token: pendingTeacher, body: { oldPassword: 'abcdef', newPassword: ACTIVATED_PASSWORD }
    })
    check('拒绝沿用初始密码或用错误的原密码改密',
      samePassword.status === 400 && wrongPassword.status === 400)
    const activatedTeacher = await request('PUT', '/auth/password', {
      token: pendingTeacher, body: { oldPassword: '123456', newPassword: ACTIVATED_PASSWORD }
    })
    const activeTeacher = activatedTeacher.body?.data?.token
    const teacherMe = await request('GET', '/auth/me', { token: activeTeacher })
    check('改密后进入工作台，旧密码和旧会话均失效',
      teacherMe.body?.data?.user?.mustChangePassword === false &&
      (await request('GET', '/preferences/lab/1', { token: activeTeacher })).status === 200 &&
      (await request('GET', '/auth/me', { token: pendingTeacher })).status === 401 &&
      (await rawLogin('F00991')).status === 401 &&
      (await rawLogin('F00991', ACTIVATED_PASSWORD)).status === 200)
    const reset = await request('POST', `/users/labs/1/staff/${newTeacher.body?.data?.id}/reset-password`, { token: leader })
    check('组长重置本室教师密码后，旧会话失效且再次强制改密',
      reset.status === 200 && (await request('GET', '/auth/me', { token: activeTeacher })).status === 401 &&
      (await rawLogin('F00991')).body?.data?.user?.mustChangePassword === true)

    const labContent = await request('PUT', '/laboratories/1', {
      token: leader,
      body: {
        briefingVideoUrl: 'https://example.com/briefing.mp4',
        briefingVideoType: 'MP4',
        tourVideoUrl: 'https://example.com/tour.mp4',
        tourVideoType: 'MP4'
      }
    })
    const publicLab = await request('GET', '/laboratories/1', { token: student })
    check('学生可分别读取本室宣讲和开放日资源', labContent.status === 200 &&
      publicLab.body?.data?.briefingVideoUrl?.endsWith('/briefing.mp4') &&
      publicLab.body?.data?.tourVideoUrl?.endsWith('/tour.mp4'))
    const foreignLab = await request('PUT', '/laboratories/2', {
      token: leader, body: { tourVideoUrl: 'https://example.com/tour.mp4' }
    })
    check('组长不能发布其他实训室的云游视频', foreignLab.status === 403)

    // 实训室资料统一管理：基础资料与招生名额由学院维护，组长只读
    const labProfile = await request('PUT', '/laboratories/1', {
      token: admin,
      body: { description: '学院维护的基本简介', projectDirection: '软件工程', technologyStack: 'Vue / Express',
        recruitmentQuota: 7 }
    })
    const updatedProfile = await request('GET', '/laboratories/1', { token: student })
    check('学院可维护本室基本资料，学生可读取该资料',
      labProfile.status === 200 && updatedProfile.body?.data?.description === '学院维护的基本简介' &&
      updatedProfile.body?.data?.projectDirection === '软件工程' && updatedProfile.body?.data?.technologyStack === 'Vue / Express')
    check('学院可调整招生名额并保留宣讲资料及组长绑定',
      updatedProfile.body?.data?.recruitmentQuota === 7 &&
      updatedProfile.body?.data?.leaderId === publicLab.body?.data?.leaderId &&
      updatedProfile.body?.data?.briefingVideoUrl === publicLab.body?.data?.briefingVideoUrl &&
      updatedProfile.body?.data?.tourVideoUrl === publicLab.body?.data?.tourVideoUrl)
    check('组长不能修改基础资料与招生名额',
      (await request('PUT', '/laboratories/1', { token: leader, body: { description: '组长越权修改' } })).status === 403 &&
      (await request('PUT', '/laboratories/1', { token: leader, body: { recruitmentQuota: 12 } })).status === 403)
    check('组长不能改组长归属',
      (await request('PUT', '/laboratories/1', { token: leader, body: { leaderId: null } })).status === 403)
    check('学院不能修改全景资源归属',
      (await request('PUT', '/media/admin/panoramas/1', { token: admin, body: { name: '越权' } })).status === 403)
    const teacherEdit = await request('PUT', '/laboratories/1', { token: teacher, body: { name: '改名' } })
    check('普通教师不能编辑实训室基本资料', teacherEdit.status === 403)
    check('普通教师不能发布宣讲文档', (await request('POST', '/media/labs/1/materials', { token: teacher })).status === 403)

    // 打开阶段三时间窗
    const stages = await request('GET', '/batches/1/stages', { token: admin })
    const stage3 = stages.body?.data?.find((s) => s.stageNumber === 3)
    const now = Date.now()
    if (stage3) {
      await request('PUT', `/batches/1/stages/${stage3.id}`, {
        token: admin,
        body: {
          startTime: new Date(now - 3600_000).toISOString(),
          endTime: new Date(now + 3600_000).toISOString(),
          stageStatus: 'IN_PROGRESS'
        }
      })
    }

    console.log('\n== 1. 权限与数据隔离 ==')
    const spoof = await request('GET', '/users', { token: student, role: 'COLLEGE_ADMIN' })
    check('学生伪造 X-Role 访问用户管理被拒绝', spoof.status === 403, `status=${spoof.status}`)

    const crossLab = await request('GET', '/preferences/lab/2', { token: teacher })
    check('教师访问其他实训室报名数据被拒绝', crossLab.status === 403, `status=${crossLab.status}`)

    const ownLab = await request('GET', '/preferences/lab/1', { token: teacher })
    check('教师访问本实训室报名数据成功', ownLab.status === 200)

    const studentAdmin = await request('GET', '/statistics/college', { token: student })
    check('学生访问学院统计接口被拒绝', studentAdmin.status === 403)

    const leaderCross = await request('POST', '/adjustments/internal', {
      token: leader, body: { studentId: 8, targetLaboratoryId: 2, sourceLaboratoryId: 2, reason: '越权测试' }
    })
    check('组长对其他实训室提交内部调剂被拒绝', leaderCross.status === 403, `status=${leaderCross.status}`)

    console.log('\n== 2. 志愿填报规则 ==')
    const choices = [{ laboratoryId: 1, labTeacherId: 2 }, { laboratoryId: 2, labTeacherId: 3 }, { laboratoryId: 3, labTeacherId: 4 }]
    const preferenceBody = { choices, obeyInternalAdjustment: true, obeyCollegeAdjustment: true }
    const missing = await request('POST', '/preferences/submit', { token: student, body: preferenceBody })
    check('没有简历不能提交志愿', missing.status === 400)
    const data = new FormData()
    data.append('file', new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), 'resume.pdf')
    const uploaded = await fetch(BASE + '/preferences/resumes/draft', { method: 'POST', headers: { Authorization: 'Bearer ' + student }, body: data })
    const resume = (await uploaded.json()).data
    check('学生可以上传简历', uploaded.status === 200 && Boolean(resume?.id))
    const replacement = await fetch(BASE + '/preferences/resumes/draft', { method: 'POST', headers: { Authorization: 'Bearer ' + student }, body: data })
    const replacementResume = (await replacement.json()).data
    check('可替换草稿简历且旧附件不再可下载', replacement.status === 200 && replacementResume?.id !== resume?.id &&
      (await request('GET', '/preferences/resumes/' + resume?.id, { token: student })).status === 404)
    preferenceBody.resumeId = replacementResume?.id
    const candidate = await login('2022011')
    const candidateUpload = await fetch(BASE + '/preferences/resumes/draft', { method: 'POST', headers: { Authorization: 'Bearer ' + candidate }, body: data })
    const candidateResume = (await candidateUpload.json()).data
    check('测试候选学生提交本室志愿', (await request('POST', '/preferences/submit', {
      token: candidate, body: { ...preferenceBody, choices: [choices[0]], resumeId: candidateResume?.id }
    })).status === 200)
    const mismatched = await request('POST', '/preferences/submit', {
      token: student, body: { ...preferenceBody, choices: [{ laboratoryId: 1, labTeacherId: 3 }] }
    })
    check('导师必须属于所选实训室', mismatched.status === 400)
    const duplicate = await request('POST', '/preferences/submit', {
      token: student, body: { ...preferenceBody, choices: [choices[0], choices[0]] }
    })
    check('重复填报同一实训室被拒绝', duplicate.status === 400)

    const tooMany = await request('POST', '/preferences/submit', {
      token: student, body: { ...preferenceBody, choices: [...choices, { laboratoryId: 4, labTeacherId: 5 }] }
    })
    check('填报超过三个志愿被拒绝', tooMany.status === 400)

    const submissions = await Promise.all(Array.from({ length: 2 }, () =>
      request('POST', '/preferences/submit', { token: student, body: preferenceBody })))
    const valid = submissions.find(item => item.status === 200) || submissions[0]
    check('并发志愿提交仅成功一次', submissions.map(item => item.status).sort().join(',') === '200,409')
    check('三个平行志愿提交成功', valid.status === 200, JSON.stringify(valid.body))

    const mine = await request('GET', '/preferences/my', { token: student })
    check('学生回显三个志愿', (mine.body?.data || []).length === 3, `len=${(mine.body?.data || []).length}`)
    const ownStudent = await login('099991')
    const ownStudentId = (await request('GET', '/auth/me', { token: ownStudent })).body.data.user.id
    const ownUpload = await fetch(BASE + '/preferences/resumes/draft', {
      method: 'POST', headers: { Authorization: 'Bearer ' + ownStudent }, body: data
    })
    check('学生可选择组长本人为导师', (await request('POST', '/preferences/submit', {
      token: ownStudent, body: {
        choices: [{ laboratoryId: 1, labTeacherId: 1 }], resumeId: (await ownUpload.json()).data?.id,
        obeyInternalAdjustment: false, obeyCollegeAdjustment: false
      }
    })).status === 200)

    // 截止后锁定
    await request('PUT', `/batches/1/stages/${stage3.id}`, {
      token: admin,
      body: { endTime: new Date(Date.now() - 60_000).toISOString(), stageStatus: 'COMPLETED' }
    })
    const expired = await request('POST', '/preferences/submit', {
      token: student, body: preferenceBody
    })
    check('截止后修改志愿被拒绝', expired.status === 409, `status=${expired.status}`)
    await request('PUT', `/batches/1/stages/${stage3.id}`, {
      token: admin,
      body: {
        startTime: new Date(Date.now() - 3600_000).toISOString(),
        endTime: new Date(Date.now() + 3600_000).toISOString(),
        stageStatus: 'IN_PROGRESS'
      }
    })

    console.log('\n== 3. 面试与名单流转 ==')
    const openStage = async number => {
      const stage = stages.body.data.find(item => item.stageNumber === number)
      await request('PUT', '/batches/1/stages/' + stage.id, { token: admin, body: {
        startTime: new Date(Date.now() - 60000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        stageStatus: 'IN_PROGRESS'
      } })
    }
    await openStage(4)
    const stage5 = stages.body.data.find(item => item.stageNumber === 5)
    await request('PUT', '/batches/1/stages/' + stage5.id, { token: admin, body: { stageStatus: 'NOT_STARTED' } })
    const viewed = await request('GET', '/batches/current')
    check('读取阶段不会提前开启拟录取', viewed.body?.data?.stages?.find(item => item.stageNumber === 5)?.stageStatus === 'NOT_STARTED')

    // 提前开始 / 提前结束：学院可对单个阶段加速推进
    const earlyStarted = await request('PUT', `/batches/1/stages/${stage5.id}`, {
      token: admin, body: { stageStatus: 'STARTED' }
    })
    check('学院可提前开始尚未到时间的阶段',
      earlyStarted.status === 200 &&
      earlyStarted.body?.data?.stageStatus === 'IN_PROGRESS' &&
      earlyStarted.body?.data?.statusOverride === 'STARTED',
      `status=${earlyStarted.status} body=${JSON.stringify(earlyStarted.body?.data?.stageStatus)}`)
    const afterEarlyStart = (await request('GET', '/batches/1/stages', { token: admin }))
      .body?.data?.find(item => item.stageNumber === 5)
    check('提前开始的阶段实时状态为进行中', afterEarlyStart?.stageStatus === 'IN_PROGRESS')
    const resumed = await request('PUT', `/batches/1/stages/${stage5.id}`, {
      token: admin, body: { stageStatus: 'IN_PROGRESS' }
    })
    check('恢复自动流转后回到未开始（原定时间未到）', resumed.body?.data?.stageStatus === 'NOT_STARTED')
    // 构造「开始时间早于现在、结束时间也已过」的阶段，验证不能再提前开始
    const expiredStart = await request('PUT', `/batches/1/stages/${stage5.id}`, {
      token: admin,
      body: {
        startTime: new Date(Date.now() - 30_000).toISOString(),
        endTime: new Date(Date.now() - 10_000).toISOString(),
        stageStatus: 'STARTED'
      }
    })
    check('结束时间已过的阶段不能提前开始', expiredStart.status === 400, `status=${expiredStart.status}`)
    // 还原阶段五时间窗，避免影响后续用例
    await request('PUT', `/batches/1/stages/${stage5.id}`, {
      token: admin, body: { startTime: stage5.startTime, endTime: stage5.endTime, stageStatus: 'NOT_STARTED' }
    })
    check('提前开始的异常请求不会污染阶段时间窗',
      (await request('GET', '/batches/1/stages', { token: admin })).body?.data
        ?.find(item => item.stageNumber === 5)?.stageStatus === 'NOT_STARTED')
    const teacher2 = await login('T1002')
    const leaderAsTeacher = await request('GET', '/preferences/lab/1', { token: leader, role: 'LAB_TEACHER' })
    const own = await request('GET', '/preferences/lab/1', { token: teacher })
    check('同室非所选导师看不到报名', !leaderAsTeacher.body?.data?.some(item => item.studentId === 17))
    check('组长切换到教师身份后，只能查看报名本人的学生及面试',
      own.body?.data?.some(item => item.studentId === 17) &&
      leaderAsTeacher.body?.data?.some(item => item.studentId === ownStudentId) &&
      (await request('GET', '/interviews/lab/1', { token: leader, role: 'LAB_TEACHER' })).body?.data?.every(item => item.studentId !== 17) &&
      (await request('GET', '/interviews/lab/1', { token: leader })).status === 403 &&
      (await request('GET', '/preferences/lab/1', { token: leader })).status === 403)
    const resumeUrl = '/preferences/resumes/' + replacementResume.id
    check('简历下载必须登录', (await request('GET', resumeUrl)).status === 401)
    check('教师报送前组长不能下载其他导师学生的简历', (await request('GET', resumeUrl, { token: leader })).status === 404)
    check('所选导师可下载简历', (await request('GET', resumeUrl, { token: teacher })).status === 200)
    check('其他学生不可下载简历', (await request('GET', resumeUrl, { token: await login('2022001') })).status === 404)
    check('同室未选导师不可下载简历', (await request('GET', resumeUrl, { token: leader, role: 'LAB_TEACHER' })).status === 404)
    check('同室未选导师不可提交该生建议', (await request('POST', '/recruitment-reviews/teacher', {
      token: leader, role: 'LAB_TEACHER', body: { entries: [{ studentId: 17, type: 'INTENDED', reason: '权限测试' }], submit: true }
    })).status === 403)
    const entries = [{ studentId: 17, type: 'INTENDED', reason: '完成面试，符合方向要求' }]
    for (const [labId, staff] of [[1, teacher], [2, teacher2]]) {
      const list = await request('GET', '/interviews/lab/' + labId, { token: staff })
      const record = list.body?.data?.find(item => item.studentId === 17)
      const score = { attitudeScore: 88, logicScore: 85, programmingScore: 90, timeCommitmentScore: 92, comprehensiveScore: 89, evaluation: '表现优秀', recommendation: 'INTENDED' }
      if (labId === 1) {
        const forbidden = await request('POST', '/interviews/' + record.id + '/score', { token: leader, role: 'LAB_TEACHER', body: score })
        check('同室未选导师不可评分', forbidden.status === 403)
      }
      const scheduleBody = { studentId: 17, laboratoryId: labId, interviewTime: new Date(Date.now() - (4 - labId) * 3600000).toISOString(), location: '实训室', instructions: '请准备项目介绍' }
      if (labId === 1) {
        check('组长不能向选择其他导师的本室学生安排面试或发通知',
          (await request('POST', '/interviews/schedule', { token: leader, role: 'LAB_TEACHER', body: scheduleBody })).status === 403 &&
          (await request('POST', '/notifications', { token: leader, body: { targetUserId: 17, title: '越权通知' } })).status === 403)
      }
      const scheduled = await request('POST', '/interviews/schedule', { token: staff, body: scheduleBody })
      check('所选导师可以通知面试', scheduled.status === 200)
      if (labId === 1) {
        const repeated = await request('POST', '/interviews/schedule', { token: staff, body: scheduleBody })
        check('重复保存不发送第二条面试通知', Boolean(scheduled.body?.data?.noticeId) &&
          repeated.body?.data?.noticeId === scheduled.body.data.noticeId)
        const conflict = await request('POST', '/interviews/schedule', { token: teacher2, body: {
          ...scheduleBody, laboratoryId: 2, interviewTime: new Date(Date.parse(scheduleBody.interviewTime) + 5 * 60000).toISOString()
        } })
        check('平行志愿的面试时间重叠时拒绝安排', conflict.status === 409)
      }
      check('所选导师可以评分', (await request('POST', '/interviews/' + record.id + '/score', { token: staff, body: score })).status === 200)
    }
    const asTeacher = { token: leader, role: 'LAB_TEACHER' }

    // 并发一致性：同一教师对同一场面试并发重复提交相同评价，只应留下一条评分记录
    // （写入经服务端串行队列，且内容相同的重复提交走幂等去重）
    const scoredRecord = (await request('GET', '/interviews/lab/1', { token: teacher })).body?.data
      ?.find(item => item.studentId === 17)
    if (scoredRecord) {
      const repeatBody = { attitudeScore: 88, logicScore: 85, programmingScore: 90, timeCommitmentScore: 92,
        comprehensiveScore: 89, evaluation: '表现优秀', recommendation: 'INTENDED' }
      const repeats = await Promise.all([1, 2, 3, 4].map(() =>
        request('POST', '/interviews/' + scoredRecord.id + '/score', { token: teacher, body: repeatBody })))
      const allAccepted = repeats.every(item => item.status === 200)
      const history = (await request('GET', '/interviews/' + scoredRecord.id + '/evaluation', { token: teacher }))
        .body?.data?.history || []
      check('并发重复提交同一评价不产生重复评分记录',
        allAccepted && history.length === 1, `status=${repeats.map(r => r.status).join(',')} 记录数=${history.length}`)
    } else {
      check('并发重复评分用例可定位面试记录', false, '未找到学生 17 的面试记录')
    }

    check('面试未通过时不能发送邀请，也不能邀请选择其他导师的学生',
      (await request('POST', '/admissions/teacher-invitations', { ...asTeacher, body: { studentId: ownStudentId } })).status === 409 &&
      (await request('POST', '/admissions/teacher-invitations', { ...asTeacher, body: { studentId: 17 } })).status === 403)
    const leaderInterview = await request('POST', '/interviews/schedule', { ...asTeacher, body: {
      studentId: ownStudentId, laboratoryId: 1, interviewTime: new Date(Date.now() - 3600000).toISOString(), location: '本室'
    } })
    check('组长可以安排并评分明确选择本人的学生',
      leaderInterview.status === 200 && (await request('POST', `/interviews/${leaderInterview.body.data.id}/score`, {
        ...asTeacher, body: { attitudeScore: 90, logicScore: 90, programmingScore: 90, timeCommitmentScore: 90,
          comprehensiveScore: 90, evaluation: '通过面试', recommendation: 'INTENDED' }
      })).status === 200)
    const beforeTeacherSubmit = await request('GET', '/recruitment-reviews/lab-candidates', { token: leader })
    check('教师完成评分后仍须提交，组长本人通过名单直接汇入',
      beforeTeacherSubmit.body?.data?.some(item => item.studentId === ownStudentId && item.source === 'LEADER') &&
      !beforeTeacherSubmit.body?.data?.some(item => item.studentId === 17))
    const sent = await request('POST', '/recruitment-reviews/teacher', { token: teacher, body: { entries, submit: true } })
    check('教师可提交建议给组长', sent.status === 200)
    check('教师报送后组长可以在汇总中下载学生简历', (await request('GET', resumeUrl, { token: leader })).status === 200)
    const merged = await request('GET', '/recruitment-reviews/lab-candidates', { token: leader })
    check('全室学生汇总合并教师已提交名单和组长本人通过名单',
      merged.body?.data?.some(item => item.studentId === ownStudentId && item.source === 'LEADER') &&
      merged.body?.data?.some(item => item.studentId === 17 && item.source === 'TEACHER') &&
      (await request('GET', '/recruitment-reviews/lab-candidates', { token: teacher })).status === 403)
    const pending = await request('GET', '/admissions/my', { token: student })
    check('教师提交建议不会生成拟录取通知', !pending.body?.data?.length)
    check('教师不能直接发布拟录取', (await request('POST', '/admissions/intend', { token: teacher })).status === 409)
    const inviteRoute = '/admissions/teacher-invitations'
    const declineBefore = await request('GET', inviteRoute, { token: teacher2 })
    const invitationToDecline = await request('POST', inviteRoute, { token: teacher2, body: { studentId: 17 } })
    const declineReserved = await request('GET', inviteRoute, { token: teacher2 })
    const declined = await request('POST', `/admissions/${invitationToDecline.body?.data?.id}/confirm`, {
      token: student, body: { confirmed: false }
    })
    const declineAfter = await request('GET', inviteRoute, { token: teacher2 })
    check('学生放弃后会自动释放导师名额并记录放弃',
      invitationToDecline.status === 200 && declined.body?.data?.status === 'REJECTED' &&
      declineReserved.body?.data?.occupied === declineBefore.body?.data?.occupied + 1 &&
      declineAfter.body?.data?.occupied === declineBefore.body?.data?.occupied &&
      declineAfter.body?.data?.invitations.some(item => item.id === invitationToDecline.body.data.id && item.status === 'REJECTED'))
    await request('PUT', '/laboratories/1/teachers/1', { token: admin, body: { recruitmentQuota: 0 } })
    check('导师名额不足时不能发出入组邀请',
      (await request('POST', inviteRoute, { ...asTeacher, body: { studentId: ownStudentId } })).status === 409)
    await request('PUT', '/laboratories/1/teachers/1', { token: admin, body: { recruitmentQuota: null } })
    const invited = await request('POST', inviteRoute, { ...asTeacher, body: { studentId: ownStudentId } })
    const sentAgain = await request('POST', inviteRoute, { ...asTeacher, body: { studentId: ownStudentId } })
    const received = await request('GET', '/admissions/my', { token: ownStudent })
    const notices = await request('GET', '/notifications/my', { token: ownStudent })
    check('同一邀请只通知一次，学生可在首轮查看导师邀请',
      invited.status === 200 && sentAgain.body?.data?.id === invited.body?.data?.id &&
      received.body?.data?.some(item => item.id === invited.body.data.id && item.source === 'TEACHER_INVITATION') &&
      notices.body?.data?.filter(item => item.title.includes('面试通过与入组邀请')).length === 1)
    check('接受邀请前学生不会加入小组',
      !(await request('GET', '/admissions/teacher-members', asTeacher)).body?.data?.some(item => item.studentId === ownStudentId))
    const acceptedInvitation = await request('POST', `/admissions/${invited.body?.data?.id}/confirm`, {
      token: ownStudent, body: { confirmed: true }
    })
    check('学生接受后自动加入邀请导师的小组，其他教师看不到',
      acceptedInvitation.body?.data?.status === 'CONFIRMED' &&
      (await request('GET', '/admissions/teacher-members', asTeacher)).body?.data?.some(item => item.studentId === ownStudentId) &&
      !(await request('GET', '/admissions/teacher-members', { token: teacher })).body?.data?.some(item => item.studentId === ownStudentId))
    const grouped = await request('GET', '/recruitment-reviews/lab-students', { token: leader })
    const groupRows = grouped.body?.data || []
    const names = groupRows.map(item => item.teacherName)
    check('组长按教师姓氏查看本室全量报名汇总，教师不能访问',
      names.join(',') === [...names].sort(new Intl.Collator('zh-Hans-CN-u-co-pinyin').compare).join(',') &&
      groupRows.some(item => item.students.some(row => row.studentId === ownStudentId && row.invitationStatus === 'CONFIRMED')) &&
      groupRows.some(item => item.students.some(row => row.studentId === 17)) &&
      (await request('GET', '/recruitment-reviews/lab-students', { token: teacher })).status === 403)
    const returned = await request('POST', '/recruitment-reviews/teacher/' + sent.body?.data?.id + '/return', { token: leader, body: { reason: '补充说明' } })
    check('组长可以填写原因退回', returned.body?.data?.status === 'RETURNED')
    await request('POST', '/recruitment-reviews/teacher', { token: teacher, body: { entries, submit: true } })
    const confirmedEntry = { studentId: ownStudentId, type: 'INTENDED', reason: '本人已经接受邀请' }
    const labReview = await request('POST', '/recruitment-reviews/lab', { token: leader, body: { entries: [...entries, confirmedEntry] } })
    check('组长报送名单即生效，不再经过学院审核',
      labReview.status === 200 && labReview.body?.data?.status === 'APPROVED' && labReview.body?.data?.autoPublished === true)
    check('名单生效后学生立即可见拟录取记录',
      (await request('GET', '/admissions/my', { token: student })).body?.data?.some(item => item.laboratoryId === 1))
    await openStage(5)
    check('已接受的教师邀请随本室名单报送时不会生成重复录取',
      (await request('GET', '/admissions/my', { token: ownStudent })).body?.data?.length === 1)
    const offers = await request('GET', '/admissions/my', { token: student })
    const offer = offers.body?.data?.find(item => item.laboratoryId === 1)
    check('学生可确认拟录取', (await request('POST', '/admissions/' + offer?.id + '/confirm', { token: student, body: { confirmed: true } })).status === 200)

    console.log('\n== 4. 调剂规则 ==')
    const stage6 = stages.body?.data?.find(s => s.stageNumber === 6)
    await request('PUT', `/batches/1/stages/${stage6.id}`, {
      token: admin, body: { startTime: new Date(Date.now() - 60_000).toISOString(), endTime: new Date(Date.now() + 3600_000).toISOString(), stageStatus: 'IN_PROGRESS' }
    })
    const earlyAdjustment = await request('POST', '/adjustments/internal', {
      token: leader, body: { studentId: 16, targetLaboratoryId: 1, targetLabTeacherId: 1, reason: '首轮尚未关闭' }
    })
    check('首轮没有结束时内部调剂不可办理', earlyAdjustment.status === 409)
    for (const number of [4, 5]) {
      const finishedStage = stages.body.data.find(item => item.stageNumber === number)
      await request('PUT', `/batches/1/stages/${finishedStage.id}`, { token: admin, body: { stageStatus: 'COMPLETED' } })
    }
    const candidates = await request('GET', '/statistics/lab/1/candidates', { token: leader })
    const eligible = (candidates.body?.data || []).find((c) => c.eligible)
    check('内部调剂候选接口可用', candidates.status === 200)

    const alreadyPlaced = await request('POST', '/adjustments/internal', {
      token: leader,
      body: { studentId: 17, targetLaboratoryId: 1, sourceLaboratoryId: 1, reason: '已录取学生再次调剂' }
    })
    check('已确认录取学生进入调剂池被拒绝', alreadyPlaced.status === 400, JSON.stringify(alreadyPlaced.body))

    if (eligible) {
      await request('PUT', '/laboratories/1/teachers/1', { token: admin, body: { recruitmentQuota: 0 } })
      const full = await request('POST', '/adjustments/internal', {
        token: leader, body: { studentId: eligible.studentId, targetLaboratoryId: 1, targetLabTeacherId: 1, reason: '导师名额校验' }
      })
      check('内部调剂不能占用已满导师名额', full.status === 400 && full.body?.message?.includes('导师招生名额'))
      await request('PUT', '/laboratories/1/teachers/1', { token: admin, body: { recruitmentQuota: null } })
      const [first, second] = await Promise.all([
        request('POST', '/adjustments/internal', {
          token: leader, body: { studentId: eligible.studentId, targetLaboratoryId: 1, targetLabTeacherId: 1, sourceLaboratoryId: 1, reason: '并发测试A' }
        }),
        request('POST', '/adjustments/internal', {
          token: leader, body: { studentId: eligible.studentId, targetLaboratoryId: 1, targetLabTeacherId: 1, sourceLaboratoryId: 1, reason: '并发测试B' }
        })
      ])
      const okCount = [first, second].filter((r) => r.status === 200).length
      check('并发提交同一学生只成功一次', okCount === 1, `ok=${okCount}`)
      const adjustment = [first, second].find(result => result.status === 200)?.body?.data
      const candidateToken = await login('2022011')
      check('学生可在阶段内确认本人内部调剂', (await request('POST', '/adjustments/' + adjustment?.id + '/confirm', {
        token: candidateToken, body: { confirmed: true }
      })).status === 200)
    } else {
      check('存在可内部调剂的候选学生', false, '种子数据中没有 eligible 候选')
    }
    await request('PUT', '/batches/1/stages/' + stage6.id, { token: admin, body: { stageStatus: 'COMPLETED' } })
    const internal = await request('POST', '/recruitment-reviews/internal', { token: leader })
    check('内部调剂结束后可报送学院', internal.body?.data?.status === 'SUBMITTED')
    check('学院可审核内部调剂版本', (await request('POST', '/recruitment-reviews/internal/' + internal.body?.data?.id + '/review', {
      token: admin, body: { approve: true }
    })).body?.data?.status === 'APPROVED')

    console.log('\n== 5. 最终名单与公示 ==')
    // 阶段顺序校验要求第 8 阶段开始时间不早于第 7 阶段，先推进第 7 阶段时间窗
    await openStage(7)
    await openStage(8)
    const merge = await request('POST', '/final/merge', { token: admin })
    check('生成最终名单成功', merge.status === 200, JSON.stringify(merge.body))
    const unpublished = await request('GET', '/final/my', { token: student })
    check('公示前不返回个人录取结果', unpublished.status === 200 && unpublished.body?.data === null)
    const unreviewed = await request('GET', '/final/list', { token: admin })
    const entry = unreviewed.body?.data?.perLab?.find(item => item.laboratoryId === 1)?.students?.find(item => item.studentId === 17)
    check('组长不能在学院审核、公示前办理入组', Boolean(entry) &&
      (await request('POST', '/final/' + entry.id + '/enroll', { token: leader })).status === 409)

    const checkList = await request('GET', '/final/check', { token: admin })
    check('最终名单校验通过', checkList.status === 200, JSON.stringify(checkList.body?.data))

    const review = await request('POST', '/final/review', { token: admin, body: { status: 'APPROVED', note: '测试审核通过' } })
    check('最终名单审核通过', review.status === 200)

    const publish = await request('POST', '/final/publicity', {
      token: admin,
      body: {
        title: '2026 届实训室选拔结果公示',
        content: '公示期 3 天',
        startAt: new Date(Date.now() - 60_000).toISOString(),
        endAt: new Date(Date.now() + 3600_000).toISOString()
      }
    })
    check('公示发布成功', publish.status === 200, JSON.stringify(publish.body))

    const objection = await request('POST', '/final/objections/student', {
      token: student, body: { type: '成绩异议', content: '对面试成绩有疑问' }
    })
    check('学生在公示期间可提交异议', objection.status === 200, JSON.stringify(objection.body))

    const enrollAll = await request('POST', '/final/enroll-all', { token: admin, body: { force: true } })
    check('批量正式入组成功', enrollAll.status === 200, JSON.stringify(enrollAll.body))

    const finalList = await request('GET', '/final/list', { token: admin })
    const perLab = finalList.body?.data?.perLab || []
    const over = perLab.filter((l) => l.students.length > l.quota)
    const allStudents = perLab.flatMap((l) => l.students.map((s) => s.studentId))
    check('最终名单无超额录取', over.length === 0, JSON.stringify(over))
    check('最终名单无重复录取', new Set(allStudents).size === allStudents.length)

    const myFinal = await request('GET', '/final/my', { token: student })
    check('学生可查看本人最终结果', myFinal.status === 200 && Boolean(myFinal.body?.data))

    console.log('\n== 6. 个人信息 / 分页 / 导师团队 / 文件上传 ==')
    const profile = await request('PUT', '/auth/profile', {
      token: student, body: { phone: '13900009999', email: 'student@example.com' }
    })
    check('学生修改个人信息成功', profile.status === 200, JSON.stringify(profile.body))
    const me = await request('GET', '/auth/me', { token: student })
    check('个人信息修改已持久化', me.body?.data?.user?.email === 'student@example.com')

    const pagedStudents = await request('GET', '/users?role=STUDENT&page=1&pageSize=5', { token: admin })
    check(
      '学生列表支持服务端分页',
      pagedStudents.status === 200 && Array.isArray(pagedStudents.body?.data?.list) &&
        pagedStudents.body.data.list.length <= 5 && pagedStudents.body.data.total > 0,
      JSON.stringify(pagedStudents.body?.data)
    )

    const pagedLogs = await request('GET', '/logs?page=1&pageSize=5', { token: admin })
    check(
      '操作日志支持服务端分页',
      pagedLogs.status === 200 && Array.isArray(pagedLogs.body?.data?.list) && pagedLogs.body.data.total > 0
    )

    const mentorCreate = await request('POST', '/laboratories/1/teachers', {
      token: admin, body: { name: '测试导师', title: '讲师', direction: '测试方向', intro: '冒烟测试', userId: newTeacher.body.data.id }
    })
    check('新增实训室导师成功', mentorCreate.status === 200, JSON.stringify(mentorCreate.body))
    const mentorId = mentorCreate.body?.data?.id
    const labDetail = await request('GET', '/laboratories/1')
    check(
      '实训室详情包含导师团队',
      Array.isArray(labDetail.body?.data?.teachers) &&
        labDetail.body.data.teachers.some((t) => t.id === mentorId)
    )
    const mentorUpdate = await request('PUT', `/laboratories/1/teachers/${mentorId}`, {
      token: admin, body: { title: '副教授' }
    })
    check('修改实训室导师成功', mentorUpdate.status === 200 && mentorUpdate.body?.data?.title === '副教授')
    const mentorDelete = await request('DELETE', `/laboratories/1/teachers/${mentorId}`, { token: admin })
    check('删除实训室导师成功', mentorDelete.status === 200)
    const mentorForbidden = await request('POST', '/laboratories/2/teachers', {
      token: leader, body: { name: '越权导师' }
    })
    check('组长不能维护导师团队（由学院统一维护）', mentorForbidden.status === 403)

    const document = new FormData()
    document.append('file', new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), 'briefing.pdf')
    const uploadedDocument = await fetch(BASE + '/media/labs/1/materials', {
      method: 'POST', headers: { Authorization: 'Bearer ' + leader }, body: document
    })
    const materialId = (await uploadedDocument.json()).data?.id
    const documentPath = '/media/labs/1/materials/' + materialId
    check('组长上传本室宣讲文档后学生可下载', uploadedDocument.status === 200 && Boolean(materialId) &&
      (await request('GET', documentPath, { token: student })).status === 200)
    check('宣讲文档只有本室组长可以移除',
      (await request('DELETE', documentPath, { token: admin })).status === 403 &&
      (await request('DELETE', '/media/labs/2/materials/' + materialId, { token: leader })).status === 403 &&
      (await request('DELETE', documentPath, { token: leader })).status === 200 &&
      (await request('GET', documentPath, { token: student })).status === 404)

    // 真实文件上传（multipart）
    const form = new FormData()
    form.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }), 'test.png')
    const uploadRes = await fetch(`${BASE}/media/upload`, {
      method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form
    })
    const uploadJson = await uploadRes.json().catch(() => null)
    check('文件上传成功并返回地址', uploadRes.status === 200 && /^\/uploads\//.test(uploadJson?.data?.url || ''))
    if (uploadJson?.data?.url) {
      try { fs.unlinkSync(path.join(ROOT, 'uploads', path.basename(uploadJson.data.url))) } catch { /* ignore */ }
    }
    const uploadForbidden = await fetch(`${BASE}/media/upload`, {
      method: 'POST', headers: { Authorization: `Bearer ${student}` }, body: form
    })
    check('学生无文件上传权限', uploadForbidden.status === 403)

    console.log('\n== 7. 面试阶段提前开始后的排期约束 ==')
    const lateStages = (await request('GET', '/batches/1/stages', { token: admin })).body?.data || []
    const stage4 = lateStages.find((s) => s.stageNumber === 4)
    const onlineBody = {
      studentId: ownStudentId, laboratoryId: 1, mode: 'LIVEKIT', durationMinutes: 30, interviewStatus: 'SCHEDULED',
      interviewTime: new Date(Date.now() + 3600000).toISOString()
    }
    // 原定开始时间在未来、还没提前开始 → 拒绝，并说清怎么解
    await request('PUT', `/batches/1/stages/${stage4.id}`, { token: admin, body: {
      startTime: new Date(Date.now() + 3 * 86400000).toISOString(),
      endTime: new Date(Date.now() + 4 * 86400000).toISOString(),
      stageStatus: 'NOT_STARTED'
    } })
    const closedStage = await request('POST', '/interviews/schedule', { token: leader, role: 'LAB_TEACHER', body: onlineBody })
    check('面试阶段还没开放时提示去学院端「提前开始」',
      closedStage.status === 409 && /尚未开始/.test(closedStage.body?.message || ''),
      `status=${closedStage.status} msg=${closedStage.body?.message}`)
    // 学院端点「提前开始」：原定开始时间仍在未来，但阶段已对业务开放。
    // 该学生在本套用例里面试已完成，这里只断言「阶段闸门已放行」——不再返回阶段时间窗类错误。
    await request('PUT', `/batches/1/stages/${stage4.id}`, { token: admin, body: { stageStatus: 'STARTED' } })
    const earlyStage = await request('POST', '/interviews/schedule', { token: leader, role: 'LAB_TEACHER', body: onlineBody })
    check('提前开始的面试阶段不再用原定开始时间卡排期',
      !/尚未开始|未开放|阶段开始时间|已暂停|已结束/.test(earlyStage.body?.message || ''),
      `status=${earlyStage.status} msg=${earlyStage.body?.message}`)

    console.log('\n== 8. 重新开始（整条时间窗回到第 1 阶段） ==')
    const restartDenied = await request('POST', '/batches/1/stages/restart', { token: leader, body: {} })
    check('组长不能重新开始选拔批次', restartDenied.status === 403, `status=${restartDenied.status}`)
    const restarted = await request('POST', '/batches/1/stages/restart', {
      token: admin, body: { mode: 'UNIFORM', stageDays: 1 }
    })
    const restartedStages = restarted.body?.data?.stages || []
    check('重新开始后第 1 阶段立即进行中',
      restarted.status === 200 && restartedStages.find((s) => s.stageNumber === 1)?.stageStatus === 'IN_PROGRESS',
      `status=${restarted.status} body=${JSON.stringify(restarted.body?.data?.stages?.[0]?.stageStatus)}`)
    check('重新开始后其余阶段回到未开始',
      restartedStages.filter((s) => s.stageNumber > 1).length === 7 &&
      restartedStages.filter((s) => s.stageNumber > 1).every((s) => s.stageStatus === 'NOT_STARTED'))
    check('重新开始会清除暂停/提前开始/提前结束的人工干预',
      restartedStages.every((s) => !s.statusOverride))
    check('重新开始后八阶段首尾相接且整段约 8 天',
      restartedStages.every((s, i) => i === 0 ||
        Date.parse(s.startTime) === Date.parse(restartedStages[i - 1].endTime)) &&
      Math.abs(Date.parse(restartedStages[7].endTime) - Date.parse(restartedStages[0].startTime) - 8 * 86400000) < 1000)
    const switchedBatch = await request('GET', '/batches/current', { token: admin })
    check('重新开始后批次状态回到进行中',
      switchedBatch.body?.data?.status === 'IN_PROGRESS',
      `status=${switchedBatch.body?.data?.status}`)
    // 指定起点 + 沿用原时长：应保留各阶段 1 天的长度
    const anchor = new Date(Date.now() + 2 * 86400000).toISOString()
    const keptRestart = await request('POST', '/batches/1/stages/restart', {
      token: admin, body: { mode: 'KEEP', startTime: anchor }
    })
    const keptStages = keptRestart.body?.data?.stages || []
    check('可按指定起点沿用原各阶段时长',
      keptRestart.status === 200 && keptRestart.body?.data?.mode === 'KEEP' &&
      Math.abs(Date.parse(keptStages[0]?.startTime) - Date.parse(anchor)) < 60000 &&
      Math.abs(Date.parse(keptStages[0]?.endTime) - Date.parse(keptStages[0]?.startTime) - 86400000) < 1000)
    check('起点在未来时八阶段全部未开始',
      keptStages.every((s) => s.stageStatus === 'NOT_STARTED'))
  } finally {
    fs.rmSync(RESUME_DIR, { recursive: true, force: true })
    child.kill()
    await new Promise((r) => setTimeout(r, 300))
    try { fs.unlinkSync(TEST_STORE) } catch { /* ignore */ }
    try { fs.unlinkSync(TEST_STORE + '.tmp') } catch { /* ignore */ }
  }

  console.log(`\n===== 测试结果：通过 ${passed}，失败 ${failures.length} =====`)
  if (failures.length) {
    failures.forEach((f) => console.log(' - ' + f))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
