/**
 * 骨架阶段返回与前端 src/mock 同构的数据结构。
 * 第二阶段替换为 SQL 查询，保持函数签名与返回字段不变。
 */
const MOCK = {
  applications: { total: 18, evaluated: 14, intended: 10, confirmed: 8, vacancy: 2 },
  final: []
}

export async function getDashboard(labId) {
  return { labId, ...MOCK.applications }
}

export async function listApplications(labId, query = {}) {
  return { labId, list: [], total: 0, page: Number(query.page || 1), pageSize: Number(query.pageSize || 20) }
}

export async function listInterviews(labId) {
  return { labId, list: [] }
}

export async function saveSchedule(labId, body) {
  // TODO: 校验 studentIds、面试官同日同时段冲突
  return { labId, saved: true, ...body }
}

export async function saveEvaluation(interviewId, body) {
  return { interviewId, ...body }
}

export async function listAdmissions(labId) {
  return { labId, intended: [], alternate: [] }
}

export async function saveAdmissions(labId, body) {
  return { labId, saved: true, ...body }
}

export async function submitAdmissions(labId) {
  return { labId, status: 'REVIEWING' }
}

export async function confirmationStats(labId) {
  return { labId, quota: 10, confirmed: 8, pending: 2, abandoned: 0, vacancy: 2 }
}

export async function finalList(labId) {
  return { labId, list: [] }
}

export async function roomSummary(labId) {
  return { labId, applications: 18, evaluated: 14, intended: 10, confirmed: 8, vacancy: 2 }
}

export async function roomTeachers(labId) {
  return { labId, list: [] }
}

export async function vacancies(labId) {
  return { labId, vacancy: 2 }
}

export async function adjustmentCandidates(labId) {
  return { labId, list: [] }
}

export async function saveAdjustments(labId, body) {
  return { labId, saved: true, ...body }
}

export async function submitAdjustments(labId) {
  return { labId, status: 'REVIEWING' }
}

export async function submissionState(labId) {
  return { labId, status: 'DRAFT', submittedAt: null }
}

export async function submitToCollege(labId) {
  return { labId, status: 'REVIEWING' }
}
