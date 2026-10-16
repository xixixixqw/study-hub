'use client'

import { getSupabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import type { Member } from './types'
import { avatarColorFor } from './utils'

/**
 * 登记 = 校验群暗号（Edge Function）→ 匿名登录 → 落库
 * 注意：群暗号只发到服务端比对，前端不含真暗号。
 */
export async function registerWithGroupCode(input: {
  nickname: string
  qq?: string
  code: string
}): Promise<{ member: Member; token: string }> {
  const nickname = input.nickname.trim()
  if (!nickname) throw new Error('昵称不能为空')
  if (nickname.length > 24) throw new Error('昵称最多 24 个字符')

  const supabase = getSupabase()

  // 1) 先确保有匿名 session（verify 函数会用它做幂等 upsert 的锚点）
  const { data: sessData } = await supabase.auth.getSession()
  const existing = sessData.session as Session | null
  let session: Session | null = existing
  if (!session) {
    const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously()
    if (anonErr) throw new Error(`匿名登录失败：${anonErr.message}`)
    session = anonData.session as Session | null
  }
  if (!session) throw new Error('匿名登录失败：未拿到 session')

  // 2) 调 Edge Function 校验暗号
  const { data, error } = await supabase.functions.invoke('verify-group-code', {
    body: {
      nickname,
      qq: (input.qq || '').trim(),
      code: input.code,
      auth_uid: session.user.id,
    },
  })
  if (error) {
    throw new Error(error.message || '暗号校验服务不可用，请稍后再试')
  }
  const body = (data || {}) as {
    ok?: boolean
    error?: string
    member?: Member
    token?: string
  }
  if (!body.ok || !body.member) {
    throw new Error(body.error || '暗号不正确')
  }

  const member: Member = {
    ...body.member,
    avatar_color: body.member.avatar_color || avatarColorFor(body.member.nickname),
  }
  return { member, token: body.token || session.user.id }
}

/** 刷新 last_seen_at（失败静默） */
export async function touchLastSeen(memberId: string): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase.from('members').update({ last_seen_at: new Date().toISOString() }).eq('id', memberId)
  } catch {
    /* 忽略 */
  }
}

/** 修改自己的头像色 */
export async function updateAvatarColor(color: string): Promise<void> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const sess = data?.session
  if (!sess) throw new Error('未登录')
  const { error } = await supabase
    .from('members')
    .update({ avatar_color: color })
    .eq('auth_uid', sess.user.id)
  if (error) throw new Error(error.message)
}

/** 修改昵称 / QQ */
export async function updateProfile(patch: { nickname?: string; qq?: string }): Promise<void> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const sess = data?.session
  if (!sess) throw new Error('未登录')
  const { error } = await supabase.from('members').update(patch).eq('auth_uid', sess.user.id)
  if (error) throw new Error(error.message)
}