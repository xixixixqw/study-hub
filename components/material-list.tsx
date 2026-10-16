'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, FolderOpen, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CardSkeletonList, EmptyState, ErrorState, SectionTitle } from '@/components/ui/states'
import MaterialCard from '@/components/material-card'
import { fetchMaterials } from '@/lib/api'
import { CATEGORIES } from '@/lib/supabase'
import { useMember } from '@/lib/member-context'
import { cn } from '@/lib/utils'
import type { Material } from '@/lib/types'

export default function MaterialList({ limit }: { limit?: number }) {
  const { member, isAdmin } = useMember()
  const [list, setList] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState('全部')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setList(await fetchMaterials({ search: debounced, category }))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载资料失败')
    } finally {
      setLoading(false)
    }
  }, [debounced, category])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => (limit ? list.slice(0, limit) : list), [list, limit])
  const total = list.length

  return (
    <section>
      <SectionTitle
        title="资料列表"
        count={total}
        icon={<FolderOpen className="h-4 w-4" />}
        action={
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg px-2.5 lg:hidden"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            筛选
          </Button>
        }
      />

      {/* 搜索 */}
      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索标题、描述、上传者…"
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 分类 */}
      <div
        className={cn(
          'no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1',
          filterOpen ? 'flex-wrap' : ''
        )}
      >
        {['全部', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              category === c
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <CardSkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={debounced || category !== '全部' ? '没有匹配的资料' : '还没有人上传资料'}
          description={
            debounced || category !== '全部'
              ? '换个关键词或分类试试'
              : '成为第一个上传资料的人吧'
          }
          action={
            !debounced && category === '全部' ? (
              <Button asChild className="h-10 px-5">
                <a href="/upload">去上传</a>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {shown.map((m) => (
              <MaterialCard
                key={m.id}
                m={m}
                canDelete={isAdmin || m.member_id === member?.id}
                onDelete={(x) => {
                  if (window.confirm(`确定删除「${x.title}」？`)) {
                    import('@/lib/api').then(({ deleteMaterial }) =>
                      deleteMaterial(x)
                        .then(() => {
                          load()
                          return true
                        })
                    )
                  }
                }}
              />
            ))}
          </div>

          {limit && total > limit && (
            <div className="mt-4 text-center">
              <Button asChild variant="outline" className="h-11 w-full">
                <a href="/materials">查看全部 {total} 份资料</a>
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}