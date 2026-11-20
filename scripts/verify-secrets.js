#!/usr/bin/env node
/**
 * 密钥泄漏静态检查
 * 运行：node scripts/verify-secrets.js
 *
 * 检查两类风险：
 * 1. 被 Git 追踪的环境变量文件中存在真实的密钥赋值（模板文件除外）
 * 2. 源码中出现硬编码的密钥字面量（来自环境变量、示例占位、测试夹具的除外）
 *
 * 只做「明显泄漏」的兜底拦截，不替代专业的密钥扫描工具。
 * 通过 `git ls-files` 取文件列表，因此只检查会被提交的内容。
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const problems = []
const checked = { envFiles: 0, sourceFiles: 0 }

function trackedFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

// 视为「密钥」的键名
const SECRET_KEY = /((^|_)(SECRET|PASSWORD|PASSWD|TOKEN)|API_KEY|ACCESS_KEY_ID|SECRET_ACCESS_KEY|PRIVATE_KEY)/i
// 模板/占位值，不算泄漏
const PLACEHOLDER = /^(|your[-_.]?.*|xxx+|<.*>|change[-_.]?me|replace[-_.]?me|todo|example|placeholder|null|undefined|fixture[-_].*)$/i

function looksRealValue(raw) {
  const value = String(raw || '').trim().replace(/^["']|["']$/g, '')
  if (!value) return false
  if (PLACEHOLDER.test(value)) return false
  return value.length >= 12
}

function isTemplateEnv(name) {
  return /\.env\.(example|sample|template)$/i.test(name)
}

function parseEnvFile(text) {
  const found = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    const [, key, rest] = match
    if (!SECRET_KEY.test(key)) continue
    if (looksRealValue(rest)) found.push(key)
  }
  return found
}

const files = trackedFiles()

// ---- 1. 环境变量文件 ----
for (const file of files) {
  const base = path.basename(file)
  if (!/^\.env($|\.)/.test(base)) continue
  if (isTemplateEnv(file)) continue
  checked.envFiles += 1
  const absolute = path.join(ROOT, file)
  if (!fs.existsSync(absolute)) continue
  const leaked = parseEnvFile(fs.readFileSync(absolute, 'utf8'))
  if (leaked.length) {
    problems.push(`环境变量文件 ${file} 含真实密钥字段：${leaked.join(', ')}`)
  }
}

// ---- 2. 源码硬编码 ----
const SOURCE_EXT = /\.(js|cjs|mjs|ts|vue)$/i
const SKIP_DIR = /(^|\/)(node_modules|dist|dist-verify|target|uploads|\.git)\//
const SKIP_FILE = /(\.example|\.d\.ts)$/i
// 测试夹具里的假密钥不视为泄漏（真实密钥不会出现在测试中）
const TEST_DIR = /(^|\/)tests\//

for (const file of files) {
  if (!SOURCE_EXT.test(file)) continue
  if (SKIP_DIR.test(file) || SKIP_FILE.test(file)) continue
  if (TEST_DIR.test(file)) continue
  const absolute = path.join(ROOT, file)
  if (!fs.existsSync(absolute)) continue
  checked.sourceFiles += 1

  const lines = fs.readFileSync(absolute, 'utf8').split('\n')
  lines.forEach((line, index) => {
    // 从环境变量读取、或引用了 env 对象，属正常写法
    if (/process\.env|import\.meta\.env|req\.headers/.test(line)) return
    // 只认「键名本身像密钥」且「值不是全大写常量名」的赋值
    const match = line.match(/([A-Za-z0-9_$]+)\s*[:=]\s*(['"])([^'"]{12,})\2/)
    if (!match) return
    const [, key, , value] = match
    if (!SECRET_KEY.test(key)) return
    // 'CHANGE_PASSWORD'、'RESET_PASSWORD' 这类是枚举常量，不是密钥
    if (/^[A-Z][A-Z0-9_]*$/.test(value)) return
    if (!looksRealValue(value)) return
    problems.push(`${file}:${index + 1} 疑似硬编码密钥（${key}）`)
  })
}

console.log(`检查完成：环境变量文件 ${checked.envFiles} 个，源码文件 ${checked.sourceFiles} 个。`)
if (problems.length) {
  console.log('\n发现问题：')
  problems.forEach((p) => console.log(`  - ${p}`))
  console.log('\n请把密钥移入未被追踪的 .env，并轮换已泄漏的密钥。')
  process.exit(1)
}
console.log('未发现密钥泄漏。')
