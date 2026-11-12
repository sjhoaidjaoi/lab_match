/**
 * 演示快捷登录账号，仅在开发环境开启（VITE_DEMO_LOGIN=true）。
 */
export interface DemoAccount {
  key: string
  label: string
  description: string
  loginType: 1 | 2 | 3
  userNo: string
  password: string
  redirect: string
}

export const DEMO_LOGIN_ENABLED = import.meta.env.VITE_DEMO_LOGIN === 'true'

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: 'student',
    label: '学生快捷登录',
    description: '陈晓 · 已确认录取',
    loginType: 1,
    userNo: '2022001',
    password: '123456',
    redirect: '/student'
  },
  {
    key: 'teacher',
    label: '导师快捷登录',
    description: '张明 · 智能制造实训室',
    loginType: 2,
    userNo: 'T9001',
    password: '123456',
    redirect: '/teacher'
  },
  {
    key: 'ai-mentor',
    label: 'AI 导师快捷登录',
    description: '刘洋 · 人工智能应用实训室',
    loginType: 2,
    userNo: 'T9003',
    password: '123456',
    redirect: '/teacher'
  },
  {
    key: 'bd-mentor',
    label: '大数据导师快捷登录',
    description: '孙倩 · 大数据与云计算实训室',
    loginType: 2,
    userNo: 'T9005',
    password: '123456',
    redirect: '/teacher'
  },
  {
    key: 'admin',
    label: '管理员快捷登录',
    description: '学院管理员',
    loginType: 3,
    userNo: 'ADMIN9001',
    password: '123456',
    redirect: '/admin'
  }
]
