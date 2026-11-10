export interface StageDef {
  no: number
  name: string
  key: string
  /** 兼容旧组件用 */
  time?: string
  desc: string
}

/** 八阶段流程（严格对齐文档三章 3.x 节） */
export const stages: StageDef[] = [
  { no: 1, key: 'BRIEFING', name: '集中宣讲',               time: '学院统一安排', desc: '学院组织统一宣讲，学生了解实训室方向、名额与培养方案' },
  { no: 2, key: 'OPEN_DAY', name: '实训室开放日',            time: '学院统一安排', desc: '开放日展示，支持 720° 全景云游' },
  { no: 3, key: 'PREFERENCE', name: '学生意向填报',         time: '学院统一安排', desc: '最多 3 个平行志愿 + 2 项调剂意愿独立选择' },
  { no: 4, key: 'INTERVIEW', name: '导师初选与面试考核',     time: '学院统一安排', desc: '实训室统一面试，5 维度评分' },
  { no: 5, key: 'ADMISSION_CONFIRM', name: '拟录取与学生确认', time: '学院统一安排', desc: '单意向自动确认，多意向自主选择' },
  { no: 6, key: 'INTERNAL_SUPPLEMENT', name: '实训室内部调剂', time: '学院统一安排', desc: '组长主导，优先解决本室空缺' },
  { no: 7, key: 'COLLEGE_ADJUSTMENT', name: '学院统筹调剂',  time: '学院统一安排', desc: '跨实训室调剂 + 沟通安置' },
  { no: 8, key: 'FINAL_PUBLICITY', name: '结果公示与正式入组', time: '学院统一安排', desc: '公示 + 异议 + 正式入组' }
]

/** 四种核心角色（严格对齐文档 2.x + 5.1 节） */
export const ROLE_LABELS: Record<string, string> = {
  STUDENT: '学生',
  LAB_TEACHER: '实训室教师',
  LAB_LEADER: '实训室组长',
  COLLEGE_ADMIN: '学院总负责人'
}

export const ROLE_HOME: Record<string, string> = {
  STUDENT: '/student',
  LAB_TEACHER: '/teacher',
  LAB_LEADER: '/leader',
  COLLEGE_ADMIN: '/admin'
}
