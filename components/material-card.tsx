'use client'

import Link from 'next/link'
import { Download, Copy, Pin, Eye, EyeOff, Trash2, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/pwa'
import { fileIconFor, formatDate, formatSize } from '@/lib/utils'
import type { Material } from '@/lib/types'

export default function MaterialCard({
  m,
  canDelete,
  onDelete,
  onTogglePin,
  showPin,
}: {
  m: Material
  canDelete: boolean
  onDelete?: (m: Material) => void
  onTogglePin?: (m: Material) => void
  showPin?: boolean
}) {
  const link =
    m.file_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/file/${m.id}`

  return (
    <Card className="p-3.5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
          {fileIconFor(m.mime_type || m.file_path)}
        </div>

        <div className="min-w-0 flex-1">
          <Link href={`/material/${m.id}`} className="block">
            <div className="flex items-start gap-1.5">
              <span className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">
                {m.title}
              </span>
              {m.is_pinned && (
                <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
              )}
            </div>
          </Link>

          {m.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="default" className="text-[10px]">{m.category}</Badge>
            <Badge variant="secondary" className="text-[10px]">
              {formatSize(m.file_size)}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              <Download className="mr-0.5 h-2.5 w-2.5" />
              {m.download_count}
            </Badge>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-muted-foreground">
              {m.uploader_nickname} · {formatDate(m.created_at)}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <Button asChild size="sm" className="h-8 flex-1 rounded-lg text-xs">
              <a href={m.file_url || '#'} target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5" />
                下载
              </a>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg px-2.5"
              title="复制链接"
              onClick={async () => {
                const ok = await copyText(link)
                if (ok) {
                  const { toast } = await import('sonner')
                  toast.success('链接已复制')
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>

            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5" title="查看详情">
              <Link href={`/material/${m.id}`}>
                <FileText className="h-3.5 w-3.5" />
              </Link>
            </Button>

            {showPin && onTogglePin && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5"
                title={m.is_pinned ? '取消置顶' : '置顶'}
                onClick={() => onTogglePin(m)}
              >
                {m.is_pinned ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {canDelete && onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5 text-red-600 hover:bg-red-50"
                title="删除"
                onClick={() => onDelete(m)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}