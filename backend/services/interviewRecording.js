const { createHash, randomUUID } = require('node:crypto')
const {
  EgressClient, EgressStatus, StartEgressRequest, TemplateSource, Output, FileOutput,
  EncodedFileType, StorageConfig, S3Upload, RoomServiceClient, ParticipantInfo_State
} = require('livekit-server-sdk')
const { S3Client, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { getStore, commitStore } = require('../data/seed')
const { logOperation } = require('../utils/audit')
const video = require('./interviewVideo')

const active = new Set(['STARTING', 'RECORDING', 'STOPPING'])
const running = new Set()
const iso = () => new Date().toISOString()

function storageConfig() {
  const { S3_ENDPOINT, S3_REGION: region, S3_BUCKET: bucket,
    S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env
  if (!region || !bucket || !accessKeyId || !secretAccessKey) return null
  let endpoint
  if (S3_ENDPOINT) {
    try {
      const url = new URL(S3_ENDPOINT)
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null
      endpoint = url.href
    } catch { return null }
  }
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'
  const id = createHash('sha256').update(JSON.stringify([endpoint, region, bucket, forcePathStyle])).digest('hex')
  return { id, endpoint, region, bucket, forcePathStyle, credentials: { accessKeyId, secretAccessKey } }
}

function policyConfig() {
  const version = process.env.RECORDING_POLICY_VERSION?.trim()
  const notice = process.env.RECORDING_NOTICE?.trim()
  const days = Number(process.env.RECORDING_RETENTION_DAYS)
  if (!version || !notice || !Number.isInteger(days) || days < 1 || days > 3650) return null
  return { version, notice, days }
}

function recordingFor(store, interview) {
  return store.interviewRecordings.find(item => item.interviewId === interview.id)
}

function consentFor(store, recording, uid) {
  return store.interviewRecordingConsents.filter(item => item.recordingId === recording.id && item.userId === uid)
    .reduce((latest, item) => !latest || latest.id < item.id ? item : latest, null)?.decision ?? null
}

function requiredUsers(store, interview) {
  return new Set([interview.interviewerId, interview.studentId, ...store.interviewParticipants
    .filter(item => item.interviewId === interview.id && item.grantedAt)
    .map(item => item.userId)])
}

function ackRequired(store, interview, uid) {
  const recording = recordingFor(store, interview)
  return Boolean(recording && active.has(recording.state) && consentFor(store, recording, uid) !== 'ACCEPTED')
}

function authorizePending(store, interview, recording) {
  return [...requiredUsers(store, interview)].every(uid => consentFor(store, recording, uid) === 'ACCEPTED')
}

function newRecording(interview, uid, storage, policy) {
  const id = randomUUID()
  return { id, interviewId: interview.id, objectKey: `interviews/${interview.batchId}/${interview.id}/${id}.mp4`,
    storageId: storage.id, state: 'WAITING', createdBy: uid, createdAt: iso(), policy, format: 'mp4',
    transcriptionState: 'NOT_STARTED' }
}

function recordingView(store, interview, uid, diagnostics = false) {
  const item = recordingFor(store, interview)
  return {
    available: Boolean(storageConfig() && policyConfig() && video.liveKitConfig()),
    id: item?.id, state: item?.state || 'NONE', policy: item?.policy,
    decision: item ? consentFor(store, item, uid) : null, durationSeconds: item?.durationSeconds,
    savedAt: item?.savedAt, expiresAt: item?.expiresAt, sizeBytes: item?.sizeBytes,
    format: item?.format,
    ...(diagnostics && item ? { failureReason: item.failureReason, holdReason: item.holdReason,
      createdAt: item.createdAt, startedAt: item.startedAt, endedAt: item.egressEndedAt } : {})
  }
}

function audit(store, req, item, type, description, result = 'SUCCESS') {
  logOperation(store, req, { operationType: type, targetType: 'INTERVIEW', targetId: item.interviewId,
    description, detail: { recordingId: item.id, result } })
}

function clients() {
  const lk = video.liveKitConfig()
  const storage = storageConfig()
  if (!lk || !storage) return null
  const domain = lk.url.replace(/^wss:/, 'https:')
  return { storage, egress: new EgressClient(domain, lk.key, lk.secret, { requestTimeout: 12 }),
    rooms: new RoomServiceClient(domain, lk.key, lk.secret, { requestTimeout: 5 }) }
}

function s3(storage) {
  const { endpoint, region, forcePathStyle, credentials } = storage
  // requestChecksumCalculation / responseChecksumValidation 设为 WHEN_REQUIRED：
  // AWS SDK v3 默认会对请求做流式校验（aws-chunked），阿里云 OSS 等 S3 兼容服务
  // 不接受这种签名形式，会直接报错。改为仅在协议要求时计算，对 AWS / R2 无影响。
  return new S3Client({ endpoint, region, forcePathStyle, credentials, maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' })
}

function storageFor(item) {
  const storage = storageConfig()
  if (!storage || item.storageId !== storage.id) throw new Error('存储配置与录像存放位置不匹配')
  return storage
}

async function signAccess(item, download) {
  const storage = storageFor(item)
  const sdk = s3(storage)
  try {
    const expiresIn = 300
    // 部分 S3 兼容服务（如阿里云 OSS）拒绝预签名覆盖 response-content-type，
    // 返回 400 InvalidRequest。设 S3_PRESIGN_MINIMAL=true 时只保留下载文件名，
    // content-type 由对象自身元数据决定（LiveKit 上传时写入）。
    const minimal = process.env.S3_PRESIGN_MINIMAL === 'true'
    const headers = minimal ? {} : { ResponseContentType: 'video/mp4', ResponseCacheControl: 'private, no-store' }
    const url = await getSignedUrl(sdk, new GetObjectCommand({
      Bucket: storage.bucket, Key: item.objectKey,
      ...headers,
      ...(download ? { ResponseContentDisposition: `attachment; filename="interview-${item.interviewId}.mp4"` } : {})
    }), { expiresIn })
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }
  } finally { sdk.destroy() }
}

function matchesOutput(item, event) {
  const output = event.request?.case === 'egress' && event.request.value.outputs
    .some(entry => entry.config.case === 'file' && entry.config.value.filepath === item.objectKey)
  return event.egressId && (item.egressId ? item.egressId === event.egressId : output)
}

const timestamp = value => value > 0n ? new Date(Number(value / 1_000_000n)).toISOString() : null

function applyProvider(store, interview, item, info) {
  if (info.roomName !== interview.onlineRoomName || !matchesOutput(item, info)) return false
  if (!active.has(item.state)) return false
  const before = item.state
  const previousId = item.egressId
  const previousStart = item.startedAt
  item.egressId = info.egressId
  item.startedAt ||= timestamp(info.startedAt)
  if (info.status === EgressStatus.EGRESS_ACTIVE && item.state === 'STARTING') {
    item.state = 'RECORDING'
    item.failureReason = null
    audit(store, null, item, 'RECORDING_ACTIVE', 'LiveKit 已开始录制')
  }
  if (info.status === EgressStatus.EGRESS_ENDING) item.state = 'STOPPING'
  if (info.status === EgressStatus.EGRESS_COMPLETE) {
    const file = info.fileResults?.[0]
    item.egressEndedAt = timestamp(info.endedAt) || iso()
    item.durationSeconds = Number((file?.duration || 0n) / 1_000_000_000n)
    item.sizeBytes = Number(file?.size || 0n)
    item.state = 'PROCESSING'
    item.failureReason = null
  }
  if ([EgressStatus.EGRESS_FAILED, EgressStatus.EGRESS_ABORTED, EgressStatus.EGRESS_LIMIT_REACHED].includes(info.status)) {
    item.egressEndedAt = timestamp(info.endedAt) || iso()
    item.state = 'FAILED'
    item.failureReason = `LiveKit 录制未完成（状态 ${info.status}，错误码 ${info.errorCode || 0}）`
    audit(store, null, item, 'RECORDING_FAILED', item.failureReason, 'FAILED')
  }
  return before !== item.state || previousId !== item.egressId || previousStart !== item.startedAt
}

async function applyEgressWebhook(info) {
  if (!info) return
  const store = structuredClone(getStore())
  const interview = store.interviews.find(item => item.onlineRoomName === info.roomName)
  const item = interview && recordingFor(store, interview)
  if (item && applyProvider(store, interview, item, info)) await commitStore(store)
}

function startRequest(interview, item, storage) {
  return new StartEgressRequest({
    roomName: interview.onlineRoomName,
    source: { case: 'template', value: new TemplateSource({ layout: 'speaker' }) },
    outputs: [new Output({ config: { case: 'file', value: new FileOutput({
      filepath: item.objectKey, fileType: EncodedFileType.MP4, disableManifest: true
    }) } })],
    storage: new StorageConfig({ provider: { case: 's3', value: new S3Upload({
      endpoint: storage.endpoint, region: storage.region, bucket: storage.bucket, forcePathStyle: storage.forcePathStyle,
      accessKey: storage.credentials.accessKeyId, secret: storage.credentials.secretAccessKey
    }) } })
  })
}

async function verifyObject(item) {
  const storage = storageFor(item)
  const sdk = s3(storage)
  const abortSignal = AbortSignal.timeout(8000)
  const input = { Bucket: storage.bucket, Key: item.objectKey }
  try {
    const head = await sdk.send(new HeadObjectCommand(input), { abortSignal })
    const bytes = head.ContentLength
    if (!bytes || bytes < 12 || (item.sizeBytes && item.sizeBytes !== bytes)) return { invalid: true }
    const prefix = await sdk.send(new GetObjectCommand({ ...input, Range: 'bytes=0-11' }), { abortSignal })
    if (prefix.ContentLength !== 12 || !prefix.ContentRange) {
      prefix.Body?.destroy()
      return { invalid: true }
    }
    const header = Buffer.from(await prefix.Body.transformToByteArray())
    return header.toString('ascii', 4, 8) === 'ftyp' ? { bytes } : { invalid: true }
  } finally { sdk.destroy() }
}

async function deleteObject(item) {
  const storage = storageFor(item)
  const sdk = s3(storage)
  try {
    await sdk.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: item.objectKey }),
      { abortSignal: AbortSignal.timeout(8000) })
  } finally { sdk.destroy() }
}

