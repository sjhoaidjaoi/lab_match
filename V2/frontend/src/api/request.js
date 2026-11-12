import axios from 'axios'
import { ElMessage } from 'element-plus'

// 骨架阶段默认不请求后端，接入时把 baseURL 打开即可
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('trs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && body.code !== 0) {
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(body)
    }
    return body?.data ?? body
  },
  (err) => {
    const status = err.response?.status
    if (status === 401) ElMessage.error('登录已失效')
    else if (status === 403) ElMessage.error('无权访问该资源')
    else ElMessage.error(err.response?.data?.message || '网络异常')
    return Promise.reject(err)
  }
)

export default request
