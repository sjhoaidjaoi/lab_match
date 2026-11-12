import { defineStore } from 'pinia'
import { labs } from '@/mock/labs'
import { applicationsOf } from '@/mock/applications'
import { admissionsOf } from '@/mock/admissions'
import { candidatesOf } from '@/mock/adjustments'
import { useInterviewsStore } from '@/stores/interviews'
import { useLogsStore } from '@/stores/logs'
import { useConfigStore } from '@/stores/config'
import { useSubmissionStore } from '@/stores/submission'
import { useNotificationsStore } from '@/stores/notifications'

const storageKey = (labId) => `trs_room_state_v3:${labId}`
const currentLabId = () => Number(localStorage.getItem('trs_lab') || 1)

const clone = (rows) => rows.map((r) => ({ ...r }))

function buildState(labId) {
  const lab = labs.find((l) => l.id === Number(labId)) || labs[0]
  const { intended, alternates } = admissionsOf(lab.id)
  return {
    labId: lab.id,
    quota: lab.quota,
    applicationsTotal: applicationsOf(lab.id).length,
    intended: clone(intended),
    alternates: clone(alternates),
    // 候选池只维护选中状态与理由；分数与评价展示从 interviews store 派生
    abandoned: [],
    candidates: clone(candidatesOf(lab.id)).map((c) => ({
      studentId: c.studentId,
      studentNumber: c.studentNumber,
      realName: c.realName,
      obeyInternal: c.obeyInternal,
      obeyCollege: c.obeyCollege,
      selected: false,
      reason: ''
    })),
    // DRAFT → PENDING_CONFIRM（方案已提交学生确认）→ CONFIRMED
    adjustmentStatus: 'DRAFT',
    settlement: null,
    handoverRecords: [],
    alternatesClosedAt: '',
    labInfo: {
      direction: lab.direction,
      techStack: 'Python / C++ / ROS / PyTorch',
      intro: `面向${lab.direction}方向，承担课程项目与学科竞赛，注重工程实践与算法落地能力。`,
      training: '入组后先进行两周基础训练，再进入项目组；每周组会汇报，学期末进行阶段考核。',
      requirement: '具备至少一门编程语言基础，能保证每周不少于 10 小时投入。'
    }
  }
}

