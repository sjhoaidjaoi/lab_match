interface CollegeLink {
  path: string
  title: string
}

interface CollegeModule {
  title: string
  icon: string
  links: CollegeLink[]
}

export const collegeWorkflows: { title: string; icon: string; modules: CollegeModule[] }[] = [
  {
    title: '选拔管理', icon: 'Calendar',
    modules: [
      { title: '批次与基础资料', icon: 'Setting', links: [
        { path: '/college/batches', title: '选拔批次' },
        { path: '/college/stages', title: '阶段时间' },
        { path: '/college/students', title: '学生管理' },
        { path: '/college/lab-materials', title: '实训室资料' }
      ] },
      { title: '宣讲与志愿', icon: 'Microphone', links: [
        { path: '/college/briefing', title: '集中宣讲' },
        { path: '/college/openday', title: '开放日' },
        { path: '/college/preferences', title: '志愿填报' }
      ] },
      { title: '面试与录取', icon: 'VideoCamera', links: [
        { path: '/college/interviews', title: '面试进度' },
        { path: '/college/interview-archives', title: '录像档案' },
        { path: '/college/admissions', title: '拟录取名单' },
        { path: '/college/confirmation', title: '录取确认' }
      ] }
    ]
  },
  {
    title: '调剂与公示', icon: 'Connection',
    modules: [
      { title: '补录名额', icon: 'PieChart', links: [
        { path: '/college/allocation/surplus', title: '公布名额与分轮补录' },
        { path: '/college/allocation/vacancies', title: '空缺统计' }
      ] },
      { title: '统筹调剂录取', icon: 'Connection', links: [
        { path: '/college/allocation/pool', title: '全院调剂池' }
      ] },
      { title: '最终名单与公示', icon: 'Trophy', links: [
        { path: '/college/final-list', title: '核对最终名单' },
        { path: '/college/publicity', title: '发布公示与处理异议' }
      ] }
    ]
  }
]

export const collegeModules = collegeWorkflows.flatMap(group => group.modules)

export const collegeTools = [
  { path: '/college/statistics', title: '统计与导出', icon: 'Histogram' },
  { path: '/college/logs', title: '操作日志', icon: 'Tickets' },
  { path: '/announcements', title: '系统公告', icon: 'Bell' },
  { path: '/profile', title: '个人信息', icon: 'User' },
  { path: '/college/help', title: '帮助与说明', icon: 'QuestionFilled' }
]

export function collegeModuleFor(path: string) {
  return collegeModules.find(module => module.links.some(link => path === link.path || path.startsWith(link.path + '/')))
}
