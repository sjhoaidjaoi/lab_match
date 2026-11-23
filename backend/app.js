require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const { notFound, handleError } = require('./middleware/error')
const { seedMockData } = require('./data/seed')

const app = express()
const PORT = process.env.PORT || 8080

// ============ 基础中间件 ============
// CORS：设置 CORS_ORIGIN（逗号分隔）后只放行白名单来源。
// 未设置时沿用「反射来源」的开发期默认值；生产环境应显式配置白名单。
const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
app.use(cors(corsOrigins.length
  ? {
      origin(origin, callback) {
        // 无 Origin（同源请求、服务端调用、curl）直接放行
        if (!origin) return callback(null, true)
        if (corsOrigins.includes(origin)) return callback(null, true)
        return callback(null, false)
      },
      credentials: true
    }
  : { origin: true, credentials: true }))

// ============ 写操作串行化（模拟事务，避免并发读改写丢失） ============
let mutationQueue = Promise.resolve()
function enqueueMutation(operation) {
  const run = mutationQueue.then(operation)
  mutationQueue = run.catch(() => {})
  return run
}
app.locals.enqueueMutation = enqueueMutation
app.post('/api/livekit/webhook',
  express.raw({ type: ['application/webhook+json', 'application/json'], limit: '256kb' }),
  require('./services/interviewWebhook').handleInterviewWebhook(enqueueMutation))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ============ 接口限流（先于写队列，被限流的请求不占用串行队列） ============
const { apiThrottle } = require('./middleware/rateLimit')
app.use('/api', apiThrottle)

// E宝 助手是一次十几秒的大模型推理，虽然用 POST 但属只读问答：
// 必须挂在写串行队列之前，否则一次提问会把全站写请求堵在队列里。
app.use('/api/assistant', require('./routes/assistant'))

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  enqueueMutation(() => new Promise((release) => {
    if (res.destroyed) { release(); return }
    const complete = () => {
      const pending = res.locals.mutationPending
      if (pending) pending.then(release, release)
      else release()
    }
    res.once('finish', complete)
    res.once('close', complete)
    next()
  })).catch(next)
})

// ============ 静态资源（上传文件） ============
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
app.use('/uploads', express.static(uploadDir))

// ============ 健康检查 ============
app.get('/api/health', (_req, res) => {
  res.json({ code: 'OK', message: 'ok', data: {
    status: 'UP',
    storage: process.env.DB_DRIVER === 'mysql' ? 'mysql' : 'file',
    time: new Date().toISOString()
  } })
})

// ============ 路由挂载 ============
app.use('/api/auth', require('./routes/auth'))
app.use('/api/batches', require('./routes/batches'))
app.use('/api/laboratories', require('./routes/laboratories'))
app.use('/api/lab-profiles', require('./routes/labProfiles'))
app.use('/api/preferences', require('./routes/preferences'))
app.use('/api/interviews', require('./routes/interviews'))
app.use('/api/interview-video', require('./routes/interviewVideo'))
app.use('/api/admissions', require('./routes/admissions'))
app.use('/api/recruitment-reviews', require('./routes/recruitmentReviews'))
app.use('/api/adjustments', require('./routes/adjustments'))
app.use('/api/final', require('./routes/final'))
app.use('/api/media', require('./routes/media'))
app.use('/api/announcements', require('./routes/announcements'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/logs', require('./routes/logs'))
app.use('/api/users', require('./routes/users'))
app.use('/api/statistics', require('./routes/statistics'))
app.use('/api/open-days', require('./routes/openDays'))
// 多轮补录 + 全院调剂池（剩余名额、轮次、调剂池、学生补录志愿）
app.use('/api/allocation', require('./routes/allocation'))

// ============ 错误处理 ============
app.use(notFound)
app.use(handleError)

// ============ 启动 ============
// 阶段状态定时同步：不依赖管理员开着页面，服务端每 30 秒按时钟推进一次
const { getStore, persistStore: persist } = require('./data/seed')
const { syncStageStatuses } = require('./utils/recruitment')
const { sweepVideoRooms } = require('./services/interviewVideoCleanup')
const { sweepRecordings } = require('./services/interviewRecording')
const { sweepAi } = require('./services/interviewAi')
let stageTimer = null
const { settleFirstRound } = require('./services/admissionSettlement')
const { currentBatch: settlementBatch } = require('./utils/recruitment')
function tickStageStatuses() {
  try {
    const store = getStore()
    const stagesChanged = syncStageStatuses(store)
    const admissionsChanged = settleFirstRound(store, settlementBatch(store))
    if (stagesChanged || admissionsChanged) persist(store)
  } catch (err) {
    console.error('[lab-match] 阶段状态同步失败：', err.message)
  }
}

// 首次启动自动种子 Mock 数据
seedMockData()
  .then(() => {
    tickStageStatuses()
    stageTimer = setInterval(() => enqueueMutation(tickStageStatuses), 30 * 1000)
    if (stageTimer.unref) stageTimer.unref()
    const videoTimer = setInterval(() => {
      enqueueMutation(() => sweepVideoRooms(enqueueMutation)).catch(error => {
        console.error('[lab-match] 线上面试状态同步失败：', error.message)
      })
    }, 5000)
    videoTimer.unref()
    const recordingTimer = setInterval(() => {
      try { sweepRecordings(enqueueMutation) }
      catch { console.warn('[lab-match] 录像状态检查失败，将重试') }
    }, 3500)
    recordingTimer.unref()
    const aiTimer = setInterval(() => sweepAi(enqueueMutation), 4000)
    aiTimer.unref()
    app.listen(PORT, () => {
      console.log(`[lab-match] backend listening on http://localhost:${PORT}`)
      console.log(`[lab-match] 数据存储: ${process.env.DB_DRIVER === 'mysql' ? 'MySQL' : 'JSON 文件'}`)
      console.log(`[lab-match] 健康检查 -> http://localhost:${PORT}/api/health`)
    })
  })
  .catch((err) => {
    console.error('[lab-match] 启动失败：', err.message)
    console.error('[lab-match] 若使用 MySQL，请确认数据库已通过 npm run db:init 初始化，或设置 DB_DRIVER=file 使用文件存储')
    process.exit(1)
  })

module.exports = app
