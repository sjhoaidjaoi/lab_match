import { defineStore } from 'pinia'
import { authApi, type LoginPayload } from '@/api/auth'
import type { LoginResponse, MeResponse, RoleInfo, UserInfo } from '@/types'

const TOKEN_KEY = 'lm_token'
const ROLE_KEY = 'lm_role'
const USER_KEY = 'lm_user'
const ROLES_KEY = 'lm_roles'

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readJson<UserInfo | null>(USER_KEY, null),
    roles: readJson<RoleInfo[]>(ROLES_KEY, []),
    currentRole: localStorage.getItem(ROLE_KEY) || '',
    loading: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    roleName: (state) => state.roles.find((r) => r.roleCode === state.currentRole)?.roleName || '',
    hasMultipleRoles: (state) => state.roles.length > 1
  },
  actions: {
    async login(payload: LoginPayload) {
      this.loading = true
      try {
        const data = await authApi.login(payload)
        this.applyLogin(data)
        return data
      } finally {
        this.loading = false
      }
    },
    async switchRole(roleCode: string) {
      const data = await authApi.switchRole(roleCode)
      this.applyLogin(data)
      return data
    },
    async refresh() {
      if (!this.token) return
      const data: MeResponse = await authApi.me()
      this.user = data.user
      this.roles = data.roles
      this.currentRole = data.activeRole
      this.persist()
    },
    applyLogin(data: LoginResponse) {
      this.token = data.token
      this.user = data.user
      this.roles = data.roles
      this.currentRole = data.activeRole
      this.persist()
    },
    persist() {
      localStorage.setItem(TOKEN_KEY, this.token)
      localStorage.setItem(ROLE_KEY, this.currentRole)
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      localStorage.setItem(ROLES_KEY, JSON.stringify(this.roles))
    },
    logout() {
      authApi.logout().catch(() => undefined)
      this.token = ''
      this.user = null
      this.roles = []
      this.currentRole = ''
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(ROLES_KEY)
    }
  }
})
