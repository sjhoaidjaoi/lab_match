import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

// 浏览器环境桩
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null },
  setItem(k, v) { this.store[k] = String(v) },
  removeItem(k) { delete this.store[k] }
}

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
})

const { useRoomStore } = await server.ssrLoadModule('/src/stores/room.js')
const { useSubmissionStore } = await server.ssrLoadModule('/src/stores/submission.js')
const { useInterviewsStore } = await server.ssrLoadModule('/src/stores/interviews.js')
const { useStageStore } = await server.ssrLoadModule('/src/stores/stage.js')
const { students } = await server.ssrLoadModule('/src/mock/students.js')
const { TEACHER_DIRECTORY, teacherIdByName, teachers } = await server.ssrLoadModule('/src/mock/teachers.js')
const { labs } = await server.ssrLoadModule('/src/mock/labs.js')
const { demoLabOf } = await server.ssrLoadModule('/src/config/demoAuth.js')
const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js')
const { useConfigStore } = await server.ssrLoadModule('/src/stores/config.js')
const { useClockStore } = await server.ssrLoadModule('/src/stores/clock.js')
const { useReviewQueueStore } = await server.ssrLoadModule('/src/stores/reviewQueue.js')
const { useTimeRequestsStore } = await server.ssrLoadModule('/src/stores/timeRequests.js')
const { isPast } = await server.ssrLoadModule('/src/utils/time.js')
const { useNotificationsStore } = await server.ssrLoadModule('/src/stores/notifications.js')

setActivePinia(createPinia())
const room = useRoomStore()
const sub = useSubmissionStore()
const itv = useInterviewsStore()

const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1 }
  else console.log('PASS:', msg)
}

// 1. 数据规模与口径：6 室 / 每室 200 报名 / 名额 64
assert(room.quota === 64, `名额 ${room.quota}`)
assert(room.applicationsTotal === 199, `报名 ${room.applicationsTotal}`)
assert(room.intendedCount === 64, `拟录取 ${room.intendedCount}`)
assert(room.confirmedCount === 56, `已确认 ${room.confirmedCount}`)
assert(room.vacancies === 8, `空缺 ${room.vacancies}`)
assert(room.alternates.length === 12, `递补 ${room.alternates.length}`)
assert(room.candidates.length === 24, `候选 ${room.candidates.length}`)
assert(room.finalRows.length === 56, `最终名单 ${room.finalRows.length}`)

// 2. 名额上限兜底：选满 8 后第 9 人被拦截
const ids = room.candidates.map((c) => c.studentId)
let accepted = 0
for (let i = 0; i < 8; i++) if (room.setCandidateSelected(ids[i], true)) accepted++
assert(accepted === 8, `连续选 8 人成功（${accepted}）`)
assert(room.setCandidateSelected(ids[8], true) === false, '第 9 人被空缺名额拦截')
assert(room.selectedCount === 8, `已选 ${room.selectedCount}`)
assert(room.adjustmentRemaining === 0, `剩余空缺 ${room.adjustmentRemaining}`)

// 3. 理由必填与最终名单
assert(room.reasonsComplete === false, '未填理由时不能提交')
for (let i = 0; i < 8; i++) room.setReason(ids[i], `调剂理由 ${i + 1}`)
assert(room.reasonsComplete === true, '理由齐全后可提交')
assert(room.finalRows.length === 56, `调剂未确认时最终名单仍为 ${room.finalRows.length}`)

// 4. 递补顺位重排后仍连续
const before = room.alternates.map((a) => a.orderNo).join(',')
const firstTwo = [room.alternates[0].studentId, room.alternates[1].studentId]
room.moveAlternate(0, 1)
const after = room.alternates.map((a) => a.orderNo).join(',')
assert(before === '1,2,3,4,5,6,7,8,9,10,11,12', `初始顺位 ${before}`)
assert(after === '1,2,3,4,5,6,7,8,9,10,11,12', `重排后顺位 ${after}`)
assert(room.alternates[0].studentId === firstTwo[1] && room.alternates[1].studentId === firstTwo[0], '上下移动生效')

// 5. 提交审核状态机
assert(sub.status === 'DRAFT' && sub.canSubmit, '初始为草稿可提交')
assert(sub.isLocked === false, '草稿不锁定')
sub.submit(room)
assert(sub.status === 'REVIEWING', '提交后待审核')
assert(sub.isLocked === true, '待审核时锁定')
assert(sub.canSubmit === false, '待审核不可重复提交')
assert(sub.timeline.at(-1).desc.includes('内部调剂 8 人'), `时间线摘要: ${sub.timeline.at(-1).desc}`)
sub.reject('递补顺位与评分不一致')
assert(sub.status === 'REJECTED' && sub.canSubmit === true, '退回后可重新提交')
assert(sub.timeline.at(-1).desc === '递补顺位与评分不一致', '退回原因入时间线')
sub.submit(room)
sub.approve()
assert(sub.status === 'APPROVED' && sub.isLocked === true, '通过后锁定')

// 6. 持久化
assert(JSON.parse(localStorage.getItem('trs_room_state_v3:1')).candidates.length === 24, 'room 已持久化')
assert(JSON.parse(localStorage.getItem('trs_submission_state_v2:1')).status === 'APPROVED', 'submission 已持久化')

