// ============ 旧账号清理（执行） ============
// 删除开发/演示账号及其关联业务记录，仅保留本次初始化的 7 个账号。
// 用法：node scripts/clean-legacy-accounts.js [--commit]
//   --commit  实际写盘；缺省为 dry-run 仅打印预览

const fs = require('fs')
const path = require('path')

const STORE_FILE = process.env.LAB_STORE_FILE
  ? path.resolve(process.env.LAB_STORE_FILE)
  : path.join(__dirname, '..', 'data', '.store.json')

const COMMIT = process.argv.includes('--commit')

// 本次保留的账号（username 白名单）
const KEEP_USERNAMES = new Set(['rjxyrjxy', 'rjxy@202', 'rjxy@204', 'rjxy@402', 'rjxy@404', 'rjxy@406', 'rjxy@505'])

const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))

// 1. 找出要删除的旧账号
const toDelete = (store.users || []).filter((u) => !KEEP_USERNAMES.has(u.username))
const delIds = new Set(toDelete.map((u) => u.id))
const delUsernames = toDelete.map((u) => `${u.username}(${u.realName || ''})`)

// 2. 全集合扫描：凡是引用旧账号 id 的记录一并删除。
//    引用字段覆盖：operatorId / createdBy / interviewerId / studentId /
//    uploadedBy / userId / leaderId / operatorBy / by 等（按集合实际情况）。
const refFields = [
  'operatorId', 'createdBy', 'uploadedBy', 'interviewerId', 'studentId',
  'userId', 'leaderId', 'operatorBy', 'by', 'teacherId', 'actorId'
]

const removals = {} // 集合名 -> 删除条数

for (const key of Object.keys(store)) {
  const list = store[key]
  if (!Array.isArray(list) || list.length === 0) continue
  const before = list.length
  store[key] = list.filter((item) => {
    if (typeof item !== 'object' || item === null) return true
    for (const f of refFields) {
      if (item[f] !== undefined && item[f] !== null && delIds.has(Number(item[f]))) {
        return false
      }
    }
    return true
  })
  const removed = before - store[key].length
  if (removed > 0) removals[key] = removed
}

// 3. 删除旧账号本身
const userBefore = store.users.length
store.users = store.users.filter((u) => KEEP_USERNAMES.has(u.username))
const userRemoved = userBefore - store.users.length

// 4. 清理：实训室 leaderId 若指向已删除账号则置空（本次旧账号都不担任组长，防御性处理）
;(store.laboratories || []).forEach((l) => {
  if (l.leaderId != null && delIds.has(Number(l.leaderId))) l.leaderId = null
})

// 5. 输出报告
console.log('\n===== 旧账号清理' + (COMMIT ? '（已执行写盘）' : '（DRY-RUN 预览，未写盘）') + ' =====')
console.log(`删除账号：${userRemoved} 个`)
toDelete.forEach((u) => console.log(`  - #${u.id} ${u.username}（${u.realName || ''}，${u.role}）`))
console.log('\n关联记录清理：')
const entries = Object.entries(removals)
if (entries.length === 0) {
  console.log('  （无）')
} else {
  entries.forEach(([k, n]) => console.log(`  - ${k}: ${n} 条`))
}
console.log(`\n保留账号：${store.users.length} 个`)
store.users.forEach((u) => console.log(`  + #${u.id} ${u.username}（${u.realName || ''}，${u.role}）lab=${u.laboratoryId ?? '—'}`))

if (COMMIT) {
  const tmp = `${STORE_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
  fs.renameSync(tmp, STORE_FILE)
  console.log('\n已写盘完成。')
} else {
  console.log('\n未加 --commit，本次未修改数据。确认后加 --commit 执行。')
}
