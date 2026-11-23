const { poolCandidates } = require('../utils/allocationPool')
// ============ E宝 助手：数据库事实快照 ============
// 目的只有一个：让大模型「照着数据库回答」，而不是照着语言习惯编答案。
//
// 做法：每次提问现算一份紧凑的、按角色裁剪的事实清单，塞进 system prompt。
//   - 数字全部来自 store（名额口径复用 utils/labQuota.js，与学院端页面完全一致）
//   - 时间统一格式化成「MM-DD HH:mm」，避免模型自己推算日期
//   - 只给当前角色有权查看的范围，越权数据根本不进 prompt（也就无从泄露）
//
// 约定：凡是数据库里没有的，这里就不出现；prompt 里明确要求「没有就答查不到」。
// 不要为了「答案好看」在这里补默认值或示例数字。

const {
  currentBatch,
  batchStages,
  resolveCurrentStage,
  STAGE_STATUS_LABELS,
  BATCH_STATUS_LABELS
} = require('../utils/recruitment')
const { labName, labSurplus } = require('../utils/labQuota')
const { collectConfirmed } = require('../utils/finalSync')
const rounds = require('../utils/rounds')
const { ROLES } = require('../middleware/auth')

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmtTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function nowText(now = Date.now()) {
  const date = new Date(now)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function stageBlock(store, batch) {
  const stages = batchStages(store, batch.id)
  if (!stages.length) return ['阶段：本批次还没有配置阶段时间窗']
  const current = resolveCurrentStage(stages)
  const list = stages
    .map((stage) => `${stage.stageNumber}${stage.stageName} ${STAGE_STATUS_LABELS[stage.stageStatus] || stage.stageStatus}`)
    .join('｜')
  const lines = [`阶段一览：${list}`]
  if (current) {
    const from = fmtTime(current.startTime)
    const to = fmtTime(current.endTime)
    const window = from && to ? `${from} 至 ${to}` : '时间窗未设置'
    lines.unshift(`当前阶段：第 ${current.stageNumber}/${stages.length} 阶段「${current.stageName}」，${
      STAGE_STATUS_LABELS[current.stageStatus] || current.stageStatus}，${window}`)
  }
  return lines
}

function roleCounts(store) {
  const tally = { [ROLES.STUDENT]: 0, [ROLES.LAB_TEACHER]: 0, [ROLES.LAB_LEADER]: 0, [ROLES.COLLEGE_ADMIN]: 0 }
  ;(store.users || []).forEach((user) => {
    if (user.deletedAt) return
    if (tally[user.role] != null) tally[user.role] += 1
  })
  return `账号规模：学生 ${tally[ROLES.STUDENT]}，实训室教师 ${tally[ROLES.LAB_TEACHER]}，` +
    `实训室组长 ${tally[ROLES.LAB_LEADER]}，学院管理员 ${tally[ROLES.COLLEGE_ADMIN]}`
}

function quotaLine(lab) {
  return `计划 ${lab.plan}，已录取 ${lab.admitted}，待确认 ${lab.pending}，剩余 ${lab.remaining}`
}

function labQuotaLines(surplus, batch) {
  if (!surplus.labs.length) return ['实训室：当前没有在用实训室']
  const lines = [`实训室名额（在用 ${surplus.labs.length} 间，学年 ${batch.academicYear || '未设置'}）：`]
  surplus.labs.forEach((lab) => lines.push(`- ${lab.name}：${quotaLine(lab)}`))
  const totals = surplus.totals
  lines.push(`合计：${quotaLine(totals)}`)
  return lines
}

function studentBlock(store, batch, uid, surplus) {
  const lines = []
  const labOf = (id) => labName((store.laboratories || []).find((lab) => Number(lab.id) === Number(id)))
  const teacherOf = (id) => (store.labTeachers || []).find((row) => Number(row.id) === Number(id))?.name || ''

  const prefs = (store.studentPreferences || [])
    .filter((row) => Number(row.batchId) === Number(batch.id) && Number(row.studentId) === Number(uid))
    .filter((row) => row.status === 'SUBMITTED')
  if (!prefs.length) {
    lines.push('我的志愿：本批次还没有提交过志愿')
  } else {
    const byRound = new Map()
    prefs.forEach((row) => {
      const round = rounds.roundOf(row)
      if (!byRound.has(round)) byRound.set(round, [])
      byRound.get(round).push(row)
    })
    const text = [...byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, rows]) => `第 ${round} 轮 ${rows.length} 个（${rows.map((row) => {
        const teacher = teacherOf(row.labTeacherId)
        return `${labOf(row.laboratoryId)}${teacher ? ` / 导师 ${teacher}` : ''}`
      }).join('；')}）`)
      .join('；')
    lines.push(`我的志愿：${text}`)
  }

  const interviews = (store.interviews || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.studentId) === Number(uid))
  if (interviews.length) {
    lines.push(`我的面试：共 ${interviews.length} 场（${interviews.map((row) => {
      const status = { SCHEDULED: '待进行', COMPLETED: '已完成', PASSED: '已通过', FAILED: '未通过', ABSENT: '缺考' }[row.interviewStatus] || row.interviewStatus
      const time = fmtTime(row.interviewTime)
      return `${labOf(row.laboratoryId)} ${status}${time ? ` ${time}` : ''}`
    }).join('；')}）`)
  } else {
    lines.push('我的面试：本批次还没有面试记录')
  }

  const { confirmed } = collectConfirmed(store, batch.id)
  const placed = confirmed.get(Number(uid))
  if (placed) {
    const teacher = teacherOf(placed.labTeacherId)
    lines.push(`我的录取状态：已确认被「${labOf(placed.laboratoryId)}」录取${teacher ? `，导师「${teacher}」` : ''}`)
  } else {
    const intention = (store.admissionIntentions || []).find((row) =>
      Number(row.batchId) === Number(batch.id) && Number(row.studentId) === Number(uid) && row.admissionType === 'INTENDED')
    if (intention) {
      const status = { PENDING: '待你确认', CONFIRMED: '已确认', DECLINED: '已放弃', EXPIRED: '已超时' }[intention.status] || intention.status
      lines.push(`我的录取状态：拟录取通知「${labOf(intention.laboratoryId)}」${status}` +
        `${intention.confirmationDeadline ? `，确认截止 ${fmtTime(intention.confirmationDeadline)}` : ''}`)
    } else {
      lines.push('我的录取状态：暂无拟录取或调剂记录')
    }
  }

  const openRound = rounds.openRoundOf(store, batch.id)
  if (openRound && openRound.round > 1 && rounds.supplementWindow(store, batch.id) && !placed) {
    const open = surplus.labs.filter((lab) => lab.remaining > 0).map((lab) => `${lab.name} 剩 ${lab.remaining}`)
    lines.push(`补录：第 ${openRound.round} 轮开放中${open.length ? `，仍有名额的实训室：${open.join('，')}` : '，当前所有实训室都已无名额'}`)
  }
  return lines
}

