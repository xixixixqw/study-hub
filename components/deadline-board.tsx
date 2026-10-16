'use client'

import { useMemo } from 'react'
import { CalendarClock, CheckCircle2, CalendarDays, Inbox } from 'lucide-react'
import { groupDeadlines, filterHiddenDeadlines, type DeadlineGroup } from '@/lib/api'
import { useMember } from '@/lib/member-context'
import DeadlineCard from '@/components/deadline-card'
import { EmptyState } from '@/components/ui/states'
import type { Deadline } from '@/lib/types'

const GROUPS: { key: DeadlineGroup; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: 'today', label: '今天到期', icon: <CalendarClock className="h-4 w-4" />, accent: 'text-red-600' },
  { key: 'week', label: '本周内', icon: <CalendarDays className="h-4 w-4" />, accent: 'text-amber-600' },
  { key: 'upcoming', label: '即将到期', icon: <Inbox className="h-4 w-4" />, accent: 'text-blue-600' },
  { key: 'done', label: '已完成', icon: <CheckCircle2 className="h-4 w-4" />, accent: 'text-emerald-600' },
]

export default function DeadlineBoard({
  list,
  onEdit,
  onChanged,
  emptyHint,
}: {
  list: Deadline[]
  onEdit: (d: Deadline) => void
  onChanged: () => void
  emptyHint?: string
}) {
  const { prefs, member, isAdmin } = useMember()

  const groups = useMemo(() => {
    let visible = list
    // 剔除自己隐藏的 DDL
    visible = filterHiddenDeadlines(visible, prefs.hidden_deadline_ids || [])
    return groupDeadlines(visible)
  }, [list, prefs.hidden_deadline_ids])

  const hasAny = list.length > 0

  if (!hasAny) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-8 w-8" />}
        title="还没有DDL"
        description={emptyHint || '点右下角「+」创建你的第一个截止任务'}
      />
    )
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const items = groups[g.key]
        if (items.length === 0) return null
        return (
          <section key={g.key}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className={g.accent}>{g.icon}</span>
              <h3 className={`text-sm font-semibold ${g.accent}`}>{g.label}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {items.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {items.map((d) => (
                <DeadlineCard
                  key={d.id}
                  d={d}
                  onEdit={onEdit}
                  onChanged={onChanged}
                  showMember={
                    d.member_id !== member?.id
                      ? isAdmin
                        ? '我可见'
                        : undefined
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}