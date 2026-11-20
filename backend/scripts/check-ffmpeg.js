#!/usr/bin/env node
/**
 * FFmpeg 音轨处理自检。
 *
 * 验证「录像 → 抽音频 → 切片为 16k 单声道 wav」这一环真实可用：
 * 用 FFmpeg 现造一段带音轨的 mp4，再调用生产代码 segmentAudio() 切片，
 * 最后校验产物确实是 16000 Hz 单声道 PCM。
 *
 * 用法：
 *   node scripts/check-ffmpeg.js
 *
 * 只写系统临时目录，结束后清理，不碰业务数据。
 */
require('dotenv').config()

const { spawn } = require('node:child_process')
const { mkdtemp, rm, readdir, readFile, stat } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')

const { segmentAudio } = require('../services/interviewAiProviders')

function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'ignore', windowsHide: true })
    child.once('error', reject)
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error('退出码 ' + code)))
  })
}

function fail(message) {
  console.log('✗ ' + message)
  process.exitCode = 1
}

async function main() {
  const ffmpeg = process.env.INTERVIEW_FFMPEG || 'ffmpeg'

  console.log('配置：')
  console.log('  executable ' + ffmpeg)
  try {
    await run(ffmpeg, ['-hide_banner', '-version'])
    console.log('  ✓ 可执行')
  } catch {
    fail('FFmpeg 无法执行，AI 纪要链路会在抽音频这一步中断')
    console.log('  处理：安装 ffmpeg 并确保在 PATH 中，或用 INTERVIEW_FFMPEG 指定绝对路径')
    return
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'labmatch-ffmpeg-'))
  const source = path.join(dir, 'source.mp4')
  try {
    console.log('\n1/3 生成带音轨的测试 mp4（8 秒正弦波）')
    await run(ffmpeg, ['-y', '-nostdin', '-v', 'error',
      '-f', 'lavfi', '-i', 'color=c=black:s=320x240:d=8',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
      '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', source])
    console.log('  ✓ ' + (await stat(source)).size + ' 字节')

    console.log('\n2/3 调用 segmentAudio() 抽取音轨并切片')
    const parts = await segmentAudio(source, dir, ffmpeg)
    console.log('  ✓ 产出 ' + parts.length + ' 个切片：' +
      parts.map((row) => path.basename(row.file) + '(' + row.start.toFixed(1) + '-' + row.end.toFixed(1) + 's)').join(', '))

    console.log('\n3/3 校验 wav 格式（要求 16000 Hz 单声道）')
    const wavs = (await readdir(dir)).filter((name) => /^part-\d{3}\.wav$/.test(name))
    if (!wavs.length) {
      fail('没有生成任何 wav 切片')
      return
    }
    let bad = 0
    for (const name of wavs) {
      const head = (await readFile(path.join(dir, name))).subarray(0, 44)
      if (head.subarray(0, 4).toString() !== 'RIFF' || head.subarray(8, 12).toString() !== 'WAVE') {
        console.log('  ✗ ' + name + ' 不是合法 RIFF/WAVE')
        bad += 1
        continue
      }
      const channels = head.readUInt16LE(22)
      const sampleRate = head.readUInt32LE(24)
      const bits = head.readUInt16LE(34)
      const okFormat = channels === 1 && sampleRate === 16000 && bits === 16
      console.log('  ' + (okFormat ? '✓' : '✗') + ' ' + name + '：' +
        sampleRate + ' Hz / ' + channels + ' 声道 / ' + bits + ' bit')
      if (!okFormat) bad += 1
    }
    if (bad) fail('有 ' + bad + ' 个切片格式不符合语音识别要求')
    else console.log('\n✓ 抽音频链路可用，产物格式符合 STT 输入要求')
  } catch (error) {
    fail('处理失败：' + (error.message || error))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

main()