// 7. 面试评价闭环
assert(itv.records.length === 219, `面试记录 ${itv.records.length}`)
assert(itv.evaluatedCount === 159 && itv.pendingCount === 60, `初始评价记录 ${itv.evaluatedCount} / 待评价 ${itv.pendingCount}`)
assert(room.evaluatedCount === itv.evaluatedStudentCount && room.evaluatedCount === 145, `已评价学生 ${room.evaluatedCount}`)

const pendingRow = itv.records.find((r) => r.status === 'PENDING')
const goodScores = { attitude: 90, logic: 90, programming: 90, timeCommitment: 90, comprehensive: 90 }
assert(itv.saveEvaluation(pendingRow.id, { scores: goodScores, evaluation: '冒烟测试评价', recommendation: 'ADMIT' }) === true, '评价保存成功')
assert(itv.evaluatedCount === 160 && room.evaluatedCount === 146, '保存后记录 160 / 已评价学生 146')
assert(itv.byId(pendingRow.id).total === 90, '综合分回写')
assert(itv.saveEvaluation(pendingRow.id, { scores: { ...goodScores, attitude: 10 }, evaluation: 'x', recommendation: 'ADMIT' }) === false, '越界评分被拒绝')

const absentRow = itv.records.find((r) => r.status === 'PENDING')
const absent1 = itv.markAbsent(absentRow.id)
assert(absent1.ok === true && absent1.final === true, '缺勤一次即除名')
assert(itv.byId(absentRow.id).excluded === true, '缺勤后标记 excluded')
assert(itv.restorePending(absentRow.id) === false, '缺勤后不能恢复')
assert(itv.pendingCount === 58, `缺勤后待评价 ${itv.pendingCount}`)

const scheduleIds = itv.records.filter((r) => r.status === 'PENDING').slice(0, 3).map((r) => r.studentId)
const scheduled = itv.scheduleStudents(scheduleIds, {
  date: '2026-11-02',
  time: '13:00',
  location: '实验楼 B202',
  form: '线上',
  interviewer: '王老师'
})
assert(scheduled.ok === true && scheduled.count === 3, '按学生批量排期 3 人')
assert(
  itv.records
    .filter((r) => scheduleIds.includes(r.studentId) && r.status === 'PENDING')
    .every((r) => r.location === '实验楼 B202'),
  '仅被选中的待评价记录更新安排'
)
const conflict = itv.scheduleStudents([scheduleIds[0]], {
  date: '2026-11-02',
  time: '13:00',
  location: '实验楼 B202',
  form: '线上',
  interviewer: '王老师'
})
assert(conflict.ok === false && conflict.reason === 'CONFLICT', '同一面试官同一时段冲突被拦截')
assert(itv.scheduleStudents([], { date: '2026-11-02', time: '13:10', location: 'A', form: '线下', interviewer: '王老师' }).reason === 'NO_STUDENT', '未选学生被拦截')
assert(itv.scheduleStudents([scheduleIds[0]], { date: '2026-11-02', time: '14:50', durationMin: 20, location: 'A', form: '线下', interviewer: '王老师' }).reason === 'OUT_OF_SLOT', '超出教师专属时段被拦截')
const rescheduled = itv.rescheduleStudent(scheduleIds[0], {
  date: '2026-11-02',
  time: '13:40',
  durationMin: 20,
  location: '实验楼 C101',
  form: '线下',
  interviewer: '赵老师'
})
assert(rescheduled.ok === true && itv.byId(itv.records.find((r) => r.studentId === scheduleIds[0]).id).location === '实验楼 C101', '单人改期生效')
assert(itv.byTeacher.length === 4, `教师维度汇总 ${itv.byTeacher.length} 人`)
assert(itv.studentCount === 199, `应面试学生 ${itv.studentCount}`)
assert(itv.aggregated.length === 199, `按学生聚合 ${itv.aggregated.length} 组`)
assert(itv.aggregated.some((g) => g.interviewerCount === 2), '存在多面试官复评的学生')
const multi = itv.aggregated.find((g) => g.interviewerCount === 2)
assert(multi.avgTotal !== null && multi.evaluatedCount === 2, '复评学生平均分与评价数正确')

// 8. 候选池展示派生 + 调剂确认状态机
sub.reset()
room.clearSelection()
const cand = room.candidates[0]
const candRow = room.candidateRows.find((c) => c.studentId === cand.studentId)
assert(candRow && candRow.total === itv.byStudentId(cand.studentId)?.total, '候选池分数跟随面试评价')
room.setCandidateSelected(cand.studentId, true)
room.setReason(cand.studentId, '冒烟理由')
assert(room.beginAdjustmentConfirm() === true && room.adjustmentStatus === 'PENDING_CONFIRM', '方案进入学生确认')
assert(room.confirmAdjustments() === true && room.adjustmentStatus === 'CONFIRMED', '学生确认生效')
assert(room.finalRows.some((r) => r.source === 'INTERNAL' && r.studentId === cand.studentId), '确认后最终名单含内部调剂来源')
room.setReason(cand.studentId, '修改理由')
assert(room.adjustmentStatus === 'DRAFT', '改动方案作废确认')
assert(!room.finalRows.some((r) => r.studentId === cand.studentId), '作废后最终名单移除该调剂')

