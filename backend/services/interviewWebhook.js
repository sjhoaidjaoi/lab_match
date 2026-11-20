const { WebhookReceiver } = require('livekit-server-sdk')
const { getStore, commitStore, nextId } = require('../data/seed')
const { liveKitConfig, identityFor } = require('./interviewVideo')
const { applyEgressWebhook } = require('./interviewRecording')

const events = new Set(['room_started', 'participant_joined', 'participant_left', 'participant_connection_aborted', 'room_finished'])

async function recordEvent(event) {
  if (!events.has(event.event) || !event.id || !event.room?.name || !event.room.sid || event.createdAt <= 0n) return
  const current = getStore()
  const matched = current.interviews.find(item => item.onlineRoomName === event.room.name)
  if (!matched || current.interviewWebhookEvents.some(item => item.id === event.id)) return
  const store = structuredClone(current)
  const interview = store.interviews.find(item => item.id === matched.id)
  const at = new Date(Number(event.createdAt) * 1000).toISOString()
  store.interviewWebhookEvents.push({ id: event.id, interviewId: interview.id, eventType: event.event,
    roomSid: event.room.sid, eventAt: at })
  if (event.event === 'room_finished') {
    for (const entry of store.interviewAttendance.filter(item => item.roomSid === event.room.sid && !item.leftAt)) {
      finish(entry, at, 'ROOM_FINISHED')
    }
  }
  const participant = event.participant
  const member = participant && store.interviewParticipants.find(item => item.interviewId === interview.id &&
    identityFor(interview, item.userId) === participant.identity)
  if (member && participant.sid) {
    let entry = store.interviewAttendance.find(item => item.roomSid === event.room.sid && item.participantSid === participant.sid)
    if (!entry) {
      entry = { id: nextId(store.interviewAttendance), interviewId: interview.id, userId: member.userId,
        roomSid: event.room.sid, participantSid: participant.sid }
      store.interviewAttendance.push(entry)
    }
    const joined = participant.joinedAt > 0n ? new Date(Number(participant.joinedAt) * 1000).toISOString() : null
    if (event.event === 'participant_joined') {
      entry.joinedAt = entry.joinedAt || joined || at
      if (member.participantRole === 'HOST' && (!interview.onlineMediaStartedAt || entry.joinedAt < interview.onlineMediaStartedAt) &&
          (!interview.onlineEndedAt || entry.joinedAt <= interview.onlineEndedAt)) interview.onlineMediaStartedAt = entry.joinedAt
      const roomEnd = store.interviewWebhookEvents.find(item => item.interviewId === interview.id &&
        item.eventType === 'room_finished' && item.roomSid === event.room.sid && item.eventAt >= entry.joinedAt)
      if (roomEnd && !entry.leftAt) finish(entry, roomEnd.eventAt, 'ROOM_FINISHED')
      if (entry.leftAt) finish(entry, entry.leftAt, entry.disconnectReason)
    } else {
      if (event.event === 'participant_left') entry.joinedAt ||= joined
      const reason = participant.toJson().disconnectReason
      if (member.removedAt && Math.floor(Date.parse(member.removedAt) / 1000) <= Number(event.createdAt) &&
          (!entry.joinedAt || member.removedAt >= entry.joinedAt)) {
        entry.removedAt = member.removedAt
      }
      finish(entry, at, entry.removedAt ? 'PARTICIPANT_REMOVED' :
        event.event === 'participant_connection_aborted' ? 'CONNECTION_ABORTED' : reason || 'UNKNOWN')
    }
  }
  await commitStore(store)
}

function finish(entry, at, reason) {
  if (!entry.leftAt || at <= entry.leftAt || entry.disconnectReason === 'ROOM_FINISHED') {
    entry.leftAt = at
    entry.disconnectReason = reason
  }
  entry.onlineSeconds = entry.joinedAt ? Math.max(0, Math.floor((Date.parse(entry.leftAt) - Date.parse(entry.joinedAt)) / 1000)) : null
}

function handleInterviewWebhook(enqueue) {
  return async (req, res, next) => {
    const config = liveKitConfig()
    if (!config) return res.sendStatus(503)
    if (!Buffer.isBuffer(req.body)) return res.sendStatus(415)
    let event
    try {
      const key = process.env.LIVEKIT_WEBHOOK_API_KEY || config.key
      const secret = process.env.LIVEKIT_WEBHOOK_API_SECRET || config.secret
      event = await new WebhookReceiver(key, secret).receive(req.body.toString('utf8'), req.get('Authorization'))
    } catch { return res.sendStatus(401) }
    try {
      await enqueue(() => ['egress_started', 'egress_updated', 'egress_ended'].includes(event.event)
        ? applyEgressWebhook(event.egressInfo) : recordEvent(event))
      res.sendStatus(204)
    } catch (error) { next(error) }
  }
}

module.exports = { handleInterviewWebhook }
