import { teachersOf } from './teachers'

/**
 * 理想化面试时段：
 * 6 个实训室按时间梯度错开，互不重叠；每室教师再平分本室时段。
 * 目的：学生即使同时报多个室，也不会撞车；教师只在自己的时段面试。
 * 真实实现应由学院端排期服务下发。
 */
export const LAB_SLOTS = {
  1: { date: '2026-11-02', start: '13:00', end: '15:00' },
  2: { date: '2026-11-02', start: '15:00', end: '17:00' },
  3: { date: '2026-11-02', start: '17:00', end: '19:00' },
  4: { date: '2026-11-03', start: '09:00', end: '11:00' },
  5: { date: '2026-11-03', start: '11:00', end: '13:00' },
  6: { date: '2026-11-03', start: '14:00', end: '16:00' }
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function toTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function labSlotOf(labId) {
  return LAB_SLOTS[Number(labId)] || null
}

/** 每位教师在本室时段内的专属区间 */
export function teacherSlotOf(labId, teacherName) {
  const lab = labSlotOf(labId)
  if (!lab) return null
  const teachers = teachersOf(labId)
  const index = teachers.findIndex((t) => t.name === teacherName)
  if (index < 0) return null
  const start = toMinutes(lab.start)
  const end = toMinutes(lab.end)
  const per = Math.max(10, Math.floor((end - start) / teachers.length))
  const slotStart = start + index * per
  const slotEnd = index === teachers.length - 1 ? end : slotStart + per
  return { date: lab.date, start: toTime(slotStart), end: toTime(slotEnd) }
}

export function withinTeacherSlot(labId, teacherName, date, time, durationMin = 20) {
  const slot = teacherSlotOf(labId, teacherName)
  if (!slot) return false
  if (slot.date !== date) return false
  const start = toMinutes(time)
  const end = start + Math.max(5, Number(durationMin) || 20)
  return start >= toMinutes(slot.start) && end <= toMinutes(slot.end)
}
