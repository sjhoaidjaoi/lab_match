/**
 * 实训室资料统一管理 · 验收测试
 * 使用独立数据副本启动服务，不修改开发库
 * 运行：npm run test:profile
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const TEST_STORE = path.join(ROOT, 'data', `.store.profile-${process.pid}.json`)
const TMP_DIR = path.join(os.tmpdir(), 'lab-match-profile-' + process.pid)
const PORT = 8101
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

async function request(method, url, { token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  let json = null
  try { json = await res.json() } catch { /* 非 JSON 响应 */ }
  return { status: res.status, body: json }
}

/** multipart 上传（用于宣传资料） */
async function upload(token, labId, fileName, content, mime = 'application/pdf') {
  const boundary = '----test' + Date.now()
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`),
    Buffer.from(content),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ])
  const res = await fetch(`${BASE}/lab-profiles/labs/${labId}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: payload
  })
  let json = null
  try { json = await res.json() } catch { /* ignore */ }
  return { status: res.status, body: json }
}

const passwords = new Map()
const ACTIVATED = 'Profile-qa-2601'

async function login(username) {
  const password = passwords.get(username) ?? '123456'
  const res = await request('POST', '/auth/login', { body: { username, password } })
  if (res.status !== 200) throw new Error(`登录失败 ${username}: ${JSON.stringify(res.body)}`)
  const { token, user } = res.body.data
  if (!user.mustChangePassword) return token
  const updated = await request('PUT', '/auth/password', {
    token, body: { oldPassword: password, newPassword: ACTIVATED }
  })
  if (updated.status !== 200) throw new Error(`首登改密失败 ${username}`)
  passwords.set(username, ACTIVATED)
  return updated.body.data.token
}

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + '/health')
      if (res.ok) return true
    } catch { /* 重试 */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

async function main() {
  const child = spawn(process.execPath, ['app.js'], {
    cwd: ROOT,
    env: {
      ...process.env, DB_DRIVER: 'file', PORT: String(PORT),
      LAB_STORE_FILE: TEST_STORE, LAB_SEED_DEMO: 'true',
      LAB_RATE_LIMIT: 'off',
      LAB_RESUME_DIR: path.join(TMP_DIR, 'resume'),
      LAB_BRIEFING_DIR: path.join(TMP_DIR, 'briefing'),
      LAB_PROMOTION_DIR: path.join(TMP_DIR, 'promotion')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => {
    const text = d.toString().trim()
    if (text) console.error('[server]', text)
  })

  try {
    if (!await waitForServer()) throw new Error('后端未能启动')
    const admin = await login('admin')
    const leader = await login('L001')
    const student = await login('2022001')

    console.log('\n== 一、总览与初始化状态 ==')
    const overview = await request('GET', '/lab-profiles/overview', { token: admin })
    check('学院可读取实训室总览', overview.status === 200)
    check('总览包含统计数据与学年口径',
      typeof overview.body?.data?.stats?.labCount === 'number' &&
      /^\d{4}-\d{4}$/.test(overview.body?.data?.academicYear || ''),
      JSON.stringify(overview.body?.data?.stats))
    const CURRENT_YEAR = overview.body?.data?.academicYear
    const OTHER_YEAR = '2020-2021'
    const seededLabs = overview.body?.data?.labs || []
    check('总览返回真实实训室列表', seededLabs.length >= 5, `实际 ${seededLabs.length}`)
    check('每条记录带资料完善度与名额统计',
      seededLabs.every((lab) => typeof lab.completeness === 'number' && typeof lab.totalQuota === 'number'))

    console.log('\n== 二、实训室基础资料 ==')
    const created = await request('POST', '/lab-profiles/labs', {
      token: admin, body: { labCode: '901', name: '测试实训室' }
    })
    check('新增实训室成功', created.status === 200 && created.body?.data?.labCode === '901')
    const labId = created.body?.data?.id
    check('未填写字段保持为空', created.body?.data?.college === '' && created.body?.data?.location === '')
    const duplicate = await request('POST', '/lab-profiles/labs', {
      token: admin, body: { labCode: '901', name: '重复编号' }
    })
    check('实训室编号必须唯一', duplicate.status === 409, duplicate.body?.message)

    const saved = await request('PUT', `/lab-profiles/labs/${labId}`, {
      token: admin,
      body: {
        college: '软件学院', location: '实验楼 A901', researchDirection: '测试方向',
        description: '测试简介', detail: '测试详细介绍', features: '测试特色',
        achievements: '测试成果', equipment: '测试设备', contact: '010-00000000', remark: '测试备注'
      }
    })
    check('学院可修改全部基础资料', saved.status === 200 && saved.body?.data?.college === '软件学院')
    const detail = await request('GET', `/lab-profiles/labs/${labId}`, { token: admin })
    check('保存后读取到最新资料',
      detail.body?.data?.location === '实验楼 A901' &&
      detail.body?.data?.equipment === '测试设备' &&
      detail.body?.data?.remark === '测试备注')
    check('完善度随资料填写提升', (detail.body?.data?.completeness || 0) > 0)

    console.log('\n== 三、组长端权限边界 ==')
    const leaderLabOverview = await request('GET', '/lab-profiles/overview', { token: leader })
    check('组长只能看到本实训室', leaderLabOverview.body?.data?.labs?.length === 1,
      `实际 ${leaderLabOverview.body?.data?.labs?.length}`)
    const crossWrite = await request('PUT', `/lab-profiles/labs/${labId}`, {
      token: leader, body: { name: '组长越权改名' }
    })
    check('组长不能修改其他实训室资料', crossWrite.status === 403, String(crossWrite.status))
    const ownWrite = await request('PUT', '/lab-profiles/labs/1', {
      token: leader, body: { name: '组长越权改名' }
    })
    check('组长不能修改本室基础资料', ownWrite.status === 403, ownWrite.body?.message)
    const ownLegacyWrite = await request('PUT', '/laboratories/1', {
      token: leader, body: { name: '旧接口越权改名' }
    })
    check('组长无法通过旧接口改基础资料', ownLegacyWrite.status === 403, ownLegacyWrite.body?.message)
    const leaderMediaWrite = await request('PUT', '/laboratories/1', {
      token: leader, body: { briefingVideoUrl: 'https://example.com/demo.mp4', briefingVideoType: 'MP4' }
    })
    check('组长仍可维护本室宣讲媒体', leaderMediaWrite.status === 200, leaderMediaWrite.body?.message)

    console.log('\n== 四、教师信息管理 ==')
    const teacher1 = await request('POST', `/lab-profiles/labs/${labId}/teachers`, {
      token: admin, body: { name: '教师甲', employeeNo: 'QA-901-01', title: '讲师', degree: '硕士', direction: '测试方向' }
    })
    check('学院可新增教师', teacher1.status === 200 && teacher1.body?.data?.name === '教师甲')
    check('新增教师不会自动创建登录账号', teacher1.body?.data?.userId === null)
    const teacher2 = await request('POST', `/lab-profiles/labs/${labId}/teachers`, {
      token: admin, body: { name: '教师乙', employeeNo: 'QA-901-02', identity: 'TEACHER' }
    })
    check('可新增第二名教师', teacher2.status === 200)
    const badEmail = await request('POST', `/lab-profiles/labs/${labId}/teachers`, {
      token: admin, body: { name: '邮箱错误', email: 'not-an-email' }
    })
    check('邮箱格式校验生效', badEmail.status === 400, badEmail.body?.message)
    const dupNo = await request('POST', `/lab-profiles/labs/${labId}/teachers`, {
      token: admin, body: { name: '重复编号', employeeNo: 'QA-901-01' }
    })
    check('教师编号唯一', dupNo.status === 409, dupNo.body?.message)
    const updateTeacher = await request('PUT', `/lab-profiles/labs/${labId}/teachers/${teacher1.body.data.id}`, {
      token: admin, body: { title: '副教授', office: 'A901-1' }
    })
    check('学院可编辑教师资料', updateTeacher.status === 200 && updateTeacher.body?.data?.title === '副教授')
    const leaderTeacher = await request('POST', `/lab-profiles/labs/${labId}/teachers`, {
      token: leader, body: { name: '组长新增' }
    })
    check('组长不能新增教师', leaderTeacher.status === 403, leaderTeacher.body?.message)
    const leaderTeacherList = await request('GET', `/lab-profiles/labs/1/teachers`, { token: leader })
    check('组长可只读查看本室教师', leaderTeacherList.status === 200 && Array.isArray(leaderTeacherList.body?.data))
    check('本室成员可见教师账号绑定',
      (leaderTeacherList.body?.data || []).some((item) => item.accountName !== null))
    const outsiderTeacherList = await request('GET', `/lab-profiles/labs/1/teachers`, { token: student })
    check('非本室成员读不到教师账号绑定信息',
      (outsiderTeacherList.body?.data || []).every((item) => item.accountName === null && item.userId === null))

    console.log('\n== 五、招生名额 ==')
    const plan = await request('PUT', `/lab-profiles/labs/${labId}/plan`, {
      token: admin, body: { academicYear: CURRENT_YEAR, totalQuota: 20 }
    })
    check('学院可设置学年总名额', plan.status === 200 && plan.body?.data?.totalQuota === 20)
    const negative = await request('PUT', `/lab-profiles/labs/${labId}/plan`, {
      token: admin, body: { academicYear: CURRENT_YEAR, totalQuota: -3 }
    })
    check('名额必须为非负整数', negative.status === 400, negative.body?.message)
    const allocate = await request('PUT', `/lab-profiles/labs/${labId}/teacher-quotas`, {
      token: admin,
      body: { academicYear: CURRENT_YEAR, items: [{ labTeacherId: teacher1.body.data.id, quota: 8 }, { labTeacherId: teacher2.body.data.id, quota: 7 }] }
    })
    check('教师名额分配成功且自动汇总',
      allocate.status === 200 && allocate.body?.data?.allocatedQuota === 15 &&
      allocate.body?.data?.unallocatedQuota === 5, JSON.stringify(allocate.body?.data))
    const overAllocate = await request('PUT', `/lab-profiles/labs/${labId}/teacher-quotas`, {
      token: admin,
      body: { academicYear: CURRENT_YEAR, items: [{ labTeacherId: teacher1.body.data.id, quota: 30 }] }
    })
    check('教师名额总和不得超过总名额', overAllocate.status === 409, overAllocate.body?.message)
    const shrink = await request('PUT', `/lab-profiles/labs/${labId}/plan`, {
      token: admin, body: { academicYear: CURRENT_YEAR, totalQuota: 10 }
    })
    check('总名额不得低于已分配名额', shrink.status === 409, shrink.body?.message)
    const otherYear = await request('PUT', `/lab-profiles/labs/${labId}/plan`, {
      token: admin, body: { academicYear: OTHER_YEAR, totalQuota: 12 }
    })
    const thisYear = await request('GET', `/lab-profiles/labs/${labId}/quotas?academicYear=${CURRENT_YEAR}`, { token: admin })
    const lastYear = await request('GET', `/lab-profiles/labs/${labId}/quotas?academicYear=${OTHER_YEAR}`, { token: admin })
    check('不同学年计划互不覆盖',
      otherYear.status === 200 && thisYear.body?.data?.totalQuota === 20 && lastYear.body?.data?.totalQuota === 12,
      `${CURRENT_YEAR}=${thisYear.body?.data?.totalQuota}, ${OTHER_YEAR}=${lastYear.body?.data?.totalQuota}`)
    check('名额接口返回已分配 / 未分配 / 已录取',
      typeof thisYear.body?.data?.allocatedQuota === 'number' &&
      typeof thisYear.body?.data?.unallocatedQuota === 'number' &&
      typeof thisYear.body?.data?.enrolled === 'number')
    const leaderPlan = await request('PUT', `/lab-profiles/labs/${labId}/plan`, {
      token: leader, body: { academicYear: CURRENT_YEAR, totalQuota: 99 }
    })
    check('组长不能修改招生名额', leaderPlan.status === 403, leaderPlan.body?.message)

    console.log('\n== 六、宣传资料 ==')
    const uploadOk = await upload(leader, 1, '本室宣传资料.pdf', '%PDF-1.4\n% test\n')
    check('组长可上传本室宣传资料', uploadOk.status === 200 && uploadOk.body?.data?.fileName === '本室宣传资料.pdf',
      uploadOk.body?.data?.fileName)
    check('中文文件名不乱码', uploadOk.body?.data?.fileName === '本室宣传资料.pdf')
    const uploadCross = await upload(leader, labId, '越权文件.pdf', '%PDF-1.4\n% test\n')
    check('组长不能上传其他实训室资料', uploadCross.status === 403, String(uploadCross.status))
    const fileList = await request('GET', '/lab-profiles/labs/1/files', { token: admin })
    check('学院可查看本室宣传资料', fileList.status === 200 && fileList.body?.data?.length === 1)
    const allFiles = await request('GET', '/lab-profiles/files', { token: admin })
    check('学院可查看全院宣传资料', allFiles.status === 200 && allFiles.body?.data?.length >= 1)
    const leaderAll = await request('GET', '/lab-profiles/files', { token: leader })
    check('组长不能查看全院资料清单', leaderAll.status === 403, String(leaderAll.status))
    const fileId = uploadOk.body?.data?.id
    const download = await fetch(`${BASE}/lab-profiles/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${admin}` }
    })
    check('宣传资料可下载', download.status === 200 && download.headers.get('content-type') === 'application/pdf')
    const badType = await upload(leader, 1, '脚本.exe', 'MZ', 'application/octet-stream')
    check('非法文件类型被拒绝', badType.status === 400, badType.body?.message)

    console.log('\n== 七、数据统一与只读联动 ==')
    const studentView = await request('GET', `/laboratories/${labId}`, { token: student })
    check('学生端可读取学院维护的最新资料',
      studentView.status === 200 && studentView.body?.data?.college === '软件学院' &&
      studentView.body?.data?.detail === '测试详细介绍', studentView.body?.message)
    check('学生端看到本学年招生名额',
      studentView.body?.data?.recruitmentQuota === 20, String(studentView.body?.data?.recruitmentQuota))
    check('名称为空时展示编号兜底名',
      typeof studentView.body?.data?.displayName === 'string' && studentView.body.data.displayName.length > 0)
    const leaderQuotaView = await request('GET', `/lab-profiles/labs/1/quotas`, { token: leader })
    check('组长只读查看名额', leaderQuotaView.status === 200 && leaderQuotaView.body?.data?.editable === false)

    console.log('\n== 八、移除教师与历史保护 ==')
    const removeTeacher = await request('DELETE', `/lab-profiles/labs/${labId}/teachers/${teacher2.body.data.id}`, { token: admin })
    check('学院可移除教师', removeTeacher.status === 200)
    const afterRemove = await request('GET', `/lab-profiles/labs/${labId}/teachers`, { token: admin })
    check('移除后教师不再出现在列表',
      (afterRemove.body?.data || []).every((item) => item.id !== teacher2.body.data.id))
    const removedRecord = await request('GET', '/logs?pageSize=5', { token: admin })
    check('移除教师写入操作日志', removedRecord.status === 200)

    const accountLab = (await request('POST', '/lab-profiles/labs', { token: admin, body: { labCode: 'QA-TEAM' } })).body.data
    const profile = (await request('POST', '/lab-profiles/labs/' + accountLab.id + '/teachers', {
      token: admin, body: { name: '测试导师', employeeNo: 'QA-TEAM-T' }
    })).body.data
    for (const [role, employeeNumber, teacherProfileId] of [
      ['LAB_TEACHER', 'QA-TEAM-T', profile.id], ['LAB_LEADER', 'QA-TEAM-L', undefined]
    ]) {
      const created = await request('POST', '/users', { token: admin, body: { realName: '测试导师', employeeNumber,
        role, laboratoryId: accountLab.id, linkTeacherProfile: true, teacherProfileId } })
      check(role + '账号可在实训室资料中创建', created.status === 200, JSON.stringify(created.body).slice(0,160))
      check(role + '账号可以登录', Boolean(await login(employeeNumber)))
    }
    const team = await request('GET', '/lab-profiles/labs/' + accountLab.id + '/teachers', { token: admin })
    check('组长和普通教师各自绑定到本室唯一档案', team.body?.data?.length === 2 &&
      team.body.data.every(row => row.userId) && team.body.data.some(row => row.identity === 'LEADER'))
    console.log('\n== 九、鉴权 ==')
    const noToken = await request('GET', '/lab-profiles/overview')
    check('未登录访问被拒绝', noToken.status === 401, String(noToken.status))
    const noToken2 = await request('POST', '/lab-profiles/labs', { body: { labCode: '902' } })
    check('未登录不能新增实训室', noToken2.status === 401, String(noToken2.status))
  } finally {
    child.kill()
    await new Promise((r) => setTimeout(r, 300))
    try { fs.unlinkSync(TEST_STORE) } catch { /* ignore */ }
    try { fs.rmSync(TMP_DIR, { recursive: true, force: true }) } catch { /* ignore */ }
  }

  console.log(`\n结果：通过 ${passed} 项，失败 ${failures.length} 项`)
  if (failures.length) {
    console.log('失败明细：\n - ' + failures.join('\n - '))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('测试异常：', error)
  process.exitCode = 1
})
