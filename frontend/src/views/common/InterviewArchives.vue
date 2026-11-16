<template>
  <section class="page archive-page">
    <header class="page-header">
      <h1 class="page-title">面试录像与档案</h1>
      <p class="page-desc">按面试场次查阅参会记录、聊天、教师评价和录像。</p>
    </header>
    <el-card shadow="never">
      <form class="filters" @submit.prevent="search">
        <el-input v-model="keyword" placeholder="学生姓名或学号" aria-label="学生姓名或学号" clearable />
        <el-input-number v-model="batchId" :min="1" :controls="false" placeholder="批次编号" aria-label="批次编号" />
        <el-input-number v-model="laboratoryId" :min="1" :controls="false" placeholder="实训室编号" aria-label="实训室编号" />
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
      </form>
      <el-alert v-if="listError" :title="listError" type="error" :closable="false" />
      <el-table v-loading="loading" :data="rows" empty-text="暂无可查看的面试档案">
        <el-table-column prop="studentName" label="学生" min-width="110" />
        <el-table-column label="实训室 / 批次" min-width="180">
          <template #default="{row}">{{ row.laboratoryName }} #{{ row.laboratoryId }} · {{ row.batchName || '批次' }} #{{ row.batchId }}</template>
        </el-table-column>
        <el-table-column label="面试时间" min-width="160">
          <template #default="{row}">{{ formatDateTime(row.interviewTime) }}</template>
        </el-table-column>
        <el-table-column label="面试官" min-width="120"><template #default="{row}">{{ row.examiners.join('、') }}</template></el-table-column>
        <el-table-column label="录像" min-width="155">
          <template #default="{row}">{{ label(row) }}<span v-if="row.recording.durationSeconds != null"> · {{ duration(row.recording.durationSeconds) }}</span></template>
        </el-table-column>
        <el-table-column label="操作" width="110">
          <template #default="{row}"><el-button link type="primary" @click="open(row.id)">查看档案</el-button></template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="total > 25" v-model:current-page="page" :page-size="25" :total="total" layout="prev, pager, next" @current-change="load" />
    </el-card>
    <el-drawer v-model="drawer" title="面试档案" size="min(760px, 100%)" destroy-on-close @closed="resetDetail">
      <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" />
      <div v-if="archive" class="archive-detail">
        <header>
          <h2>{{ archive.studentName }} · {{ archive.laboratoryName }}</h2>
          <p>{{ archive.studentNumber }} · {{ archive.batchName }} · {{ meetingStatusLabels[archive.status] }}</p>
          <p>预约 {{ formatDateTime(archive.interviewTime) }} · 面试官 {{ archive.examiners.join('、') }}</p>
          <p>实际开始 {{ formatDateTime(archive.startsAt) }} · 结束 {{ formatDateTime(archive.endsAt) }}</p>
          <el-button link type="primary" @click="refreshDetail">刷新档案</el-button>
        </header>
        <el-tabs v-model="tab">
          <el-tab-pane name="recording" label="录像">
            <h3>{{ recordingLabels[archive.recording.state] }}</h3>
            <p v-if="archive.recording.savedAt">保存于 {{ formatDateTime(archive.recording.savedAt) }} · {{ duration(archive.recording.durationSeconds) }}</p>
            <p v-if="archive.recording.expiresAt && archive.recording.state !== 'DELETED'">到期时间 {{ formatDateTime(archive.recording.expiresAt) }}</p>
            <p v-if="archive.recording.holdReason">暂停清理 · {{ archive.recording.holdReason }}</p>
            <el-alert v-if="archive.recording.failureReason" type="warning" :title="archive.recording.failureReason" :closable="false" />
            <div class="actions">
              <el-button v-if="archive.recording.state === 'COMPLETE' && archive.access.play" type="primary" :loading="playLoading" @click="play">
                {{ mediaUrl ? '刷新播放地址' : '加载录像' }}
              </el-button>
              <el-button v-if="archive.recording.state === 'COMPLETE' && archive.access.download" @click="download">下载 MP4</el-button>
              <template v-if="archive.access.manage && ['COMPLETE', 'FAILED', 'PROCESSING'].includes(archive.recording.state)">
                <el-button @click="retain(archive.recording.holdReason ? 'release' : 'hold')">{{ archive.recording.holdReason ? '解除保留' : '争议保留' }}</el-button>
                <el-button v-if="!archive.recording.holdReason && archive.recording.state !== 'PROCESSING'" type="danger" plain @click="retain('delete')">删除录像</el-button>
              </template>
            </div>
            <p v-if="mediaLoading" role="status">加载录像中…</p>
            <p v-if="mediaError" role="alert">播放中断。可刷新播放地址并继续上次的进度。</p>
            <video v-if="mediaUrl" ref="player" :src="mediaUrl" controls playsinline preload="metadata"
              controlslist="nodownload" aria-label="面试录像" @loadedmetadata="restorePosition"
              @timeupdate="rememberPosition" @error="mediaFailed" />
          </el-tab-pane>
          <el-tab-pane name="attendance" label="参会记录">
            <el-table :data="archive.sessions" empty-text="暂无签名事件记录">
              <el-table-column prop="name" label="人员" min-width="95" />
              <el-table-column label="身份" min-width="110"><template #default="{row}">{{ roleLabels[row.role] || '—' }}</template></el-table-column>
              <el-table-column label="进出时间" min-width="200">
                <template #default="{row}">{{ formatDateTime(row.joinedAt) }} → {{ formatDateTime(row.leftAt) }}</template>
              </el-table-column>
              <el-table-column label="在线 / 状态" min-width="160">
                <template #default="{row}">{{ duration(row.onlineSeconds) }}{{ row.rejoined ? ' · 再次加入' : '' }}{{ row.removed ? ' · 已移出' : '' }}<br>{{ row.disconnectReason }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane name="logs" label="操作记录">
            <el-timeline v-if="archive.logs.length">
              <el-timeline-item v-for="entry in archive.logs" :key="entry.id" :timestamp="formatDateTime(entry.occurredAt)">
                {{ entry.operator || '系统' }} · {{ entry.text }} <span v-if="entry.result === 'FAILED'">（失败）</span>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无操作记录" />
          </el-tab-pane>
          <el-tab-pane name="chat" label="聊天记录">
            <MeetingChat :items="archive.messages" readonly />
            <el-button v-if="archive.hasMore" @click="moreChat">加载更多消息</el-button>
          </el-tab-pane>
          <el-tab-pane name="score" label="面试评价">
            <dl class="scores">
              <template v-for="score in scoreLabels" :key="score.key"><dt>{{ score.title }}</dt><dd>{{ archive.score[score.key] ?? '—' }}</dd></template>
            </dl>
            <p class="evaluation">{{ archive.score.evaluation || '暂无教师评价' }}</p>
          </el-tab-pane>
          <el-tab-pane name="summary" label="AI 会议总结"><el-empty description="尚未生成" /></el-tab-pane>
        </el-tabs>
      </div>
      <el-skeleton v-else-if="!detailError" animated :rows="5" />
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/api/student'
import { interviewVideoApi, meetingStatusLabels, recordingLabels, type ArchiveRow, type InterviewArchive } from '@/api/interviewVideo'
import MeetingChat from './MeetingChat.vue'

