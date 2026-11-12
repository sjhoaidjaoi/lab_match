import { defineStore } from 'pinia'
import { interviewsOf } from '@/mock/interviews'
import { TEACHER_DIRECTORY } from '@/mock/teachers'
import { withinTeacherSlot } from '@/mock/schedule'
import { useConfigStore } from '@/stores/config'

const storageKey = (labId) => `trs_interviews_v2:${labId}`
const currentLabId = () => Number(localStorage.getItem('trs_lab') || 1)

function buildState(labId) {
  return { labId: Number(labId), records: clone(interviewsOf(labId)), schedules: [], lastRecalc: null }
}

const clone = (rows) => rows.map((r) => ({ ...r, scores: r.scores ? { ...r.scores } : null }))

const round1 = (n) => Math.round(n * 10) / 10

function load(labId) {
  try {
    const raw = localStorage.getItem(storageKey(labId))
    return raw ? { ...buildState(labId), ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

/**
 * 面试业务数据唯一来源：评价、面试状态、面试安排。
 * 工作台统计、教师进度、调剂候选池展示均从这里派生。
 */
export const useInterviewsStore = defineStore('interviews', {
  state: () => {
    const labId = currentLabId()
    return load(labId) || buildState(labId)
  },
  getters: {
    evaluatedCount: (s) => s.records.filter((r) => r.status === 'EVALUATED').length,
    studentCount: (s) => new Set(s.records.map((r) => r.studentId)).size,
    evaluatedStudentCount: (s) =>
      new Set(s.records.filter((r) => r.status === 'EVALUATED').map((r) => r.studentId)).size,
    // 待评价学生 = 没有任何已评价记录，且还有待评价记录
    pendingStudentCount: (s) => {
      const evaluated = new Set(s.records.filter((r) => r.status === 'EVALUATED').map((r) => r.studentId))
      return new Set(
        s.records.filter((r) => r.status === 'PENDING' && !evaluated.has(r.studentId)).map((r) => r.studentId)
      ).size
    },
    // 缺勤学生 = 没有已评价记录，且记录均为缺勤
    absentStudentCount: (s) => {
      const evaluated = new Set(s.records.filter((r) => r.status === 'EVALUATED').map((r) => r.studentId))
      const byStudent = new Map()
      s.records.forEach((r) => {
        if (evaluated.has(r.studentId)) return
        if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, [])
        byStudent.get(r.studentId).push(r)
      })
      return [...byStudent.values()].filter((rows) => rows.every((r) => r.status === 'ABSENT')).length
    },
    byStudent: (s) => (studentId) => s.records.filter((r) => r.studentId === studentId),
    pendingCount: (s) => s.records.filter((r) => r.status === 'PENDING').length,
    absentCount: (s) => s.records.filter((r) => r.status === 'ABSENT').length,
    allEvaluated() {
      return this.pendingCount === 0
    },
    recommendationCounts: (s) =>
      s.records.reduce(
        (acc, r) => {
          if (r.recommendation) acc[r.recommendation] = (acc[r.recommendation] || 0) + 1
          return acc
        },
        { ADMIT: 0, ALTERNATE: 0, REJECT: 0 }
      ),
    byId: (s) => (id) => s.records.find((r) => String(r.id) === String(id)),
    byStudentId: (s) => (studentId) => s.records.find((r) => r.studentId === studentId),
    // 按学生聚合：同一学生的多条面试记录（多面试官）
    aggregated: (s) => {
      const groups = new Map()
      for (const r of s.records) {
        if (!groups.has(r.studentId)) groups.set(r.studentId, [])
        groups.get(r.studentId).push(r)
      }
      return [...groups.values()].map((rows) => {
        const evaluated = rows.filter((r) => r.status === 'EVALUATED')
        const avg = evaluated.length
          ? round1(evaluated.reduce((a, r) => a + (r.total || 0), 0) / evaluated.length)
          : null
        const recommendations = { ADMIT: 0, ALTERNATE: 0, REJECT: 0 }
        evaluated.forEach((r) => {
          if (r.recommendation) recommendations[r.recommendation] += 1
        })
        const status = evaluated.length
          ? evaluated.length === rows.length
            ? 'EVALUATED'
            : 'PARTIAL'
          : rows.every((r) => r.status === 'ABSENT')
            ? 'ABSENT'
            : 'PENDING'
        return {
          studentId: rows[0].studentId,
          studentNumber: rows[0].studentNumber,
          realName: rows[0].realName,
          records: rows,
          interviewerCount: rows.length,
          evaluatedCount: evaluated.length,
          avgTotal: avg,
          recommendations,
          status
        }
      })
    },
    byTeacher: (s) => {
      const groups = new Map()
      for (const r of s.records) {
        if (!groups.has(r.interviewer)) groups.set(r.interviewer, [])
        groups.get(r.interviewer).push(r)
      }
      return [...groups.entries()].map(([name, rows]) => {
        const evaluated = rows.filter((r) => r.status === 'EVALUATED')
        return {
          name,
          assigned: rows.length,
          evaluated: evaluated.length,
          avg: evaluated.length ? round1(evaluated.reduce((a, r) => a + r.total, 0) / evaluated.length) : null
        }
      })
    }
  },
  actions: {
    persist() {
      localStorage.setItem(
        storageKey(this.labId),
        JSON.stringify({ labId: this.labId, records: this.records, schedules: this.schedules, lastRecalc: this.lastRecalc || null })
      )
    },

    saveEvaluation(id, { scores, evaluation, recommendation, weights }) {
      const record = this.byId(id)
      if (!record) return false
      const values = Object.values(scores)
      if (values.length !== 5 || values.some((v) => !Number.isInteger(v) || v < 60 || v > 100)) return false
      if (!evaluation?.trim()) return false
      if (!['ADMIT', 'ALTERNATE', 'REJECT'].includes(recommendation)) return false
      record.scores = { ...scores }
      const w = weights && Object.values(weights).reduce((a, b) => a + Number(b), 0) === 100 ? weights : null
      record.total = w
        ? Math.round(
            (scores.attitude * w.attitude +
              scores.logic * w.logic +
              scores.programming * w.programming +
              scores.timeCommitment * w.timeCommitment +
              scores.comprehensive * w.comprehensive) /
              100
          )
        : Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      record.evaluation = evaluation.trim()
      record.recommendation = recommendation
      record.status = 'EVALUATED'
      this.persist()
      return true
    },

    /**
     * 缺勤处理：第一次给机会（可恢复），第二次视为放弃（excluded）。
     * 返回 { ok, final }，final=true 表示本室不再考虑该学生。
     */
    markAbsent(id) {
      const record = this.byId(id)
      if (!record) return { ok: false, final: false }
      if (record.excluded) return { ok: false, final: true }
      if (record.status === 'PENDING') {
        record.status = 'ABSENT'
        record.absenceCount = (record.absenceCount || 0) + 1
        // 口径：超时即缺勤，本室直接除名，不再给补救机会，也不能进内部调剂
        record.excluded = true
        this.persist()
        return { ok: true, final: true }
      }
      return { ok: false, final: Boolean(record.excluded) }
    },

    restorePending(id) {
      const record = this.byId(id)
      if (!record || record.status !== 'ABSENT' || record.excluded) return false
      record.status = 'PENDING'
      this.persist()
      return true
    },

    /**
     * 按学生批量排期。只更新指定学生，避免一条安排覆盖全室。
     * 返回 { ok, reason?, count? }，reason 用于页面给出可读提示。
     */
    scheduleStudents(studentIds, { date, time, location, form, interviewer, durationMin = 20 }) {
      if (!Array.isArray(studentIds) || !studentIds.length) return { ok: false, reason: 'NO_STUDENT' }
      if (!date || !time || !location?.trim() || !interviewer?.trim()) return { ok: false, reason: 'INVALID' }

      const teacher = interviewer.trim()
      const duration = Math.max(5, Number(durationMin) || 20)
      const labId = this.labId
      if (!withinTeacherSlot(labId, teacher, date, time, duration)) {
        return { ok: false, reason: 'OUT_OF_SLOT' }
      }
      const start = new Date(`${date}T${time}:00`).getTime()
      if (Number.isNaN(start)) return { ok: false, reason: 'INVALID' }
      const end = start + duration * 60000

      // 区间重叠判断：同一面试官，时间区间有交集即冲突
      const ids = new Set(studentIds)
      // 与已有面试记录冲突（正在进行/已评价的），排除本次要改期的学生
      const recordConflict = this.records.some((r) => {
        if (ids.has(r.studentId)) return false
        if (r.interviewer !== teacher) return false
        if (!r.scheduled || r.status === 'ABSENT' || !r.time || r.time.includes('待排期')) return false
        const sStart = new Date(r.time.replace(' ', 'T') + ':00').getTime()
        if (Number.isNaN(sStart)) return false
        const sEnd = sStart + (Number(r.durationMin) || 20) * 60000
        return start < sEnd && sStart < end
      })
      const conflict = recordConflict || this.schedules.some((s) => {
        if (s.interviewer !== teacher) return false
        const sStart = new Date(`${s.date}T${s.time}:00`).getTime()
        if (Number.isNaN(sStart)) return false
        const sEnd = sStart + (Number(s.durationMin) || 20) * 60000
        return start < sEnd && sStart < end
      })
      if (conflict) return { ok: false, reason: 'CONFLICT' }

      // 从旧批次中移除这些学生，避免取消旧批次时误清新的安排
      this.schedules.forEach((s) => {
        if (Array.isArray(s.studentIds)) {
          s.studentIds = s.studentIds.filter((id) => !ids.has(id))
        }
      })
      let count = 0
      for (const r of this.records) {
        if (!ids.has(r.studentId) || r.status !== 'PENDING') continue
        r.time = `${date} ${time}`
        r.location = location.trim()
        r.form = form
        r.interviewer = teacher
        r.durationMin = duration
        r.scheduled = true
        count += 1
      }
      if (!count) return { ok: false, reason: 'NO_PENDING' }

      this.schedules.push({
        id: `${Date.now()}-${this.schedules.length}`,
        date,
        time,
        durationMin: duration,
        location: location.trim(),
        form,
        interviewer: teacher,
        studentIds: [...ids],
        createdAt: new Date().toISOString()
      })
      this.persist()
      return { ok: true, count }
    },

    /**
     * 新增一条复评：同一学生、不同面试官。
     * 真实实现对应 POST /api/interviews/:id/reviewers。
     */
    addEvaluation(studentId, interviewerId) {
      const teacher = TEACHER_DIRECTORY.find((t) => t.id === Number(interviewerId))
      if (!teacher) return { ok: false, reason: 'NO_TEACHER' }
      const base = this.records.find((r) => r.studentId === studentId)
      if (!base) return { ok: false, reason: 'NO_STUDENT' }
      if (this.records.some((r) => r.studentId === studentId && r.interviewerId === teacher.id)) {
        return { ok: false, reason: 'EXISTS' }
      }
      if (this.records.filter((r) => r.studentId === studentId).length >= 2) {
        return { ok: false, reason: 'MAX_REACHED' }
      }
      this.records.push({
        id: Date.now(),
        applicationId: base.applicationId,
        studentId: base.studentId,
        studentNumber: base.studentNumber,
        realName: base.realName,
        interviewer: teacher.name,
        interviewerId: teacher.id,
        time: '待排期',
        location: '-',
        form: '-',
        durationMin: 20,
        status: 'PENDING',
        scores: null,
        total: null,
        evaluation: '',
        recommendation: ''
      })
      this.persist()
      return { ok: true }
    },

    // 取消一个排期批次：移除批次并把该批学生恢复为待排期
    cancelSchedule(scheduleId) {
      const index = this.schedules.findIndex((s) => s.id === scheduleId)
      if (index < 0) return false
      const [schedule] = this.schedules.splice(index, 1)
      const ids = new Set(schedule.studentIds || [])
      this.records.forEach((r) => {
        if (ids.has(r.studentId) && r.status === 'PENDING') {
          r.time = '待排期'
          r.location = '-'
          r.form = '-'
        }
      })
      this.persist()
      return true
    },

    // 单人改期：等价于只给一个学生排期
    rescheduleStudent(studentId, payload) {
      return this.scheduleStudents([studentId], payload)
    },

    // 最近一次权重重算前的分数快照（可追溯）
    lastRecalcSnapshot() {
      return this.lastRecalc || null
    },

    reload() {
      const saved = load(this.labId)
      if (saved) Object.assign(this, saved)
    },

    switchLab(labId) {
      const id = Number(labId)
      if (id === this.labId) return false
      this.persist()
      Object.assign(this, load(id) || buildState(id))
      return true
    },

    /**
     * 按当前权重重算所有已有评分，保证新旧综合分口径一致。
     * 权重合计不为 100 时回退为平均分。
     */
    recalculateTotals(weights) {
      const w = weights || useConfigStore().weights
      const sum = Object.values(w || {}).reduce((a, b) => a + Number(b), 0)
      const valid = sum === 100
      const before = this.records.map((r) => ({ id: r.id, total: r.total }))
      this.records.forEach((r) => {
        if (!r.scores) return
        const s = r.scores
        r.total = valid
          ? Math.round(
              (s.attitude * w.attitude +
                s.logic * w.logic +
                s.programming * w.programming +
                s.timeCommitment * w.timeCommitment +
                s.comprehensive * w.comprehensive) /
                100
            )
          : Math.round((s.attitude + s.logic + s.programming + s.timeCommitment + s.comprehensive) / 5)
      })
      this.lastRecalc = {
        at: new Date().toISOString(),
        weights: { ...(w || {}) },
        valid,
        before
      }
      this.persist()
      return valid
    },

    resetAll() {
      const id = this.labId
      Object.assign(this, buildState(id))
      localStorage.removeItem(storageKey(id))
    }
  }
})