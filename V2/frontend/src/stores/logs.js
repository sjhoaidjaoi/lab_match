import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'trs_operation_logs_v1'
const MAX_ENTRIES = 200

function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function hashEntry(prevHash, entry) {
  const raw = `${prevHash}|${entry.time}|${entry.operator}|${entry.type}|${entry.message}|${entry.target || ''}`
  let h = 2166136261
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
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
 * 本室操作留痕（前端版）。
 * 真实实现应调用后端写 operation_logs 表；这里先保证「改名单 / 调剂 / 提交」都有记录可查。
 */
export const useLogsStore = defineStore('logs', {
  state: () => {
    const saved = load() || { entries: [], clearedAt: '' }
    return { entries: saved.entries || [], clearedAt: saved.clearedAt || '' }
  },
  getters: {
    total: (s) => s.entries.length,
    types: (s) => [...new Set(s.entries.map((e) => e.type))],
    byLab: (s) => (labId) => s.entries.filter((e) => Number(e.labId) === Number(labId)),
    // 校验哈希链：返回 ok / legacy（旧数据无哈希）
    integrity: (s) => {
      if (!s.entries.length) return { ok: true, legacy: false, clearedAt: s.clearedAt || '' }
      if (s.entries.some((e) => !e.hash)) return { ok: false, legacy: true, clearedAt: s.clearedAt || '' }
      for (let i = 0; i < s.entries.length; i += 1) {
        const entry = s.entries[i]
        const older = s.entries[i + 1]
        const expectedPrev = older ? older.hash : '0'
        if (entry.prevHash !== expectedPrev) return { ok: false, legacy: false, brokenAt: entry.id }
        if (hashEntry(entry.prevHash, entry) !== entry.hash) {
          return { ok: false, legacy: false, brokenAt: entry.id }
        }
      }
      return { ok: true, legacy: false }
    }
  },
  actions: {
    record(type, message, target = '') {
      let operator = '系统'
      let labId = null
      try {
        const auth = useAuthStore()
        operator = auth.realName || '演示账号'
        labId = auth.laboratoryId || null
      } catch {
        /* store 未激活时忽略 */
      }
      const prevHash = this.entries[0]?.hash || '0'
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        time: now(),
        operator,
        labId,
        type,
        message,
        target,
        prevHash
      }
      entry.hash = hashEntry(prevHash, entry)
      this.entries.unshift(entry)
      this.clearedAt = ''
      if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES
      this.persist()
    },
    reload() {
      const saved = load()
      if (saved) this.entries = saved.entries || []
    },

    // 传 labId 时只清该室日志；不传则清全部（仅学院端可用）。
    // 清理后重算剩余日志的哈希链，避免留下断链。
    clear(labId = null) {
      this.entries =
        labId == null
          ? []
          : this.entries.filter((e) => Number(e.labId) !== Number(labId))
      let prev = '0'
      for (let i = this.entries.length - 1; i >= 0; i -= 1) {
        const entry = this.entries[i]
        entry.prevHash = prev
        entry.hash = hashEntry(prev, entry)
        prev = entry.hash
      }
      this.clearedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      this.persist()
    },
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: this.entries, clearedAt: this.clearedAt }))
    }
  }
})
