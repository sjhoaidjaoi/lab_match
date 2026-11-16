// ============ 数据库运维脚本 ============
// 用法：
//   node scripts/db.js init   初始化数据库（建表 + 迁移，可重复执行）
//   node scripts/db.js check  检查连接与数据量
// 需要环境变量：MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mysqlStore = require('../data/mysql')

async function main() {
  const command = process.argv[2] || 'check'
  if (!mysqlStore.enabled()) {
    console.log('[db] 当前未启用 MySQL（DB_DRIVER 不等于 mysql）')
    console.log('[db] 如需初始化数据库，请在 .env 中设置 DB_DRIVER=mysql 后重试')
    return
  }
  if (command === 'init') {
    const result = await mysqlStore.initDatabase()
    console.log(result.created ? '[db] 已创建数据库并完成建表' : '[db] 已执行增量迁移')
    console.log('[db] 初始化完成，可执行 npm run db:check 验证连接')
    return
  }
  const ok = await mysqlStore.ping()
  console.log(`[db] 连接正常：${ok}`)
  const store = await mysqlStore.loadStore()
  if (!store) {
    console.log('[db] 数据库为空，启动后端时会自动写入种子数据')
  } else {
    Object.entries(store).forEach(([key, value]) => {
      if (Array.isArray(value)) console.log(`[db] ${key}: ${value.length} 条`)
    })
  }
}

main()
  .then(() => mysqlStore.close())
  .catch((err) => {
    console.error('[db] 执行失败：', err.message)
    process.exit(1)
  })
