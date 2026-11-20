<template>
  <main ref="meetingEl" class="meeting">
    <header class="meeting-header">
      <div>
        <router-link class="back" :to="returnPath">← 返回面试安排</router-link>
        <h1>{{ meeting?.laboratoryName ? meeting.laboratoryName + ' · 线上面试' : '线上面试' }}</h1>
        <p v-if="meeting">应试学生 {{ meeting.studentName }} · 主持人 {{ hostName }} · {{ formatDateTime(meeting.interviewTime) }}</p>
      </div>
      <div v-if="meeting" class="header-status">
        <el-tag :type="connected ? 'success' : 'info'">{{ statusTitle }}</el-tag>
        <el-tag v-if="workspace?.locked" type="warning">已锁定</el-tag>
        <el-tag v-if="recording && recording.state !== 'NONE'" :type="recording.state === 'RECORDING' ? 'danger' : 'info'">
          {{ recordingLabels[recording.state] }}
        </el-tag>
        <span v-if="meeting.startsAt">已持续 {{ elapsed }} · {{ roster.length }} 人在线</span>
      </div>
    </header>

    <el-alert v-if="problem" type="error" :title="problem" show-icon :closable="false" />
    <section v-if="workspace?.aiConsent" class="recording-notice" aria-label="AI 数据处理授权">
      <details :open="workspace.aiConsent.decision === null">
        <summary>AI 数据处理告知 · {{ workspace.aiConsent.version }}</summary>
        <p>{{ workspace.aiConsent.notice }}</p>
        <p>转写服务处理会议音频，DeepSeek 处理转写文本。你的选择独立于录制和入会。</p>
        <div class="device-controls">
          <el-button v-if="workspace.aiConsent.decision !== true" type="primary" @click="consentToAi(true)">同意本场 AI 处理</el-button>
          <el-button v-if="workspace.aiConsent.decision !== false" @click="consentToAi(false)">
            {{ workspace.aiConsent.decision ? '撤回 AI 授权' : '不同意 AI 处理' }}
          </el-button>
          <span v-if="workspace.aiConsent.decision !== null" class="hint">{{ workspace.aiConsent.decision ? '已同意' : '已拒绝或撤回' }}</span>
        </div>
      </details>
    </section>
    <section v-if="meeting && recording && !closed" class="recording-notice" aria-label="录制授权">
      <template v-if="recording.policy && consentOpen">
        <details :open="recording.decision !== 'ACCEPTED'">
          <summary>面试录制告知 · 版本 {{ recording.policy.version }}</summary>
          <p>{{ recording.policy.notice }}</p>
          <p>录像保存 {{ recording.policy.days }} 天。获授权的学院负责人可因正式争议暂停清理。</p>
          <div v-if="!workspace?.removed" class="device-controls">
            <el-button v-if="recording.decision !== 'ACCEPTED'" type="primary" @click="recordConsent(true)">同意本场录制</el-button>
            <el-button v-if="recording.decision !== 'DECLINED'" @click="recordConsent(false)">
              {{ recording.decision === 'ACCEPTED' ? (recording.state === 'WAITING' ? '撤回同意' : '撤回并请求停止录制') : '不同意录制' }}
            </el-button>
            <span v-if="recording.decision === 'ACCEPTED'" class="hint">已同意本场录制</span>
          </div>
        </details>
      </template>
      <p v-if="recording.failureReason" role="status">{{ recording.failureReason }}</p>
      <div v-if="meeting.role === 'HOST'" class="device-controls">
        <el-button v-if="recording.state === 'NONE' && ['UPCOMING', 'WAITING', 'OPEN'].includes(meeting.status)"
          :disabled="!recording.available" @click="enableRecording">启用本场录制</el-button>
        <span v-if="recording.state === 'NONE' && !recording.available" class="hint">配置私有存储和学校录制告知后可启用录制。</span>
        <span v-else-if="recording.state === 'NONE' && meeting.status === 'OPEN'" class="hint">
          会议已开始，录制会从你启用的时刻起算，之前的画面不会录入。
        </span>
        <el-button v-if="consentOpen && recording.state !== 'STOPPING'" @click="stopRecording">
          {{ recording.state === 'WAITING' ? '取消录制计划' : '停止录制' }}
        </el-button>
      </div>
    </section>
    <el-alert v-if="workspace?.removed" type="warning" :title="'你已被主持人移出会议。' + (workspace.removalReason || '')" :closable="false" />
    <el-alert v-if="inCall && meeting?.role === 'HOST' && remaining <= 300" type="warning" :closable="false"
      :title="remaining > 0 ? '距离预约结束还有 ' + clock(remaining) : '已到预约结束时间，请在面试完成后结束会议。'" />
    <el-alert v-if="inCall && muteRequest" type="info" :closable="false" title="主持人请求你关闭麦克风">
      <el-button size="small" @click="respondToMute(true)">关闭麦克风</el-button>
      <el-button size="small" @click="respondToMute(false)">忽略</el-button>
    </el-alert>
    <el-alert v-if="reconnecting" type="warning" title="连接中断，正在自动重连…" show-icon :closable="false" />
    <el-alert v-else-if="interrupted" type="warning" title="连接已断开。可重新进入会议，设备默认关闭。" show-icon :closable="false" />
    <el-empty v-if="!meeting && !loading" description="无法打开这场线上面试">
      <el-button @click="load(true)">重试</el-button>
    </el-empty>
    <div v-else-if="!meeting" v-loading="loading" class="loading-panel" />

    <template v-if="meeting && !inCall">
      <section class="lobby">
        <div v-if="!closed && meeting.role !== 'OBSERVER'" class="device-test">
          <div class="preview">
            <MeetingTrack v-if="previewCamera" :track="previewCamera" video />
            <div v-else class="preview-label">
              <el-icon><VideoCamera /></el-icon>
              <span>摄像头未开启</span>
            </div>
          </div>
          <div class="device-controls" aria-label="入会设备检测">
            <el-button :loading="deviceBusy" :disabled="joining" :aria-pressed="!!previewCamera" @click="testDevice('camera')">
              {{ previewCamera ? '关闭摄像头' : '测试摄像头' }}
            </el-button>
            <el-button :loading="deviceBusy" :disabled="joining" :aria-pressed="!!previewMic" @click="testDevice('microphone')">
              {{ previewMic ? '关闭麦克风' : '测试麦克风' }}
            </el-button>
          </div>
          <label v-if="previewMic" class="meter">麦克风音量 <meter min="0" max="1" :value="micLevel" /></label>
          <p class="hint">测试画面仅在本机显示。加入会议时会沿用你选择的设备状态。</p>
        </div>
        <div class="lobby-details">
          <h2>{{ closed ? statusTitle : meeting.role === 'CANDIDATE' ? '面试等候室' : meeting.role === 'OBSERVER' ? '会议旁听' : '准备入会' }}</h2>
          <p v-if="meeting.instructions">{{ meeting.instructions }}</p>
          <p v-if="meeting.status === 'UPCOMING'">可从 {{ formatDateTime(meeting.opensAt) }} 开始入会。</p>
          <p v-if="meeting.status === 'WAITING' && meeting.role !== 'HOST'">请等待主持人开启会议，页面会自动更新状态。</p>
          <p v-if="meeting.endsAt">结束时间 · {{ formatDateTime(meeting.endsAt) }}</p>
          <h3 v-if="meeting.participants.length">受邀参会人员</h3>
          <ul class="invitees">
            <li v-for="person in meeting.participants" :key="person.identity">{{ person.name }} <span>{{ roleNames[person.role] }}</span></li>
          </ul>
          <template v-if="!closed && !workspace?.removed && meeting.role === 'CANDIDATE'">
            <p v-if="waitingText" role="status">{{ waitingText }}</p>
            <el-button v-if="workspace?.waitingStatus === 'WAITING'" @click="requestWaiting('cancel')">取消等待</el-button>
            <el-button v-else-if="workspace?.waitingStatus !== 'APPROVED'" type="primary"
              :disabled="!workspace || workspace.locked || meeting.status === 'UPCOMING'" @click="requestWaiting('request')">
              {{ workspace?.waitingStatus === 'REJECTED' ? '重新申请加入' : '申请加入面试' }}
            </el-button>
          </template>
          <el-button v-if="!closed && !workspace?.removed && (meeting.role !== 'CANDIDATE' || workspace?.waitingStatus === 'APPROVED')"
            class="primary-action" type="primary" :loading="joining" :disabled="!canJoin || deviceBusy" @click="join">
            {{ meeting.status === 'WAITING' && meeting.role === 'HOST' ? '开始并加入会议' : interrupted ? '重新加入会议' : '加入会议' }}
          </el-button>
        </div>
      </section>
    </template>

    <template v-if="inCall && meeting">
      <div class="call-layout" :class="{ 'panel-open': panel }">
        <section class="tiles" aria-label="视频宫格" :class="{ 'speaker-layout': mainSpeaker }">
          <article v-for="item in sharing" :key="item.id + '-screen'" class="tile screen-tile">
            <MeetingTrack v-if="item.screen" :track="item.screen" video />
            <span class="tile-caption">{{ item.name }} · 屏幕共享</span>
          </article>
          <button v-for="item in orderedRoster" :key="item.id" type="button" class="tile participant-tile"
            :class="{ speaking: item.speaking, featured: !sharing.length && mainSpeaker === item.id }"
            :aria-label="'放大或还原 ' + item.name" :aria-pressed="pinned === item.id" @click="pinned = pinned === item.id ? '' : item.id">
            <MeetingTrack v-if="item.camera" :track="item.camera" video />
            <span v-else class="avatar">{{ item.name.slice(0, 1) }}</span>
            <span class="tile-caption">{{ item.name }}{{ item.mine ? '（我）' : '' }}<span v-if="!item.mic"> · 已静音</span></span>
          </button>
        </section>
        <aside v-if="panel" class="people">
          <div class="panel-nav">
            <el-button text :type="panel === 'people' ? 'primary' : 'default'" @click="panel = 'people'">人员</el-button>
            <el-button text :type="panel === 'chat' ? 'primary' : 'default'" @click="openChat">聊天{{ unread ? ' (' + unread + ')' : '' }}</el-button>
            <el-button v-if="interviewer" text :type="panel === 'profile' ? 'primary' : 'default'" @click="openProfile">学生资料</el-button>
            <el-button text aria-label="收起侧栏" @click="panel = ''">×</el-button>
          </div>
          <template v-if="panel === 'people'">
            <h2>在线人员 <span>{{ roster.length }}</span></h2>
            <ul>
              <li v-for="item in peopleOrder" :key="item.id" class="person">
                <div><strong>{{ item.name }}{{ item.mine ? '（我）' : '' }}</strong> <small>{{ roleNames[item.role] }} · 在线</small></div>
                <small>{{ item.mic ? '麦克风开启' : '已静音' }} · {{ item.cameraOn ? '摄像头开' : '摄像头关' }}{{ item.screenOn ? ' · 正在共享' : '' }}{{ item.hand ? ' · 举手 #' + item.hand : '' }}</small>
                <div v-if="meeting.role === 'HOST' && !item.mine">
                  <el-button v-if="item.mic" link @click="moderate(item.id, 'request-mute')">请求静音</el-button>
                  <el-button link type="danger" @click="moderate(item.id, 'remove')">移出</el-button>
                </div>
              </li>
            </ul>
            <template v-if="meeting.role === 'HOST'">
              <h2>等候室 <span>{{ workspace?.waiting.length || 0 }}</span></h2>
              <p v-if="!workspace?.waiting.length" class="hint">暂无入会申请</p>
              <ul><li v-for="item in workspace?.waiting" :key="item.identity" class="person">
                <strong>{{ item.name }} · {{ item.studentNumber }}</strong>
                <small>申请于 {{ formatDateTime(item.requestedAt) }}</small>
                <div><el-button size="small" type="primary" :disabled="workspace?.locked" @click="decide(item.identity, true)">批准</el-button>
                  <el-button size="small" @click="decide(item.identity, false)">拒绝</el-button></div>
              </li></ul>
              <el-button size="small" @click="lock">{{ workspace?.locked ? '解锁会议' : '锁定会议' }}</el-button>
            </template>
          </template>
          <MeetingChat v-else-if="panel === 'chat'" v-model="draft" :items="messages" :viewer="auth.user?.id" :sending="sending" @send="send" />
          <dl v-else-if="panel === 'profile' && profile" class="profile">
            <dt>姓名 / 学号</dt><dd>{{ profile.studentName }} · {{ profile.studentNumber }}</dd>
            <dt>专业班级</dt><dd>{{ [profile.major, profile.className].filter(Boolean).join(' · ') || '未填写' }}</dd>
            <dt>报名实训室 / 导师</dt><dd>{{ profile.laboratoryName }} · {{ profile.mentorName }}</dd>
            <dt>报名方向</dt><dd>{{ profile.direction || '未填写' }}</dd>
            <dt>个人介绍</dt><dd>{{ profile.introduction || '未填写' }}</dd>
            <dt>简历</dt><dd><el-button v-if="profile.resume" link type="primary" @click="downloadResume">{{ profile.resume.name }} · 下载</el-button><span v-else>未上传</span></dd>
          </dl>
        </aside>
      </div>
      <div class="remote-audio" aria-hidden="true">
        <MeetingTrack v-for="item in remoteAudio" :key="item.id" :track="item.track" />
      </div>
      <footer class="toolbar" aria-label="会议控制">
        <template v-if="meeting.role !== 'OBSERVER'">
          <el-button :icon="Microphone" :disabled="!connected" :loading="pendingDevice === 'microphone'" :aria-pressed="!!local?.mic" @click="toggle('microphone')">
            {{ local?.mic ? '关闭麦克风' : '开启麦克风' }}
          </el-button>
          <el-button :icon="VideoCamera" :disabled="!connected" :loading="pendingDevice === 'camera'" :aria-pressed="!!local?.camera" @click="toggle('camera')">
            {{ local?.camera ? '关闭摄像头' : '开启摄像头' }}
          </el-button>
          <el-button :icon="Monitor" :disabled="!connected" :loading="pendingDevice === 'screen'" :aria-pressed="!!local?.screen" @click="toggle('screen')">
            {{ local?.screen ? '停止共享' : '共享屏幕' }}
          </el-button>
        </template>
        <el-button :disabled="!connected" @click="openDevices">设备设置</el-button>
        <el-button :aria-pressed="panel === 'people'" @click="panel = panel === 'people' ? '' : 'people'">参会人员{{ workspace?.waiting.length ? ' · ' + workspace.waiting.length + ' 人等候' : '' }}</el-button>
        <el-button :aria-pressed="panel === 'chat'" @click="panel === 'chat' ? panel = '' : openChat()">会议聊天{{ unread ? ' (' + unread + ')' : '' }}</el-button>
        <el-button v-if="meeting.role !== 'OBSERVER'" :aria-pressed="!!local?.hand" @click="raiseHand">{{ local?.hand ? '放下手' : '举手' }}</el-button>
        <el-button :aria-pressed="speakerMode" @click="speakerMode = !speakerMode">{{ speakerMode ? '宫格布局' : '主讲人模式' }}</el-button>
        <el-button v-if="fullscreenAvailable" @click="fullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</el-button>
        <el-button v-if="audioBlocked" @click="enableAudio">播放会议声音</el-button>
        <el-button @click="leave">离开会议</el-button>
        <el-button v-if="meeting.role === 'HOST'" type="danger" :loading="ending" @click="end">结束会议</el-button>
      </footer>
    </template>
    <details v-if="closed && workspace?.canReadChat" class="people">
      <summary>历史聊天记录（{{ messages.length }}）</summary>
      <MeetingChat :items="messages" :viewer="auth.user?.id" readonly />
    </details>
    <el-dialog v-model="deviceDialog" title="音视频设备" width="min(440px, calc(100vw - 32px))">
      <el-form label-position="top">
        <el-form-item v-for="device in deviceKinds" :key="device.kind" :label="device.label">
          <el-select :model-value="deviceSelection[device.kind]" :disabled="!deviceOptions.some(item => item.kind === device.kind)"
            placeholder="跟随系统默认设备" @change="selectDevice(device.kind, $event)">
            <el-option v-for="item in deviceOptions.filter(entry => entry.kind === device.kind)" :key="item.deviceId"
              :value="item.deviceId" :label="item.label || device.label" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Microphone, Monitor, VideoCamera } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { ConnectionState, Room, RoomEvent, Track, createLocalAudioTrack, createLocalVideoTrack, supportsAudioOutputSelection,
  type LocalAudioTrack, type LocalVideoTrack, type Participant } from 'livekit-client'
