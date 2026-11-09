import { defineStore } from 'pinia'
import { catalogApi } from '@/api/catalog'
import type { CycleDetail } from '@/types'

export const useCycleStore = defineStore('cycle', {
  state: () => ({
    detail: null as CycleDetail | null,
    loading: false,
    loaded: false
  }),
  getters: {
    stage: (state) => state.detail?.stage ?? null,
    cycle: (state) => state.detail?.cycle ?? null,
    currentRound: (state) => state.detail?.cycle?.currentRound ?? 1
  },
  actions: {
    async load(force = false) {
      if (this.loading || (this.loaded && !force)) return
      this.loading = true
      try {
        this.detail = await catalogApi.currentCycle()
        this.loaded = true
      } finally {
        this.loading = false
      }
    }
  }
})
