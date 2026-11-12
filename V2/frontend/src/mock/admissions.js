import { applicationsOf } from './applications'
import { labs } from './labs'

// 按实训室生成拟录取 / 递补数据：名额 = 本室教师数 × 16
export function admissionsOf(labId) {
  const lab = labs.find((l) => l.id === Number(labId)) || labs[0]
  const quota = lab.quota
  const apps = applicationsOf(lab.id)

  // 演示口径：87.5% 名额已确认，其余待确认；递补固定 12 人
  const CONFIRMED_COUNT = Math.round(quota * 0.875)
  const ALTERNATE_COUNT = 12

  const intended = apps.slice(0, quota).map((a, i) => ({
    id: lab.id * 10000 + i,
    studentId: a.studentId,
    studentNumber: a.studentNumber,
    realName: a.realName,
    total: 88 - Math.floor(i / 8),
    confirmed: i < CONFIRMED_COUNT ? 'CONFIRMED' : 'PENDING',
    admissionType: 'INTENDED'
  }))

  const alternates = apps.slice(quota, quota + ALTERNATE_COUNT).map((a, i) => ({
    id: lab.id * 10000 + 1000 + i,
    studentId: a.studentId,
    studentNumber: a.studentNumber,
    realName: a.realName,
    total: 79 - Math.floor(i / 3),
    orderNo: i + 1,
    admissionType: 'ALTERNATE'
  }))

  const confirmationStats = {
    quota,
    intendedCount: intended.length,
    confirmedCount: intended.filter((x) => x.confirmed === 'CONFIRMED').length,
    pendingCount: intended.filter((x) => x.confirmed === 'PENDING').length,
    abandonedCount: intended.filter((x) => x.confirmed === 'ABANDONED').length,
    vacancy: quota - intended.filter((x) => x.confirmed === 'CONFIRMED').length
  }

  return { intended, alternates, confirmationStats }
}

// 兼容旧引用：默认演示室 lab 1
const lab1 = admissionsOf(1)
export const intended = lab1.intended
export const alternates = lab1.alternates
export const confirmationStats = lab1.confirmationStats
export const submitState = { status: 'DRAFT', submittedAt: '', reviewer: '学院教学办' }
