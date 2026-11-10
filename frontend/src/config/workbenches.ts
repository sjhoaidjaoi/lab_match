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

// 工作台上的推荐卡片（按当前角色展示）
// 路径与 router/index.ts 对齐；标题与文档 4.2 ~ 4.5 节一致

export const workbenches: Record<string, WorkbenchConfig> = {
  STUDENT: {
    title: '学生工作台',
    subtitle: '查看选拔进度、完成意向填报与录取确认',
    cards: [
      { title: '集中宣讲',     desc: '阅读实训室介绍、观看宣讲视频',      path: '/student/briefing' },
      { title: '实训室开放日', desc: '720° 全景云游 + 开放日安排',         path: '/student/open-day' },
      { title: '意向填报',     desc: '最多 3 个平行志愿 + 调剂意愿',       path: '/student/preferences' },
      { title: '面试中心',     desc: '查看面试时间、地点与形式',           path: '/student/interview' },
      { title: '录取中心',     desc: '拟录取通知 + 录取确认',              path: '/student/admission' },
      { title: '我的结果',     desc: '最终录取状态 + 公示名单',            path: '/student/result' }
    ]
  },
  LAB_TEACHER: {
    title: '实训室教师工作台',
    subtitle: '组织面试、记录评价、提交拟录取与递补名单',
    cards: [
      { title: '本室信息',   desc: '实训室介绍、名额、项目方向',      path: '/teacher/lab' },
      { title: '报名管理',   desc: '查看本室报名学生与调剂意愿',      path: '/teacher/applicants' },
      { title: '面试管理',   desc: '创建面试安排、设置时间地点',      path: '/teacher/interviews' },
      { title: '面试评价',   desc: '5 维度评分 + 评语 + 建议',        path: '/teacher/scoring' },
      { title: '拟录取名单', desc: '提交 INTENDED / ALTERNATE 名单',  path: '/teacher/nomination' },
      { title: '最终名单',   desc: '查看本室最终录取与入组名单',      path: '/teacher/result' }
    ]
  },
  LAB_LEADER: {
    title: '实训室组长工作台',
    subtitle: '统筹本室名额、汇总面试评价、组织内部调剂并提交学院',
    cards: [
      { title: '本室综合情况', desc: '报名 / 面试 / 确认 / 剩余名额一览', path: '/leader/overview' },
      { title: '教师与面试',   desc: '汇总所有教师的面试评价',            path: '/leader/teachers' },
      { title: '名单汇总',     desc: '协调拟录取与递补名单',              path: '/leader/aggregate' },
      { title: '内部调剂',     desc: '优先完成本室空缺补录',              path: '/leader/internal' },
      { title: '提交学院审核', desc: '提交本室结果 + 剩余名额给学院',     path: '/leader/submit' }
    ]
  },
  COLLEGE_ADMIN: {
    title: '学院总负责人工作台',
    subtitle: '管理批次 / 阶段时间，统筹全院调剂，生成并发布最终名单',
    cards: [
      { title: '批次管理',     desc: '创建选拔批次、配置八阶段时间窗',   path: '/admin/batches' },
      { title: '实训室管理',   desc: '实训室档案、名额、负责人',          path: '/admin/laboratories' },
      { title: '志愿填报管理', desc: '全院志愿分布与报名人数统计',        path: '/admin/preferences' },
      { title: '全院调剂管理', desc: '跨实训室调剂 + 未落实学生安置',     path: '/admin/adjustments' },
      { title: '最终名单',     desc: '合并确认 + 调剂 → 生成最终名单',   path: '/admin/final' },
      { title: '公示与异议',   desc: '发布公示、管理异议、正式入组',      path: '/admin/publication' }
    ]
  }
}
