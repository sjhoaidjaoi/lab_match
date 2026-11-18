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

function getPool() {
  if (pool) return pool
  const mysql = require('mysql2/promise')
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'lab_match',
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

/** 执行建表 + 迁移脚本（仅用于 npm run db:init） */
async function initDatabase() {
  const mysql = require('mysql2/promise')
  const database = process.env.MYSQL_DATABASE || 'lab_match'
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('MYSQL_DATABASE 只能包含字母、数字和下划线')
  const rootConn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  })
  try {
    const [dbRows] = await rootConn.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [database]
    )
    const schemaFile = path.join(__dirname, '../../database/schema.sql')
    const prerequisiteMigrations = ['migration_v2.sql', 'migration_v3.sql', 'migration_v6.sql', 'migration_v7.sql', 'migration_v8.sql', 'migration_v9.sql', 'migration_v10.sql', 'migration_v11.sql', 'migration_v12.sql', 'migration_v13.sql']
    const studentMigration = fs.readFileSync(path.join(__dirname, '../../database/migration_v4.sql'), 'utf8')
    const reviewMigration = fs.readFileSync(path.join(__dirname, '../../database/migration_v5.sql'), 'utf8')
    const created = !dbRows.length
    if (created) {
      // 全新数据库：直接执行完整建表脚本
      await rootConn.query(fs.readFileSync(schemaFile, 'utf8')
        .replace(/(CREATE DATABASE IF NOT EXISTS |^USE )lab_match\b/gm, (_match, prefix) => prefix + '`' + database + '`'))
    }
    // 已存在数据库：只执行增量迁移（schema.sql 中的 DROP 不得执行）
    await rootConn.query(`USE \`${database}\``)
    const [attemptIndexes] = await rootConn.query("SHOW INDEX FROM interviews WHERE Key_name = 'uk_interview_attempt'")
    const migrationSql = prerequisiteMigrations.map(file => fs.readFileSync(path.join(__dirname, '../../database', file), 'utf8')).join('\n')
    // 逐条执行，已存在的列/表/索引错误忽略，保证脚本可重复执行
    const statements = migrationSql.replace(/^\s*--[^\r\n]*/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !/^USE\s/i.test(s))
    for (const statement of statements) {
      if (attemptIndexes.length && /ADD UNIQUE KEY uk_interview_batch_student_lab\b/.test(statement)) continue
      try {
        await rootConn.query(statement)
      } catch (err) {
        if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_TABLE_EXISTS_ERROR'].includes(err.code)) throw err
      }
    }
    await rootConn.query(studentMigration)
    await rootConn.query(reviewMigration)
    return { created }
  } finally {
    await rootConn.end()
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
  __internals: { snakeToCamel, camelToSnake, rowToRecord, recordToRow, getTableSchema }
}
