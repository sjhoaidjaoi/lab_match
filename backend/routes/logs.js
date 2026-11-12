// ============ 操作日志（文档 5.10 节） ============
const express = require('express')
const router = express.Router()
const { ok } = require('../utils/result')
const { getStore } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')

router.get('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const keyword = (req.query.keyword || '').toString().trim()
  const operationType = (req.query.operationType || '').toString().trim()
  const list = [...(store.operationLogs || [])]
    .filter((l) => (operationType ? l.operationType === operationType : true))
    .filter((l) => {
      if (!keyword) return true
      return (l.operationDescription || '').includes(keyword) || (l.operationType || '').includes(keyword)
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 300)
    .map((l) => {
      const operator = store.users.find((u) => u.id === l.operatorId)
      return { ...l, operatorName: operator?.realName || '系统' }
    })
  res.json(ok(list))
})

module.exports = router
