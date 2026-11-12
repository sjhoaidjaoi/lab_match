/**
 * 将服务端返回的剩余秒数格式化为中文倒计时文案。
 *
 * @param seconds 剩余秒数
 * @returns 倒计时文案
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) {
    return '已截止'
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) {
    return `剩余 ${days} 天 ${hours} 小时`
  }
  if (hours > 0) {
    return `剩余 ${hours} 小时 ${minutes} 分钟`
  }
  return `剩余 ${minutes} 分钟`
}
