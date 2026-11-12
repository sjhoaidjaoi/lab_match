// ============ 实训室开放日安排（学院总负责人端） ============
// GET    /api/open-days                开放日场次列表（可按 laboratoryId 过滤）
// POST   /api/open-days                新建场次
// PUT    /api/open-days/:id            修改场次
// DELETE /api/open-days/:id            删除场次

const express = require('express')
const router = express.Router()
const { z } = require('zod')
const { ok, fail, ResultCode } = require('../utils/result')
const { getStore, persistStore } = require('../data/seed')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { logOperation } = require('../utils/audit')

const ScheduleSchema = z.object({
  laboratoryId: z.number().int(),
  title: z.string().min(1, '请输入场次主题'),
  date: z.string().min(1, '请选择日期'),
  startTime: z.string().min(1, '请选择开始时间'),
  endTime: z.string().min(1, '请选择结束时间'),
  location: z.string().optional().default(''),
  note: z.string().optional().default('')
})

function ensureStore(store) {
  if (!store.openDaySchedules) store.openDaySchedules = []
  return store.openDaySchedules
}

function toView(store, s) {
  return { ...s, laboratoryName: store.laboratories.find((l) => l.id === s.laboratoryId)?.name || '' }
}

// 场次列表（学生端也可读取已排定的场次）
router.get('/', (req, res) => {
  const store = getStore()
  const labId = req.query.laboratoryId ? Number(req.query.laboratoryId) : null
  const list = ensureStore(store)
    .filter((s) => (labId ? s.laboratoryId === labId : true))
    .map((s) => toView(store, s))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  res.json(ok(list))
})

// 新建场次
router.post('/', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = ScheduleSchema.parse(req.body || {})
  const store = getStore()
  const lab = store.laboratories.find((l) => l.id === body.laboratoryId)
  if (!lab) return res.status(404).json(fail(ResultCode.NOT_FOUND, '实训室不存在'))
  const list = ensureStore(store)
  const item = {
    id: list.length ? Math.max(...list.map((s) => s.id)) + 1 : 1,
    ...body,
    createdAt: new Date().toISOString()
  }
  list.push(item)
  logOperation(store, req, {
    operationType: 'CREATE_OPEN_DAY', targetType: 'OPEN_DAY', targetId: item.id,
    description: `新增开放日场次「${item.title}」（${lab.name} ${item.date} ${item.startTime}-${item.endTime}）`
  })
  persistStore(store)
  res.json(ok(toView(store, item)))
})

// 修改场次
router.put('/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const body = ScheduleSchema.parse(req.body || {})
  const store = getStore()
  const list = ensureStore(store)
  const item = list.find((s) => s.id === Number(req.params.id))
  if (!item) return res.status(404).json(fail(ResultCode.NOT_FOUND, '开放日场次不存在'))
  Object.assign(item, body)
  logOperation(store, req, {
    operationType: 'UPDATE_OPEN_DAY', targetType: 'OPEN_DAY', targetId: item.id,
    description: `修改开放日场次「${item.title}」`
  })
  persistStore(store)
  res.json(ok(toView(store, item)))
})

// 删除场次
router.delete('/:id', requireAuth, requireRole(ROLES.COLLEGE_ADMIN), (req, res) => {
  const store = getStore()
  const list = ensureStore(store)
  const idx = list.findIndex((s) => s.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json(fail(ResultCode.NOT_FOUND, '开放日场次不存在'))
  const [removed] = list.splice(idx, 1)
  logOperation(store, req, {
    operationType: 'DELETE_OPEN_DAY', targetType: 'OPEN_DAY', targetId: removed.id,
    description: `删除开放日场次「${removed.title}」`
  })
  persistStore(store)
  res.json(ok({ deleted: removed.id }))
})

module.exports = router
