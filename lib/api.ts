'use client'

import { getSupabase } from './supabase'
import { computeRemindAt } from './utils'
import type { Deadline, Member, Material, RemindBefore } from './types'

// ----------成员墙 ----------

export async function fetchMembers(): Promise<Member[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as Member[]
}

export async function fetchPreferencesMap(memberIds: string[]): Promise<Record<string, Record<string, boolean>>> {
  if (memberIds.length === 0) return {}
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('member_preferences')
    .select('member_id, show_qq, show_upload_count, show_join_time, hidden_deadline_ids')
    .in('member_id', memberIds)
  if (error) return {}
  const map: Record<string, Record<string, boolean>> = {}
  for (const row of data || []) {
    map[row.member_id] = row as Record<string, boolean>
  }
  return map
}

// ----------资料 ----------

export async function fetchMaterials(opts?: {
  category?: string
  search?: string
}): Promise<Material[]> {
  const supabase = getSupabase()
  let q = supabase
    .from('materials')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts?.category && opts.category !== '全部') q = q.eq('category', opts.category)
  if (opts?.search?.trim()) {
    const kw = opts.search.trim()
    // 过滤下推到 SQL，避免全表捞出
    q = q.or(`title.ilike.%${kw}%,description.ilike.%${kw}%,uploader_nickname.ilike.%${kw}%`)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data || []) as Material[]
}

export async function fetchMaterial(id: string): Promise<Material | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('materials').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data || null) as Material | null
}

export async function uploadMaterial(input: {
  member: Member
  file: File
  title: string
  description?: string
  category: string
  onProgress?: (pct: number) => void
}): Promise<Material> {
  const supabase = getSupabase()
  const { member, file, title, description, category, onProgress } = input

  const safe = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_')
  const path = `${member.id}/${Date.now()}-${safe}`

  onProgress?.(10)
  const { error: upErr } = await supabase.storage
    .from('materials')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })
  if (upErr) throw new Error(`文件上传失败：${upErr.message}`)
  onProgress?.(70)

  const { data: urlData } = supabase.storage.from('materials').getPublicUrl(path)

  onProgress?.(85)
  const { data, error } = await supabase
    .from('materials')
    .insert({
      member_id: member.id,
      uploader_nickname: member.nickname,
      title: title.trim() || file.name,
      description: description?.trim() || null,
      category,
      file_path: path,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type || null,
      is_pinned: false,
    })
    .select()
    .single()

  if (error) {
    // 数据库失败要清理孤儿文件
    await supabase.storage.from('materials').remove([path])
    throw new Error(`保存资料信息失败：${error.message}`)
  }
  onProgress?.(100)
  return data as Material
}

