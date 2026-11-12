import { defineStore } from 'pinia'

/**
 * 演示时钟。
 * 页面使用的是架空时间（2026-11 选拔），默认停在“拟录取确认”阶段中间，
 * 以便演示截止/倒计时；可手动改时间或恢复真实时间。
 * 真实实现应由后端下发服务器时间，前端不得自行决定截止。
 */
const STORAGE_KEY = 'trs_demo_now_v1'
const DEFAULT_DEMO_NOW = '2026-11-04T13:00:00'

function loadDemoNow() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? DEFAULT_DEMO_NOW : raw
  } catch {
    return DEFAULT_DEMO_NOW
  }
}

export const useClockStore = defineStore('clock', {
  state: () => ({
    demoNow: loadDemoNow(),
    tick: 0
  }),
  getters: {
    now(state) {
      void state.tick
      const d = state.demoNow ? new Date(state.demoNow) : new Date()
      return Number.isNaN(d.getTime()) ? new Date() : d
    },
    isDemo: (s) => Boolean(s.demoNow),
    nowText() {
      const d = this.now
      const p = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    }
  },
  actions: {
    tickNow() {
      this.tick += 1
    },
    // 仅供开发/联调调用；页面上不提供修改入口（时间调整需走学院端申请）
    setDemoNow(value) {
      this.demoNow = value
      localStorage.setItem(STORAGE_KEY, value)
    },
    followRealTime() {
      this.demoNow = ''
      localStorage.setItem(STORAGE_KEY, '')
    }
  }
})