function labOwnerBlock(store, batch, user, surplus) {
  const lab = surplus.labs.find((item) => Number(item.id) === Number(user.laboratoryId))
  if (!lab) return ['本室：当前账号未绑定到任何在用实训室']
  const lines = [
    `本室：${lab.name}${lab.labCode ? `（编号 ${lab.labCode}）` : ''}${lab.location ? `，${lab.location}` : ''}`,
    `本室名额：${quotaLine(lab)}`
  ]
  if (lab.teachers.length) {
    lines.push(`本室导师名额（${lab.teachers.length} 位）：${lab.teachers.map((teacher) => {
      if (teacher.quota == null) return `${teacher.name} 不限（已录 ${teacher.admitted}）`
      return `${teacher.name} 限 ${teacher.quota}（已录 ${teacher.admitted}，剩 ${teacher.remaining}）`
    }).join('；')}`)
  } else {
    lines.push('本室导师名额：还没有建立教师档案')
  }

  const prefs = (store.studentPreferences || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.laboratoryId) === Number(lab.id) && row.status === 'SUBMITTED')
  const interviews = (store.interviews || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.laboratoryId) === Number(lab.id))
  const done = interviews.filter((row) => ['COMPLETED', 'PASSED', 'FAILED'].includes(row.interviewStatus || '')).length
  const intentions = (store.admissionIntentions || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.laboratoryId) === Number(lab.id) && row.admissionType === 'INTENDED')
  lines.push(`本室志愿申请：${prefs.length} 条；面试：${interviews.length} 场（已完成评分 ${done} 场）；拟录取通知：${intentions.length} 条`)

  const finals = (store.finalAdmissions || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && Number(row.laboratoryId) === Number(lab.id) && row.finalStatus !== 'REJECTED')
  lines.push(`本室最终名单：${finals.length} 人`)

  if (user.activeRole === ROLES.LAB_TEACHER) {
    const mine = interviews.filter((row) => Number(row.interviewerId) === Number(user.uid))
    const waiting = mine.filter((row) => !['COMPLETED', 'PASSED', 'FAILED'].includes(row.interviewStatus || '')).length
    lines.push(`我参与的面试：${mine.length} 场（待评分 ${waiting} 场）`)
  }

  const pool = (store.adjustments || []).filter((row) => Number(row.targetLaboratoryId) === Number(lab.id))
  lines.push(`本室调剂记录：${pool.length} 条`)
  return lines
}

