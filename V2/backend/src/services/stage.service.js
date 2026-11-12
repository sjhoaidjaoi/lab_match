// 阶段配置（与学院流程图一致）。真实实现从 recruitment_stages 读取。
const STAGES = [
  { no: 1, name: '集中宣讲', start: '2026-10-28T19:00:00+08:00', end: '2026-10-28T21:00:00+08:00' },
  { no: 2, name: '实训室开放日', start: '2026-10-29T09:00:00+08:00', end: '2026-10-30T17:00:00+08:00' },
  { no: 3, name: '学生意向填报', start: '2026-11-02T08:00:00+08:00', end: '2026-11-02T12:00:00+08:00' },
  { no: 4, name: '导师初选与面试考核', start: '2026-11-02T12:00:00+08:00', end: '2026-11-03T17:00:00+08:00' },
  { no: 5, name: '拟录取与学生确认', start: '2026-11-04T08:00:00+08:00', end: '2026-11-04T12:00:00+08:00' },
  { no: 6, name: '分轮补录（内部调剂）', start: '2026-11-04T12:00:00+08:00', end: '2026-11-05T17:00:00+08:00' },
  { no: 7, name: '统筹调剂录取', start: '2026-11-06T08:00:00+08:00', end: '2026-11-06T12:00:00+08:00' },
  { no: 8, name: '结果公示与正式入组', start: '2026-11-07T08:00:00+08:00', end: '2026-11-08T08:00:00+08:00' }
]

export function listStages() {
  return STAGES.map((s) => ({ ...s }))
}

/**
 * 当前阶段：
 * - 优先使用 DEMO_STAGE_NO（联调用，例如 DEMO_STAGE_NO=6）
 * - 否则按当前时间落在哪个阶段区间
 * - 都不匹配返回 null（阶段间隙）
 */
export function getCurrentStage(now = new Date()) {
  const override = Number(process.env.DEMO_STAGE_NO)
  if (override) return STAGES.find((s) => s.no === override) || null

  const t = now.getTime()
  return (
    STAGES.find((s) => t >= Date.parse(s.start) && t <= Date.parse(s.end)) ||
    // 已全部结束：返回最后阶段，便于后续只读
    (t > Date.parse(STAGES[STAGES.length - 1].end) ? STAGES[STAGES.length - 1] : null)
  )
}
