import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_COLORS = [
  '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#dc2626', '#db2777',
  '#7c3aed', '#4f46e5',
]

export function avatarColorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initialsOf(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

/** QQ 号脱敏：12345678 -> 1234**** */
export function maskQQ(qq?: string | null): string {
  if (!qq) return '未填写'
  const s = qq.replace(/\s/g, '')
  if (s.length <= 4) return s.slice(0, 1) + '***'
  return s.slice(0, 4) + '****'
}

export function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const v = bytes / Math.pow(1024, i)
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function isPreviewable(mime?: string | null, ext?: string): boolean {
  if (mime?.startsWith('image/')) return true
  return ext === 'pdf'
}

export function fileIconFor(nameOrMime: string): string {
  const s = nameOrMime.toLowerCase()
  if (s.includes('pdf')) return '📕'
  if (/\b(doc|docx)\b/.test(s)) return '📘'
  if (/\b(xls|xlsx|csv)\b/.test(s)) return '📗'
  if (/\b(ppt|pptx)\b/.test(s)) return '📙'
  if (/\bzip\b/.test(s)) return '🗜️'
  if (/\b(jpg|jpeg|png|gif|webp)\b/.test(s)) return '🖼️'
  return '📄'
}

export function toLocalInputValue(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 从本地 datetime-local 值生成 ISO */
export function fromLocalInputValue(v: string): string {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function remindBeforeMs(kind: string): number {
  switch (kind) {
    case '1h': return 60 * 60 * 1000
    case '1d': return 24 * 60 * 60 * 1000
    case '3d': return 3 * 24 * 60 * 60 * 1000
    default: return 0
  }
}

export function remindBeforeLabel(kind: string): string {
  return { '0': '准时提醒', '1h': '提前 1 小时', '1d': '提前 1 天', '3d': '提前 3 天' }[kind] || '准时提醒'
}

/** 计算 remind_at = due_at - remind_before */
export function computeRemindAt(dueAtIso: string, kind: string): string {
  const t = new Date(dueAtIso).getTime() - remindBeforeMs(kind)
  return new Date(t).toISOString()
}

export function uid(): string {
  return (
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )
}