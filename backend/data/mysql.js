// =====================================================================
// MySQL 生产数据源适配层
// ---------------------------------------------------------------------
// 设计要点：
//   1. DB_DRIVER=mysql 时启用；未显式配置时仍使用 JSON 文件存储（默认演示模式）
//   2. 启动时从 MySQL 全量加载为内存 Store，路由层代码无需改动
//   3. 每次 persistStore 在单个事务内把内存 Store 同步回 MySQL
//      （按表 upsert + 清理已删除行，关闭外键检查以保证整表一致性）
//   4. 表结构与 Data 字段自动映射：snake_case <-> camelCase，
//      未在表中建列的附加字段统一写入 extra_json，避免数据丢失
//   5. 表不存在时给出明确提示，需先执行 npm run db:init
// =====================================================================

const fs = require('fs')
const path = require('path')

let pool = null

function enabled() {
  return (process.env.DB_DRIVER || '').toLowerCase() === 'mysql'
}

/** 集合名 -> 表名（未列出的按 camelCase 自动转 snake_case） */
const COLLECTION_TABLES = {
  users: 'users',
  laboratories: 'laboratories',
  recruitmentBatches: 'recruitment_batches',
  recruitmentStages: 'recruitment_stages',
  recruitmentRounds: 'recruitment_rounds',
  studentPreferences: 'student_preferences',
  interviews: 'interviews',
  interviewParticipants: 'interview_participants',
  interviewMessages: 'interview_messages',
  interviewAttendance: 'interview_attendance',
  interviewWebhookEvents: 'interview_webhook_events',
  interviewRecordings: 'interview_recordings',
  interviewRecordingConsents: 'interview_recording_consents',
  interviewAiJobs: 'interview_ai_jobs',
  interviewAiConsents: 'interview_ai_consents',
  interviewAiVersions: 'interview_ai_versions',
  interviewScorePolicies: 'interview_score_policies',
  interviewEvaluations: 'interview_evaluations',
  admissionIntentions: 'admission_intentions',
  adjustments: 'adjustments',
  finalAdmissions: 'final_admissions',
  operationLogs: 'operation_logs',
  announcements: 'announcements',
  mediaVideos: 'media_videos',
  mediaPanoramas: 'media_panoramas',
  notices: 'notices',
  openDaySchedules: 'open_day_schedules',
  publicationObjections: 'publication_objections',
  labTeachers: 'lab_teachers',
  labYearlyPlans: 'lab_yearly_plans',
  teacherYearlyQuotas: 'teacher_yearly_quotas',
  labPromotionFiles: 'lab_promotion_files',
  applicationResumes: 'application_resumes',
  recruitmentReviews: 'recruitment_reviews',
  publication: 'publication',
  finalReview: 'final_reviews'
}

/** 单例集合（不是数组） */
const SINGLETON_COLLECTIONS = new Set(['publication', 'finalReview'])

const SKIP_COLUMNS = new Set(['extra_json'])

/** 初始化结束后必须存在的表：后端集合映射 + 志愿提交记录表（v4 建表，未纳入集合映射） */
const REQUIRED_TABLES = [...new Set([...Object.values(COLLECTION_TABLES), 'student_preference_submissions'])]

/**
 * 迁移过程中允许忽略的错误：只涵盖「对象已存在」这类可重复执行产生的噪音。
 * 注意：ER_DUP_ENTRY（1062，数据重复）、ER_NO_SUCH_TABLE（1146，表缺失）等一律抛出，
 * 不能为了让脚本跑完而吞掉真正的迁移问题。
 */
const IGNORABLE_MIGRATION_CODES = new Set([
  'ER_DUP_FIELDNAME',      // 列已存在
  'ER_DUP_KEYNAME',        // 索引已存在
  'ER_FK_DUP_NAME',        // 外键名已存在
  'ER_TABLE_EXISTS_ERROR'  // 表已存在
])

/** 数据库名只允许字母、数字、下划线（用于拼接标识符，防止注入） */
const DB_NAME_PATTERN = /^[A-Za-z0-9_]+$/

