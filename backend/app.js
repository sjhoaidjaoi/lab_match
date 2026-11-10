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

// ============ 静态资源（上传文件） ============
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
app.use('/uploads', express.static(uploadDir))

// ============ 健康检查 ============
app.get('/api/health', (_req, res) => {
  res.json({ code: 'OK', message: 'ok', data: { status: 'UP', time: new Date().toISOString() } })
})

// ============ 路由挂载 ============
app.use('/api/auth', require('./routes/auth'))
app.use('/api/batches', require('./routes/batches'))
app.use('/api/laboratories', require('./routes/laboratories'))
app.use('/api/preferences', require('./routes/preferences'))
app.use('/api/interviews', require('./routes/interviews'))
app.use('/api/admissions', require('./routes/admissions'))
app.use('/api/adjustments', require('./routes/adjustments'))
app.use('/api/final', require('./routes/final'))
app.use('/api/media', require('./routes/media'))
app.use('/api/announcements', require('./routes/announcements'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/logs', require('./routes/logs'))

// ============ 错误处理 ============
app.use(notFound)
app.use(handleError)

// ============ 启动 ============
// 首次启动自动种子 Mock 数据
seedMockData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[lab-match] backend listening on http://localhost:${PORT}`)
      console.log(`[lab-match] 健康检查 -> http://localhost:${PORT}/api/health`)
    })
  })
  .catch((err) => {
    console.error('[lab-match] 启动失败：', err)
    process.exit(1)
  })

module.exports = app
