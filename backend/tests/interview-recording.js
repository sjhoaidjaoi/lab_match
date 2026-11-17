const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs')
const { AccessToken } = require('livekit-server-sdk')
const { startFixture } = require('./interview-video')

async function test() {
  const fixture = await startFixture({
    S3_ENDPOINT: 'https://storage.example.invalid', S3_REGION: 'us-east-1', S3_BUCKET: 'isolated-test-only',
    S3_ACCESS_KEY_ID: 'fixture-access', S3_SECRET_ACCESS_KEY: 'fixture-secret',
    RECORDING_POLICY_VERSION: 'test-v1', RECORDING_NOTICE: '隔离环境授权测试', RECORDING_RETENTION_DAYS: '30',
    RECORDING_COLLEGE_VIEW_IDS: '', RECORDING_DOWNLOAD_IDS: '1', RECORDING_MANAGE_IDS: '1'
  })
  const { request, login, candidate, teacher, colleague, file } = fixture
  try {
    const [host, student, panel, admin, outsider, leader] = await Promise.all(
      ['T1001', '2022001', 'VIDEO-PANEL', 'admin', 'T1002', 'L001'].map(login))
    const created = await request('POST', '/interviews/schedule', host.token, {
      mode: 'LIVEKIT', studentId: candidate.id, laboratoryId: teacher.laboratoryId, panelIds: [colleague.id],
      interviewTime: new Date(Date.now() + 120000).toISOString()
    })
    assert.equal(created.status, 200, created.message)
    const base = `/interview-video/${created.data.id}`
    const send = (actor, path, body) => request('POST', base + path, actor.token, body)
    const state = actor => request('GET', base + '/state', actor.token)
    assert.equal((await send(student, '/recording/enable')).status, 403)
    const enabled = await send(host, '/recording/enable')
    assert.equal(enabled.status, 200, enabled.message)
    assert.equal(enabled.data.state, 'WAITING')
    const retries = await Promise.all([send(host, '/recording/enable'), send(host, '/recording/enable')])
    assert.ok(retries.every(result => result.data.id === enabled.data.id))
    assert.equal((await state(student)).data.recording.policy.version, 'test-v1')
    assert.equal((await send(student, '/recording/consent', { accept: true, policyVersion: 'stale' })).status, 409)
    assert.equal((await send(student, '/recording/consent', { accept: false, policyVersion: 'test-v1' })).status, 200)
    assert.equal((await send(host, '/recording/consent', { accept: true, policyVersion: 'test-v1' })).status, 200)
    assert.equal((await send(host, '/token', { start: true })).status, 200)
    assert.equal((await state(host)).data.recording.state, 'WAITING')
    assert.equal((await request('GET', base + '/archive', student.token)).status, 403)
    assert.equal((await request('GET', base + '/archive', outsider.token)).status, 404)
    assert.equal((await request('GET', base + '/archive', leader.token)).status, 200)
    assert.equal((await request('GET', '/interview-video/archives', panel.token)).data.total, 1)
    assert.equal((await request('GET', '/interview-video/archives?keyword=missing', admin.token)).data.total, 0)
    assert.equal((await send(admin, '/recording/link', { download: true })).status, 409)
    assert.equal((await send(admin, '/recording/link', { download: false })).status, 403)
    assert.equal((await send(host, '/recording/link', { download: false })).status, 409)
    assert.equal((await send(host, '/recording/retention', { action: 'delete', reason: 'fixture' })).status, 403)

    // Exercise the signed Egress event handling with an isolated state-machine fixture.
    // This never calls a live Egress project and cannot publish a playable recording.
    const store = JSON.parse(fs.readFileSync(file, 'utf8'))
    const recording = store.interviewRecordings[0]
    recording.state = 'STARTING'
    recording.egressId = 'EG_fixture'
    recording.requestedAt = new Date().toISOString()
    const roomName = store.interviews[0].onlineRoomName
    fs.writeFileSync(file, JSON.stringify(store))
    assert.equal((await send(panel, '/token')).status, 403)
    assert.equal((await send(panel, '/recording/consent', { accept: true, policyVersion: 'test-v1' })).status, 200)
    assert.equal((await send(panel, '/token')).status, 200)

    async function event(status, signed = true, egressId = 'EG_fixture') {
      const body = JSON.stringify({ event: 'egress_updated', id: randomUUID(),
        createdAt: String(Math.floor(Date.now() / 1000)),
        egressInfo: { roomName, egressId, status, errorCode: 501 } })
      const jwt = new AccessToken('test-livekit-key', 'test-livekit-secret-used-only-in-this-isolated-fixture')
      jwt.sha256 = createHash('sha256').update(body).digest('base64')
      const response = await fetch(fixture.base + '/livekit/webhook', {
        method: 'POST', body, headers: { 'Content-Type': 'application/webhook+json',
          Authorization: signed ? await jwt.toJwt() : 'invalid' }
      })
      return response.status
    }
    assert.equal(await event('EGRESS_ACTIVE', false), 401)
    assert.equal(await event('EGRESS_ACTIVE', true, 'EG_other'), 204)
    assert.equal((await state(host)).data.recording.state, 'STARTING')
    assert.equal(await event('EGRESS_ACTIVE'), 204)
    assert.equal(await event('EGRESS_ACTIVE'), 204)
    assert.equal((await state(host)).data.recording.state, 'RECORDING')
    assert.equal((await send(host, '/recording/stop')).data.state, 'STOPPING')
    assert.equal((await send(host, '/recording/stop')).data.state, 'STOPPING')
    assert.equal(await event('EGRESS_COMPLETE'), 204)
    assert.equal(await event('EGRESS_ACTIVE'), 204)
    assert.equal((await state(host)).data.recording.state, 'PROCESSING')
    assert.equal((await send(host, '/recording/link', { download: false })).status, 409)
    const archived = (await request('GET', base + '/archive', host.token)).data
    assert.equal(archived.logs.filter(row => row.type === 'RECORDING_ACTIVE').length, 1)
    assert.equal(archived.logs.filter(row => row.type === 'RECORDING_STOP_REQUEST').length, 1)
    assert.equal(archived.summary.transcriptionState, 'NOT_STARTED')
    assert.equal(JSON.stringify(archived).includes(recording.objectKey), false)
    assert.equal(JSON.stringify(archived).includes('fixture-secret'), false)

    // Verify signing and retention permissions using test metadata only. The test
    // never requests a media object and does not simulate a successful upload.
    const verifiedFixture = JSON.parse(fs.readFileSync(file, 'utf8'))
    Object.assign(verifiedFixture.interviewRecordings[0], {
      state: 'COMPLETE', savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString()
    })
    fs.writeFileSync(file, JSON.stringify(verifiedFixture))
    const preview = await send(leader, '/recording/link', { download: false })
    assert.equal(preview.status, 200, preview.message)
    const url = new URL(preview.data.url)
    assert.equal(url.protocol, 'https:')
    assert.equal(url.searchParams.get('X-Amz-Expires'), '300')
    assert.ok(url.searchParams.get('X-Amz-Signature'))
    assert.equal((await send(panel, '/recording/link', { download: true })).status, 403)
    assert.equal((await send(admin, '/recording/link', { download: false })).status, 403)
    const download = await send(admin, '/recording/link', { download: true })
    assert.equal(download.status, 200, download.message)
    assert.match(new URL(download.data.url).searchParams.get('response-content-disposition'), /^attachment;/)
    assert.equal((await send(admin, '/recording/retention', { action: 'hold', reason: '隔离申诉验收' })).status, 200)
    assert.equal((await send(admin, '/recording/retention', { action: 'delete', reason: '隔离删除验收' })).status, 409)
    const audit = (await request('GET', base + '/archive', host.token)).data.logs
    assert.equal(audit.filter(row => row.type === 'RECORDING_VIEW' && row.result === 'SUCCESS').length, 1)
    assert.equal(audit.filter(row => row.type === 'RECORDING_DOWNLOAD' && row.result === 'SUCCESS').length, 1)
    console.log('PASS 授权、幂等启停、档案权限、Egress 签名与乱序、短期地址审计、争议保留')
  } finally { await fixture.close() }
}

test().catch(error => { console.error(error); process.exitCode = 1 })