function snakeToCamel(key) {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function camelToSnake(key) {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function parseExtra(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 数据库行 -> Store 记录 */
function rowToRecord(row, columns, typeMap = {}) {
  const record = {}
  columns.forEach((col) => {
    if (SKIP_COLUMNS.has(col)) return
    let value = row[col]
    const key = col === 'read_flag' ? 'read' : snakeToCamel(col)
    if (typeMap[col] === 'json' && typeof value === 'string') {
      try { value = JSON.parse(value) } catch { /* 保持原值 */ }
    }
    if (value instanceof Date) record[key] = value.toISOString()
    else if (value !== null && typeof value === 'object') record[key] = value
    else if (col === 'obey_internal_adjustment' || col === 'obey_college_adjustment' || col === 'read_flag') record[key] = !!value
    else record[key] = value
  })
  return { ...record, ...parseExtra(row.extra_json) }
}

/** Store 记录 -> 数据库行（未知字段进入 extra_json） */
function recordToRow(record, columns) {
  const row = {}
  const extra = {}
  Object.entries(record || {}).forEach(([key, value]) => {
    const col = key === 'read' && columns.includes('read_flag') ? 'read_flag' : camelToSnake(key)
    if (columns.includes(col) && !SKIP_COLUMNS.has(col)) {
      if (value !== null && typeof value === 'object') row[col] = JSON.stringify(value)
      else if (typeof value === 'boolean') row[col] = value ? 1 : 0
      else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        // ISO 时间转 MySQL DATETIME
        row[col] = value.replace('T', ' ').slice(0, 19)
      } else row[col] = value
    } else if (value !== undefined) {
      extra[key] = value
    }
  })
  if (columns.includes('open_date') && !row.open_date && row.date) row.open_date = row.date
  if (columns.includes('extra_json') && Object.keys(extra).length) {
    row.extra_json = JSON.stringify(extra)
  }
  return row
}

/** 连接参数（运行期与初始化共用同一套环境变量） */
function dbConfig() {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'lab_match'
  }
}

function getPool() {
  if (pool) return pool
  const mysql = require('mysql2/promise')
  const { host, port, user, password, database } = dbConfig()
  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 5),
    charset: 'utf8mb4',
    timezone: 'Z'
  })
  return pool
}

async function getTableSchema(table, conn) {
  const executor = conn || getPool()
  const [rows] = await executor.query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [process.env.MYSQL_DATABASE || 'lab_match', table]
  )
  const columns = rows.map((r) => r.COLUMN_NAME || r.column_name)
  const typeMap = {}
  rows.forEach((r) => {
    typeMap[r.COLUMN_NAME || r.column_name] = (r.DATA_TYPE || r.data_type || '').toLowerCase()
  })
  return { columns, typeMap }
}

async function getTableColumns(table, conn) {
  return (await getTableSchema(table, conn)).columns
}

async function tableExists(table, conn) {
  const columns = await getTableColumns(table, conn)
  return columns.length > 0
}

/** 从 MySQL 读取完整 Store；表为空时返回 null（由调用方初始化种子） */
async function loadStore() {
  const conn = await getPool().getConnection()
  try {
    const store = {}
    let total = 0
    for (const [collection, table] of Object.entries(COLLECTION_TABLES)) {
      const { columns, typeMap } = await getTableSchema(table, conn)
      if (!columns.length) {
        throw new Error(`[mysql] 缺少数据表 ${table}，请先执行 npm run db:init 初始化数据库`)
      }
      const [rows] = await conn.query(`SELECT * FROM \`${table}\``)
      const records = rows.map((row) => rowToRecord(row, columns, typeMap))
      total += records.length
      if (SINGLETON_COLLECTIONS.has(collection)) store[collection] = records[0] || null
      else store[collection] = records
    }
    if (total === 0) return null
    return store
  } finally {
    conn.release()
  }
}

