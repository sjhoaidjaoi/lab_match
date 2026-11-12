export interface PublicityBatch {
  id: number
  roundId: number
  roundName: string
  title: string
  startTime: string
  endTime: string
  status: number
  statusText: string
  admissionCount: number
  disputeCount: number
  pendingDisputeCount: number
  remainSeconds: number
}

export interface PublicityRow {
  studentNo: string
  studentName: string
  labName: string
  mentorName: string
  isSelf: number
}

export interface PublicityDetail {
  id: number
  title: string
  startTime: string
  endTime: string
  status: number
  canDispute: number
  list: PublicityRow[]
}

/** 管理员公示名单行，字段与 04_API.md §3.35.1 一致 */
export interface PublicityAdminRow {
  admissionId: number
  studentId: number
  studentNo: string
  studentName: string
  college: string
  major: string
  labId: number
  labName: string
  mentorId: number
  mentorName: string
  finalTotal: number | null
  status: number
  statusText: string
  confirmTime: string | null
}

/** 管理员公示名单明细 */
export interface PublicityAdminDetail {
  id: number
  title: string
  startTime: string
  endTime: string
  status: number
  total: number
  list: PublicityAdminRow[]
}

export interface PublicityCreateReq {
  roundId: number
  title: string
  durationHours: number
}

export interface PublicityCreateResp {
  id: number
  startTime: string
  endTime: string
  admissionCount: number
  status: number
}

export interface PublicityConfirmResp {
  confirmedCount: number
  status: number
}

export interface DisputeItem {
  id: number
  disputeNo: string
  publicityId: number
  publicityTitle: string
  studentId: number
  studentNo: string
  studentName: string
  disputeType: number
  disputeTypeText: string
  content: string
  attachments: string[]
  status: number
  statusText: string
  handleResult: number | null
  handleResultText: string
  handleOpinion: string
  handlerId: number | null
  handlerName: string
  handleTime: string | null
  gmtCreate: string
}

export interface DisputeSubmitReq {
  publicityId: number
  disputeType: number
  content: string
  attachments: string[]
}

export interface DisputeSubmitResp {
  id: number
  status: number
}

export interface DisputeHandleReq {
  handleResult: number
  handleOpinion: string
  adjustMentorId?: number
}

export interface DisputeHandleResp {
  id: number
  status: number
  handleTime: string
}
