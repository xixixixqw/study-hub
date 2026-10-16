'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CardSkeletonList, EmptyState, ErrorState } from '@/components/ui/states'
import {
  clearNotifications, fetchNotifications, markAllRead, markRead,
} from '@/lib/api'
import { useMember } from '@/lib/member-context'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const { member } = useMember()
  const [list, setList] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setList(await fetchNotifications())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载通知失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (member) load()
  }, [member, load])

  const unread = list.filter((n) => !n.is_read).length

  const handleClick = async (n: AppNotification) => {
    if (!n.is_read) {
      await markRead(n.id)
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    if (n.link) window.location.href = n.link
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-semibold">通知</h1>
        {unread > 0 && (
          <Badge variant="destructive">{unread} 未读</Badge>
        )}
      </div>

      {!member ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title="登记后查看通知" />
      ) : (
        <>
          {unread > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-10 flex-1 text-sm"
                onClick={async () => {
                  await markAllRead()
                  toast.success('已全部标记为已读')
                  load()
                }}
              >
                <CheckCheck className="h-4 w-4" />
                全部已读
              </Button>
              <Button
                variant="outline"
                className="h-10 px-3 text-sm"
                title="清除已读"
                onClick={async () => {
                  await clearNotifications()
                  toast.success('已清除已读通知')
                  load()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {loading ? (
            <CardSkeletonList count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-8 w-8" />}
              title="暂无通知"
              description="DDL 到期前会在这里提醒你"
            />
          ) : (
            <div className="space-y-2.5">
              {list.map((n) => (
                <Card
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleClick(n)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
                  className={cn(
                    'cursor-pointer p-3.5 transition-shadow hover:shadow-md',
                    !n.is_read && 'border-primary/40 bg-primary/[0.03]'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        'mt-1 h-2 w-2 shrink-0 rounded-full',
                        n.is_read ? 'bg-slate-300' : 'bg-primary'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'text-sm leading-snug',
                            n.is_read ? 'text-foreground' : 'font-semibold'
                          )}
                        >
                          {n.title}
                        </span>
                        {n.link && <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}
                      </div>
                      {n.content && (
                        <p className="mt-1 text-xs text-muted-foreground">{n.content}</p>
                      )}
                      <div className="mt-1 text-[11px] text-muted-foreground/80">
                        {formatDateTime(n.created_at)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}