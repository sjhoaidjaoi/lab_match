export interface MenuItem {
  path: string
  title: string
  icon: string
}

export const menus: Record<string, MenuItem[]> = {
  STUDENT: [
    { path: '/student', title: '工作台', icon: 'HomeFilled' },
    { path: '/student/catalog', title: '公告与导师目录', icon: 'Bell' },
    { path: '/student/lectures', title: '集中宣讲视频', icon: 'VideoCamera' },
    { path: '/student/openday', title: '开放日云游', icon: 'View' },
    { path: '/student/application', title: '意向填报', icon: 'EditPen' },
    { path: '/student/interview', title: '面试与问卷', icon: 'VideoCamera' },
    { path: '/student/offer', title: '录取确认', icon: 'CircleCheck' },
    { path: '/student/supplement', title: '补录填报', icon: 'Refresh' },
    { path: '/student/adjustment', title: '调剂结果', icon: 'Operation' },
    { path: '/student/publication', title: '公示与异议', icon: 'Trophy' },
    { path: '/student/messages', title: '消息通知', icon: 'ChatDotRound' },
    { path: '/student/profile', title: '个人中心', icon: 'User' },
  ],
  MENTOR: [
    { path: '/mentor', title: '工作台', icon: 'HomeFilled' },
    { path: '/mentor/applicants', title: '报名学生', icon: 'List' },
    { path: '/mentor/questionnaires', title: '问卷编排', icon: 'Document' },
    { path: '/mentor/scoring', title: '评分与评语', icon: 'EditPen' },
    { path: '/mentor/nomination', title: '拟录取名单', icon: 'Files' },
    { path: '/mentor/waitlist', title: '递补顺位', icon: 'Sort' },
    { path: '/mentor/offers', title: '发出的 Offer', icon: 'Promotion' },
    { path: '/mentor/supplement', title: '补录续招', icon: 'Refresh' },
    { path: '/mentor/adjustment', title: '接收调剂', icon: 'Operation' },
    { path: '/mentor/result', title: '录取名单', icon: 'Trophy' },
  ],
  LAB_HEAD: [
    { path: '/leader', title: '工作台', icon: 'HomeFilled' },
    { path: '/leader/quotas', title: '导师与名额', icon: 'DataAnalysis' },
    { path: '/leader/monitor', title: '填报进度', icon: 'TrendCharts' },
    { path: '/leader/interviews', title: '面试排期', icon: 'Calendar' },
    { path: '/leader/scoring', title: '评分汇总', icon: 'EditPen' },
    { path: '/leader/nominations', title: '名单汇总', icon: 'Files' },
    { path: '/leader/supplement', title: '本室补录看板', icon: 'Refresh' },
    { path: '/leader/reallocation', title: '本室调剂', icon: 'Operation' },
    { path: '/leader/result', title: '本室名单与入组', icon: 'Trophy' },
  ],
  COLLEGE_ADMIN: [
    { path: '/admin', title: '工作台', icon: 'HomeFilled' },
    { path: '/admin/cycles', title: '周期与轮次', icon: 'Setting' },
    { path: '/admin/labs', title: '实训室档案', icon: 'OfficeBuilding' },
    { path: '/admin/mentors', title: '导师与名额', icon: 'UserFilled' },
    { path: '/admin/accounts', title: '账号管理', icon: 'User' },
    { path: '/admin/announcements', title: '公告管理', icon: 'Bell' },
    { path: '/admin/videos', title: '宣讲视频管理', icon: 'VideoPlay' },
    { path: '/admin/panoramas', title: '全景资源管理', icon: 'Picture' },
    { path: '/admin/monitor', title: '全院监控', icon: 'DataLine' },
    { path: '/admin/interviews', title: '面试进度', icon: 'Calendar' },
    { path: '/admin/offers', title: '确认总览', icon: 'CircleCheck' },
    { path: '/admin/vacancies', title: '剩余名额', icon: 'Refresh' },
    { path: '/admin/reallocation', title: '统筹调剂', icon: 'Operation' },
    { path: '/admin/publication', title: '公示管理', icon: 'Trophy' },
    { path: '/admin/objections', title: '异议处理', icon: 'Warning' },
    { path: '/admin/reports', title: '报表统计', icon: 'DataAnalysis' },
    { path: '/admin/audit', title: '审计日志', icon: 'Tickets' },
  ],
}
