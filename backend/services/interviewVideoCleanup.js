const { getStore, persistStore } = require('../data/seed')
const { logOperation } = require('../utils/audit')
const { liveKitConfig, scheduledEnd, closeMeeting, revokeParticipant, TOKEN_TTL_SECONDS } = require('./interviewVideo')

const cleaning = new Set()

// Close the Cloud room promptly and check it again after any unused grant has expired.
function sweepVideoRooms(enqueue) {
  const config = liveKitConfig()
  const store = getStore()
  const now = Date.now()
  let changed = false
  for (const interview of store.interviews) {
    const name = interview.onlineRoomName
    if (!name || !interview.onlineStartedAt || interview.onlineRoomCleanedAt) continue
    const end = scheduledEnd(store, interview, now)
    if (!interview.onlineEndedAt && end !== null) {
      interview.onlineEndedAt = new Date(Math.max(Date.parse(interview.onlineStartedAt), end)).toISOString()
      interview.interviewStatus = 'COMPLETED'
      logOperation(store, null, { operationType: 'END_ONLINE_INTERVIEW', targetType: 'INTERVIEW',
        targetId: interview.id, description: '入会时段或面试阶段关闭，系统结束线上面试' })
      changed = true
    }
    if (config && !interview.onlineEndedAt) {
      for (const entry of store.interviewParticipants.filter(item => item.interviewId === interview.id && item.removedAt && !item.revokedAt)) {
        const key = name + ':' + entry.userId
        if (cleaning.has(key)) continue
        cleaning.add(key)
        revokeParticipant(config, interview, entry.userId).then(() => enqueue(() => {
          const current = getStore()
          const saved = current.interviewParticipants.find(item => item.interviewId === interview.id && item.userId === entry.userId)
          if (saved?.removedAt && !saved.revokedAt) {
            saved.revokedAt = new Date().toISOString()
            persistStore(current)
          }
        })).catch(() => {}).finally(() => cleaning.delete(key))
      }
    }
    if (!config || !interview.onlineEndedAt || cleaning.has(name)) continue
    const finalCheck = now > Date.parse(interview.onlineEndedAt) + (TOKEN_TTL_SECONDS + 15) * 1000
    cleaning.add(name)
    closeMeeting(config, interview, store.interviewParticipants).then(() => {
      if (!finalCheck) return
      return enqueue(() => {
        const current = getStore()
        const record = current.interviews.find(item => item.onlineRoomName === name)
        if (record?.onlineEndedAt && !record.onlineRoomCleanedAt) {
          record.onlineRoomCleanedAt = new Date().toISOString()
          persistStore(current)
        }
      })
    }).catch(() => {
      console.warn('[lab-match] LiveKit 房间关闭请求失败，将重试')
    }).finally(() => cleaning.delete(name))
  }
  if (changed) persistStore(store)
}

module.exports = { sweepVideoRooms }