const rows = ref<ArchiveRow[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const batchId = ref<number>()
const laboratoryId = ref<number>()
const loading = ref(false)
const listError = ref('')
const detailError = ref('')
const archive = ref<InterviewArchive>()
const drawer = ref(false)
const tab = ref('recording')
const mediaUrl = ref('')
const mediaError = ref(false)
const mediaLoading = ref(false)
const playLoading = ref(false)
const player = ref<HTMLVideoElement>()
let position = 0
let selected = 0
let listRequest = 0
const roleLabels: Record<string, string> = { HOST: '主持人', CANDIDATE: '应试学生', PANEL: '面试官', OBSERVER: '旁听' }
const scoreLabels = [
  { key: 'attitudeScore', title: '态度' }, { key: 'logicScore', title: '逻辑' }, { key: 'programmingScore', title: '编程' },
  { key: 'timeCommitmentScore', title: '时间投入' }, { key: 'comprehensiveScore', title: '综合' }
] as const
const label = (row: ArchiveRow) => recordingLabels[row.recording.state]
function duration(value?: number) {
  if (value == null) return '—'
  return `${Math.floor(value / 60)} 分 ${value % 60} 秒`
}
function errorText(error: unknown) { return error instanceof Error ? error.message : '操作失败，请稍后重试' }
async function load() {
  const request = ++listRequest
  loading.value = true
  listError.value = ''
  try {
    const result = await interviewVideoApi.archives({ keyword: keyword.value || undefined, batchId: batchId.value,
      laboratoryId: laboratoryId.value, offset: (page.value - 1) * 25 })
    if (request === listRequest) { rows.value = result.items; total.value = result.total }
  } catch (error) { if (request === listRequest) listError.value = errorText(error) }
  finally { if (request === listRequest) loading.value = false }
}
function search() { page.value = 1; void load() }
function resetDetail() {
  selected = 0
  archive.value = undefined
  mediaUrl.value = ''
  mediaError.value = mediaLoading.value = false
  position = 0
}
function open(id: number) {
  resetDetail()
  selected = id
  tab.value = 'recording'
  drawer.value = true
  void refreshDetail()
}
async function refreshDetail() {
  const id = selected
  if (!id) return
  detailError.value = ''
  try {
    const data = await interviewVideoApi.archive(id)
    if (id === selected) archive.value = data
  } catch (error) { if (id === selected) detailError.value = errorText(error) }
}
async function moreChat() {
  const current = archive.value
  if (!current) return
  try {
    const page = await interviewVideoApi.archive(current.id, current.messages.at(-1)?.id)
    if (archive.value !== current) return
    const known = new Set(current.messages.map(item => item.id))
    current.messages.push(...page.messages.filter(item => !known.has(item.id)))
    current.hasMore = page.hasMore
  } catch (error) { detailError.value = errorText(error) }
}
function rememberPosition() { if (player.value?.currentTime) position = player.value.currentTime }
function restorePosition() {
  mediaLoading.value = false
  if (player.value && position > 0 && position < player.value.duration) player.value.currentTime = position
}
function mediaFailed() { mediaLoading.value = false; mediaError.value = true }
async function play() {
  const id = selected
  playLoading.value = true
  detailError.value = ''
  try {
    const { url } = await interviewVideoApi.recordingLink(id, false)
    if (id !== selected) return
    mediaLoading.value = true
    mediaError.value = false
    mediaUrl.value = url
  } catch (error) { if (id === selected) detailError.value = errorText(error) }
  finally { playLoading.value = false }
}
async function download() {
  const id = selected
  try {
    const { url } = await interviewVideoApi.recordingLink(id, true)
    if (id !== selected) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.rel = 'noreferrer'
    anchor.click()
  } catch (error) { detailError.value = errorText(error) }
}
async function retain(action: 'hold' | 'release' | 'delete') {
  const id = selected
  let reason: string
  try {
    const labels = { hold: '暂停录像清理', release: '解除录像保留', delete: '删除录像文件' }
    reason = (await ElMessageBox.prompt('请填写操作原因。', labels[action], {
      inputValidator: input => (input.trim().length > 0 && input.trim().length <= 240) || '请输入 1–240 个字符'
    })).value
  } catch { return }
  if (id !== selected) return
  try {
    await interviewVideoApi.retention(id, action, reason)
    if (id !== selected) return
    if (action === 'delete') mediaUrl.value = ''
    await Promise.all([refreshDetail(), load()])
  } catch (error) { detailError.value = errorText(error) }
}
onMounted(load)
</script>

<style scoped>
.archive-page { max-width: 1420px; margin-inline: auto; }
.filters { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
.filters > :deep(.el-input) { width: min(100%, 245px); }
.filters > :deep(.el-input-number) { width: min(100%, 140px); }
.archive-detail header { margin: 0 0 20px; padding: 16px; background: #fcf0e8; border: 1px solid #f0d9cd; border-radius: 12px; overflow-wrap: anywhere; }
.archive-detail header h2 { margin-top: 0; }
.archive-detail p { color: #62544e; }
.archive-detail video { width: 100%; max-height: 55dvh; aspect-ratio: 16 / 9; background: #211916; border-radius: 10px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.actions :deep(.el-button) { margin: 0; }
.scores { display: grid; grid-template-columns: 120px 1fr; gap: 8px; }
.scores dd { margin: 0; }
.evaluation { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
