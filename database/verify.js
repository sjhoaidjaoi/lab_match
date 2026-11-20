#!/usr/bin/env node
/**
 * 数据库迁移静态校验
 * 运行：node database/verify.js
 *
 * 作用：在没有 MySQL 实例的环境中，也能发现迁移脚本的结构性问题：
 * 1. 迁移文件编号连续、无重复、无缺口
 * 2. 每个迁移文件非空且包含 DDL 语句
 * 3. 后端 MySQL 适配层要求的所有数据表，都能在 schema.sql 或某个迁移中找到建表语句
 * 4. 迁移文件里引用的表名确实存在（避免 ALTER 一张拼错的表）
 *
 * 注意：这是静态检查，不能替代在真实 MySQL 上执行迁移。
 * 真实迁移验证需按 docs/DEPLOYMENT.md 的「数据库迁移」章节在测试库执行。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DB_DIR = path.join(__dirname)

let pass = 0
const failures = []
function check(name, condition, detail = '') {
  if (condition) {
    pass += 1
    console.log(`  PASS  ${name}`)
  } else {
    failures.push(`${name}${detail ? ' | ' + detail : ''}`)
    console.log(`  FAIL  ${name}${detail ? ' | ' + detail : ''}`)
  }
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

// ---- 1. 收集迁移文件，检查编号连续性 ----
const files = fs.readdirSync(DB_DIR).filter((f) => /^migration_v\d+\.sql$/.test(f))
const versions = files
  .map((f) => Number(f.match(/migration_v(\d+)\.sql/)[1]))
  .sort((a, b) => a - b)

console.log('\n== 1. 迁移文件编号 ==')
check('存在迁移文件', versions.length > 0, `实际 ${versions.length} 个`)
check('编号无重复', new Set(versions).size === versions.length, versions.join(','))
const expected = Array.from({ length: versions.length }, (_, i) => i + 2)
check('编号从 v2 起连续无缺口', JSON.stringify(versions) === JSON.stringify(expected),
  `实际 ${versions.join(',')}`)

// ---- 2. 每个迁移文件非空且含 DDL ----
console.log('\n== 2. 迁移文件内容 ==')
for (const file of files.sort()) {
  const sql = readIfExists(path.join(DB_DIR, file)).trim()
  const hasDdl = /\b(CREATE|ALTER|DROP INDEX|UPDATE|INSERT)\b/i.test(sql)
  check(`${file} 内容有效`, sql.length > 0 && hasDdl, sql.length ? '缺少 DDL 语句' : '文件为空')
}

// ---- 3. 汇总所有建表语句 ----
function createTablesIn(sql) {
  const names = []
  const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+`?([a-zA-Z0-9_]+)`?/gi
  let match
  while ((match = re.exec(sql)) !== null) names.push(match[1])
  return names
}

const schemaSql = readIfExists(path.join(DB_DIR, 'schema.sql'))
const seedSql = readIfExists(path.join(DB_DIR, 'seed.sql'))
const allMigrationSql = files.map((f) => readIfExists(path.join(DB_DIR, f))).join('\n')

const knownTables = new Set([
  ...createTablesIn(schemaSql),
  ...createTablesIn(allMigrationSql)
])

console.log('\n== 3. 建表覆盖面 ==')
check('schema.sql 含建表语句', createTablesIn(schemaSql).length > 0,
  `实际 ${createTablesIn(schemaSql).length} 张`)

// ---- 4. 后端适配层要求的表必须存在 ----
const mysqlAdapter = readIfExists(path.join(ROOT, 'backend', 'data', 'mysql.js'))
const mappingBlock = mysqlAdapter.match(/const COLLECTION_TABLES\s*=\s*\{([\s\S]*?)\n\}/)
check('可解析后端表映射', Boolean(mappingBlock))

if (mappingBlock) {
  const tableNames = [...mappingBlock[1].matchAll(/:\s*'([a-zA-Z0-9_]+)'/g)].map((m) => m[1])
  check('表映射非空', tableNames.length > 0, `实际 ${tableNames.length} 张`)

  const missing = tableNames.filter((t) => !knownTables.has(t))
  check('后端要求的表全部有建表语句', missing.length === 0,
    missing.length ? `缺失：${missing.join(', ')}` : '')

  // 反向：schema 里建了但后端没映射的表，提示即可（不算失败）
  const unmapped = [...knownTables].filter((t) => !tableNames.includes(t))
  if (unmapped.length) console.log(`  提示  未纳入后端集合映射的表：${unmapped.join(', ')}`)
}

// ---- 5. 迁移中 ALTER 的表必须已存在 ----
console.log('\n== 5. 迁移引用的表存在性 ==')
const altered = new Set()
for (const match of allMigrationSql.matchAll(/ALTER TABLE\s+`?([a-zA-Z0-9_]+)`?/gi)) {
  altered.add(match[1])
}
const unknownAlter = [...altered].filter((t) => !knownTables.has(t))
check('迁移中 ALTER 的表均有建表语句', unknownAlter.length === 0,
  unknownAlter.length ? `未知表：${unknownAlter.join(', ')}` : '')

// ---- 6. seed.sql 可解析 ----
console.log('\n== 6. 种子数据 ==')
check('seed.sql 存在且非空', seedSql.trim().length > 0, seedSql ? '' : '文件缺失')

// ---- 汇总 ----
console.log(`\n===== 迁移静态校验结果：通过 ${pass}，失败 ${failures.length} =====`)
console.log('提示：本检查为静态校验，真实迁移需在 MySQL 测试库按 DEPLOYMENT.md 执行。')
if (failures.length) {
  failures.forEach((f) => console.log('  FAILED:', f))
  process.exit(1)
}
