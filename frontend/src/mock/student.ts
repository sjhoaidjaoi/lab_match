import { MockError } from './auth'
import { mockMentorList } from './basic'
import type {
  AvailableMentor,
  CurrentRound,
  IntentionDetail,
  IntentionItem,
  IntentionSaveReq,
  StudentArchive,
  StudentArchiveSaveReq
} from '@/types/student'

const MOCK_DELAY_MS = 250

const STATEMENT = '我希望加入实训室，在真实项目中完成从需求分析、方案设计到开发上线的完整实践，并持续提升工程能力与团队协作能力。'.repeat(6)

export const missingFieldLabels: Record<string, string> = {
  programmingLanguages: '编程语言',
  projectExperience: '项目经历',
  weeklyHours: '每周可投入小时',
  availableSlots: '可投入时段',
  statement: '个人陈述'
}

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function computeMissingFields(archive: StudentArchiveSaveReq): string[] {
  const missing: string[] = []
  if (!archive.programmingLanguages || archive.programmingLanguages.length === 0) {
    missing.push('programmingLanguages')
  }
  if (!archive.projectExperience.trim()) {
    missing.push('projectExperience')
  }
  if (archive.weeklyHours === null || archive.weeklyHours === undefined) {
    missing.push('weeklyHours')
  }
  if (!archive.availableSlots.trim()) {
    missing.push('availableSlots')
  }
  const statementLength = archive.statement.trim().length
  if (statementLength < 300 || statementLength > 800) {
    missing.push('statement')
  }
  return missing
}

let archive: StudentArchiveSaveReq = {
  className: '软工2201',
  gpa: 3.72,
  ranking: 12,
  englishLevel: 'CET-6',
  programmingLanguages: ['Java', 'Python'],
  techStack: ['Spring Boot', 'Vue 3'],
  projectExperience: '主导过校园二手交易平台后端开发，负责订单与支付模块。',
  competitionExperience: '蓝桥杯省二',
  researchExperience: '',
  internshipExperience: '',
  weeklyHours: 12,
  availableSlots: '工作日 19:00-22:00，周末全天',
  otherDuties: '学生会技术部',
  expectedDirection: '后端开发',
  statement: STATEMENT
}

const round: CurrentRound = {
  id: 1,
  roundNo: 1,
  roundName: '第一轮双选',
  status: 2,
  statusText: '填报中',
  applyStart: '2026-11-01 08:00:00',
  applyEnd: '2026-11-30 23:59:59',
  countdownSeconds: 9900
}

let intention: IntentionDetail | null = {
  id: 501,
  roundId: 1,
  roundNo: 1,
  status: 1,
  statusText: '草稿',
  acceptInnerAdjust: 1,
  acceptCrossAdjust: 0,
  poolConsent: 0,
  submitTime: null,
  editable: 1,
  items: [
    {
      mentorId: 11,
      mentorName: '李海峰',
      labId: 1,
      labName: '人工智能实训室',
      researchDirection: '多模态大模型',
      remainQuota: 2
    }
  ]
}

export async function mockStudentArchive(): Promise<StudentArchive> {
  await delay()
  return {
    userNo: '20220001',
    realName: '陈爱丽',
    college: '计算机学院',
    major: '软件工程',
    grade: '2022',
    ...deepCopy(archive),
    missingFields: computeMissingFields(archive)
  }
}

export async function mockSaveStudentArchive(req: StudentArchiveSaveReq): Promise<string[]> {
  await delay()
  const statementLength = req.statement.trim().length
  if (statementLength > 0 && (statementLength < 300 || statementLength > 800)) {
    throw new MockError(400001, '个人陈述需为 300-800 字')
  }
  archive = deepCopy(req)
  return computeMissingFields(archive)
}

export async function mockCurrentRound(): Promise<CurrentRound> {
  await delay()
  return deepCopy(round)
}

export async function mockIntention(): Promise<IntentionDetail | null> {
  await delay()
  return intention ? deepCopy(intention) : null
}

export async function mockAvailableMentors(
  keyword = '',
  labId?: number,
  onlyAvailable = 1
): Promise<AvailableMentor[]> {
  await delay()
  const mentors = await mockMentorList(labId)
  const text = keyword.trim()
  return mentors
    .filter((mentor) => {
      const matchKeyword =
        !text ||
        mentor.realName.includes(text) ||
        (mentor.researchDirection ?? '').includes(text)
      const matchAvailable = onlyAvailable === 0 || mentor.remainQuota > 0
      return matchKeyword && matchAvailable
    })
    .map((mentor) => ({
      mentorId: mentor.id,
      mentorName: mentor.realName,
      title: mentor.title,
      labId: mentor.labId,
      labName: mentor.labName,
      researchDirection: mentor.researchDirection,
      quota: mentor.quota,
      quotaUsed: mentor.quotaUsed,
      remainQuota: mentor.remainQuota,
      selectable: mentor.remainQuota > 0 ? 1 : 0
    }))
}

export async function mockSaveIntention(
  req: IntentionSaveReq,
  items: IntentionItem[]
): Promise<{ id: number; status: number }> {
  await delay()
  if (req.submit === 1 && items.length === 0) {
    throw new MockError(400001, '至少选择 1 个意向')
  }
  if (items.length > 3) {
    throw new MockError(400002, '首轮最多选择 3 个意向')
  }
  if (new Set(items.map((item) => item.mentorId)).size !== items.length) {
    throw new MockError(400002, '存在重复的导师意向')
  }
  if (req.submit === 1) {
    const missing = computeMissingFields(archive)
    if (missing.length > 0) {
      throw new MockError(
        400002,
        `档案必填项未完成：${missing.map((key) => missingFieldLabels[key]).join('、')}`
      )
    }
  }
  const status = req.submit === 1 ? 2 : 1
  intention = {
    id: intention?.id ?? 501,
    roundId: req.roundId,
    roundNo: round.roundNo,
    status,
    statusText: status === 2 ? '已提交' : '草稿',
    acceptInnerAdjust: req.acceptInnerAdjust,
    acceptCrossAdjust: req.acceptCrossAdjust,
    poolConsent: req.poolConsent,
    submitTime: status === 2 ? formatLocalDateTime(new Date()) : null,
    editable: 1,
    items: deepCopy(items)
  }
  return { id: intention.id, status }
}
