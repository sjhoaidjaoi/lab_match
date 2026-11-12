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
  STUDENT: map('student', [['dashboard','工作台','HomeFilled'],['announcement','集中宣讲','VideoCamera'],['labs','实训室开放日','OfficeBuilding'],['application','意向填报','EditPen'],['application/record','我的填报','Document'],['interview','面试安排','Calendar'],['admission-confirmation','拟录取确认','CircleCheck'],['supplementary','分轮补录','RefreshRight'],['allocation','调剂通知','Connection'],['result','最终结果','Trophy']]),
  LAB_TEACHER: map('teacher', [['dashboard','工作台','HomeFilled'],['lab-info','本实训室信息','OfficeBuilding'],['applications','报名学生','User'],['interviews','面试管理','Calendar'],['selection','初选建议','DocumentChecked'],['confirmation-status','确认进度','CircleCheck'],['supplementary','补录管理','RefreshRight'],['lab-members','实训室成员','UserFilled']]),
  LAB_LEADER: map('leader', [['dashboard','工作台','HomeFilled'],['lab-selection','选拔汇总','DataAnalysis'],['confirmation-status','确认进度','CircleCheck'],['internal-allocation','内部调剂','Connection'],['supplementary','补录统筹','RefreshRight'],['lab-capacity','名额统计','PieChart']]),
  // 学院总负责人端（新文档 4.5 节 18 个模块，按业务分组展示）
  COLLEGE_ADMIN: [
    { path: '/college/dashboard', title: '全院总览', icon: 'HomeFilled' },
    group('基础配置', 'Setting', [
      ['batches', '选拔批次管理', 'Calendar'],
      ['stages', '阶段时间管理', 'Clock'],
      ['students', '学生管理', 'User'],
      ['labs', '实训室管理', 'OfficeBuilding']
    ]),
    group('阶段业务', 'List', [
      ['briefing', '集中宣讲管理', 'VideoCamera'],
      ['openday', '开放日管理', 'Picture'],
      ['preferences', '志愿填报管理', 'EditPen'],
      ['interviews', '面试进度管理', 'Calendar'],
      ['admissions', '拟录取名单管理', 'DocumentChecked'],
      ['confirmation', '录取确认管理', 'CircleCheck']
    ]),
    group('调剂与结果', 'Connection', [
      ['allocation/vacancies', '实训室空缺统计', 'PieChart'],
      ['allocation/candidates', '递补与调剂候选', 'UserFilled'],
      ['allocation/internal', '内部调剂汇总', 'Document'],
      ['allocation/cross', '跨实训室调剂', 'Connection'],
      ['allocation/placement', '未落实学生安置', 'UserFilled'],
      ['final-list', '最终名单管理', 'List'],
      ['publicity', '公示管理', 'Trophy']
    ]),
    group('系统', 'Tools', [
      ['statistics', '数据统计与导出', 'Histogram'],
      ['logs', '系统操作日志', 'Tickets']
    ])
  ]
}
