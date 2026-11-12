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
    notices: [],
    publication: null,
    finalReview: null,
    publicationObjections: [],
    openDaySchedules: []
  }

  // ---- users（新文档 5.1） ----
  // 密码: 123456（bcrypt 实时生成）
  const demoUsers = [
    { id: 1,  username: 'admin',   realName: '张老师', studentNumber: null,      role: 'COLLEGE_ADMIN', phone: '13800000000' },
    { id: 2,  username: 'L001',    realName: '李敏',   studentNumber: 'L001',    role: 'LAB_LEADER',    phone: '13800000001', laboratoryId: 1 },
    { id: 3,  username: 'T1001',   realName: '王强',   studentNumber: 'T1001',   role: 'LAB_TEACHER',   phone: '13800000002', laboratoryId: 1 },
    { id: 4,  username: 'T1002',   realName: '赵雪',   studentNumber: 'T1002',   role: 'LAB_TEACHER',   phone: '13800000003', laboratoryId: 2 },
    { id: 5,  username: 'T1003',   realName: '陈国栋', studentNumber: 'T1003',   role: 'LAB_TEACHER',   phone: '13800000004', laboratoryId: 3 },
    { id: 6,  username: '2022001', realName: '陈晨',   studentNumber: '2022001', role: 'STUDENT',        phone: '13900000001' },
    { id: 7,  username: '2022002', realName: '林小雨', studentNumber: '2022002', role: 'STUDENT',        phone: '13900000002' },
    { id: 8,  username: '2022003', realName: '周航',   studentNumber: '2022003', role: 'STUDENT',        phone: '13900000003' },
    { id: 9,  username: '2022004', realName: '吴桐',   studentNumber: '2022004', role: 'STUDENT',        phone: '13900000004' },
    { id: 10, username: '2022005', realName: '郑一鸣', studentNumber: '2022005', role: 'STUDENT',        phone: '13900000005' },
    { id: 11, username: '2022006', realName: '孙悦',   studentNumber: '2022006', role: 'STUDENT',        phone: '13900000006' },
    { id: 12, username: '2022007', realName: '何嘉',   studentNumber: '2022007', role: 'STUDENT',        phone: '13900000007' },
    { id: 13, username: '2022008', realName: '杨帆',   studentNumber: '2022008', role: 'STUDENT',        phone: '13900000008' },
    { id: 14, username: '2022009', realName: '黄子涵', studentNumber: '2022009', role: 'STUDENT',        phone: '13900000009' },
    { id: 15, username: '2022010', realName: '刘星辰', studentNumber: '2022010', role: 'STUDENT',        phone: '13900000010' },
    { id: 16, username: '2022011', realName: '徐若彤', studentNumber: '2022011', role: 'STUDENT',        phone: '13900000011' },
    { id: 17, username: '2022012', realName: '马骁',   studentNumber: '2022012', role: 'STUDENT',        phone: '13900000012' }
  ]
  store.users = demoUsers.map((u) => ({
    ...u,
    passwordHash: DEMO_PASSWORD_HASH,
    status: 'ACTIVE',
    createdAt: now()
  }))

  // ---- laboratories（新文档 5.2） ----
  store.laboratories = [
    { id: 1, name: '智能软件工程实训室', description: '聚焦软件架构、微服务与智能代码生成', projectDirection: '软件工程 / AI 工程化', technologyStack: 'Java / Spring Boot / Vue3 / Kubernetes', recruitmentQuota: 6, leaderId: 2, briefingText: '智能软件工程实训室面向企业级软件研发与 AI 工程化方向，重点培养微服务架构设计、云原生部署与智能代码生成能力。实训室配备企业级项目案例与 CI/CD 流水线，学生入组后将参与真实横向课题，由组长与导师共同指导，完成从需求分析到上线运维的完整工程实践。', briefingVideoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4', briefingVideoType: 'MP4', introductionVideo: '/media/demo/lab-1-briefing.mp4', panoramicResource: 'https://www.720yun.com/demo-lab-1', status: 'ACTIVE', createdAt: now() },
    { id: 2, name: '计算机视觉与机器学习实训室', description: 'CV、NLP、大模型微调', projectDirection: 'AI / 计算机视觉', technologyStack: 'Python / PyTorch / OpenCV', recruitmentQuota: 5, leaderId: null, briefingText: '计算机视觉与机器学习实训室聚焦计算机视觉、自然语言处理与大模型微调，拥有 GPU 计算集群与公开数据集资源。培养目标为掌握主流深度学习框架、能够独立完成模型训练与部署，鼓励学生参加学科竞赛与科研项目。', briefingVideoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4', briefingVideoType: 'MP4', introductionVideo: '/media/demo/lab-2-briefing.mp4', panoramicResource: 'https://www.720yun.com/demo-lab-2', status: 'ACTIVE', createdAt: now() },
    { id: 3, name: '大数据与分布式系统实训室', description: '数据工程、分布式计算与数据湖', projectDirection: '大数据 / 分布式', technologyStack: 'Scala / Spark / Flink / ClickHouse', recruitmentQuota: 4, leaderId: null, briefingText: '大数据与分布式系统实训室围绕数据采集、数据治理、实时计算与数据湖建设，提供 Spark、Flink、ClickHouse 等企业级组件实训环境。学生将参与真实数据管道搭建与性能调优，具备数据工程岗位的核心能力。', briefingVideoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4', briefingVideoType: 'MP4', introductionVideo: null, panoramicResource: null, status: 'ACTIVE', createdAt: now() },
    { id: 4, name: '智能硬件与嵌入式实训室', description: '边缘计算、嵌入式系统与物联网', projectDirection: '嵌入式 / IoT', technologyStack: 'C / STM32 / RTOS / MQTT', recruitmentQuota: 4, leaderId: null, briefingText: '智能硬件与嵌入式实训室面向嵌入式系统、边缘计算与物联网方向，配备 STM32、传感器套件与边缘计算网关。培养目标是完成从硬件选型、固件开发到云端联调的完整链路实践，适合动手能力强的同学。', briefingVideoUrl: null, briefingVideoType: 'LINK', introductionVideo: null, panoramicResource: 'https://www.720yun.com/demo-lab-4', status: 'ACTIVE', createdAt: now() },
    { id: 5, name: '网络空间安全实训室', description: '渗透测试、安全运维与密码学应用', projectDirection: '网络安全', technologyStack: 'Linux / Python / BurpSuite / CTF', recruitmentQuota: 3, leaderId: null, briefingText: '网络空间安全实训室以攻防对抗为核心，涵盖渗透测试、安全运维、密码学应用与 CTF 竞赛训练。实训室提供靶场环境与安全工具链，学生可参与真实安全评估项目与各级 CTF 赛事。', briefingVideoUrl: null, briefingVideoType: 'LINK', introductionVideo: null, panoramicResource: null, status: 'ACTIVE', createdAt: now() }
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

  // ---- openDaySchedules（第二阶段开放日场次安排）----
  const openDayDate = daysFromNow(-0.6).slice(0, 10)
  const openDayDate2 = daysFromNow(-0.4).slice(0, 10)
  store.openDaySchedules = [
    { id: 1, laboratoryId: 1, title: '智能软件工程实验室开放日', date: openDayDate, startTime: '09:00', endTime: '11:30', location: '实验楼 A301', note: '含 720° 全景云游' },
    { id: 2, laboratoryId: 2, title: '计算机视觉与机器学习实验室开放日', date: openDayDate, startTime: '14:00', endTime: '16:30', location: '实验楼 A405', note: '' },
    { id: 3, laboratoryId: 3, title: '大数据与分布式系统实验室开放日', date: openDayDate2, startTime: '09:00', endTime: '11:00', location: '实验楼 B201', note: '' },
    { id: 4, laboratoryId: 4, title: '智能硬件与嵌入式实验室开放日', date: openDayDate2, startTime: '14:00', endTime: '16:00', location: '实验楼 B105', note: '需提前预约' },
    { id: 5, laboratoryId: 5, title: '网络空间安全实验室开放日', date: openDayDate2, startTime: '16:30', endTime: '18:00', location: '实验楼 C402', note: '' }
  ]

  // ---- studentPreferences（新文档 5.5） ----
  // 同一学生最多 3 个平行志愿，无优先级
  const prefs = [
    { studentId: 6,  labs: [1, 2],    internal: true,  college: true },
    { studentId: 7,  labs: [1, 3],    internal: false, college: true },
    { studentId: 8,  labs: [2],       internal: true,  college: true },
    { studentId: 9,  labs: [1, 2, 3], internal: true,  college: true },
    { studentId: 10, labs: [3],       internal: false, college: false },
    { studentId: 11, labs: [2, 4],    internal: true,  college: true },
    { studentId: 12, labs: [1, 4],    internal: true,  college: false },
    { studentId: 13, labs: [5],       internal: true,  college: true },
    { studentId: 14, labs: [2, 5],    internal: true,  college: true },
    { studentId: 15, labs: [1, 3, 4], internal: true,  college: true }
  ]
  let prefId = 1
  prefs.forEach((p) => {
    p.labs.forEach((labId) => {
      store.studentPreferences.push({
        id: prefId++, batchId, studentId: p.studentId, laboratoryId: labId,
        obeyInternalAdjustment: p.internal, obeyCollegeAdjustment: p.college,
        submittedAt: now(), status: 'SUBMITTED'
      })
    })
  })
  // 草稿志愿（尚未提交）
  store.studentPreferences.push({
    id: prefId++, batchId, studentId: 16, laboratoryId: 4,
    obeyInternalAdjustment: true, obeyCollegeAdjustment: true, submittedAt: now(), status: 'DRAFT'
  })

  // ---- interviews（新文档 5.6） ----
  // 已报名学生均有面试资格；部分已完成评分，部分待面试
  const interviewSeed = [
    { studentId: 6,  labId: 1, interviewerId: 3, status: 'COMPLETED', scores: [90, 88, 92, 85, 89], rec: 'INTENDED' },
    { studentId: 7,  labId: 1, interviewerId: 3, status: 'COMPLETED', scores: [82, 80, 78, 85, 81], rec: 'INTENDED' },
    { studentId: 9,  labId: 1, interviewerId: 3, status: 'COMPLETED', scores: [85, 86, 84, 80, 84], rec: 'INTENDED' },
    { studentId: 12, labId: 1, interviewerId: 3, status: 'COMPLETED', scores: [70, 68, 72, 75, 71], rec: 'REJECTED' },
    { studentId: 15, labId: 1, interviewerId: 3, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 6,  labId: 2, interviewerId: 4, status: 'COMPLETED', scores: [88, 90, 86, 84, 87], rec: 'INTENDED' },
    { studentId: 8,  labId: 2, interviewerId: 4, status: 'COMPLETED', scores: [92, 94, 90, 88, 91], rec: 'INTENDED' },
    { studentId: 9,  labId: 2, interviewerId: 4, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 11, labId: 2, interviewerId: 4, status: 'COMPLETED', scores: [80, 82, 79, 83, 81], rec: 'ALTERNATE' },
    { studentId: 14, labId: 2, interviewerId: 4, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 7,  labId: 3, interviewerId: 5, status: 'COMPLETED', scores: [78, 76, 80, 82, 79], rec: 'ALTERNATE' },
    { studentId: 9,  labId: 3, interviewerId: 5, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 10, labId: 3, interviewerId: 5, status: 'COMPLETED', scores: [86, 88, 90, 84, 87], rec: 'INTENDED' },
    { studentId: 15, labId: 3, interviewerId: 5, status: 'COMPLETED', scores: [81, 83, 80, 79, 81], rec: 'INTENDED' },
    { studentId: 11, labId: 4, interviewerId: 3, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 12, labId: 4, interviewerId: 3, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 15, labId: 4, interviewerId: 3, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 13, labId: 5, interviewerId: 5, status: 'SCHEDULED', scores: null, rec: 'PENDING' },
    { studentId: 14, labId: 5, interviewerId: 5, status: 'SCHEDULED', scores: null, rec: 'PENDING' }
  ]
  store.interviews = interviewSeed.map((it, idx) => ({
    id: idx + 1, batchId, studentId: it.studentId, laboratoryId: it.labId, interviewerId: it.interviewerId,
    interviewTime: daysFromNow(1 + (idx % 3) * 0.5),
    interviewStatus: it.status,
    attitudeScore: it.scores ? it.scores[0] : null,
    logicScore: it.scores ? it.scores[1] : null,
    programmingScore: it.scores ? it.scores[2] : null,
    timeCommitmentScore: it.scores ? it.scores[3] : null,
    comprehensiveScore: it.scores ? it.scores[4] : null,
    evaluation: it.scores ? '面试表现稳定，专业基础与项目意愿匹配。' : '',
    recommendation: it.rec,
    createdAt: now()
  }))

  // ---- admissionIntentions（新文档 5.7） ----
  const intentionSeed = [
    { studentId: 6,  labId: 1, type: 'INTENDED',  status: 'CONFIRMED' },
    { studentId: 7,  labId: 1, type: 'INTENDED',  status: 'PENDING' },
    { studentId: 9,  labId: 1, type: 'INTENDED',  status: 'PENDING' },
    { studentId: 12, labId: 1, type: 'INTENDED',  status: 'REJECTED' },
    { studentId: 6,  labId: 2, type: 'INTENDED',  status: 'REJECTED' },
    { studentId: 8,  labId: 2, type: 'INTENDED',  status: 'CONFIRMED' },
    { studentId: 11, labId: 2, type: 'INTENDED',  status: 'PENDING' },
    { studentId: 7,  labId: 2, type: 'ALTERNATE', status: 'PENDING' },
    { studentId: 7,  labId: 3, type: 'ALTERNATE', status: 'PENDING' },
    { studentId: 10, labId: 3, type: 'INTENDED',  status: 'CONFIRMED' },
    { studentId: 15, labId: 3, type: 'INTENDED',  status: 'PENDING' }
  ]
  store.admissionIntentions = intentionSeed.map((a, idx) => ({
    id: idx + 1, batchId, studentId: a.studentId, laboratoryId: a.labId,
    admissionType: a.type, status: a.status,
    confirmationDeadline: daysFromNow(2), confirmedAt: a.status === 'CONFIRMED' ? now() : null,
    createdAt: now()
  }))

  // ---- adjustments（新文档 5.8） ----
  store.adjustments = [
    { id: 1, batchId, studentId: 7,  sourceLaboratoryId: 1, targetLaboratoryId: 1, adjustmentType: 'INTERNAL', priorityLevel: 1, reason: '本室面试合格，服从内部调剂', operatorId: 2, status: 'CONFIRMED', createdAt: now() },
    { id: 2, batchId, studentId: 9,  sourceLaboratoryId: 3, targetLaboratoryId: 3, adjustmentType: 'INTERNAL', priorityLevel: 1, reason: '本室递补候选', operatorId: 2, status: 'PENDING', createdAt: now() },
    { id: 3, batchId, studentId: 11, sourceLaboratoryId: 2, targetLaboratoryId: 1, adjustmentType: 'CROSS_LAB', priorityLevel: 2, reason: '学生服从全院调剂，专业方向匹配', operatorId: 1, status: 'PENDING', createdAt: now() },
    { id: 4, batchId, studentId: 13, sourceLaboratoryId: 5, targetLaboratoryId: 4, adjustmentType: 'MANUAL_PLACEMENT', priorityLevel: 3, reason: '沟通后同意调整方向', operatorId: 1, status: 'PENDING', createdAt: now() }
  ]

  // ---- finalAdmissions（新文档 5.9） ----
  // 演示：已生成一次名单，供最终名单与公示页面展示
  store.finalAdmissions = [
    { id: 1, batchId, studentId: 6,  laboratoryId: 1, admissionSource: 'INTENDED_CONFIRMED', finalStatus: 'ENROLLED', confirmedAt: now() },
    { id: 2, batchId, studentId: 8,  laboratoryId: 2, admissionSource: 'INTENDED_CONFIRMED', finalStatus: 'ADMITTED', confirmedAt: now() },
    { id: 3, batchId, studentId: 10, laboratoryId: 3, admissionSource: 'INTENDED_CONFIRMED', finalStatus: 'ADMITTED', confirmedAt: now() },
    { id: 4, batchId, studentId: 7,  laboratoryId: 1, admissionSource: 'INTERNAL', finalStatus: 'ADMITTED', confirmedAt: now() }
  ]

  // ---- operationLogs（新文档 5.10） ----
  store.operationLogs = [
    { id: 1, operatorId: 1, operationType: 'CREATE_BATCH', targetType: 'BATCH', targetId: batchId, operationDescription: '创建选拔批次「2026 届实训室选拔」', createdAt: daysFromNow(-20) },
    { id: 2, operatorId: 1, operationType: 'CREATE_LAB', targetType: 'LABORATORY', targetId: 1, operationDescription: '新增实训室「智能软件工程实训室」，招生名额 6', createdAt: daysFromNow(-18) },
    { id: 3, operatorId: 1, operationType: 'UPDATE_STAGE', targetType: 'STAGE', targetId: 3, operationDescription: '调整阶段「第3阶段 学生意向填报」时间窗', createdAt: daysFromNow(-3) },
    { id: 4, operatorId: 2, operationType: 'CREATE_INTERNAL_ADJUSTMENT', targetType: 'ADJUSTMENT', targetId: 1, operationDescription: '提交本室内部调剂名单', createdAt: daysFromNow(-1) }
  ]

  // ---- 辅助表：宣讲视频 / 全景 / 公告 / 通知 ----
  store.announcements = [
    { id: 1, title: '2026 届实训室选拔启动', content: '学院发布本次选拔活动说明与时间安排', batchId, createdAt: daysFromNow(-20), createdBy: 1, status: 'PUBLISHED' },
    { id: 2, title: '集中宣讲安排通知', content: '宣讲将于 X 月 X 日晚 19:00 在学院报告厅举行，线上同步直播', batchId, createdAt: daysFromNow(-15), createdBy: 1, status: 'PUBLISHED' },
    { id: 3, title: '意向填报截止提醒', content: '请同学们在截止时间前完成最多三个平行志愿的填报', batchId, createdAt: daysFromNow(-1), createdBy: 1, status: 'PUBLISHED' }
  ]
  store.mediaVideos = [
    { id: 1, laboratoryId: 1, title: '智能软件工程实训室宣讲视频', description: '实训室李敏老师宣讲', videoType: 'MP4', videoUrl: '/media/demo/lab-1-briefing-1.mp4', coverUrl: null, durationSeconds: 300, sortNo: 1, status: 'PUBLISHED', createdAt: now() },
    { id: 2, laboratoryId: 2, title: '计算机视觉实训室宣讲视频', description: '实训室负责人宣讲', videoType: 'LINK', videoUrl: 'https://www.bilibili.com/video/demo-cv', coverUrl: null, durationSeconds: 420, sortNo: 1, status: 'PUBLISHED', createdAt: now() },
    { id: 3, laboratoryId: 3, title: '大数据实训室宣讲视频', description: '数据工程与分布式方向介绍', videoType: 'MP4', videoUrl: '/media/demo/lab-3-briefing.mp4', coverUrl: null, durationSeconds: 360, sortNo: 1, status: 'DRAFT', createdAt: now() }
  ]
  store.mediaPanoramas = [
    { id: 1, laboratoryId: 1, name: '智能软件工程实训室全景', description: '720° 全景展示实训室环境与设备', panoramaType: 'LINK', panoramaUrl: 'https://www.720yun.com/demo-lab-1', coverUrl: null, sortNo: 1, status: 'PUBLISHED', createdAt: now() },
    { id: 2, laboratoryId: 2, name: '计算机视觉实训室全景', description: '实训室开放日云游入口', panoramaType: 'LINK', panoramaUrl: 'https://www.720yun.com/demo-lab-2', coverUrl: null, sortNo: 1, status: 'PUBLISHED', createdAt: now() },
    { id: 3, laboratoryId: 4, name: '智能硬件实训室全景', description: '设备区与工位区全景', panoramaType: 'LINK', panoramaUrl: 'https://www.720yun.com/demo-lab-4', coverUrl: null, sortNo: 1, status: 'DRAFT', createdAt: now() }
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

// 旧数据迁移：为缺少新字段的记录补默认值
function migrateStore(store) {
  let changed = false
  if (!store.openDaySchedules) { store.openDaySchedules = []; changed = true }
  if (!store.publicationObjections) { store.publicationObjections = []; changed = true }
  // 实训室宣讲内容：旧数据用简介兜底
  ;(store.laboratories || []).forEach((l) => {
    if (l.briefingText === undefined) {
      l.briefingText = l.description || ''
      changed = true
    }
    if (l.briefingVideoUrl === undefined) {
      l.briefingVideoUrl = l.introductionVideo || null
      changed = true
    }
    if (l.briefingVideoType === undefined) {
      l.briefingVideoType = l.briefingVideoUrl ? 'MP4' : 'LINK'
      changed = true
    }
  })
  // 教师/组长实训室归属：旧种子账号按默认映射补齐
  const staffLabDefaults = { L001: 1, T1001: 1, T1002: 2, T1003: 3 }
  ;(store.users || []).forEach((u) => {
    if ((u.role === 'LAB_TEACHER' || u.role === 'LAB_LEADER') && u.laboratoryId === undefined) {
      u.laboratoryId = staffLabDefaults[u.username] ?? null
      changed = true
    }
  })
  if (changed) saveStore(store)
}

function getStore() {
  let store = loadStore()
  if (!store) {
    store = buildDefaultStore()
    saveStore(store)
  }
  migrateStore(store)
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
