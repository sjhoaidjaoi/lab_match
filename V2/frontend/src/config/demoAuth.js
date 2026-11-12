import { labs } from '@/mock/labs'

/**
 * 演示登录：一个教师账号只属于一个实训室。
 * 真实实现由 POST /auth/login 返回 user.laboratoryId 与授权范围，前端不得自行切换。
 */
export function demoLabOf(teacher) {
  const lab = labs.find((l) => l.id === Number(teacher?.labId)) || labs[0]
  return { id: lab.id, name: lab.name }
}

// 兼容旧调用：返回单元素列表
export function demoLabsFor(teacher) {
  return [demoLabOf(teacher)]
}
