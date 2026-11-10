// ==============================
// Mock 数据层（第一阶段使用）
// 严格对齐新文档 5.1-5.10 节 10 张核心表
// ==============================

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const STORE_FILE = path.join(__dirname, '.store.json')
// 演示账号统一密码：123456
const DEMO_PASSWORD_HASH = bcrypt.hashSync('123456', 10)

function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))
  } catch {
    return null
  }
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8')
}

// 角色枚举（严格对齐新文档 5.1 节）
const ROLES = ['STUDENT', 'LAB_TEACHER', 'LAB_LEADER', 'COLLEGE_ADMIN']

// 阶段状态（新文档 5.4 节）
const STAGE_STATUS = { NOT_STARTED: 'NOT_STARTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', PAUSED: 'PAUSED' }

// 八阶段定义（新文档三章 3.x 节）
const STAGES_DEF = [
  { no: 1, key: 'BRIEFING', name: '集中宣讲', desc: '学院组织统一宣讲，学生了解实训室方向、名额与培养方案' },
  { no: 2, key: 'OPEN_DAY', name: '实训室开放日', desc: '开放日展示，支持 720° 全景云游' },
  { no: 3, key: 'PREFERENCE', name: '学生意向填报', desc: '最多 3 个平行志愿，两项调剂意愿独立选择' },
  { no: 4, key: 'INTERVIEW', name: '导师初选与面试考核', desc: '实训室统一面试，5 维度评分' },
  { no: 5, key: 'ADMISSION_CONFIRM', name: '拟录取与学生确认', desc: '单意向自动确认，多意向自主选择' },
  { no: 6, key: 'INTERNAL_SUPPLEMENT', name: '实训室内部调剂', desc: '组长主导，优先解决本室空缺' },
  { no: 7, key: 'COLLEGE_ADJUSTMENT', name: '学院统筹调剂', desc: '跨实训室调剂 + 沟通安置' },
  { no: 8, key: 'FINAL_PUBLICITY', name: '结果公示与正式入组', desc: '公示 + 异议 + 正式入组' }
]

// 调剂类型（新文档 5.8 节）
const ADJUSTMENT_TYPE = { INTERNAL: 'INTERNAL', CROSS_LAB: 'CROSS_LAB', MANUAL_PLACEMENT: 'MANUAL_PLACEMENT' }

// 拟录取类型（新文档 5.7 节）
const ADMISSION_TYPE = { INTENDED: 'INTENDED', ALTERNATE: 'ALTERNATE' }

