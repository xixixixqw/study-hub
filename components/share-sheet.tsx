'use client'

import { useEffect, useRef, useState } from 'react'
import { Copy, Check, Share2, QrCode, ExternalLink } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { copyText, detectEnv } from '@/lib/pwa'
import { APP_NAME } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ShareSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const env = typeof window !== 'undefined' ? detectEnv() : null

  useEffect(() => {
    if (!open) return
    const u = typeof window !== 'undefined' ? window.location.origin + '/' : ''
    setUrl(u)
    setCopied(false)

    // 动态生成二维码（避免额外依赖打包体积）
    import('qrcode')
      .then((QRCode) =>
        QRCode.toCanvas(canvasRef.current as HTMLCanvasElement, u, {
          width: 200,
          margin: 2,
          color: { dark: '#1e293b', light: '#ffffff' },
        })
      )
      .catch(() => setQr(null))
  }, [open])

  const doCopy = async () => {
    const ok = await copyText(url)
    if (ok) {
      setCopied(true)
      toast.success('链接已复制，发到QQ群即可')
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('复制失败，请手动复制')
    }
  }

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: APP_NAME, text: '群资料共享库，一起来上传资料', url })
        return
      } catch {
        /* 用户取消 */
      }
    }
    doCopy()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>分享资料库</DialogTitle>
          <DialogDescription>复制链接或二维码，发到QQ群</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
            <canvas ref={canvasRef} width={200} height={200} className="h-[180px] w-[180px]" />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={doCopy} className="h-11">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '已复制' : '复制链接'}
          </Button>
          <Button variant="outline" className="h-11" onClick={nativeShare}>
            <Share2 className="h-4 w-4" />
            分享
          </Button>
        </div>

        {env?.isInAppBrowser && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
            <div className="mb-1 font-semibold">当前在内置浏览器中</div>
            想添加到手机桌面？点右上角「···」→<span className="font-semibold">在浏览器打开</span>
            ，再「添加到主屏幕」。
          </div>
        )}

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" />
          在新窗口预览
        </a>
      </DialogContent>
    </Dialog>
  )
}