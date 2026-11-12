// ============ 操作日志（文档 5.10 节） ============
const express = require('express')
const router = express.Router()
const { ok } = require('../utils/result')
const { getStore } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

router.get('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const list = store.operationLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 200)
  res.json(ok(list))
})

module.exports = router