// 生成相对时间（以现在为锚，阶段自动处于某个 IN_PROGRESS）
function now() {
  return new Date().toISOString()
}
function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// 生成一套默认 Store（首次启动或需要重置时）
function buildDefaultStore() {
  const store = {
    users: [],
    laboratories: [],
    recruitmentBatches: [],
    recruitmentStages: [],
    studentPreferences: [],
    interviews: [],
    admissionIntentions: [],
    adjustments: [],
    finalAdmissions: [],
    operationLogs: [],
    announcements: [],
    mediaVideos: [],
    mediaPanoramas: [],
    notices: []
  }

  // ---- users（新文档 5.1） ----
  // 密码: 123456（bcrypt 实时生成）
  const demoUsers = [
    { id: 1, username: 'admin',     passwordHash: DEMO_PASSWORD_HASH, realName: '张老师',  studentNumber: null, role: 'COLLEGE_ADMIN', phone: '13800000000', status: 'ACTIVE', createdAt: now() },
    { id: 2, username: 'L001',      passwordHash: DEMO_PASSWORD_HASH, realName: '李敏',    studentNumber: 'L001', role: 'LAB_LEADER',    phone: '13800000001', status: 'ACTIVE', createdAt: now() },
    { id: 3, username: 'T1001',      passwordHash: DEMO_PASSWORD_HASH, realName: '王强',    studentNumber: 'T1001', role: 'LAB_TEACHER',  phone: '13800000002', status: 'ACTIVE', createdAt: now() },
    { id: 4, username: 'T1002',      passwordHash: DEMO_PASSWORD_HASH, realName: '赵雪',    studentNumber: 'T1002', role: 'LAB_TEACHER',  phone: '13800000003', status: 'ACTIVE', createdAt: now() },
    { id: 5, username: '2022001',    passwordHash: DEMO_PASSWORD_HASH, realName: '陈晨',    studentNumber: '2022001', role: 'STUDENT',       phone: '13900000001', status: 'ACTIVE', createdAt: now() },
    { id: 6, username: '2022002',    passwordHash: DEMO_PASSWORD_HASH, realName: '林小雨',  studentNumber: '2022002', role: 'STUDENT',       phone: '13900000002', status: 'ACTIVE', createdAt: now() },
    { id: 7, username: '2022003',    passwordHash: DEMO_PASSWORD_HASH, realName: '周航',    studentNumber: '2022003', role: 'STUDENT',       phone: '13900000003', status: 'ACTIVE', createdAt: now() }
  ]
  store.users = demoUsers

  // ---- laboratories（新文档 5.2） ----
  store.laboratories = [
    { id: 1, name: '智能软件工程实训室',  description: '聚焦软件架构、微服务与智能代码生成', projectDirection: '软件工程 / AI 工程化', technologyStack: 'Java / Spring Boot / Vue3 / Kubernetes', recruitmentQuota: 6, leaderId: 2, introductionVideo: '/media/demo/lab-1-briefing.mp4', panoramicResource: 'https://www.720yun.com/demo-lab-1', status: 'ACTIVE', createdAt: now() },
    { id: 2, name: '计算机视觉与机器学习实训室', description: 'CV、NLP、大模型微调', projectDirection: 'AI / 计算机视觉', technologyStack: 'Python / PyTorch / OpenCV', recruitmentQuota: 5, leaderId: null, introductionVideo: '/media/demo/lab-2-briefing.mp4', panoramicResource: 'https://www.720yun.com/demo-lab-2', status: 'ACTIVE', createdAt: now() },
    { id: 3, name: '大数据与分布式系统实训室', description: '数据工程、分布式计算与数据湖', projectDirection: '大数据 / 分布式', technologyStack: 'Scala / Spark / Flink / ClickHouse', recruitmentQuota: 4, leaderId: null, introductionVideo: null, panoramicResource: null, status: 'ACTIVE', createdAt: now() }
  ]

  // ---- recruitmentBatches + recruitmentStages（新文档 5.3 / 5.4） ----
  const batchId = 1
  store.recruitmentBatches = [{
    id: batchId, batchName: '2026 届实训室选拔', academicYear: '2025-2026',
    description: '软件学院 2026 届实训室进组选拔活动', status: 'IN_PROGRESS', createdAt: now()
  }]
  // 模拟：当前处于「意向填报」阶段（便于联调）
  store.recruitmentStages = STAGES_DEF.map((s, idx) => {
    const offset = idx - 2 // 让第 3 个（意向填报）处于进行中
    let status = STAGE_STATUS.NOT_STARTED
    let startTime = daysFromNow(offset - 0.5)
    let endTime = daysFromNow(offset + 0.5)
    if (idx < 2) { status = STAGE_STATUS.COMPLETED; startTime = daysFromNow(offset - 1); endTime = daysFromNow(offset) }
    if (idx === 2) { status = STAGE_STATUS.IN_PROGRESS; startTime = daysFromNow(-0.5); endTime = daysFromNow(0.5) }
    return {
      id: idx + 1, batchId, stageNumber: s.no, stageName: s.name, stageKey: s.key,
      startTime, endTime, stageStatus: status, description: s.desc
    }
  })

  // ---- studentPreferences（新文档 5.5） ----
  store.studentPreferences = [
    { id: 1, batchId, studentId: 5, laboratoryId: 1, obeyInternalAdjustment: true,  obeyCollegeAdjustment: true,  submittedAt: now(), status: 'SUBMITTED' },
    { id: 2, batchId, studentId: 5, laboratoryId: 2, obeyInternalAdjustment: true,  obeyCollegeAdjustment: true,  submittedAt: now(), status: 'SUBMITTED' },
    { id: 3, batchId, studentId: 6, laboratoryId: 1, obeyInternalAdjustment: false, obeyCollegeAdjustment: false, submittedAt: now(), status: 'SUBMITTED' },
    { id: 4, batchId, studentId: 6, laboratoryId: 3, obeyInternalAdjustment: true,  obeyCollegeAdjustment: true,  submittedAt: now(), status: 'SUBMITTED' },
    { id: 5, batchId, studentId: 7, laboratoryId: 2, obeyInternalAdjustment: true,  obeyCollegeAdjustment: false, submittedAt: now(), status: 'DRAFT' }
  ]

  // ---- interviews（新文档 5.6） ----
  store.interviews = [
    { id: 1, batchId, studentId: 5, laboratoryId: 1, interviewerId: 3, interviewTime: daysFromNow(1), interviewStatus: 'SCHEDULED', attitudeScore: null, logicScore: null, programmingScore: null, timeCommitmentScore: null, comprehensiveScore: null, evaluation: '', recommendation: 'PENDING', createdAt: now() },
    { id: 2, batchId, studentId: 5, laboratoryId: 2, interviewerId: 4, interviewTime: daysFromNow(1.5), interviewStatus: 'SCHEDULED', attitudeScore: null, logicScore: null, programmingScore: null, timeCommitmentScore: null, comprehensiveScore: null, evaluation: '', recommendation: 'PENDING', createdAt: now() },
    { id: 3, batchId, studentId: 6, laboratoryId: 1, interviewerId: 3, interviewTime: daysFromNow(2), interviewStatus: 'SCHEDULED', attitudeScore: null, logicScore: null, programmingScore: null, timeCommitmentScore: null, comprehensiveScore: null, evaluation: '', recommendation: 'PENDING', createdAt: now() }
  ]

  // ---- admissionIntentions（新文档 5.7） ----
  store.admissionIntentions = []

  // ---- adjustments（新文档 5.8） ----
  store.adjustments = []

  // ---- finalAdmissions（新文档 5.9） ----
  store.finalAdmissions = []

  // ---- operationLogs（新文档 5.10） ----
  store.operationLogs = []

  // ---- 辅助表：宣讲视频 / 全景 / 公告 / 通知 ----
  store.announcements = [
    { id: 1, title: '2026 届实训室选拔启动', content: '学院发布本次选拔活动说明与时间安排', batchId, createdAt: now(), createdBy: 1, status: 'PUBLISHED' },
    { id: 2, title: '集中宣讲安排通知', content: '宣讲将于 X 月 X 日晚 19:00 在学院报告厅举行，线上同步直播', batchId, createdAt: now(), createdBy: 1, status: 'PUBLISHED' }
  ]
  store.mediaVideos = [
    { id: 1, laboratoryId: 1, title: '智能软件工程实训室宣讲视频', description: '实训室李敏老师宣讲', videoType: 'MP4', videoUrl: '/media/demo/lab-1-briefing-1.mp4', coverUrl: null, durationSeconds: 300, sortNo: 1, status: 'PUBLISHED', createdAt: now() },
    { id: 2, laboratoryId: 2, title: '计算机视觉实训室宣讲视频', description: '实训室负责人宣讲', videoType: 'LINK', videoUrl: 'https://www.bilibili.com/video/demo-cv', coverUrl: null, durationSeconds: 420, sortNo: 1, status: 'PUBLISHED', createdAt: now() }
  ]
  store.mediaPanoramas = [
    { id: 1, laboratoryId: 1, name: '智能软件工程实训室全景', description: '720° 全景展示实训室环境与设备', panoramaType: 'LINK', panoramaUrl: 'https://www.720yun.com/demo-lab-1', coverUrl: null, sortNo: 1, status: 'PUBLISHED', createdAt: now() },
    { id: 2, laboratoryId: 2, name: '计算机视觉实训室全景', description: '实训室开放日云游入口', panoramaType: 'LINK', panoramaUrl: 'https://www.720yun.com/demo-lab-2', coverUrl: null, sortNo: 1, status: 'PUBLISHED', createdAt: now() }
  ]
  store.notices = []

  return store
}

// 启动时保证有种子
async function seedMockData() {
  let store = loadStore()
  if (!store) {
    store = buildDefaultStore()
    saveStore(store)
    console.log('[seed] Mock 数据已生成（首次启动）')
  } else {
    console.log('[seed] 使用已有 Mock 数据')
  }
}

function getStore() {
  let store = loadStore()
  if (!store) {
    store = buildDefaultStore()
    saveStore(store)
  }
  return store
}

function persistStore(store) {
  saveStore(store)
}

// 简单自增 ID
function nextId(list) {
  if (!list || list.length === 0) return 1
  return Math.max(...list.map((i) => i.id || 0)) + 1
}

module.exports = {
  seedMockData, getStore, persistStore, nextId,
  STAGES_DEF, STAGE_STATUS, ROLES, ADJUSTMENT_TYPE, ADMISSION_TYPE
}
