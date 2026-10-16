'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, Mail, ArrowRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { InlineError } from '@/components/ui/states'
import { getSupabase } from '@/lib/supabase'
import { useMember } from '@/lib/member-context'
import { APP_NAME } from '@/lib/supabase'

/**
 * 管理员登录：邮箱 + 一次性魔法链接（Supabase OTP）。
 * 登录后若 members.role='admin' 则可进入 /admin。
 */
export default function LoginPage() {
  const router = useRouter()
  const { member, isAdmin, refresh } = useMember()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (member && isAdmin) router.replace('/admin')
  }, [member, isAdmin, router])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    const mail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setErr('请输入正确的邮箱地址')
      return
    }
    setBusy(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: mail,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (error) throw new Error(error.message)
      setSent(true)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '发送失败，请稍后再试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-semibold">管理员登录</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {APP_NAME} · 仅白名单邮箱可进入
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <Mail className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
              <div className="text-sm font-medium text-emerald-800">登录链接已发送</div>
              <div className="mt-1 text-xs text-emerald-700">
                请到 <span className="font-mono">{email}</span> 查收邮件并点击链接
              </div>
            </div>
            <Button variant="ghost" className="h-10 w-full" onClick={() => setSent(false)}>
              换个邮箱
            </Button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="login-mail">管理员邮箱</Label>
              <Input
                id="login-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <InlineError message={err} />

            <Button type="submit" className="h-12 w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? '发送中…' : '发送登录链接'}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>

            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                使用 Supabase 邮件 OTP 登录，无需密码。
                需先在 Supabase Auth 中配置 SMTP 并确认邮箱白名单。
              </span>
            </div>

            <Button asChild variant="ghost" className="h-10 w-full text-muted-foreground">
              <Link href="/">← 返回资料库</Link>
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}