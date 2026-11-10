// 严格对齐文档 4.2 ~ 4.5 节各端模块树

export interface MenuItem {
  path: string
  title: string
  icon: string
}

export const menus: Record<string, MenuItem[]> = {
  STUDENT: [
    { path: '/student',             title: '工作台',       icon: 'HomeFilled' },
    { path: '/student/notices',     title: '学院通知',     icon: 'Bell' },
    { path: '/student/briefing',    title: '集中宣讲',     icon: 'VideoCamera' },
    { path: '/student/open-day',    title: '实训室开放日', icon: 'View' },
    { path: '/student/preferences', title: '意向填报',     icon: 'EditPen' },
    { path: '/student/interview',   title: '面试中心',     icon: 'Calendar' },
    { path: '/student/admission',   title: '录取中心',     icon: 'CircleCheck' },
    { path: '/student/result',      title: '我的结果',     icon: 'Trophy' },
    { path: '/student/messages',     title: '消息通知',     icon: 'ChatDotRound' },
    { path: '/student/profile',     title: '个人中心',     icon: 'User' }
  ],
  LAB_TEACHER: [
    { path: '/teacher',             title: '工作台',       icon: 'HomeFilled' },
    { path: '/teacher/lab',         title: '本室信息',     icon: 'OfficeBuilding' },
    { path: '/teacher/applicants',  title: '报名管理',     icon: 'List' },
    { path: '/teacher/interviews',  title: '面试管理',     icon: 'Calendar' },
    { path: '/teacher/scoring',     title: '面试评价',     icon: 'EditPen' },
    { path: '/teacher/nomination',  title: '拟录取名单',   icon: 'Files' },
    { path: '/teacher/waitlist',    title: '递补名单',     icon: 'Sort' },
    { path: '/teacher/offers',      title: '录取确认',     icon: 'CircleCheck' },
    { path: '/teacher/result',      title: '最终名单',     icon: 'Trophy' }
  ],
  LAB_LEADER: [
    { path: '/leader',              title: '工作台',       icon: 'HomeFilled' },
    { path: '/leader/overview',     title: '本室综合情况', icon: 'DataAnalysis' },
    { path: '/leader/teachers',     title: '教师与面试',   icon: 'User' },
    { path: '/leader/aggregate',    title: '报名与名单汇总', icon: 'Files' },
    { path: '/leader/confirm',      title: '录取确认汇总', icon: 'CircleCheck' },
    { path: '/leader/internal',     title: '内部调剂',     icon: 'Operation' },
    { path: '/leader/submit',       title: '提交学院审核', icon: 'Promotion' },
    { path: '/leader/result',       title: '本室最终名单', icon: 'Trophy' }
  ],
  COLLEGE_ADMIN: [
    { path: '/admin',               title: '全院数据总览', icon: 'DataLine' },
    { path: '/admin/batches',       title: '选拔批次管理', icon: 'Setting' },
    { path: '/admin/users',         title: '账号管理',     icon: 'User' },
    { path: '/admin/laboratories',  title: '实训室管理',   icon: 'OfficeBuilding' },
    { path: '/admin/announcements', title: '集中宣讲管理', icon: 'Bell' },
    { path: '/admin/media',         title: '开放日与媒体', icon: 'Picture' },
    { path: '/admin/preferences',   title: '志愿填报管理', icon: 'EditPen' },
    { path: '/admin/interviews',    title: '面试进度管理', icon: 'Calendar' },
    { path: '/admin/admissions',    title: '拟录取与确认', icon: 'CircleCheck' },
    { path: '/admin/adjustments',   title: '全院调剂管理', icon: 'Operation' },
    { path: '/admin/final',         title: '最终名单',     icon: 'Files' },
    { path: '/admin/publication',   title: '公示与异议',   icon: 'Trophy' },
    { path: '/admin/reports',       title: '统计与导出',   icon: 'DataAnalysis' },
    { path: '/admin/logs',          title: '操作日志',     icon: 'Tickets' }
  ]
}
