import { teachersOf } from './teachers'

const DEFS = [
  { id: 1, name: '智能感知与机器人实训室', direction: '机器人感知 / 强化学习' },
  { id: 2, name: '数据智能实训室', direction: '数据挖掘 / 推荐系统' },
  { id: 3, name: '嵌入式与边缘计算实训室', direction: '嵌入式 / 边缘 AI' },
  { id: 4, name: '云原生与软件工程实训室', direction: '云原生 / 分布式系统' },
  { id: 5, name: '网络与信息安全实训室', direction: '系统安全 / 漏洞挖掘' },
  { id: 6, name: '数字媒体与智能交互实训室', direction: '虚拟现实 / 人机交互' }
]

// 实训室名额 = 本室教师数 × 16（64 人，例外室 80 人）
export const labs = DEFS.map((d) => ({
  ...d,
  leader: teachersOf(d.id).find((t) => t.isLeader)?.name || '',
  quota: teachersOf(d.id).reduce((sum, t) => sum + t.quota, 0)
}))

export const labOf = (id) => labs.find((l) => l.id === Number(id))

export function labName(id) {
  return labOf(id)?.name || '未知实训室'
}