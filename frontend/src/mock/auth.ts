import type { ChangePasswordReq, LoginReq, LoginResp, UserInfo } from '@/types/auth'

export class MockError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'MockError'
    this.code = code
  }
}

interface MockAccount {
  password: string
  needChangePwd: 0 | 1
  status: 0 | 1
  user: UserInfo
}

const accounts: Record<string, MockAccount> = {
  '20220001': {
    password: '123456',
    needChangePwd: 0,
    status: 1,
    user: {
      id: 1001,
      userNo: '20220001',
      realName: '陈爱丽',
      userType: 1,
      leader: false,
      college: '计算机学院',
      major: '软件工程',
      grade: '2022'
    }
  },
  '20220002': {
    password: '123456',
    needChangePwd: 0,
    status: 0,
    user: {
      id: 1002,
      userNo: '20220002',
      realName: '张强',
      userType: 1,
      leader: false,
      college: '计算机学院',
      major: '软件工程',
      grade: '2022'
    }
  },
  '20010001': {
    password: '123456',
    needChangePwd: 0,
    status: 1,
    user: {
      id: 2001,
      userNo: '20010001',
      realName: '李海峰',
      userType: 2,
      leader: true,
      college: '计算机学院',
      major: null,
      grade: null
    }
  },
  '20010002': {
    password: '123456',
    needChangePwd: 0,
    status: 1,
    user: {
      id: 2002,
      userNo: '20010002',
      realName: '王建国',
      userType: 2,
      leader: false,
      college: '计算机学院',
      major: null,
      grade: null
    }
  },
  admin: {
    password: '123456',
    needChangePwd: 1,
    status: 1,
    user: {
      id: 9001,
      userNo: 'admin',
      realName: '系统管理员',
      userType: 3,
      leader: false,
      college: null,
      major: null,
      grade: null
    }
  }
}

const MOCK_DELAY_MS = 300

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS)
  })
}

export async function mockLogin(req: LoginReq): Promise<LoginResp> {
  await delay()
  const account = accounts[req.userNo]
  if (!account || account.user.userType !== req.loginType) {
    throw new MockError(401002, '账号或密码错误')
  }
  if (account.status === 0) {
    throw new MockError(401003, '账号已被禁用，请联系学院管理员')
  }
  if (account.password !== req.password) {
    throw new MockError(401002, '账号或密码错误')
  }
  return {
    token: `mock-token-${account.user.userNo}-${Date.now()}`,
    expiresIn: 7200,
    needChangePwd: account.needChangePwd,
    user: account.user
  }
}

export async function mockChangePassword(req: ChangePasswordReq): Promise<void> {
  await delay()
  if (req.newPassword !== req.confirmPassword) {
    throw new MockError(400001, '两次输入的密码不一致')
  }
  if (req.newPassword === req.oldPassword) {
    throw new MockError(400002, '新密码不能与原密码相同')
  }
  if (req.oldPassword !== '123456') {
    throw new MockError(400002, '原密码错误')
  }
}

export async function mockLogout(): Promise<void> {
  await delay()
}
