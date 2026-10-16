// Supabase Edge Function: verify-group-code
// 作用：校验群暗号 → 用 service_role 写入/更新 members → 返回成员信息
// 群暗号只存在服务端环境变量 GROUP_CODE，前端不含真暗号。
//
// 部署：supabase functions deploy verify-group-code --no-verify-jwt
// Secrets：supabase secrets set GROUP_CODE='9班yyds' ADMIN_EMAILS='2219158964@qq.com'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const AVATAR_COLORS = [
  '#2563eb', '#0891b2', '#059669', '#65a30d', '#ca8a04',
  '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#4f46e5',
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405)

  const GROUP_CODE = Deno.env.get('GROUP_CODE') || ''
  const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (!GROUP_CODE) {
    console.error('GROUP_CODE 未配置')
    return json({ ok: false, error: '服务未配置' }, 500)
  }

  let payload: { nickname?: string; qq?: string; code?: string; auth_uid?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ ok: false, error: '请求体不是合法 JSON' }, 400)
  }

  const nickname = (payload.nickname || '').trim()
  const qq = (payload.qq || '').trim()
  const code = (payload.code || '').trim()
  let authUid = (payload.auth_uid || '').trim()

  if (!nickname) return json({ ok: false, error: '昵称不能为空' }, 400)
  if (nickname.length > 24) return json({ ok: false, error: '昵称最多 24 个字符' }, 400)
  if (!code) return json({ ok: false, error: '请输入群暗号' }, 400)

  // 暗号比对（不区分大小写，允许首尾空格容错）
  if (code.toLowerCase() !== GROUP_CODE.toLowerCase()) {
    console.warn('暗号校验失败:', nickname)
    return json({ ok: false, error: '群暗号不正确' }, 403)
  }

  // 优先用请求头里的用户 JWT 里的 uid；前端也显式传 auth_uid 兜底
  const authHeader = req.headers.get('Authorization') || ''
  if (!authUid && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const payloadB64 = token.split('.')[1]
      const decoded = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
      authUid = decoded.sub || ''
    } catch {
      /* ignore */
    }
  }
  if (!authUid) return json({ ok: false, error: '缺少用户身份，请重试' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  try {
    // 先查是否已存在（同 auth_uid = 复访；同昵称 = 换设备重登记）
    const { data: byUid } = await admin
      .from('members')
      .select('*')
      .eq('auth_uid', authUid)
      .maybeSingle()

    const now = new Date().toISOString()

    if (byUid) {
      // 复访：更新昵称/QQ（QQ 为空则不覆盖）
      const patch: Record<string, unknown> = {
        nickname,
        last_seen_at: now,
      }
      if (qq) patch.qq = qq

      const { data: updated, error: updErr } = await admin
        .from('members')
        .update(patch)
        .eq('id', byUid.id)
        .select()
        .single()
      if (updErr) throw updErr

      return json({ ok: true, member: updated, token: authUid })
    }

    // 昵称撞车：沿用该成员记录并接管到当前 auth_uid（避免重复占位）
    const { data: byNick } = await admin
      .from('members')
      .select('*')
      .eq('nickname', nickname)
      .maybeSingle()

    if (byNick) {
      const patch: Record<string, unknown> = {
        auth_uid: authUid,
        last_seen_at: now,
      }
      if (qq) patch.qq = qq

      const { data: updated, error: updErr } = await admin
        .from('members')
        .update(patch)
        .eq('id', byNick.id)
        .select()
        .single()
      if (updErr) throw updErr
      return json({ ok: true, member: updated, token: authUid })
    }

    // 新成员：管理员白名单命中直接给 admin 角色
    const role =
      ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(qq.toLowerCase())
        ? 'admin'
        : 'member'

    const { data: created, error: insErr } = await admin
      .from('members')
      .insert({
        auth_uid: authUid,
        nickname,
        qq: qq || null,
        avatar_color: colorFor(nickname),
        role,
        upload_count: 0,
      })
      .select()
      .single()

    if (insErr) throw insErr

    return json({ ok: true, member: created, token: authUid }, 200)
  } catch (e) {
    console.error('verify-group-code error:', e)
    return json({ ok: false, error: '服务异常，请稍后再试' }, 500)
  }
})