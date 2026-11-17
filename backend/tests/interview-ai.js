const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const { once } = require('node:events')
const { spawnSync } = require('node:child_process')
const { startFixture } = require('./interview-video')

const policy = {
  INTERVIEW_AI_NOTICE: '隔离测试。语音归转写服务，文字归 DeepSeek。',
  INTERVIEW_AI_POLICY_VERSION: 'fixture-v1',
  INTERVIEW_STT_URL: 'http://127.0.0.1:9988/v1/audio/transcriptions',
  INTERVIEW_AI_COLLEGE_VIEW_IDS: '1',
  RECORDING_MANAGE_IDS: '1'
}
const result = refs => ({ topics: [{ text: '介绍课程项目', refs }], questions: [], projects: [], verify: [],
  overview: [{ text: '学生介绍了项目职责与接口数据流', refs }] })

async function checkAudioPipeline(executable, providers) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'labmatch-ai-test-'))
  let uploads = 0
  const stub = http.createServer(async (req, res) => {
    const buffers = []
    for await (const data of req) buffers.push(data)
    const form = Buffer.concat(buffers).toString('latin1')
    if (!form.includes('audio/wav') || !form.includes('verbose_json') || !form.includes('zh')) {
      res.statusCode = 400
      res.end()
      return
    }
    uploads++
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ segments: [{ start: 0.1, end: 0.3, text: '测试时间戳' }] }))
  }).listen(0, '127.0.0.1')
  try {
    await once(stub, 'listening')
    const config = { sttModel: 'fixture', sttUrl: `http://127.0.0.1:${stub.address().port}/v1/audio/transcriptions` }
    const tone = path.join(directory, 'test.mp4')
    const generated = spawnSync(executable, ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=16000',
      '-t', '301', '-c:a', 'aac', tone], { windowsHide: true, timeout: 30000 })
    assert.equal(generated.status, 0, '合成测试音频失败')
    const chunks = await providers.segmentAudio(tone, directory, executable)
    assert.equal(chunks.length, 2)
    assert.ok(Math.abs(chunks[1].start - 300) < 0.04)
    const rows = await providers.transcribe(chunks[1], config)
    assert.ok(Math.abs(rows[0].start - 300100) < 40)
    const silent = path.join(directory, 'silent.wav')
    const blank = spawnSync(executable, ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono',
      '-t', '1', '-c:a', 'pcm_s16le', silent], { windowsHide: true })
    assert.equal(blank.status, 0)
    assert.deepEqual(await providers.transcribe({ file: silent, start: 0, end: 1 }, config), [])
    assert.equal(uploads, 1)
    console.log('PASS FFmpeg 真实音频分段、时间基准和静音跳过，本地 STT 协议替身')
  } finally {
    await new Promise(resolve => stub.close(resolve))
    if (path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'labmatch-ai-test-')) {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }
}