// 9. 重置
sub.reset()
room.resetAll()
assert(sub.status === 'DRAFT' && sub.isLocked === false, '重置后恢复草稿')
assert(room.selectedCount === 0 && room.vacancies === 8, '重置后数据还原')
assert(itv.evaluatedCount === 159 && itv.pendingCount === 60, '重置还原面试数据')

// 9.1 学生简历（教师端查看）
assert(students.length === 400, `学生 ${students.length}`)
assert(!!students[0].resume && students[0].resume.skills.length >= 4, '学生简历含技能标签')
assert(students[0].resume.projects.length === 2, '学生简历含 2 段项目经历')
assert(typeof students[0].resume.gpa === 'string' && Number(students[0].resume.gpa) >= 3, 'GPA 字段有效')
assert(Array.isArray(students[0].resume.attachments), '附件字段存在（可为空）')

// 10. 从面试结果加入拟录取 / 递补
const usedIds = room.listedStudentIds
const pool = itv.records.filter((r) => r.status === 'EVALUATED' && !usedIds.has(r.studentId))
room.intended.slice(0, 2).forEach((x) => room.removeIntended(x.studentId))
assert(room.intendedCount === 62, `移出 2 人后拟录取 ${room.intendedCount}`)
assert(room.addIntended(pool.slice(0, 2)) === 2, '从面试结果加入 2 人')
assert(room.intendedCount === 64, `加入后拟录取 ${room.intendedCount}`)
assert(room.addIntended(pool.slice(0, 2)) === 0, '重复加入被去重')
assert(room.addAlternates(pool.slice(2, 4)) === 2, '加入 2 名递补')
assert(room.alternates.length === 14 && room.alternates.at(-1).orderNo === 14, '递补顺位续接 13、14')

// 11. 学生确认 / 超时放弃与递补补位
const firstPending = room.intended.find((x) => x.confirmed === 'PENDING')
assert(room.confirmIntention(firstPending.studentId) === true, '模拟学生确认成功')
assert(room.confirmedCount === 55, `确认人数 ${room.confirmedCount}`)
const altBefore = room.alternates.length
const nextPending = room.intended.find((x) => x.confirmed === 'PENDING')
const abandonResult = room.abandonIntention(nextPending.studentId)
assert(!!abandonResult?.promoted, '放弃后自动补入递补第 1 位')
assert(room.abandonedCount === 1, '放弃记录单独留档')
assert(room.intendedCount === 64, `名单长度仍为 ${room.intendedCount}`)
assert(room.confirmedCount === 55, '确认人数不变（补位学生待确认）')
assert(room.alternates.length === altBefore - 1, '递补减少 1 人')
assert(abandonResult.promoted.confirmed === 'PENDING', '补位学生状态为待确认')
assert(room.alternates.every((a, i) => a.orderNo === i + 1), '补位后顺位重排连续')

// 12. 阶段门禁
const stage = useStageStore()
assert(stage.strict === true, '默认严格模式')
assert(stage.canWrite(5) === false, '默认严格模式下非当前阶段不可写')
const clock = useClockStore()
stage.setStrict(true)
clock.setDemoNow('2026-11-04T10:00:00')
stage.setDemoStage(5)
assert(stage.canWrite(5) === false, '上一阶段评价未完成，阶段 5 不可写')
clock.setDemoNow('2026-11-04T13:00:00')
stage.setDemoStage(6)
assert(stage.canWrite(6) === false, '确认未完成，阶段 6 不可写')
stage.setStrict(false)

// 13. 提交快照
sub.reset()
assert(sub.submit(room) === true, '重新提交成功')
assert(sub.payload?.counts.intended === room.intendedCount, '快照包含拟录取统计')
assert(sub.payload?.counts.alternate === room.alternates.length, '快照包含递补统计')
assert(sub.payload?.adjustments.length === room.selectedCount, '快照包含调剂明细')

// 14. 候选池与名单联动（防止一人同时出现在拟录取与调剂池）
room.resetAll()
sub.reset()
const c0 = room.candidates[0]
room.setCandidateSelected(c0.studentId, true)
assert(room.selectedCount === 1, '候选可选中')
room.addIntended([{ studentId: c0.studentId, studentNumber: c0.studentNumber, realName: c0.realName, total: 80 }])
assert(!room.candidates.some((c) => c.studentId === c0.studentId), '加入拟录取后自动移出候选池')
assert(room.selectedCount === 0, '选中状态同步清空')

// 15. 操作日志
const { useLogsStore } = await server.ssrLoadModule('/src/stores/logs.js')
const logs = useLogsStore()
logs.clear()
const pendingForLog = room.intended.find((x) => x.confirmed === 'PENDING')
room.confirmIntention(pendingForLog.studentId)
assert(logs.total === 1 && logs.entries[0].type === 'CONFIRM', '学生确认写入操作日志')
logs.clear()
assert(sub.submit(room) === true, '再次提交用于日志验证')
assert(logs.entries.some((e) => e.type === 'SUBMIT'), '提交审核写入操作日志')

