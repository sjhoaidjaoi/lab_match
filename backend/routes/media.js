// ============ 宣讲视频 + 720° 全景云游 ============
// 严格对齐新文档第一阶段 / 第二阶段需求

const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { randomUUID } = require('crypto')
const { z } = require('zod')
const { ok } = require('../utils/result')
const { getStore, persistStore, commitStore, nextId } = require('../data/seed')
const { requireAuth, requireRole, ROLES, guardLab, isLabLeader } = require('../middleware/auth')

// ---- 站内文件上传（宣讲视频 / 全景图 / 封面图）----
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const MATERIAL_DIR = process.env.LAB_BRIEFING_DIR
  ? path.resolve(process.env.LAB_BRIEFING_DIR)
  : path.join(__dirname, '..', 'data', 'briefing-files')
const materialUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }).single('file')
const materialTypes = {
  '.pdf': 'application/pdf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

router.get('/labs/:labId/materials', requireAuth, (req, res) => {
  const lab = getStore().laboratories.find(item => item.id === Number(req.params.labId))
  if (!lab || (lab.status !== 'ACTIVE' && !isLabLeader(req, lab))) return res.status(404).end()
  res.json(ok((lab.briefingMaterials || []).map(({ id, name, mime }) => ({ id, name, mime }))))
})

router.post('/labs/:labId/materials', requireAuth, requireRole(ROLES.LAB_LEADER), (req, res, next) => {
  const labId = Number(req.params.labId)
  if (!guardLab(req, res, labId)) return
  materialUpload(req, res, error => {
    if (error) return res.status(400).json({ message: '上传失败，请确认文件不超过 20 MB' })
    const file = req.file
    const extension = path.extname(file?.originalname || '').toLowerCase()
    const mime = materialTypes[extension]
    const signature = file?.buffer.subarray(0, 8).toString('hex') || ''
    const valid = extension === '.pdf' ? signature.startsWith('255044462d')
      : extension === '.ppt' ? signature === 'd0cf11e0a1b11ae1'
      : extension === '.pptx' && signature.startsWith('504b0304')
    if (!mime || !valid) return res.status(400).json({ message: '请选择有效的 PDF、PPT 或 PPTX 文件' })
    try {
      const store = getStore()
      const lab = store.laboratories.find(item => item.id === labId)
      if (!lab) return res.status(404).json({ message: '实训室不存在' })
      if (req.user.activeRole === ROLES.LAB_LEADER && !isLabLeader(req, lab)) return res.status(403).json({ message: '无权修改本室资料' })
      const id = randomUUID()
      fs.mkdirSync(MATERIAL_DIR, { recursive: true })
      fs.writeFileSync(path.join(MATERIAL_DIR, id), file.buffer, { flag: 'wx' })
      const material = { id, name: path.basename(file.originalname).slice(0, 160), mime }
      lab.briefingMaterials = [...(lab.briefingMaterials || []), material]
      persistStore(store)
      res.json(ok(material))
    } catch (err) {
      next(err)
    }
  })
})

router.delete('/labs/:labId/materials/:id', requireAuth, requireRole(ROLES.LAB_LEADER), async (req, res, next) => {
  try {
    const store = structuredClone(getStore())
    const lab = store.laboratories.find(item => item.id === Number(req.params.labId))
    if (!lab || !isLabLeader(req, lab)) return res.status(403).json({ message: '无权修改本室资料' })
    const index = (lab.briefingMaterials || []).findIndex(item => item.id === req.params.id)
    if (index < 0) return res.status(404).json({ message: '资料不存在' })
    const [material] = lab.briefingMaterials.splice(index, 1)
    await commitStore(store)
    if (/^[a-f0-9-]{36}$/.test(material.id)) {
      fs.unlink(path.join(MATERIAL_DIR, material.id), error => {
        if (error && error.code !== 'ENOENT') console.error('宣讲资料文件清理失败', error.message)
      })
    }
    res.json(ok(null, '资料已移除'))
  } catch (error) {
    next(error)
  }
})

router.get('/labs/:labId/materials/:id', requireAuth, (req, res) => {
  const lab = getStore().laboratories.find(item => item.id === Number(req.params.labId) &&
    (item.status === 'ACTIVE' || isLabLeader(req, item)))
  const material = lab?.briefingMaterials?.find(item => item.id === req.params.id)
  if (!material || !/^[a-f0-9-]{36}$/.test(material.id)) return res.status(404).end()
  res.set('X-Content-Type-Options', 'nosniff')
  res.download(path.join(MATERIAL_DIR, material.id), material.name, { headers: { 'Content-Type': material.mime } })
})
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 10).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/|video\/|application\/pdf)/.test(file.mimetype || '')
    if (!allowed) return cb(new Error('仅支持图片、视频或 PDF 文件'))
    return cb(null, true)
  }
})

