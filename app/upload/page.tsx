'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UploadCloud, X, FileText, Loader2, CheckCircle2, AlertCircle, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Textarea, Label } from '@/components/ui/input'
import { InlineError } from '@/components/ui/states'
import { uploadMaterial } from '@/lib/api'
import { useMember } from '@/lib/member-context'
import { ALLOWED_EXT, CATEGORIES, MAX_FILE_SIZE } from '@/lib/supabase'
import { extOf, fileIconFor, formatSize, uid } from '@/lib/utils'
import { toast } from 'sonner'

interface Queued {
  id: string
  file: File
  title: string
  description: string
  category: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const { member } = useMember()
  const [queue, setQueue] = useState<Queued[]>([])
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [batchDesc, setBatchDesc] = useState('')
  const [batchCat, setBatchCat] = useState<string>('高数')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!member) {
      const t = window.setTimeout(() => router.push('/'), 100)
      return () => window.clearTimeout(t)
    }
  }, [member, router])

  const validate = (f: File): string | null => {
    const ext = extOf(f.name)
    if (!ALLOWED_EXT.includes(ext as never)) {
      return `不支持的类型 .${ext}，仅支持 ${ALLOWED_EXT.join('/')}`
    }
    if (f.size > MAX_FILE_SIZE) {
      return `文件 ${formatSize(f.size)} 超过 50MB 上限`
    }
    if (f.size === 0) return '文件为空'
    return null
  }

  const addFiles = (files: FileList | File[]) => {
    const next: Queued[] = []
    for (const f of Array.from(files)) {
      const e = validate(f)
      next.push({
        id: uid(),
        file: f,
        title: f.name.replace(/\.[^.]+$/, ''),
        description: '',
        category: batchCat,
        progress: 0,
        status: e ? 'error' : 'pending',
        error: e || undefined,
      })
    }
    setQueue((q) => [...q, ...next])
    if (next.some((x) => x.error)) {
      setErr('部分文件类型或大小不符合要求，已标红')
    } else {
      setErr(null)
    }
  }

  const patch = (id: string, p: Partial<Queued>) =>
    setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const removeItem = (id: string) =>
    setQueue((q) => q.filter((x) => x.id !== id))

  const submit = async () => {
    if (!member) return
    const valid = queue.filter((q) => q.status !== 'error')
    if (valid.length === 0) {
      setErr('没有可上传的文件')
      return
    }
    setSubmitting(true)
    let okCount = 0
    for (const item of valid) {
      patch(item.id, { status: 'uploading', progress: 5 })
      try {
        await uploadMaterial({
          member,
          file: item.file,
          title: item.title,
          description: item.description || batchDesc,
          category: item.category,
          onProgress: (p) => patch(item.id, { progress: p }),
        })
        patch(item.id, { status: 'done', progress: 100 })
        okCount++
      } catch (e) {
        patch(item.id, {
          status: 'error',
          error: e instanceof Error ? e.message : '上传失败',
        })
      }
    }
    setSubmitting(false)
    if (okCount > 0) {
      toast.success(`成功上传 ${okCount} 份资料`)
      window.setTimeout(() => router.push('/'), 900)
    } else {
      toast.error('全部上传失败，请检查后重试')
    }
  }

  const pendingCount = queue.filter((q) => q.status !== 'error').length

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">上传资料</h1>
      </div>

      {/* 拖拽区 */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
          drag
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/40 hover:bg-slate-50'
        }`}
      >
        <UploadCloud className="mb-2 h-10 w-10 text-primary" />
        <div className="text-sm font-medium">点击选择文件，或拖拽到这里</div>
        <div className="mt-1 text-xs text-muted-foreground">
          支持 {ALLOWED_EXT.join(' / ')}，单文件 ≤ 50MB
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">可一次选多个文件</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXT.map((e) => `.${e}`).join(',')}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* 批量默认设置 */}
      <Card className="space-y-3 p-4">
        <div className="text-sm font-medium">批量默认设置</div>
        <div className="space-y-1.5">
          <Label htmlFor="up-cat">默认分类</Label>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setBatchCat(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  batchCat === c
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="up-desc">默认描述（选填）</Label>
          <Textarea
            id="up-desc"
            value={batchDesc}
            onChange={(e) => setBatchDesc(e.target.value)}
            placeholder="应用于本批次所有未单独填写的文件"
            className="min-h-[64px]"
          />
        </div>
      </Card>

      <InlineError message={err} />

      {/* 队列 */}
      {queue.length > 0 && (
        <div className="space-y-2.5">
          {queue.map((q) => (
            <Card key={q.id} className="p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  {fileIconFor(q.file.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{q.file.name}</span>
                    {q.status !== 'uploading' && (
                      <button
                        onClick={() => removeItem(q.id)}
                        disabled={q.status === 'done'}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                        aria-label="移除"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{formatSize(q.file.size)}</span>
                    {q.status === 'error' && (
                      <span className="flex items-center gap-0.5 text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {q.error}
                      </span>
                    )}
                    {q.status === 'done' && (
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        已完成
                      </span>
                    )}
                  </div>

                  {q.status === 'pending' && (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={q.title}
                        onChange={(e) => patch(q.id, { title: e.target.value })}
                        placeholder="标题"
                        className="h-9 text-sm"
                      />
                      <div className="flex gap-2">
                        <select
                          value={q.category}
                          onChange={(e) => patch(q.id, { category: e.target.value })}
                          className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <Input
                          value={q.description}
                          onChange={(e) => patch(q.id, { description: e.target.value })}
                          placeholder="描述（选填）"
                          className="h-9 flex-[2] text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {(q.status === 'uploading' || q.status === 'done') && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            q.status === 'done' ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                          style={{ width: `${q.progress}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {q.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {q.progress}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 提交 */}
      {queue.length > 0 && (
        <div className="sticky bottom-20 space-y-2">
          <Button
            size="lg"
            className="h-13 w-full rounded-2xl text-base shadow-lg"
            disabled={submitting || pendingCount === 0}
            onClick={submit}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting
              ? '上传中…'
              : `上传 ${pendingCount} 份资料${batchDesc ? '（含描述）' : ''}`}
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full text-muted-foreground"
            disabled={submitting}
            onClick={() => setQueue([])}
          >
            清空列表
          </Button>
        </div>
      )}

      {queue.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          还没选择文件
        </p>
      )}
    </div>
  )
}