import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { Result } from '@/types'

declare module 'axios' {
  interface AxiosRequestConfig {
    silent?: boolean
  }
}

const TOKEN_KEY = 'lm_token'
const ROLE_KEY = 'lm_role'
const USER_KEY = 'lm_user'
const ROLES_KEY = 'lm_roles'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000
})

service.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const role = localStorage.getItem(ROLE_KEY)
  if (token && !config.headers.has('Authorization')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (role) {
    config.headers['X-Role'] = role
  }
  return config
})

service.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') return response
    const body = response.data as Result<unknown>
    if (body && (body.code === 200 || body.code === 'OK')) {
      // 拦截器统一解包业务数据，调用方通过 http.get<T>() 得到 T
      return body.data as unknown as typeof response
    }
    const message = body?.message || '请求失败'
    if (!response.config.silent && response.config.url !== '/auth/login' && response.config.url !== '/auth/logout') ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
  async (error) => {
    // 后端热重启（node --watch）或瞬断时，GET 属于幂等请求，最多自动重试三次
    //（300ms / 700ms / 1000ms），覆盖两秒左右的重启窗口，避免整页同时弹红条。
    const retryConfig = error.config as (AxiosRequestConfig & { __retryCount?: number }) | undefined
    const method = (retryConfig?.method || 'get').toLowerCase()
    const transientFailure = !error.response || [500, 502, 503, 504].includes(error.response.status)
    const attempt = retryConfig?.__retryCount ?? 0
    if (retryConfig && method === 'get' && transientFailure && attempt < 3) {
      retryConfig.__retryCount = attempt + 1
      await new Promise((resolve) => setTimeout(resolve, [300, 700, 1000][attempt] ?? 1000))
      return service(retryConfig)
    }

    const status = error.response?.status
    const loginRequest = error.config?.url === '/auth/login'
    if (error.config?.url === '/auth/logout') return Promise.reject(error)

    const currentToken = localStorage.getItem(TOKEN_KEY)
    const requestAuthorization = error.config?.headers?.get('Authorization')
    if (status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED' &&
      currentToken && requestAuthorization === `Bearer ${currentToken}`) {
      if (window.location.pathname !== '/change-password') window.location.replace('/change-password')
      return Promise.reject(error)
    }
    if (status === 401 && !loginRequest &&
      (!currentToken || requestAuthorization !== `Bearer ${currentToken}`)) {
      return Promise.reject(error)
    }

    const serverMessage = error.response?.data?.message
    const message = serverMessage || (loginRequest && (!status || status >= 500)
      ? '暂时无法连接登录服务，请稍后重试'
      : error.message || '网络异常，请稍后重试')
    if (!error.config?.silent && !loginRequest && (error.config?.url !== '/auth/password' || status === 401)) ElMessage.error(message)
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(ROLES_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const inlineMessage = error.config?.silent || loginRequest || error.config?.url === '/auth/password'
    return Promise.reject(inlineMessage ? new Error(message) : error)
  }
)

export const http = {
  get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config }) as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config) as Promise<T>
  },
  put<T>(url: string, data?: unknown): Promise<T> {
    return service.put(url, data) as Promise<T>
  },
  delete<T>(url: string): Promise<T> {
    return service.delete(url) as Promise<T>
  }
}

export default service