/**
 * 把内存 Store 全量同步到 MySQL（事务内完成，失败整体回滚）
 * 说明：学院规模数据量有限，采用整表同步换取实现简单与强一致性；
 *       后续如需支撑更大数据量，可在此函数内替换为增量同步。
 */
async function saveStore(store, submission) {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    if (submission) {
      await conn.execute(
        'INSERT INTO student_preference_submissions (batch_id, student_id, submitted_at) VALUES (?, ?, ?)',
        [submission.batchId, submission.studentId, new Date(submission.submittedAt)]
      )
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const [collection, table] of Object.entries(COLLECTION_TABLES)) {
      const columns = await getTableColumns(table, conn)
      if (!columns.length) {
        throw new Error(`[mysql] 缺少数据表 ${table}，请先执行 npm run db:init 初始化数据库`)
      }
      const value = store[collection]
      const records = SINGLETON_COLLECTIONS.has(collection)
        ? (value ? [value] : [])
        : (Array.isArray(value) ? value : [])
      await conn.query(`DELETE FROM \`${table}\``)
      for (const record of records) {
        const row = recordToRow(record, columns)
        if (!Object.keys(row).length) continue
        const keys = Object.keys(row)
        const placeholders = keys.map(() => '?').join(', ')
        await conn.query(
          `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${placeholders})`,
          keys.map((k) => row[k])
        )
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')
    await conn.commit()
  } catch (err) {
    try { await conn.query('SET FOREIGN_KEY_CHECKS = 1') } catch { /* ignore */ }
    try { await conn.rollback() } catch { /* ignore */ }
    throw err
  } finally {
    conn.release()
  }
}

// ---------------------------------------------------------------------
// 初始化辅助：SQL 解析、结构探测、错误包装
// ---------------------------------------------------------------------

function readDatabaseFile(name) {
  return fs.readFileSync(path.join(__dirname, '../../database', name), 'utf8')
}

/**
 * 按分号拆分 SQL，跳过字符串、反引号标识符和注释里的分号。
 * 本项目不使用 DELIMITER 与存储过程，常规语句即可覆盖 schema 与全部迁移。
 */
function splitSqlStatements(sqlText) {
  const statements = []
  let current = ''
  let index = 0
  const flush = () => {
    const text = current.trim()
    if (text) statements.push(text)
    current = ''
  }
  while (index < sqlText.length) {
    const char = sqlText[index]
    const next = sqlText[index + 1]
    // -- 行注释（MySQL 要求 -- 后跟空白）
    if (char === '-' && next === '-' && (index + 2 >= sqlText.length || /\s/.test(sqlText[index + 2]))) {
      while (index < sqlText.length && sqlText[index] !== '\n') index += 1
      current += '\n'
      continue
    }
    // # 行注释
    if (char === '#') {
      while (index < sqlText.length && sqlText[index] !== '\n') index += 1
      continue
    }
    // /* */ 块注释
    if (char === '/' && next === '*') {
      const end = sqlText.indexOf('*/', index + 2)
      index = end === -1 ? sqlText.length : end + 2
      current += ' '
      continue
    }
    // 字符串与反引号标识符
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      current += char
      index += 1
      while (index < sqlText.length) {
        const inner = sqlText[index]
        if (inner === '\\' && quote !== '`') {
          current += inner + (sqlText[index + 1] || '')
          index += 2
          continue
        }
        if (inner === quote) {
          if (sqlText[index + 1] === quote) {
            current += inner + inner
            index += 2
            continue
          }
          current += inner
          index += 1
          break
        }
        current += inner
        index += 1
      }
      continue
    }
    if (char === ';') {
      flush()
      index += 1
      continue
    }
    current += char
    index += 1
  }
  flush()
  return statements
}