import { interviewVideoApi, meetingStatusLabels, recordingLabels, type MeetingDetails, type MeetingRole, type MeetingState, type MeetingMessage, type MeetingProfile } from '@/api/interviewVideo'
import { formatDateTime } from '@/api/student'
import { useAuthStore } from '@/stores/auth'
import MeetingTrack from './MeetingTrack.vue'
import MeetingChat from './MeetingChat.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const roomId = computed(() => String(route.params.id))
const returnPaths = {
  STUDENT: '/student/interview', LAB_TEACHER: '/teacher/interviews',
  LAB_LEADER: '/leader/online-interviews', COLLEGE_ADMIN: '/college/interviews'
}
const returnPath = computed(() => returnPaths[auth.currentRole as keyof typeof returnPaths] || '/')
const roleNames: Record<MeetingRole, string> = { HOST: '主持人', CANDIDATE: '应试学生', PANEL: '共同面试官', OBSERVER: '旁听' }
const meeting = ref<MeetingDetails>()
const problem = ref('')
const loading = ref(true)
const joining = ref(false)
const ending = ref(false)
const interrupted = ref(false)
const deviceBusy = ref(false)
const audioBlocked = ref(false)
const connection = ref<ConnectionState>(ConnectionState.Disconnected)
const previewCamera = shallowRef<LocalVideoTrack>()
const previewMic = shallowRef<LocalAudioTrack>()
const micLevel = ref(0)
const revision = ref(0)
const workspace = ref<MeetingState>()
const panel = ref<'' | 'people' | 'chat' | 'profile'>('people')
const profile = ref<MeetingProfile>()
const messages = ref<MeetingMessage[]>([])
const draft = ref('')
const sending = ref(false)
const unread = ref(0)
const pinned = ref('')
const speakerMode = ref(false)
const time = ref(Date.now())
const dismissedMute = ref<string | null>(null)
const meetingEl = ref<HTMLElement>()
const isFullscreen = ref(false)
// 按设备粒度的进行中标记：只锁当前点击的那个按钮，麦克风/摄像头互不牵连。
// 之前用一个 deviceBusy 锁住整条工具栏，点麦克风时摄像头、共享也一起变灰，
// 再加上按钮没有 loading 反馈，操作起来就显得「卡」。
const pendingDevice = ref<'' | 'camera' | 'microphone' | 'screen'>('')
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitFullscreenEnabled?: boolean
  webkitExitFullscreen?: () => Promise<void> | void
}
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
const fullscreenAvailable = Boolean(document.fullscreenEnabled ||
  (document as FullscreenDocument).webkitFullscreenEnabled)
