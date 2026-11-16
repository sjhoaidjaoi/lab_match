const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { requireAuth, requireRole, ROLES } = require('../middleware/auth')
const { getStore, commitStore } = require('../data/seed')
const { currentBatch, stageOpen, ownsChoice, personalScope } = require('../utils/applicationScope')
const { ok } = require('../utils/result')

const router = express.Router()
const directory = path.resolve(process.env.LAB_RESUME_DIR || path.join(__dirname, '../data/private-resumes'))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 2 } }).single('file')
const formats = {
  '.pdf': ['application/pdf', '255044462d'],
  '.doc': ['application/msword', 'd0cf11e0a1b11ae1'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '504b0304']
}

function resumeFile(id) {
  return /^[a-f0-9-]{36}$/.test(id) ? path.join(directory, id) : null
}

function resumeView(item) {
  return item ? { id: item.id, name: item.name, size: item.size } : null
}

router.get('/draft', requireAuth, requireRole(ROLES.STUDENT), (req, res) => {
  const store = getStore()
  const batch = currentBatch(store)
  res.json(ok(resumeView((store.applicationResumes || []).find(item =>
    item.studentId === req.user.uid && item.batchId === batch?.id && !item.submittedAt))))
})

router.post('/draft', requireAuth, requireRole(ROLES.STUDENT), (req, res, next) => {
  upload(req, res, async error => {
    if (error) return res.status(400).json({ message: '请选择一份不超过 10 MB 的简历' })
    const file = req.file
    const extension = path.extname(file?.originalname || '').toLowerCase()
    const format = formats[extension]
    if (!file || !format || ![format[0], 'application/octet-stream'].includes(file.mimetype) ||
        !file.buffer.toString('hex', 0, 8).startsWith(format[1]) ||
        (extension === '.pdf' && !file.buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) ||
        (extension === '.docx' && !file.buffer.includes(Buffer.from('word/document.xml')))) {
      return res.status(400).json({ message: '简历必须是有效的 PDF、DOC 或 DOCX 文件' })
    }
    let written
    try {
      const store = structuredClone(getStore())
      const batch = currentBatch(store)
      if (!batch || !stageOpen(store, batch.id, 3)) return res.status(409).json({ message: '当前不在志愿填报时间内' })
      if (store.studentPreferences.some(item => item.studentId === req.user.uid && item.batchId === batch.id && item.status === 'SUBMITTED')) {
        return res.status(409).json({ message: '志愿已提交，不能更换简历' })
      }
      store.applicationResumes ||= []
      const previous = store.applicationResumes.find(item => item.batchId === batch.id && item.studentId === req.user.uid)
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      const displayName = originalName.includes('\uFFFD') ? file.originalname : originalName
      const item = {
        id: randomUUID(), batchId: batch.id, studentId: req.user.uid,
        name: displayName.split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180),
        mime: format[0], size: file.size, submittedAt: null
      }
      fs.mkdirSync(directory, { recursive: true })
      const filename = resumeFile(item.id)
      fs.writeFileSync(filename, file.buffer, { flag: 'wx', mode: 0o600 })
      written = filename
      store.applicationResumes = store.applicationResumes.filter(record => record !== previous)
      store.applicationResumes.push(item)
      await commitStore(store)
      written = null
      const oldFile = previous && resumeFile(previous.id)
      if (oldFile) {
        try { fs.rmSync(oldFile, { force: true }) }
        catch (error) { console.error('旧简历清理失败', error.code) }
      }
      res.json(ok(resumeView(item)))
    } catch (err) {
      if (written) fs.rmSync(written, { force: true })
      next(err)
    }
  })
})

function canReadChoice(store, user, choice) {
  if (ownsChoice(store, personalScope(user), choice)) return true
  return user.activeRole === ROLES.LAB_LEADER && ownsChoice(store, user, choice) &&
    (store.admissionIntentions.some(item => item.source === 'TEACHER_INVITATION' &&
      item.batchId === choice.batchId && item.laboratoryId === choice.laboratoryId &&
      item.studentId === choice.studentId && item.labTeacherId === choice.labTeacherId) ||
    (store.recruitmentReviews || []).some(review => review.batchId === choice.batchId &&
      review.laboratoryId === choice.laboratoryId && review.kind === 'TEACHER' &&
      ['SUBMITTED', 'RETURNED'].includes(review.status) && review.entries?.some(entry =>
        entry.studentId === choice.studentId && entry.labTeacherId === choice.labTeacherId)))
}

router.get('/:id', requireAuth, (req, res) => {
  const store = getStore()
  const item = (store.applicationResumes || []).find(record => record.id === req.params.id)
  const allowed = item && (req.user.activeRole === ROLES.STUDENT
    ? req.user.uid === item.studentId
    : item.submittedAt && (req.user.activeRole === ROLES.COLLEGE_ADMIN ||
      (currentBatch(store)?.id === item.batchId && store.studentPreferences.some(choice =>
        choice.batchId === item.batchId && choice.studentId === item.studentId && canReadChoice(store, req.user, choice)))))
  const filename = allowed && resumeFile(item.id)
  if (!filename || !fs.existsSync(filename)) return res.status(404).json({ message: '简历不存在或无权访问' })
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
  res.download(filename, item.name, { headers: { 'Content-Type': item.mime } })
})

module.exports = { router, resumeFile, resumeView }
