// ============ 生成/重置联调测试账号 ============
// 用法：cd backend && node scripts/create-test-accounts.js
// 说明：脚本幂等，可重复执行；已存在的账号会被重置为统一测试密码。
// 统一密码 = 系统初始密码（utils/accountCredentials.js 中的 INITIAL_PASSWORD，与 admin 相同）
// 因为不是走"改密"接口写入，所以登录后不会被强制改密。

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { getStore, persistStore, nextId } = require('../data/seed')
const { INITIAL_PASSWORD } = require('../utils/accountCredentials')

const PASSWORD = INITIAL_PASSWORD
const LAB_ID = 1

// 每个端一个账号
const ACCOUNTS = [
  {
    role: 'STUDENT',
    username: '2022001',
    realName: '演示学生',
    studentNumber: '2022001',
    phone: '13900000001',
    laboratoryId: null
  },
  {
    role: 'LAB_TEACHER',
    username: 'T2001',
    realName: '演示教师',
    studentNumber: null,
    phone: '13900000002',
    laboratoryId: LAB_ID
  },
  {
    role: 'LAB_LEADER',
    username: 'L001',
    realName: '演示组长',
    studentNumber: null,
    phone: '13900000003',
    laboratoryId: LAB_ID
  },
  {
    role: 'COLLEGE_ADMIN',
    username: 'college',
    realName: '演示学院管理员',
    studentNumber: null,
    phone: '13900000004',
    laboratoryId: null
  }
]

function upsertAccount(store, spec) {
  const hash = bcrypt.hashSync(PASSWORD, 10)
  const existing = store.users.find(
    (u) => u.username === spec.username || u.studentNumber === spec.username
  )

  if (existing) {
    // 已存在：只重置密码与状态，保留原有姓名/工号等业务资料
    existing.passwordHash = hash
    existing.mustChangePassword = false
    existing.credentialVersion = (existing.credentialVersion ?? 0) + 1
    existing.status = 'ACTIVE'
    if (spec.laboratoryId != null) existing.laboratoryId = spec.laboratoryId
    return { action: 'reset', user: existing }
  }

  const user = {
    id: nextId(store.users),
    username: spec.username,
    realName: spec.realName,
    studentNumber: spec.studentNumber,
    role: spec.role,
    phone: spec.phone,
    laboratoryId: spec.laboratoryId,
    passwordHash: hash,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    mustChangePassword: false,
    credentialVersion: 1
  }
  store.users.push(user)
  return { action: 'created', user }
}

function main() {
  const store = getStore()
  const results = ACCOUNTS.map((spec) => ({ spec, ...upsertAccount(store, spec) }))
  persistStore(store)

  console.log('')
  console.log('角色            账号        姓名            实训室    结果')
  console.log('-'.repeat(72))
  for (const item of results) {
    const { spec, action, user } = item
    console.log(
      `${spec.role.padEnd(14)}  ${user.username.padEnd(10)}  ${user.realName.padEnd(14)}  ` +
      `${user.laboratoryId ?? '-'}${' '.repeat(9 - String(user.laboratoryId ?? '-').length)}` +
      `${action === 'created' ? '新建' : '重置密码'}`
    )
  }
  console.log('-'.repeat(72))
  console.log('统一密码 = 系统初始密码 INITIAL_PASSWORD（backend/utils/accountCredentials.js）')
  console.log(`当前值长度 ${PASSWORD.length} 位，与 admin 账号一致`)
  console.log('')
}

main()
