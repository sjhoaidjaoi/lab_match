// Opt-in integration check: synthetic picture and speech only, in a disposable room.
require('dotenv').config()
const { randomUUID } = require('node:crypto')
const { spawn } = require('node:child_process')
const { setTimeout: delay } = require('node:timers/promises')
const path = require('node:path')
const { EgressClient, EgressStatus, IngressClient, IngressInput, RoomServiceClient } = require('livekit-server-sdk')
const video = require('../services/interviewVideo')
const recording = require('../services/interviewRecording')

async function main() {
  const config = video.requireConfig()
  const storage = recording.storageConfig()
  if (!storage) throw Error('录像存储未配置')
  const host = config.url.replace(/^wss:/, 'https:')
  const rooms = new RoomServiceClient(host, config.key, config.secret, { requestTimeout: 10 })
  const inputs = new IngressClient(host, config.key, config.secret, { requestTimeout: 15 })
  const outputs = new EgressClient(host, config.key, config.secret, { requestTimeout: 20 })
  const room = 'labmatch-selftest-' + randomUUID()
  const item = { objectKey: 'healthcheck/' + room + '.mp4', storageId: storage.id, interviewId: 'selftest' }
  let input, encoder, output, finished = false, roomCreated = false
  try {
    await rooms.createRoom({ name: room, emptyTimeout: 90 })
    roomCreated = true
    input = await inputs.createIngress(IngressInput.RTMP_INPUT, { name: room, roomName: room, participantIdentity: 'synthetic-presenter' })
    encoder = spawn(process.env.INTERVIEW_FFMPEG || 'ffmpeg', ['-nostdin','-loglevel','error','-re','-f','lavfi',
      '-i','color=c=0x344955:s=640x360:r=15','-stream_loop','-1','-i',path.resolve('tools/selftest/speech.wav'),
      '-t','80','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-g','30','-c:a','aac','-f','flv',
      input.url.replace(/\/$/,'') + '/' + input.streamKey], { windowsHide: true, stdio: 'ignore' })
    let launchError
    encoder.on('error', err => { launchError = err })
    let joined = false
    for (let i = 0; i < 15; i++) {
      const people = await rooms.listParticipants(room)
      if (people.some(p => p.identity === 'synthetic-presenter' && p.tracks.length >= 2)) { joined = true; break }
      if (launchError || encoder.exitCode !== null) throw Error('合成音视频推流未建立')
      await delay(1000)
    }
    if (!joined) throw Error('测试房间没有收到合成音视频双轨')
    console.log('PASS 真实房间接收到测试音频和视频')
    output = await outputs.startEgress(recording.startRequest({ onlineRoomName: room }, item, storage))
    await delay(13000)
    try { await outputs.stopEgress(output.egressId) } catch { /* A lost response is reconciled below. */ }
    for (let i = 0; i < 30; i++) {
      const [info] = await outputs.listEgress({ egressId: output.egressId }).catch(() => [])
      if (info?.status === EgressStatus.EGRESS_COMPLETE) { finished = true; break }
      if ([EgressStatus.EGRESS_FAILED,EgressStatus.EGRESS_ABORTED,EgressStatus.EGRESS_LIMIT_REACHED].includes(info?.status)) {
        throw Error('云录制失败，状态 ' + info.status + '，错误码 ' + info.errorCode)
      }
      await delay(1000)
    }
    if (!finished) throw Error('云录制未在测试时间内完成')
    console.log('PASS Egress 已完成合成及上传')
    const playback = await recording.signAccess(item, false)
    const response = await fetch(playback.url, { headers: { Range: 'bytes=0-11' }, signal: AbortSignal.timeout(15000) })
    if (response.status !== 206 || Buffer.from(await response.arrayBuffer()).toString('ascii',4,8) !== 'ftyp') throw Error('录像回放未取得可定位的 MP4 文件')
    console.log('PASS 私有回放地址支持 MP4 分段读取')
  } finally {
    if (encoder && encoder.exitCode === null) encoder.kill()
    if (output && !finished) await outputs.stopEgress(output.egressId).catch(() => {})
    if (input) await inputs.deleteIngress(input.ingressId).catch(() => { process.exitCode = 1; console.error('测试推流入口清理失败') })
    if (roomCreated) await rooms.deleteRoom(room).catch(() => { process.exitCode = 1; console.error('测试房间清理失败') })
    if (output) await recording.deleteObject(item).catch(() => { process.exitCode = 1; console.error('测试录像清理失败：' + item.objectKey) })
  }
}
main().catch(error => {
  console.error(String(error.message).replace(/(?:https?|rtmps?|wss?):\/\/\S+/gi, '[endpoint]').slice(0,300))
  process.exitCode = 1
})
