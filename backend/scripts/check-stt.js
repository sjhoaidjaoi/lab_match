#!/usr/bin/env node
/**
 * 语音识别 + AI 纪要全链路自检。
 *
 * 走的是生产代码的完整路径：
 *   音频文件 → segmentAudio()(ffmpeg 抽 16k 单声道切片)
 *            → transcribe()  (OpenAI 兼容 STT)
 *            → summarize()   (DeepSeek 结构化纪要)
 *
 * 用法：
 *   node scripts/check-stt.js [音频文件]
 *   缺省读取 tools/selftest/speech.wav
 *
 * 只读 backend/.env，只写系统临时目录。
 */
require('dotenv').config()

const { mkdtemp, rm, access } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')

const providers = require('../services/interviewAiProviders')

function fail(message) {
  console.log('✗ ' + message)
  process.exitCode = 1
}

async function main() {
  const source = path.resolve(process.argv[2] || 'tools/selftest/speech.wav')
  const config = {
    sttUrl: process.env.INTERVIEW_STT_URL,
    sttKey: process.env.INTERVIEW_STT_API_KEY || undefined,
    sttModel: process.env.INTERVIEW_STT_MODEL || 'Systran/faster-whisper-large-v3',
    deepseekKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    ffmpeg: process.env.INTERVIEW_FFMPEG || 'ffmpeg'
  }

  try {
    await access(source)
  } catch {
    fail('找不到音频文件：' + source)
    return
  }
  console.log('配置：')
  console.log('  音频       ' + source)
  console.log('  STT 地址   ' + (config.sttUrl || '(未配置)'))
  console.log('  STT 模型   ' + config.sttModel)
  console.log('  纪要模型   ' + config.model)
  if (!config.sttUrl) {
    fail('缺少 INTERVIEW_STT_URL')
    return
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'labmatch-stt-'))
  try {
    console.log('\n1/3 抽取音轨并切片')
    const chunks = await providers.segmentAudio(source, dir, config.ffmpeg)
    console.log('  ✓ ' + chunks.length + ' 个切片，总时长 ' +
      chunks.reduce((sum, row) => sum + (row.end - row.start), 0).toFixed(1) + ' 秒')

    console.log('\n2/3 调用 transcribe()')
    const segments = []
    for (const chunk of chunks) {
      const started = Date.now()
      const rows = await providers.transcribe(chunk, config)
      const elapsed = Date.now() - started
      console.log('  ✓ 切片 ' + path.basename(chunk.file) + '：' + rows.length +
        ' 段，耗时 ' + elapsed + ' ms')
      for (const row of rows) {
        segments.push({ id: segments.length + 1, text: row.text, start: row.start, end: row.end, unclear: row.unclear })
      }
    }
    if (!segments.length) {
      fail('没有识别出任何文字（音频可能为静音或语言不匹配）')
      return
    }
    console.log('\n逐字稿（前 12 段）：')
    segments.slice(0, 12).forEach((row) => {
      console.log('  [' + (row.start / 1000).toFixed(1) + '-' + (row.end / 1000).toFixed(1) + 's] ' + row.text)
    })

    console.log('\n3/3 调用 summarize() 生成纪要')
    const started = Date.now()
    const result = await providers.summarize(segments, config)
    console.log('  ✓ 耗时 ' + (Date.now() - started) + ' ms')
    const print = (title, rows, render) => {
      if (!rows.length) return
      console.log('\n' + title + '（' + rows.length + '）')
      rows.forEach((row, index) => console.log('  ' + (index + 1) + '. ' + render(row) +
        '  [段落 ' + row.refs.join(',') + ']'))
    }
    print('概览', result.overview, (row) => row.text)
    print('主题', result.topics, (row) => row.text)
    print('问答', result.questions, (row) => row.question + ' → ' + row.answer)
    print('项目', result.projects, (row) => row.name)
    print('待核实', result.verify, (row) => row.text)
    console.log('\n✓ 全链路通过：音频 → 逐字稿 → 结构化纪要')
  } catch (error) {
    fail((error.name || '') + ' ' + (error.message || ''))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

main()
