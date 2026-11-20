const { z } = require('zod')
const { commitStore, nextId } = require('../data/seed')
const { ROLES } = require('../middleware/auth')
const { ok } = require('../utils/result')
const { asyncMutation } = require('./interviewWorkspace')
const { recordingFor } = require('../services/interviewRecording')
const ai = require('../services/interviewAi')
const { AiFailure, validateSummary } = require('../services/interviewAiProviders')

function listed(name, uid) {
  return (process.env[name] || '').split(',').some(value => value.trim() === String(uid))
}

function mountInterviewAi(router, access, fail) {
  router.post('/:id/ai/consent', asyncMutation(async (req, res) => {
    const { store, interview } = access(req, true)
    const { key, accepted } = z.object({ key: z.string().length(64), accepted: z.boolean() }).strict().parse(req.body)
    const item = recordingFor(store, interview)
    const notice = ai.noticeView(store, interview, req.user.uid)
    if (!item || !notice || notice.key !== key) fail('AI 数据处理告知已变更或已失效')
    if (notice.decision !== accepted) {
      const { uid } = req.user
      store.interviewAiConsents.push({ id: nextId(store.interviewAiConsents), recordingId: item.id,
        userId: uid, policyKey: key, accepted, notice: notice.notice, createdAt: new Date().toISOString() })
      ai.audit(store, req, interview.id, 'AI_CONSENT', accepted ? '已同意 AI 数据处理' : '已拒绝或撤回 AI 数据处理授权')
      await commitStore(store)
    }
    res.json(ok(ai.noticeView(store, interview, req.user.uid)))
  }))

  function context(req, write = true) {
    const record = access(req, write)
    const { store, interview, role, member } = record
    const item = recordingFor(store, interview)
    const staff = ['HOST', 'PANEL'].includes(role)
    const college = req.user.activeRole === ROLES.COLLEGE_ADMIN
    const lead = req.user.activeRole === ROLES.LAB_LEADER && !college
    const collegeRead = college && listed('INTERVIEW_AI_COLLEGE_VIEW_IDS', req.user.uid)
    const manage = collegeRead && listed('RECORDING_MANAGE_IDS', req.user.uid)
    if (member?.removedAt || !(staff || collegeRead || (lead && role === 'OBSERVER'))) {
      fail('无权访问本场 AI 纪要', 'ROLE_FORBIDDEN', 403)
    }
    return { ...record, item, staff, manage, editor: role === 'HOST', job: ai.findJob(store, interview) }
  }

  router.get('/:id/ai/status', (req, res) => {
    const { store, interview, item, editor, staff, manage, job } = context(req, false)
    const config = ai.settings()
    const canShow = job && (staff || job.approvedId) && ai.retained(item)
    const eligible = editor && ai.allowed(store, interview, item, config)
    res.json(ok({
      state: job?.status === 'DELETED' ? 'DELETED' : canShow ? (staff ? job.status : 'APPROVED') : 'NOT_STARTED',
      progress: staff && canShow ? { phase: job.phase, done: Object.keys(job.checkpoint?.chunks || job.checkpoint?.summaries || {}).length,
        total: job.checkpoint?.total ?? null, error: job.error, updatedAt: job.updatedAt } : null,
      approved: Boolean(canShow && job.approvedId),
      canEdit: editor, canDelete: Boolean(manage && job && job.status !== 'DELETED' && !item?.holdAt),
      canRead: Boolean(canShow && (job.approvedId || (staff && job.transcriptId))),
      canRun: Boolean(eligible && (!job || (job.status === 'FAILED' && job.attempts < 3 && job.policyKey === config.policyKey))),
      ready: Boolean(config?.deepseekKey),
      recordingReady: ai.retained(item),
      pendingConsents: editor && item && config ? ai.audience(store, interview)
        .filter(uid => !ai.decision(store, item, config, uid)).length : null
    }))
  })

  router.post('/:id/ai/read', asyncMutation(async (req, res) => {
    const { store, interview, staff, item, job } = context(req)
    if (!job || !ai.retained(item) || job.status === 'DELETED' || (!staff && !job.approvedId)) {
      fail('本场没有可查看的 AI 资料', 'NOT_FOUND', 404)
    }
    const { versionId, download } = z.object({ versionId: z.number().int().positive().optional(),
      download: z.boolean().optional().default(false) }).parse(req.body || {})
    if (download && !staff && !listed('RECORDING_DOWNLOAD_IDS', req.user.uid)) fail('账号未获下载授权', 'ROLE_FORBIDDEN', 403)
    const formal = ai.version(store, job, job.approvedId)
    const version = versionId ? ai.version(store, job, versionId) : undefined
    if (versionId && (!version || (!staff && version.type !== 'SUMMARY_APPROVED'))) fail('找不到该版本', 'NOT_FOUND', 404)
    const versions = store.interviewAiVersions.filter(row => row.jobId === job.id && (staff || row.type === 'SUMMARY_APPROVED'))
    const name = id => store.users.find(user => user.id === id)?.realName
    const show = row => row && ({ ...row, authorName: name(row.authorId) })
    const linkedTranscript = version?.sourceId || formal?.sourceId
    const transcript = ai.version(store, job, staff ? (version?.sourceId || job.transcriptId) : linkedTranscript)
    const result = {
      transcript: staff ? show(transcript) : null,
      draft: staff ? show(ai.version(store, job, job.draftId)) : null, formal: show(formal), selected: show(version),
      versions: versions.map(({ content, ...metadata }) => ({ ...metadata, authorName: name(metadata.authorId) }))
    }
    // Formal readers see evidence timecodes without gaining access to the raw transcript.
    if (!staff) result.evidence = (transcript?.content || []).map(({ id, start, end }) => ({ id, start, end }))
    ai.audit(store, req, interview.id, download ? 'AI_DOWNLOAD' : 'AI_VIEW', download ? '导出 AI 资料' : '查看 AI 资料', { taskId: job.id, versionId })
    await commitStore(store)
    res.json(ok(result))
  }))

  router.post('/:id/ai/action', asyncMutation(async (req, res) => {
    const { store, interview, item, job, editor, manage } = context(req)
    const body = z.discriminatedUnion('action', [
      z.object({ action: z.literal('run') }),
      z.object({ action: z.literal('transcript'), baseId: z.number().int().positive(),
        changes: z.array(z.object({ id: z.number().int().positive(), text: z.string().trim().min(1).max(4000),
          speaker: z.string().trim().max(80).nullable() }).strict()).min(1).max(1500) }),
      z.object({ action: z.literal('draft'), baseId: z.number().int().positive(), content: z.unknown() }),
      z.object({ action: z.literal('approve'), baseId: z.number().int().positive() }),
      z.object({ action: z.literal('delete'), reason: z.string().trim().min(1).max(200) })
    ]).parse(req.body)
    if (body.action === 'delete') {
      if (!manage || item?.holdAt) fail('无权删除或本场处于争议保留', 'ROLE_FORBIDDEN', 403)
      if (!job || job.status === 'DELETED') return res.json(ok({ deleted: true }))
      ai.erase(store, job)
      ai.audit(store, req, interview.id, 'AI_DELETE', '删除转写与纪要', { taskId: job.id, reason: body.reason })
      await commitStore(store)
      return res.json(ok({ deleted: true }))
    }
    if (!editor) fail('只有本场主持教师可以编辑和审核纪要', 'ROLE_FORBIDDEN', 403)
    if (!ai.retained(item)) fail('没有可处理的有效录像')
    if (body.action === 'run') {
      const config = ai.settings()
      if (!ai.allowed(store, interview, item, config)) fail('录制、AI 独立授权或服务配置尚未满足')
      if (!job) ai.createJob(store, interview, item, config)
      else if (ai.active.has(job.status)) return res.json(ok({ status: job.status }))
      else if (job.status === 'FAILED' && job.policyKey === config.policyKey && job.attempts < 3) {
        job.attempts++
        Object.assign(job, { status: 'QUEUED', error: null, updatedAt: new Date().toISOString() })
        ai.audit(store, req, interview.id, 'AI_RETRY', '重试转写与纪要任务', { taskId: job.id, attempt: job.attempts })
      } else fail('任务已生成、已删除或达到重试上限')
      await commitStore(store)
      return res.json(ok({ status: 'QUEUED' }))
    }
    if (!job?.transcriptId || ai.active.has(job.status)) fail('请等待任务处理完成')
    const transcript = ai.version(store, job, job.transcriptId)
    const stamp = { authorId: req.user.uid, baseId: body.baseId }
    let next
    if (body.action === 'transcript') {
      if (body.baseId !== job.transcriptId) fail('逐字稿已更新，请重新加载')
      const changes = new Map(body.changes.map(row => [row.id, row]))
      const existing = new Set(transcript.content.map(row => row.id))
      if (changes.size !== body.changes.length || [...changes.keys()].some(id => !existing.has(id))) fail('逐字稿修订段落无效')
      const rows = transcript.content.map(row => changes.has(row.id) ? { ...row, ...changes.get(row.id), revised: true } : row)
      next = ai.addVersion(store, job, 'TRANSCRIPT_EDIT', rows, stamp)
      job.transcriptId = next.id
      if (job.status === 'FAILED' && job.phase === 'SUMMARY') job.checkpoint = {}
    } else {
      if (body.baseId !== job.draftId && !(body.action === 'draft' && body.baseId === job.approvedId)) fail('纪要已更新，请重新加载')
      const draft = ai.version(store, job, body.baseId)
      if (!draft) fail('请先生成纪要')
      if (body.action === 'approve') {
        if (job.approvedId && ai.version(store, job, job.approvedId)?.baseId === body.baseId) {
          return res.json(ok({ id: job.approvedId }))
        }
        if (draft.sourceId !== transcript.id) fail('逐字稿已修订，请保存核对后的新草稿')
        next = ai.addVersion(store, job, 'SUMMARY_APPROVED', draft.content, { ...stamp, sourceId: draft.sourceId })
        Object.assign(job, { status: 'APPROVED', approvedId: next.id })
      } else {
        let content
        try { content = validateSummary(body.content, transcript.content) }
        catch (error) { if (error instanceof AiFailure) fail(error.message); throw error }
        next = ai.addVersion(store, job, 'SUMMARY_DRAFT', content, { ...stamp, sourceId: transcript.id })
        Object.assign(job, { status: 'REVIEW', draftId: next.id })
      }
    }
    job.updatedAt = new Date().toISOString()
    ai.audit(store, req, interview.id, 'AI_VERSION', `${{ transcript: '修订逐字稿', draft: '保存纪要草稿', approve: '确认正式纪要' }[body.action]}`,
      { taskId: job.id, versionId: next.id })
    await commitStore(store)
    res.json(ok({ id: next.id }))
  }))
}

module.exports = { mountInterviewAi }
