import { students } from './students'

// 某实训室的报名记录：志愿中包含该室的学生（每室约 200 人）
export function applicationsOf(labId) {
  return students
    .filter((s) => s.preferences.some((p) => p.labId === Number(labId)))
    .map((s, i) => ({
      id: i + 1,
      studentId: s.id,
      studentNumber: s.studentNumber,
      realName: s.realName,
      phone: s.phone,
      preferences: s.preferences,
      obeyInternal: s.obeyInternal,
      obeyCollege: s.obeyCollege,
      submittedAt: `2026-11-02 0${8 + (i % 2)}:${String(10 + (i % 40)).padStart(2, '0')}`,
      status: 'SUBMITTED'
    }))
}