import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { requireStage } from '../middleware/stage.js'
import * as ctrl from '../controllers/teacher.controller.js'

const router = Router()
const teacherOnly = requireRole('LAB_TEACHER', 'LAB_LEADER')
const leaderOnly = requireRole('LAB_LEADER')

router.use(authenticate)

// ---- 教师端 ----
router.get('/dashboard', teacherOnly, ctrl.dashboard)
router.get('/applications', teacherOnly, ctrl.applications)
router.get('/interviews', teacherOnly, ctrl.interviews)
router.post('/interviews/schedules', teacherOnly, requireStage(4), ctrl.schedules)
router.put('/interviews/:id/evaluation', teacherOnly, requireStage(4), ctrl.saveEvaluation)
router.get('/admissions', teacherOnly, ctrl.admissions)
router.put('/admissions', teacherOnly, requireStage(5), ctrl.saveAdmissions)
router.post('/admissions/submit', teacherOnly, requireStage(5), ctrl.submitAdmissions)
router.get('/confirmations/stats', teacherOnly, ctrl.confirmations)
router.get('/final', teacherOnly, ctrl.finalList)

// ---- 组长增量 ----
router.get('/room/summary', leaderOnly, ctrl.roomSummary)
router.get('/room/teachers', leaderOnly, ctrl.roomTeachers)
router.get('/room/vacancies', leaderOnly, ctrl.vacancies)
router.get('/room/adjustments/candidates', leaderOnly, ctrl.adjustmentCandidates)
router.post('/room/adjustments', leaderOnly, requireStage(6), ctrl.saveAdjustments)
router.post('/room/adjustments/submit', leaderOnly, requireStage(6), ctrl.submitAdjustments)
router.get('/room/submission', leaderOnly, ctrl.submissionState)
router.post('/room/submission', leaderOnly, requireStage(6), ctrl.submitToCollege)

export default router
