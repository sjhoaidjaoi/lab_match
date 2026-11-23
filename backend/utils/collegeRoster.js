const byName = new Intl.Collator('zh-CN', { numeric: true })

function buildCollegeRoster(store, batchId) {
  const labs = new Map(store.laboratories.map(lab => [lab.id, lab.name]))
  const teachers = new Map(store.labTeachers.map(teacher => [teacher.id, teacher]))
  const finals = new Map()
  for (const row of store.finalAdmissions) {
    if (row.batchId !== batchId || !['ADMITTED', 'ENROLLED'].includes(row.finalStatus)) continue
    if (finals.get(row.studentId)?.finalStatus !== 'ENROLLED') finals.set(row.studentId, row)
  }
  const entries = store.users.filter(user => user.role === 'STUDENT').map(user => {
    const final = finals.get(user.id)
    const teacher = teachers.get(final?.labTeacherId)
    return {
      studentId: user.id, studentName: user.realName, studentNumber: user.studentNumber || user.username,
      laboratoryId: final?.laboratoryId ?? null, laboratoryName: labs.get(final?.laboratoryId) || '',
      labTeacherId: teacher && teacher.laboratoryId === final?.laboratoryId ? teacher.id : null,
      teacherName: teacher && teacher.laboratoryId === final?.laboratoryId ? teacher.name : '',
      finalStatus: final?.finalStatus || 'UNPLACED'
    }
  })
  return entries.sort((a, b) =>
    Number(a.laboratoryId == null) - Number(b.laboratoryId == null) ||
    byName.compare(a.laboratoryName, b.laboratoryName) || a.laboratoryId - b.laboratoryId ||
    Number(a.labTeacherId == null) - Number(b.labTeacherId == null) ||
    byName.compare(a.teacherName, b.teacherName) || a.labTeacherId - b.labTeacherId ||
    byName.compare(a.studentNumber, b.studentNumber) || a.studentId - b.studentId)
}

module.exports = { buildCollegeRoster }