router.post('/upload', requireAuth,
  requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_LEADER, ROLES.LAB_TEACHER),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ code: 'VALIDATION_FAILED', message: err.message || '上传失败', data: null })
      return next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ code: 'VALIDATION_FAILED', message: '请选择要上传的文件', data: null })
    res.json(ok({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype
    }))
  }
)

const VideoSchema = z.object({
  laboratoryId: z.number().int(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  videoType: z.enum(['MP4', 'LINK', 'EMBED']),
  videoUrl: z.string().min(1),
  coverUrl: z.string().optional().nullable(),
  durationSeconds: z.number().int().optional().nullable(),
  sortNo: z.number().int().optional().default(1),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional().default('PUBLISHED')
})

const PanoramaSchema = z.object({
  laboratoryId: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  panoramaType: z.enum(['LINK', 'IMAGE']),
  panoramaUrl: z.string().min(1),
  coverUrl: z.string().optional().nullable(),
  sortNo: z.number().int().optional().default(1),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional().default('PUBLISHED')
})

// ==== 视频：学生/教师公开读 ====
router.get('/videos', (_req, res) => {
  const store = getStore()
  const labId = Number(_req.query.labId || 0) || null
  let list = store.mediaVideos.filter((v) => v.status === 'PUBLISHED')
  if (labId) list = list.filter((v) => v.laboratoryId === labId)
  list = list.map((v) => {
    const lab = store.laboratories.find((l) => l.id === v.laboratoryId)
    return { ...v, laboratoryName: lab?.name || `实训室#${v.laboratoryId}` }
  }).sort((a, b) => a.sortNo - b.sortNo)
  res.json(ok(list))
})

router.get('/labs/:labId/videos', (_req, res) => {
  const store = getStore()
  const list = store.mediaVideos.filter((v) => v.laboratoryId === Number(_req.params.labId) && v.status === 'PUBLISHED')
  res.json(ok(list.sort((a, b) => a.sortNo - b.sortNo)))
})

// ==== 全景：学生/教师公开读 ====
router.get('/panoramas', (_req, res) => {
  const store = getStore()
  const labId = Number(_req.query.labId || 0) || null
  let list = store.mediaPanoramas.filter((p) => p.status === 'PUBLISHED')
  if (labId) list = list.filter((p) => p.laboratoryId === labId)
  list = list.map((p) => {
    const lab = store.laboratories.find((l) => l.id === p.laboratoryId)
    return { ...p, laboratoryName: lab?.name || `实训室#${p.laboratoryId}` }
  }).sort((a, b) => a.sortNo - b.sortNo)
  res.json(ok(list))
})

router.get('/labs/:labId/panoramas', (_req, res) => {
  const store = getStore()
  const list = store.mediaPanoramas.filter((p) => p.laboratoryId === Number(_req.params.labId) && p.status === 'PUBLISHED')
  res.json(ok(list.sort((a, b) => a.sortNo - b.sortNo)))
})

// ==== 管理端 CRUD：学院管理员 + 组长 ====
const isAdminOrLeader = requireRole(ROLES.COLLEGE_ADMIN, ROLES.LAB_LEADER)
const leaderOnly = requireRole(ROLES.LAB_LEADER)

function guardMediaLab(req, res, store, labId) {
  const lab = store.laboratories.find(item => item.id === labId)
  if (lab && isLabLeader(req, lab)) return true
  res.status(403).json({ message: '只能维护本人负责实训室的资源' })
  return false
}

router.get('/admin/videos', requireAuth, isAdminOrLeader, (req, res) => {
  const store = getStore()
  const labId = Number(req.query.labId)
  res.json(ok(store.mediaVideos.filter(item => (!labId || item.laboratoryId === labId) &&
    (req.user.activeRole === ROLES.COLLEGE_ADMIN || item.laboratoryId === req.user.laboratoryId))))
})
router.post('/admin/videos', requireAuth, leaderOnly, (req, res) => {
  const body = VideoSchema.parse(req.body || {})
  const store = getStore()
  if (!guardMediaLab(req, res, store, body.laboratoryId)) return
  const id = nextId(store.mediaVideos)
  const item = { id, ...body, createdAt: new Date().toISOString() }
  store.mediaVideos.push(item); persistStore(store)
  res.json(ok(item))
})
router.put('/admin/videos/:id', requireAuth, leaderOnly, (req, res) => {
  const store = getStore()
  const idx = store.mediaVideos.findIndex((v) => v.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '视频不存在', data: null })
  if (!guardMediaLab(req, res, store, store.mediaVideos[idx].laboratoryId)) return
  const body = VideoSchema.partial().parse(req.body || {})
  if (body.laboratoryId !== undefined && !guardMediaLab(req, res, store, body.laboratoryId)) return
  store.mediaVideos[idx] = { ...store.mediaVideos[idx], ...body }; persistStore(store)
  res.json(ok(store.mediaVideos[idx]))
})
router.delete('/admin/videos/:id', requireAuth, leaderOnly, (req, res) => {
  const store = getStore()
  const item = store.mediaVideos.find(v => v.id === Number(req.params.id))
  if (item && !guardMediaLab(req, res, store, item.laboratoryId)) return
  store.mediaVideos = store.mediaVideos.filter((v) => v.id !== Number(req.params.id))
  persistStore(store); res.json(ok(null, '已删除'))
})

