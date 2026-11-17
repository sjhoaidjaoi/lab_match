<template>
  <section class="ai-panel" v-loading="loading">
    <el-alert v-if="problem" type="warning" :title="problem" :closable="false" />
    <header v-if="status" class="ai-header">
      <el-tag>{{ statusLabels[status.state] || status.state }}</el-tag>
      <span v-if="status.progress?.total">{{ status.progress.phase === 'STT' ? '音频片段' : '纪要分段' }} {{ status.progress.done }} / {{ status.progress.total }}</span>
      <p v-if="status.progress?.error" role="status">{{ status.progress.error }}</p>
      <p v-else-if="status.state === 'NOT_STARTED' && status.canEdit">
        {{ !status.recordingReady ? '等待有效录像' : !status.ready ? '等待学校配置语音识别和 DeepSeek' :
          status.pendingConsents ? '待确认 AI 授权人数 ' + status.pendingConsents : '等待后台创建任务' }}
      </p>
      <div class="actions">
        <el-button v-if="status.canRun" type="primary" :loading="busy" @click="act({ action: 'run' })">
          {{ status.state === 'FAILED' ? '重试任务' : '开始处理' }}
        </el-button>
        <el-button v-if="status.canRead" @click="read">查看逐字稿与纪要</el-button>
        <el-button v-if="detail" @click="download">导出授权资料</el-button>
        <el-button v-if="status.canDelete" type="danger" plain @click="remove">删除 AI 资料</el-button>
      </div>
    </header>
    <template v-if="detail">
      <div class="actions">
        <el-select v-model="versionId" clearable placeholder="选择历史版本" aria-label="历史版本" @change="chooseVersion">
          <el-option v-for="item in detail.versions" :key="item.id" :value="item.id"
            :label="`#${item.id} · ${typeLabels[item.type] || item.type} · ${formatDateTime(item.createdAt)} · ${item.authorName || item.model || '系统'}`" />
        </el-select>
      </div>
      <p v-if="detail.formal">已审核版本 #{{ detail.formal.id }} · {{ detail.formal.authorName }} · {{ formatDateTime(detail.formal.createdAt) }}</p>
      <details v-if="displayedTranscript.length" open>
        <summary>中文逐字稿</summary>
        <div class="actions">
          <el-input v-model="keyword" clearable placeholder="搜索逐字稿" aria-label="搜索逐字稿" />
          <el-select v-model="speakerFilter" clearable placeholder="按发言人筛选" aria-label="按发言人筛选">
            <el-option v-for="name in speakers" :key="name" :label="name" :value="name" />
          </el-select>
          <el-button v-if="status?.canEdit && !versionId && !processing" :disabled="!edits.size" @click="saveTranscript">保存逐字稿修订</el-button>
        </div>
        <ol class="transcript">
          <li v-for="row in filtered.slice((page - 1) * 30, page * 30)" :key="row.id">
            <button class="time" :disabled="!canPlay" @click="$emit('seek', row.start / 1000)">{{ clock(row.start) }}–{{ clock(row.end) }}</button>
            <small>{{ speakerName(row) }}{{ row.unclear ? ' · 待核实' : '' }}{{ row.revised ? ' · 已修订' : '' }}</small>
            <template v-if="status?.canEdit && !versionId && !processing">
              <el-input v-model="row.speaker" placeholder="确认发言人" aria-label="发言人" maxlength="80" @input="mark(row)" />
              <el-input v-model="row.text" type="textarea" :autosize="{minRows: 1, maxRows: 4}" maxlength="4000"
                aria-label="逐字稿文字" @input="mark(row)" />
            </template>
            <p v-else>{{ row.text }}</p>
          </li>
        </ol>
        <el-pagination v-if="filtered.length > 30" v-model:current-page="page" :page-size="30" :total="filtered.length" layout="prev, pager, next" />
      </details>
      <div v-if="displayedSummary">
        <h3>{{ versionId ? '历史纪要' : summaryVersion?.type === 'SUMMARY_APPROVED' ? '正式纪要' : '纪要草稿' }}</h3>
        <p v-if="summaryVersion">{{ summaryVersion.authorName || summaryVersion.model || '审核版本' }} · {{ formatDateTime(summaryVersion.createdAt) }}</p>
        <section v-for="field in fields" :key="field.key" class="summary-section">
          <h4>{{ field.title }}</h4>
          <p v-if="!displayedSummary[field.key].length" class="muted">当前版本无此项</p>
          <div v-for="(row, index) in displayedSummary[field.key]" :key="index" class="summary-row">
            <template v-for="item in rowFields(field.key)" :key="item.key">
              <label v-if="editable" class="field">{{ item.title }}
                <el-input :model-value="textValue(row, item.key)" type="textarea" :aria-label="item.title"
                  :autosize="{ minRows: 1, maxRows: 5 }" @update:model-value="updateField(row, item.key, $event)" />
              </label>
              <p v-else-if="textValue(row, item.key)">{{ item.title }} · {{ textValue(row, item.key) }}</p>
            </template>
            <div class="actions">
              <el-select v-if="editable" v-model="row.refs" multiple filterable collapse-tags
                placeholder="选择逐字稿依据" aria-label="逐字稿依据" @change="dirty = true">
                <el-option v-for="segment in rows" :key="segment.id" :value="segment.id"
                  :label="`#${segment.id} · ${clock(segment.start)} · ${segment.text.slice(0, 40)}`" />
              </el-select>
              <button v-for="refId in row.refs" :key="refId" class="time" :disabled="!canPlay || timestamp(refId) == null"
                @click="$emit('seek', (timestamp(refId) || 0) / 1000)">#{{ refId }} {{ timestamp(refId) == null ? '' : clock(timestamp(refId)!) }}</button>
              <el-button v-if="editable" text type="danger" @click="removeItem(field.key, index)">移除</el-button>
            </div>
          </div>
          <el-button v-if="editable" text type="primary" @click="addItem(field.key)">添加{{ field.title }}</el-button>
        </section>
        <div v-if="editable" class="actions">
          <el-button :loading="busy" @click="saveDraft">保存纪要草稿</el-button>
          <el-button :disabled="dirty || !!edits.size || status?.state === 'APPROVED'" type="primary" :loading="busy" @click="approve">确认正式纪要</el-button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { aiArchiveApi, type AiDetail, type AiStatus, type Segment, type Summary, type Version } from '@/api/interviewAi'