const deviceOptions = ref<MediaDeviceInfo[]>([])
const deviceDialog = ref(false)
const deviceSelection = reactive<Partial<Record<MediaDeviceKind, string>>>({})
const deviceKinds: { kind: MediaDeviceKind; label: string }[] = [
  { kind: 'audioinput', label: '麦克风' }, { kind: 'videoinput', label: '摄像头' }
]
if (supportsAudioOutputSelection()) deviceKinds.push({ kind: 'audiooutput', label: '扬声器' })
let activeRoom: Room | undefined
let context: AudioContext | undefined
let meterFrame = 0
let generation = 0
let refreshing = false
let syncing = false
let retryMessage: { id: string; content: string } | undefined

const closed = computed(() => Boolean(workspace.value?.removed) || ['ENDED', 'CLOSED', 'CANCELLED'].includes(meeting.value?.status || ''))
const recording = computed(() => workspace.value?.recording)
const consentOpen = computed(() => ['WAITING', 'STARTING', 'RECORDING', 'STOPPING'].includes(recording.value?.state || ''))
const statusTitle = computed(() => workspace.value?.removed ? '已被移出' : meeting.value && meetingStatusLabels[meeting.value.status])
const canJoin = computed(() => meeting.value?.status === 'OPEN' ||
  (meeting.value?.status === 'WAITING' && meeting.value.role === 'HOST'))