/** 解析 SQL 文本里真正建表的表名（已剔除注释） */
function createTableNames(sqlText) {
  const names = []
  for (const statement of splitSqlStatements(sqlText)) {
    const match = statement.match(/^CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([A-Za-z0-9_]+)`?/i)
    if (match) names.push(match[1])
  }
  return names
}

/** 迁移文件按版本升序；编号必须从 v2 起连续，避免漏跑 */
function migrationFileList() {
  const dir = path.join(__dirname, '../../database')
  const listed = fs.readdirSync(dir)
    .map((file) => {
      const matched = file.match(/^migration_v(\d+)\.sql$/)
      return { file, version: matched ? Number(matched[1]) : NaN }
    })
    .filter((item) => Number.isFinite(item.version))
    .sort((a, b) => a.version - b.version)
  if (!listed.length) throw new Error('database/ 目录下没有找到 migration_v*.sql')
  const expected = listed.map((_, index) => index + 2)
  if (listed.some((item, index) => item.version !== expected[index])) {
    throw new Error(`迁移文件编号不连续：期望 ${expected.map((v) => `v${v}`).join(',')}，实际 ${listed.map((item) => `v${item.version}`).join(',')}`)
  }
  return listed
}

/** 当前库的业务表（BASE TABLE）清单 */
async function listBaseTables(conn, database) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS tableName FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`,
    [database]
  )
  return rows.map((row) => row.tableName || row.TABLE_NAME)
}

/**
 * 表的索引名清单。表不存在时返回空数组（information_schema 不会像 SHOW INDEX 那样报 1146），
 * 这正是空库初始化失败的直接原因所在。
 */
async function listIndexNames(conn, database, table) {
  const [rows] = await conn.query(
    `SELECT DISTINCT INDEX_NAME AS indexName FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, table]
  )
  return rows.map((row) => row.indexName || row.INDEX_NAME)
}

function statementPreview(statement, limit = 160) {
  const compact = String(statement).replace(/\s+/g, ' ').trim()
  return compact.length > limit ? `${compact.slice(0, limit)} …` : compact
}

/** 把失败语句包装成可定位的错误：文件 + 第几条 + SQL 片段 + MySQL 错误码 */
function buildStatementError({ file, index, total, statement, error, executedBefore = 0 }) {
  const lines = [
    `${file} 第 ${index + 1}/${total} 条语句执行失败`,
    `  SQL: ${statementPreview(statement)}`,
    `  MySQL: ${error.code || 'UNKNOWN'}${error.errno ? ` (${error.errno})` : ''} ${error.sqlMessage || error.message}`
  ]
  if (executedBefore > 0) {
    lines.push(`  本次已成功执行 ${executedBefore} 条语句；DDL 不可回滚，请据此判断是否需要从备份恢复`)
  }
  const wrapped = new Error(lines.join('\n'))
  wrapped.dbInit = {
    file,
    index,
    total,
    statement: statementPreview(statement, 400),
    code: error.code,
    errno: error.errno,
    executedBefore
  }
  return wrapped
}

async function createDatabase(conn, database) {
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } catch (error) {
    if (!['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code)) throw error
    const account = process.env.MYSQL_USER || 'root'
    const accountHost = process.env.MYSQL_HOST || '127.0.0.1'
    const wrapped = new Error([
      `创建数据库 ${database} 失败：账号 ${account} 没有建库权限`,
      '请让 DBA 执行下面两句（只需一次），然后重跑 npm run db:init：',
      `  CREATE DATABASE \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
      `  GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${account}'@'${accountHost}';`,
      '应用账号只需该库范围内的权限，不需要任何全局权限或 SUPER。'
    ].join('\n'))
    wrapped.cause = error
    throw wrapped
  }
}

/** 执行完整建表脚本（仅在库内没有任何本系统表时调用） */
async function applySchema(conn, schemaSql, log) {
  const statements = splitSqlStatements(schemaSql)
    .filter((statement) => !/^(USE|CREATE\s+DATABASE)\b/i.test(statement))
  if (statements.some((statement) => /^DROP\s+DATABASE\b/i.test(statement))) {
    throw new Error('schema.sql 中出现 DROP DATABASE，初始化已中止（本工具不会删除数据库）')
  }
  let executed = 0
  for (let index = 0; index < statements.length; index += 1) {
    try {
      await conn.query(statements[index])
      executed += 1
    } catch (error) {
      throw buildStatementError({ file: 'schema.sql', index, total: statements.length, statement: statements[index], error, executedBefore: executed })
    }
  }
  log(`已执行完整建表脚本 schema.sql（${executed} 条语句）`)
  return executed
}

