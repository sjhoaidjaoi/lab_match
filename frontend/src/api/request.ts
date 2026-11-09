import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { Result } from '@/types'

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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (role) {
    config.headers['X-Role'] = role
  }
  return config
})

service.interceptors.response.use(
  (response) => {
    const body = response.data as Result<unknown>
    if (body && body.code === 'OK') {
      // 拦截器统一解包业务数据，调用方通过 http.get<T>() 得到 T
      return body.data as unknown as typeof response
    }
    const message = body?.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    ElMessage.error(message)
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(ROLES_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
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