// External calls run outside the app's write queue. Each update re-reads the durable record.
function sweepRecordings(enqueue) {
  const cloud = clients()
  const store = getStore()
  for (const item of store.interviewRecordings) {
    const interview = store.interviews.find(row => row.id === item.interviewId)
    if (!interview || running.has(item.id)) continue
    const expired = item.expiresAt && Date.parse(item.expiresAt) <= Date.now()
    if (!active.has(item.state) && !['WAITING', 'PROCESSING', 'DELETING'].includes(item.state) &&
        !(['COMPLETE', 'FAILED'].includes(item.state) && expired && !item.holdAt)) continue
    running.add(item.id)
    reconcile(enqueue, cloud, store, interview, item).catch(() => {
      // Retry safely on the next sweep without recording provider payloads or secrets.
    }).finally(() => running.delete(item.id))
  }
}

async function reconcile(enqueue, cloud, snapshot, interview, item) {
  const update = mutate => enqueue(async () => {
    const store = structuredClone(getStore())
    const current = recordingFor(store, interview)
    const meeting = store.interviews.find(row => row.id === interview.id)
    if (current?.id !== item.id || !meeting) return false
    if (!mutate(store, meeting, current)) return false
    await commitStore(store)
    return true
  })
  if (item.state === 'WAITING') {
    if (['ENDED', 'CLOSED', 'CANCELLED'].includes(video.roomStatus(snapshot, interview))) {
      await update((_store, _meeting, row) => {
        if (row.state !== 'WAITING') return false
        row.state = 'CANCELLED'
        return true
      })
      return
    }
    if (!cloud || cloud.storage.id !== item.storageId || video.roomStatus(snapshot, interview) !== 'OPEN' ||
        !authorizePending(snapshot, interview, item)) return
    const live = await cloud.rooms.listParticipants(interview.onlineRoomName)
    const allowed = new Set([...requiredUsers(snapshot, interview)].map(id => video.identityFor(interview, id)))
    const host = video.identityFor(interview, interview.interviewerId)
    const student = video.identityFor(interview, interview.studentId)
    const connected = identity => live.some(person => person.identity === identity && person.state === ParticipantInfo_State.ACTIVE)
    if (!connected(host) || !connected(student) ||
        live.some(person => !allowed.has(person.identity))) return
    const claimed = await update((store, meeting, row) => {
      if (row.state !== 'WAITING' || video.roomStatus(store, meeting) !== 'OPEN' ||
          !authorizePending(store, meeting, row)) return false
      row.state = 'STARTING'
      row.requestedAt = iso()
      row.expiresAt = new Date(Date.now() + row.policy.days * 86400000).toISOString()
      audit(store, { user: { uid: row.createdBy } }, row, 'RECORDING_REQUEST', '提交录制启动申请')
      return true
    })
    if (!claimed) return
    try {
      const info = await cloud.egress.startEgress(startRequest(interview, item, cloud.storage))
      await update((store, meeting, row) => {
        if (info.roomName !== meeting.onlineRoomName || !info.egressId || !active.has(row.state)) return false
        // The response belongs to this exact start request. List and webhook reconciliation check the output key.
        const linked = !row.egressId
        if (linked) row.egressId = info.egressId
        return applyProvider(store, meeting, row, info) || linked
      })
    } catch (error) {
      await update((store, _meeting, row) => {
        if (!active.has(row.state) || row.egressId) return false
        if (['invalid_argument', 'unauthenticated', 'permission_denied', 'unimplemented', 'not_found'].includes(error.code)) {
          row.state = 'FAILED'
          row.failureReason = `LiveKit 拒绝启动录制（${error.code}）`
          audit(store, null, row, 'RECORDING_FAILED', row.failureReason, 'FAILED')
          return true
        }
        row.failureReason = 'LiveKit 启动响应异常，正在查询任务是否已创建'
        return true
      })
    }
    return
  }
  if (active.has(item.state)) {
    if (!cloud) return
    const options = item.egressId ? { egressId: item.egressId } : { roomName: interview.onlineRoomName }
    const jobs = await cloud.egress.listEgress(options)
    const info = jobs.find(job => matchesOutput(item, job) && job.roomName === interview.onlineRoomName)
    if (info) {
      const requestedStop = item.stopRequestedAt || video.roomStatus(snapshot, interview) !== 'OPEN'
      if (requestedStop && [EgressStatus.EGRESS_STARTING, EgressStatus.EGRESS_ACTIVE].includes(info.status)) {
        try { await cloud.egress.stopEgress(info.egressId) } catch { /* Room shutdown or later sweep may finish the task. */ }
      }
      await update((store, meeting, row) => applyProvider(store, meeting, row, info))
    } else if (!item.egressId && Date.now() - Date.parse(item.requestedAt) > 120000) {
      await update((store, _meeting, row) => {
        const reason = '尚未确认 LiveKit 是否创建任务。后台继续核对，请检查 Egress 控制台'
        if (row.egressId || !active.has(row.state) || row.failureReason === reason) return false
        row.failureReason = reason
        audit(store, null, row, 'RECORDING_RECONCILE', reason, 'PENDING')
        return true
      })
    }
    return
  }
  if (item.state === 'PROCESSING') {
    try {
      const result = await verifyObject(item)
      await update((store, _meeting, row) => {
        if (row.state !== 'PROCESSING') return false
        row.state = result.invalid ? 'FAILED' : 'COMPLETE'
        row.failureReason = result.invalid ? '对象大小或 MP4 文件头校验失败' : null
        if (!result.invalid) {
          row.sizeBytes = result.bytes
          row.savedAt = iso()
          row.expiresAt = new Date(Date.now() + row.policy.days * 86400000).toISOString()
        }
        audit(store, null, row, result.invalid ? 'RECORDING_FAILED' : 'RECORDING_SAVED',
          row.failureReason || '已确认 MP4 保存至私有存储', result.invalid ? 'FAILED' : 'SUCCESS')
        return true
      })
    } catch {
      await update((store, _meeting, row) => {
        if (row.state !== 'PROCESSING') return false
        const deadline = Date.now() - Date.parse(row.egressEndedAt) > 15 * 60000
        const reason = '对象存储暂未确认录像文件'
        if (!deadline && row.failureReason === reason) return false
        row.failureReason = reason
        if (deadline) {
          row.state = 'FAILED'
          audit(store, null, row, 'RECORDING_FAILED', reason, 'FAILED')
        }
        return true
      })
    }
    return
  }
  if (item.state !== 'DELETING') {
    const claimed = await update((store, _meeting, row) => {
      if (!['COMPLETE', 'FAILED'].includes(row.state) || row.holdAt ||
          !row.expiresAt || Date.parse(row.expiresAt) > Date.now()) return false
      row.state = 'DELETING'
      audit(store, null, row, 'RECORDING_DELETE_REQUEST', '录像到期，进入清理队列')
      return true
    })
    if (!claimed) return
  }
  try {
    await deleteObject(item)
    await update((store, _meeting, row) => {
      if (row.state !== 'DELETING') return false
      row.state = 'DELETED'
      row.deletedAt = iso()
      audit(store, row.deleteRequestedBy ? { user: { uid: row.deleteRequestedBy } } : null,
        row, 'RECORDING_DELETED', '已从对象存储删除录像')
      return true
    })
  } catch {
    await update((store, _meeting, row) => {
      const reason = '对象存储删除失败，将自动重试'
      if (row.state !== 'DELETING' || row.failureReason === reason) return false
      row.failureReason = reason
      audit(store, null, row, 'RECORDING_DELETE_RETRY', reason, 'FAILED')
      return true
    })
  }
}

module.exports = {
  active, audit, storageConfig, policyConfig, recordingFor, consentFor, ackRequired, newRecording,
  recordingView, applyEgressWebhook, sweepRecordings, signAccess
}
