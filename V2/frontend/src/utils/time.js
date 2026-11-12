export function parseTime(value) {
  if (!value) return null
  const d = new Date(value.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

export function isPast(value, now) {
  const d = parseTime(value)
  return d ? now.getTime() >= d.getTime() : false
}

export function remainingText(value, now) {
  const d = parseTime(value)
  if (!d) return '—'
  let diff = d.getTime() - now.getTime()
  if (diff <= 0) return '已结束'
  const day = Math.floor(diff / 86400000)
  diff -= day * 86400000
  const hour = Math.floor(diff / 3600000)
  diff -= hour * 3600000
  const minute = Math.floor(diff / 60000)
  if (day > 0) return `${day} 天 ${hour} 小时`
  if (hour > 0) return `${hour} 小时 ${minute} 分`
  return `${minute} 分钟`
}
