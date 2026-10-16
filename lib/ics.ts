/** 极简 .ics 生成（RFC 5545，UTC 时间，CRLF 换行） */

function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function stamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return (
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z'
  )
}

export interface IcsEvent {
  uid: string
  title: string
  description?: string | null
  dueAt: string
  url?: string | null
}

export function buildIcs(events: IcsEvent[], calName = '学习资料库 DDL'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyHub//DDL//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
  ]

  for (const e of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${esc(e.uid)}`)
    lines.push(`DTSTAMP:${stamp(new Date().toISOString())}`)
    // 待办用 DTSTART + DURATION(0)，兼容各日历 App
    lines.push(`DTSTART:${stamp(e.dueAt)}`)
    lines.push('DURATION:PT0S')
    lines.push(`SUMMARY:${esc(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
    if (e.url) lines.push(`URL:${esc(e.url)}`)
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-PT30M')
    lines.push('ACTION:DISPLAY')
    lines.push(`DESCRIPTION:${esc(e.title)} 即将到期`)
    lines.push('END:VALARM')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(events: IcsEvent[], filename = 'ddl.ics'): void {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}