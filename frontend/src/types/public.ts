import type { CurrentRound } from './student'

/** 公共端当前轮次，补充后端实际返回的阶段与服务器时间字段 */
export interface PublicCurrentRound extends CurrentRound {
  phase: string
  locked: number
  serverTime: string
}

/** 实训室列表项，字段与 04_API.md §3.3 一致 */
export interface PublicLabListItem {
  id: number
  labCode: string
  labName: string
  department: string | null
  leaderName: string | null
  mentorCount: number
  totalQuota: number
  quotaUsed: number
  remainQuota: number
  researchDirection: string | null
  openDayDate: string | null
  status: number
}

/** 实训室详情下的导师简要信息，字段与 04_API.md §3.4 一致 */
export interface PublicLabMentor {
  id: number
  userId: number
  labId: number
  labName: string
  realName: string
  title: string | null
  researchDirection: string | null
  researchProjects: string | null
  quota: number
  quotaUsed: number
  remainQuota: number
}

/** 实训室详情，字段与 04_API.md §3.4 一致 */
export interface PublicLabDetail {
  id: number
  labCode: string
  labName: string
  department: string | null
  leaderName: string | null
  introduction: string | null
  researchDirection: string | null
  equipmentEnv: string | null
  trainingPlan: string | null
  assessmentRequirement: string | null
  openDayDate: string | null
  openDayStartTime: string | null
  openDayEndTime: string | null
  openDayLocation: string | null
  openDayNote: string | null
  totalQuota: number
  quotaUsed: number
  remainQuota: number
  status: number
  mentors: PublicLabMentor[]
}

/** 公共端公告，字段与 04_API.md 公共公告接口一致 */
export interface PublicNoticeItem {
  id: number
  title: string
  noticeType: number
  noticeTypeText: string
  content: string
  attachmentUrl: string | null
  publicityId: number | null
  publishTime: string | null
}

/** 实训室列表查询参数 */
export interface PublicLabQuery {
  keyword?: string
  department?: string
  status?: number
  pageNum?: number
  pageSize?: number
}

/** 公告列表查询参数 */
export interface PublicNoticeQuery {
  noticeType?: number
  pageNum?: number
  pageSize?: number
}
