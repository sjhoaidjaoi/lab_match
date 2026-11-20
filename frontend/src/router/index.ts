import { createRouter, createWebHistory, type NavigationGuard, type RouteRecordRaw } from 'vue-router'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'
import { studentMvp } from '@/api/studentMvp'

type Role = 'STUDENT' | 'LAB_TEACHER' | 'LAB_LEADER' | 'COLLEGE_ADMIN'

const mvpStudentPages = [
  { path: 'dashboard', page: 'dashboard' },
  { path: 'labs', page: 'labs' },
  { path: 'labs/:labId', page: 'lab-detail' },
  { path: 'application', page: 'application' },
  { path: 'application/record', page: 'record' },
  { path: 'interview', page: 'interview' },
  { path: 'admission-confirmation', page: 'admission-confirmation' },
  { path: 'result', page: 'result' }
]

const demoStudentPortal: RouteRecordRaw = {
  path: '/student',
  component: () => import('@/layouts/StudentLayout.vue'),
  meta: { roles: ['STUDENT'] },
  children: [
    { path: '', redirect: '/student/dashboard' },
    { path: 'dashboard', component: () => import('@/views/student/StudentHome.vue') },
    { path: 'announcement', component: () => import('@/views/student/StudentLectures.vue'),
      beforeEnter: to => typeof to.query.lab === 'string' && /^\d+$/.test(to.query.lab)
        ? `/student/announcement/${to.query.lab}` : true },
    { path: 'announcement/:labId', component: () => import('@/views/student/StudentCatalog.vue') },
    { path: 'labs', component: () => import('@/views/student/StudentLectures.vue'), props: { openDay: true } },
    { path: 'labs/:labId', redirect: to => `/student/labs/${to.params.labId}/tour` },
    { path: 'labs/:labId/tour', component: () => import('@/views/student/StudentOpenDay.vue') },
    { path: 'application', component: () => import('@/views/student/StudentApplication.vue') },
    { path: 'application/record', redirect: '/student/application' },
    { path: 'interview', component: () => import('@/views/student/StudentInterview.vue') },
    { path: 'admission-confirmation', component: () => import('@/views/student/StudentOffer.vue') },
    { path: 'supplementary', redirect: '/student/supplement' },
    { path: 'supplement', component: () => import('@/views/student/StudentSupplement.vue') },
    { path: 'allocation', component: () => import('@/views/student/StudentAdjustment.vue') },
    { path: 'result', component: () => import('@/views/student/StudentPublication.vue') },
    { path: 'messages', component: () => import('@/views/student/StudentMessages.vue') },
    { path: 'profile', component: () => import('@/views/student/StudentProfile.vue') },
    { path: 'help', component: () => import('@/views/common/HelpCenter.vue') }
  ]
}
const studentPortal: RouteRecordRaw = studentMvp ? {
  ...demoStudentPortal,
  children: [
    { path: '', redirect: '/student/dashboard' },
    { path: 'profile', component: () => import('@/views/student/StudentProfile.vue') },
    { path: 'help', component: () => import('@/views/common/HelpCenter.vue') },
    ...mvpStudentPages.map(({ path, page }) => ({
      path,
      props: { page },
      component: () => import('@/views/student/StudentMvp.vue')
    })),
    { path: ':rest(.*)*', redirect: '/student/dashboard' }
  ]
} : demoStudentPortal

