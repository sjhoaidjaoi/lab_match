// ============ 旧账号影响范围报告（只读，不做任何修改） ============
// 用途：清理开发测试账号前，先列出全部账号及其关联业务数据，
//       由用户确认后再执行清理。本脚本不会删除、停用或修改任何记录。
//
// 用法：node scripts/inspect-accounts.js

require('dotenv').config()
const { getStore, seedMockData } = require('../data/seed')

const KEEP = new Set(['rjxyrjxy', 'rjxy@202', 'rjxy@204', 'rjxy@402', 'rjxy@404', 'rjxy@406', 'rjxy@505'])

function referencesOf(store, user) {
  return {
    招生志愿: (store.studentPreferences || []).filter((i) => i.studentId === user.id).length,
    面试记录_学生: (store.interviews || []).filter((i) => i.studentId === user.id).length,
    面试记录_面试官: (store.interviews || []).filter((i) => i.interviewerId === user.id).length,
    拟录取: (store.admissionIntentions || []).filter((i) => i.studentId === user.id).length,
    调剂: (store.adjustments || []).filter((i) => i.studentId === user.id || i.operatorId === user.id).length,
    最终名单: (store.finalAdmissions || []).filter((i) => i.studentId === user.id).length,
    教师档案: (store.labTeachers || []).filter((i) => i.userId === user.id && !i.deletedAt).length,
    操作日志: (store.operationLogs || []).filter((i) => i.operatorId === user.id).length,
    宣传资料: (store.labPromotionFiles || []).filter((i) => i.uploadedBy === user.id).length,
    担任组长: (store.laboratories || []).filter((l) => l.leaderId === user.id).length
  }
}

async function main() {
  await seedMockData()
  const store = getStore()
  const users = [...(store.users || [])].sort((a, b) => a.id - b.id)

  console.log('\n===== 账号清单与关联业务数据（只读报告） =====')
  console.log(`账号总数：${users.length}\n`)

  const rows = users.map((user) => {
    const refs = referencesOf(store, user)
    const total = Object.values(refs).reduce((sum, n) => sum + n, 0)
    return { user, refs, total }
  })

  for (const { user, refs, total } of rows) {
    const lab = (store.laboratories || []).find((l) => l.id === user.laboratoryId)
    const kept = KEEP.has(user.username)
    const detail = Object.entries(refs).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join('、')
    console.log(`#${String(user.id).padEnd(3)} ${String(user.username).padEnd(10)} ${String(user.realName || '').padEnd(10)} ${String(user.role).padEnd(14)} 状态=${String(user.status).padEnd(8)} 实训室=${lab ? lab.labCode || lab.name : '—'}`)
    console.log(`      本次保留：${kept ? '是' : '否'}｜关联记录合计 ${total}${detail ? '｜' + detail : ''}`)
  }

  const removable = rows.filter(({ user, total }) => !KEEP.has(user.username) && total === 0)
  const needDisable = rows.filter(({ user, total }) => !KEEP.has(user.username) && total > 0)

  console.log('\n----- 清理建议 -----')
  console.log(`A. 无任何关联业务记录，可直接删除：${removable.length} 个`)
  removable.forEach(({ user }) => console.log(`   - ${user.username}（${user.realName || '未填姓名'}，${user.role}）`))
  console.log(`B. 存在关联业务记录，只能停用 / 解除登录权限，不得删除：${needDisable.length} 个`)
  needDisable.forEach(({ user, total }) => console.log(`   - ${user.username}（${user.realName || '未填姓名'}，${user.role}）关联 ${total} 条`))
  console.log(`C. 本次初始化保留：${rows.filter(({ user }) => KEEP.has(user.username)).length} 个（rjxyrjxy + rjxy@202/204/402/404/406/505）`)
  console.log('\n本报告未修改任何数据。确认后再执行清理。')
}

main().catch((error) => {
  console.error('[accounts] 生成报告失败：', error)
  process.exit(1)
})
