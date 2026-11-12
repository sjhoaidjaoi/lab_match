import { applicationsOf } from './applications'
import { interviewsOf } from './interviews'
import { admissionsOf, confirmationStats } from './admissions'

const CANDIDATE_LIMIT = 24

// 候选池：本室面试过 + 未被正式录取 + 服从内部调剂（展示前 24 人）
export function candidatesOf(labId) {
  const apps = applicationsOf(labId)
  const interviews = interviewsOf(labId)
  const { intended, alternates } = admissionsOf(labId)
  const occupied = new Set([...intended, ...alternates].map((x) => x.studentId))
  const excluded = new Set(interviews.filter((r) => r.excluded).map((r) => r.studentId))

  return apps
    .filter((a) => !occupied.has(a.studentId) && !excluded.has(a.studentId) && a.obeyInternal)
    .slice(0, CANDIDATE_LIMIT)
    .map((a) => {
      const itv = interviews.find((x) => x.studentId === a.studentId)
      return {
        studentId: a.studentId,
        studentNumber: a.studentNumber,
        realName: a.realName,
        total: itv?.total ?? null,
        evaluation: itv?.evaluation || '尚未评价',
        obeyInternal: a.obeyInternal,
        obeyCollege: a.obeyCollege,
        reason: ''
      }
    })
}

export const candidates = candidatesOf(1)

export const adjustmentPlan = {
  vacancy: confirmationStats.vacancy,
  selected: [],
  status: 'DRAFT',
  submittedAt: ''
}

// 学生二次确认（业务规则待学院确认，先保留中间态）
export const adjustmentConfirmations = []