// 16. 多实训室隔离（切换后各室数据独立）
room.resetAll()
itv.resetAll()
sub.reset()
assert(room.labId === 1 && room.applicationsTotal === 199, `lab1 报名 ${room.applicationsTotal}`)
assert(room.switchLab(2) === true, '切换到 lab2')
itv.switchLab(2)
sub.switchLab(2)
assert(room.labId === 2 && room.applicationsTotal === 200, `lab2 报名 ${room.applicationsTotal}`)
assert(room.quota === 64 && room.intended.length === 64 && room.alternates.length === 12, 'lab2 名单独立生成')
assert(itv.records.length === 220, `lab2 面试记录 ${itv.records.length}`)
assert(sub.status === 'DRAFT' && sub.labId === 2, 'lab2 提交状态独立')
room.switchLab(1)
itv.switchLab(1)
sub.switchLab(1)
assert(room.labId === 1 && room.applicationsTotal === 199, '切回 lab1 数据未串')
assert(itv.records.length === 219, `lab1 面试记录 ${itv.records.length}`)
assert(sub.labId === 1, '提交状态回到 lab1')

// 17. 授权实训室与切换
const auth = useAuthStore()
auth.login({
  role: 'LAB_LEADER',
  realName: '王老师',
  laboratoryId: 1,
  laboratoryName: '智能感知与机器人实训室',
  laboratories: [
    { id: 1, name: '智能感知与机器人实训室' },
    { id: 2, name: '数据智能实训室' }
  ]
})
assert(auth.laboratories.length === 2, '登录返回 2 间授权实训室')
assert(auth.setLab(2) === true && auth.laboratoryId === 2 && auth.laboratoryName === '数据智能实训室', '授权范围内可切换')
assert(auth.setLab(3) === false && auth.laboratoryId === 2, '未授权实训室被拒绝')

// 18. 规则开关（Q6/Q7/Q8）与候选池联动
const cfg = useConfigStore()
cfg.reset()
room.resetAll()
assert(cfg.rules.internalAdjustmentOnlyOwnApplicants === true, '默认仅本室候选')
assert(room.candidates.length === 24 && !room.candidates.some((c) => c.crossLab), '默认候选 24 人且无跨室')
cfg.setRule('internalAdjustmentOnlyOwnApplicants', false)
room.syncCandidatePool()
assert(room.candidates.length === 24, `Q6 关闭仍为 ${room.candidates.length} 人（不拉取其他室）`)
assert(!room.candidates.some((c) => c.crossLab), '不展示跨室候选')
cfg.setRule('internalAdjustmentOnlyOwnApplicants', true)
room.syncCandidatePool()
assert(room.candidates.length === 24 && !room.candidates.some((c) => c.crossLab), '重新开启后回到仅本室')
assert(cfg.setRule('requireStudentConfirmForAdjustment', false) === true, 'Q7 可关闭')
assert(cfg.rules.requireStudentConfirmForAdjustment === false, 'Q7 关闭生效')
assert(cfg.setRule('unknownRule', true) === false, '未知规则被拒绝')
cfg.reset()
assert(cfg.rules.requireStudentConfirmForAdjustment === true, '恢复默认后 Q7 开启')

// 19. 学院审核闭环（含跨实训室审核）
const queue = useReviewQueueStore()
sub.reset()
room.resetAll()
queue.refresh()
assert(queue.pending.length === 0, '初始无待审核提交')
assert(sub.submit(room) === true, '组长提交')
queue.refresh()
assert(queue.pending.length === 1 && queue.pending[0].labId === 1, '提交后进入学院审核队列')
assert(sub.review(1, 'reject') === false, '退回必须填写理由')
assert(sub.review(1, 'reject', '递补顺位需复核') === true, '学院退回成功')
assert(sub.status === 'REJECTED' && sub.rejectReason === '递补顺位需复核', '本室状态同步为退回')
queue.refresh()
assert(queue.pending.length === 0, '退回后移出待审核队列')
assert(sub.submit(room) === true, '退回后重新提交')
queue.refresh()
assert(sub.review(1, 'approve') === true, '学院审核通过')
assert(sub.status === 'APPROVED' && sub.isLocked === true, '通过后本室锁定')
queue.refresh()
assert(queue.pending.length === 0, '通过后移出待审核队列')

// 跨实训室：在 lab2 提交，再由当前处于 lab1 的会话审核
room.switchLab(2)
sub.switchLab(2)
assert(sub.submit(room) === true, 'lab2 提交')
queue.refresh()
assert(queue.pending.some((p) => p.labId === 2), 'lab2 出现在审核队列')
sub.switchLab(1)
assert(sub.review(2, 'approve') === true, '可跨实训室审核')
queue.refresh()
assert(queue.pending.length === 0, '跨室审核后队列清空')
sub.switchLab(2)
assert(sub.status === 'APPROVED', 'lab2 审核结果已落盘')
room.switchLab(1)
sub.switchLab(1)

// 19.1 提交后名单锁定
sub.reset()
room.resetAll()
assert(sub.submit(room) === true, '提交后进入审核')
const lockedPending = room.intended.find((x) => x.confirmed === 'PENDING')
assert(room.confirmIntention(lockedPending.studentId) === false, '提交审核后不能再确认')
sub.reset()

