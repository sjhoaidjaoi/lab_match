import { http } from './request'
import type { LabView, PreferenceItem } from '@/types'
import type { PreferenceSubmitPayload } from './preferences'

export const studentMvp = import.meta.env.VITE_STUDENT_MVP === 'true'

export interface StudentResume {
  phone: string
  major: string
  skills: string
  experience: string
  introduction: string
}

export interface MvpPreference extends Omit<PreferenceItem, 'submittedAt'> {
  submittedAt: number
}

export interface MvpOffer {
  id: number
  labName: string
  status: string
  deadline: number
  actionable: boolean
}

export interface MvpWorkspace {
  preferenceWindow: { end: number; open: boolean }
  interviews: { id: number; labName: string; interviewer: string; time: number; status: string }[]
  offers: MvpOffer[]
  published: boolean
  outcome: { labName: string; leader: string | null; status: string } | null
}

export const studentMvpApi = {
  resume: () => http.get<StudentResume>('/student/resume'),
  saveResume: (resume: StudentResume) => http.put<StudentResume>('/student/resume', resume),
  labs: () => http.get<LabView[]>('/laboratories'),
  preferences: () => http.get<MvpPreference[]>('/preferences/my'),
  submit: (payload: PreferenceSubmitPayload) => http.post<MvpPreference[]>('/preferences/submit', payload),
  workspace: () => http.get<MvpWorkspace>('/student/workspace'),
  confirm: (id: number) => http.post<MvpOffer[]>(`/student/offers/${id}/confirm`, {})
}
