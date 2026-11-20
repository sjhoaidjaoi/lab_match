const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const net = require('node:net')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const { setTimeout: sleep } = require('node:timers/promises')
const { TokenVerifier } = require('livekit-server-sdk')
const { AccessToken } = require('livekit-server-sdk')
const { createHash, randomUUID } = require('node:crypto')

const key = 'test-livekit-key'
const secret = 'test-livekit-secret-used-only-in-this-isolated-fixture'
const password = 'VideoTest-123!'
const iso = minutes => new Date(Date.now() + minutes * 60_000).toISOString()

async function startFixture(extraEnv = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-match-video-'))
  const file = path.join(tmp, 'store.json')
  const listener = net.createServer()
  listener.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const { port } = listener.address()
  await new Promise(resolve => listener.close(resolve))
  const base = `http://127.0.0.1:${port}/api`
  const child = spawn(process.execPath, ['app.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_DRIVER: 'file', PORT: String(port), LAB_STORE_FILE: file,
      LAB_RATE_LIMIT: 'off',
      LAB_SEED_DEMO: 'true', LAB_ADMIN_PASSWORD: '', LAB_RESUME_DIR: path.join(tmp, 'resumes'),
      LAB_BRIEFING_DIR: path.join(tmp, 'briefing'), LIVEKIT_URL: 'wss://interviews.example.invalid',
      LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, ...extraEnv },
    stdio: ['ignore', 'ignore', 'pipe']
  })
  child.stderr.on('data', chunk => process.stderr.write(chunk))

  async function close() {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill()
      await once(child, 'exit')
    }
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  async function request(method, url, token, body, role) {
    const response = await fetch(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(role ? { 'X-Role': role } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
    const payload = await response.json()
    return { status: response.status, headers: response.headers, data: payload.data, message: payload.message }
  }

  async function login(username) {
    const signIn = pwd => request('POST', '/auth/login', null, { username, password: pwd })
    const first = await signIn('123456')
    assert.equal(first.status, 200, first.message)
    if (!first.data.user.mustChangePassword) return first.data
    const changed = await request('PUT', '/auth/password', first.data.token,
      { oldPassword: '123456', newPassword: password })
    assert.equal(changed.status, 200, changed.message)
    const next = await signIn(password)
    assert.equal(next.status, 200, next.message)
    return next.data
  }

  try {
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      try { ready = (await fetch(base + '/health')).ok } catch { /* 后端启动中 */ }
      if (ready) break
      await sleep(150)
    }
    assert.ok(ready, '隔离后端未能启动')
    const store = JSON.parse(fs.readFileSync(file, 'utf8'))
    const batch = store.recruitmentBatches[0]
    const stage = store.recruitmentStages.find(item => item.batchId === batch.id && item.stageNumber === 4)
    stage.startTime = iso(-2)
    stage.endTime = iso(90)
    stage.stageStatus = 'IN_PROGRESS'
    const user = username => store.users.find(item => item.username === username)
    const teacher = user('T1001')
    const leader = user('L001')
    const candidate = user('2022001')
    const otherCandidate = user('2022002')
    const colleague = { ...teacher, id: Math.max(...store.users.map(item => item.id)) + 1, username: 'VIDEO-PANEL', realName: '共同面试教师' }
    const uninvited = { ...colleague, id: colleague.id + 1, username: 'VIDEO-OTHER', realName: '未邀请教师' }
    store.users.push(colleague, uninvited)
    const mentor = uid => store.labTeachers.find(item => item.userId === uid).id
    store.studentPreferences = [candidate, otherCandidate].map((student, index) => ({
      id: index + 1, batchId: batch.id, studentId: student.id, laboratoryId: teacher.laboratoryId,
      labTeacherId: mentor(index === 0 ? teacher.id : leader.id), status: 'SUBMITTED'
    }))
    store.interviews = []
    fs.writeFileSync(file, JSON.stringify(store))
    return { base, file, request, login, close, teacher, leader, colleague, uninvited, candidate, otherCandidate }
  } catch (error) {
    await close()
    throw error
  }
}