import { formatDateTime } from '@/api/student'

const props = defineProps<{ id: number; canPlay: boolean }>()
defineEmits<{ seek: [seconds: number] }>()
const status = ref<AiStatus>()
const detail = ref<AiDetail>()
const loading = ref(false)
const busy = ref(false)
const problem = ref('')
const versionId = ref<number>()
const keyword = ref('')
const speakerFilter = ref('')
const page = ref(1)
const rows = ref<Segment[]>([])
const summary = ref<Summary>()
const dirty = ref(false)
const edits = reactive(new Map<number, Segment>())
const statusLabels: Record<string, string> = { NOT_STARTED: '尚未生成', QUEUED: '等待处理', TRANSCRIBING: '中文转写中',
  SUMMARIZING: 'DeepSeek 生成中', REVIEW: '待教师审核', APPROVED: '已审核', FAILED: '生成失败', DELETED: 'AI 资料已删除' }
const typeLabels: Record<string, string> = { TRANSCRIPT_RAW: '原始逐字稿', TRANSCRIPT_EDIT: '教师修订逐字稿',
  SUMMARY_AI: 'AI 初稿', SUMMARY_DRAFT: '教师草稿', SUMMARY_APPROVED: '正式纪要' }
const fields: { key: keyof Summary; title: string }[] = [
  { key: 'topics', title: '主题' }, { key: 'questions', title: '问答' }, { key: 'projects', title: '项目' },
  { key: 'verify', title: '待核实事项' }, { key: 'overview', title: '客观总结' }
]
const processing = computed(() => ['QUEUED', 'TRANSCRIBING', 'SUMMARIZING'].includes(status.value?.state || ''))
const selected = computed(() => detail.value?.selected)
const displayedTranscript = computed(() => Array.isArray(selected.value?.content) ? selected.value.content : rows.value)
const summaryVersion = computed(() => (selected.value && !Array.isArray(selected.value.content) ? selected.value as Version<Summary> :
  (detail.value?.draft || detail.value?.formal)))
const displayedSummary = computed(() => versionId.value ? (selected.value && !Array.isArray(selected.value.content) ? selected.value.content : null) : summary.value)
const editable = computed(() => !!status.value?.canEdit && !versionId.value && !processing.value)
const speakerName = (row: Segment) => row.speaker || (row.speakerTag ? `待确认发言人 · ${row.speakerTag}` : '待确认发言人')
const speakers = computed(() => [...new Set(displayedTranscript.value.map(speakerName))])
const filtered = computed(() => displayedTranscript.value.filter(row =>
  (!speakerFilter.value || speakerName(row) === speakerFilter.value) && (!keyword.value || row.text.includes(keyword.value))))
watch([keyword, speakerFilter, versionId], () => { page.value = 1 })
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
const timestamp = (id: number) => (displayedTranscript.value.length ? displayedTranscript.value : detail.value?.evidence)?.find(row => row.id === id)?.start
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败，请稍后重试'

