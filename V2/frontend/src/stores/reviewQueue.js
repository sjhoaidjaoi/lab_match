import { defineStore } from 'pinia'
import { labs } from '@/mock/labs'

const storageKey = (labId) => `trs_submission_state_v2:${labId}`

/**
 * 学院审核演示队列：扫描各实训室的提交快照，找出 REVIEWING 的记录。
 * 真实实现对应 GET /api/admin/submissions?status=REVIEWING。
 */
export const useReviewQueueStore = defineStore('reviewQueue', {
  state: () => ({ tick: 0 }),
  getters: {
    pending(state) {
      // tick 只用于触发重新计算（localStorage 不是响应式的）
      void state.tick
      return labs
        .map((lab) => {
          try {
            const raw = localStorage.getItem(storageKey(lab.id))
            if (!raw) return null
            const saved = JSON.parse(raw)
            if (saved.status !== 'REVIEWING') return null
            return {
              labId: lab.id,
              labName: lab.name,
              submittedAt: saved.submittedAt,
              counts: saved.payload?.counts || {},
              payload: saved.payload,
              timeline: saved.timeline || []
            }
          } catch {
            return null
          }
        })
        .filter(Boolean)
    },
    count() {
      return this.pending.length
    }
  },
  actions: {
    refresh() {
      this.tick += 1
    }
  }
})
