import { defineStore } from 'pinia'
import { useLogsStore } from '@/stores/logs'
import { useNotificationsStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'trs_time_requests_v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 时间点变更申请（组长端 → 学院端）。
 * 本轮不做“改时间”能力，只把申请单发给学院；学院审批后由后端修改阶段时间。
 * 对应预留接口：POST /api/admin/stage-change-requests
 */
export const useTimeRequestsStore = defineStore('timeRequests', {
  state: () => load() || { entries: [] },
  getters: {
    pending: (s) => s.entries.filter((e) => e.status === 'PENDING'),
    sorted: (s) => [...s.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    forLab: (s) => (labId) => s.sorted.filter((e) => Number(e.labId) === Number(labId))
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: this.entries }))
    },
    create({ stageNo, proposedStart, proposedEnd, reason }) {
      if (!stageNo || !proposedStart || !proposedEnd || !reason?.trim()) return false
      let labId = 0
      let requester = ''
      try {
        const auth = useAuthStore()
        labId = auth.laboratoryId
        requester = auth.realName
      } catch {
        /* ignore */
      }
      if (
        this.entries.some(
          (e) =>
            e.status === 'PENDING' &&
            Number(e.stageNo) === Number(stageNo) &&
            Number(e.labId) === Number(labId)
        )
      ) {
        return false
      }
      this.entries.unshift({
        id: `tr-${Date.now()}`,
        labId,
        requester,
        stageNo,
        proposedStart,
        proposedEnd,
        reason: reason.trim(),
        status: 'PENDING',
        reviewedAt: '',
        reviewReason: '',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      })
      this.persist()
      useLogsStore().record('STAGE_CHANGE_REQUEST', `提交第 ${stageNo} 阶段时间变更申请`, 'STAGE')
      useNotificationsStore().push({
        type: 'STAGE_CHANGE_REQUEST',
        title: '时间变更申请已提交',
        content: `第 ${stageNo} 阶段：${proposedStart} ~ ${proposedEnd}`,
        link: '/teacher/room/time-requests'
      })
      return true
    },
    review(id, action, reason = '') {
      const row = this.entries.find((e) => e.id === id)
      if (!row || row.status !== 'PENDING') return false
      if (action === 'reject' && !reason?.trim()) return false
      row.status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      row.reviewedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      row.reviewReason = reason.trim()
      this.persist()
      useLogsStore().record(
        'STAGE_CHANGE_REQUEST',
        action === 'approve' ? `学院同意第 ${row.stageNo} 阶段时间变更` : `学院退回第 ${row.stageNo} 阶段时间变更`,
        'STAGE'
      )
      useNotificationsStore().push({
        type: 'STAGE_CHANGE_REQUEST',
        title: action === 'approve' ? '时间变更申请已通过' : '时间变更申请被退回',
        content: `第 ${row.stageNo} 阶段${row.reviewReason ? `：${row.reviewReason}` : ''}`,
        audience: { labId: row.labId, role: 'LAB_LEADER' },
        link: '/teacher/room/time-requests'
      })
      return true
    },

    clear() {
      this.entries = []
      localStorage.removeItem(STORAGE_KEY)
    }
  }
})
