'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Upload, Users, FolderOpen, CalendarClock, Share2, QrCode, Plus, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import MemberWall from '@/components/member-wall'
import MaterialList from '@/components/material-list'
import DeadlineBoard from '@/components/deadline-board'
import DeadlineDialog from '@/components/deadline-dialog'
import ShareSheet from '@/components/share-sheet'
import { fetchDeadlines, filterHiddenDeadlines } from '@/lib/api'
import { useMember } from '@/lib/member-context'
import { touchLastSeen } from '@/lib/register'
import { APP_NAME, CATEGORIES } from '@/lib/supabase'
import { MODULE_META, type ModuleKey, type Deadline } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const router = useRouter()
  const { member, prefs, loading, setPrefs } = useMember()
  const [ddls, setDdls] = useState<Deadline[]>([])
  const [ddlLoading, setDdlLoading] = useState(true)
  const [ddlDialog, setDdlDialog] = useState(false)
  const [editing, setEditing] = useState<Deadline | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const loadDdls = useCallback(async () => {
    setDdlLoading(true)
    try {
      setDdls(await fetchDeadlines({ status: 'todo' }))
    } catch {
      /* 静默 */
    } finally {
      setDdlLoading(false)
    }
  }, [])

  useEffect(() => {
    if (member) {
      loadDdls()
      touchLastSeen(member.id)
    }
  }, [member, loadDdls])

  // 未登记时不要渲染私密内容
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    )
  }

  const visible = prefs.visible_modules || {
    memberWall: true, materials: true, deadlines: true, upload: true,
  }
  const order: ModuleKey[] = prefs.module_order?.length
    ? prefs.module_order
    : ['memberWall', 'materials', 'deadlines']

  // 公开看板：剔除自己隐藏的 + 自己不开公开的
  const publicDdls = filterHiddenDeadlines(ddls, prefs.hidden_deadline_ids || []).filter(
    (d) => d.visibility === 'public'
  )

  const stats = {
    members: 0,
    materials: 0,
  }

  return (
    <div className="space-y-6 p-4">
      {/* 群信息横幅 */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
              <Badge className="border-0 bg-white/20 text-[10px] text-white">QQ群共享</Badge>
            </div>
            <p className="mt-1.5 text-sm text-blue-50/90">
              资料共享 · DDL 提醒 · 成员互看
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-50/80">
              <span className="rounded-full bg-white/15 px-2.5 py-1">
                支持 pdf/doc/xls/ppt/zip/图片
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">单文件 ≤ 50MB</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-white hover:bg-white/20"
            onClick={() => setShareOpen(true)}
            title="分享"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        {member && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 p-2.5 backdrop-blur">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: member.avatar_color }}
            >
              {member.nickname.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{member.nickname}</div>
              <div className="text-[11px] text-blue-50/75">
                {member.role === 'admin' ? '管理员' : '成员'} · 已上传 {member.upload_count} 份
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg bg-white/20 text-xs text-white hover:bg-white/30"
            >
              <Link href="/settings">偏好</Link>
            </Button>
          </div>
        )}
      </Card>

      {/* 上传入口 */}
      {visible.upload && (
        <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base shadow-md">
          <Link href="/upload">
            <Upload className="h-5 w-5" />
            上传资料
          </Link>
        </Button>
      )}

      {/* 快捷 DDL 新建 */}
      {visible.deadlines && member && (
        <Button
          variant="outline"
          size="lg"
          className="h-13 w-full rounded-2xl border-dashed text-base"
          onClick={() => {
            setEditing(null)
            setDdlDialog(true)
          }}
        >
          <Plus className="h-5 w-5" />
          新建 DDL
        </Button>
      )}

      {/* 按用户偏好 + 排序渲染模块 */}
      {order.map((key) => {
        if (!visible[key]) return null
        if (key === 'upload') return null // 已单独渲染
        return (
          <div key={key}>
            {key === 'memberWall' && <MemberWall />}
            {key === 'materials' && (
              <div>
                <MaterialList limit={6} />
              </div>
            )}
            {key === 'deadlines' && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <CalendarClock className="h-4 w-4" />
                    DDL 看板
                    {publicDdls.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                        {publicDdls.length}
                      </span>
                    )}
                  </h2>
                  <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg px-2.5 text-xs">
                    <Link href="/deadlines">全部 ›</Link>
                  </Button>
                </div>

                {!member ? (
                  <Card className="p-6 text-center">
                    <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">登记后查看群成员的 DDL</p>
                  </Card>
                ) : ddlLoading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
                ) : (
                  <DeadlineBoard
                    list={publicDdls}
                    onEdit={(d) => {
                      setEditing(d)
                      setDdlDialog(true)
                    }}
                    onChanged={loadDdls}
                    emptyHint="群里还没有公开 DDL，创建一个试试"
                  />
                )}
              </section>
            )}
          </div>
        )
      })}

      {/* 全部模块都被关掉 */}
      {order.every((k) => k !== 'upload' && !visible[k]) && (
        <Card className="p-8 text-center">
          <div className="mb-2 text-3xl">🧩</div>
          <p className="text-sm font-medium">首页模块都被你关掉了</p>
          <p className="mt-1 text-xs text-muted-foreground">去设置里重新开启</p>
          <Button asChild className="mt-4 h-10 px-5">
            <Link href="/settings">去设置</Link>
          </Button>
        </Card>
      )}

      <footer className="pb-4 pt-2 text-center text-[11px] text-muted-foreground">
        {APP_NAME} · {CATEGORIES.length} 个分类 · 资料大家共建
      </footer>

      <DeadlineDialog
        open={ddlDialog}
        onOpenChange={setDdlDialog}
        editing={editing}
        onSaved={loadDdls}
      />
      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  )
}