const { createHash } = require('node:crypto')
const { mkdtemp, rm } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { getStore, commitStore, nextId } = require('../data/seed')
const { logOperation } = require('../utils/audit')
const recording = require('./interviewRecording')
const providers = require('./interviewAiProviders')

const busy = new Set()
const active = new Set(['QUEUED', 'TRANSCRIBING', 'SUMMARIZING'])
const now = () => new Date().toISOString()

function settings() {
  const notice = process.env.INTERVIEW_AI_NOTICE?.trim()
  const version = process.env.INTERVIEW_AI_POLICY_VERSION?.trim()
  const sttModel = process.env.INTERVIEW_STT_MODEL?.trim() || 'Systran/faster-whisper-large-v3'
  const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash'
  let endpoint
  try { endpoint = new URL(process.env.INTERVIEW_STT_URL) } catch { return null }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
  if (!notice || !version || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      !(endpoint.protocol === 'https:' || (local && endpoint.protocol === 'http:'))) return null
  const policyKey = createHash('sha256').update(JSON.stringify([notice, version, endpoint.href, sttModel, model])).digest('hex')
  return { notice, version, policyKey, sttUrl: endpoint.href, sttModel, model,
    sttKey: process.env.INTERVIEW_STT_API_KEY?.trim(), deepseekKey: process.env.DEEPSEEK_API_KEY?.trim(),
    ffmpeg: process.env.INTERVIEW_FFMPEG?.trim() || 'ffmpeg' }
}

function audience(store, interview) {
  return [...new Set([interview.interviewerId, interview.studentId, ...store.interviewParticipants
    .filter(row => row.interviewId === interview.id && row.grantedAt).map(row => row.userId)])]
}

function decision(store, item, config, userId) {
  return store.interviewAiConsents.filter(row => row.recordingId === item.id &&
    row.policyKey === config.policyKey && row.userId === userId).reduce((latest, row) =>
    !latest || latest.id < row.id ? row : latest, null)?.accepted
}

function retained(item) {
  return Boolean(item?.state === 'COMPLETE' && (item.holdAt || Date.parse(item.expiresAt) > Date.now()))
}

function allowed(store, interview, item, config) {
  return Boolean(config?.deepseekKey && interview.onlineEndedAt && retained(item) &&
    audience(store, interview).every(uid => Boolean(decision(store, item, config, uid)) &&
      recording.consentFor(store, item, uid) === 'ACCEPTED'))
}

function noticeView(store, interview, uid) {
  const config = settings()
  const item = recording.recordingFor(store, interview)
  if (!item || !config || !['WAITING', 'STARTING', 'RECORDING', 'STOPPING', 'PROCESSING', 'COMPLETE'].includes(item.state)) return null
  if (['COMPLETE'].includes(item.state) && !retained(item)) return null
  const accepted = decision(store, item, config, uid)
  return { notice: config.notice, version: config.version, key: config.policyKey,
    decision: accepted === undefined ? null : Boolean(accepted), ready: Boolean(config.deepseekKey) }
}

function findJob(store, interview) {
  return store.interviewAiJobs.find(row => row.interviewId === interview.id)
}

function addVersion(store, job, type, content, { baseId = null, sourceId = null, model = null, authorId = null } = {}) {
  const entry = { id: nextId(store.interviewAiVersions), jobId: job.id, type, content, baseId, sourceId, model, authorId, createdAt: now() }
  store.interviewAiVersions.push(entry)
  return entry
}

function version(store, job, id) {
  return store.interviewAiVersions.find(row => row.jobId === job.id && row.id === id)
}

function audit(store, req, interviewId, action, text, detail = {}) {
  logOperation(store, req, { targetType: 'INTERVIEW', targetId: interviewId, operationType: action,
    description: text, detail })
}

function createJob(store, interview, item, config) {
  const job = { id: nextId(store.interviewAiJobs), interviewId: interview.id, recordingId: item.id, policyKey: config.policyKey,
    status: 'QUEUED', phase: 'STT', attempts: 1, checkpoint: {}, model: config.model, updatedAt: now() }
  store.interviewAiJobs.push(job)
  audit(store, null, interview.id, 'AI_QUEUED', '已创建转写与纪要任务', { taskId: job.id })
  return job
}

function erase(store, job) {
  store.interviewAiVersions = store.interviewAiVersions.filter(row => row.jobId !== job.id)
  Object.assign(job, { status: 'DELETED', checkpoint: null, transcriptId: null, draftId: null, approvedId: null, error: null, updatedAt: now() })
}

async function discover(enqueue) {
  const config = settings()
  await enqueue(async () => {
    const current = getStore()
    const expired = current.interviewAiJobs.filter(job => job.status !== 'DELETED' &&
      !retained(current.interviewRecordings.find(item => item.id === job.recordingId)))
    const eligible = config?.deepseekKey ? current.interviews.filter(interview =>
      !findJob(current, interview) && allowed(current, interview, recording.recordingFor(current, interview), config)) : []
    if (!expired.length && !eligible.length) return
    const store = structuredClone(current)
    for (const item of expired) {
      const job = store.interviewAiJobs.find(row => row.id === item.id)
      erase(store, job)
      audit(store, null, job.interviewId, 'AI_DELETE', '随录像保留期限清理 AI 资料', { taskId: job.id })
    }
    for (const interview of eligible) createJob(store, interview, recording.recordingFor(store, interview), config)
    await commitStore(store)
  })
}

