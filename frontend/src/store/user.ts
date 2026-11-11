import { defineStore } from 'pinia'
import type { LoginResp, UserInfo } from '@/types/auth'

const TOKEN_KEY = 'labselect_token'
const USER_KEY = 'labselect_user'
const NEED_CHANGE_PWD_KEY = 'labselect_need_change_pwd'

interface UserState {
  token: string
  user: UserInfo | null
  needChangePwd: number
}

function readStoredUser(): UserInfo | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    user: readStoredUser(),
    needChangePwd: Number(localStorage.getItem(NEED_CHANGE_PWD_KEY) ?? '0')
  }),
  getters: {
    isLoggedIn: (state): boolean => Boolean(state.token),
    isStudent: (state): boolean => state.user?.userType === 1,
    isTeacher: (state): boolean => state.user?.userType === 2,
    isAdmin: (state): boolean => state.user?.userType === 3,
    displayName: (state): string => state.user?.realName ?? '未登录'
  },
  actions: {
    setLogin(resp: LoginResp) {
      this.token = resp.token
      this.user = resp.user
      this.needChangePwd = resp.needChangePwd
      localStorage.setItem(TOKEN_KEY, resp.token)
      localStorage.setItem(USER_KEY, JSON.stringify(resp.user))
      localStorage.setItem(NEED_CHANGE_PWD_KEY, String(resp.needChangePwd))
    },
    setNeedChangePwd(value: number) {
      this.needChangePwd = value
      localStorage.setItem(NEED_CHANGE_PWD_KEY, String(value))
    },
    logout() {
      this.token = ''
      this.user = null
      this.needChangePwd = 0
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(NEED_CHANGE_PWD_KEY)
    }
  }
})
