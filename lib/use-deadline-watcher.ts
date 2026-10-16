'use client'

import { useEffect, useState } from 'react'
import { dueWithin24h, fetchDeadlines } from './api'
import { localNotify, requestNotificationPermission } from './pwa'
import { useMember } from './member-context'
import type { Deadline } from './types'

/**
 * 全局 DDL 提醒巡检：
 * - 挂载时 + 每 5 分钟拉一次自己的 todo DDL
 * - 24h 内到期 → 弹窗提示 + 红点 + 系统通知（需授权）
 * - 已弹过的存localStorage，跨会话只提醒一次
 */
export function useDeadlineWatcher(): {
  dueSoon: Deadline[]
  dismissed: boolean
  dismiss: () => void
} {
  const { member } = useMember()
  const [dueSoon, setDueSoon] = useState<Deadline[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!member) return
    let alive = true

    const LS_KEY = `study-hub-ddl-dismissed-${member.id}`

    const check = async () => {
      try {
        const all = await fetchDeadlines({ scope: 'mine', status: 'todo' })
        if (!alive) return
        const soon = dueWithin24h(all)
        setDueSoon(soon)
        if (soon.length === 0) return

        const raw = localStorage.getItem(LS_KEY)
        const last = raw ? new Date(raw).getTime() : 0
        const fresh = soon.filter((d) => new Date(d.due_at).getTime() > last)
        if (fresh.length === 0) return

        const first = fresh[0]
        // 系统通知需授权；QQ 内置浏览器通常不支持 → 只走页内弹窗
        const perm = await requestNotificationPermission()
        if (perm === 'granted') {
          localNotify(
            'DDL 提醒',
            fresh.length === 1
              ? `${first.title} · ${new Date(first.due_at).toLocaleString('zh-CN')}`
              : `你有 ${fresh.length} 个 DDL 将在 24 小时内到期`
          )
        }
        localStorage.setItem(LS_KEY, new Date().toISOString())
      } catch {
        /* 静默 */
      }
    }

    check()
    const timer = window.setInterval(check, 5 * 60 * 1000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [member])

  return {
    dueSoon,
    dismissed,
    dismiss: () => setDismissed(true),
  }
}