function load(labId) {
  try {
    const raw = localStorage.getItem(storageKey(labId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    delete parsed.evaluatedCount
    return { ...buildState(labId), ...parsed }
  } catch {
    return null
  }
}

/**
 * 本室业务数据唯一来源：拟录取、递补、内部调剂候选与方案。
 * 提交审核时从这里打包 payload，页面不再各自持有副本。
 */
export const useRoomStore = defineStore('room', {
  state: () => {
    const labId = currentLabId()
    return load(labId) || buildState(labId)
  },
  getters: {
    intendedCount: (s) => s.intended.length,
    confirmedCount: (s) => s.intended.filter((x) => x.confirmed === 'CONFIRMED').length,
    pendingCount: (s) => s.intended.filter((x) => x.confirmed === 'PENDING').length,
    abandonedCount: (s) => s.abandoned.length,
    vacancies: (s) => s.quota - s.intended.filter((x) => x.confirmed === 'CONFIRMED').length,
    evaluatedCount() {
      return useInterviewsStore().evaluatedStudentCount
    },

    overQuota: (s) => s.intended.length > s.quota,
    canSubmitAdmissions: (s) => s.intended.length <= s.quota,

    selectedCandidates: (s) => {
      const listed = new Set([...s.intended, ...s.alternates, ...s.abandoned].map((x) => x.studentId))
      return s.candidates.filter((c) => c.selected && !listed.has(c.studentId))
    },
    selectedCount() {
      return this.selectedCandidates.length
    },
    adjustmentRemaining() {
      return Math.max(this.vacancies - this.selectedCount, 0)
    },
    reasonsComplete() {
      return this.selectedCandidates.every((c) => (c.reason || '').trim().length > 0)
    },
    // 拟录取确认 + 内部调剂补录，构成最终名单
    finalRows() {
      const interviews = useInterviewsStore()
      const confirmed = this.intended
        .filter((x) => x.confirmed === 'CONFIRMED')
        .map((x) => ({
          ...x,
          // 保留递补补位来源，不要一律改写成拟录取
          source: x.source === 'ALTERNATE' ? 'ALTERNATE' : 'INTENDED'
        }))
      const adjusted =
        this.adjustmentStatus === 'CONFIRMED'
          ? this.selectedCandidates.map((c) => ({
              ...c,
              total: interviews.byStudentId(c.studentId)?.total ?? null,
              source: 'INTERNAL'
            }))
          : []
      return [...confirmed, ...adjusted]
    },
    candidateRows() {
      const interviews = useInterviewsStore()
      const listed = new Set([...this.intended, ...this.alternates, ...this.abandoned].map((x) => x.studentId))
      return this.candidates.filter((c) => !listed.has(c.studentId)).map((c) => {
        const record = interviews.byStudentId(c.studentId)
        return {
          ...c,
          total: c.crossLab ? null : record?.total ?? null,
          evaluation: c.crossLab ? '跨室候选，本室暂无评价' : record?.evaluation || '尚未评价'
        }
      })
    },
    // 已占用名单的学号集合，用于「从面试结果加入名单」时去重
    listedStudentIds: (s) => new Set([...s.intended, ...s.alternates, ...s.abandoned].map((x) => x.studentId)),
    nextAlternateOrder: (s) => s.alternates.length + 1
  },
  actions: {
    persist() {
      localStorage.setItem(
        storageKey(this.labId),
        JSON.stringify({
          labId: this.labId,
          quota: this.quota,
          applicationsTotal: this.applicationsTotal,
          intended: this.intended,
          alternates: this.alternates,
          abandoned: this.abandoned,
          candidates: this.candidates,
          adjustmentStatus: this.adjustmentStatus,
          settlement: this.settlement,
          handoverRecords: this.handoverRecords,
          alternatesClosedAt: this.alternatesClosedAt,
          labInfo: this.labInfo
        })
      )
    },

    // 提交审核后名单锁定；所有写操作都走这里兜底
    isEditable() {
      try {
        return !useSubmissionStore().isLocked
      } catch {
        return true
      }
    },

    saveLabInfo(info) {
      this.labInfo = { ...this.labInfo, ...info }
      this.persist()
      useLogsStore().record('LAB_INFO', '更新本室介绍')
    },

    removeIntended(studentId) {
      if (!this.isEditable()) return false
      const row = this.intended.find((x) => x.studentId === studentId)
      this.intended = this.intended.filter((x) => x.studentId !== studentId)
      this.persist()
      if (row) useLogsStore().record('ADMISSION_REMOVE', `移出拟录取名单：${row.realName}`, row.studentNumber)
    },

    /**
     * 从面试结果加入拟录取名单。
     * 入参为面试记录（含 studentId / studentNumber / realName / total），已占用名单里的学生会自动跳过。
     */
    addIntended(rows = []) {
      if (!this.isEditable()) return 0
      const existing = this.listedStudentIds
      const fresh = rows.filter((r) => r && !existing.has(r.studentId) && !r.excluded)
      fresh.forEach((r, i) => {
        this.intended.push({
          id: Date.now() + i,
          studentId: r.studentId,
          studentNumber: r.studentNumber,
          realName: r.realName,
          total: r.total ?? null,
          confirmed: 'PENDING',
          admissionType: 'INTENDED',
          source: 'INTERVIEW'
        })
      })
      this.candidates = this.candidates.filter((c) => !fresh.some((r) => r.studentId === c.studentId))
      this.persist()
      if (fresh.length) {
        useLogsStore().record('ADMISSION_ADD', `从面试结果加入拟录取 ${fresh.length} 人`, 'INTENDED')
      }
      return fresh.length
    },

    // 加入递补名单：顺位接着现有列表往后排
    addAlternates(rows = []) {
      if (!this.isEditable()) return 0
      const existing = this.listedStudentIds
      const fresh = rows.filter((r) => r && !existing.has(r.studentId) && !r.excluded)
      const start = this.alternates.length
      fresh.forEach((r, i) => {
        this.alternates.push({
          id: Date.now() + i,
          studentId: r.studentId,
          studentNumber: r.studentNumber,
          realName: r.realName,
          total: r.total ?? null,
          orderNo: start + i + 1,
          admissionType: 'ALTERNATE',
          source: 'INTERVIEW'
        })
      })
      this.candidates = this.candidates.filter((c) => !fresh.some((r) => r.studentId === c.studentId))
      this.persist()
      if (fresh.length) {
        useLogsStore().record('ADMISSION_ADD', `从面试结果加入递补 ${fresh.length} 人`, 'ALTERNATE')
      }
      return fresh.length
    },

    // 学生端确认动作，骨架阶段由确认页的联调面板触发
    /** 撤销系统默认补位：把该学生放回递补第 1 位 */
    undoPromotion(studentId) {
      if (!this.isEditable()) return false
      const row = this.intended.find(
        (x) => x.studentId === studentId && x.source === 'ALTERNATE' && x.confirmed === 'PENDING'
      )
      if (!row) return false
      this.intended = this.intended.filter((x) => x.id !== row.id)
      this.alternates = [
        { ...row, admissionType: 'ALTERNATE', orderNo: 1 },
        ...this.alternates.map((a, i) => ({ ...a, orderNo: i + 2 }))
      ]
      this.persist()
      useLogsStore().record('ADMISSION_REMOVE', `撤销补位：${row.realName} 回到递补第 1 位`, row.studentNumber)
      return true
    },

    confirmIntention(studentId) {
      if (!this.isEditable()) return false
      const row = this.intended.find((x) => x.studentId === studentId)
      if (!row || row.confirmed !== 'PENDING') return false
      row.confirmed = 'CONFIRMED'
      this.persist()
      useLogsStore().record('CONFIRM', `学生确认录取：${row.realName}`, row.studentNumber)
      useNotificationsStore().push({
        type: 'CONFIRM',
        title: `${row.realName} 已确认录取`,
        content: '已计入本室确认人数',
        audience: { labId: this.labId },
        link: '/teacher/confirmations'
      })
      return true
    },

    /**
     * 学生超时未确认 → 释放名额，并按递补顺位自动补 1 人。
     * 返回 { abandoned: true, promoted }；无递补时 promoted 为 null，空缺随之增加。
     */
    /**
     * 补位者超过确认截止：视为放弃，名额转内部调剂。
     * 前端定时调用；真实实现应由服务端定时任务执行。
     */
    expireStalePromotions(now = new Date()) {
      if (!this.isEditable()) return 0
      const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
      const stale = this.intended.filter((x) => {
        if (x.source !== 'ALTERNATE' || x.confirmed !== 'PENDING' || !x.confirmationDeadline) return false
        const deadline = new Date(x.confirmationDeadline.replace(' ', 'T')).getTime()
        return Number.isFinite(deadline) && nowMs >= deadline
      })
      if (!stale.length) return 0
      stale.forEach((row) => {
        this.intended = this.intended.filter((x) => x.id !== row.id)
        this.abandoned.push({ ...row, confirmed: 'ABANDONED' })
        useLogsStore().record('ABANDON', `补位超时：${row.realName}，名额转调剂`, row.studentNumber)
        useNotificationsStore().push({
          type: 'ABANDON',
          title: `${row.realName} 补位超时`,
          content: '名额已释放，进入内部调剂',
          audience: { labId: this.labId },
          link: '/teacher/confirmations'
        })
      })
      this.persist()
      return stale.length
    },

    // 提交时记录一次移交学院的名额，供追溯/导出
    recordHandover() {
      const count = Math.max(this.vacancies, 0)
      this.handoverRecords.unshift({
        at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        labId: this.labId,
        quota: this.quota,
        confirmed: this.confirmedCount,
        vacancy: count
      })
      if (this.handoverRecords.length > 20) this.handoverRecords.length = 20
      this.persist()
      return count
    },

    /** 已确认学生退出：释放名额；若仍在确认期内，默认补递补第 1 位 */
    withdrawConfirmed(studentId, { canPromote = true, deadline = '' } = {}) {
      if (!this.isEditable()) return null
      const row = this.intended.find((x) => x.studentId === studentId && x.confirmed === 'CONFIRMED')
      if (!row) return null
      this.intended = this.intended.filter((x) => x.id !== row.id)
      this.abandoned.push({ ...row, confirmed: 'ABANDONED', withdrawnAt: new Date().toISOString() })
      const promoted = canPromote ? this.promoteNextAlternate(deadline) : null
      this.persist()
      useLogsStore().record('ABANDON', `已确认学生退出：${row.realName}${promoted ? `，${promoted.realName} 补入` : '，名额转入内部调剂'}`, row.studentNumber)
      useNotificationsStore().push({
        type: 'ABANDON',
        title: `${row.realName} 已退出本室`,
        content: promoted ? `${promoted.realName} 默认补入（待确认）` : '名额已释放，进入内部调剂',
        audience: { labId: this.labId },
        link: '/teacher/confirmations'
      })
      return { withdrawn: true, promoted }
    },

    /**
     * 到期结算（演示）：
     * - 只有 1 个拟录取意向 → 自动确认，学生不能拒绝；
     * - 多个意向但未选择 → 视为放弃，名额释放。
     * 真实实现由后端定时任务执行，前端只做展示。
     */
    settleExpired(deadline = '') {
      // 幂等：同一截止时间且没有新的待确认时，返回同一结果
      if (this.settlement && this.settlement.deadline === deadline && this.pendingCount === 0) {
        return this.settlement.result
      }
      if (!this.isEditable()) return { confirmed: 0, abandoned: 0, blocked: true }

      const snapshot = {
        intended: clone(this.intended),
        alternates: clone(this.alternates),
        abandoned: clone(this.abandoned),
        counts: {
          intended: this.intendedCount,
          confirmed: this.confirmedCount,
          pending: this.pendingCount,
          vacancy: this.vacancies
        }
      }

      const pending = this.intended.filter((x) => x.confirmed === 'PENDING')
      const groups = new Map()
      pending.forEach((row) => {
        if (!groups.has(row.studentId)) groups.set(row.studentId, [])
        groups.get(row.studentId).push(row)
      })

      const apps = applicationsOf(this.labId)
      const rank = (studentId, labId) => {
        const app = apps.find((a) => a.studentId === studentId)
        const index = app ? app.preferences.findIndex((p) => p.labId === labId) : -1
        return index < 0 ? 99 : index
      }

      let confirmed = 0
      let abandoned = 0
      groups.forEach((rows) => {
        // 只有一个意向：必须接受，不能拒绝
        if (rows.length === 1) {
          rows[0].confirmed = 'CONFIRMED'
          confirmed += 1
          return
        }
        // 多个意向：按第一/第二/第三志愿顺序自动选一个，不能都不要
        const sorted = [...rows].sort((a, b) => rank(a.studentId, a.labId) - rank(b.studentId, b.labId))
        sorted[0].confirmed = 'CONFIRMED'
        confirmed += 1
        sorted.slice(1).forEach((row) => {
          this.intended = this.intended.filter((x) => x.id !== row.id)
          this.abandoned.push({ ...row, confirmed: 'ABANDONED' })
          abandoned += 1
          // 学生选择其他室后，本室名额按递补顺位默认补位（可撤销）
          this.promoteNextAlternate(deadline)
        })
      })

      const result = { confirmed, abandoned }
      this.alternatesClosedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      if (this.settlement && this.settlement.deadline === deadline) {
        // 补结算：保留首次快照，累加结果
        this.settlement.result = {
          confirmed: this.settlement.result.confirmed + confirmed,
          abandoned: this.settlement.result.abandoned + abandoned
        }
        this.settlement.doneAt = new Date().toISOString()
        this.settlement.rounds = [
          ...(this.settlement.rounds || []),
          { at: this.settlement.doneAt, confirmed, abandoned }
        ]
        this.persist()
        useLogsStore().record('CONFIRM', `补结算：确认 ${confirmed} 人，放弃 ${abandoned} 人`, 'DEADLINE')
        return this.settlement.result
      }
      this.settlement = {
        deadline,
        doneAt: new Date().toISOString(),
        result,
        snapshot,
        rounds: []
      }
      this.persist()
      useLogsStore().record(
        'CONFIRM',
        `到期结算：自动确认 ${confirmed} 人，放弃 ${abandoned} 人`,
        'DEADLINE'
      )
      useNotificationsStore().push({
        type: 'CONFIRM',
        title: '确认截止已结算',
        content: `自动确认 ${confirmed} 人，放弃 ${abandoned} 人`,
        audience: { labId: this.labId },
        link: '/teacher/confirmations'
      })
      return result
    },

    abandonIntention(studentId, { canPromote = true, deadline = '' } = {}) {
      if (!this.isEditable()) return null
      const row = this.intended.find((x) => x.studentId === studentId)
      if (!row || row.confirmed !== 'PENDING') return null
      // 放弃者移出当前拟录取名单，单独留档，避免名单长度影响名额判断
      this.intended = this.intended.filter((x) => x.studentId !== studentId)
      this.abandoned.push({
        ...row,
        confirmed: 'ABANDONED',
        abandonedAt: new Date().toISOString()
      })
      const promoted = canPromote ? this.promoteNextAlternate(deadline) : null
      this.persist()
      useLogsStore().record(
        'ABANDON',
        `学生超时放弃：${row.realName}${promoted ? `，递补 ${promoted.realName} 补入` : '，无递补可补'}`,
        row.studentNumber
      )
      useNotificationsStore().push({
        type: 'ABANDON',
        title: `${row.realName} 超时未确认`,
        content: promoted ? `名额已释放，${promoted.realName} 自动补入（待确认）` : '名额已释放，无递补可补',
        audience: { labId: this.labId },
        link: '/teacher/confirmations'
      })
      return { abandoned: true, promoted }
    },

    promoteNextAlternate(deadline = '') {
      if (!this.alternates.length) return null
      const next = this.alternates[0]
      this.alternates = this.alternates.slice(1).map((a, i) => ({ ...a, orderNo: i + 1 }))
      const promoted = {
        ...next,
        id: Date.now(),
        confirmed: 'PENDING',
        admissionType: 'INTENDED',
        source: 'ALTERNATE',
        confirmationDeadline: deadline,
        promotedAt: new Date().toISOString()
      }
      this.intended.push(promoted)
      return promoted
    },

    moveAlternate(index, direction) {
      if (!this.isEditable()) return false
      const target = index + direction
      if (target < 0 || target >= this.alternates.length) return
      const list = this.alternates
      ;[list[index], list[target]] = [list[target], list[index]]
      // 顺位是连续序号，重排后统一重算，避免出现重复或断档
      this.alternates = list.map((row, i) => ({ ...row, orderNo: i + 1 }))
      this.persist()
    },

    /**
     * 名额上限在 store 里兜底，页面禁用按钮只是第一道防线。
     * 返回 false 表示本次勾选超出空缺名额。
     */
    setCandidateSelected(studentId, selected) {
      if (!this.isEditable()) return false
      const row = this.candidates.find((c) => c.studentId === studentId)
      if (!row) return false
      if (selected && !row.selected && this.selectedCandidates.length >= this.vacancies) return false
      row.selected = selected
      this.invalidateAdjustmentConfirm()
      this.persist()
      return true
    },

    /**
     * 按当前规则重建候选池：
     * - Q6 为 true：只取本室报名学生（默认）
     * - Q6 为 false：追加其他实训室中未占用、服从内部调剂的候选人（演示跨室候选）
     * 保留已选状态与理由。
     */
    /**
     * 重建候选池：只取本室报名学生。
     * 决策：A 室无权查看 B 室数据，因此不拉取其他实训室候选人。
     * 学院若后续提供跨室候选，应通过学院端接口下发，而不是前端自己拼。
     */
    syncCandidatePool() {
      if (!this.isEditable()) return this.candidates.length
      const keep = new Map(this.candidates.map((c) => [c.studentId, c]))
      this.candidates = candidatesOf(this.labId).map((c) => {
        const prev = keep.get(c.studentId)
        return {
          studentId: c.studentId,
          studentNumber: c.studentNumber,
          realName: c.realName,
          obeyInternal: c.obeyInternal,
          obeyCollege: c.obeyCollege,
          crossLab: false,
          selected: prev?.selected || false,
          reason: prev?.reason || ''
        }
      })
      this.persist()
      return this.candidates.length
    },

    setReason(studentId, reason) {
      if (!this.isEditable()) return false
      const row = this.candidates.find((c) => c.studentId === studentId)
      if (row) {
        row.reason = reason
        this.invalidateAdjustmentConfirm()
        this.persist()
      }
    },

    clearSelection() {
      if (!this.isEditable()) return
      this.candidates.forEach((c) => {
        c.selected = false
      })
      this.invalidateAdjustmentConfirm()
      this.persist()
    },

    // 方案一旦改动，学生确认作废，需重新走确认环节
    invalidateAdjustmentConfirm() {
      if (this.adjustmentStatus === 'CONFIRMED') this.adjustmentStatus = 'DRAFT'
    },

    beginAdjustmentConfirm() {
      if (!this.isEditable()) return false
      if (!this.selectedCount || !this.reasonsComplete) return false
      this.adjustmentStatus = 'PENDING_CONFIRM'
      this.persist()
      useLogsStore().record('ADJUSTMENT_SUBMIT', `提交内部调剂方案：${this.selectedCount} 人待学生确认`, 'INTERNAL')
      return true
    },

    confirmAdjustments() {
      if (!this.isEditable()) return false
      if (this.adjustmentStatus !== 'PENDING_CONFIRM') return false
      this.adjustmentStatus = 'CONFIRMED'
      this.persist()
      useLogsStore().record('ADJUSTMENT_CONFIRM', `内部调剂经学生确认生效：${this.selectedCount} 人`, 'INTERNAL')
      return true
    },

    // 切换实训室：先落盘当前室，再载入目标室（各室数据独立持久化）
    reload() {
      const saved = load(this.labId)
      if (saved) Object.assign(this, saved)
    },

    switchLab(labId) {
      const id = Number(labId)
      if (id === this.labId) return false
      this.persist()
      Object.assign(this, load(id) || buildState(id))
      this.persist()
      return true
    },

    resetAll() {
      const id = this.labId
      Object.assign(this, buildState(id))
      useInterviewsStore().resetAll()
      localStorage.removeItem(storageKey(id))
    }
  }
})
