import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { stages } from '@/config/stages'
import { useAuthStore } from './auth'
import { announcements, labs } from '@/views/student/studentDemo'
import type { StudentResume } from '@/api/studentMvp'

export interface Preferences {
  labIds: number[]
  internal: boolean | null
  college: boolean | null
}

interface Decision {
  labId: number
  stage: number
  accepted: boolean
  time: number
}

interface StudentData {
  anchor: number
  clockOffset: number
  draft: Preferences
  receipt: (Preferences & { submittedAt: number }) | null
  decisions: Decision[]
  read: string[]
  phone: string
  resume?: StudentResume
}

const DAY = 86_400_000
const defaultData = (): StudentData => ({
  // UTC midnight is 08:00 in Beijing.
  anchor: Math.floor(Date.now() / DAY) * DAY - 2 * DAY,
  clockOffset: 0,
  draft: { labIds: [], internal: null, college: null },
  receipt: null,
  decisions: [],
  read: [],
  phone: ''
})

export const useStudentStore = defineStore('student', () => {
  const auth = useAuthStore()
  const storageKey = computed(() => auth.user?.username
    ? 'lm_student_demo_v1:' + encodeURIComponent(auth.user.username) : '')
  const data = ref(defaultData())
  const now = ref(Date.now())
  watch(storageKey, (key) => {
    const saved = key && localStorage.getItem(key)
    try {
      data.value = saved ? JSON.parse(saved) as StudentData : defaultData()
    } catch {
      data.value = defaultData()
    }
  }, { immediate: true, flush: 'sync' })

  function save() {
    if (storageKey.value) localStorage.setItem(storageKey.value, JSON.stringify(data.value))
  }

  function updateClock() {
    now.value = Date.now() + data.value.clockOffset
  }

  const timeline = computed(() => stages.map(stage => ({
    ...stage,
    start: data.value.anchor + (stage.no - 1) * DAY,
    end: data.value.anchor + stage.no * DAY
  })))
  const current = computed(() => timeline.value.find(stage => stage.start <= now.value && now.value < stage.end))
  const currentNumber = computed(() => current.value?.no ?? 9)
  const receipt = computed(() => data.value.receipt)
  const confirmed = computed(() => data.value.decisions.find(decision => decision.accepted))
  const offerIds = computed(() => {
    if (currentNumber.value < 5) return []
    return receipt.value?.labIds.filter(id => id === 1 || id === 2) ?? []
  })
  const notices = computed(() => [
    ...announcements.filter(item => item.stage <= currentNumber.value),
    ...[
      { id: 'internal', stage: 6, title: '内部调剂阶段已开启', content: '请在分轮补录页查看本人通知。' },
      { id: 'college', stage: 7, title: '学院统筹调剂阶段已开启', content: '请在调剂通知页查看本人结果。' },
      { id: 'publication', stage: 8, title: '最终录取结果已公布', content: '请在最终结果页查看个人去向及入组安排。' }
    ].filter(item => item.stage <= currentNumber.value),
    ...(currentNumber.value >= 4 && receipt.value
      ? [{ id: 'interviews', stage: 4, title: '面试安排已发布', content: '请到面试中心查看所填报实训室的面试安排。' }]
      : []),
    ...(offerIds.value.length
      ? [{ id: 'offers', stage: 5, title: '拟录取通知已发布', content: '请在确认截止前查看拟录取结果。' }]
      : [])
  ].sort((left, right) => right.stage - left.stage))

  function previewStage(stage: number) {
    data.value.clockOffset = data.value.anchor + (stage - 1) * DAY - Date.now()
    updateClock()
    save()
    settleSingleOffer()
  }

  function submitPreferences(): string | undefined {
    updateClock()
    const { labIds, internal, college } = data.value.draft
    if (currentNumber.value !== 3) return '当前不在志愿填报窗口。'
    if (data.value.decisions.length) return '本演示账号已有录取或调剂记录，原志愿已锁定。'
    if (labIds.length < 1 || labIds.length > 3 || new Set(labIds).size !== labIds.length ||
      labIds.some(id => !labs.some(lab => lab.id === id))) return '请选择一至三个不同的实训室。'
    if (internal === null || college === null) return '请分别选择两项调剂意愿。'
    data.value.receipt = { labIds: [...labIds].sort((a, b) => a - b), internal, college, submittedAt: now.value }
    save()
  }

  function decisionFor(stage: number) {
    return data.value.decisions.find(decision => decision.stage === stage)
  }

  function adjustmentLab(stage: number) {
    if (stage === 6 && receipt.value?.internal) return receipt.value.labIds.find(id => id === 1 || id === 2 || id === 3)
    if (stage === 7 && receipt.value?.college) return 4
    return undefined
  }

  function decide(stage: number, labId: number, accepted: boolean): string | undefined {
    updateClock()
    if (currentNumber.value !== stage) return '确认窗口已关闭。'
    if (confirmed.value || decisionFor(stage)) return '已处理录取或调剂，请查看确认结果。'
    const valid = stage === 5 ? offerIds.value.some(id => id === labId) : adjustmentLab(stage) === labId
    if (!valid) return '该实训室没有可确认的通知。'
    data.value.decisions.push({ stage, labId, accepted, time: now.value })
    save()
  }

  function settleSingleOffer() {
    if (offerIds.value.length === 1 && !confirmed.value) {
      data.value.decisions.push({ stage: 5, labId: offerIds.value[0], accepted: true, time: timeline.value[4].start })
      save()
    }
  }

  function markRead(ids: string[]) {
    data.value.read = [...new Set([...data.value.read, ...ids])]
    save()
  }

  return {
    data, current, currentNumber, timeline, receipt, confirmed, offerIds, notices, updateClock,
    previewStage, save, submitPreferences, decisionFor, adjustmentLab, decide, settleSingleOffer, markRead
  }
})
