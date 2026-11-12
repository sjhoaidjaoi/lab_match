import { defineStore } from 'pinia'
import { stages, DEMO_STAGE_NO } from '@/mock/stages'
import { useClockStore } from '@/stores/clock'
import { useInterviewsStore } from '@/stores/interviews'
import { useRoomStore } from '@/stores/room'

/**
 * 阶段门禁。
 * - 默认 strict = false：骨架演示时八阶段页面都可操作，方便评审。
 * - 打开 strict 后，写操作只在「当前阶段」开放，用于演示阶段驱动的关闭逻辑。
 * - 真实实现应由后端返回当前阶段，前端只读。
 */
export const useStageStore = defineStore('stage', {
  state: () => ({ stages, strict: true, demoStageNo: DEMO_STAGE_NO, source: 'demo' }),
  getters: {
    current(state) {
      const target = state.stages.find((s) => s.no === state.demoStageNo) || state.stages[0]
      const now = useClockStore().now.getTime()
      const start = new Date(target.start.replace(' ', 'T')).getTime()
      const end = new Date(target.end.replace(' ', 'T')).getTime()
      const status = now < start ? 'NOT_STARTED' : now < end ? 'IN_PROGRESS' : 'COMPLETED'
      return { ...target, status, isDemo: state.source !== 'server', source: state.source }
    },
    // 上一阶段完成度：4=评价完成，5=确认结算，6=调剂确认
    completion() {
      const itv = useInterviewsStore()
      const room = useRoomStore()
      const evaluationOk = itv.studentCount > 0 && itv.evaluatedStudentCount === itv.studentCount
      const confirmOk = room.pendingCount === 0
      const adjustmentOk = room.selectedCount === 0 || room.adjustmentStatus === 'CONFIRMED'
      return {
        4: { done: itv.evaluatedStudentCount, total: itv.studentCount, ok: evaluationOk },
        5: { done: room.confirmedCount + room.abandonedCount, total: room.intendedCount + room.abandonedCount, ok: confirmOk },
        6: { done: room.selectedCount, total: room.selectedCount, ok: adjustmentOk }
      }
    },
    canWrite() {
      return (stageNo) => {
        if (!this.strict) return true
        if (this.current.no !== stageNo) return false
        const target = this.stages.find((s) => s.no === stageNo)
        if (!target) return false
        // 阶段严格模式：必须处于该阶段的时间区间内（左闭右开）
        const now = useClockStore().now.getTime()
        const start = new Date(target.start.replace(' ', 'T')).getTime()
        const end = new Date(target.end.replace(' ', 'T')).getTime()
        if (!(now >= start && now < end)) return false
        // 上一阶段必须完成
        if (stageNo > 4 && stageNo <= 6) {
          const prev = this.completion[stageNo - 1]
          if (prev && !prev.ok) return false
        }
        return true
      }
    }
  },
  actions: {
    setStrict(value) {
      this.strict = Boolean(value)
    },
    setDemoStage(no) {
      this.demoStageNo = Number(no)
      this.source = 'demo'
    },

    // 阶段由固定时间推导，页面不提供手动切换
    syncToClock() {
      const now = useClockStore().now.getTime()
      const found = this.stages.find((s) => {
        const start = new Date(s.start.replace(' ', 'T')).getTime()
        const end = new Date(s.end.replace(' ', 'T')).getTime()
        return now >= start && now < end
      })
      if (found && found.no !== this.demoStageNo) {
        this.demoStageNo = found.no
        this.source = 'demo'
      }
      return found?.no || null
    },

    /**
     * 可选：从后端拉取真实阶段。
     * 默认关闭（VITE_STAGE_SYNC=true 才启用），避免演示环境因后端未启动而变成“第 8 阶段已结束”。
     * 对应 GET /api/meta/stage。
     */
    async syncFromServer() {
      if (import.meta.env.VITE_STAGE_SYNC !== 'true') return false
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 3000)
        const res = await fetch('/api/meta/stage', { signal: controller.signal })
        clearTimeout(timer)
        if (!res.ok) return false
        const body = await res.json()
        const current = body?.data?.current
        if (!current?.no) return false
        this.demoStageNo = Number(current.no)
        this.source = 'server'
        if (Array.isArray(body.data.stages) && body.data.stages.length) {
          this.stages = body.data.stages.map((s) => ({ ...s }))
        }
        return true
      } catch {
        return false
      }
    }
  }
})
