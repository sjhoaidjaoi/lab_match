import { get, put } from './request'
import type { StudentArchive, StudentArchiveSaveReq } from '@/types/student'

interface RawStudentArchive {
  userNo: string | null
  realName: string | null
  college: string | null
  major: string | null
  grade: string | null
  className: string | null
  gpa: number | null
  ranking: number | null
  englishLevel: string | null
  programmingLanguages: string[] | null
  techStack: string[] | null
  projectExperience: string | null
  competitionExperience: string | null
  researchExperience: string | null
  internshipExperience: string | null
  weeklyHours: number | null
  availableSlots: string | null
  otherDuties: string | null
  expectedDirection: string | null
  statement: string | null
  missingFields: string[] | null
}

interface ArchiveSaveResp {
  missingFields: string[] | null
}

function normalize(data: RawStudentArchive): StudentArchive {
  return {
    userNo: data.userNo ?? '',
    realName: data.realName ?? '',
    college: data.college,
    major: data.major,
    grade: data.grade,
    className: data.className ?? '',
    gpa: data.gpa,
    ranking: data.ranking,
    englishLevel: data.englishLevel ?? '',
    programmingLanguages: data.programmingLanguages ?? [],
    techStack: data.techStack ?? [],
    projectExperience: data.projectExperience ?? '',
    competitionExperience: data.competitionExperience ?? '',
    researchExperience: data.researchExperience ?? '',
    internshipExperience: data.internshipExperience ?? '',
    weeklyHours: data.weeklyHours,
    availableSlots: data.availableSlots ?? '',
    otherDuties: data.otherDuties ?? '',
    expectedDirection: data.expectedDirection ?? '',
    statement: data.statement ?? '',
    missingFields: data.missingFields ?? []
  }
}

/**
 * 查询我的档案，未创建时返回 null。
 */
export async function getMyArchive(): Promise<StudentArchive | null> {
  const data = await get<RawStudentArchive | null>('/student/archive')
  return data ? normalize(data) : null
}

/**
 * 保存我的档案，返回缺失的必填项 key。
 */
export async function saveMyArchive(payload: StudentArchiveSaveReq): Promise<string[]> {
  const data = await put<ArchiveSaveResp>('/student/archive', payload)
  return data.missingFields ?? []
}
