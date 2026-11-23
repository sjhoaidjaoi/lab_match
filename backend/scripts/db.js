// ============ 数据库运维脚本 ============
// 用法：
//   node scripts/db.js init   初始化数据库（建库 / 建表 / 增量迁移，可重复执行）
//   node scripts/db.js check  检查连接与数据量
// 需要环境变量：MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mysqlStore = require('../data/mysql')

const MODE_TEXT = {
  created: '数据库不存在 → 已新建数据库并完成建表',
  schema: '数据库已存在但没有业务表 → 已按首次建表执行完整 schema',
  migrate: '数据库已存在且有业务表 → 只执行了增量迁移（未执行任何 DROP）'
}

async function init() {
  const result = await mysqlStore.initDatabase()
  console.log(`[db] 目标：${result.database} @ ${result.endpoint}`)
  console.log(`[db] 判定：${MODE_TEXT[result.mode] || result.mode}`)
  if (result.mode === 'migrate') {
    console.log(`[db] 现状：已有 ${result.systemTablesBefore} 张业务表（库内共 ${result.tablesBefore} 张表）`)
    console.log(`[db] 迁移：${result.migrationFiles.length} 个文件，执行 ${result.migrationStatements} 条语句，跳过 ${result.skippedStatements} 条（对象已存在）`)
  } else {
    console.log(`[db] 建表：schema.sql 执行 ${result.schemaStatements} 条语句`)
    console.log(`[db] 迁移：${result.migrationFiles.length} 个文件，执行 ${result.migrationStatements} 条语句，跳过 ${result.skippedStatements} 条（对象已存在）`)
  }
  console.log(`[db] 校验：${result.tablesAfter} 张业务表齐全，初始化完成`)
  console.log('[db] 下一步：npm run db:check 验证连接与数据量')
}

async function check() {
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

async function main() {
  const command = process.argv[2] || 'check'
  if (!mysqlStore.enabled()) {
    console.log('[db] 当前未启用 MySQL（DB_DRIVER 不等于 mysql）')
    console.log('[db] 如需初始化数据库，请在 .env 中设置 DB_DRIVER=mysql 后重试')
    return
  }
  if (command === 'init') {
    await init()
    return
  }
  await check()
}

main()
  .then(() => mysqlStore.close())
  .catch((err) => {
    console.error('[db] 执行失败：', err.message)
    if (err.dbInit && err.dbInit.code) {
      console.error(`[db] 失败位置：${err.dbInit.file} 第 ${err.dbInit.index + 1}/${err.dbInit.total} 条，错误码 ${err.dbInit.code}`)
    }
    process.exit(1)
  })
