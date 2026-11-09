export interface StageDef {
  no: number
  name: string
  time: string
  desc: string
}

/** 八阶段流程（与集中宣讲海报一致，用于前端时间轴展示；实际时间以服务端轮次配置为准） */
export const stages: StageDef[] = [
  { no: 1, name: '集中宣讲', time: '10月28日 19:00', desc: '统一介绍选拔规则、实训室方向与培养方案' },
  { no: 2, name: '实训室开放日', time: '10月29日—10月30日', desc: '实地参观实训室，与导师面对面交流' },
  { no: 3, name: '意向填报', time: '11月2日 08:00—12:00', desc: '至多填报 3 个平行意向，签订调剂同意书' },
  { no: 4, name: '导师初选与面试考核', time: '11月2日 12:00—11月3日 17:00', desc: '实训室统一组织面试与问卷考核' },
  { no: 5, name: '拟录取与学生确认', time: '11月4日 08:00—12:00', desc: '发出拟录取通知，学生在窗口内确认' },
  { no: 6, name: '分轮补录', time: '11月4日 12:00—11月5日 17:00', desc: '按剩余名额滚动补录，直至名额耗尽' },
  { no: 7, name: '统筹调剂录取', time: '11月6日 08:00—12:00', desc: '未录取学生按三级范围统筹调剂' },
  { no: 8, name: '结果公示与正式入组', time: '公示 1 天', desc: '公示最终名单，处理异议后正式入组' }
]

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: '学生',
  MENTOR: '导师',
  LAB_HEAD: '实训室负责人',
  COLLEGE_ADMIN: '学院管理员',
  SYS_ADMIN: '系统管理员'
}

export const ROLE_HOME: Record<string, string> = {
  STUDENT: '/student',
  MENTOR: '/mentor',
  LAB_HEAD: '/leader',
  COLLEGE_ADMIN: '/admin',
  SYS_ADMIN: '/admin'
}
