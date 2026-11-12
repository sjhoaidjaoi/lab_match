import { defineStore } from 'pinia'

const STORAGE_KEY = 'trs_config_v1'

// 与后端 GET /api/meta/config 保持一致；真实实现应以后端为准
const DEFAULTS = {
  currentBatchId: 1,
  rules: {
    internalAdjustmentOnlyOwnApplicants: true,
    requireStudentConfirmForAdjustment: true,
    crossLabAdjustmentAllowsUnapplied: false,
    allowEditPreferencesBeforeDeadline: true,
    quotaAdjustmentNeedsApproval: true
  },
  features: {
    upload: false,
    panorama: false,
    notification: false,
    excelExport: false
  },
  // 五维评分权重（合计 100）；大纲要求权重可配置
  weights: {
    attitude: 20,
    logic: 20,
    programming: 30,
    timeCommitment: 15,
    comprehensive: 15
  },
  weightHistory: []
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 规则开关（演示版）。
 * 真实实现：后端 /meta/config 下发，前端只读；
 * 这里允许本地切换，用于演示 Q6/Q7/Q8 对页面的影响，不影响其他端。
 */
export const useConfigStore = defineStore('config', {
  state: () => {
    const saved = load()
    return saved
      ? { ...DEFAULTS, ...saved, rules: { ...DEFAULTS.rules, ...saved.rules }, weights: { ...DEFAULTS.weights, ...saved.weights }, weightHistory: saved.weightHistory || [] }
      : structuredClone(DEFAULTS)
  },
  getters: {
    // 注意：不要在这里重复声明 rules/features，会与 state 同名字段冲突
    isDemo: () => true
  },
  actions: {
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentBatchId: this.currentBatchId,
          rules: this.rules,
          features: this.features,
          weights: this.weights,
          weightHistory: this.weightHistory
        })
      )
    },
    setRule(key, value) {
      if (!(key in this.rules)) return false
      this.rules[key] = Boolean(value)
      this.persist()
      return true
    },
    setWeight(key, value) {
      if (!(key in this.weights)) return false
      const before = { ...this.weights }
      this.weights[key] = Math.max(0, Math.min(100, Number(value) || 0))
      this.weightHistory.unshift({
        at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        before,
        after: { ...this.weights }
      })
      if (this.weightHistory.length > 20) this.weightHistory.length = 20
      this.persist()
      return true
    },
    setFeature(key, value) {
      if (!(key in this.features)) return false
      this.features[key] = Boolean(value)
      this.persist()
      return true
    },
    reload() {
      const saved = load()
      if (saved) {
        Object.assign(this, { ...DEFAULTS, ...saved, rules: { ...DEFAULTS.rules, ...saved.rules }, weights: { ...DEFAULTS.weights, ...saved.weights }, weightHistory: saved.weightHistory || [] })
      }
    },

    reset() {
      Object.assign(this, structuredClone(DEFAULTS))
      localStorage.removeItem(STORAGE_KEY)
    }
  }
})