/**
 * 历史遗留唯一键的跳过规则（保持既有迁移顺序语义）：
 * 数据库一旦升级到「带轮次/次数」的唯一键，再补建旧的三列/四列唯一键会与历史多轮数据冲突，
 * 旧键在 v12/v13/v14 中本来就会被删除，因此直接跳过而不是让 DDL 报 1062。
 */
function shouldSkipLegacyIndex(statement, indexState) {
  if (/ADD\s+UNIQUE\s+KEY\s+`?uk_interview_batch_student_lab`?/i.test(statement)) {
    return indexState.interviews.some((name) => name === 'uk_interview_attempt' || name === 'uk_interview_round_attempt')
  }
  if (/ADD\s+UNIQUE\s+KEY\s+`?uk_interview_attempt`?/i.test(statement)) {
    return indexState.interviews.includes('uk_interview_round_attempt')
  }
  if (/ADD\s+UNIQUE\s+KEY\s+`?uk_intend_batch_student_lab`?/i.test(statement)) {
    return indexState.admissionIntentions.includes('uk_intend_round')
  }
  return false
}

/** 按 v2 → vN 顺序逐条执行增量迁移；只忽略「对象已存在」，数据类错误一律抛出 */
async function applyMigrations(conn, migrations, indexState) {
  let executed = 0
  let skipped = 0
  for (const migration of migrations) {
    const statements = splitSqlStatements(migration.sql)
      .filter((statement) => !/^USE\b/i.test(statement))
    for (let index = 0; index < statements.length; index += 1) {
      const statement = statements[index]
      if (shouldSkipLegacyIndex(statement, indexState)) {
        skipped += 1
        continue
      }
      try {
        await conn.query(statement)
        executed += 1
      } catch (error) {
        if (IGNORABLE_MIGRATION_CODES.has(error.code)) {
          skipped += 1
          continue
        }
        throw buildStatementError({
          file: migration.file,
          index,
          total: statements.length,
          statement,
          error,
          executedBefore: executed
        })
      }
    }
  }
  return { executed, skipped }
}

/**
 * 初始化数据库（npm run db:init）：建库 → 建表 → 增量迁移
 *
 * 三种互斥判定（依据 information_schema 的实际表，而不是「库是否存在」）：
 *   1. 数据库不存在                → 建库 + 执行完整 schema.sql
 *   2. 库存在但本系统表 0 张        → 执行完整 schema.sql（库内没有可丢的业务数据）
 *   3. 库存在且已有本系统表         → 只按 v2..vN 顺序执行增量迁移，绝不执行 schema.sql
 *
 * 安全边界：不 DROP DATABASE；只有「本系统表 0 张」时才执行含 DROP TABLE 的 schema.sql；
 *           已有业务表时若缺基础表，直接报错退出，不做任何破坏性补齐。
 */
