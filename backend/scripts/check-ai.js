#!/usr/bin/env node
/**
 * DeepSeek 纪要链路自检。
 *
 * 直接调用生产代码 services/interviewAiProviders.summarize()，用一份固定样例
 * 逐字稿走完整的「构造提示词 → 调 DeepSeek → 校验 JSON 结构 → 校验引用合法性」
 * 流程，确认 AI 纪要这段能真实产出，而不是只验证 HTTP 200。
 *
 * 用法：
 *   node scripts/check-ai.js
 *
 * 只读 backend/.env，不写数据库、不调用 STT、不碰业务数据。
 */
require('dotenv').config()

const providers = require('../services/interviewAiProviders')

// 样例逐字稿：id 与 segment 结构对齐 transcribe() 的输出
const SAMPLE = [
  [1, '我先做个自我介绍，软件工程专业大三，做过一个校园二手交易平台。'],
  [2, '那个平台后端用 Spring Boot，数据库 MySQL，前端 Vue3。'],
  [3, '注册用户大概两千多，日活三百人左右。'],
  [4, '遇到过什么问题吗？'],
  [5, '主要是图片上传的并发问题，一开始存本地磁盘，服务器磁盘很快就满了。'],
  [6, '后来怎么处理的？'],
  [7, '换成对象存储，前端直传，后端只发上传凭证，磁盘和带宽压力都降下来了。'],
  [8, '团队几个人，你负责哪部分？'],
  [9, '三个人，我负责后端接口和数据库设计。'],
  [10, '你对实训室的研究方向了解吗？'],
  [11, '看过介绍，主要是智能软件和数据方向，我对数据这块比较感兴趣。'],
  [12, '好的，今天先到这里，后续结果会在系统里通知。']
]

function fail(message) {
  console.log('✗ ' + message)
  process.exitCode = 1
}

function section(title, rows, render) {
  if (!rows.length) return
  console.log('\n' + title + '（' + rows.length + ' 条）')
  rows.forEach((row, index) => console.log('  ' + (index + 1) + '. ' + render(row) +
    '  [引用段落 ' + row.refs.join(',') + ']'))
}

async function main() {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    fail('缺少 DEEPSEEK_API_KEY，AI 纪要功能在未配置时是关闭状态')
    return
  }
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  const segments = SAMPLE.map(([id, text]) => ({ id, text, unclear: false }))

  console.log('配置：')
  console.log('  model      ' + model)
  console.log('  apiKey     已填（长度 ' + key.length + '）')
  console.log('  样例段落   ' + segments.length + ' 段，共 ' +
    segments.reduce((sum, row) => sum + row.text.length, 0) + ' 字')
  console.log('\n调用 summarize() ……')

  const started = Date.now()
  let result
  try {
    result = await providers.summarize(segments, { deepseekKey: key, model })
  } catch (error) {
    fail('调用失败：' + (error.name || '') + ' ' + (error.message || ''))
    return
  }
  const elapsed = Date.now() - started

  console.log('✓ 返回合法结构化纪要，耗时 ' + elapsed + ' ms')
  section('概览', result.overview, (row) => row.text)
  section('主题', result.topics, (row) => row.text)
  section('问答', result.questions, (row) => row.question + ' → ' + row.answer)
  section('项目经历', result.projects, (row) =>
    [row.name, row.stack && '技术栈:' + row.stack, row.role && '角色:' + row.role,
      row.outcome && '结果:' + row.outcome].filter(Boolean).join(' | '))
  section('待核实', result.verify, (row) => row.text)

  const ids = new Set(segments.map((row) => row.id))
  const badRefs = Object.values(result).flat()
    .flatMap((row) => row.refs)
    .filter((ref) => !ids.has(ref))
  if (badRefs.length) fail('存在非法引用：' + badRefs.join(','))
  else console.log('\n✓ 全部引用均指向样例段落，无编造段落')
}

main()
