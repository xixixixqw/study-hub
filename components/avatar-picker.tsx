'use client'

import { useState } from 'react'
import { Palette, RefreshCw } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { avatarColorFor } from '@/lib/utils'
import { updateAvatarColor } from '@/lib/register'
import { useMember } from '@/lib/member-context'
import { toast } from 'sonner'

const PRESETS = [
  '#2563eb', '#0891b2', '#059669', '#65a30d', '#ca8a04',
  '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#4f46e5',
  '#0f172a', '#475569',
]

export default function AvatarPicker({
  nickname,
  current,
  onChange,
  trigger,
}: {
  nickname: string
  current: string
  onChange: (color: string) => void
  trigger?: React.ReactNode
}) {
  const { member, refresh } = useMember()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const pick = async (c: string) => {
    setBusy(true)
    try {
      await updateAvatarColor(c)
      onChange(c)
      await refresh()
      toast.success('头像已更新')
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(true)
        }}
        title="更换头像颜色"
      >
        {trigger || <Palette className="h-4 w-4" />}
      </Button>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>选择头像颜色</DialogTitle>
          <DialogDescription>
            头像用昵称首字生成，换个颜色更好认
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: current || avatarColorFor(nickname) }}
          >
            {nickname.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-sm text-muted-foreground">当前预览</div>
        </div>

        <div className="grid grid-cols-6 gap-2.5">
          {[...PRESETS, avatarColorFor(nickname)].map((c, i) => (
            <button
              key={`${c}-${i}`}
              disabled={busy}
              onClick={() => pick(c)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform hover:scale-105 disabled:opacity-50"
              style={{ backgroundColor: c }}
              aria-label={`选择颜色 ${c}`}
            >
              {current === c ? '✓' : ''}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="h-11 w-full"
          disabled={busy}
          onClick={() => pick(avatarColorFor(nickname))}
        >
          <RefreshCw className="h-4 w-4" />
          按昵称自动生成
        </Button>
      </DialogContent>
    </Dialog>
  )
}