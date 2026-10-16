'use client'

import { useEffect, useState } from 'react'
import { detectEnv } from '@/lib/pwa'

/**
 * QQ / 微信内置浏览器提示：这类浏览器不支持 PWA 安装与系统通知，
 * 必须引导用户「右上角 → 在浏览器打开」。
 */
export default function InAppBrowserHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const env = detectEnv()
    if (env.isInAppBrowser && !env.isStandalone) {
      const t = window.setTimeout(() => setShow(true), 1500)
      return () => window.clearTimeout(t)
    }
  }, [])

  if (!show) return null

  const isQQ = typeof navigator !== 'undefined' && /\bqq\//i.test(navigator.userAgent)

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3">
      <div className="mx-auto max-w-md rounded-2xl border border-blue-200 bg-blue-50/95 p-4 shadow-lg backdrop-blur animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900">
              {isQQ ? '当前在 QQ 内置浏览器中打开' : '当前在微信内置浏览器中打开'}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-blue-800">
              内置浏览器不支持添加到桌面和系统通知。请点击
              <span className="font-semibold">右上角「···」→ 在浏览器打开</span>
              ，再选择「添加到主屏幕」。
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="shrink-0 rounded-lg p-1 text-blue-500 hover:bg-blue-100"
            aria-label="关闭提示"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}