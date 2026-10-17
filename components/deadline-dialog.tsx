'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { InlineError } from '@/components/ui/states'
import {
  createDeadline, deleteDeadline, setDeadlineStatus, updateDeadline,
  type DeadlineInput,
} from '@/lib/api'
import { useMember } from '@/lib/member-context'
import { toLocalInputValue, fromLocalInputValue } from '@/lib/utils'
import type { Deadline, RemindBefore } from '@/lib/types'
import { toast } from 'sonner'

const REMIND_OPTIONS = [
  { v: '0', label: '准时提醒' },
  { v: '1h', label: '提前 1 小时' },
  { v: '1d', label: '提前 1 天' },
  { v: '3d', label: '提前 3 天' },
]

export default function DeadlineDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Deadline | null
  onSaved: () => void
}) {
  const { member } = useMember()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [remind, setRemind] = useState<RemindBefore>('1d')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description || '')
      setDueAt(toLocalInputValue(editing.due_at))
      setRemind(editing.remind_before)
      setVisibility(editing.visibility)
    } else {
      const d = new Date(Date.now() + 24 * 3600 * 1000)
      setTitle('')
      setDescription('')
      setDueAt(toLocalInputValue(d.toISOString()))
      setRemind('1d')
      setVisibility('public')
    }
    setErr(null)
  }, [open, editing])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!member) return setErr('请先登记加入')
    if (!title.trim()) return setErr('请填写 DDL 标题')
    if (!dueAt) return setErr('请选择截止时间')

    setBusy(true)
    try {
      const payload: DeadlineInput = {
        title: title.trim(),
        description: description.trim(),
        due_at: fromLocalInputValue(dueAt),
        remind_before: remind,
        visibility,
      }
      if (editing) {
        await updateDeadline(editing.id, {
          title: payload.title,
          description: payload.description,
          due_at: payload.due_at,
          remind_before: payload.remind_before,
          visibility: payload.visibility,
        })
        toast.success('DDL 已更新')
      } else {
        await createDeadline(member.id, payload)
        toast.success('DDL 已创建')
      }
      onSaved()
      onOpenChange(false)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!editing) return
    if (!window.confirm(`确定删除 DDL「${editing.title}」？`)) return
    setBusy(true)
    try {
      await deleteDeadline(editing.id)
      toast.success('已删除')
      onSaved()
      onOpenChange(false)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const toggleDone = async () => {
    if (!editing) return
    try {
      await setDeadlineStatus(editing.id, editing.status === 'done' ? 'todo' : 'done')
      toast.success(editing.status === 'done' ? '已恢复为待办' : '标记完成')
      onSaved()
      onOpenChange(false)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '操作失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑 DDL' : '新建 DDL'}</DialogTitle>
          <DialogDescription>设置截止时间与提醒方式</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="ddl-title">标题 <span className="text-red-500">*</span></Label>
            <Input
              id="ddl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：数据结构实验报告提交"
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ddl-due">截止时间 <span className="text-red-500">*</span></Label>
            <Input
              id="ddl-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>提醒方式</Label>
            <div className="grid grid-cols-2 gap-2">
              {REMIND_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setRemind(o.v as RemindBefore)}
                  className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                    remind === o.v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>可见性</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                  visibility === 'public'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-slate-50'
                }`}
              >
                公开
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                  visibility === 'private'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-slate-50'
                }`}
              >
                仅自己可见
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ddl-desc">备注</Label>
            <Textarea
              id="ddl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充说明（选填）"
              className="min-h-[72px]"
            />
          </div>

          <InlineError message={err} />

          <div className="flex gap-2">
            {editing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1"
                  disabled={busy}
                  onClick={toggleDone}
                >
                  {editing.status === 'done' ? '恢复待办' : '标记完成'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 text-red-600 hover:bg-red-50"
                  disabled={busy}
                  onClick={remove}
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button type="submit" className="h-11 flex-1" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? '保存修改' : '创建'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}