// 20. 取消排期批次
sub.reset()
const pendingRows = itv.records.filter((r) => r.status === 'PENDING').slice(0, 2)
const batch = itv.scheduleStudents(
  pendingRows.map((r) => r.studentId),
  { date: '2026-11-02', time: '14:35', durationMin: 20, location: '实验楼 D101', form: '线下', interviewer: '孙老师' }
)
assert(batch.ok === true && batch.count === 2, '新增一个 2 人批次')
const batchId = itv.schedules.at(-1).id
assert(itv.cancelSchedule(batchId) === true, '取消排期成功')
assert(itv.schedules.every((s) => s.id !== batchId), '批次已移除')
assert(pendingRows.every((r) => itv.byId(r.id).time === '待排期'), '该批学生恢复待排期')

// 21. 关键动作自动生成通知
sub.reset()
auth.setLab(1)
const notes = useNotificationsStore()
notes.clear()
const notePending = room.intended.find((x) => x.confirmed === 'PENDING')
room.confirmIntention(notePending.studentId)
assert(notes.unread === 1 && notes.items[0].type === 'CONFIRM', '学生确认生成通知')
notes.clear()
const notePending2 = room.intended.find((x) => x.confirmed === 'PENDING')
room.abandonIntention(notePending2.studentId)
assert(notes.items.some((n) => n.type === 'ABANDON'), '超时放弃生成通知')

// 22. 操作日志按实训室过滤
const logStore = useLogsStore()
logStore.clear()
const logPending = room.intended.find((x) => x.confirmed === 'PENDING')
room.confirmIntention(logPending.studentId)
assert(logStore.entries[0].labId === 1, '日志记录所属实训室')
assert(logStore.byLab(1).length === 1 && logStore.byLab(2).length === 0, '按实训室过滤日志')
// 22.0 组长清空日志只能清本室，不能删别室记录
auth.setLab(2)
logStore.record('INFO', '第 2 室日志')
assert(logStore.byLab(2).length === 1, '第 2 室日志已写入')
logStore.clear(1)
assert(logStore.byLab(1).length === 0, '清空第 1 室日志')
assert(logStore.byLab(2).length === 1, '第 2 室日志不被误删')
assert(logStore.integrity.ok, '局部清空后剩余日志哈希链完整')
auth.setLab(1)
logStore.clear()

// 22.1 教师归属按实训室解析（P0-2）
assert(teacherIdByName('王老师', 1) === 1, '第 1 室王老师 id=1')
assert(teacherIdByName('王老师', 2) === null, '第 2 室没有同名王老师')

// 22.2 阶段随固定时间内推
clock.setDemoNow('2026-11-04T10:00:00')
assert(stage.syncToClock() === 5 && stage.current.no === 5, '10:00 属于阶段 5')
clock.setDemoNow('2026-11-04T13:00:00')
assert(stage.syncToClock() === 6 && stage.current.no === 6, '13:00 属于阶段 6')

// 23. 复评（多面试官）与排期区间冲突
assert(itv.records.every((r) => !!r.interviewerId), '面试记录均带 interviewerId')
const singleGroup = itv.aggregated.find((g) => g.records.length === 1 && g.records[0].status === 'EVALUATED')
const evalTarget = singleGroup.records[0]
const usedTeacherIds = new Set(itv.byStudent(evalTarget.studentId).map((r) => r.interviewerId))
const otherTeacher = TEACHER_DIRECTORY.find((t) => !usedTeacherIds.has(t.id))
const added = itv.addEvaluation(evalTarget.studentId, otherTeacher.id)
assert(added.ok === true, '新增复评成功')
assert(itv.byStudent(evalTarget.studentId).length >= 2, '同一学生存在多条评价')
const dup = itv.addEvaluation(evalTarget.studentId, otherTeacher.id)
assert(dup.ok === false && dup.reason === 'EXISTS', '同一面试官不能重复评价')

const p1 = itv.records.find((r) => r.status === 'PENDING')
const p2 = itv.records.filter((r) => r.status === 'PENDING')[1]
const s1 = itv.scheduleStudents([p1.studentId], {
  date: '2026-11-02', time: '13:00', durationMin: 20, location: 'A101', form: '线下', interviewer: '王老师'
})
assert(s1.ok === true, '排期 09:00-09:30')
const s2 = itv.scheduleStudents([p2.studentId], {
  date: '2026-11-02', time: '13:10', durationMin: 20, location: 'A101', form: '线下', interviewer: '王老师'
})
assert(s2.ok === false && s2.reason === 'CONFLICT', '区间重叠被拦截')
const s3 = itv.scheduleStudents([p2.studentId], {
  date: '2026-11-02', time: '13:20', durationMin: 10, location: 'A101', form: '线下', interviewer: '王老师'
})
assert(s3.ok === true, '首尾相接不冲突')