async function refresh() {
  try {
    status.value = await aiArchiveApi.status(props.id)
    if (status.value.state === 'DELETED' || !status.value.canRead) { detail.value = undefined; summary.value = undefined; rows.value = [] }
  } catch (error) { problem.value = errorText(error) }
}
async function read() {
  loading.value = true
  problem.value = ''
  try {
    detail.value = await aiArchiveApi.read(props.id, versionId.value || undefined)
    rows.value = detail.value.transcript?.content || []
    const value = detail.value.draft?.content || detail.value.formal?.content
    summary.value = value && JSON.parse(JSON.stringify(value))
    edits.clear()
    dirty.value = false
  } catch (error) { problem.value = errorText(error) }
  finally { loading.value = false }
}
async function chooseVersion() {
  if (dirty.value || edits.size) {
    try { await ElMessageBox.confirm('切换版本将丢弃尚未保存的修改。', '切换版本') }
    catch { versionId.value = undefined; return }
  }
  await read()
}
async function act(payload: Record<string, unknown>) {
  if (busy.value) return
  busy.value = true
  problem.value = ''
  try {
    await aiArchiveApi.action(props.id, payload)
    await refresh()
    if (detail.value) await read()
  } catch (error) { problem.value = errorText(error) }
  finally { busy.value = false }
}
function mark(row: Segment) { edits.set(row.id, row) }
const saveTranscript = () => act({ action: 'transcript', baseId: detail.value?.transcript?.id,
  changes: [...edits.values()].map(row => ({ id: row.id, text: row.text, speaker: row.speaker || null })) })
const saveDraft = () => act({ action: 'draft', baseId: summaryVersion.value?.id, content: summary.value })
const approve = async () => {
  try { await ElMessageBox.confirm('确认后将保存可追溯的正式版本，供授权人员查阅。', '确认正式纪要') }
  catch { return }
  await act({ action: 'approve', baseId: summaryVersion.value?.id })
}
function rowFields(key: keyof Summary) {
  if (key === 'questions') return [{ key: 'asker', title: '提问人（教师确认）' }, { key: 'question', title: '问题' }, { key: 'answer', title: '回答摘要' }]
  if (key === 'projects') return [{ key: 'name', title: '项目' }, { key: 'stack', title: '技术栈' },
    { key: 'role', title: '职责' }, { key: 'outcome', title: '成果' }]
  return [{ key: 'text', title: '内容' }]
}
function textValue(row: object, field: string) { return String((row as Record<string, unknown>)[field] || '') }
function updateField(row: object, field: string, text: string) { Object.assign(row, { [field]: text }); dirty.value = true }
function removeItem(key: keyof Summary, index: number) { summary.value?.[key].splice(index, 1); dirty.value = true }
function addItem(key: keyof Summary) {
  if (!summary.value) return
  if (key === 'questions') summary.value.questions.push({ question: '', answer: '', refs: [] })
  else if (key === 'projects') summary.value.projects.push({ name: '', stack: '', role: '', outcome: '', refs: [] })
  else summary.value[key].push({ text: '', refs: [] })
  dirty.value = true
}
async function remove() {
  try {
    const result = await ElMessageBox.prompt('输入删除原因。录像和面试评分将保留。', '删除 AI 资料', { inputValidator: value => !!value?.trim() })
    await act({ action: 'delete', reason: result.value })
  } catch { /* 用户取消 */ }
}
async function download() {
  try {
    const value = await aiArchiveApi.read(props.id, versionId.value || undefined, true)
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `interview-${props.id}-notes.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) { problem.value = errorText(error) }
}
let timer = 0
onMounted(() => { void refresh(); timer = window.setInterval(refresh, 3500) })
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<style scoped>
.ai-panel { display: grid; gap: 14px; min-height: 70px; }
.ai-header, .summary-section { padding: 14px; background: #fff9f5; border: 1px solid #efdcd0; border-radius: 12px; }
.ai-header > span { margin-right: 8px; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-block: 8px; }
.actions :deep(.el-button) { margin-left: 0; }
.actions :deep(.el-select), .actions :deep(.el-input) { flex: 1 1 180px; }
summary { cursor: pointer; font-weight: 650; }
.transcript { padding-left: 0; list-style: none; max-height: 430px; overflow: auto; }
.transcript li, .summary-row { display: grid; gap: 6px; padding: 8px 0; border-bottom: 1px solid #efdcd0; }
.transcript p, .summary-row p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.summary-section { margin-block: 8px; }
.summary-section h4 { margin: 0 0 4px; }
.time { justify-self: start; background: transparent; color: #963d24; border: 1px solid #e8c4b2; padding: 3px 7px; border-radius: 6px; cursor: pointer; }
.time:disabled { color: #746660; cursor: default; }
.muted, .field, small { color: #695850; }
</style>
