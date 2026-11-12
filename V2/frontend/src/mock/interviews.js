import { applicationsOf } from './applications'
import { teachersOf } from './teachers'
import { teacherSlotOf } from './schedule'

const clamp = (n) => Math.max(60, Math.min(100, n))

// 报名即面试：本室全部报名学生，面试官为本室教师轮派；前 70% 已完成评价
export function interviewsOf(labId) {
  const apps = applicationsOf(labId)
  const ts = teachersOf(labId)
  const evaluatedCount = Math.floor(apps.length * 0.7)
  const base = apps.map((a, i) => {
    const evaluated = i < evaluatedCount
    const base = clamp(68 + ((i * 7) % 26))
    const scores = evaluated
      ? {
          attitude: clamp(base + 2),
          logic: clamp(base - 1),
          programming: clamp(base + ((i % 5) - 2)),
          timeCommitment: clamp(base + 1),
          comprehensive: clamp(base)
        }
      : null
    const t = ts[i % ts.length]
    const slot = teacherSlotOf(labId, t.name)
    const [sh, sm] = (slot?.start || '09:00').split(':').map(Number)
    const baseMinutes = sh * 60 + sm + (i % 8) * 5
    const timeText = `${String(Math.floor(baseMinutes / 60)).padStart(2, '0')}:${String(baseMinutes % 60).padStart(2, '0')}`
    return {
      id: Number(labId) * 1000 + i,
      applicationId: a.id,
      studentId: a.studentId,
      studentNumber: a.studentNumber,
      realName: a.realName,
      interviewer: t.name,
      interviewerId: t.id,
      durationMin: 20,
      time: evaluated ? `${slot?.date || '2026-11-03'} ${timeText}` : '待排期',
      location: evaluated ? '实验楼 A301' : '-',
      form: evaluated ? '线下' : '-',
      status: evaluated ? 'EVALUATED' : 'PENDING',
      scores,
      total: evaluated ? Math.round(Object.values(scores).reduce((x, y) => x + y, 0) / 5) : null,
      evaluation: evaluated ? '基础扎实，表达清晰，能保证每周投入时间。' : '',
      recommendation: evaluated ? (i < Math.floor(apps.length * 0.4) ? 'ADMIT' : 'ALTERNATE') : ''
    }
  })

  // 每 10 名学生追加一条“复评”记录（不同面试官），用于组长按学生汇总
  const extras = apps
    .map((a, i) => ({ a, i }))
    .filter(({ i }) => i % 10 === 0)
    .map(({ a, i }) => {
      const t2 = ts[(i + 1) % ts.length]
      const slot2 = teacherSlotOf(labId, t2.name)
      const [h2, m2] = (slot2?.start || '09:00').split(':').map(Number)
      const min2 = h2 * 60 + m2 + (i % 6) * 5
      const time2 = `${String(Math.floor(min2 / 60)).padStart(2, '0')}:${String(min2 % 60).padStart(2, '0')}`
      const b = clamp(66 + ((i * 5) % 30))
      const scores = {
        attitude: clamp(b + 1),
        logic: clamp(b),
        programming: clamp(b - 2),
        timeCommitment: clamp(b + 2),
        comprehensive: clamp(b)
      }
      return {
        id: Number(labId) * 1000 + 500 + i,
        applicationId: a.id,
        studentId: a.studentId,
        studentNumber: a.studentNumber,
        realName: a.realName,
        interviewer: t2.name,
        interviewerId: t2.id,
        durationMin: 20,
        time: `${slot2?.date || '2026-11-03'} ${time2}`,
        location: '实验楼 A302',
        form: '线下',
        status: 'EVALUATED',
        scores,
        total: Math.round(Object.values(scores).reduce((x, y) => x + y, 0) / 5),
        evaluation: '复评：基础扎实，沟通顺畅，方向匹配度较高。',
        recommendation: i < Math.floor(apps.length * 0.4) ? 'ADMIT' : 'ALTERNATE'
      }
    })

  return [...base, ...extras]
}