// 24. 到期结算：单意向自动确认
sub.reset()
clock.setDemoNow('2026-11-04T13:00:00')
const deadlineKey = '2026-11-04 12:00'
const pendingBefore = room.pendingCount
const confirmedBefore = room.confirmedCount
const settled = room.settleExpired(deadlineKey)
assert(settled.confirmed === pendingBefore && settled.abandoned === 0, `到期后 ${pendingBefore} 个单意向自动确认`)
assert(room.pendingCount === 0 && room.confirmedCount === confirmedBefore + pendingBefore, '确认后无待确认、已确认人数增加')
const settledAgain = room.settleExpired(deadlineKey)
assert(settledAgain.confirmed === settled.confirmed, '重复结算返回同一结果')
assert(room.settlement.snapshot.counts.pending === pendingBefore, '结算快照保留结算前人数')
assert(room.alternatesClosedAt !== '', '结算后递补池标记截止')
const confirmedAfterSettle = room.intended.find((x) => x.confirmed === 'CONFIRMED')
const withdrawAfterSettle = room.withdrawConfirmed(confirmedAfterSettle.studentId, {
  canPromote: true,
  deadline: deadlineKey
})
assert(withdrawAfterSettle.promoted, '结算后退出仍可按规则补位')
assert(room.pendingCount === 1, '补位学生进入待确认')
const resettle = room.settleExpired(deadlineKey)
assert(resettle.confirmed === settled.confirmed + 1, '补结算处理新增待确认')

// 25. 评分权重
const weightRow = itv.records.find((r) => r.status === 'PENDING')
const weightScores = { attitude: 90, logic: 80, programming: 70, timeCommitment: 60, comprehensive: 100 }
const weightOk = itv.saveEvaluation(weightRow.id, {
  scores: weightScores,
  evaluation: '权重测试',
  recommendation: 'ADMIT',
  weights: { attitude: 100, logic: 0, programming: 0, timeCommitment: 0, comprehensive: 0 }
})
assert(weightOk === true && itv.byId(weightRow.id).total === 90, '权重 100/0 时综合分等于学习态度')

// 26. 导出脱敏与范围
const { maskPhone, myStudentIds } = await server.ssrLoadModule('/src/utils/exportScope.js')
assert(maskPhone('13800131000') === '138****1000', '手机号脱敏正确')
const scoped = myStudentIds(itv.records, '王老师')
assert(scoped.size > 0 && scoped.size < itv.studentCount, '普通教师导出范围小于全室')

// 27. 缺勤除名后不能加入名单
room.resetAll()
itv.resetAll()
const excludedRec = itv.records.find((r) => r.status === 'PENDING')
itv.markAbsent(excludedRec.id)
const excludedAfter = itv.byId(excludedRec.id)
assert(room.addIntended([excludedAfter]) === 0, '已除名学生不能加入拟录取')
assert(room.addAlternates([excludedAfter]) === 0, '已除名学生不能加入递补')

// 28. 补位默认可由教师撤销
room.resetAll()
const pendingForPromote = room.intended.find((x) => x.confirmed === 'PENDING')
const promoteResult = room.abandonIntention(pendingForPromote.studentId)
assert(promoteResult.promoted && room.intended.some((x) => x.source === 'ALTERNATE'), '放弃后默认补位')
const promotedId = promoteResult.promoted.studentId
assert(room.undoPromotion(promotedId) === true, '教师可撤销补位')
assert(!room.intended.some((x) => x.studentId === promotedId), '撤销后移出拟录取')
assert(room.alternates[0].studentId === promotedId, '撤销后回到递补第 1 位')

// 29. 权重重算：新旧口径一致
cfg.reset()
cfg.setWeight('attitude', 100)
cfg.setWeight('logic', 0)
cfg.setWeight('programming', 0)
cfg.setWeight('timeCommitment', 0)
cfg.setWeight('comprehensive', 0)
const totalsBeforeRecalc = new Map(itv.records.map((r) => [r.id, r.total]))
itv.recalculateTotals(cfg.weights)
const weightedRow = itv.records.find((r) => r.scores)
assert(weightedRow.total === weightedRow.scores.attitude, '权重重算后总分=学习态度')
assert(itv.lastRecalc && itv.lastRecalc.before.length === itv.records.length, '权重重算保存分数快照')
assert(itv.lastRecalc.before.find((x) => x.id === weightedRow.id).total === totalsBeforeRecalc.get(weightedRow.id), '快照保留变更前总分')
assert(cfg.weightHistory.length >= 1, '权重变更写入历史')
cfg.reset()
itv.recalculateTotals(cfg.weights)

// 30. 通知按用户/实训室过滤
const noteStore = useNotificationsStore()
noteStore.clear()
noteStore.push({ type: 'TEST', title: '本室通知', audience: { labId: 1 } })
noteStore.push({ type: 'TEST', title: '他室通知', audience: { labId: 2 } })
assert(noteStore.visible('LAB_LEADER', 1, '王老师').length === 1, '只看到本室通知')
assert(noteStore.visible('LAB_LEADER', 1, '王老师')[0].title === '本室通知', '通知内容匹配')

// 31. 日志哈希链
logStore.clear()
logStore.record('TEST', '第一条')
logStore.record('TEST', '第二条')
assert(logStore.integrity.ok === true && logStore.integrity.legacy === false, '日志链完整')
logStore.entries[0].message = '被篡改'
assert(logStore.integrity.ok === false, '篡改后完整性失败')

