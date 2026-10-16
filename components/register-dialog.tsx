'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { InlineError } from '@/components/ui/states'
import { useMember } from '@/lib/member-context'
import { registerWithGroupCode } from '@/lib/register'
import { toast } from 'sonner'

export default function RegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { setMember } = useMember()
  const [nickname, setNickname] = useState('')
  const [qq, setQq] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!nickname.trim()) return setErr('请填写昵称')
    if (!code.trim()) return setErr('请填写群暗号')
    setBusy(true)
    try {
      const { member } = await registerWithGroupCode({
        nickname: nickname.trim(),
        qq: qq.trim(),
        code: code.trim(),
      })
      setMember(member)
      toast.success(`欢迎加入，${member.nickname}！`)
      setNickname('')
      setQq('')
      setCode('')
      onOpenChange(false)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '登记失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle>登记加入资料库</DialogTitle>
          <DialogDescription>
            填写昵称与群暗号即可加入。暗号仅用于校验，不会公开显示。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="reg-nick">昵称 <span className="text-red-500">*</span></Label>
            <Input
              id="reg-nick"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="群里怎么称呼你"
              maxLength={24}
              autoComplete="nickname"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-qq">QQ 号（选填）</Label>
            <Input
              id="reg-qq"
              value={qq}
              onChange={(e) => setQq(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="用于群内联系，默认脱敏显示"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-code">群暗号 <span className="text-red-500">*</span></Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="向群管理员获取"
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          <InlineError message={err} />

          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? '校验中…' : '加入资料库'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            暗号不对？找群管理员要准确暗号
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}