const connected = computed(() => connection.value === ConnectionState.Connected)
const reconnecting = computed(() => connection.value === ConnectionState.Reconnecting ||
  connection.value === ConnectionState.SignalReconnecting)
const inCall = computed(() => connected.value || reconnecting.value)
const interviewer = computed(() => ['HOST', 'PANEL'].includes(meeting.value?.role || ''))
const hostName = computed(() => meeting.value?.participants.find(item => item.role === 'HOST')?.name || '—')
const waitingText = computed(() => {
  const state = workspace.value?.waitingStatus
  if (state === 'WAITING') return '等待主持人批准。你可以继续测试设备。'
  if (state === 'APPROVED') return '主持人已批准，可以加入会议。'
  if (state === 'REJECTED') return '主持人已拒绝本次入会申请。'
  if (workspace.value?.locked) return '会议已锁定，请等待主持人解锁。'
  return state === 'CANCELLED' ? '已取消等待。' : ''
})
const elapsed = computed(() => clock(((meeting.value?.endsAt ? Date.parse(meeting.value.endsAt) : time.value) -
  Date.parse(meeting.value?.startsAt || '')) / 1000))
const remaining = computed(() => Math.ceil((Date.parse(meeting.value?.closesAt || '') - time.value) / 1000))
function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds) || 0)
  return [Math.floor(total / 3600), Math.floor(total % 3600 / 60), total % 60].map(value => String(value).padStart(2, '0')).join(':')
}

function media(participant: Participant, source: Track.Source) {
  const publication = participant.getTrackPublication(source)
  return publication && !publication.isMuted ? publication.track : undefined
}

const roster = computed(() => {
  void revision.value
  const room = activeRoom
  if (!room) return []
  const invitees = meeting.value?.participants || []
  return [room.localParticipant, ...room.remoteParticipants.values()].map(participant => {
    const person = invitees.find(item => item.identity === participant.identity)
    return {
      id: participant.identity,
      name: person?.name || '旁听人员',
      role: (person?.role || 'OBSERVER') as MeetingRole,
      hand: person?.handOrder,
      speaking: participant.isSpeaking,
      mine: participant.isLocal,
      mic: participant.isMicrophoneEnabled,
      cameraOn: participant.isCameraEnabled,
      screenOn: participant.isScreenShareEnabled,
      camera: media(participant, Track.Source.Camera),
      screen: media(participant, Track.Source.ScreenShare)
    }
  })
})
const local = computed(() => roster.value.find(item => item.mine))
const sharing = computed(() => roster.value.filter(item => item.screen))
const mainSpeaker = computed(() => roster.value.some(item => item.id === pinned.value) ? pinned.value :
  speakerMode.value ? (roster.value.find(item => item.speaking)?.id || roster.value.find(item => item.role === 'HOST')?.id || roster.value[0]?.id) : '')
