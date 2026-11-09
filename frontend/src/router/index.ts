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
    {
      path: '/student',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['STUDENT'] },
      children: [
        { path: '', component: () => import('@/views/student/StudentHome.vue') },
        { path: 'catalog', component: () => import('@/views/student/StudentCatalog.vue') },
        { path: 'lectures', component: () => import('@/views/student/StudentLectures.vue') },
        { path: 'openday', component: () => import('@/views/student/StudentOpenDay.vue') },
        { path: 'application', component: () => import('@/views/student/StudentApplication.vue') },
        { path: 'interview', component: () => import('@/views/student/StudentInterview.vue') },
        { path: 'offer', component: () => import('@/views/student/StudentOffer.vue') },
        { path: 'supplement', component: () => import('@/views/student/StudentSupplement.vue') },
        { path: 'adjustment', component: () => import('@/views/student/StudentAdjustment.vue') },
        { path: 'publication', component: () => import('@/views/student/StudentPublication.vue') },
        { path: 'messages', component: () => import('@/views/student/StudentMessages.vue') },
        { path: 'profile', component: () => import('@/views/student/StudentProfile.vue') },
      ]
    },
    {
      path: '/mentor',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['MENTOR'] },
      children: [
        { path: '', component: () => import('@/views/mentor/MentorHome.vue') },
        { path: 'applicants', component: () => import('@/views/mentor/MentorApplicants.vue') },
        { path: 'questionnaires', component: () => import('@/views/mentor/MentorQuestionnaires.vue') },
        { path: 'scoring', component: () => import('@/views/mentor/MentorScoring.vue') },
        { path: 'nomination', component: () => import('@/views/mentor/MentorNomination.vue') },
        { path: 'waitlist', component: () => import('@/views/mentor/MentorWaitlist.vue') },
        { path: 'offers', component: () => import('@/views/mentor/MentorOffers.vue') },
        { path: 'supplement', component: () => import('@/views/mentor/MentorSupplement.vue') },
        { path: 'adjustment', component: () => import('@/views/mentor/MentorAdjustment.vue') },
        { path: 'result', component: () => import('@/views/mentor/MentorResult.vue') },
      ]
    },
    {
      path: '/leader',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['LAB_HEAD'] },
      children: [
        { path: '', component: () => import('@/views/leader/LeaderHome.vue') },
        { path: 'quotas', component: () => import('@/views/leader/LeaderQuotas.vue') },
        { path: 'monitor', component: () => import('@/views/leader/LeaderMonitor.vue') },
        { path: 'interviews', component: () => import('@/views/leader/LeaderInterviews.vue') },
        { path: 'scoring', component: () => import('@/views/leader/LeaderScoring.vue') },
        { path: 'nominations', component: () => import('@/views/leader/LeaderNominations.vue') },
        { path: 'supplement', component: () => import('@/views/leader/LeaderSupplement.vue') },
        { path: 'reallocation', component: () => import('@/views/leader/LeaderReallocation.vue') },
        { path: 'result', component: () => import('@/views/leader/LeaderResult.vue') },
      ]
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { roles: ['COLLEGE_ADMIN'] },
      children: [
        { path: '', component: () => import('@/views/admin/AdminHome.vue') },
        { path: 'cycles', component: () => import('@/views/admin/AdminCycles.vue') },
        { path: 'labs', component: () => import('@/views/admin/AdminLabs.vue') },
        { path: 'mentors', component: () => import('@/views/admin/AdminMentors.vue') },
        { path: 'accounts', component: () => import('@/views/admin/AdminAccounts.vue') },
        { path: 'announcements', component: () => import('@/views/admin/AdminAnnouncements.vue') },
        { path: 'videos', component: () => import('@/views/admin/AdminVideos.vue') },
        { path: 'panoramas', component: () => import('@/views/admin/AdminPanoramas.vue') },
        { path: 'monitor', component: () => import('@/views/admin/AdminMonitor.vue') },
        { path: 'interviews', component: () => import('@/views/admin/AdminInterviews.vue') },
        { path: 'offers', component: () => import('@/views/admin/AdminOffers.vue') },
        { path: 'vacancies', component: () => import('@/views/admin/AdminVacancies.vue') },
        { path: 'reallocation', component: () => import('@/views/admin/AdminReallocation.vue') },
        { path: 'publication', component: () => import('@/views/admin/AdminPublication.vue') },
        { path: 'objections', component: () => import('@/views/admin/AdminObjections.vue') },
        { path: 'reports', component: () => import('@/views/admin/AdminReports.vue') },
        { path: 'audit', component: () => import('@/views/admin/AdminAudit.vue') },
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
  // 本地缓存了 token 但角色信息缺失/失效：清空登录态后走登录页，避免重定向死循环
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