// 32. 已确认退出与补位截止
room.resetAll()
clock.setDemoNow('2026-11-04T10:00:00')
const confirmedRow = room.intended.find((x) => x.confirmed === 'CONFIRMED')
const withdraw1 = room.withdrawConfirmed(confirmedRow.studentId, {
  canPromote: true,
  deadline: '2026-11-04 12:00'
})
assert(withdraw1.promoted && withdraw1.promoted.confirmationDeadline === '2026-11-04 12:00', '确认期内退出默认补位并带截止')
room.resetAll()
const confirmedRow2 = room.intended.find((x) => x.confirmed === 'CONFIRMED')
const vacancyBefore = room.vacancies
const withdraw2 = room.withdrawConfirmed(confirmedRow2.studentId, { canPromote: false })
assert(withdraw2.promoted === null, '过期后不补位')
assert(room.vacancies === vacancyBefore + 1, '过期退出名额转入调剂')

// 33. 复评上限
room.resetAll()
itv.resetAll()
const limitTarget = itv.records.find((r) => r.status === 'EVALUATED')
const used = new Set(itv.byStudent(limitTarget.studentId).map((r) => r.interviewerId))
const candidates = TEACHER_DIRECTORY.filter((t) => !used.has(t.id))
if (candidates[0]) itv.addEvaluation(limitTarget.studentId, candidates[0].id)
if (candidates[1]) itv.addEvaluation(limitTarget.studentId, candidates[1].id)
if (candidates[2]) {
  const third = itv.addEvaluation(limitTarget.studentId, candidates[2].id)
  assert(third.ok === false && third.reason === 'MAX_REACHED', '每名学生最多 2 位面试官')
}

// 34. 整体规模：6 室 / 25 师 / 400 生，一人一室
assert(labs.length === 6, `实训室 ${labs.length} 间`)
assert(teachers.length === 25, `教师 ${teachers.length} 人`)
assert(students.length === 400, `学生 ${students.length} 人`)
assert(teachers.every((t) => demoLabOf(t).id === t.labId), '每个教师账号只映射自己的实训室')
const lab6Teachers = teachers.filter((t) => t.labId === 6).length
assert(lab6Teachers === 5 && labs[5].quota === 80, '第 6 室 5 位教师、名额 80')
assert(teachers.filter((t) => t.labId === 6 && t.isLeader).length === 1, '第 6 室有且仅有一名组长')

room.resetAll()
itv.resetAll()
sub.reset()
assert(room.switchLab(6) === true, '切到第 6 室')
itv.switchLab(6)
sub.switchLab(6)
assert(room.labId === 6 && room.quota === 80, `第 6 室名额 ${room.quota}`)
assert(itv.studentCount === 199, `第 6 室学生 ${itv.studentCount}`)
assert(room.intendedCount === 80 && room.alternates.length === 12, '第 6 室名单独立生成')
room.switchLab(1)
itv.switchLab(1)
sub.switchLab(1)

// 35. 补位超时清理（P1-13）
sub.reset()
room.resetAll()
clock.setDemoNow('2026-11-04T10:00:00')
const promotePending = room.intended.find((x) => x.confirmed === 'PENDING')
const promotedResult = room.abandonIntention(promotePending.studentId, {
  canPromote: true,
  deadline: '2026-11-04 12:00'
})
assert(promotedResult.promoted, '补位生成')
const expiredCount = room.expireStalePromotions(new Date('2026-11-04T13:00:00'))
assert(expiredCount === 1, '补位超时被清理')
assert(!room.intended.some((x) => x.id === promotedResult.promoted.id), '超时补位移出名单')
assert(room.abandoned.some((x) => x.id === promotedResult.promoted.id), '超时补位进入放弃留档')

// 36. 多意向放弃触发本室补位（P1-2）
sub.reset()
room.resetAll()
clock.setDemoNow('2026-11-04T13:00:00')
const multiPending = room.intended.find((x) => x.confirmed === 'PENDING')
room.intended.push({ ...multiPending, id: multiPending.id + 90000 })
const altBeforeMulti = room.alternates.length
const multiSettled = room.settleExpired('2026-11-04 12:00')
assert(multiSettled.abandoned >= 1, '多意向未选部分被放弃')
assert(room.alternates.length === altBeforeMulti - multiSettled.abandoned, '放弃名额触发递补')
assert(room.intended.some((x) => x.source === 'ALTERNATE'), '补位进入本室名单')

// 37. 时间变更申请审批（P1-6 演示闭环）
const tr = useTimeRequestsStore()
tr.clear()
assert(tr.create({ stageNo: 6, proposedStart: '2026-11-04 12:00', proposedEnd: '2026-11-05 20:00', reason: '设备调试' }) === true, '提交时间申请')
assert(tr.create({ stageNo: 6, proposedStart: '2026-11-04 12:00', proposedEnd: '2026-11-05 20:00', reason: '重复' }) === false, '同阶段待审批申请去重')
const trId = tr.entries[0].id
assert(tr.review(trId, 'reject') === false, '退回必须填原因')
assert(tr.review(trId, 'reject', '与学院安排冲突') === true, '退回申请成功')
assert(tr.entries[0].status === 'REJECTED', '申请状态为退回')

// 38. 提交时记录移交名额（P1-7）
sub.reset()
room.resetAll()
assert(sub.submit(room) === true, '提交')
assert(room.handoverRecords.length === 1 && room.handoverRecords[0].vacancy >= 0, '提交写入移交记录')
sub.reset()

