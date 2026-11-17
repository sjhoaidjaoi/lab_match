import service, { http } from './request'
import type { PreferenceRow } from './lab'
import type { EvaluationSummary } from './interviewSelection'

export interface Resume { id: string; name: string; size: number }
export interface ReviewEntry { studentId: number; studentName?: string; type: 'INTENDED' | 'ALTERNATE'; reason: string; resume?: Resume | null }
export interface RecruitmentReview {
  id: number
  kind: 'TEACHER' | 'LAB' | 'INTERNAL'
  laboratoryName?: string
  authorId: number
  authorName?: string
  entries: ReviewEntry[]
  adjustments?: { id: number; studentId: number; status: string; reason?: string }[]
  status: 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED'
  labStatus?: RecruitmentReview['status']
  version: number
  submittedAt?: string
  returnReason?: string
}
export interface LabReviewCandidate {
  studentId: number
  studentName: string
  studentNumber?: string | null
  labTeacherName: string
  source: 'LEADER' | 'TEACHER' | 'INVITATION'
  suggestedType: ReviewEntry['type']
  reason?: string
  submittedAt?: string
  interview: PreferenceRow['interview']
  resume?: Resume | null
}
export interface LabStudentGroup {
  key: string
  mentorId: number | null
  teacherName: string
  students: {
    studentId: number
    studentName: string
    studentNumber?: string
    interviewStatus?: string
    interviewId?: number
    appointmentStatus?: string
    direction?: string
    online?: boolean
    evaluated?: boolean
    evaluationSummary?: EvaluationSummary
    recommendation?: string
    invitationStatus?: string
  }[]
}
const base = '/recruitment-reviews'
const resumes = '/preferences/resumes'
export const recruitmentApi = {
  draft: () => http.get<Resume | null>(resumes + '/draft'),
  upload(file: File) {
    const data = new FormData()
    data.append('file', file)
    return http.post<Resume>(resumes + '/draft', data)
  },
  async download(resume: Resume) {
    const response = await service.get<Blob>(resumes + '/' + encodeURIComponent(resume.id), { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = resume.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
  reviews: () => http.get<RecruitmentReview[]>(base),
  labCandidates: () => http.get<LabReviewCandidate[]>(base + '/lab-candidates'),
  labStudents: () => http.get<LabStudentGroup[]>(base + '/lab-students'),
  saveTeacher: (entries: ReviewEntry[], submit: boolean) => http.post(base + '/teacher', { entries, submit }),
  returnTeacher: (id: number, reason: string) => http.post(base + '/teacher/' + id + '/return', { reason }),
  submitLab: (entries: ReviewEntry[]) => http.post(base + '/lab', { entries }),
  submitInternal: () => http.post(base + '/internal'),
  review: (row: RecruitmentReview, approve: boolean, reason?: string) =>
    http.post(base + '/' + row.kind.toLowerCase() + '/' + row.id + '/review', { approve, reason })
}
