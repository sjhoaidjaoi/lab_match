// 阶段时间取自学院流程图（2026 年选拔批次）
// 注意：流程图第 6 步为「分轮补录（重新填报 + 再面试）」，与需求文档「内部调剂（不再面试）」存在口径差异，
// 此处按文档建模并保留批次子轮次字段，待学院确认后调整。
export const stages = [
  { no: 1, name: '集中宣讲', start: '2026-10-28 19:00', end: '2026-10-28 21:00', status: 'COMPLETED' },
  { no: 2, name: '实训室开放日', start: '2026-10-29 09:00', end: '2026-10-30 17:00', status: 'COMPLETED' },
  { no: 3, name: '学生意向填报', start: '2026-11-02 08:00', end: '2026-11-02 12:00', status: 'COMPLETED' },
  { no: 4, name: '导师初选与面试考核', start: '2026-11-02 12:00', end: '2026-11-03 17:00', status: 'COMPLETED' },
  { no: 5, name: '拟录取与学生确认', start: '2026-11-04 08:00', end: '2026-11-04 12:00', status: 'IN_PROGRESS' },
  { no: 6, name: '分轮补录（内部调剂）', start: '2026-11-04 12:00', end: '2026-11-05 17:00', status: 'NOT_STARTED' },
  { no: 7, name: '统筹调剂录取', start: '2026-11-06 08:00', end: '2026-11-06 12:00', status: 'NOT_STARTED' },
  { no: 8, name: '结果公示与正式入组', start: '2026-11-07 08:00', end: '2026-11-08 08:00', status: 'NOT_STARTED' }
]

// 骨架期没有后端时钟，固定演示阶段，便于联调与截图
export const DEMO_STAGE_NO = 6
