// RFC 4180 CSV: CRLF line ends, fields quoted only when they hold a comma, quote or line break.

function cell(v) {
  if (v == null) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Header row first, then one line per row, in `columns` order. */
export function toCsv(rows, columns) {
  const lines = [columns.map(cell).join(',')]
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(','))
  return lines.join('\r\n') + '\r\n'
}
