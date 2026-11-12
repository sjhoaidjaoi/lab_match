export type LoginType = 1 | 2 | 3

export type NeedChangePwd = 0 | 1

export interface LoginReq {
  loginType: LoginType
  userNo: string
  password: string
}

export interface UserInfo {
  id: number
  userNo: string
  realName: string
  userType: number
  leader: boolean
  college: string | null
  major: string | null
  grade: string | null
}

export interface LoginResp {
  token: string
  expiresIn: number
  needChangePwd: NeedChangePwd
  user: UserInfo
}

export interface TokenResp {
  token: string
  expiresIn: number
}

export interface ChangePasswordReq {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}
