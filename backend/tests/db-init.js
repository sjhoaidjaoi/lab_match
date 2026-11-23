#!/usr/bin/env node
/**
 * 数据库初始化验收（真实 MySQL）
 * 运行：npm run test:db
 *
 * 覆盖场景：
 *   1. 数据库不存在          → 建库 + 执行完整建表脚本
 *   2. 库存在但没有任何表    → 执行完整建表脚本（首次建表）
 *   3. 已有完整表结构        → 只执行增量迁移
 *   4. 已有业务数据连续两次初始化 → 数据不丢、不 DROP、不重复破坏
 *   5. 库存在但结构不完整    → 明确报错退出，且不删除/替换已有表
 *   6. 迁移遇到真实数据错误  → 精确定位到文件与语句，数据保留
 *
 * 安全约定：
 *   · 只创建/删除 `lab_match_test_*` 前缀的独立测试库；
 *   · 若目标名与 MYSQL_DATABASE 或 lab_match 相同直接拒绝执行；
 *   · 没有可用的 MySQL 时自动跳过（退出码 0），不影响无数据库环境；
 *   · 不修改任何业务代码路径，只通过 `node scripts/db.js init` 的真实入口验证。
 *
 * 需要环境变量（可复用 MYSQL_*）：
 *   MYSQL_TEST_HOST / MYSQL_TEST_PORT / MYSQL_TEST_USER / MYSQL_TEST_PASSWORD
 * 账号需要有 lab_match_test_* 库范围内的权限（建库、建表、DROP 测试库）。
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const path = require('path')
const { spawnSync } = require('child_process')

const BACKEND_DIR = path.join(__dirname, '..')
const TEST_DB_PATTERN = /^lab_match_test_[a-z0-9_]+$/

const connection = {
  host: process.env.MYSQL_TEST_HOST || process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_TEST_PORT || process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_TEST_USER || process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_TEST_PASSWORD !== undefined
    ? process.env.MYSQL_TEST_PASSWORD
    : (process.env.MYSQL_PASSWORD || '')
}

const stamp = Date.now().toString(36).slice(-6)
const created = []
let pass = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1
    console.log(`  PASS  ${name}`)
  } else {
    failures.push(`${name}${detail ? ` | ${detail}` : ''}`)
    console.log(`  FAIL  ${name}${detail ? ` | ${detail}` : ''}`)
  }
}

function assertTestDatabase(name) {
  if (!TEST_DB_PATTERN.test(name)) throw new Error(`拒绝操作非测试库：${name}`)
  const configured = process.env.MYSQL_DATABASE || 'lab_match'
  if (name === configured || name === 'lab_match') throw new Error(`拒绝操作业务库：${name}`)
}

function testDatabaseName(label) {
  const name = `lab_match_test_${label}_${stamp}`
  assertTestDatabase(name)
  return name
}

let mysql = null

async function adminQuery(sql, params = []) {
  const [rows] = await mysql.query(sql, params)
  return rows
}

async function createEmptyDatabase(name) {
  assertTestDatabase(name)
  await adminQuery(`CREATE DATABASE \`${name}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  created.push(name)
}

async function dropDatabase(name) {
  assertTestDatabase(name)
  await adminQuery(`DROP DATABASE IF EXISTS \`${name}\``)
}

async function dropCreatedDatabases() {
  // 兜底：把本次运行 stamp 后缀的测试库全部找出来，避免初始化中途失败留下残库
  try {
    const leftovers = await adminQuery(
      'SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE ?',
      [`lab\_match\_test\_%\_${stamp}`]
    )
    leftovers.forEach((row) => created.push(row.name))
  } catch { /* 连接已关闭时忽略 */ }
  const unique = [...new Set(created)].reverse()
  for (const name of unique) {
    try {
      await dropDatabase(name)
    } catch (error) {
      console.log(`  提示  清理测试库 ${name} 失败：${error.message}`)
    }
  }
}

/** 用真实 CLI 入口跑一次初始化，返回退出码与完整输出 */
function runInit(database, extraEnv = {}) {
  const run = spawnSync(process.execPath, ['scripts/db.js', 'init'], {
    cwd: BACKEND_DIR,
    encoding: 'utf8',
    env: {
      ...process.env,
      DB_DRIVER: 'mysql',
      MYSQL_HOST: connection.host,
      MYSQL_PORT: String(connection.port),
      MYSQL_USER: connection.user,
      MYSQL_PASSWORD: connection.password,
      MYSQL_DATABASE: database,
      ...extraEnv
    },
    timeout: 5 * 60 * 1000
  })
  return {
    code: run.status,
    output: `${run.stdout || ''}${run.stderr || ''}`
  }
}

async function tableNames(database) {
  const rows = await adminQuery(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
    [database]
  )
  return rows.map((row) => row.name)
}

async function databaseExists(database) {
  const rows = await adminQuery(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [database]
  )
  return rows.length > 0
}

