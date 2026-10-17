'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Download, Copy, FileText, Eye, Trash2, Pin, Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ui/states'
import { countDownload, deleteMaterial, fetchMaterial, setPinned } from '@/lib/api'
import { copyText } from '@/lib/pwa'
import { useMember } from '@/lib/member-context'
import {
  extOf, fileIconFor, formatDateTime, formatSize, isPreviewable, downloadWithName, displayNameFor,
} from '@/lib/utils'
import { toast } from 'sonner'

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { member, isAdmin } = useMember()
  const [m, setM] = useState<Awaited<ReturnType<typeof fetchMaterial>>>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setM(await fetchMaterial(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    )
  }

  if (error) return <div className="p-4"><ErrorState message={error} onRetry={load} /></div>
  if (!m) {
    return (
      <div className="p-4">
        <ErrorState message="资料不存在或已被删除" />
      </div>
    )
  }

  const canManage = isAdmin || m.member_id === member?.id
  const ext = extOf(m.file_path)
  const previewable = isPreviewable(m.mime_type, ext)
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/material/${m.id}`
    : `/material/${m.id}`

  const onDownload = async () => {
    countDownload(m.id)
    try {
      await downloadWithName(m.file_url || '#', displayNameFor(m.title, m.file_path))
    } catch {
      // 兜底：直接新窗口打开（保留原始行为）
      window.open(m.file_url || '#', '_blank', 'noopener')
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 truncate text-lg font-semibold">{m.title}</h1>
        {m.is_pinned && <Pin className="h-4 w-4 fill-amber-400 text-amber-500" />}
      </div>

      {/* 预览 */}
      <Card className="overflow-hidden">
        {previewable && view ? (
          m.mime_type?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.file_url || ''} alt={m.title} className="max-h-[60vh] w-full object-contain" />
          ) : (
            <iframe
              src={`${m.file_url}#toolbar=1&view=FitH`}
              className="h-[60vh] w-full"
              title={m.title}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-12">
            <div className="mb-3 text-6xl">{fileIconFor(m.mime_type || m.file_path)}</div>
            <div className="max-w-[80%] truncate text-sm font-medium text-slate-700">
              {m.file_path.split('/').pop()}
            </div>
            <div className="mt-1 text-xs text-slate-500">{formatSize(m.file_size)}</div>
            {previewable && (
              <Button
                variant="outline"
                className="mt-4 h-10 px-5"
                onClick={() => setView(true)}
              >
                <Eye className="h-4 w-4" />
                在线预览
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* 信息 */}
      <Card className="space-y-3 p-4">
        {m.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {m.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge>{m.category}</Badge>
          <Badge variant="secondary">{formatSize(m.file_size)}</Badge>
          {m.mime_type && <Badge variant="outline">{m.mime_type.split('/').pop()}</Badge>}
          <Badge variant="secondary">⬇ {m.download_count} 次下载</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <div>
            <div className="text-muted-foreground">上传者</div>
            <div className="mt-0.5 font-medium">{m.uploader_nickname}</div>
          </div>
          <div>
            <div className="text-muted-foreground">上传时间</div>
            <div className="mt-0.5 font-medium">{formatDateTime(m.created_at)}</div>
          </div>
        </div>
      </Card>

      {/* 操作 */}
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" className="h-13 rounded-2xl" onClick={onDownload}>
          <Download className="h-5 w-5" />
          下载
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-13 rounded-2xl"
          onClick={async () => {
            const ok = await copyText(shareUrl)
            if (ok) toast.success('资料链接已复制')
          }}
        >
          <Copy className="h-5 w-5" />
          复制链接
        </Button>
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-xl"
        onClick={async () => {
          const ok = await copyText(
            `【${m.title}】${m.description ? m.description + '\n' : ''}来自学习资料库：${shareUrl}`
          )
          if (ok) toast.success('已复制，可直接粘贴到QQ群')
        }}
      >
        <Share2 className="h-4 w-4" />
        复制分享文案
      </Button>

      {canManage && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={async () => {
              try {
                await setPinned(m.id, !m.is_pinned)
                setM({ ...m, is_pinned: !m.is_pinned })
                toast.success(m.is_pinned ? '已取消置顶' : '已置顶')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : '操作失败')
              }
            }}
          >
            <Pin className="h-4 w-4" />
            {m.is_pinned ? '取消置顶' : '置顶'}
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl text-red-600 hover:bg-red-50"
            onClick={async () => {
              if (!window.confirm(`确定删除「${m.title}」？此操作不可恢复`)) return
              try {
                await deleteMaterial(m)
                toast.success('已删除')
                router.push('/')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : '删除失败')
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
        </div>
      )}

      <Button asChild variant="ghost" className="h-10 w-full text-muted-foreground">
        <Link href="/">
          <FileText className="h-4 w-4" />
          返回资料库
        </Link>
      </Button>
    </div>
  )
}