// 39. 待评价学生初始为待排期；取消旧批次不误清新安排
itv.resetAll()
assert(itv.records.filter((r) => r.status === 'PENDING').every((r) => r.time === '待排期'), '待评价学生初始待排期')
const ps = itv.records.find((r) => r.status === 'PENDING')
const b1 = itv.scheduleStudents([ps.studentId], {
  date: '2026-11-02', time: '13:00', durationMin: 10, location: 'A', form: '线下', interviewer: '王老师'
})
assert(b1.ok === true, '第一批次排期')
const b2 = itv.scheduleStudents([ps.studentId], {
  date: '2026-11-02', time: '13:40', durationMin: 10, location: 'B', form: '线下', interviewer: '赵老师'
})
assert(b2.ok === true, '改期到第二批次')
const oldBatch = itv.schedules.find((s) => s.date === '2026-11-02' && s.time === '13:00')
assert(itv.cancelSchedule(oldBatch.id) === true, '取消旧批次')
assert(itv.byId(ps.id).time === '2026-11-02 13:40', '取消旧批次不影响新安排')

// 40. 时间申请按室过滤
tr.clear()
auth.setLab(1)
assert(tr.create({ stageNo: 6, proposedStart: '2026-11-04 12:00', proposedEnd: '2026-11-05 20:00', reason: '测试' }) === true, '第 1 室提交申请')
assert(tr.forLab(1).length === 1 && tr.forLab(2).length === 0, '时间申请按实训室隔离')

// 41. 清空日志后新增日志恢复完整性显示
logStore.clear()
assert(logStore.clearedAt !== '', '清空记录时间')
logStore.record('TEST', '清空后的第一条')
assert(logStore.clearedAt === '' && logStore.integrity.ok === true, '新增日志后恢复完整性')

// 42. 时间边界与空递补
assert(isPast('2026-11-04 12:00', new Date('2026-11-04T12:00:00')) === true, '截止瞬间算已截止')
room.resetAll()
sub.reset()
const boundaryPending = room.intended.find((x) => x.confirmed === 'PENDING')
const boundaryPromote = room.abandonIntention(boundaryPending.studentId, {
  canPromote: true,
  deadline: '2026-11-04 12:00'
})
assert(boundaryPromote.promoted, '补位生成')
assert(room.expireStalePromotions(new Date('2026-11-04T12:00:00')) === 1, '截止瞬间补位即过期')

room.resetAll()
sub.reset()
room.alternates = []
const noAltPending = room.intended.find((x) => x.confirmed === 'PENDING')
const noAltResult = room.abandonIntention(noAltPending.studentId, { canPromote: true })
assert(noAltResult.promoted === null, '无递补时不补位')
assert(room.alternates.length === 0, '递补仍为空')

// 43. 通知角色隔离
noteStore.clear()
noteStore.push({ type: 'TEST', title: '仅组长', audience: { labId: 1, role: 'LAB_LEADER' } })
assert(noteStore.visible('LAB_LEADER', 1, '王老师').length === 1, '组长可见')
assert(noteStore.visible('LAB_TEACHER', 1, '赵老师').length === 0, '普通教师不可见')

// 44. 最终名单保留递补来源
sub.reset()
room.resetAll()
const srcPending = room.intended.find((x) => x.confirmed === 'PENDING')
const srcPromote = room.abandonIntention(srcPending.studentId, {
  canPromote: true,
  deadline: '2026-11-04 12:00'
})
assert(srcPromote.promoted, '产生补位')
room.confirmIntention(srcPromote.promoted.studentId)
const finalRow = room.finalRows.find((x) => x.studentId === srcPromote.promoted.studentId)
assert(finalRow && finalRow.source === 'ALTERNATE', '最终名单保留递补补位来源')

// 44.5 时间申请：不同实训室同阶段可各自提交
tr.clear()
auth.setLab(1)
tr.create({ stageNo: 6, proposedStart: '2026-11-04 12:00', proposedEnd: '2026-11-05 20:00', reason: '一室' })
auth.setLab(2)
assert(tr.create({ stageNo: 6, proposedStart: '2026-11-04 12:00', proposedEnd: '2026-11-05 20:00', reason: '二室' }) === true, '不同实训室可各自提交同阶段申请')
assert(tr.forLab(1).length === 1 && tr.forLab(2).length === 1, '两室申请互不覆盖')
auth.setLab(1)

// 45. 结算后名额为 0 不可选；退出产生空缺后可勾选
sub.reset()
room.resetAll()
clock.setDemoNow('2026-11-04T13:00:00')
room.settleExpired('2026-11-04 12:00')
assert(room.vacancies === 0, '结算后空缺 0')
const candAfterSettle = room.candidates[0]
assert(room.setCandidateSelected(candAfterSettle.studentId, true) === false, '空缺 0 时不可选')
const confirmedToLeave = room.intended.find((x) => x.confirmed === 'CONFIRMED')
room.withdrawConfirmed(confirmedToLeave.studentId, { canPromote: false })
assert(room.vacancies === 1, '退出后空缺 1')
assert(room.setCandidateSelected(candAfterSettle.studentId, true) === true, '有空缺后可勾选')
assert(room.selectedCount === 1, '已选 1 人')

await server.close()
console.log('\n== 冒烟测试结束 ==')