const orderedRoster = computed(() => [...roster.value].sort((a, b) => Number(b.id === mainSpeaker.value) - Number(a.id === mainSpeaker.value)))
const peopleOrder = computed(() => [...roster.value].sort((a, b) => (a.hand || Infinity) - (b.hand || Infinity)))
const muteRequest = computed(() => local.value?.mic && workspace.value?.muteRequestedAt && workspace.value.muteRequestedAt !== dismissedMute.value)
const remoteAudio = computed(() => {
  void revision.value
  return [...(activeRoom?.remoteParticipants.values() || [])].flatMap(participant =>
    [Track.Source.Microphone, Track.Source.ScreenShareAudio].flatMap(source => {
      const track = media(participant, source)
      return track ? [{ id: participant.identity + source, track }] : []
    }))
})

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

async function syncWorkspace() {
  if (!meeting.value || syncing) return
  const current = generation
  syncing = true
  try {
    let newest = messages.value.at(-1)?.id || 0
    let hasMore: boolean
    do {
      const state = await interviewVideoApi.state(roomId.value, newest)
      if (current !== generation || !meeting.value) return
      const previouslySynced = Boolean(workspace.value)
      workspace.value = state
      Object.assign(meeting.value, { status: state.status, participants: state.participants, startsAt: state.startsAt, endsAt: state.endsAt })
      if (state.removed) { messages.value = []; profile.value = undefined }
      if (state.messages.length) {
        messages.value.push(...state.messages)
        if (panel.value !== 'chat' && previouslySynced) unread.value += state.messages.filter(item => item.senderId !== auth.user?.id).length
        newest = state.messages.at(-1)!.id
      }
      hasMore = state.hasMore
      if (closed.value) {
        stopPreview()
        if (activeRoom) disconnect()
        interrupted.value = false
      }
    } while (hasMore)
  } catch { /* 重连后按消息 ID 补读 */ }
  finally { if (current === generation) syncing = false }
}

async function runAction(action: () => Promise<unknown>) {
  problem.value = ''
  try { await action(); await syncWorkspace() }
  catch (error) { problem.value = message(error, '操作失败，请重试。') }
}
const requestWaiting = (action: 'request' | 'cancel') => runAction(() => interviewVideoApi.waiting(roomId.value, action))
const enableRecording = () => runAction(() => interviewVideoApi.enableRecording(roomId.value))
const stopRecording = () => runAction(() => interviewVideoApi.stopRecording(roomId.value))
function recordConsent(accept: boolean) {
  const version = recording.value?.policy?.version
  if (version) return runAction(() => interviewVideoApi.recordingConsent(roomId.value, accept, version))
}
function consentToAi(accepted: boolean) {
  const key = workspace.value?.aiConsent?.key
  if (key) return runAction(() => interviewVideoApi.aiConsent(roomId.value, key, accepted))
}
const decide = (identity: string, approve: boolean) => runAction(() => interviewVideoApi.decide(roomId.value, identity, approve))
const lock = () => runAction(() => interviewVideoApi.lock(roomId.value, !workspace.value?.locked))
const raiseHand = () => runAction(() => interviewVideoApi.hand(roomId.value, !local.value?.hand))
function openChat() { panel.value = 'chat'; unread.value = 0 }
async function openProfile() {
  panel.value = 'profile'
  const current = generation
  try {
    const data = await interviewVideoApi.profile(roomId.value)
    if (current === generation && !workspace.value?.removed) profile.value = data
  } catch (error) { if (current === generation) problem.value = message(error, '无法加载学生资料') }
}
async function downloadResume() {
  const name = profile.value?.resume?.name
  if (!name) return
  await runAction(async () => {
    const response = await interviewVideoApi.resume(roomId.value)
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
}
async function moderate(identity: string, action: 'request-mute' | 'remove') {
  let reason: string | undefined
  if (action === 'remove') {
    try {
      reason = (await ElMessageBox.prompt('请填写移除原因', '移出参会人员', { inputPattern: /^\s*\S[\s\S]{0,199}$/, inputErrorMessage: '请输入 1–200 个字符' })).value
    } catch { return }
  }
  await runAction(() => interviewVideoApi.moderate(roomId.value, identity, action, reason))
}
async function respondToMute(mute: boolean) {
  dismissedMute.value = workspace.value?.muteRequestedAt ?? null
  if (mute && activeRoom?.localParticipant.isMicrophoneEnabled) await toggle('microphone')
}
async function send() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  const current = generation
  retryMessage = retryMessage?.content === content ? retryMessage : { id: crypto.randomUUID(), content }
  sending.value = true
  const outgoing = retryMessage
  try {
    await interviewVideoApi.send(roomId.value, outgoing.id, content)
    if (current !== generation) return
    if (draft.value.trim() === content) draft.value = ''
    retryMessage = undefined
    await syncWorkspace()
  } catch (error) { if (current === generation) problem.value = message(error, '发送失败，可重试') }
  finally { if (current === generation) sending.value = false }
}

async function openDevices() {
  try {
    deviceOptions.value = await Room.getLocalDevices(undefined, false)
    for (const device of deviceKinds) deviceSelection[device.kind] = activeRoom?.getActiveDevice(device.kind)
    deviceDialog.value = true
  } catch (error) { problem.value = deviceMessage(error, '音视频设备') }
}
async function selectDevice(kind: MediaDeviceKind, value: string) {
  try {
    if (await activeRoom?.switchActiveDevice(kind, value)) deviceSelection[kind] = value
    else problem.value = '设备切换失败，请检查设备连接。'
  } catch (error) { problem.value = deviceMessage(error, '音视频设备') }
}
// 全屏作用在会议页根元素上而不是 <html>：这样 .meeting:fullscreen 能接管布局，
// 全屏时视频区真正铺满、控制栏贴底，用户一眼就能看出「已进入全屏」。
// 之前对 documentElement 请求全屏，页面布局几乎不变，看起来就像没生效。
function fullscreenElement(): Element | null {
  const doc = document as FullscreenDocument
  return doc.fullscreenElement || doc.webkitFullscreenElement || null
}
function syncFullscreen() { isFullscreen.value = Boolean(fullscreenElement()) }
function fullscreenError() { problem.value = '无法切换全屏，可按 F11 使用浏览器全屏。' }
async function fullscreen() {
  const doc = document as FullscreenDocument
  const target = meetingEl.value as FullscreenElement | undefined
  problem.value = ''
  try {
    if (fullscreenElement()) {
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      return
    }
    if (!target) return
    if (target.requestFullscreen) await target.requestFullscreen()
    else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen()
    else { problem.value = '当前浏览器不支持网页全屏，可按 F11 使用浏览器全屏。'; return }
    // 少数环境（内嵌 WebView、被窗口策略拦截）会静默不进入全屏，这里补一次状态确认。
    syncFullscreen()
    if (!fullscreenElement()) problem.value = '浏览器未能进入全屏，可按 F11 使用浏览器全屏。'
  } catch {
    problem.value = '浏览器拒绝了全屏请求（部分内嵌窗口不支持），可按 F11 使用浏览器全屏。'
  }
}

function deviceMessage(error: unknown, device: string) {
  const name = error instanceof Error ? error.name : ''
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(name)) {
    return `${device}未获授权，请在浏览器站点权限中允许访问后重试。`
  }
  if (name === 'NotFoundError') return `未找到可用的${device}，请检查设备连接。`
  if (name === 'NotReadableError') return `${device}可能正在被其他应用占用。`
  return `无法启用${device}，请检查浏览器是否支持并使用 HTTPS 或 localhost。`
}

