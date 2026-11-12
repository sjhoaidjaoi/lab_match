import { defineStore } from 'pinia'
import { catalogApi } from '@/api/catalog'
import type { BatchInfo, StageInfo } from '@/types'

export const useCycleStore = defineStore('cycle', {
  state: () => ({
    batch: null as BatchInfo | null,
    loading: false,
    loaded: false
  }),
  getters: {
    stages: (state): StageInfo[] => state.batch?.stages ?? [],
    currentStage: (state): StageInfo | undefined =>
      state.batch?.stages?.find((s) => s.stageStatus === 'IN_PROGRESS') ??
      state.batch?.stages?.find((s) => s.stageStatus === 'NOT_STARTED'),
    // --- 兼容旧组件的 getter ---
    /** 当前活跃批次（别名） */
    cycle: (state) => state.batch,
    /** 当前阶段（别名） */
    stage(): unknown { return this.currentStage ?? null },
    currentRound: () => 1
  },
  actions: {
    async load(force = false) {
      if (this.loading || (this.loaded && !force)) return
      this.loading = true
      try {
        this.batch = await catalogApi.currentBatch()
        this.loaded = true
      } finally {
        this.loading = false
      }
    }
  }
})
