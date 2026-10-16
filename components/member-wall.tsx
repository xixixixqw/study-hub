'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, EyeOff, Crown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CardSkeletonList, EmptyState, ErrorState, SectionTitle } from '@/components/ui/states'
import AvatarPicker from '@/components/avatar-picker'
import { fetchMembers, fetchPreferencesMap } from '@/lib/api'
import { useMember } from '@/lib/member-context'
import { formatDate, maskQQ } from '@/lib/utils'
import type { Member } from '@/lib/types'

type PrefRow = {
  show_qq?: boolean
  show_upload_count?: boolean
  show_join_time?: boolean
}

export default function MemberWall() {
  const { member } = useMember()
  const [members, setMembers] = useState<Member[]>([])
  const [prefs, setPrefs] = useState<Record<string, PrefRow>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchMembers()
      setMembers(list)
      setPrefs(await fetchPreferencesMap(list.map((m) => m.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载成员失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // 按成员自己的偏好脱敏：本人可见自己的全部信息
  const visible = useMemo(
    () =>
      members.map((m) => {
        const isSelf = m.id === member?.id
        const p = prefs[m.id] || {}
        return {
          ...m,
          displayQQ: isSelf ? m.qq : p.show_qq ? m.qq : null,
          displayUpload: isSelf ? m.upload_count : p.show_upload_count !== false ? m.upload_count : null,
          displayJoin: isSelf ? m.created_at : p.show_join_time !== false ? m.created_at : null,
        }
      }),
    [members, prefs, member]
  )

  if (loading) return <CardSkeletonList count={2} />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="还没有成员加入"
        description="把链接转发到群里，同学登记暗号后就会出现在这里"
      />
    )
  }

  return (
    <section>
      <SectionTitle title="成员墙" count={visible.length} icon={<Users className="h-4 w-4" />} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((m) => (
          <Card key={m.id} className="relative p-3.5 transition-shadow hover:shadow-md">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm"
                  style={{ backgroundColor: m.avatar_color || '#2563eb' }}
                >
                  {m.nickname.slice(0, 1).toUpperCase()}
                </div>
                {m.role === 'admin' && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white"
                    title="管理员"
                  >
                    <Crown className="h-3 w-3 text-white" />
                  </span>
                )}
                {m.id === member?.id && (
                  <div className="absolute -bottom-1 -left-1">
                    <AvatarPicker
                      nickname={m.nickname}
                      current={m.avatar_color}
                      onChange={() => load()}
                      trigger={<PaletteDot />}
                    />
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1">
                <span className="truncate text-sm font-semibold">{m.nickname}</span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                {m.displayQQ ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {maskQQ(m.displayQQ)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-0.5 text-[10px]">
                    <EyeOff className="h-2.5 w-2.5" />
                    QQ 隐藏
                  </Badge>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>
                  {m.displayUpload !== null ? `📄 ${m.displayUpload}` : '📄 已隐藏'}
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  {m.displayJoin ? `🕐 ${formatDate(m.displayJoin).slice(5)}` : '🕐 已隐藏'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function PaletteDot() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white shadow-sm">
      🎨
    </span>
  )
}