import { defineStore } from 'pinia'

/**
 * 批次（预留）。真实数据由学院端维护，接口见 GET /api/meta/batches。
 * 目前只展示当前批次；多批次切换等学院端提供数据后再打开。
 */
export const useBatchStore = defineStore('batch', {
  state: () => ({
    current: {
      id: 1,
      batchName: '2026 年软件学院实训室选拔',
      academicYear: '2026-2027',
      status: 'RUNNING'
    },
    list: [],
    source: 'demo'
  }),
  getters: {
    label: (s) => `${s.current.academicYear} 选拔`,
    isRunning: (s) => s.current.status === 'RUNNING'
  },
  actions: {
    /**
     * 可选：从后端拉取当前批次。
     * 默认关闭（VITE_BATCH_SYNC=true 才启用）；多批次切换尚未实现，只更新当前批次展示。
     */
    async syncFromServer() {
      if (import.meta.env.VITE_BATCH_SYNC !== 'true') return false
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 3000)
        const res = await fetch('/api/meta/batches', { signal: controller.signal })
        clearTimeout(timer)
        if (!res.ok) return false
        const body = await res.json()
        const list = body?.data?.list
        if (!Array.isArray(list) || !list.length) return false
        this.list = list
        this.current = list.find((x) => x.current) || list[0]
        this.source = 'server'
        return true
      } catch {
        return false
      }
    }
  }
})
