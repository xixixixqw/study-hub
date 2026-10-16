// Supabase Edge Function: send-deadline-reminders
// 由 pg_cron 定时调用（或手动 POST）。逻辑：
//   1. 扫描 deadlines 中 status='todo' 且 remind_at <= now() 且 reminder_sent=false
//   2. 写入 notifications（站内通知）
//   3. 可选：Web Push（VAPID 已配置且成员开启 push_enabled）
//   4. 可选：邮件（RESEND_API_KEY 已配置且成员开启 email_enabled）
//   5. 标记 reminder_sent=true，避免重复发送
//
// 部署：supabase functions deploy send-deadline-reminders --no-verify-jwt
// Secrets：
//   supabase secrets set VAPID_PUBLIC_KEY='...' VAPID_PRIVATE_KEY='...'
//   supabase secrets set RESEND_API_KEY='re_xxx' REMINDER_FROM='学习资料库 <noreply@xxx.com>'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const REMINDER_FROM = Deno.env.get('REMINDER_FROM') || '学习资料库 <noreply@example.com>'
const APP_URL = Deno.env.get('APP_URL') || 'https://your-app.vercel.app'
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const VAPID_ENABLED = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
if (VAPID_ENABLED) {
  webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

function fmtDue(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDelta(dueIso: string): string {
  const diff = new Date(dueIso).getTime() - Date.now()
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  if (mins < 60) return `${mins} 分钟后截止`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} 小时后截止`
  return `${Math.round(hours / 24)} 天后截止`
}

Deno.serve(async (req: Request) => {
  try {
    // 可选鉴权：若设置了 CRON_SECRET 则校验
    const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''
    if (CRON_SECRET) {
      const auth = req.headers.get('Authorization') || ''
      if (auth !== `Bearer ${CRON_SECRET}`) {
        return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const nowIso = new Date().toISOString()

    // 1) 查需要提醒的 DDL
    const { data: due, error: dueErr } = await db
      .from('deadlines')
      .select('*')
      .eq('status', 'todo')
      .eq('reminder_sent', false)
      .not('remind_at', 'is', null)
      .lte('remind_at', nowIso)
      .limit(200)

    if (dueErr) throw dueErr

    if (!due || due.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, message: 'no due deadlines' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    const memberIds = Array.from(new Set(due.map((d: any) => d.member_id as string)))
    const { data: members } = await db
      .from('members')
      .select('id, nickname, qq, role')
      .in('id', memberIds)
    const { data: prefs } = await db
      .from('member_preferences')
      .select('member_id, push_enabled, push_subscription, email_enabled')
      .in('member_id', memberIds)

    const memberMap = new Map((members || []).map((m: any) => [m.id, m]))
    const prefMap = new Map((prefs || []).map((p: any) => [p.member_id, p]))

    let pushOk = 0
    let pushFail = 0
    let mailOk = 0
    let mailFail = 0
    let notifInserted = 0

    for (const d of due as any[]) {
      const m = memberMap.get(d.member_id)
      if (!m) continue

      const title = `DDL 提醒：${d.title}`
      const content = `${fmtDue(d.due_at)} · ${fmtDelta(d.due_at)}`
      const link = `${APP_URL}/deadlines`

      // 2) 站内通知（幂等：靠唯一键去重）
      const { error: nErr } = await db.from('notifications').insert({
        member_id: d.member_id,
        type: 'deadline',
        title,
        content,
        link,
        is_read: false,
      })
      if (nErr) {
        // 重复插入报错 → 说明已发过，跳过继续
        if (!String(nErr.message).includes('duplicate')) {
          console.error('notification insert failed:', nErr.message)
        }
        continue
      }
      notifInserted++

      const pref: any = prefMap.get(d.member_id)

      // 3) Web Push
      if (VAPID_ENABLED && pref?.push_enabled && pref?.push_subscription) {
        try {
          await webpush.sendNotification(
            pref.push_subscription,
            JSON.stringify({ title, body: content, url: link })
          )
          pushOk++
        } catch (e) {
          pushFail++
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            // 订阅失效 → 清掉
            await db
              .from('member_preferences')
              .update({ push_subscription: null, push_enabled: false })
              .eq('member_id', d.member_id)
          }
        }
      }

      // 4) 邮件
      if (RESEND_API_KEY && pref?.email_enabled && m.qq) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: REMINDER_FROM,
              to: [`${String(m.qq)}@qq.com`],
              subject: title,
              html: `<div style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b;margin:0 0 12px">${title}</h2>
  <p style="color:#475569;line-height:1.7">
    截止时间：<strong>${fmtDue(d.due_at)}</strong><br/>
    ${d.description ? `备注：${String(d.description).slice(0, 200)}<br/><br/>` : ''}
    <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none">去DDL 看板</a>
  </p>
</div>`,
            }),
          })
          mailOk++
        } catch (e) {
          mailFail++
          console.error('resend failed:', e)
        }
      }

      // 5) 标记已发送
      await db.from('deadlines').update({ reminder_sent: true }).eq('id', d.id)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: due.length,
        notifications: notifInserted,
        push: { ok: pushOk, failed: pushFail, enabled: VAPID_ENABLED },
        email: { ok: mailOk, failed: mailFail, enabled: !!RESEND_API_KEY },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('send-deadline-reminders error:', e)
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})