/**
 * 全量测试汇总执行器
 * 运行：npm run test:all
 *
 * 依次执行全部测试套件，汇总结果并以退出码反映总体结论，
 * 供 CI 与最终验收报告取证使用。任一套件失败即整体失败。
 */
const { spawnSync } = require('child_process')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const SUITES = [
  { name: '接口冒烟（四端业务 + 权限）', file: 'tests/api.smoke.js' },
  { name: '选拔流程（八阶段 + 批次停止 + 分级账号）', file: 'tests/recruitment-flow.js' },
  { name: '实训室资料管理（学院统一维护）', file: 'tests/lab-profile.js' },
  { name: '多轮补录与全院调剂池', file: 'tests/allocation.js' },
  { name: '阶段真实时钟自动流转', file: 'tests/stage-clock.js' },
  { name: '接口限流与登录防爆破', file: 'tests/rate-limit.js' },
  { name: '数据库初始化（真实 MySQL，无库时跳过）', file: 'tests/db-init.js' },
  { name: '线上面试（排期/等候/令牌/聊天）', file: 'tests/interview-video.js' },
  { name: '会议录制与留痕', file: 'tests/interview-recording.js' },
  { name: 'AI 纪要（STT/总结/审阅）', file: 'tests/interview-ai.js' }
]

function extractSummary(output) {
  const patterns = [
    /=====\s*测试结果：通过\s*(\d+)，失败\s*(\d+)\s*=====/,
    /=====\s*流程验收结果：通过\s*(\d+)，失败\s*(\d+)\s*=====/,
    /结果：通过\s*(\d+)\s*项，失败\s*(\d+)\s*项/,
    /=====\s*阶段时钟验收结果：通过\s*(\d+)，失败\s*(\d+)\s*=====/,
    /=====\s*补录与调剂验收结果：通过\s*(\d+)，失败\s*(\d+)\s*=====/,
    /=====\s*限流验收结果：通过\s*(\d+)，失败\s*(\d+)\s*=====/,
    /=====\s*数据库初始化验收结果：通过\s*(\d+)，失败\s*(\d+)\s*=====/
  ]
  for (const pattern of patterns) {
    const match = output.match(pattern)
    if (match) return { pass: Number(match[1]), fail: Number(match[2]) }
  }
  return null
}

let totalPass = 0
let totalFail = 0
const failedSuites = []
const results = []

for (const suite of SUITES) {
  process.stdout.write(`\n──────── ${suite.name} ────────\n`)
  const startedAt = Date.now()
  const run = spawnSync(process.execPath, [suite.file], {
    cwd: ROOT,
    env: { ...process.env, LAB_RATE_LIMIT: process.env.LAB_RATE_LIMIT || '' },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  })
  const output = `${run.stdout || ''}${run.stderr || ''}`
  const durationMs = Date.now() - startedAt

  // 只回显每个套件的末尾若干行，避免日志过长
  const tail = output.trim().split('\n').slice(-6).join('\n')
  console.log(tail)

  const summary = extractSummary(output)
  if (summary) {
    totalPass += summary.pass
    totalFail += summary.fail
    results.push({ ...suite, ...summary, durationMs, status: summary.fail === 0 ? 'PASS' : 'FAIL' })
    if (summary.fail > 0) failedSuites.push(suite.name)
  } else {
    const okRun = run.status === 0
    results.push({
      ...suite,
      pass: okRun ? 1 : 0,
      fail: okRun ? 0 : 1,
      durationMs,
      status: okRun ? 'PASS' : 'FAIL'
    })
    if (!okRun) {
      failedSuites.push(suite.name)
      totalFail += 1
      console.log(`  [该套件无计数器输出，按进程退出码判定：${okRun ? '通过' : '失败'}]`)
    } else {
      totalPass += 1
    }
  }
}

console.log('\n================ 汇总 ================')
for (const r of results) {
  const counter = r.pass + r.fail > 1 ? `${r.pass} 通过 / ${r.fail} 失败` : r.status
  console.log(`  ${r.status.padEnd(4)} ${r.name.padEnd(34)} ${counter.padEnd(18)} ${(r.durationMs / 1000).toFixed(1)}s`)
}
console.log(`\n总计：通过 ${totalPass}，失败 ${totalFail}`)
if (failedSuites.length) {
  console.log(`失败套件：${failedSuites.join('、')}`)
  process.exit(1)
}
console.log('全部测试套件通过。')