function collegeBlock(store, batch, surplus) {
  const lines = []
  const byLab = surplus.labs.map((lab) => {
    const prefs = (store.studentPreferences || []).filter((row) =>
      Number(row.batchId) === Number(batch.id) && Number(row.laboratoryId) === Number(lab.id) && row.status === 'SUBMITTED')
    const interviews = (store.interviews || []).filter((row) =>
      Number(row.batchId) === Number(batch.id) && Number(row.laboratoryId) === Number(lab.id))
    return `- ${lab.name}：志愿 ${prefs.length} 条，面试 ${interviews.length} 场，剩余 ${lab.remaining}`
  })
  if (byLab.length) {
    lines.push('各实训室进度：')
    lines.push(...byLab)
  }

  const teachers = (store.labTeachers || []).filter((row) => row.status !== 'INACTIVE')
  lines.push(`教师档案：${teachers.length} 位（导师名额在「实训室管理 → 具体实训室 → 教师档案」里维护）`)

  const { confirmed } = collectConfirmed(store, batch.id)
  const finals = (store.finalAdmissions || []).filter((row) =>
    Number(row.batchId) === Number(batch.id) && row.finalStatus !== 'REJECTED')
  lines.push(`最终名单：${finals.length} 人（已确认录取去向 ${confirmed.size} 人）`)

  if (rounds.poolOpen(store, batch.id)) {
    const { rows } = poolCandidates(store, batch)
    lines.push(`调剂池：本室优先 ${rows.filter(row => row.priority === 1).length} 人，跨室可调 ${rows.filter(row => row.priority === 2).length} 人，其余暂时没有符合意愿的去向。`)
  }

  const objections = (store.publicationObjections || []).filter((row) => Number(row.batchId) === Number(batch.id))
  if (objections.length) lines.push(`公示异议：${objections.length} 条`)
  return lines
}

/**
 * 生成供 system prompt 使用的事实清单。
 * @returns {{ text: string, dataAt: string }}
 */
function buildFacts(user, store) {
  const dataAt = nowText()
  const lines = [`【平台数据库实时快照】取数时间 ${dataAt}（以下数字均为系统当前记录，未经此快照确认的数字一律视为不存在）`]
  const batch = currentBatch(store)

  if (!batch) {
    lines.push('批次：当前没有任何批次（学院管理员还没有建立批次），招生流程尚未开始。')
    lines.push(roleCounts(store))
    lines.push(`实训室：${(store.laboratories || []).filter((lab) => (lab.status || 'ACTIVE') === 'ACTIVE').length} 间在用`)
    return { text: lines.join('\n'), dataAt }
  }

  lines.push(`批次：${batch.batchName || `#${batch.id}`}（学年 ${batch.academicYear || '未设置'}，状态：${BATCH_STATUS_LABELS[batch.status] || batch.status}）`)

  const view = rounds.roundView(store, batch.id)
  const openRound = view.open ? `第 ${view.open} 轮开放报名中` : '当前没有开放报名的轮次'
  lines.push(`轮次：已进行到第 ${view.current} 轮（最多 ${view.max} 轮），${openRound}`)

  lines.push(...stageBlock(store, batch))

  const surplus = labSurplus(store, batch)
  lines.push(...labQuotaLines(surplus, batch))

  if (user.activeRole === ROLES.STUDENT) {
    lines.push(...studentBlock(store, batch, user.uid, surplus))
  } else if (user.activeRole === ROLES.COLLEGE_ADMIN) {
    lines.push(...collegeBlock(store, batch, surplus))
  } else {
    lines.push(...labOwnerBlock(store, batch, user, surplus))
  }

  lines.push(roleCounts(store))

  const students = (store.users || []).filter((row) => row.role === ROLES.STUDENT && !row.deletedAt).length
  if (!students) lines.push('注意：平台目前还没有学生账号，学生侧数据均为空，不要假设存在学生或录取记录。')

  return { text: lines.join('\n'), dataAt }
}

module.exports = { buildFacts, nowText }
