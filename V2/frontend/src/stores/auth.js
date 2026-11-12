import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    role: localStorage.getItem('trs_role') || '',
    realName: localStorage.getItem('trs_name') || '',
    laboratoryId: Number(localStorage.getItem('trs_lab') || 1),
    laboratoryName: localStorage.getItem('trs_lab_name') || '智能感知与机器人实训室',
    laboratories: JSON.parse(localStorage.getItem('trs_laboratories') || '[]')
  }),
  getters: {
    isLoggedIn: (s) => Boolean(s.role),
    isLeader: (s) => s.role === 'LAB_LEADER',
    isTeacherSide: (s) => s.role === 'LAB_TEACHER' || s.role === 'LAB_LEADER'
  },
  actions: {
    login({ role, realName, laboratoryId = 1, laboratoryName = '智能感知与机器人实训室', laboratories }) {
      this.role = role
      this.realName = realName || ''
      const list = Array.isArray(laboratories) && laboratories.length
        ? laboratories
        : [{ id: laboratoryId, name: laboratoryName }]
      this.laboratories = list
      const active = list.find((l) => l.id === laboratoryId) || list[0]
      this.laboratoryId = active.id
      this.laboratoryName = active.name
      localStorage.setItem('trs_role', role)
      localStorage.setItem('trs_name', this.realName)
      localStorage.setItem('trs_lab', String(active.id))
      localStorage.setItem('trs_lab_name', active.name)
      localStorage.setItem('trs_laboratories', JSON.stringify(list))
    },

    // 切换被授权的实训室（只有登录返回的列表内才允许）
    setLab(labId) {
      const target = this.laboratories.find((l) => l.id === Number(labId))
      if (!target) return false
      this.laboratoryId = target.id
      this.laboratoryName = target.name
      localStorage.setItem('trs_lab', String(target.id))
      localStorage.setItem('trs_lab_name', target.name)
      return true
    },
    logout() {
      this.role = ''
      this.realName = ''
      localStorage.removeItem('trs_role')
      localStorage.removeItem('trs_name')
      localStorage.removeItem('trs_lab')
      localStorage.removeItem('trs_lab_name')
      localStorage.removeItem('trs_laboratories')
      this.laboratories = []
    }
  }
})
