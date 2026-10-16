'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { Home, Upload, CalendarClock, Settings, Bell, ShieldCheck } from 'lucide-react'
import { useMember } from '@/lib/member-context'
import { useDeadlineWatcher } from '@/lib/use-deadline-watcher'
import { registerSW } from '@/lib/pwa'
import { unreadCount } from '@/lib/api'
import RegisterDialog from '@/components/register-dialog'
import DdlAlertDialog from '@/components/ddl-alert-dialog'
import InAppBrowserHint from '@/components/in-app-hint'
import { APP_NAME } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: '首页', icon: Home },
  { href: '/upload', label: '上传', icon: Upload },
  { href: '/deadlines', label: 'DDL', icon: CalendarClock },
  { href: '/notifications', label: '通知', icon: Bell, badge: true },
  { href: '/settings', label: '设置', icon: Settings },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { member, loading, isAdmin } = useMember()
  const { dueSoon, dismissed, dismiss } = useDeadlineWatcher()
  const [unread, setUnread] = useState(0)
  const [registerOpen, setRegisterOpen] = useState(false)

  // 注册 SW
  useEffect(() => {
    registerSW()
  }, [])

  // 登记弹窗：未登录且不在登录页时弹出
  useEffect(() => {
    if (loading) return
    if (pathname === '/login') return
    if (!member) {
      const t = window.setTimeout(() => setRegisterOpen(true), 600)
      return () => window.clearTimeout(t)
    }
    setRegisterOpen(false)
  }, [loading, member, pathname])

  // 未读通知轮询
  useEffect(() => {
    if (!member) {
      setUnread(0)
      return
    }
    let alive = true
    const load = async () => {
      try {
        const n = await unreadCount()
        if (alive) setUnread(n)
      } catch {
        /* 忽略 */
      }
    }
    load()
    const t = window.setInterval(load, 60_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [member])

  const showDdlAlert =
    !dismissed && dueSoon.length > 0 && pathname !== '/deadlines'

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              资
            </span>
            <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex h-8 items-center gap-1 rounded-lg bg-amber-100 px-2.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                管理
              </Link>
            )}
            {member && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: member.avatar_color || '#2563eb' }}
                title={member.nickname}
              >
                {member.nickname.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-safe">{children}</main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-2xl -translate-x-1/2 border-t border-border/70 bg-white/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            const showBadge = item.badge && unread > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <RegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      {showDdlAlert && (
        <DdlAlertDialog
          items={dueSoon}
          onClose={() => {
            dismiss()
            window.location.href = '/deadlines'
          }}
          onDismiss={dismiss}
        />
      )}
      <InAppBrowserHint />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}