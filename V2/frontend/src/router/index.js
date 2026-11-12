import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import RoleLayout from '@/layouts/RoleLayout.vue'
import PlaceholderView from '@/views/common/PlaceholderView.vue'

/**
 * 路由职责划分（按团队分工）：
 * - /teacher/**        教师端骨架（本文档重点，全部由教师端负责人实现）
 * - /teacher/room/**   组长增量页面，meta.roles 仅允许 LAB_LEADER
 * - /student/**、/admin/** 其它同学负责，当前仅占位，保证菜单与跳转可用
 */
const teacherChildren = [
  { path: 'dashboard', name: 'teacher-dashboard', component: () => import('@/views/teacher/dashboard/TeacherDashboard.vue'), meta: { title: '教师工作台' } },
  { path: 'lab', name: 'teacher-lab', component: () => import('@/views/teacher/lab/LabInfo.vue'), meta: { title: '本室信息' } },
  { path: 'applications', name: 'teacher-applications', component: () => import('@/views/teacher/applications/ApplicationsView.vue'), meta: { title: '报名管理' } },
  { path: 'interviews', name: 'teacher-interviews', component: () => import('@/views/teacher/interviews/InterviewsView.vue'), meta: { title: '面试管理' } },
  { path: 'interviews/:id/evaluate', name: 'teacher-evaluate', component: () => import('@/views/teacher/interviews/EvaluateView.vue'), meta: { title: '面试评价' } },
  { path: 'admissions', name: 'teacher-admissions', component: () => import('@/views/teacher/admissions/AdmissionsView.vue'), meta: { title: '拟录取管理' } },
  { path: 'confirmations', name: 'teacher-confirmations', component: () => import('@/views/teacher/confirmations/ConfirmationsView.vue'), meta: { title: '录取确认' } },
  { path: 'final', name: 'teacher-final', component: () => import('@/views/teacher/final/FinalListView.vue'), meta: { title: '最终名单' } },

  // ---- 以下为组长增量页面：普通教师不可见、不可访问 ----
  {
    path: 'room/dashboard',
    name: 'leader-dashboard',
    component: () => import('@/views/teacher/leader/LeaderDashboard.vue'),
    meta: { title: '本室综合', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/teachers',
    name: 'leader-teachers',
    component: () => import('@/views/teacher/leader/TeacherProgress.vue'),
    meta: { title: '教师与面试情况', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/interviews',
    name: 'leader-interviews',
    component: () => import('@/views/teacher/leader/LeaderInterviews.vue'),
    meta: { title: '面试汇总', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/summary',
    name: 'leader-summary',
    component: () => import('@/views/teacher/leader/RoomSummary.vue'),
    meta: { title: '报名及录取汇总', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/confirmations',
    name: 'leader-confirmations',
    component: () => import('@/views/teacher/leader/LeaderConfirmations.vue'),
    meta: { title: '确认汇总', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/adjustments',
    name: 'leader-adjustments',
    component: () => import('@/views/teacher/leader/AdjustmentsView.vue'),
    meta: { title: '内部调剂', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/submit',
    name: 'leader-submit',
    component: () => import('@/views/teacher/leader/SubmitReview.vue'),
    meta: { title: '提交学院审核', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/settings',
    name: 'leader-settings',
    component: () => import('@/views/teacher/leader/RuleSettings.vue'),
    meta: { title: '规则开关', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/time-requests',
    name: 'leader-time-requests',
    component: () => import('@/views/teacher/leader/TimeRequests.vue'),
    meta: { title: '时间变更申请', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/logs',
    name: 'leader-logs',
    component: () => import('@/views/teacher/leader/OperationLogs.vue'),
    meta: { title: '操作日志', roles: ['LAB_LEADER'] }
  },
  {
    path: 'room/final',
    name: 'leader-final',
    component: () => import('@/views/teacher/leader/RoomFinalList.vue'),
    meta: { title: '本室最终名单', roles: ['LAB_LEADER'] }
  }
]

// 其它角色页面：骨架占位，后续由对应负责人替换
const studentChildren = ['dashboard', 'briefing', 'open-day', 'preferences', 'interview', 'admission', 'result'].map(path => ({
  path,
  component: PlaceholderView,
  meta: { title: { dashboard: '学生工作台', briefing: '集中宣讲', 'open-day': '实训室开放日', preferences: '意向填报', interview: '面试中心', admission: '录取中心', result: '我的结果' }[path] }
}))

const adminChildren = ['dashboard', 'batches', 'stages', 'users', 'labs', 'admissions', 'adjustments', 'announcements'].map(path => ({
  path,
  component: PlaceholderView,
  meta: { title: { dashboard: '全院总览', batches: '选拔批次', stages: '阶段时间', users: '学生与账号', labs: '实训室管理', admissions: '拟录取名单', adjustments: '全院调剂', announcements: '宣讲与公告' }[path] }
}))

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/login/LoginView.vue'), meta: { public: true } },

  {
    path: '/teacher',
    component: RoleLayout,
    meta: { roles: ['LAB_TEACHER', 'LAB_LEADER'] },
    redirect: '/teacher/dashboard',
    children: teacherChildren
  },
  {
    path: '/student',
    component: RoleLayout,
    meta: { roles: ['STUDENT'] },
    redirect: '/student/dashboard',
    children: studentChildren
  },
  {
    path: '/admin',
    component: RoleLayout,
    meta: { roles: ['COLLEGE_ADMIN'] },
    redirect: '/admin/dashboard',
    children: adminChildren
  },

  {
    path: '/demo',
    component: RoleLayout,
    meta: { roles: ['COLLEGE_ADMIN', 'LAB_LEADER'] },
    children: [
      {
        path: 'review',
        name: 'demo-review',
        component: () => import('@/views/demo/ReviewConsole.vue'),
        meta: { title: '学院审核演示台' }
      }
    ]
  },
  { path: '/403', name: 'forbidden', component: () => import('@/views/common/ForbiddenView.vue'), meta: { public: true } },
  { path: '/', redirect: '/login' },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true
  if (!auth.isLoggedIn) return { path: '/login', query: { redirect: to.fullPath } }

  // 子路由 meta.roles 会覆盖父级，正好用于组长专属页面
  const allowed = to.meta.roles
  if (allowed && !allowed.includes(auth.role)) return { path: '/403' }

  return true
})

export default router
