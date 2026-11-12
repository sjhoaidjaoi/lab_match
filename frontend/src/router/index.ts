import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'
import PublicLayout from '@/layouts/PublicLayout.vue'
import StudentLayout from '@/layouts/StudentLayout.vue'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import HomePage from '@/pages/public/HomePage.vue'
import LabsPage from '@/pages/public/LabsPage.vue'
import LabDetailPage from '@/pages/public/LabDetailPage.vue'
import MentorDetailPage from '@/pages/public/MentorDetailPage.vue'
import NoticesPage from '@/pages/public/NoticesPage.vue'
import NoticeDetailPage from '@/pages/public/NoticeDetailPage.vue'
import StudentLogin from '@/pages/student/StudentLogin.vue'
import TeacherLogin from '@/pages/teacher/TeacherLogin.vue'
import AdminLogin from '@/pages/admin/AdminLogin.vue'
import ChangePassword from '@/pages/auth/ChangePassword.vue'
import StudentDashboardPage from '@/pages/student/StudentDashboardPage.vue'
import StudentArchivePage from '@/pages/student/StudentArchivePage.vue'
import StudentIntentionPage from '@/pages/student/StudentIntentionPage.vue'
import StudentInterviewPage from '@/pages/student/StudentInterviewPage.vue'
import StudentExamsPage from '@/pages/student/StudentExamsPage.vue'
import StudentExamTakePage from '@/pages/student/StudentExamTakePage.vue'
import AdminLabsPage from '@/pages/admin/AdminLabsPage.vue'
import AdminLeadersPage from '@/pages/admin/AdminLeadersPage.vue'
import AdminMentorsPage from '@/pages/admin/AdminMentorsPage.vue'
import AdminQuotasPage from '@/pages/admin/AdminQuotasPage.vue'
import AdminStudentsPage from '@/pages/admin/AdminStudentsPage.vue'
import AdminRoundsPage from '@/pages/admin/AdminRoundsPage.vue'
import LeaderMentorPage from '@/pages/teacher/LeaderMentorPage.vue'
import LeaderApplicantPage from '@/pages/teacher/LeaderApplicantPage.vue'
import LeaderAdmissionPage from '@/pages/teacher/LeaderAdmissionPage.vue'
import LeaderWaitlistPage from '@/pages/teacher/LeaderWaitlistPage.vue'
import LeaderInterviewSchedulePage from '@/pages/teacher/LeaderInterviewSchedulePage.vue'
import LeaderScoringPage from '@/pages/teacher/LeaderScoringPage.vue'
import MentorNominationPage from '@/pages/teacher/MentorNominationPage.vue'
import MentorWaitlistPage from '@/pages/teacher/MentorWaitlistPage.vue'
import LeaderNominationPage from '@/pages/teacher/LeaderNominationPage.vue'
import StudentConfirmCenterPage from '@/pages/student/StudentConfirmCenterPage.vue'
import StudentSupplementPage from '@/pages/student/StudentSupplementPage.vue'
import MentorApplicantsPage from '@/pages/teacher/MentorApplicantsPage.vue'
import QuestionBankPage from '@/pages/teacher/QuestionBankPage.vue'
import ExamPaperPage from '@/pages/teacher/ExamPaperPage.vue'
import MentorReallocationPoolPage from '@/pages/teacher/MentorReallocationPoolPage.vue'
import LeaderReallocationPage from '@/pages/teacher/LeaderReallocationPage.vue'
import AdminReallocationPage from '@/pages/admin/AdminReallocationPage.vue'
import StudentPublicityPage from '@/pages/student/StudentPublicityPage.vue'
import StudentDisputesPage from '@/pages/student/StudentDisputesPage.vue'
import StudentNoticesPage from '@/pages/student/StudentNoticesPage.vue'
import StudentProfilePage from '@/pages/student/StudentProfilePage.vue'
import AdminPublicityPage from '@/pages/admin/AdminPublicityPage.vue'
import AdminDisputesPage from '@/pages/admin/AdminDisputesPage.vue'
import AdminResultsPage from '@/pages/admin/AdminResultsPage.vue'
import AdminNoticesPage from '@/pages/admin/AdminNoticesPage.vue'
import TeacherDashboardPage from '@/pages/teacher/TeacherDashboardPage.vue'
import TeacherProfilePage from '@/pages/teacher/TeacherProfilePage.vue'
import MentorAdmissionPage from '@/pages/teacher/MentorAdmissionPage.vue'
import LeaderDashboardPage from '@/pages/teacher/LeaderDashboardPage.vue'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', name: 'home', component: HomePage, meta: { title: '首页' } },
      { path: 'labs', name: 'public-labs', component: LabsPage, meta: { title: '实训室' } },
      { path: 'labs/:id', name: 'public-lab-detail', component: LabDetailPage, meta: { title: '实训室详情' } },
      { path: 'mentors/:id', name: 'public-mentor-detail', component: MentorDetailPage, meta: { title: '导师详情' } },
      { path: 'notices', name: 'public-notices', component: NoticesPage, meta: { title: '公告栏' } },
      { path: 'notices/:id', name: 'public-notice-detail', component: NoticeDetailPage, meta: { title: '公告详情' } },
      { path: 'student/login', name: 'student-login', component: StudentLogin, meta: { title: '学生登录' } },
      { path: 'teacher/login', name: 'teacher-login', component: TeacherLogin, meta: { title: '教师登录' } },
      { path: 'admin/login', name: 'admin-login', component: AdminLogin, meta: { title: '管理员登录' } },
      {
        path: 'change-password',
        name: 'change-password',
        component: ChangePassword,
        meta: { requiresAuth: true, title: '修改密码' }
      }
    ]
  },
  {
    path: '/student',
    component: StudentLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'student-home',
        component: StudentDashboardPage,
        meta: { title: '学生工作台' }
      },
      {
        path: 'archive',
        name: 'student-archive',
        component: StudentArchivePage,
        meta: { title: '我的档案' }
      },
      {
        path: 'intention',
        name: 'student-intention',
        component: StudentIntentionPage,
        meta: { title: '意向填报' }
      },
      {
        path: 'interview',
        name: 'student-interview',
        component: StudentInterviewPage,
        meta: { title: '面试安排' }
      },
      {
        path: 'exams',
        name: 'student-exams',
        component: StudentExamsPage,
        meta: { title: '在线笔试' }
      },
      {
        path: 'exams/:paperId',
        name: 'student-exam-take',
        component: StudentExamTakePage,
        meta: { title: '在线答题' }
      },
      {
        path: 'confirm-center',
        name: 'student-confirm-center',
        component: StudentConfirmCenterPage,
        meta: { title: '录取待确认' }
      },
      {
        path: 'supplement',
        name: 'student-supplement',
        component: StudentSupplementPage,
        meta: { title: '补录填报' }
      },
      {
        path: 'publicity',
        name: 'student-publicity',
        component: StudentPublicityPage,
        meta: { title: '名单公示' }
      },
      {
        path: 'disputes',
        name: 'student-disputes',
        component: StudentDisputesPage,
        meta: { title: '我的异议' }
      },
      {
        path: 'notices',
        name: 'student-notices',
        component: StudentNoticesPage,
        meta: { title: '消息通知' }
      },
      {
        path: 'profile',
        name: 'student-profile',
        component: StudentProfilePage,
        meta: { title: '个人中心' }
      }
    ]
  },
  {
    path: '/leader',
    component: TeacherLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'leader-home',
        component: LeaderDashboardPage,
        meta: { title: '本室工作台' }
      },
      {
        path: 'mentors',
        name: 'leader-mentors',
        component: LeaderMentorPage,
        meta: { title: '本室导师与名额' }
      },
      {
        path: 'applicants',
        name: 'leader-applicants',
        component: LeaderApplicantPage,
        meta: { title: '本室报名学生' }
      },
      {
        path: 'interview-schedule',
        name: 'leader-interview-schedule',
        component: LeaderInterviewSchedulePage,
        meta: { title: '面试排期' }
      },
      {
        path: 'scoring',
        name: 'leader-scoring',
        component: LeaderScoringPage,
        meta: { title: '本室评分汇总' }
      },
      {
        path: 'nominations',
        name: 'leader-nominations',
        component: LeaderNominationPage,
        meta: { title: '本室录取汇总' }
      },
      {
        path: 'admissions',
        name: 'leader-admissions',
        component: LeaderAdmissionPage,
        props: { mode: 'summary' },
        meta: { title: '录取确认汇总' }
      },
      {
        path: 'final-list',
        name: 'leader-final-list',
        component: LeaderAdmissionPage,
        props: { mode: 'final' },
        meta: { title: '本室最终名单' }
      },
      {
        path: 'waitlist',
        name: 'leader-waitlist',
        component: LeaderWaitlistPage,
        meta: { title: '本室递补名单' }
      },
      {
        path: 'reallocation',
        name: 'leader-reallocation',
        component: LeaderReallocationPage,
        meta: { title: '本室内部调剂' }
      }
    ]
  },
  {
    path: '/teacher',
    component: TeacherLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'teacher-home',
        component: TeacherDashboardPage,
        meta: { title: '导师工作台' }
      },
      {
        path: 'nominations',
        name: 'teacher-nominations',
        component: MentorNominationPage,
        meta: { title: '拟录取勾选' }
      },
      {
        path: 'applicants',
        name: 'teacher-applicants',
        component: MentorApplicantsPage,
        meta: { title: '报名学生' }
      },
      {
        path: 'questions',
        name: 'teacher-questions',
        component: QuestionBankPage,
        meta: { title: '题库管理' }
      },
      {
        path: 'exam-papers',
        name: 'teacher-exam-papers',
        component: ExamPaperPage,
        meta: { title: '在线试卷' }
      },
      {
        path: 'reallocation-pool',
        name: 'teacher-reallocation-pool',
        component: MentorReallocationPoolPage,
        meta: { title: '全院调剂池' }
      },
      {
        path: 'waitlist',
        name: 'teacher-waitlist',
        component: MentorWaitlistPage,
        meta: { title: '递补顺位' }
      },
      {
        path: 'profile',
        name: 'teacher-profile',
        component: TeacherProfilePage,
        meta: { title: '个人中心' }
      },
      {
        path: 'admissions',
        name: 'teacher-admissions',
        component: MentorAdmissionPage,
        meta: { title: '我的录取名单' }
      }
    ]
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-home',
        component: AdminDashboardPage,
        meta: { title: '全院工作台' }
      },
      {
        path: 'labs',
        name: 'admin-labs',
        component: AdminLabsPage,
        meta: { title: '实训室管理' }
      },
      {
        path: 'leaders',
        name: 'admin-leaders',
        component: AdminLeadersPage,
        meta: { title: '负责人提拔' }
      },
      {
        path: 'mentors',
        name: 'admin-mentors',
        component: AdminMentorsPage,
        meta: { title: '导师与名额' }
      },
      {
        path: 'quotas',
        name: 'admin-quotas',
        component: AdminQuotasPage,
        meta: { title: '名额总览' }
      },
      {
        path: 'students',
        name: 'admin-students',
        component: AdminStudentsPage,
        meta: { title: '学生账号' }
      },
      {
        path: 'rounds',
        name: 'admin-rounds',
        component: AdminRoundsPage,
        meta: { title: '轮次配置' }
      },
      {
        path: 'notices',
        name: 'admin-notices',
        component: AdminNoticesPage,
        meta: { title: '公告管理' }
      },
      {
        path: 'reallocation',
        name: 'admin-reallocation',
        component: AdminReallocationPage,
        meta: { title: '统筹调剂' }
      },
      {
        path: 'publicity',
        name: 'admin-publicity',
        component: AdminPublicityPage,
        meta: { title: '公示管理' }
      },
      {
        path: 'disputes',
        name: 'admin-disputes',
        component: AdminDisputesPage,
        meta: { title: '异议处理' }
      },
      {
        path: 'results',
        name: 'admin-results',
        component: AdminResultsPage,
        meta: { title: '录取总览' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/labs' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

function loginPathFor(path: string): string {
  if (path.startsWith('/teacher')) {
    return '/teacher/login'
  }
  if (path.startsWith('/admin')) {
    return '/admin/login'
  }
  return '/student/login'
}

function homeFor(userType: number | undefined): string {
  if (userType === 2) {
    return '/teacher'
  }
  if (userType === 3) {
    return '/admin'
  }
  return '/student'
}

function requiredUserType(path: string): number | null {
  if (path.startsWith('/student')) {
    return 1
  }
  if (path.startsWith('/teacher') || path.startsWith('/leader')) {
    return 2
  }
  if (path.startsWith('/admin')) {
    return 3
  }
  return null
}

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { path: loginPathFor(to.path), query: { redirect: to.fullPath } }
  }
  if (userStore.isLoggedIn && !userStore.user) {
    userStore.logout()
    return { path: loginPathFor(to.path) }
  }
  if (userStore.isLoggedIn && userStore.needChangePwd === 1 && to.path !== '/change-password') {
    return { path: '/change-password' }
  }
  const requiredType = requiredUserType(to.path)
  if (userStore.isLoggedIn && requiredType !== null && userStore.user?.userType !== requiredType) {
    return { path: homeFor(userStore.user?.userType) }
  }
  if (userStore.isLoggedIn && to.path.startsWith('/leader') && !userStore.isLeader) {
    return { path: '/teacher' }
  }
  if (userStore.isLoggedIn && to.path.endsWith('/login')) {
    return { path: homeFor(userStore.user?.userType) }
  }
  return true
})

export default router
