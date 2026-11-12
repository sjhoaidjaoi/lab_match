import { defineStore } from 'pinia'
import { useLogsStore } from '@/stores/logs'
import { useNotificationsStore } from '@/stores/notifications'

const storageKey = (labId) => `trs_submission_state_v2:${labId}`
const currentLabId = () => Number(localStorage.getItem('trs_lab') || 1)

const SEED_TIMELINE = [
  { time: '2026-11-03 17:00', title: '面试评价完成（14/18）', type: 'success' },
  { time: '2026-11-04 10:00', title: '拟录取名单与递补顺位已确定', type: 'success' },
  { time: '2026-11-05 15:00', title: '内部调剂方案已生成（补录 2 人）', type: 'success' }
]

function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function load(labId) {
  try {
    const raw = localStorage.getItem(storageKey(labId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function initialState(labId = currentLabId()) {
  const saved = load(labId)
  if (saved && saved.status) return saved
  return {
    labId,
    status: 'DRAFT',
    submittedAt: '',
    reviewedAt: '',
    reviewer: '学院教学办',
    rejectReason: '',
    payload: null,
    timeline: [...SEED_TIMELINE]
  }
}

/**
 * 本室提交学院审核的状态机（只负责「本室名单是否锁定」，不负责学院端跨室事务）
 *
 *   DRAFT ──提交──> REVIEWING ──通过──> APPROVED
 *     ^                 │
 *     └─────退回─────────┘ (REJECTED 可修改后重新提交)
 */
export const useSubmissionStore = defineStore('submission', {
  state: () => initialState(),
  getters: {
    isDraft: (s) => s.status === 'DRAFT',
    // 待审核与已通过时，本室拟录取 / 调剂 / 名单全部只读
    isLocked: (s) => s.status === 'REVIEWING' || s.status === 'APPROVED',
    // 草稿与被退回都可提交（退回属于「可修改后重新提交」）
    canSubmit: (s) => s.status === 'DRAFT' || s.status === 'REJECTED',
    statusLabel: (s) =>
      ({ DRAFT: '草稿', REVIEWING: '待学院审核', APPROVED: '审核通过', REJECTED: '已退回' }[s.status] || s.status)
  },
  actions: {
    persist() {
      localStorage.setItem(
        storageKey(this.labId),
        JSON.stringify({
          labId: this.labId,
          status: this.status,
          submittedAt: this.submittedAt,
          reviewedAt: this.reviewedAt,
          reviewer: this.reviewer,
          rejectReason: this.rejectReason,
          payload: this.payload,
          timeline: this.timeline
        })
      )
    },
    submit(room) {
      if (!this.canSubmit) return false
      this.status = 'REVIEWING'
      this.submittedAt = now()
      this.rejectReason = ''
      // 提交快照：后端接入后直接作为请求体，前端不再各自拼装
      this.payload = room
        ? {
            labId: room.labId,
            quota: room.quota,
            counts: {
              intended: room.intendedCount,
              alternate: room.alternates.length,
              adjustment: room.selectedCount,
              confirmed: room.confirmedCount,
              vacancy: room.vacancies
            },
            intended: room.intended.map((x) => ({
              studentId: x.studentId,
              studentNumber: x.studentNumber,
              realName: x.realName,
              total: x.total,
              confirmed: x.confirmed
            })),
            alternate: room.alternates.map((x) => ({
              studentId: x.studentId,
              orderNo: x.orderNo,
              studentNumber: x.studentNumber,
              realName: x.realName,
              total: x.total
            })),
            adjustments: room.selectedCandidates.map((x) => ({
              studentId: x.studentId,
              studentNumber: x.studentNumber,
              realName: x.realName,
              reason: x.reason
            })),
            vacancyHandover: {
              count: Math.max(room.vacancies, 0),
              note: '本室无法填满的名额移交学院统筹'
            },
            submittedAt: now()
          }
        : null
      if (room?.recordHandover) room.recordHandover()
      const summary = room
        ? `拟录取 ${room.intendedCount} 人、递补 ${room.alternates.length} 人、内部调剂 ${room.selectedCount} 人`
        : '本室名单与调剂结果'
      this.timeline.push({ time: this.submittedAt, title: '组长提交学院审核', desc: summary, type: 'primary' })
      this.persist()
      useLogsStore().record('SUBMIT', `提交学院审核：${summary}`, 'SUBMISSION')
      return true
    },
    /**
     * 学院审核（演示台调用）。
     * 直接按 labId 读写该实训室的提交快照，因此可以审核非当前实训室的提交。
     */
    review(labId, action, reason = '') {
      const id = Number(labId)
      const raw = localStorage.getItem(storageKey(id))
      const saved = raw ? JSON.parse(raw) : null
      if (!saved || saved.status !== 'REVIEWING') return false
      if (action === 'reject' && !reason?.trim()) return false

      const time = now()
      saved.status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      saved.reviewedAt = time
      if (action === 'reject') saved.rejectReason = reason.trim()
      saved.timeline = [
        ...(saved.timeline || []),
        {
          time,
          title: action === 'approve' ? '学院审核通过，本次选拔结果进入公示' : '学院退回，需修改后重新提交',
          desc: action === 'reject' ? reason.trim() : '',
          type: action === 'approve' ? 'success' : 'danger'
        }
      ]
      localStorage.setItem(storageKey(id), JSON.stringify(saved))
      if (this.labId === id) Object.assign(this, saved)

      useLogsStore().record(
        action === 'approve' ? 'REVIEW_APPROVE' : 'REVIEW_REJECT',
        action === 'approve' ? '学院审核通过' : `学院退回：${reason.trim()}`,
        'SUBMISSION'
      )
      useNotificationsStore().push({
        type: action === 'approve' ? 'REVIEW_APPROVE' : 'REVIEW_REJECT',
        title: action === 'approve' ? '学院审核通过' : '学院退回：名单需修改',
        content: action === 'approve' ? '本室结果已进入公示流程' : reason.trim(),
        audience: { labId: id, role: 'LAB_LEADER' },
        link: '/teacher/room/submit'
      })
      return true
    },

    approve() {
      return this.review(this.labId, 'approve')
    },

    reject(reason) {
      return this.review(this.labId, 'reject', reason)
    },

    // 从存储重新加载当前实训室的提交状态（跨页面审核后刷新用）
    refresh() {
      const saved = load(this.labId)
      if (saved) Object.assign(this, saved)
      return Boolean(saved)
    },
    switchLab(labId) {
      const id = Number(labId)
      if (id === this.labId) return false
      this.persist()
      Object.assign(this, load(id) || initialState(id))
      return true
    },

    reset() {
      const id = this.labId
      // 先清存储再取初始态，避免把已提交状态又读回来
      localStorage.removeItem(storageKey(id))
      Object.assign(this, initialState(id))
      this.payload = null
    }
  }
})