export async function deleteMaterial(m: Material): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('materials').delete().eq('id', m.id)
  if (error) throw new Error(error.message)
  try {
    await supabase.storage.from('materials').remove([m.file_path])
  } catch {
    /* 文件清理失败不阻塞 */
  }
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('materials').update({ is_pinned: pinned }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateMaterial(
  id: string,
  patch: Partial<Pick<Material, 'title' | 'description' | 'category'>>
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('materials').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function countDownload(id: string): Promise<void> {
  try {
    await getSupabase().rpc('increment_download_count', { p_material_id: id })
  } catch {
    /* 计数失败不阻塞下载 */
  }
}

// ---------- DDL ----------

export interface DeadlineFilter {
  scope?: 'all' | 'mine'
  status?: 'todo' | 'done'
}

export async function fetchDeadlines(filter: DeadlineFilter = {}): Promise<Deadline[]> {
  const supabase = getSupabase()
  let q = supabase.from('deadlines').select('*').order('due_at', { ascending: true })
  if (filter.status) q = q.eq('status', filter.status)
  if (filter.scope === 'mine') {
    const { data: m } = await supabase.auth.getSession()
    if (!m.session) return []
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('auth_uid', m.session.user.id)
      .maybeSingle()
    if (!member) return []
    q = q.eq('member_id', member.id)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data || []) as Deadline[]
}

export interface DeadlineInput {
  title: string
  description?: string
  due_at: string
  remind_before: RemindBefore
  visibility: 'public' | 'private'
  related_material_id?: string | null
}

export async function createDeadline(memberId: string, input: DeadlineInput): Promise<Deadline> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deadlines')
    .insert({
      member_id: memberId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_at: input.due_at,
      remind_at: computeRemindAt(input.due_at, input.remind_before),
      remind_before: input.remind_before,
      visibility: input.visibility,
      status: 'todo',
      related_material_id: input.related_material_id || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Deadline
}

export async function updateDeadline(
  id: string,
  patch: Partial<Omit<Deadline, 'remind_before'>> & { remind_before?: RemindBefore }
): Promise<void> {
  const supabase = getSupabase()
  const next: Record<string, unknown> = { ...patch }
  if (patch.due_at && patch.remind_before) {
    next.remind_at = computeRemindAt(patch.due_at, patch.remind_before)
    next.reminder_sent = false
  }
  const { error } = await supabase.from('deadlines').update(next).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setDeadlineStatus(id: string, status: 'todo' | 'done'): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('deadlines').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteDeadline(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('deadlines').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** 公开看板需要剔除被本人隐藏的 DDL（仅对当前用户生效） */
export function filterHiddenDeadlines(list: Deadline[], hiddenIds: string[]): Deadline[] {
  if (!hiddenIds.length) return list
  const set = new Set(hiddenIds)
  return list.filter((d) => !set.has(d.id))
}

export type DeadlineGroup = 'today' | 'week' | 'upcoming' | 'done'

export function groupDeadlines(list: Deadline[]): Record<DeadlineGroup, Deadline[]> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000
  const endOfWeek = endOfToday + 6 * 24 * 60 * 60 * 1000

  const out: Record<DeadlineGroup, Deadline[]> = { today: [], week: [], upcoming: [], done: [] }
  for (const d of list) {
    if (d.status === 'done') {
      out.done.push(d)
      continue
    }
    const t = new Date(d.due_at).getTime()
    if (t < startOfToday) continue // 已逾期但未完成 → 不进看板（避免刷屏）
    if (t < endOfToday) out.today.push(d)
    else if (t < endOfWeek) out.week.push(d)
    else out.upcoming.push(d)
  }
  return out
}

/** 24 小时内到期（用于首页弹窗 + 红点） */
export function dueWithin24h(list: Deadline[]): Deadline[] {
  const now = Date.now()
  const in24 = now + 24 * 60 * 60 * 1000
  return list.filter((d) => {
    if (d.status !== 'todo') return false
    const t = new Date(d.due_at).getTime()
    return t >= now && t <= in24
  })
}

// ---------- 通知 ----------

export async function fetchNotifications(): Promise<import('./types').AppNotification[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data || []) as import('./types').AppNotification[]
}

export async function unreadCount(): Promise<number> {
  const supabase = getSupabase()
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  if (error) return 0
  return count || 0
}

export async function markAllRead(): Promise<void> {
  const supabase = getSupabase()
  await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
}

export async function markRead(id: string): Promise<void> {
  const supabase = getSupabase()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function clearNotifications(): Promise<void> {
  const supabase = getSupabase()
  await supabase.from('notifications').delete().eq('is_read', true)
}

// ----------偏好 ----------

export async function savePreferences(memberId: string, prefs: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('member_preferences')
    .upsert({ member_id: memberId, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function setDeadlineHidden(memberId: string, deadlineId: string, hidden: boolean): Promise<void> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('member_preferences')
    .select('hidden_deadline_ids')
    .eq('member_id', memberId)
    .maybeSingle()
  const current: string[] = (data?.hidden_deadline_ids as string[]) || []
  const next = hidden
    ? Array.from(new Set([...current, deadlineId]))
    : current.filter((x) => x !== deadlineId)
  await savePreferences(memberId, { hidden_deadline_ids: next })
}