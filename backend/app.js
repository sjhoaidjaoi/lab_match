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
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ============ 写操作串行化（模拟事务，避免并发读改写丢失） ============
let mutationQueue = Promise.resolve()
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  let release
  const previous = mutationQueue
  mutationQueue = new Promise((resolve) => { release = resolve })
  previous.then(() => {
    res.once('finish', release)
    res.once('close', release)
    next()
  })
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
app.use('/api/preferences', require('./routes/preferences'))
app.use('/api/interviews', require('./routes/interviews'))
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

// ============ 错误处理 ============
app.use(notFound)
app.use(handleError)

// ============ 启动 ============
// 阶段状态定时同步：不依赖管理员开着页面，服务端每 30 秒按时钟推进一次
const { getStore, persistStore: persist } = require('./data/seed')
const { syncStageStatuses } = require('./utils/recruitment')
let stageTimer = null
function tickStageStatuses() {
  try {
    const store = getStore()
    if (syncStageStatuses(store) > 0) persist(store)
  } catch (err) {
    console.error('[lab-match] 阶段状态同步失败：', err.message)
  }
}

// 首次启动自动种子 Mock 数据
seedMockData()
  .then(() => {
    tickStageStatuses()
    stageTimer = setInterval(tickStageStatuses, 30 * 1000)
    if (stageTimer.unref) stageTimer.unref()
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
