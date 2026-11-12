const bcrypt = require('bcryptjs')

async function hashPassword(raw) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(raw, salt)
}

async function comparePassword(raw, hashed) {
  try {
    return await bcrypt.compare(raw, hashed)
  } catch {
    return false
  }
}

// 简单 JWT 封装
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'lab-match-dev-secret-please-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function verify(token) {
  return jwt.verify(token, JWT_SECRET)
}

module.exports = { hashPassword, comparePassword, sign, verify }
