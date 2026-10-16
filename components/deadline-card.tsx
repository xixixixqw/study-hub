'use client'

import { useState } from 'react'
import {
  Check, Copy, Pencil, Trash2, Lock, EyeOff, CalendarClock, Link2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/pwa'
import { formatDateTime, remindBeforeLabel } from '@/lib/utils'
import { setDeadlineStatus, deleteDeadline, setDeadlineHidden } from '@/lib/api'
import { useMember } from '@/lib/member-context'
import type { Deadline } from '@/lib/types'
import { toast } from 'sonner'

export default function DeadlineCard({
  d,
  onEdit,
  onChanged,
  showMember,
}: {
  d: Deadline
  onEdit: (d: Deadline) => void
  onChanged: () => void
  showMember?: string
}) {
  const { member, isAdmin } = useMember()
  const [busy, setBusy] = useState(false)
  const isOwner = d.member_id === member?.id
  const canManage = isOwner || isAdmin
  const overdue = d.status === 'todo' && new Date(d.due_at).getTime() < Date.now()

  const toggle = async () => {
    setBusy(true)
    try {
      await setDeadlineStatus(d.id, d.status === 'done' ? 'todo' : 'done')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const copyTextOf = async () => {
    const ok = await copyText(`${d.title}\n截止：${formatDateTime(d.due_at)}${d.description ? `\n${d.description}` : ''}`)
    if (ok) toast.success('已复制到剪贴板')
  }

  const remove = async () => {
    if (!window.confirm(`确定删除「${d.title}」？`)) return
    setBusy(true)
    try {
      await deleteDeadline(d.id)
      toast.success('已删除')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const toggleHide = async () => {
    if (!member) return
    setBusy(true)
    try {
      await setDeadlineHidden(member.id, d.id, true)
      toast.success('已从公开看板隐藏')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      className={`p-3.5 transition-shadow hover:shadow-md ${
        d.status === 'done' ? 'opacity-60' : ''
      } ${overdue ? 'border-red-200 bg-red-50/40' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={toggle}
          disabled={!canManage || busy}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            d.status === 'done'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-primary'
          } ${!canManage ? 'cursor-not-allowed opacity-50' : ''}`}
          title={canManage ? '标记完成/取消' : '无权限'}
        >
          {d.status === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div
            className={`text-sm font-semibold leading-snug ${
              d.status === 'done' ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {d.title}
          </div>

          {d.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={overdue ? 'destructive' : 'secondary'} className="gap-0.5 text-[10px]">
              <CalendarClock className="h-2.5 w-2.5" />
              {formatDateTime(d.due_at)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {remindBeforeLabel(d.remind_before)}
            </Badge>
            {d.visibility === 'private' && (
              <Badge variant="warning" className="gap-0.5 text-[10px]">
                <Lock className="h-2.5 w-2.5" />
                私有
              </Badge>
            )}
            {showMember && (
              <Badge variant="secondary" className="text-[10px]">{showMember}</Badge>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5" onClick={copyTextOf} title="复制">
              <Copy className="h-3.5 w-3.5" />
            </Button>

            {d.related_material_id && (
              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5" title="关联资料">
                <a href={`/material/${d.related_material_id}`}>
                  <Link2 className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}

            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5"
                  onClick={() => onEdit(d)}
                  title="编辑"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5 text-red-600 hover:bg-red-50"
                  onClick={remove}
                  disabled={busy}
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {!isOwner && d.visibility === 'public' && member && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5"
                onClick={toggleHide}
                disabled={busy}
                title="从公开看板隐藏"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}