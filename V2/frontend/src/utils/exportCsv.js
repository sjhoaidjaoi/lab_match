export function exportCsv(filename, headers, rows, watermark = '') {
  const esc = (v) => {
    let s = String(v ?? '')
    // 防 CSV 公式注入：以 = + - @ 开头的单元格加单引号
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // BOM 保证 Excel 打开中文不乱码；watermark 作为首行说明
  const lines = watermark ? [[watermark], headers, ...rows] : [headers, ...rows]
  const content = '﻿' + lines.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}