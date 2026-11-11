export interface ProfileInfo {
  id: number
  userNo: string
  realName: string
  userType: number
  gender: number | null
  phone: string | null
  email: string | null
  college: string | null
  major: string | null
  grade: string | null
  title: string | null
}

export interface ProfileUpdateReq {
  phone: string
  email: string
}