function extractCount(output, pattern) {
  const matched = output.match(pattern)
  return matched ? Number(matched[1]) : null
}

async function main() {
  const internal = require('../data/mysql').__internals
  const requiredTables = internal.REQUIRED_TABLES
  const schemaSql = require('fs').readFileSync(path.join(BACKEND_DIR, '..', 'database', 'schema.sql'), 'utf8')
  const schemaStatements = internal.splitSqlStatements(schemaSql)
    .filter((statement) => !/^(USE|CREATE\s+DATABASE)\b/i.test(statement)).length

  try {
    mysql = await require('mysql2/promise').createConnection({ ...connection })
    await mysql.query('SELECT 1')
  } catch (error) {
    console.log(`\n[db-init] 跳过：无法连接 MySQL（${connection.user}@${connection.host}:${connection.port}）`)
    console.log(`[db-init] 原因：${error.code || error.message}`)
    console.log('[db-init] 如需运行，请设置 MYSQL_TEST_HOST / MYSQL_TEST_PORT / MYSQL_TEST_USER / MYSQL_TEST_PASSWORD')
    return 'skipped'
  }

  try {
    // ---------------- 场景 1：数据库不存在 ----------------
    console.log('\n== 1. 数据库不存在 → 建库 + 完整建表 ==')
    const fresh = testDatabaseName('created')
    check('测试库名符合隔离约定', TEST_DB_PATTERN.test(fresh), fresh)
    const first = runInit(fresh)
    if (first.code === 0) created.push(fresh)
    check('初始化成功退出', first.code === 0, first.output.slice(-300))
    check('提示「已新建数据库」', /已新建/.test(first.output), first.output.split('\n')[0])
    const freshTables = await tableNames(fresh)
    check(`建表齐全（${requiredTables.length} 张业务表）`, requiredTables.every((t) => freshTables.includes(t)),
      `实际 ${freshTables.length} 张`)
    check('schema 建表语句条数正确', extractCount(first.output, /schema\.sql 执行 (\d+) 条语句/) === schemaStatements,
      `期望 ${schemaStatements}（已扣除 CREATE DATABASE / USE）`)

    // ---------------- 场景 3：已有完整表结构 → 增量迁移 ----------------
    console.log('\n== 2. 已有完整表结构 → 只执行增量迁移 ==')
    const second = runInit(fresh)
    check('第二次初始化成功退出', second.code === 0, second.output.slice(-300))
    check('提示「只执行了增量迁移」', /只执行了增量迁移/.test(second.output), second.output.split('\n')[1])
    check('明确标注未执行 DROP', /未执行任何 DROP/.test(second.output), second.output.split('\n')[1])
    check('表数量未变化', (await tableNames(fresh)).length === freshTables.length)

    // ---------------- 场景 2：库存在但没有任何表 ----------------
    console.log('\n== 3. 库存在但没有任何表 → 执行完整建表 ==')
    const emptyDb = testDatabaseName('empty')
    await createEmptyDatabase(emptyDb)
    check('空库创建成功', await databaseExists(emptyDb))
    check('空库内表数为 0', (await tableNames(emptyDb)).length === 0)
    const emptyRun = runInit(emptyDb)
    check('初始化成功退出', emptyRun.code === 0, emptyRun.output.slice(-300))
    check('提示「按首次建表」', /首次建表/.test(emptyRun.output), emptyRun.output.split('\n')[1])
    const emptyTables = await tableNames(emptyDb)
    check('空库已补齐全部业务表', requiredTables.every((t) => emptyTables.includes(t)), `实际 ${emptyTables.length} 张`)

    // ---------------- 场景 4：已有业务数据 → 不丢数据 ----------------
    console.log('\n== 4. 已有业务数据连续初始化 → 不丢数据 ==')
    await adminQuery(`CREATE TABLE \`${emptyDb}\`.keep_me (id INT PRIMARY KEY, note VARCHAR(32))`)
    await adminQuery(`INSERT INTO \`${emptyDb}\`.keep_me VALUES (1, 'non-system')`)
    await adminQuery(`INSERT INTO \`${emptyDb}\`.users (id, username, password_hash, real_name, role)
      VALUES (9001, 'db_init_probe', 'x', '初始化测试', 'STUDENT')`)
    await adminQuery(`INSERT INTO \`${emptyDb}\`.laboratories (id, name, recruitment_quota) VALUES (9001, '测试实训室', 3)`)
    await adminQuery(`INSERT INTO \`${emptyDb}\`.recruitment_batches (id, batch_name, academic_year, status)
      VALUES (9001, '测试批次', '2026-2027', 'IN_PROGRESS')`)
    await adminQuery(`INSERT INTO \`${emptyDb}\`.student_preferences
      (id, batch_id, student_id, laboratory_id, obey_internal_adjustment, obey_college_adjustment, status, \`round\`)
      VALUES (9001, 9001, 9001, 9001, 1, 1, 'SUBMITTED', 1)`)

    const third = runInit(emptyDb)
    const fourth = runInit(emptyDb)
    check('带数据初始化成功（第一次）', third.code === 0, third.output.slice(-300))
    check('重复初始化成功（第二次）', fourth.code === 0, fourth.output.slice(-300))
    check('两次都判定为增量迁移', /只执行了增量迁移/.test(third.output) && /只执行了增量迁移/.test(fourth.output))
    const userRows = await adminQuery(`SELECT COUNT(*) AS n FROM \`${emptyDb}\`.users WHERE id = 9001`)
    check('业务数据未丢失（users）', Number(userRows[0].n) === 1, `实际 ${userRows[0].n}`)
    const prefRows = await adminQuery(`SELECT COUNT(*) AS n FROM \`${emptyDb}\`.student_preferences WHERE id = 9001`)
    check('业务数据未丢失（student_preferences）', Number(prefRows[0].n) === 1, `实际 ${prefRows[0].n}`)
    const keepRows = await adminQuery(`SELECT COUNT(*) AS n FROM \`${emptyDb}\`.keep_me`)
    check('非本系统的表未被删除', Number(keepRows[0].n) === 1)
    check('表总数 = 业务表 + 1 张自建表', (await tableNames(emptyDb)).length === emptyTables.length + 1)

    // ---------------- 场景 5：结构不完整 → 明确报错 ----------------
    console.log('\n== 5. 库存在但结构不完整 → 明确报错、不做破坏性补齐 ==')
    const partialDb = testDatabaseName('partial')
    await createEmptyDatabase(partialDb)
    await adminQuery(`CREATE TABLE \`${partialDb}\`.users (id BIGINT UNSIGNED PRIMARY KEY, username VARCHAR(64))`)
    await adminQuery(`INSERT INTO \`${partialDb}\`.users VALUES (1, 'half_initialized')`)
    const partialRun = runInit(partialDb)
    check('初始化以非 0 退出', partialRun.code !== 0, `exit=${partialRun.code}`)
    check('错误信息指出缺少基础表', /缺少基础表/.test(partialRun.output), partialRun.output.split('\n').slice(-6).join(' / '))
    check('错误信息给出处置建议', /DROP DATABASE|备份恢复/.test(partialRun.output))
    check('已有表未被删除', (await tableNames(partialDb)).includes('users'))
    const halfRows = await adminQuery(`SELECT COUNT(*) AS n FROM \`${partialDb}\`.users`)
    check('已有数据未被删除', Number(halfRows[0].n) === 1)
    check('表数量保持 1 张（未静默补建）', (await tableNames(partialDb)).length === 1)

    // ---------------- 场景 6：迁移遇到真实数据错误 ----------------
    console.log('\n== 6. 迁移遇到真实数据错误 → 准确定位且不吞错 ==')
    const brokenDb = testDatabaseName('broken')
    const setup = runInit(brokenDb)
    if (setup.code === 0) created.push(brokenDb)
    check('前置：完整初始化成功', setup.code === 0, setup.output.slice(-200))
    await adminQuery(`ALTER TABLE \`${brokenDb}\`.recruitment_batches MODIFY COLUMN status VARCHAR(32) NULL DEFAULT NULL`)
    await adminQuery(`INSERT INTO \`${brokenDb}\`.recruitment_batches (id, batch_name, academic_year, status)
      VALUES (9002, '脏数据批次', '2026-2027', NULL)`)
    const brokenRun = runInit(brokenDb)
    check('初始化以非 0 退出', brokenRun.code !== 0, `exit=${brokenRun.code}`)
    check('错误定位到具体迁移文件', /migration_v6\.sql/.test(brokenRun.output), brokenRun.output.split('\n').slice(-5).join(' / '))
    check('错误带 MySQL 错误码', /MySQL: [A-Z_]+ \(\d+\)/.test(brokenRun.output), brokenRun.output.split('\n').filter((l) => l.includes('MySQL:')).join(' / '))
    check('错误未被静默忽略（没有「初始化完成」）', !/初始化完成/.test(brokenRun.output))
    const dirtyRows = await adminQuery(`SELECT COUNT(*) AS n FROM \`${brokenDb}\`.recruitment_batches WHERE id = 9002`)
    check('出错前的数据保持原样', Number(dirtyRows[0].n) === 1)
    check('表结构未被破坏（仍 37 张）', (await tableNames(brokenDb)).length === requiredTables.length,
      `实际 ${(await tableNames(brokenDb)).length} 张`)
  } finally {
    await dropCreatedDatabases()
    await mysql.end()
  }
  return 'done'
}

main()
  .then((status) => {
    if (status === 'skipped') {
      console.log('\n===== 数据库初始化验收结果：跳过（无可用 MySQL） =====')
      process.exit(0)
    }
    console.log(`\n===== 数据库初始化验收结果：通过 ${pass}，失败 ${failures.length} =====`)
    if (failures.length) {
      failures.forEach((item) => console.log('  FAILED:', item))
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n[db-init] 验收执行异常：', error.message)
    process.exit(1)
  })
