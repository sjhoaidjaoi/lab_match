import { createRouter, createWebHistory } from 'vue-router'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true }
    },
    // ========== 学生端 ==========
    {
      path: '/student',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['STUDENT'] },
      children: [
        { path: '',           component: () => import('@/views/student/StudentHome.vue') },
        { path: 'notices',    component: () => import('@/views/student/StudentCatalog.vue') },
        { path: 'briefing',   component: () => import('@/views/student/StudentLectures.vue') },
        { path: 'open-day',   component: () => import('@/views/student/StudentOpenDay.vue') },
        { path: 'preferences',component: () => import('@/views/student/StudentApplication.vue') },
        { path: 'interview',  component: () => import('@/views/student/StudentInterview.vue') },
        { path: 'admission',  component: () => import('@/views/student/StudentOffer.vue') },
        { path: 'result',     component: () => import('@/views/student/StudentPublication.vue') },
        { path: 'messages',   component: () => import('@/views/student/StudentMessages.vue') },
        { path: 'profile',    component: () => import('@/views/student/StudentProfile.vue') }
      ]
    },
    // ========== 实训室教师端（mentor → teacher） ==========
    {
      path: '/teacher',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['LAB_TEACHER'] },
      children: [
        { path: '',          component: () => import('@/views/teacher/TeacherHome.vue') },
        { path: 'lab',       component: () => import('@/views/teacher/TeacherQuestionnaires.vue') },
        { path: 'applicants',component: () => import('@/views/teacher/TeacherApplicants.vue') },
        { path: 'interviews',component: () => import('@/views/teacher/TeacherQuestionnaires.vue') },
        { path: 'scoring',   component: () => import('@/views/teacher/TeacherScoring.vue') },
        { path: 'nomination',component: () => import('@/views/teacher/TeacherNomination.vue') },
        { path: 'waitlist',  component: () => import('@/views/teacher/TeacherWaitlist.vue') },
        { path: 'offers',    component: () => import('@/views/teacher/TeacherOffers.vue') },
        { path: 'result',    component: () => import('@/views/teacher/TeacherResult.vue') }
      ]
    },
    // ========== 实训室组长端（LAB_LEADER） ==========
    {
      path: '/leader',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['LAB_LEADER'] },
      children: [
        { path: '',          component: () => import('@/views/leader/LeaderHome.vue') },
        { path: 'overview',  component: () => import('@/views/leader/LeaderMonitor.vue') },
        { path: 'teachers',  component: () => import('@/views/leader/LeaderScoring.vue') },
        { path: 'aggregate', component: () => import('@/views/leader/LeaderNominations.vue') },
        { path: 'confirm',   component: () => import('@/views/leader/LeaderSupplement.vue') },
        { path: 'internal',  component: () => import('@/views/leader/LeaderReallocation.vue') },
        { path: 'submit',    component: () => import('@/views/leader/LeaderQuotas.vue') },
        { path: 'result',    component: () => import('@/views/leader/LeaderResult.vue') }
      ]
    },
    // ========== 学院总负责人端（COLLEGE_ADMIN） ==========
    {
      path: '/admin',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['COLLEGE_ADMIN'] },
      children: [
        { path: '',             component: () => import('@/views/admin/AdminHome.vue') },
        { path: 'batches',      component: () => import('@/views/admin/AdminCycles.vue') },
        { path: 'users',        component: () => import('@/views/admin/AdminAccounts.vue') },
        { path: 'laboratories', component: () => import('@/views/admin/AdminLabs.vue') },
        { path: 'announcements',component: () => import('@/views/admin/AdminAnnouncements.vue') },
        { path: 'media',        component: () => import('@/views/admin/AdminVideos.vue') },
        { path: 'preferences',  component: () => import('@/views/admin/AdminMonitor.vue') },
        { path: 'interviews',   component: () => import('@/views/admin/AdminInterviews.vue') },
        { path: 'admissions',   component: () => import('@/views/admin/AdminOffers.vue') },
        { path: 'adjustments',  component: () => import('@/views/admin/AdminReallocation.vue') },
        { path: 'final',        component: () => import('@/views/admin/AdminVacancies.vue') },
        { path: 'publication',  component: () => import('@/views/admin/AdminPublication.vue') },
        { path: 'reports',      component: () => import('@/views/admin/AdminReports.vue') },
        { path: 'logs',         component: () => import('@/views/admin/AdminAudit.vue') }
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const home = ROLE_HOME[auth.currentRole] || null
  if (!auth.isLoggedIn) {
    return to.meta.public ? true : { path: '/login', query: { redirect: to.fullPath } }
  }
  if (!home) {
    auth.logout()
    return to.meta.public ? true : { path: '/login' }
  }
  if (to.meta.public || to.path === '/') {
    return home
  }
  const requiredRoles = to.matched.flatMap((record) => (record.meta.roles as string[] | undefined) ?? [])
  if (requiredRoles.length > 0 && !requiredRoles.includes(auth.currentRole)) {
    return home
  }
  return true
})

export default router