function stopMeter() {
  cancelAnimationFrame(meterFrame)
  if (context) void context.close().catch(() => {})
  context = undefined
  micLevel.value = 0
}

function startMeter(track: LocalAudioTrack) {
  const audio = new AudioContext()
  context = audio
  void audio.resume().catch(() => {})
  const analyser = audio.createAnalyser()
  audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])).connect(analyser)
  const frame = new Uint8Array(analyser.fftSize)
  const read = () => {
    analyser.getByteTimeDomainData(frame)
    let power = 0
    for (const sample of frame) power += ((sample - 128) / 128) ** 2
    micLevel.value = Math.min(1, Math.sqrt(power / frame.length) * 4)
    meterFrame = requestAnimationFrame(read)
  }
  read()
}

function stopPreview() {
  stopMeter()
  previewCamera.value?.stop()
  previewMic.value?.stop()
  previewCamera.value = undefined
  previewMic.value = undefined
}

async function testDevice(device: 'camera' | 'microphone') {
  problem.value = ''
  const current = generation
  deviceBusy.value = true
  try {
    if (device === 'camera') {
      if (previewCamera.value) {
        previewCamera.value.stop()
        previewCamera.value = undefined
        return
      }
      const track = await createLocalVideoTrack()
      if (current !== generation || closed.value) track.stop()
      else previewCamera.value = track
    } else {
      if (previewMic.value) {
        stopMeter()
        previewMic.value.stop()
        previewMic.value = undefined
        return
      }
      const track = await createLocalAudioTrack()
      if (current !== generation || closed.value) track.stop()
      else {
        previewMic.value = track
        if (typeof AudioContext !== 'undefined') startMeter(track)
      }
    }
  } catch (error) {
    if (current === generation) problem.value = deviceMessage(error, device === 'camera' ? '摄像头' : '麦克风')
  } finally { if (current === generation) deviceBusy.value = false }
}

function disconnect() {
  const room = activeRoom
  activeRoom = undefined
  connection.value = ConnectionState.Disconnected
  revision.value++
  audioBlocked.value = false
  if (room) void room.disconnect().catch(() => {})
}

async function load(explicit = false) {
  if (refreshing) return
  const current = generation
  refreshing = true
  if (explicit) problem.value = ''
  try {
    const details = await interviewVideoApi.details(roomId.value)
    if (current !== generation) return
    meeting.value = details
    void syncWorkspace()
    if (closed.value) {
      stopPreview()
      disconnect()
      interrupted.value = false
    }
  } catch (error) {
    if (current === generation && (explicit || !meeting.value)) problem.value = message(error, '无法读取会议状态，请稍后重试。')
  } finally {
    if (current === generation) {
      refreshing = false
      loading.value = false
    }
  }
}

// 直接发布 lobby 已创建好的轨道，跳过 setXxxEnabled 内部的 createTracks。
// 轨道已结束或发布失败时释放它并回退到常规开启路径。
async function adopt(track: LocalVideoTrack | LocalAudioTrack, device: 'camera' | 'microphone') {
  const room = activeRoom
  if (room && track.mediaStreamTrack.readyState === 'live') {
    try {
      await room.localParticipant.publishTrack(track, {
        source: device === 'camera' ? Track.Source.Camera : Track.Source.Microphone
      })
      if (room === activeRoom) revision.value++
      return
    } catch { /* 回退到常规开启路径 */ }
  }
  track.stop()
  if (room === activeRoom) await toggle(device)
}

