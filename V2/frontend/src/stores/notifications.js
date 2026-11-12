import { defineStore } from 'pinia'

const STORAGE_KEY = 'trs_notifications_v1'

const SEED = [
  {
    id: 'n1',
    type: 'CONFIRM',
    title: '张明 已确认录取',
    content: '智能感知与机器人实训室 · 已计入确认人数',
    time: '2026-11-04 09:12',
    read: false,
    audience: { labId: 1 },
    link: '/teacher/confirmations'
  },
  {
    id: 'n2',
    type: 'ABANDON',
    title: '王雨桐 超时未确认',
    content: '名额已释放，递补第 1 位自动补入（待确认）',
    time: '2026-11-04 11:40',
    read: false,
    audience: { labId: 1 },
    link: '/teacher/confirmations'
  },
  {
    id: 'n3',
    type: 'REVIEW_REJECT',
    title: '学院退回：递补顺位需复核',
    content: '请在 11-05 17:00 前修改后重新提交',
    time: '2026-11-05 10:20',
    read: true,
    audience: { labId: 1, role: 'LAB_LEADER' },
    link: '/teacher/room/submit'
  }
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 站内通知（前端演示版）。
 * 真实实现由后端在状态变化时写入 notifications 表，前端只拉取与标记已读。
 */
export const useNotificationsStore = defineStore('notifications', {
  state: () => load() || { items: SEED.map((n) => ({ ...n })) },
  getters: {
    unread: (s) => s.items.filter((n) => !n.read).length,
    sorted: (s) => [...s.items].sort((a, b) => String(b.time).localeCompare(String(a.time))),
    // 按当前用户/角色/实训室过滤
    visible: (s) => (role, labId, name) =>
      s.items.filter((n) => {
        const a = n.audience
        if (!a) return true
        if (a.role && a.role !== role) return false
        if (a.labId && Number(a.labId) !== Number(labId)) return false
        if (a.user && a.user !== name) return false
        return true
      }),
    unreadFor() {
      return (role, labId, name) => this.visible(role, labId, name).filter((n) => !n.read).length
    },
    visibleSorted() {
      return (role, labId, name) =>
        [...this.visible(role, labId, name)].sort((a, b) => String(b.time).localeCompare(String(a.time)))
    }
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: this.items }))
    },
    // 每个实训室首次进入时补一条本室通知，避免切室后为空
    ensureSeed(labId) {
      const id = Number(labId)
      if (!id) return
      if (this.items.some((n) => Number(n.audience?.labId) === id)) return
      this.items.push({
        id: `seed-${id}-${Date.now()}`,
        type: 'INFO',
        title: '本室选拔提醒',
        content: '请按阶段完成报名审核、面试评价与名单提交',
        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
        read: false,
        audience: { labId: id },
        link: '/teacher/dashboard'
      })
      this.persist()
    },

    reload() {
      const saved = load()
      if (saved) this.items = saved.items || []
    },

    push(item) {
      this.items.unshift({
        id: `n-${Date.now()}`,
        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
        read: false,
        ...item
      })
      this.persist()
    },
    markRead(id) {
      const item = this.items.find((n) => n.id === id)
      if (item) {
        item.read = true
        this.persist()
      }
    },
    markAllRead() {
      this.items.forEach((n) => {
        n.read = true
      })
      this.persist()
    },
    clear() {
      this.items = []
      localStorage.removeItem(STORAGE_KEY)
    }
  }
})