// 实训室教师端 / 组长端：真实业务页面组件
type PortalPage = { path: string; title: string; component: () => Promise<unknown>; beforeEnter?: NavigationGuard }
const teacherPages: PortalPage[] = [
  { path: 'dashboard', title: '教师工作台', component: () => import('@/views/teacher/TeacherDashboard.vue') },
  { path: 'lab-info', title: '本实训室信息', component: () => import('@/views/teacher/TeacherLabInfo.vue') },
  { path: 'applications', title: '报名学生', component: () => import('@/views/teacher/TeacherApplications.vue') },
  { path: 'interviews', title: '面试管理', component: () => import('@/views/teacher/TeacherInterviews.vue') },
  { path: 'interview-archives', title: '面试录像与档案', component: () => import('@/views/common/InterviewArchives.vue') },
  { path: 'confirmation-status', title: '学生确认进度', component: () => import('@/views/teacher/TeacherConfirmation.vue') },
  { path: 'lab-members', title: '小组成员', component: () => import('@/views/teacher/TeacherMembers.vue') },
  { path: 'help', title: '帮助与说明', component: () => import('@/views/common/HelpCenter.vue') }
]
const leaderPages: PortalPage[] = [
  { path: 'dashboard', title: '组长工作台', component: () => import('@/views/leader/LeaderDashboard.vue') },
  { path: 'lab-info', title: '实训室相关信息', component: () => import('@/views/leader/LeaderLabInfo.vue'),
    beforeEnter: to => to.query.tab === 'admission' ? '/leader/lab-selection?tab=confirmation' : true },
  { path: 'lab-selection', title: '实训室学生汇总', component: () => import('@/views/leader/LeaderStudentSummary.vue') },
  { path: 'online-interviews', title: '线上面试', component: () => import('@/views/common/OnlineInterviewList.vue') },
  { path: 'interview-archives', title: '面试录像与档案', component: () => import('@/views/common/InterviewArchives.vue') },
  { path: 'internal-allocation', title: '本实训室内部调剂', component: () => import('@/views/leader/LeaderInternal.vue') },
  { path: 'help', title: '帮助与说明', component: () => import('@/views/common/HelpCenter.vue') }
]
// 学院总负责人端：使用真实业务页面组件（对应需求 4.5 节模块）
const collegePages: Array<{ path: string; title: string; component: () => Promise<unknown> }> = [
  { path: 'dashboard', title: '全院数据总览', component: () => import('@/views/college/CollegeDashboard.vue') },
  { path: 'batches', title: '选拔批次管理', component: () => import('@/views/college/CollegeBatches.vue') },
  { path: 'stages', title: '阶段时间管理', component: () => import('@/views/college/CollegeStages.vue') },
  { path: 'students', title: '学生管理', component: () => import('@/views/college/CollegeStudents.vue') },
  { path: 'lab-materials', title: '实训室资料管理', component: () => import('@/views/college/CollegeLabMaterials.vue') },
  { path: 'lab-materials/:id', title: '实训室资料详情', component: () => import('@/views/college/CollegeLabMaterialDetail.vue') },
  { path: 'labs', title: '实训室管理', component: () => import('@/views/college/CollegeLabs.vue') },
  // 详情统一复用资料管理页（基础资料 / 教师档案 / 学年名额 / 宣传资料）
  { path: 'labs/:id', title: '实训室详情与成员管理', component: () => import('@/views/college/CollegeLabMaterialDetail.vue') },
  { path: 'briefing', title: '集中宣讲管理', component: () => import('@/views/college/CollegeBriefing.vue') },
  { path: 'openday', title: '开放日管理', component: () => import('@/views/college/CollegeOpenDay.vue') },
  { path: 'preferences', title: '志愿填报管理', component: () => import('@/views/college/CollegePreferences.vue') },
  { path: 'interviews', title: '面试进度管理', component: () => import('@/views/college/CollegeInterviews.vue') },
  { path: 'interview-archives', title: '面试录像与档案', component: () => import('@/views/common/InterviewArchives.vue') },
  { path: 'recruitment-reviews', title: '实训室名单审核', component: () => import('@/views/common/RecruitmentLists.vue') },
  { path: 'admissions', title: '拟录取名单管理', component: () => import('@/views/college/CollegeAdmissions.vue') },
  { path: 'confirmation', title: '录取确认管理', component: () => import('@/views/college/CollegeConfirmation.vue') },
  { path: 'allocation/surplus', title: '各实训室剩余名额', component: () => import('@/views/college/CollegeSurplus.vue') },
  { path: 'allocation/pool', title: '全院调剂池', component: () => import('@/views/college/CollegeAllocationPool.vue') },
  { path: 'allocation/vacancies', title: '实训室空缺统计', component: () => import('@/views/college/CollegeVacancies.vue') },
  { path: 'allocation/candidates', title: '递补与调剂候选', component: () => import('@/views/college/CollegeCandidates.vue') },
  { path: 'allocation/internal', title: '内部调剂汇总', component: () => import('@/views/college/CollegeInternal.vue') },
  { path: 'allocation/cross', title: '跨实训室调剂', component: () => import('@/views/college/CollegeCross.vue') },
  { path: 'allocation/placement', title: '未落实学生安置', component: () => import('@/views/college/CollegePlacement.vue') },
  { path: 'final-list', title: '最终名单管理', component: () => import('@/views/college/CollegeFinalList.vue') },
  { path: 'publicity', title: '公示管理', component: () => import('@/views/college/CollegePublicity.vue') },
  { path: 'statistics', title: '数据统计与导出', component: () => import('@/views/college/CollegeStatistics.vue') },
  { path: 'logs', title: '系统操作日志', component: () => import('@/views/college/CollegeLogs.vue') },
  { path: 'help', title: '帮助与说明', component: () => import('@/views/common/HelpCenter.vue') }
]
function portal(prefix: string, roles: Role[], pages: PortalPage[]): RouteRecordRaw {
  const children = pages.map((page) => ({
    path: page.path,
    component: page.component,
    beforeEnter: page.beforeEnter,
    meta: { roles, title: page.title }
  })) as unknown as RouteRecordRaw[]
  children.push({ path: '', redirect: `/${prefix}/dashboard` })
  if (prefix === 'leader') children.push(
    { path: 'lab-content', redirect: '/leader/lab-info?tab=media' },
    { path: 'confirmation-status', redirect: '/leader/lab-selection?tab=confirmation' },
    { path: 'supplementary', redirect: '/leader/lab-selection?tab=alternates' },
    { path: 'applications', redirect: '/leader/lab-selection' },
    { path: 'interviews', redirect: '/leader/lab-selection' },
    { path: 'lab-capacity', redirect: '/leader/dashboard' }
  )
  if (prefix === 'teacher') children.push(
    { path: 'selection', redirect: '/teacher/confirmation-status' },
    { path: 'supplementary', redirect: '/teacher/confirmation-status' }
  )
  return { path: `/${prefix}`, component: () => import('@/layouts/AppLayout.vue'), meta: { roles }, children }
}
function collegePortal(): RouteRecordRaw {
  const roles: Role[] = ['COLLEGE_ADMIN']
  const children = collegePages.map((page) => ({
    path: page.path,
    component: page.component,
    meta: { roles, title: page.title }
  })) as unknown as RouteRecordRaw[]
  children.push({ path: '', redirect: '/college/dashboard' })
  return { path: '/college', component: () => import('@/layouts/AppLayout.vue'), meta: { roles }, children }
}
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (to.path.startsWith('/student/') && (to.path !== from.path || savedPosition)) {
      return savedPosition ?? { top: 0 }
    }
  },
  routes: [
  { path: '/login', component: () => import('@/views/Login.vue'), meta: { public: true } },
  { path: '/change-password', component: () => import('@/views/common/InitialPassword.vue') },
  { path: '/meeting/:id(\\d+)', component: () => import('@/views/common/InterviewMeeting.vue'),
    meta: { roles: ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER', 'COLLEGE_ADMIN'] } },
  { path: '/profile', component: () => import('@/layouts/AppLayout.vue'), meta: { roles: ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER', 'COLLEGE_ADMIN'] }, children: [{ path: '', component: () => import('@/views/common/ProfilePage.vue') }] },
  { path: '/announcements', component: () => import('@/layouts/AppLayout.vue'), meta: { roles: ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER', 'COLLEGE_ADMIN'] }, children: [{ path: '', component: () => import('@/views/common/AnnouncementsPage.vue') }] },
  { path: '/403', component: () => import('@/views/error/Forbidden.vue'), meta: { public: true } }, studentPortal, portal('teacher', ['LAB_TEACHER'], teacherPages), portal('leader', ['LAB_LEADER'], leaderPages), collegePortal(),
  { path: '/:pathMatch(.*)*', component: () => import('@/views/error/NotFound.vue'), meta: { public: true } }
  ]
})
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.isLoggedIn) {
    return to.meta.public ? true : { path: '/login', query: { redirect: to.fullPath } }
  }
  if (auth.user?.mustChangePassword === undefined ||
    (to.path === '/change-password' && !auth.user.mustChangePassword)) {
    try {
      await auth.refresh()
    } catch {
      if (to.path === '/change-password') return false
    }
  }
  const home = ROLE_HOME[auth.currentRole]
  if (!home) {
    auth.logout()
    return '/login'
  }
  if (auth.user?.mustChangePassword) return to.path === '/change-password' ? true : '/change-password'
  if (to.path === '/change-password' || to.meta.public || to.path === '/') return home
  if (auth.currentRole === 'STUDENT' && to.path === '/profile') return '/student/profile'
  if (auth.currentRole === 'STUDENT' && to.path === '/announcements') return '/student/messages'
  const roles = to.matched.flatMap(record => (record.meta.roles as string[] | undefined) ?? [])
  return roles.length && !roles.includes(auth.currentRole) ? '/403' : true
})
export default router