async function join() {
  const current = generation
  // 交接 lobby 已测试好的轨道：入会后直接发布它们，省掉重新 getUserMedia 的几百毫秒，
  // 这也是「测完设备点加入，麦克风却还要等一下才开」的原因。先摘出引用，避免被 stopPreview 销毁。
  const carriedCamera = previewCamera.value
  const carriedMicrophone = previewMic.value
  previewCamera.value = undefined
  previewMic.value = undefined
  const start = meeting.value?.status === 'WAITING' && meeting.value.role === 'HOST'
  joining.value = true
  problem.value = ''
  interrupted.value = false
  // 轨道交接出去之前，任何失败路径都要释放它们，否则摄像头/麦克风会一直占用。
  let handedOver = false
  try {
    const credentials = await interviewVideoApi.token(roomId.value, start)
    if (current !== generation || closed.value) return
    stopPreview()
    const room = new Room({ adaptiveStream: true, dynacast: true })
    activeRoom = room
    const sync = () => {
      if (room !== activeRoom) return
      connection.value = room.state
      audioBlocked.value = !room.canPlaybackAudio
      revision.value++
    }
    for (const event of [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
      RoomEvent.TrackPublished, RoomEvent.TrackUnpublished, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished,
      RoomEvent.ConnectionStateChanged, RoomEvent.ActiveSpeakersChanged, RoomEvent.AudioPlaybackStatusChanged] as const) room.on(event, sync)
    room.on(RoomEvent.DataReceived, (_data, sender, _kind, topic) => {
      if (room === activeRoom && !sender && topic === 'lab-match-state') void syncWorkspace()
    })
    room.on(RoomEvent.Disconnected, () => {
      if (room !== activeRoom) return
      disconnect()
      interrupted.value = !closed.value
      void load()
    })
    room.on(RoomEvent.MediaDevicesError, error => {
      if (room === activeRoom) problem.value = deviceMessage(error, '音视频设备')
    })
    // 显式限制连接超时：默认 websocketTimeout/peerConnectionTimeout 各 15s，
    // 遇到代理黑洞（TCP 通了但 TLS 握手卡住）时若不设上限，connect 会一直挂起、按钮无限转圈。
    await room.connect(credentials.url, credentials.token, {
      websocketTimeout: 12000,
      peerConnectionTimeout: 15000,
      maxRetries: 0
    })
    if (room !== activeRoom) return
    sync()
    void load()
    handedOver = true
    if (carriedCamera) await adopt(carriedCamera, 'camera')
    if (carriedMicrophone && room === activeRoom) await adopt(carriedMicrophone, 'microphone')
  } catch (error) {
    if (current !== generation) return
    disconnect()
    problem.value = message(error, '无法连接视频会议。请确认网络可访问视频会议服务（若开启了代理，请放行 livekit.cloud），再重试。')
    void load()
  } finally {
    if (!handedOver) { carriedCamera?.stop(); carriedMicrophone?.stop() }
    if (current === generation) joining.value = false
  }
}

async function toggle(device: 'camera' | 'microphone' | 'screen') {
  const room = activeRoom
  if (!room || pendingDevice.value) return
  const participant = room.localParticipant
  pendingDevice.value = device
  problem.value = ''
  try {
    // LiveKit 对已存在的轨道走 mute/unmute，只有第一次开启才需要 getUserMedia。
    // 这里不再用全局 deviceBusy 卡住整条工具栏，点击后按钮立刻进入 loading，
    // 另外两个按钮仍可点，交互才跟手。
    if (device === 'camera') await participant.setCameraEnabled(!participant.isCameraEnabled)
    if (device === 'microphone') await participant.setMicrophoneEnabled(!participant.isMicrophoneEnabled)
    if (device === 'screen') {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        problem.value = '此浏览器不支持屏幕共享，请使用桌面版浏览器。'
        return
      }
      await participant.setScreenShareEnabled(!participant.isScreenShareEnabled)
    }
  } catch (error) {
    if (room !== activeRoom) return
    problem.value = device === 'screen' ? '未能共享屏幕。请在浏览器弹窗中选择窗口或屏幕后重试。' :
      deviceMessage(error, device === 'camera' ? '摄像头' : '麦克风')
  } finally {
    if (room === activeRoom) revision.value++
    pendingDevice.value = ''
  }
}

async function enableAudio() {
  try { await activeRoom?.startAudio() }
  catch { problem.value = '无法播放会议声音，请检查浏览器声音权限。' }
}

function leave() {
  disconnect()
  void router.push(returnPath.value)
}

async function end() {
  const id = roomId.value
  const state = recording.value?.state
  // 结束后档案页的录像列会按真实状态显示「未录制」，这里先讲清楚原因，
  // 免得主持人以为录了、结果档案里什么都没有。
  const videoNote = !state || state === 'NONE' ? '本场没有启用录制，结束后不会生成录像。'
    : state === 'FAILED' ? '本场录制失败，结束后没有可播放的录像。'
    : state === 'WAITING' ? '录制还在等待全部在场人员同意，现在结束不会产生录像。'
    : '录制会在会议结束后自动保存并处理。'
  try { await ElMessageBox.confirm(`所有参会人员将离开会议。${videoNote}`, '结束本场面试', { confirmButtonText: '结束会议', cancelButtonText: '继续面试', type: 'warning' }) }
  catch { return }
  if (id !== roomId.value) return
  ending.value = true
  try {
    const ended = await interviewVideoApi.end(id)
    if (id !== roomId.value) return
    if (meeting.value) meeting.value = { ...meeting.value, ...ended }
    disconnect()
  } catch (error) { problem.value = message(error, '结束会议失败，请重试。') }
  finally { ending.value = false }
}

watch(roomId, (_id, _old, onCleanup) => {
  meeting.value = undefined
  workspace.value = profile.value = undefined
  messages.value = []
  draft.value = pinned.value = ''
  panel.value = 'people'
  unread.value = 0
  dismissedMute.value = null
  retryMessage = undefined
  problem.value = ''
  loading.value = true
  refreshing = syncing = sending.value = joining.value = deviceBusy.value = interrupted.value = false
  pendingDevice.value = ''
  void load(true)
  const timer = window.setInterval(() => {
    time.value = Date.now()
    if (meeting.value && !closed.value) void syncWorkspace()
  }, 1000)
  onCleanup(() => {
    generation++
    window.clearInterval(timer)
    disconnect()
    stopPreview()
  })
}, { immediate: true })
onMounted(() => {
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, syncFullscreen)
  document.addEventListener('fullscreenerror', fullscreenError)
  syncFullscreen()
})
onBeforeUnmount(() => {
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.removeEventListener(event, syncFullscreen)
  document.removeEventListener('fullscreenerror', fullscreenError)
  disconnect()
  stopPreview()
})
</script>

