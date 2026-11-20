// ============ 实训室资料统一管理：公共口径 ============
// 学院端是实训室基础资料、教师团队、招生名额的唯一维护入口；
// 组长端 / 教师端 / 学生端只读取同一份数据。

const { currentBatch } = require('./applicationScope')

// 基础资料字段（学院管理员可维护）
const PROFILE_TEXT_FIELDS = [
  'name', 'college', 'location', 'description', 'detail',
  'researchDirection', 'projectDirection', 'technologyStack',
  'features', 'achievements', 'equipment', 'contact', 'remark'
]

// 教师资料字段（学院管理员可维护）
const TEACHER_TEXT_FIELDS = [
  'name', 'employeeNo', 'gender', 'title', 'degree',
  'direction', 'project', 'intro', 'email', 'office', 'photoUrl', 'remark'
]

// 资料完善度考核的关键字段（用于总览页百分比）
const COMPLETENESS_FIELDS = [
  'labCode', 'name', 'college', 'location', 'description', 'detail',
  'researchDirection', 'projectDirection', 'features', 'achievements',
  'equipment', 'contact'
]

const TEACHER_IDENTITIES = { LEADER: 'LEADER', TEACHER: 'TEACHER' }

const DEFAULT_ACADEMIC_YEAR = '2026-2027'

/** 当前学年：以进行中批次的学年为准，避免各端各自推断 */
function currentAcademicYear(store) {
  const batch = currentBatch(store)
  const year = batch?.academicYear
  if (typeof year === 'string' && /^\d{4}-\d{4}$/.test(year.trim())) return year.trim()
  return DEFAULT_ACADEMIC_YEAR
}

/** 可选学年列表：批次学年 + 已有计划学年 + 当前学年，倒序 */
function academicYears(store) {
  const set = new Set()
  const push = (year) => {
    if (typeof year === 'string' && /^\d{4}-\d{4}$/.test(year.trim())) set.add(year.trim())
  }
  ;(store.recruitmentBatches || []).forEach((batch) => push(batch.academicYear))
  ;(store.labYearlyPlans || []).forEach((plan) => push(plan.academicYear))
  ;(store.teacherYearlyQuotas || []).forEach((row) => push(row.academicYear))
  push(currentAcademicYear(store))
  return [...set].sort().reverse()
}

/** 学年兜底：非法或不存在的学年回落到当前学年 */
function normalizeYear(store, value) {
  const year = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-\d{4}$/.test(year) ? year : currentAcademicYear(store)
}

/** 学年对应批次（用于统计已录取人数） */
function batchOfYear(store, year) {
  const list = store.recruitmentBatches || []
  return list.filter((batch) => batch.academicYear === year).sort((a, b) => (a.id || 0) - (b.id || 0)).pop() || null
}

/** 实训室展示名：名称为空时用「编号 + 实训室」，不编造内容 */
function displayName(lab) {
  if (!lab) return ''
  const name = (lab.name || '').trim()
  if (name) return name
  const code = (lab.labCode || '').trim()
  return code ? `${code} 实训室` : '未命名实训室'
}

/** 实训室资料完善度（0-100） */
function completenessOf(lab) {
  if (!lab) return 0
  const total = COMPLETENESS_FIELDS.length
  const filled = COMPLETENESS_FIELDS.filter((field) => String(lab[field] ?? '').trim().length > 0).length
  return Math.round((filled / total) * 100)
}

/** 该实训室已录取人数（按批次） */
function enrolledOf(store, laboratoryId, batchId) {
  if (!batchId) return 0
  return (store.finalAdmissions || []).filter((item) =>
    item.batchId === batchId && item.laboratoryId === laboratoryId &&
    !['REJECTED', 'WITHDRAWN'].includes(item.finalStatus)
  ).length
}

/** 该教师已录取人数：按拟录取/最终名单中落到该导师的记录统计 */
function teacherEnrolledOf(store, teacherId, batchId) {
  if (!batchId) return 0
  const intentions = (store.admissionIntentions || []).filter((item) =>
    item.batchId === batchId && item.labTeacherId === teacherId &&
    ['PENDING', 'CONFIRMED'].includes(item.status)
  ).length
  return intentions
}

/**
 * 学年总名额：计划表优先。
 * 只有「当前学年」才回落实训室历史字段（旧数据兼容，且写入时已同步）；
 * 其他学年无计划即视为未设置（0），避免把今年名额错当成往年名额。
 */
function totalQuotaOf(store, lab, year) {
  const plan = (store.labYearlyPlans || []).find((item) =>
    item.laboratoryId === lab.id && item.academicYear === year)
  if (plan) return Math.max(0, Number(plan.totalQuota) || 0)
  if (year === currentAcademicYear(store)) return Math.max(0, Number(lab.recruitmentQuota) || 0)
  return 0
}

/** 教师学年名额：口径与实训室总名额一致，仅当前学年回落历史字段 */
function teacherQuotaOf(store, teacher, year) {
  const row = (store.teacherYearlyQuotas || []).find((item) =>
    item.labTeacherId === teacher.id && item.academicYear === year)
  if (row) return Math.max(0, Number(row.quota) || 0)
  if (year === currentAcademicYear(store)) return Math.max(0, Number(teacher.recruitmentQuota) || 0)
  return 0
}

/** 某实训室当年已分配教师名额合计 */
function allocatedQuotaOf(store, laboratoryId, year) {
  return (store.labTeachers || [])
    .filter((item) => item.laboratoryId === laboratoryId && item.status !== 'INACTIVE' && !item.deletedAt)
    .reduce((sum, item) => sum + teacherQuotaOf(store, item, year), 0)
}

/** 全字段补齐：空值统一为 ''，避免前端 undefined */
function normalizeLab(lab) {
  const next = { ...lab }
  PROFILE_TEXT_FIELDS.forEach((field) => {
    if (typeof next[field] !== 'string') next[field] = next[field] == null ? '' : String(next[field])
  })
  if (typeof next.labCode !== 'string') next.labCode = next.labCode == null ? '' : String(next.labCode)
  if (typeof next.recruitmentQuota !== 'number') next.recruitmentQuota = Number(next.recruitmentQuota) || 0
  return next
}

function normalizeTeacher(teacher, store, year) {
  const next = { ...teacher }
  TEACHER_TEXT_FIELDS.forEach((field) => {
    if (typeof next[field] !== 'string') next[field] = next[field] == null ? '' : String(next[field])
  })
  return {
    ...next,
    identity: next.identity === TEACHER_IDENTITIES.LEADER ? TEACHER_IDENTITIES.LEADER : TEACHER_IDENTITIES.TEACHER,
    quota: year ? teacherQuotaOf(store, next, year) : Math.max(0, Number(next.recruitmentQuota) || 0),
    active: next.status !== 'INACTIVE' && !next.deletedAt
  }
}

module.exports = {
  PROFILE_TEXT_FIELDS,
  TEACHER_TEXT_FIELDS,
  COMPLETENESS_FIELDS,
  TEACHER_IDENTITIES,
  DEFAULT_ACADEMIC_YEAR,
  currentAcademicYear,
  academicYears,
  normalizeYear,
  batchOfYear,
  displayName,
  completenessOf,
  enrolledOf,
  teacherEnrolledOf,
  totalQuotaOf,
  teacherQuotaOf,
  allocatedQuotaOf,
  normalizeLab,
  normalizeTeacher
}
