import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'

type Role = 'STUDENT' | 'LAB_TEACHER' | 'LAB_LEADER' | 'COLLEGE_ADMIN'
interface PageDefinition { path: string; title: string; description: string; stage?: string; api: string; media?: 'video' | 'tour' }

const studentPages: PageDefinition[] = [
  { path: 'dashboard', title: '学生工作台', description: '查看当前选拔批次与八阶段流程进度。', api: 'GET /api/batches/current' },
  { path: 'announcement', title: '集中宣讲', description: '宣讲文字、视频和资料入口。', stage: '阶段一：集中宣讲', api: 'GET /api/announcements', media: 'video' },
  { path: 'labs', title: '实训室开放日', description: '浏览实训室介绍、导师团队和开放日信息。', stage: '阶段二：实训室开放日', api: 'GET /api/labs' },
  { path: 'labs/:labId', title: '实训室详情', description: '查看实训室方向、成果、导师和培养方式。', stage: '阶段二：实训室开放日', api: 'GET /api/labs/{labId}' },
  { path: 'labs/:labId/tour', title: '实训室全景云游', description: '预留普通视频与全景播放器容器；实际全景能力取决于素材。', stage: '阶段二：实训室开放日', api: 'GET /api/labs/{labId}/tour', media: 'tour' },
  { path: 'application', title: '意向填报', description: '最多三个平行导师意向及调剂意愿。', stage: '阶段三：意向填报', api: 'GET /api/applications/me' },
  { path: 'application/record', title: '我的填报记录', description: '查看当前批次的意向填报状态。', stage: '阶段三：意向填报', api: 'GET /api/applications/me' },
  { path: 'interview', title: '面试安排', description: '查看本人面试通知与安排。', stage: '阶段四：导师初选与面试考核', api: 'GET /api/interviews/me' },
  { path: 'admission-confirmation', title: '拟录取确认', description: '查看拟录取通知并确认唯一去向。', stage: '阶段五：拟录取与学生确认', api: 'GET /api/admissions/me' },
  { path: 'supplementary', title: '分轮补录', description: '查看补录批次、剩余名额与补录入口。', stage: '阶段六：分轮补录', api: 'GET /api/supplementary/rounds' },
  { path: 'allocation', title: '调剂通知', description: '查看调剂方案与确认状态。', stage: '阶段七：统筹调剂录取', api: 'GET /api/allocations/me' },
  { path: 'result', title: '最终结果与公示', description: '查看个人录取结果和最终公示。', stage: '阶段八：结果公示与正式入组', api: 'GET /api/publicity/current' }
]
const teacherPages: PageDefinition[] = [
  { path: 'dashboard', title: '教师工作台', description: '本实训室选拔任务概览。', api: 'GET /api/statistics/lab' },
  { path: 'lab-info', title: '本实训室信息', description: '查看本实训室基本资料。', api: 'GET /api/labs/mine' },
  { path: 'applications', title: '报名学生', description: '查看本实训室范围内的报名学生。', stage: '阶段三：意向填报', api: 'GET /api/applications' },
  { path: 'interviews', title: '面试管理', description: '管理面试安排与学生评价。', stage: '阶段四：导师初选与面试考核', api: 'GET /api/interviews' },
  { path: 'interviews/:applicationId', title: '面试详情与评价', description: '预留学习态度、逻辑思维、编程基础和时间投入评价。', stage: '阶段四：导师初选与面试考核', api: 'GET /api/interviews/{applicationId}' },
  { path: 'selection', title: '初选与拟录取建议', description: '提交拟录取、递补和内部调剂候选建议。', stage: '阶段四：导师初选与面试考核', api: 'GET /api/selections' },
  { path: 'confirmation-status', title: '学生确认进度', description: '查看拟录取学生的确认状态。', stage: '阶段五：拟录取与学生确认', api: 'GET /api/admissions/status' },
  { path: 'supplementary', title: '补录管理', description: '处理本实训室分轮补录工作。', stage: '阶段六：分轮补录', api: 'GET /api/supplementary' },
  { path: 'lab-members', title: '实训室成员', description: '查看正式入组成员名单。', stage: '阶段八：结果公示与正式入组', api: 'GET /api/enrollments/lab' }
]
const leaderPages: PageDefinition[] = [
  { path: 'dashboard', title: '组长工作台', description: '汇总本实训室选拔、名额和确认进度。', api: 'GET /api/statistics/lab' },
  { path: 'lab-selection', title: '本实训室选拔汇总', description: '查看各导师初选与面试进度。', stage: '阶段四：导师初选与面试考核', api: 'GET /api/selections/lab' },
  { path: 'confirmation-status', title: '本实训室确认进度', description: '查看拟录取确认、逾期与空缺名额。', stage: '阶段五：拟录取与学生确认', api: 'GET /api/admissions/status' },
  { path: 'internal-allocation', title: '本实训室内部调剂', description: '仅处理本实训室内部调剂。', stage: '阶段七：统筹调剂录取', api: 'GET /api/allocations/internal' },
  { path: 'supplementary', title: '本实训室补录统筹', description: '查看并统筹本室补录进度。', stage: '阶段六：分轮补录', api: 'GET /api/supplementary/lab' },
  { path: 'lab-capacity', title: '本实训室名额统计', description: '查看计划、已录取和剩余名额。', stage: '阶段七：统筹调剂录取', api: 'GET /api/statistics/capacity' }
]
const collegePages: PageDefinition[] = [
  { path: 'dashboard', title: '全院工作台', description: '全院选拔批次、八阶段和统计总览。', api: 'GET /api/statistics/college' },
  { path: 'batches', title: '选拔批次管理', description: '管理批次与八阶段开放时间。', api: 'GET /api/batches' },
  { path: 'labs', title: '全院实训室管理', description: '维护实训室、导师和招录名额。', api: 'GET /api/labs' },
  { path: 'applications', title: '全院报名数据', description: '查看全院学生意向申请。', stage: '阶段三：意向填报', api: 'GET /api/applications' },
  { path: 'selection-overview', title: '初选汇总', description: '查看各实训室初选和拟录取建议。', stage: '阶段四：导师初选与面试考核', api: 'GET /api/selections' },
  { path: 'supplementary-overview', title: '补录汇总', description: '查看第二轮、第三轮补录进度。', stage: '阶段六：分轮补录', api: 'GET /api/supplementary' },
  { path: 'allocation', title: '全院统筹调剂', description: '处理跨实训室调剂及全院名额统筹。', stage: '阶段七：统筹调剂录取', api: 'GET /api/allocations' },
  { path: 'allocation/pool', title: '全院调剂池', description: '查看跨实训室调剂候选人与剩余名额。', stage: '阶段七：统筹调剂录取', api: 'GET /api/allocations/pool' },
  { path: 'final-list', title: '最终名单汇总', description: '汇总待公示的最终录取名单。', stage: '阶段八：结果公示与正式入组', api: 'GET /api/enrollments' },
  { path: 'publicity', title: '结果公示管理', description: '配置公示起止时间与公示状态。', stage: '阶段八：结果公示与正式入组', api: 'GET /api/publicity' },
  { path: 'statistics', title: '全院数据统计', description: '查看各实训室选拔数据统计。', api: 'GET /api/statistics/college' },
  { path: 'users', title: '用户与角色管理', description: '管理用户、角色与权限。', api: 'GET /api/users' },
  { path: 'settings', title: '系统与批次配置', description: '维护全局系统配置。', api: 'GET /api/batches/current' },
  { path: 'announcement', title: '宣讲内容维护', description: '维护宣讲文字、视频与附件。', stage: '阶段一：集中宣讲', api: 'GET /api/announcements', media: 'video' }
]
function portal(prefix: string, roles: Role[], pages: PageDefinition[]): RouteRecordRaw {
  const children: RouteRecordRaw[] = pages.map((page) => ({ path: page.path, component: () => import('@/views/FrameworkPage.vue'), props: page, meta: { roles } }))
  children.push({ path: '', redirect: `/${prefix}/dashboard` })
  return { path: `/${prefix}`, component: () => import('@/layouts/AppLayout.vue'), meta: { roles }, children }
}
const router = createRouter({ history: createWebHistory(), routes: [
  { path: '/login', component: () => import('@/views/Login.vue'), meta: { public: true } },
  { path: '/profile', component: () => import('@/views/FrameworkPage.vue'), props: { title: '个人资料', description: '查看基础账号信息。', api: 'GET /api/auth/me' }, meta: { roles: ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER', 'COLLEGE_ADMIN'] } },
  { path: '/announcements', component: () => import('@/views/FrameworkPage.vue'), props: { title: '公共通知', description: '查看选拔相关公共通知。', api: 'GET /api/announcements' }, meta: { roles: ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER', 'COLLEGE_ADMIN'] } },
  { path: '/403', component: () => import('@/views/error/Forbidden.vue'), meta: { public: true } }, portal('student', ['STUDENT'], studentPages), portal('teacher', ['LAB_TEACHER'], teacherPages), portal('leader', ['LAB_LEADER'], leaderPages), portal('college', ['COLLEGE_ADMIN'], collegePages),
  { path: '/:pathMatch(.*)*', component: () => import('@/views/error/NotFound.vue'), meta: { public: true } }
] })
router.beforeEach((to) => { const auth = useAuthStore(); const home = ROLE_HOME[auth.currentRole] || null; if (!auth.isLoggedIn) return to.meta.public ? true : { path: '/login', query: { redirect: to.fullPath } }; if (!home) { auth.logout(); return { path: '/login' } }; if (to.meta.public || to.path === '/') return home; const roles = to.matched.flatMap((record) => (record.meta.roles as string[] | undefined) ?? []); return roles.length && !roles.includes(auth.currentRole) ? '/403' : true })
export default router
