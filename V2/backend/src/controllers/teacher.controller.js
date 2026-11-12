import { ok } from '../utils/response.js'
import * as service from '../services/teacher.service.js'

// 骨架阶段：直接返回 Mock，字段与 docs/API.md、前端 src/mock 保持一致
const wrap = (handler) => async (req, res, next) => {
  try {
    return ok(res, await handler(req))
  } catch (e) {
    return next(e)
  }
}

export const dashboard = wrap((req) => service.getDashboard(req.labId))
export const applications = wrap((req) => service.listApplications(req.labId, req.query))
export const interviews = wrap((req) => service.listInterviews(req.labId))
export const schedules = wrap((req) => service.saveSchedule(req.labId, req.body))
export const saveEvaluation = wrap((req) => service.saveEvaluation(req.params.id, req.body))
export const admissions = wrap((req) => service.listAdmissions(req.labId))
export const saveAdmissions = wrap((req) => service.saveAdmissions(req.labId, req.body))
export const submitAdmissions = wrap((req) => service.submitAdmissions(req.labId))
export const confirmations = wrap((req) => service.confirmationStats(req.labId))
export const finalList = wrap((req) => service.finalList(req.labId))

export const roomSummary = wrap((req) => service.roomSummary(req.labId))
export const roomTeachers = wrap((req) => service.roomTeachers(req.labId))
export const vacancies = wrap((req) => service.vacancies(req.labId))
export const adjustmentCandidates = wrap((req) => service.adjustmentCandidates(req.labId))
export const saveAdjustments = wrap((req) => service.saveAdjustments(req.labId, req.body))
export const submitAdjustments = wrap((req) => service.submitAdjustments(req.labId))
export const submissionState = wrap((req) => service.submissionState(req.labId))
export const submitToCollege = wrap((req) => service.submitToCollege(req.labId))