async function initDatabase(options = {}) {
  const mysql = require('mysql2/promise')
  const log = typeof options.log === 'function' ? options.log : () => {}
  const { host, port, user, password, database } = dbConfig()
  if (!DB_NAME_PATTERN.test(database)) throw new Error('MYSQL_DATABASE 只能包含字母、数字和下划线')

  const schemaSql = readDatabaseFile('schema.sql')
  const schemaTables = createTableNames(schemaSql)
  if (!schemaTables.length) throw new Error('schema.sql 中没有解析到 CREATE TABLE 语句，初始化已中止')

  const migrations = migrationFileList().map((item) => ({ ...item, sql: readDatabaseFile(item.file) }))
  const knownTables = new Set([...schemaTables, ...migrations.flatMap((item) => createTableNames(item.sql))])

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    charset: 'utf8mb4'
  })

  const result = {
    database,
    endpoint: `${host}:${port}`,
    mode: '',
    createdDatabase: false,
    tablesBefore: 0,
    systemTablesBefore: 0,
    schemaStatements: 0,
    migrationFiles: migrations.map((item) => item.file),
    migrationStatements: 0,
    skippedStatements: 0,
    tablesAfter: 0,
    tables: []
  }

  try {
    const [schemaRows] = await conn.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [database]
    )
    const databaseExists = schemaRows.length > 0
    let existingTables = []
    if (databaseExists) {
      await conn.query(`USE \`${database}\``)
      existingTables = await listBaseTables(conn, database)
    }
    const existingSystemTables = existingTables.filter((table) => knownTables.has(table))
    result.tablesBefore = existingTables.length
    result.systemTablesBefore = existingSystemTables.length

    if (!databaseExists) {
      result.mode = 'created'
      await createDatabase(conn, database)
      result.createdDatabase = true
      await conn.query(`USE \`${database}\``)
      log(`数据库 ${database} 不存在，已新建`)
    } else if (existingSystemTables.length === 0) {
      result.mode = 'schema'
      log(`数据库 ${database} 已存在但没有本系统业务表，按首次建表处理`)
    } else {
      result.mode = 'migrate'
      log(`数据库 ${database} 已存在且已有 ${existingSystemTables.length} 张业务表，只执行增量迁移`)
    }

    if (result.mode !== 'migrate') {
      // 执行含 DROP TABLE 的脚本前再确认一次，防止判定与实际不符时误删
      const recheck = (await listBaseTables(conn, database)).filter((table) => knownTables.has(table))
      if (recheck.length) {
        throw new Error(`数据库中已存在本系统表（${recheck.join(', ')}），已中止执行完整建表脚本以避免误删数据`)
      }
      result.schemaStatements = await applySchema(conn, schemaSql, log)
    } else {
      const missingBase = schemaTables.filter((table) => !existingTables.includes(table))
      if (missingBase.length) {
        throw new Error([
          `数据库 ${database} 已存在但不完整：缺少基础表 ${missingBase.join(', ')}`,
          '为避免误删既有数据，本次不会执行含 DROP TABLE 的完整建表脚本，也没有自动替换或删除任何表。',
          '处理建议：',
          `  · 若该库可以丢弃：由 DBA 执行 DROP DATABASE \`${database}\`; 后重新运行 npm run db:init`,
          '  · 若需保留数据：从备份恢复，或人工补齐上述基础表后再执行'
        ].join('\n'))
      }
    }

    // 索引现状（information_schema 查询，表不存在时为空数组，不会抛 1146）
    const indexState = {
      interviews: await listIndexNames(conn, database, 'interviews'),
      admissionIntentions: await listIndexNames(conn, database, 'admission_intentions')
    }
    const applied = await applyMigrations(conn, migrations, indexState)
    result.migrationStatements = applied.executed
    result.skippedStatements = applied.skipped

    const after = await listBaseTables(conn, database)
    result.tablesAfter = after.length
    result.tables = after
    const missing = REQUIRED_TABLES.filter((table) => !after.includes(table))
    if (missing.length) {
      throw new Error(`初始化结束但缺少 ${missing.length} 张表：${missing.join(', ')}；请检查 schema.sql 与迁移是否被跳过`)
    }
    return result
  } finally {
    await conn.end()
  }
}

async function ping() {
  const [rows] = await getPool().query('SELECT 1 AS ok')
  return rows[0].ok === 1
}

async function close() {
  if (pool) {
    const p = pool
    pool = null
    await p.end().catch(() => undefined)
  }
}

module.exports = {
  enabled, loadStore, saveStore, initDatabase, ping, close,
  // 导出内部工具便于单元自检
  __internals: {
    snakeToCamel,
    camelToSnake,
    rowToRecord,
    recordToRow,
    getTableSchema,
    splitSqlStatements,
    createTableNames,
    migrationFileList,
    listBaseTables,
    listIndexNames,
    REQUIRED_TABLES,
    IGNORABLE_MIGRATION_CODES
  }
}
