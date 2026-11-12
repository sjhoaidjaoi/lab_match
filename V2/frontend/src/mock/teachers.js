// 25 名教师：5 个实训室各 4 人 + 1 个实训室 5 人；每人招募 16 人；每室首位教师为组长
const LAB_TEACHER_NAMES = {
  1: ['王老师', '赵老师', '钱老师', '孙老师'],
  2: ['李老师', '周老师', '吴老师', '郑老师'],
  3: ['陈老师', '冯老师', '褚老师', '卫老师'],
  4: ['蒋老师', '沈老师', '韩老师', '杨老师'],
  5: ['朱老师', '秦老师', '尤老师', '许老师'],
  6: ['何老师', '吕老师', '施老师', '张老师', '孔老师']
}

export const TEACHER_QUOTA = 16

let seq = 0
export const teachers = Object.entries(LAB_TEACHER_NAMES).flatMap(([labId, names]) =>
  names.map((name, i) => ({
    id: ++seq,
    labId: Number(labId),
    name,
    isLeader: i === 0,
    quota: TEACHER_QUOTA
  }))
)

export const teachersOf = (labId) => teachers.filter((t) => t.labId === Number(labId))

// 教师目录：前端演示用。真实实现应使用登录返回的用户 id。
export const TEACHER_DIRECTORY = teachers.map((t) => ({
  id: t.id,
  name: t.name,
  labId: t.labId,
  isLeader: t.isLeader
}))

export const teacherIdByName = (name, labId) =>
  TEACHER_DIRECTORY.find((t) => t.name === name && (labId === undefined || t.labId === Number(labId)))?.id ?? null