async function main() {
  // Disable the child process provider worker. The isolated worker below uses an injected adapter.
  const fixture = await startFixture({ ...policy, DEEPSEEK_API_KEY: '',
    S3_ENDPOINT: 'https://storage.example.invalid', S3_REGION: 'us-east-1', S3_BUCKET: 'isolated-test-only',
    S3_ACCESS_KEY_ID: 'fixture-access', S3_SECRET_ACCESS_KEY: 'fixture-secret',
    RECORDING_POLICY_VERSION: 'recording-v1', RECORDING_NOTICE: '录像授权测试', RECORDING_RETENTION_DAYS: '30' })
  try {
    const { request, login, teacher, candidate, colleague, file } = fixture
    const [host, student, panel, college, outsider] = await Promise.all(
      ['T1001', '2022001', 'VIDEO-PANEL', 'admin', 'T1002'].map(login))
    const created = await request('POST', '/interviews/schedule', host.token, {
      mode: 'LIVEKIT', laboratoryId: teacher.laboratoryId, studentId: candidate.id, panelIds: [colleague.id],
      interviewTime: new Date(Date.now() + 120000).toISOString()
    })
    assert.equal(created.status, 200, created.message)
    const base = `/interview-video/${created.data.id}`
    const post = (actor, url, body) => request('POST', base + url, actor.token, body)
    const enabled = await post(host, '/recording/enable')
    assert.equal(enabled.status, 200, enabled.message)
    for (const actor of [host, student]) {
      assert.equal((await post(actor, '/recording/consent', { accept: true, policyVersion: 'recording-v1' })).status, 200)
    }
    const state = await request('GET', base + '/state', student.token)
    const key = state.data.aiConsent.key
    assert.equal((await post(student, '/ai/consent', { key: '0'.repeat(64), accepted: true })).status, 409)
    assert.equal((await post(host, '/ai/consent', { key, accepted: true })).status, 200)
    assert.equal((await post(student, '/ai/consent', { key, accepted: false })).status, 200)
    assert.equal((await post(host, '/ai/action', { action: 'run' })).status, 409)

    Object.assign(process.env, policy, { LAB_STORE_FILE: file, DB_DRIVER: 'file', DEEPSEEK_API_KEY: 'test-only-not-a-provider-key' })
    const { getStore, commitStore } = require('../data/seed')
    const ai = require('../services/interviewAi')
    const providers = require('../services/interviewAiProviders')
    const enqueue = action => action()
    let store = getStore()
    let interview = store.interviews.find(row => row.id === created.data.id)
    let item = store.interviewRecordings[0]
    interview.onlineStartedAt = new Date(Date.now() - 5000).toISOString()
    interview.onlineEndedAt = new Date().toISOString()
    interview.interviewStatus = 'COMPLETED'
    Object.assign(item, { state: 'COMPLETE', expiresAt: new Date(Date.now() + 3600000).toISOString() })
    await commitStore(store)
    assert.equal(ai.allowed(store, interview, item, ai.settings()), false)
    assert.equal((await post(student, '/ai/consent', { key, accepted: true })).status, 200)
    store = getStore()
    interview = store.interviews.find(row => row.id === created.data.id)
    item = store.interviewRecordings[0]
    assert.equal(ai.allowed(store, interview, { ...item, state: 'FAILED' }, ai.settings()), false)
    assert.equal(ai.allowed(store, interview, item, ai.settings()), true)
    const job = ai.createJob(store, interview, item, ai.settings())
    await commitStore(store)
    assert.throws(() => providers.validateSummary(result([999]), [{ id: 1 }]), /引用/)
    assert.ok(providers.splitSummary(Array.from({ length: 40 }, () => ({ text: '长'.repeat(1000) }))).length > 1)

    const calls = []
    let failSecond = true
    const adapters = {
      extractAudio: async () => [0, 1],
      transcribe: async index => {
        calls.push(index)
        if (index === 1 && failSecond) throw new providers.AiFailure('隔离语音识别失败')
        return [{ start: index * 300000, end: index * 300000 + 850, speaker: null,
          text: '我参与了学校实训课程项目，负责开发登录接口和数据库查询。' }]
      },
      summarize: async rows => result([rows[0].id])
    }
    await ai.processJob(job.id, enqueue, adapters)
    store = getStore()
    assert.equal(store.interviewAiJobs[0].status, 'FAILED')
    assert.equal(Object.keys(store.interviewAiJobs[0].checkpoint.chunks).length, 1)
    store.interviewAiJobs[0].status = 'QUEUED'
    await commitStore(store)
    failSecond = false
    await ai.processJob(job.id, enqueue, adapters)
    assert.deepEqual(calls, [0, 1, 1])
    const read = (actor, body = {}) => post(actor, '/ai/read', body)
    assert.equal((await read(student)).status, 403)
    assert.equal((await read(outsider)).status, 404)
    assert.equal((await read(college)).status, 404)
    const initial = (await read(panel)).data
    assert.equal(initial.transcript.content[1].start, 300000)
    assert.equal(initial.transcript.content[0].speaker, null)
    assert.equal((await post(panel, '/ai/action', { action: 'approve', baseId: initial.draft.id })).status, 403)
    const edit = await post(host, '/ai/action', { action: 'transcript', baseId: initial.transcript.id,
      changes: [{ id: 1, text: '修正：负责登录接口。', speaker: '学生' }] })
    assert.equal(edit.status, 200, edit.message)
    assert.equal((await post(host, '/ai/action', { action: 'approve', baseId: initial.draft.id })).status, 409)
    const draft = await post(host, '/ai/action', { action: 'draft', baseId: initial.draft.id, content: result([1]) })
    assert.equal(draft.status, 200, draft.message)
    const approval = await post(host, '/ai/action', { action: 'approve', baseId: draft.data.id })
    assert.equal(approval.status, 200, approval.message)
    assert.equal((await post(host, '/ai/action', { action: 'approve', baseId: draft.data.id })).data.id, approval.data.id)
    const formal = (await read(college)).data
    assert.equal(formal.formal.id, approval.data.id)
    assert.equal(formal.transcript, null)
    assert.equal(formal.draft, null)
    assert.deepEqual(formal.evidence[0], { id: 1, start: 0, end: 850 })
    const old = (await read(host, { versionId: initial.transcript.id })).data.selected
    assert.equal(old.content[0].speaker, null)
    assert.equal((await read(host, { download: true })).status, 200)
    store = getStore()
    assert.equal(store.interviews[0].recommendation, 'PENDING')
    assert.ok(store.operationLogs.some(log => log.operationType === 'AI_DOWNLOAD'))
    assert.equal((await post(college, '/ai/action', { action: 'delete', reason: '隔离测试清理' })).status, 200)
    assert.equal((await read(host)).status, 404)
    store = getStore()
    assert.equal(store.interviewAiVersions.length, 0)
    assert.equal(store.interviewRecordings[0].state, 'COMPLETE')
    assert.equal(store.interviews[0].interviewStatus, 'COMPLETED')
    console.log('PASS 独立授权、分段断点续跑、时间戳、结构引用、越权、审阅版本与审计删除（隔离适配器）')
    if (process.env.INTERVIEW_AI_TEST_FFMPEG) await checkAudioPipeline(process.env.INTERVIEW_AI_TEST_FFMPEG, providers)
  } finally { await fixture.close() }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
