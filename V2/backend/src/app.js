import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { notFound, errorHandler } from './utils/response.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// 骨架阶段所有业务接口统一挂 /api，具体实现由各模块负责人补充
app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[trs-backend] listening on http://localhost:${PORT}`)
})
