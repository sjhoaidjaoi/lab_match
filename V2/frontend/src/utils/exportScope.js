export function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export function watermarkLine(operator, role, extra = '') {
  const time = new Date().toLocaleString('zh-CN', { hour12: false })
  return `# 导出人：${operator}（${role}）｜${time}｜${extra}`
}

/** 普通教师只能看到/导出自己面试过的学生 */
export function myStudentIds(interviews, teacherName) {
  return new Set(interviews.filter((r) => r.interviewer === teacherName).map((r) => r.studentId))
}
