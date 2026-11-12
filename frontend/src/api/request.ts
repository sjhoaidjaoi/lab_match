import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

const TOKEN_KEY = 'labselect_token'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

function loginPath(): string {
  const path = window.location.pathname
  if (path.startsWith('/teacher')) {
    return '/teacher/login'
  }
  if (path.startsWith('/leader')) {
    return '/teacher/login'
  }
  if (path.startsWith('/admin')) {
    return '/admin/login'
  }
  return '/student/login'
}

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const method = (config.method ?? 'get').toLowerCase()
  if (['post', 'put', 'delete'].includes(method) && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = createIdempotencyKey()
  }
  return config
})

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

request.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    ElMessage.error('网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

function unwrap<T>(response: AxiosResponse<ApiResult<T>>): T {
  const result = response.data
  if (result.code === 200) {
    return result.data
  }
  if (result.code === 401001) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('labselect_user')
    window.location.href = loginPath()
  } else if (result.code === 401004) {
    window.location.href = '/change-password'
  } else {
    ElMessage.error(result.message)
  }
  throw new Error(result.message)
}

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.get<ApiResult<T>>(url, config)
  return unwrap(response)
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.post<ApiResult<T>>(url, data, config)
  return unwrap(response)
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.put<ApiResult<T>>(url, data, config)
  return unwrap(response)
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await request.delete<ApiResult<T>>(url, config)
  return unwrap(response)
}

export default request
