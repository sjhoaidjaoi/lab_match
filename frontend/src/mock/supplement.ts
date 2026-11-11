import { MockError } from './auth'
import type {
  SupplementApplicant,
  SupplementDirectAdmitResp,
  SupplementMentor
} from '@/types/reallocation'

const MOCK_DELAY_MS = 250

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let supplementMentors: SupplementMentor[] = [
  {
    mentorId: 11,
    mentorName: '李海峰',
    title: '副教授',
    labId: 1,
    labName: '人工智能实训室',
    researchDirection: '多模态大模型',
    quota: 4,
    quotaUsed: 3,
    remainQuota: 1,
    selectable: 1
  },
  {
    mentorId: 13,
    mentorName: '陈晓',
    title: '讲师',
    labId: 1,
    labName: '人工智能实训室',
    researchDirection: '计算机视觉',
    quota: 4,
    quotaUsed: 2,
    remainQuota: 2,
    selectable: 1
  },
  {
    mentorId: 21,
    mentorName: '赵明',
    title: '教授',
    labId: 2,
    labName: '智能制造实训室',
    researchDirection: '工业机器人',
    quota: 3,
    quotaUsed: 1,
    remainQuota: 2,
    selectable: 1
  },
  {
    mentorId: 22,
    mentorName: '孙倩',
    title: '讲师',
    labId: 2,
    labName: '智能制造实训室',
    researchDirection: '数字孪生',
    quota: 2,
    quotaUsed: 2,
    remainQuota: 0,
    selectable: 0
  }
]

let supplementSelectedId: number | null = null

let supplementApplicants: SupplementApplicant[] = [
  {
    studentId: 1006,
    studentNo: '2022****06',
    studentName: '周*',
    major: '软件工程',
    grade: '2022',
    totalScore: 76.5,
    admitted: 0
  },
  {
    studentId: 1007,
    studentNo: '2022****07',
    studentName: '吴*婷',
    major: '计算机科学与技术',
    grade: '2022',
    totalScore: 73,
    admitted: 0
  }
]

export async function mockSupplementMentors(): Promise<SupplementMentor[]> {
  await delay()
  return deepCopy(supplementMentors)
}

export async function mockSaveSupplementIntention(mentorId: number): Promise<void> {
  await delay()
  const mentor = supplementMentors.find((item) => item.mentorId === mentorId)
  if (!mentor) {
    throw new MockError(404001, '导师不存在')
  }
  if (mentor.remainQuota <= 0) {
    throw new MockError(400002, '该导师名额已满，请选择其他导师')
  }
  supplementSelectedId = mentorId
}

export async function mockSupplementSelected(): Promise<number | null> {
  await delay()
  return supplementSelectedId
}

export async function mockSupplementApplicants(): Promise<SupplementApplicant[]> {
  await delay()
  return deepCopy(supplementApplicants.filter((item) => item.admitted === 0))
}

export async function mockDirectAdmit(studentId: number): Promise<SupplementDirectAdmitResp> {
  await delay()
  const applicant = supplementApplicants.find((item) => item.studentId === studentId)
  if (!applicant) {
    throw new MockError(400005, '该生未将你列为补录意向')
  }
  const mentor = supplementMentors.find((item) => item.mentorId === 11)
  if (mentor && mentor.remainQuota <= 0) {
    throw new MockError(400002, '个人剩余名额不足')
  }
  if (mentor) {
    mentor.quotaUsed += 1
    mentor.remainQuota -= 1
  }
  applicant.admitted = 1
  supplementApplicants = supplementApplicants.filter((item) => item.studentId !== studentId)
  return { admissionId: Date.now(), status: 2 }
}
