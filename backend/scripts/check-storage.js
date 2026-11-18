#!/usr/bin/env node
/**
 * 对象存储连通性自检。
 *
 * 复刻 services/interviewRecording.js 的客户端构建方式，对配置的 S3 兼容存储
 * 做一次完整的 写入 → 读取 → 预签名下载 → 删除 往返验证。
 *
 * 用法：
 *   node scripts/check-storage.js
 *
 * 只读取 backend/.env，不改任何业务数据；结束时删除自己写入的探针文件。
 */
require('dotenv').config()

const { randomUUID } = require('node:crypto')
const {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const REQUIRED = ['S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']

function fail(message) {
  console.log('✗ ' + message)
  process.exitCode = 1
}

async function main() {
  const missing = REQUIRED.filter((key) => !process.env[key])
  if (missing.length) {
    fail('缺少必填环境变量：' + missing.join(', '))
    console.log('  这些值来自阿里云 OSS 控制台的 Bucket 与 RAM 子账号。')
    return
  }

  const endpoint = process.env.S3_ENDPOINT || undefined
  const region = process.env.S3_REGION
  const bucket = process.env.S3_BUCKET
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

  if (endpoint) {
    try {
      const url = new URL(endpoint)
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        fail('S3_ENDPOINT 不合法：必须是纯 https 地址，且不能带账号密码、查询串或锚点')
        return
      }
    } catch {
      fail('S3_ENDPOINT 无法解析为 URL：' + endpoint)
      return
    }
  }

  console.log('配置：')
  console.log('  endpoint      ' + (endpoint || '(AWS 默认)'))
  console.log('  region        ' + region)
  console.log('  bucket        ' + bucket)
  console.log('  pathStyle     ' + forcePathStyle)
  console.log('  accessKeyId   ' + process.env.S3_ACCESS_KEY_ID.slice(0, 4) + '……（长度 ' +
    process.env.S3_ACCESS_KEY_ID.length + '）')
  console.log('  secret        ' + '已填（长度 ' + process.env.S3_SECRET_ACCESS_KEY.length + '）')
  console.log('')

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  })

  console.log('1/5 检查 bucket 是否可访问')
  try {
    // 用 ListObjects 而不是 HeadBucket：HeadBucket 响应无 body，取不到 OSS 的错误码
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }))
    console.log('   ✓ bucket 存在且密钥有读取权限')
  } catch (error) {
    const meta = error.$metadata || {}
    fail('bucket 不可访问：' + (error.Code || error.name || '未知') + ' — ' + (error.message || ''))
    console.log('   状态码 ' + (meta.httpStatusCode || '-') + '，请求 ID ' + (meta.requestId || '-'))
    console.log('   按错误码对照：')
    console.log('     SecondLevelDomainForbidden → 该服务要求虚拟主机式寻址，S3_FORCE_PATH_STYLE 必须为 false')
    console.log('     AccessDenied / does not belong to you → RAM 子账号未授权，或桶属于另一个阿里云账号')
    console.log('     You have no right to access ... bucket acl → 策略已建但没挂到该用户，或 Resource 不匹配')
    console.log('     NoSuchBucket / InvalidBucketName → 桶名或 S3_REGION 与桶实际地域不符')
    return
  }

  const key = 'healthcheck/' + randomUUID() + '.txt'
  const body = 'lab-match storage probe ' + new Date().toISOString()

  console.log('2/5 写入探针对象 ' + key)
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: body, ContentType: 'text/plain'
    }))
    console.log('   ✓ 写入成功')
  } catch (error) {
    fail('   写入失败：' + (error.name || '') + ' ' + (error.message || ''))
    return
  }

  console.log('3/5 读回内容校验')
  let ok = false
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const text = await response.Body.transformToString()
    ok = text === body
    console.log(ok ? '   ✓ 读回内容一致' : '   ✗ 读回内容不一致')
  } catch (error) {
    fail('   读取失败：' + (error.name || '') + ' ' + (error.message || ''))
  }

  console.log('4/5 生成预签名下载链接（播放/下载走这条路径）')
  try {
    // 与生产代码 signAccess() 保持同一口径：S3_PRESIGN_MINIMAL=true 时不带 content-type 覆盖
    const minimal = process.env.S3_PRESIGN_MINIMAL === 'true'
    const url = await getSignedUrl(client, new GetObjectCommand({
      Bucket: bucket, Key: key,
      ...(minimal ? {} : { ResponseContentType: 'text/plain' })
    }), { expiresIn: 60 })
    const response = await fetch(url)
    if (response.ok) {
      console.log('   ✓ 预签名链接可访问（HTTP ' + response.status + '，覆盖参数：' +
        (minimal ? '最小集' : '含 content-type') + '）')
    } else {
      const text = await response.text()
      console.log('   ✗ 预签名链接返回 HTTP ' + response.status + '：' + text.replace(/\s+/g, ' ').slice(0, 180))
      if (/response header on content-type/i.test(text)) {
        console.log('   该服务不允许覆盖 content-type，请在 .env 设 S3_PRESIGN_MINIMAL=true')
      }
      ok = false
    }
  } catch (error) {
    fail('   预签名验证失败：' + (error.message || ''))
  }

  console.log('5/5 清理探针对象')
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    console.log('   ✓ 已删除，未留下残留文件')
  } catch (error) {
    fail('   删除失败（请手动清理 ' + key + '）：' + (error.message || ''))
  }

  console.log('')
  console.log(ok ? '结论：存储配置可用，LiveKit Egress 可以往里写录像。'
    : '结论：存储存在可用性问题，见上面失败的步骤。')
  if (!ok) process.exitCode = 1
}

main().catch((error) => {
  fail('未预期错误：' + (error.stack || error.message))
})