async function main() {
  const fixture = await startFixture()
  const { request, login, candidate, otherCandidate, teacher, colleague } = fixture
  try {
    const [host, student, otherStudent, panel, colleagueOutside, localOutsider, leader, admin] = await Promise.all(
      ['T1001', '2022001', '2022002', 'VIDEO-PANEL', 'T1002', 'VIDEO-OTHER', 'L001', 'admin'].map(login))
    const schedule = { mode: 'LIVEKIT', studentId: candidate.id, laboratoryId: teacher.laboratoryId,
      interviewTime: iso(2), durationMinutes: 30, panelIds: [colleague.id] }
    const scheduleWith = body => request('POST', '/interviews/schedule', host.token, { ...schedule, ...body })
    assert.equal((await scheduleWith({ studentId: otherCandidate.id })).status, 403)
    assert.equal((await scheduleWith({ panelIds: [colleagueOutside.user.id] })).status, 403)
    assert.equal((await scheduleWith({ interviewTime: iso(-1) })).status, 409)
    assert.equal((await scheduleWith({ interviewTime: iso(85) })).status, 409)
    const created = await scheduleWith({})
    assert.equal(created.status, 200, created.message)
    assert.equal(created.data.online.status, 'WAITING')
    assert.ok(!Object.hasOwn(created.data, 'onlineRoomName'))
    assert.equal((await scheduleWith({})).data.id, created.data.id)
    assert.equal((await scheduleWith({ studentId: otherCandidate.id })).status, 403)
    const details = `/interview-video/${created.data.id}`
    const token = `${details}/token`
    const invited = (await request('GET', '/interviews/my', student.token)).data
    assert.equal(invited[0].id, created.data.id)
    const notices = (await request('GET', '/notifications/my', student.token)).data
    assert.equal(notices.filter(notice => notice.id === created.data.noticeId).length, 1)
    const myPanel = (await request('GET', '/interview-video', panel.token)).data
    assert.equal(myPanel[0].role, 'PANEL')
    assert.equal((await request('GET', `/interviews/lab/${teacher.laboratoryId}`, panel.token)).data.length, 0)
    assert.equal((await request('GET', details, leader.token)).data.role, 'OBSERVER')
    assert.equal((await request('GET', details, admin.token)).data.role, 'OBSERVER')
    assert.equal((await request('POST', token, null)).status, 401)
    for (const outsider of [otherStudent, colleagueOutside, localOutsider]) {
      assert.equal((await request('POST', token, outsider.token, { start: true }, 'COLLEGE_ADMIN')).status, 404)
    }
    assert.equal((await request('POST', token, student.token, { start: true })).status, 409)
    assert.equal((await request('POST', `${details}/end`, student.token)).status, 403)
    const started = await request('POST', token, host.token, { start: true })
    assert.equal(started.status, 200, started.message)
    assert.equal(started.headers.get('Cache-Control'), 'no-store')
    const verifier = new TokenVerifier(key, secret)
    const hostGrant = await verifier.verify(started.data.token)
    const state = account => request('GET', `${details}/state`, account.token)
    const action = (account, path, body) => request('POST', `${details}/${path}`, account.token, body)
    assert.equal((await request('POST', token, student.token)).status, 403)
    assert.equal((await action(student, 'waiting', { action: 'request' })).status, 200)
    const waiting = (await state(host)).data.waiting[0]
    assert.equal(waiting.studentNumber, candidate.studentNumber)
    assert.equal((await action(student, 'waiting/decision', { identity: waiting.identity, approve: true })).status, 403)
    assert.equal((await action(host, 'lock', { locked: true })).status, 200)
    assert.equal((await action(host, 'waiting/decision', { identity: waiting.identity, approve: true })).status, 409)
    assert.equal((await request('POST', token, admin.token)).status, 409)
    assert.equal((await action(host, 'waiting/decision', { identity: waiting.identity, approve: false })).status, 200)
    assert.equal((await state(student)).data.waitingStatus, 'REJECTED')
    assert.equal((await request('POST', token, student.token)).status, 403)
    assert.equal((await action(host, 'lock', { locked: false })).status, 200)
    assert.equal((await action(student, 'waiting', { action: 'request' })).status, 200)
    assert.equal((await action(host, 'waiting/decision', { identity: waiting.identity, approve: true })).status, 200)
    const getGrant = async account => {
      const response = await request('POST', token, account.token)
      assert.equal(response.status, 200, response.message)
      return verifier.verify(response.data.token)
    }
    for (const account of [student, panel, leader, admin]) {
      const grant = await getGrant(account)
      assert.equal(grant.video.room, hostGrant.video.room)
      assert.notEqual(grant.sub, hostGrant.sub)
      assert.equal(grant.video.canPublish, [student, panel].includes(account))
      assert.equal(grant.video.canPublishData, false)
      assert.ok(!grant.video.roomAdmin)
      assert.ok(grant.exp - Date.now() / 1000 <= 30)
    }
    const chat = { clientId: randomUUID(), content: '面试资料已收到' }
    assert.equal((await action(student, 'messages', { ...chat, senderId: host.user.id })).status, 400)
    const sent = await action(student, 'messages', chat)
    assert.equal(sent.status, 200, sent.message)
    assert.equal(sent.data.senderId, student.user.id)
    assert.equal((await action(student, 'messages', chat)).data.id, sent.data.id)
    assert.deepEqual((await state(panel)).data.messages.map(item => item.id), [sent.data.id])
    assert.equal((await state(otherStudent)).status, 404)
    assert.equal((await action(student, 'hand', { raised: true })).status, 200)
    assert.equal((await state(host)).data.participants.find(item => item.identity === waiting.identity).handOrder, 1)
    assert.equal((await request('GET', `${details}/profile`, panel.token)).data.studentNumber, candidate.studentNumber)
    assert.equal((await request('GET', `${details}/profile`, student.token)).status, 403)
    assert.equal((await action(host, 'moderate', { identity: waiting.identity, action: 'request-mute' })).status, 200)
    assert.ok((await state(student)).data.muteRequestedAt)

    const stamp = Math.floor(Date.now() / 1000)
    const webhook = async (eventName, time, id, sign = true) => {
      const body = JSON.stringify({ event: eventName, id, createdAt: String(time),
        room: { name: hostGrant.video.room, sid: 'RM_fixture' },
        participant: { identity: waiting.identity, sid: 'PA_fixture', joinedAt: String(stamp), disconnectReason: 'CLIENT_INITIATED' } })
      const jwt = new AccessToken(key, secret)
      jwt.sha256 = createHash('sha256').update(body).digest('base64')
      const response = await fetch(fixture.base + '/livekit/webhook', { method: 'POST', body,
        headers: { 'Content-Type': 'application/webhook+json', Authorization: sign ? await jwt.toJwt() : 'invalid' } })
      return response.status
    }
    assert.equal(await webhook('participant_joined', stamp, 'unsigned', false), 401)
    assert.equal(await webhook('participant_left', stamp + 12, 'left'), 204)
    assert.equal(await webhook('participant_joined', stamp, 'joined'), 204)
    assert.equal(await webhook('participant_joined', stamp, 'joined'), 204)
    const attendance = (await request('GET', `${details}/attendance`, panel.token)).data
    assert.equal(attendance[0].onlineSeconds, 12)
    assert.equal(attendance[0].abnormal, false)
    assert.equal((await request('GET', `${details}/attendance`, student.token)).status, 403)
    assert.equal((await scheduleWith({ interviewStatus: 'CANCELLED' })).status, 409)
    assert.equal((await request('POST', `${details}/end`, panel.token)).status, 403)
    const ended = await request('POST', `${details}/end`, host.token)
    assert.equal(ended.status, 200, ended.message)
    assert.equal(ended.data.status, 'ENDED')
    assert.ok(ended.data.startsAt && ended.data.endsAt)
    assert.equal((await request('POST', token, student.token)).status, 409)
    assert.equal((await state(student)).data.messages.length, 1)
    assert.equal((await request('POST', `${details}/end`, host.token)).data.endsAt, ended.data.endsAt)
    const saved = JSON.parse(fs.readFileSync(fixture.file, 'utf8'))
    assert.equal(saved.interviews[0].onlinePreferenceId, 1)
    assert.deepEqual(saved.interviewParticipants.map(item => item.participantRole), ['HOST', 'CANDIDATE', 'PANEL', 'OBSERVER', 'OBSERVER'])
    assert.equal(saved.interviewWebhookEvents.length, 2)
    assert.equal(saved.interviewAttendance[0].onlineSeconds, 12)
    for (const event of ['START_ONLINE_INTERVIEW', 'END_ONLINE_INTERVIEW']) {
      assert.equal(saved.operationLogs.filter(item => item.operationType === event && item.targetId === created.data.id).length, 1)
    }
    const later = await request('POST', '/interviews/schedule', leader.token, {
      ...schedule, studentId: otherCandidate.id, panelIds: [], interviewTime: iso(35)
    }, 'LAB_TEACHER')
    assert.equal(later.status, 200, later.message)
    assert.equal(later.data.online.status, 'UPCOMING')
    const laterToken = `/interview-video/${later.data.id}/token`
    assert.equal((await request('POST', laterToken, leader.token, { start: true }, 'LAB_TEACHER')).status, 409)
    const stop = await request('POST', `/batches/${saved.interviews[0].batchId}/stop`, admin.token, { reason: '隔离验证面试关停规则' })
    assert.equal(stop.status, 200, stop.message)
    assert.equal((await request('GET', `/interview-video/${later.data.id}`, otherStudent.token)).data.status, 'CLOSED')
    console.log('PASS 排期、等候审批、锁定、短期令牌、聊天去重、资料权限、举手、签名 Webhook 与结束限制')
  } finally {
    await fixture.close()
  }
}

module.exports = { startFixture }
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
