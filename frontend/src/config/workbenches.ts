export interface WorkbenchCard {
  title: string
  desc: string
  path: string
}

export interface WorkbenchConfig {
  title: string
  subtitle: string
  cards: WorkbenchCard[]
}

export const workbenches: Record<string, WorkbenchConfig> = {
  STUDENT: {
    title: '学生工作台',
    subtitle: '查看选拔进度、完成意向填报与录取确认',
    cards: [
      { title: '公告与导师目录', desc: '查看宣讲通知、开放日安排与导师方向', path: '/student/catalog' },
      { title: '意向填报', desc: '选择至多 3 个平行意向并提交', path: '/student/application' },
      { title: '面试与问卷', desc: '查看面试任务、限时完成导师问卷', path: '/student/interview' },
      { title: '录取确认', desc: '接受或放弃拟录取通知', path: '/student/offer' },
      { title: '调剂结果', desc: '查看统筹调剂分配结果', path: '/student/adjustment' },
      { title: '公示与异议', desc: '核对公示名单并提交异议', path: '/student/publication' }
    ]
  },
  MENTOR: {
    title: '导师工作台',
    subtitle: '筛选报名学生、组织问卷面试并提交拟录取名单',
    cards: [
      { title: '报名学生', desc: '查看选择本人的学生与调剂意愿', path: '/mentor/applicants' },
      { title: '问卷编排', desc: '维护问卷题目并在面试前冻结', path: '/mentor/questionnaires' },
      { title: '评分与评语', desc: '按四维评分并填写面试评语', path: '/mentor/scoring' },
      { title: '拟录取名单', desc: '编排拟录取与递补顺位', path: '/mentor/nomination' },
      { title: '补录续招', desc: '查看剩余名额并参与补录轮', path: '/mentor/supplement' },
      { title: '录取名单', desc: '查看最终录取与入组名单', path: '/mentor/result' }
    ]
  },
  LAB_HEAD: {
    title: '实训室负责人工作台',
    subtitle: '统筹本室名额、面试安排与名单汇总',
    cards: [
      { title: '导师与名额', desc: '查看本室导师名额与使用情况', path: '/leader/quotas' },
      { title: '填报进度', desc: '监控本室各导师报名人数', path: '/leader/monitor' },
      { title: '面试排期', desc: '安排本室统一面试场次', path: '/leader/interviews' },
      { title: '名单汇总', desc: '汇总导师拟录取与递补名单', path: '/leader/nominations' },
      { title: '本室调剂', desc: '优先完成实训室内部调剂', path: '/leader/reallocation' },
      { title: '本室结果', desc: '查看本室最终录取与入组情况', path: '/leader/result' }
    ]
  },
  COLLEGE_ADMIN: {
    title: '学院管理员工作台',
    subtitle: '配置周期轮次与名额，监控全院进度并统筹调剂',
    cards: [
      { title: '周期与轮次', desc: '配置八阶段时间窗与当前轮次', path: '/admin/cycles' },
      { title: '实训室与导师', desc: '维护实训室档案、导师与名额', path: '/admin/mentors' },
      { title: '账号管理', desc: '导入账号、重置密码与禁用账号', path: '/admin/accounts' },
      { title: '全院监控', desc: '查看填报、面试、确认实时进度', path: '/admin/monitor' },
      { title: '统筹调剂', desc: '建立调剂池并执行跨室分配', path: '/admin/reallocation' },
      { title: '公示与异议', desc: '发布公示名单并处理异议工单', path: '/admin/publication' }
    ]
  }
}