router.get('/admin/panoramas', requireAuth, isAdminOrLeader, (req, res) => {
  const store = getStore()
  const labId = Number(req.query.labId)
  res.json(ok(store.mediaPanoramas.filter(item => (!labId || item.laboratoryId === labId) &&
    (req.user.activeRole === ROLES.COLLEGE_ADMIN || item.laboratoryId === req.user.laboratoryId))))
})
router.post('/admin/panoramas', requireAuth, leaderOnly, (req, res) => {
  const body = PanoramaSchema.parse(req.body || {})
  const store = getStore()
  if (!guardMediaLab(req, res, store, body.laboratoryId)) return
  const id = nextId(store.mediaPanoramas)
  const item = { id, ...body, createdAt: new Date().toISOString() }
  store.mediaPanoramas.push(item); persistStore(store)
  res.json(ok(item))
})
router.put('/admin/panoramas/:id', requireAuth, leaderOnly, (req, res) => {
  const store = getStore()
  const idx = store.mediaPanoramas.findIndex((p) => p.id === Number(req.params.id))
  if (idx < 0) return res.status(404).json({ code: 'NOT_FOUND', message: '全景不存在', data: null })
  if (!guardMediaLab(req, res, store, store.mediaPanoramas[idx].laboratoryId)) return
  const body = PanoramaSchema.partial().parse(req.body || {})
  if (body.laboratoryId !== undefined && !guardMediaLab(req, res, store, body.laboratoryId)) return
  store.mediaPanoramas[idx] = { ...store.mediaPanoramas[idx], ...body }; persistStore(store)
  res.json(ok(store.mediaPanoramas[idx]))
})
router.delete('/admin/panoramas/:id', requireAuth, leaderOnly, (req, res) => {
  const store = getStore()
  const item = store.mediaPanoramas.find(p => p.id === Number(req.params.id))
  if (!item) return res.status(404).json({ message: '全景不存在' })
  if (!guardMediaLab(req, res, store, item.laboratoryId)) return
  store.mediaPanoramas = store.mediaPanoramas.filter((p) => p.id !== Number(req.params.id))
  persistStore(store); res.json(ok(null, '已删除'))
})

module.exports = router
