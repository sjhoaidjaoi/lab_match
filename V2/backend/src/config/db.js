// 第二阶段接入 MySQL；骨架阶段不建立真实连接，避免启动即失败
export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'training_room_selection'
}

let pool = null
export async function getPool() {
  if (!pool) {
    const mysql = await import('mysql2/promise')
    pool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 10 })
  }
  return pool
}
