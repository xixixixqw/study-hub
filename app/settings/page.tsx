'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Eye, EyeOff, Bell, Palette, Share2, LogOut, User as UserIcon,
  GripVertical, ArrowUp, ArrowDown, Download, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label, Input } from '@/components/ui/input'
import { InlineError } from '@/components/ui/states'
import { savePreferences } from '@/lib/api'
import { useMember } from '@/lib/member-context'
import { updateProfile } from '@/lib/register'
import { detectEnv, onInstallPrompt, promptInstall, requestNotificationPermission } from '@/lib/pwa'
import { MODULE_META, type MemberPreferences, type ModuleKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { member, prefs, patchPrefs, refresh, signOut, isAdmin, loading } = useMember()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [qq, setQq] = useState('')
  const [canInstall, setCanInstall] = useState(false)
  const env = typeof window !== 'undefined' ? detectEnv() : null

  useEffect(() => {
    if (member) {
      setNickname(member.nickname)
      setQq(member.qq || '')
    }
  }, [member])

  useEffect(() => {
    onInstallPrompt(() => setCanInstall(true))
  }, [])

  /** 所有偏好改动：先本地即时生效，再异步落库 */
  const update = async (patch: Partial<MemberPreferences>) => {
    if (!member) return
    const prev = prefs
    patchPrefs(patch) // localStorage + 内存立即更新
    setErr(null)
    try {
      await savePreferences(member.id, patch as Record<string, unknown>)
    } catch (e) {
      patchPrefs(prev) // 失败回滚
      setErr(e instanceof Error ? e.message : '保存失败，已恢复原设置')
    }
  }

  const toggleModule = (k: ModuleKey, v: boolean) => {
    const next = { ...prefs.visible_modules, [k]: v }
    if (!v) {
      const visibleCount = Object.values(next).filter(Boolean).length
      if (visibleCount === 0) {
        toast.error('至少保留一个首页模块')
        return
      }
    }
    update({ visible_modules: next })
  }

  const moveModule = (k: ModuleKey, dir: -1 | 1) => {
    const order = [...prefs.module_order]
    const i = order.indexOf(k)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    update({ module_order: order })
  }

  const saveProfile = async () => {
    setBusy(true)
    setErr(null)
    try {
      await updateProfile({ nickname: nickname.trim(), qq: qq.trim() })
      await refresh()
      toast.success('资料已更新')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const enableNotify = async (v: boolean) => {
    if (!v) {
      await update({ push_enabled: false })
      return
    }
    if (env?.isInAppBrowser) {
      toast.error('内置浏览器不支持通知，请用外部浏览器打开')
      return
    }
    const perm = await requestNotificationPermission()
    if (perm === 'granted') {
      await update({ push_enabled: true })
      toast.success('浏览器通知已开启')
    } else if (perm === 'unsupported') {
      toast.error('当前浏览器不支持通知')
    } else {
      toast.error('通知权限被拒绝，请在浏览器设置里手动允许')
    }
  }

  if (loading) {
    return <div className="p-4"><div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" /></div>
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">设置</h1>
      </div>

      {!member ? (
        <Card className="p-8 text-center">
          <div className="mb-2 text-3xl">🔒</div>
          <p className="text-sm font-medium">请先登记加入</p>
          <p className="mt-1 text-xs text-muted-foreground">登记后才能修改偏好</p>
        </Card>
      ) : (
        <>
          {/* 个人资料 */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserIcon className="h-4 w-4" />
              个人资料
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: member.avatar_color }}
              >
                {member.nickname.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{member.nickname}</div>
                <div className="text-xs text-muted-foreground">
                  {member.role === 'admin' ? '管理员' : '成员'} · 加入 {member.created_at.slice(0, 10)}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-xs">
                <Link href="/settings#avatar">改头像</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-nick">昵称</Label>
                <Input
                  id="s-nick"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-10 text-sm"
                  maxLength={24}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-qq">QQ 号</Label>
                <Input
                  id="s-qq"
                  value={qq}
                  onChange={(e) => setQq(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="h-10 text-sm font-mono"
                  inputMode="numeric"
                  placeholder="选填"
                />
              </div>
            </div>
            <Button
              className="h-10 w-full"
              disabled={busy || (nickname.trim() === member.nickname && qq === (member.qq || ''))}
              onClick={saveProfile}
            >
              保存资料
            </Button>
          </Card>

          {/* 信息隐藏 */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <EyeOff className="h-4 w-4" />
              成员墙显示
            </div>
            <p className="text-xs text-muted-foreground">
              控制别人在成员墙能看到你的哪些信息。QQ 号即使显示也会脱敏。
            </p>

            <ToggleRow
              label="显示 QQ 号"
              desc="别人可见（脱敏）"
              checked={prefs.show_qq}
              onChange={(v) => update({ show_qq: v })}
            />
            <ToggleRow
              label="显示上传数"
              desc="别人可见你上传了多少份资料"
              checked={prefs.show_upload_count}
              onChange={(v) => update({ show_upload_count: v })}
            />
            <ToggleRow
              label="显示加入时间"
              desc="别人可见你什么时候加入的"
              checked={prefs.show_join_time}
              onChange={(v) => update({ show_join_time: v })}
            />
            <ToggleRow
              label="公开我的 DDL"
              desc="关闭后你的 DDL 仅自己和管理员可见"
              checked={prefs.show_my_deadlines_public}
              onChange={(v) => update({ show_my_deadlines_public: v })}
            />
          </Card>

          {/* 首页模块 */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4" />
              首页模块
            </div>
            <p className="text-xs text-muted-foreground">
              开关决定「你手机上」的显示，不影响其他人。上下箭头调整顺序。
            </p>

            <div className="space-y-2">
              {(['memberWall', 'materials', 'deadlines'] as ModuleKey[]).map((k, idx) => {
                const meta = MODULE_META[k]
                const order = prefs.module_order || []
                const pos = order.indexOf(k)
                return (
                  <div
                    key={k}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5"
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{meta.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{meta.desc}</div>
                    </div>
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveModule(k, -1)}
                        disabled={pos <= 0}
                        className="rounded p-0.5 text-muted-foreground hover:bg-slate-100 disabled:opacity-30"
                        aria-label="上移"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveModule(k, 1)}
                        disabled={pos < 0 || pos >= order.length - 1}
                        className="rounded p-0.5 text-muted-foreground hover:bg-slate-100 disabled:opacity-30"
                        aria-label="下移"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Switch
                      checked={!!prefs.visible_modules?.[k]}
                      onCheckedChange={(v) => toggleModule(k, v)}
                    />
                  </div>
                )
              })}
            </div>

            <ToggleRow
              label="显示上传入口"
              desc="首页顶部的大上传按钮"
              checked={!!prefs.visible_modules?.upload}
              onChange={(v) => toggleModule('upload', v)}
            />
          </Card>

          {/* 通知 */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4" />
              提醒方式
            </div>

            <ToggleRow
              label="浏览器通知"
              desc="DDL 到期时弹系统通知"
              checked={prefs.push_enabled}
              onChange={enableNotify}
            />

            {env?.isInAppBrowser && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  当前在内置浏览器，系统通知不可用。请「···」→ 在浏览器打开。
                  站内通知不受影响。
                </span>
              </div>
            )}

            <ToggleRow
              label="邮件提醒"
              desc={
                prefs.email_enabled
                  ? '已开启（由服务端 Resend 发送）'
                  : '需管理员配置 RESEND_API_KEY 后可用'
              }
              checked={prefs.email_enabled}
              onChange={(v) => update({ email_enabled: v })}
            />

            <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-muted-foreground">
              站内通知始终可用；DDL 到期前会按你设定的
              「准时/ 1h / 1d / 3d」触发。
              <Link href="/deadlines" className="ml-1 text-primary underline">
                去DDL 看板
              </Link>
            </div>
          </Card>

          {/* PWA */}
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Download className="h-4 w-4" />
              添加到手机桌面
            </div>
            {env?.isStandalone ? (
              <Badge variant="success" className="w-full justify-center py-2">
                已作为应用运行
              </Badge>
            ) : canInstall ? (
              <Button
                className="h-11 w-full"
                onClick={async () => {
                  const r = await promptInstall()
                  if (r === 'accepted') toast.success('已添加到桌面')
                  else if (r === 'unavailable')
                    toast.error('请用浏览器菜单「添加到主屏幕」')
                }}
              >
                <Download className="h-4 w-4" />
                添加到主屏幕
              </Button>
            ) : (
              <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                <p>Chrome / Edge：地址栏右侧「安装」图标 → 安装</p>
                <p>Android：浏览器菜单 → 添加到主屏幕</p>
                <p>iOS Safari：分享 → 添加到主屏幕</p>
                <p className="text-blue-600">QQ/微信：需先「在浏览器打开」</p>
              </div>
            )}
          </Card>

          {/* 其他 */}
          <Card className="space-y-2 p-4">
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/?share=1">
                <Share2 className="h-4 w-4" />
                分享资料库链接
              </Link>
            </Button>

            {isAdmin && (
              <Button asChild variant="outline" className="h-11 w-full">
                <Link href="/admin">进入管理页</Link>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-11 w-full text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!window.confirm('退出后需要重新用暗号登记，确定吗？')) return
                await signOut()
                window.location.href = '/'
              }}
            >
              <LogOut className="h-4 w-4" />
              退出 / 重新登记
            </Button>
          </Card>
        </>
      )}

      <div className="pt-2">
        <InlineError message={err} />
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className={cn('shrink-0')}
      />
    </div>
  )
}