async function processJob(id, enqueue, adapters = providers) {
  const config = settings()
  const lookup = store => {
    const job = store.interviewAiJobs.find(row => row.id === id)
    const interview = store.interviews.find(row => row.id === job?.interviewId)
    const item = store.interviewRecordings.find(row => row.id === job?.recordingId)
    return { job, interview, item }
  }
  const check = store => {
    const context = lookup(store)
    const { job, interview, item } = context
    if (!job || !interview || !active.has(job.status) || job.policyKey !== config?.policyKey ||
        !allowed(store, interview, item, config)) throw new providers.AiFailure('录制或 AI 授权已失效，任务已暂停')
    return context
  }
  const save = action => enqueue(async () => {
    const store = structuredClone(getStore())
    const context = check(store)
    action(store, context)
    context.job.updatedAt = now()
    await commitStore(store)
  })
  const guard = () => check(getStore())
  let directory
  try {
    let { job, item } = guard()
    if (job.phase === 'STT') {
      await save((_store, { job }) => { job.status = 'TRANSCRIBING' })
      directory = await mkdtemp(path.join(os.tmpdir(), 'labmatch-speech-'))
      const chunks = await adapters.extractAudio(item, directory, config.ffmpeg)
      for (let index = 0; index < chunks.length; index++) {
        if (guard().job.checkpoint?.chunks?.[index] !== undefined) continue
        const rows = await adapters.transcribe(chunks[index], config, guard)
        await save((_store, { job }) => {
          job.checkpoint ||= {}
          job.checkpoint.chunks ||= {}
          job.checkpoint.chunks[index] = rows
          job.checkpoint.total = chunks.length
        })
      }
      const rows = Object.values(guard().job.checkpoint?.chunks || {}).flat()
        .sort((a, b) => a.start - b.start).map((row, index) => ({ ...row, id: index + 1 }))
      if (!rows.length) throw new providers.AiFailure('音轨无可识别中文语音，内容不足以生成纪要')
      await save((store, { job }) => {
        job.transcriptId = addVersion(store, job, 'TRANSCRIPT_RAW', rows, { model: config.sttModel }).id
        Object.assign(job, { phase: 'SUMMARY', status: 'SUMMARIZING', checkpoint: {} })
      })
    }
    job = guard().job
    const rows = version(getStore(), job, job.transcriptId)?.content || []
    if (rows.map(row => row.text).join('').replace(/[\s\p{P}\p{S}]/gu, '').length < 20) {
      throw new providers.AiFailure('逐字稿内容不足以生成完整纪要')
    }
    const batches = providers.splitSummary(rows)
    for (let index = 0; index < batches.length; index++) {
      if (guard().job.checkpoint?.summaries?.[index]) continue
      const summary = await adapters.summarize(batches[index], config)
      await save((_store, { job }) => {
        job.status = 'SUMMARIZING'
        job.checkpoint ||= {}
        job.checkpoint.summaries ||= {}
        job.checkpoint.summaries[index] = providers.validateSummary(summary, batches[index])
        job.checkpoint.total = batches.length
      })
    }
    await save((store, { job }) => {
      const content = providers.mergeSummaries(Object.values(job.checkpoint.summaries))
      job.draftId = addVersion(store, job, 'SUMMARY_AI', content, { sourceId: job.transcriptId, model: config.model }).id
      Object.assign(job, { status: 'REVIEW', checkpoint: null, error: null })
      audit(store, null, job.interviewId, 'AI_GENERATED', '结构化纪要待教师审核', { taskId: job.id })
    })
  } catch (error) {
    await enqueue(async () => {
      const store = structuredClone(getStore())
      const { job } = lookup(store)
      if (!job || !active.has(job.status)) return
      job.status = 'FAILED'
      job.error = error instanceof providers.AiFailure ? error.message : '任务处理失败，请检查服务配置后重试'
      job.updatedAt = now()
      audit(store, null, job.interviewId, 'AI_FAILED', job.error, { taskId: job.id, result: 'FAILED' })
      await commitStore(store)
    })
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 }).catch(() => {})
  }
}

let discovering = false
function sweepAi(enqueue) {
  if (discovering) return
  discovering = true
  discover(enqueue).then(() => {
    if (busy.size) return
    const job = getStore().interviewAiJobs.find(row => active.has(row.status))
    if (!job) return
    busy.add(job.id)
    processJob(job.id, enqueue).catch(() => {}).finally(() => busy.delete(job.id))
  }).catch(() => {}).finally(() => { discovering = false })
}

module.exports = { settings, audience, decision, retained, allowed, noticeView, active, findJob, createJob,
  addVersion, version, audit, erase, sweepAi, processJob }