<style scoped>
.meeting { --el-color-primary: #a63f24; --el-color-primary-light-3: #bd6651; --el-color-primary-dark-2: #823119; min-height: 100dvh; display: grid; align-content: start; gap: 20px; padding: clamp(18px, 4vw, 58px) max(18px, calc((100vw - 1380px) / 2)); color: #2b211e; background: radial-gradient(ellipse at 85% 0%, #f8e7dc, transparent 58%), #faf6f0; }
.meeting-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.meeting-header h1 { font-size: clamp(25px, 4vw, 38px); margin: 10px 0 4px; }
.meeting-header p, .hint { color: #6d5b52; margin: 0; }
.back { color: #a63f24; font-weight: 650; }
.lobby, .people, .toolbar { background-color: rgba(255, 253, 249, 0.62); border: 0; border-radius: 20px; -webkit-backdrop-filter: blur(10px) saturate(160%); backdrop-filter: blur(10px) saturate(160%); box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 12px 30px -20px rgba(58,41,28,.3); }
.lobby { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 4fr); gap: clamp(18px, 4vw, 44px); padding: clamp(16px, 4vw, 36px); }
.lobby-details:only-child { grid-column: 1 / -1; }
.lobby-details h2, .people h2 { margin: 0 0 10px; }
.lobby-details p { margin: 0 0 16px; color: #6d5b52; overflow-wrap: anywhere; white-space: pre-wrap; }
.lobby-details h3 { margin-top: 24px; font-size: 14px; }
.invitees, .people ul { list-style: none; padding: 0; margin: 0 0 20px; }
.invitees li, .people li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid #eee3db; overflow-wrap: anywhere; }
.invitees span, .people small { color: #6d5b52; }
.primary-action { min-width: 150px; }
.preview, .tile { display: grid; place-items: center; position: relative; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: #2e2524; color: #fff2eb; }
.preview video, .tile video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.preview video { transform: scaleX(-1); }
.preview-label { display: grid; justify-items: center; gap: 8px; }
.preview-label .el-icon { font-size: 34px; }
.device-controls, .toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
.device-controls { margin: 12px 0; }
.device-controls :deep(.el-button + .el-button), .toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.hint, .meter { font-size: 13px; }
.meter { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; }
.call-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
.call-layout.panel-open { grid-template-columns: minmax(0, 1fr) minmax(260px, 330px); }
.header-status { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-variant-numeric: tabular-nums; }
.recording-notice { padding: 12px 18px; background: rgba(255, 253, 249, 0.66); border: 0; border-radius: 14px; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: inset 0 1px 0 rgba(255,255,255,.9); }
.recording-notice p { white-space: pre-wrap; margin: 8px 0; overflow-wrap: anywhere; }
.recording-notice summary { cursor: pointer; }
.panel-nav { display: flex; flex-wrap: wrap; margin-bottom: 16px; border-bottom: 1px solid #eee3db; }
.panel-nav :deep(.el-button) { margin: 0; padding: 6px 9px; }
.people .person { display: grid; gap: 3px; justify-content: stretch; }
.people .person strong { overflow-wrap: anywhere; }
.profile dt { color: #6d5b52; margin-top: 12px; }
.profile dd { margin: 3px 0 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.participant-tile { width: 100%; border: 2px solid transparent; cursor: pointer; }
.participant-tile:hover { border-color: #dca78c; }
.participant-tile.speaking { border-color: #ff995d; }
.participant-tile.featured { grid-column: 1 / -1; max-height: 59dvh; }
.participant-tile.featured video { object-fit: contain; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; }
.screen-tile { grid-column: 1 / -1; max-height: 58vh; width: 100%; }
.screen-tile video { object-fit: contain; }
.avatar { display: grid; place-items: center; width: 58px; aspect-ratio: 1; border: 1px solid #dca78c; border-radius: 50%; background: #fae6d9; color: #8b3f26; font-weight: 700; font-size: 25px; }
.tile-caption { position: absolute; bottom: 10px; left: 10px; max-width: calc(100% - 20px); padding: 4px 9px; border-radius: 6px; background: #211715e8; color: white; font-size: 13px; overflow-wrap: anywhere; }
.people { padding: 16px; }.people h2 { font-size: 16px; }.people h2 span { color: #a63f24; margin-left: 5px; }
.people ul { margin-bottom: 0; }.people li:last-child { border: 0; }
.toolbar { padding: 12px; justify-content: center; }
.remote-audio { display: none; }.loading-panel { min-height: 180px; }
.meeting :deep(a:focus-visible), .meeting :deep(button:focus-visible) { outline: 2px solid #a63f24; outline-offset: 3px; }
/* 全屏：整页改成 100dvh 的竖向布局，视频区吃掉剩余高度、控制栏贴底。
   以前全屏作用于 <html>，页面留白和网格几乎没变，看起来像「没进全屏」；
   现在由会议页自己接管布局，全屏前后差异一眼可辨。 */
.meeting:fullscreen {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100dvh;
  padding: 0;
  overflow: hidden;
}
.meeting:fullscreen .meeting-header { padding: 10px 20px; }
.meeting:fullscreen .meeting-header h1 { font-size: 20px; margin: 4px 0 2px; }
.meeting:fullscreen .meeting-header .back { display: none; }
.meeting:fullscreen .call-layout { flex: 1; min-height: 0; gap: 10px; padding: 10px 16px; }
.meeting:fullscreen .tiles { height: 100%; min-height: 0; overflow-y: auto; }
.meeting:fullscreen .participant-tile.featured { max-height: calc(100dvh - 156px); }
.meeting:fullscreen .screen-tile { max-height: calc(100dvh - 156px); }
.meeting:fullscreen .people { max-height: 100%; overflow-y: auto; }
.meeting:fullscreen .toolbar { flex: none; border-radius: 0; padding: 10px 16px; }
@media (max-width: 760px) { .lobby, .call-layout.panel-open { grid-template-columns: minmax(0, 1fr); } .people { order: 1; } }
</style>
