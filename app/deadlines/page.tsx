'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, CalendarPlus, Users, ListTodo, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSkeletonList, ErrorState } from '@/components/ui/states'
import DeadlineBoard from '@/components/deadline-board'
import DeadlineDialog from '@/components/deadline-dialog'
import { fetchDeadlines } from '@/lib/api'
import { downloadIcs } from '@/lib/ics'
import { useMember } from '@/lib/member-context'
import { cn } from '@/lib/utils'
import type { Deadline } from '@/lib/types'
import { toast } from 'sonner'

type Scope = 'all' | 'mine'
type Status = 'all' | 'todo' | 'done'

export default function DeadlinesPage() {
  const { member, prefs, setPrefs } = useMember()
  const [list, setList] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>('all')
  const [status, setStatus] = useState<Status>('all')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Deadline | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchDeadlines({
        scope,
        status: status === 'all' ? undefined : status,
      })
      setList(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载 DDL 失败')
    } finally {
      setLoading(false)
    }
  }, [scope, status])

  useEffect(() => {
    load()
  }, [load])

  const exportIcs = () => {
    const items = list
      .filter((d) => d.status === 'todo')
      .map((d) => ({
        uid: d.id,
        title: d.title,
        description: d.description,
        dueAt: d.due_at,
        url: typeof window !== 'undefined' ? `${window.location.origin}/deadlines` : null,
      }))
    if (items.length === 0) {
      toast.error('没有可导出的待办DDL')
      return
    }
    downloadIcs(items, '我的DDL.ics')
    toast.success(`已导出 ${items.length} 条到日历`)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-semibold">DDL 看板</h1>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-lg px-3 text-xs"
          onClick={exportIcs}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          导出日历
        </Button>
      </div>

      {/* 筛选 */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: 'all' as Scope, label: '全部群成员', icon: <Users className="h-3.5 w-3.5" /> },
              { v: 'mine' as Scope, label: '我的 DDL', icon: <ListTodo className="h-3.5 w-3.5" /> },
            ]
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setScope(o.v)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors',
                scope === o.v
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { v: 'all' as Status, label: '全部状态' },
              { v: 'todo' as Status, label: '待完成' },
              { v: 'done' as Status, label: '已完成' },
            ]
          ).map((o) => (
            <button
              key={o.v}
              onClick={() => setStatus(o.v)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                status === o.v
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              <Filter className="h-3 w-3" />
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CardSkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DeadlineBoard
          list={list}
          onEdit={(d) => {
            setEditing(d)
            setDialog(true)
          }}
          onChanged={load}
          emptyHint={
            scope === 'mine'
              ? '点右下角「+」创建你的第一个 DDL'
              : '群里还没有 DDL，先建一个吧'
          }
        />
      )}

      {/* 隐藏的DDL 管理入口 */}
      {(prefs.hidden_deadline_ids || []).length > 0 && (
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <div className="text-xs text-muted-foreground">
            你隐藏了 {prefs.hidden_deadline_ids.length} 条 DDL
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-8 text-xs text-primary"
            onClick={() => {
              setPrefs({ ...prefs, hidden_deadline_ids: [] })
              toast.success('已取消隐藏全部 DDL')
            }}
          >
            取消隐藏全部
          </Button>
        </div>
      )}

      {/* FAB */}
      {member && (
        <button
          onClick={() => {
            setEditing(null)
            setDialog(true)
          }}
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform active:scale-90"
          style={{ right: 'max(1rem, calc(50vw - 16rem + 1rem))' }}
          aria-label="新建DDL"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <DeadlineDialog
        open={dialog}
        onOpenChange={setDialog}
        editing={editing}
        onSaved={load}
      />
    </div>
  )
}