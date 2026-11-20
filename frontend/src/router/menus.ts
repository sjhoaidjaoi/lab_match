export interface MenuItem {
  path: string
  title: string
  icon: string
  children?: MenuItem[]
}

const map = (prefix: string, items: string[][]): MenuItem[] =>
  items.map(([path, title, icon]) => ({ path: `/${prefix}/${path}`, title, icon }))

const group = (title: string, icon: string, items: string[][]): MenuItem => ({
  path: '',
  title,
  icon,
  children: items.map(([path, label, childIcon]) => ({ path: `/college/${path}`, title: label, icon: childIcon }))
})

export const menus: Record<string, MenuItem[]> = {
  STUDENT: map('student', [['dashboard','工作台','HomeFilled'],['announcement','集中宣讲','VideoCamera'],['labs','实训室开放日','OfficeBuilding'],['application','意向填报','EditPen'],['interview','面试安排','Calendar'],['admission-confirmation','拟录取确认','CircleCheck'],['supplement','补录志愿','Refresh'],['allocation','调剂结果','Connection'],['result','最终结果','Trophy'],['help','帮助说明','QuestionFilled']]),
  LAB_TEACHER: map('teacher', [
    ['dashboard', '工作台', 'HomeFilled'],
    ['lab-info', '本实训室信息', 'OfficeBuilding'],
    ['applications', '报名学生', 'User'],
    ['interviews', '面试管理', 'Calendar'],
    ['interview-archives', '面试录像与档案', 'VideoCamera'],
    ['confirmation-status', '确认进度', 'CircleCheck'],
    ['lab-members', '小组成员', 'UserFilled'],
    ['help', '帮助说明', 'QuestionFilled']
  ]),
  LAB_LEADER: map('leader', [
    ['dashboard', '工作台', 'HomeFilled'],
    ['lab-info', '实训室相关信息', 'OfficeBuilding'],
    ['lab-selection', '实训室学生汇总', 'DataAnalysis'],
    ['online-interviews', '线上面试', 'VideoCamera'],
    ['interview-archives', '面试录像与档案', 'Files'],
    ['internal-allocation', '内部调剂', 'Connection']
  ]),
  // 学院总负责人端：负责实训室与教师信息、批次与名额，不再承担宣传物料与阶段业务操作
  COLLEGE_ADMIN: [
    { path: '/college/dashboard', title: '全院总览', icon: 'HomeFilled' },
    group('基础配置', 'Setting', [
      ['batches', '选拔批次管理', 'Calendar'],
      ['stages', '阶段时间管理', 'Clock'],
      ['students', '学生管理', 'User'],
      ['labs', '实训室与教师管理', 'OfficeBuilding']
    ]),
    group('调剂与录取', 'Connection', [
      ['allocation/surplus', '各实训室剩余名额', 'PieChart'],
      ['allocation/pool', '全院调剂池', 'UserFilled'],
      ['final-list', '最终名单管理', 'List'],
      ['publicity', '汇总与公示', 'Trophy']
    ]),
    group('系统', 'Tools', [
      ['statistics', '数据统计与导出', 'Histogram'],
      ['logs', '系统操作日志', 'Tickets'],
      ['help', '帮助与说明', 'QuestionFilled']
    ])
  ]
}
