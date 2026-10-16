'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, FolderOpen, CalendarClock, Trash2, Pin, ShieldOff,
  ShieldCheck, Loader2, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeletonList, EmptyState, ErrorState } from '@/components/ui/states'
import MaterialCard from '@/components/material-card'
import DeadlineCard from '@/components/deadline-card'
import {
  deleteDeadline, deleteMaterial, fetchDeadlines, fetchMaterials,
  fetchMembers, setPinned,
} from '@/lib/api'
import { getSupabase } from '@/lib/supabase'
import { useMember } from '@/lib/member-context'
import { maskQQ, formatDate, cn } from '@/lib/utils'
import type { Deadline, Material, Member } from '@/lib/types'
import { toast } from 'sonner'

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading: authLoading, member } = useMember()
  const [tab, setTab] = useState('materials')
  const [materials, setMaterials] = useState<Material[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [ddls, setDdls] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kw, setKw] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/login')
    }
  }, [authLoading, isAdmin, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, mem, d] = await Promise.all([
        fetchMaterials({ search: kw }),
        fetchMembers(),
        fetchDeadlines(),
      ])
      setMaterials(m)
      setMembers(mem)
      setDdls(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [kw])

  useEffect(() => {
    if (isAdmin) {
      const t = window.setTimeout(load, kw ? 400 : 0)
      return () => window.clearTimeout(t)
    }
  }, [isAdmin, load, kw])

  if (authLoading) {
    return <div className="p-4"><div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <EmptyState
          icon="🔐"
          title="需要管理员权限"
          description="请用管理员邮箱登录后访问"
          action={
            <Button asChild className="h-10 px-5">
              <Link href="/login">去登录</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const onDeleteMaterial = async (m: Material) => {
    if (!window.confirm(`删除资料「${m.title}」？文件也会一并删除`)) return
    setBusyId(m.id)
    try {
      await deleteMaterial(m)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  const onTogglePin = async (m: Material) => {
    setBusyId(m.id)
    try {
      await setPinned(m.id, !m.is_pinned)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  const onDeleteMember = async (m: Member) => {
    if (m.id === member?.id) {
      toast.error('不能删除自己')
      return
    }
    if (!window.confirm(`删除成员「${m.nickname}」？其上传的资料和 DDL 将一并删除，且不可恢复`)) return
    setBusyId(m.id)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from('members').delete().eq('id', m.id)
      if (error) throw new Error(error.message)
      toast.success('成员已删除')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  const onToggleAdmin = async (m: Member) => {
    setBusyId(m.id)
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('members')
        .update({ role: m.role === 'admin' ? 'member' : 'admin' })
        .eq('id', m.id)
      if (error) throw new Error(error.message)
      toast.success(m.role === 'admin' ? '已取消管理员' : '已设为管理员')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusyId(null)
    }
  }

  const onDeleteDdl = async (d: Deadline) => {
    if (!window.confirm(`删除 DDL「${d.title}」？`)) return
    setBusyId(d.id)
    try {
      await deleteDeadline(d.id)
      toast.success('已删除')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-semibold">管理后台</h1>
        <Badge variant="warning" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          admin
        </Badge>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: '成员', value: members.length, icon: <Users className="h-4 w-4" />, color: 'text-blue-600' },
          { label: '资料', value: materials.length, icon: <FolderOpen className="h-4 w-4" />, color: 'text-emerald-600' },
          { label: 'DDL', value: ddls.length, icon: <CalendarClock className="h-4 w-4" />, color: 'text-amber-600' },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className={cn('mb-1 flex justify-center', s.color)}>{s.icon}</div>
            <div className="text-xl font-bold leading-none">{s.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="materials" className="text-sm">资料</TabsTrigger>
          <TabsTrigger value="members" className="text-sm">成员</TabsTrigger>
          <TabsTrigger value="deadlines" className="text-sm">DDL</TabsTrigger>
        </TabsList>

        {/* 资料管理 */}
        <TabsContent value="materials" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="搜索资料…"
              className="pl-9"
            />
          </div>

          {loading ? (
            <CardSkeletonList count={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : materials.length === 0 ? (
            <EmptyState title="没有资料" />
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <div key={m.id} className={cn(busyId === m.id && 'opacity-50')}>
                  <MaterialCard
                    m={m}
                    canDelete
                    showPin
                    onDelete={onDeleteMaterial}
                    onTogglePin={onTogglePin}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 成员管理 */}
        <TabsContent value="members" className="mt-4 space-y-2.5">
          {loading ? (
            <CardSkeletonList count={4} />
          ) : members.length === 0 ? (
            <EmptyState title="还没有成员" />
          ) : (
            members.map((m) => (
              <Card key={m.id} className={cn('p-3.5', busyId === m.id && 'opacity-50')}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: m.avatar_color }}
                  >
                    {m.nickname.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{m.nickname}</span>
                      {m.role === 'admin' && (
                        <Badge variant="warning" className="text-[10px]">管理员</Badge>
                      )}
                      {m.id === member?.id && (
                        <Badge variant="secondary" className="text-[10px]">我</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {m.qq ? maskQQ(m.qq) : '未填 QQ'} · {m.upload_count} 份 · {formatDate(m.created_at)} 加入
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2"
                      title={m.role === 'admin' ? '取消管理员' : '设为管理员'}
                      onClick={() => onToggleAdmin(m)}
                    >
                      {m.role === 'admin' ? (
                        <ShieldOff className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2 text-red-600 hover:bg-red-50"
                      title="删除成员"
                      onClick={() => onDeleteMember(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* DDL 管理 */}
        <TabsContent value="deadlines" className="mt-4 space-y-2.5">
          {loading ? (
            <CardSkeletonList count={3} />
          ) : ddls.length === 0 ? (
            <EmptyState title="还没有 DDL" />
          ) : (
            ddls.map((d) => (
              <div key={d.id} className={cn(busyId === d.id && 'opacity-50')}>
                <DeadlineCard
                  d={d}
                  onEdit={() => {}}
                  onChanged={load}
                  showMember={d.member_id === member?.id ? undefined : '可管理'}
                />
                <div className="mt-1.5 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-red-600"
                    onClick={() => onDeleteDdl(d)}
                    disabled={busyId === d.id}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    强制删除
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {loading && (
        <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          加载中
        </p>
      )}
    </div>
  )
}