'use client'

import { CalendarClock, ExternalLink, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { Deadline } from '@/lib/types'

export default function DdlAlertDialog({
  items,
  onClose,
  onDismiss,
}: {
  items: Deadline[]
  onClose: () => void
  onDismiss: () => void
}) {
  return (
    <Dialog open onOpenChange={(v) => (v ? null : onDismiss())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <CalendarClock className="h-6 w-6" />
          </div>
          <DialogTitle>
            {items.length === 1 ? '有 1 个 DDL 即将到期' : `有 ${items.length} 个 DDL 即将到期`}
          </DialogTitle>
          <DialogDescription>24 小时内截止，建议尽快处理</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {items.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-amber-200 bg-amber-50/70 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-amber-900">{d.title}</div>
                  <div className="mt-0.5 text-xs text-amber-700">
                    {formatDateTime(d.due_at)}
                  </div>
                </div>
                {d.visibility === 'private' && (
                  <Badge variant="secondary" className="shrink-0">私有</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1" onClick={onDismiss}>
            <X className="h-4 w-4" />
            知道了
          </Button>
          <Button className="h-11 flex-1" onClick={onClose}>
            去处理
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}