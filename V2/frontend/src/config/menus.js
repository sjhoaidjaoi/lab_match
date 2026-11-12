// 菜单配置：一个工作台，按角色过滤；leaderOnly 的菜单只有组长可见
export const roleLabels = {
  STUDENT: '学生',
  LAB_TEACHER: '实训室教师',
  LAB_LEADER: '实训室组长',
  COLLEGE_ADMIN: '学院总负责人'
}

export const teacherMenuGroups = [
  {
    title: '教学管理',
    items: [
      { title: '工作台', path: '/teacher/dashboard' },
      { title: '本室信息', path: '/teacher/lab' },
      { title: '报名管理', path: '/teacher/applications' },
      { title: '面试管理', path: '/teacher/interviews' },
      { title: '拟录取管理', path: '/teacher/admissions' },
      { title: '录取确认', path: '/teacher/confirmations' },
      { title: '最终名单', path: '/teacher/final' }
    ]
  },
  {
    title: '本室统筹',
    leaderOnly: true,
    items: [
      { title: '本室综合', path: '/teacher/room/dashboard' },
      { title: '教师与面试情况', path: '/teacher/room/teachers' },
      { title: '面试汇总', path: '/teacher/room/interviews' },
      { title: '报名及录取汇总', path: '/teacher/room/summary' },
      { title: '确认汇总', path: '/teacher/room/confirmations' },
      { title: '内部调剂', path: '/teacher/room/adjustments' },
      { title: '提交学院审核', path: '/teacher/room/submit' },
      { title: '本室最终名单', path: '/teacher/room/final' },
      { title: '规则开关', path: '/teacher/room/settings' },
      { title: '时间变更申请', path: '/teacher/room/time-requests' },
      { title: '操作日志', path: '/teacher/room/logs' }
    ]
  }
]

export const studentMenuGroups = [
  {
    title: '选拔流程',
    items: [
      { title: '工作台', path: '/student/dashboard' },
      { title: '集中宣讲', path: '/student/briefing' },
      { title: '实训室开放日', path: '/student/open-day' },
      { title: '意向填报', path: '/student/preferences' },
      { title: '面试中心', path: '/student/interview' },
      { title: '录取中心', path: '/student/admission' },
      { title: '我的结果', path: '/student/result' }
    ]
  }
]

export const adminMenuGroups = [
  {
    title: '学院管理',
    items: [
      { title: '全院总览', path: '/admin/dashboard' },
      { title: '选拔批次', path: '/admin/batches' },
      { title: '阶段时间', path: '/admin/stages' },
      { title: '学生与账号', path: '/admin/users' },
      { title: '实训室管理', path: '/admin/labs' },
      { title: '拟录取名单', path: '/admin/admissions' },
      { title: '全院调剂', path: '/admin/adjustments' },
      { title: '宣讲与公告', path: '/admin/announcements' }
    ]
  }
]

export function menuGroupsOf(role) {
  if (role === 'STUDENT') return studentMenuGroups
  if (role === 'COLLEGE_ADMIN') return adminMenuGroups
  return teacherMenuGroups
}
