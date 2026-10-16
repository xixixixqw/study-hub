'use client'

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'
import type { Member, MemberPreferences } from './types'
import { DEFAULT_PREFERENCES } from './types'

const LS_MEMBER = 'study-hub-member'
const LS_PREFS = 'study-hub-prefs'

export interface MemberState {
  member: Member | null
  prefs: MemberPreferences
  session: Session | null
  loading: boolean
  isAdmin: boolean
  setMember: (m: Member | null) => void
  setPrefs: (p: MemberPreferences) => void
  patchPrefs: (patch: Partial<MemberPreferences>) => void
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  applySession: (s: Session | null) => void
}

const Ctx = createContext<MemberState | null>(null)

export function MemberProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabase(), [])
  const [member, setMemberState] = useState<Member | null>(null)
  const [prefs, setPrefsState] = useState<MemberPreferences>({
    ...DEFAULT_PREFERENCES,
  })
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const setMember = useCallback((m: Member | null) => {
    setMemberState(m)
    if (typeof window === 'undefined') return
    if (m) localStorage.setItem(LS_MEMBER, JSON.stringify(m))
    else localStorage.removeItem(LS_MEMBER)
  }, [])

  const setPrefs = useCallback((p: MemberPreferences) => {
    setPrefsState(p)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_PREFS, JSON.stringify(p))
    }
  }, [])

  const patchPrefs = useCallback((patch: Partial<MemberPreferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch }
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_PREFS, JSON.stringify(next))
      }
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    const { data: sessData } = await supabase.auth.getSession()
    const sess = sessData.session ?? null
    setSession(sess)
    if (!sess) {
      setMemberState(null)
      return
    }
    const { data: m } = await supabase
      .from('members')
      .select('*')
      .eq('auth_uid', sess.user.id)
      .maybeSingle()
    if (m) {
      setMemberState(m as Member)
      const { data: pf } = await supabase
        .from('member_preferences')
        .select('*')
        .eq('member_id', m.id)
        .maybeSingle()
      if (pf) {
        setPrefsState({
          ...DEFAULT_PREFERENCES,
          ...(pf as MemberPreferences),
          visible_modules: {
            ...DEFAULT_PREFERENCES.visible_modules,
            ...((pf as MemberPreferences).visible_modules || {}),
          },
        })
      }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setMemberState(null)
    setSession(null)
    setPrefsState({ ...DEFAULT_PREFERENCES })
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_MEMBER)
      localStorage.removeItem(LS_PREFS)
    }
  }, [supabase])

  // 1) 先用 localStorage 兜底，避免刷新白屏
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const rawM = localStorage.getItem(LS_MEMBER)
      const rawP = localStorage.getItem(LS_PREFS)
      if (rawM) setMemberState(JSON.parse(rawM) as Member)
      if (rawP) {
        setPrefsState((prev) => ({
          ...prev,
          ...(JSON.parse(rawP) as MemberPreferences),
          visible_modules: {
            ...DEFAULT_PREFERENCES.visible_modules,
            ...(JSON.parse(rawP).visible_modules || {}),
          },
        }))
      }
    } catch {
      /* localStorage 损坏则忽略 */
    }
  }, [])

  // 2) 用真实 session 校验
  useEffect(() => {
    let alive = true
    ;(async () => {
      await refresh()
      if (alive) setLoading(false)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) {
        setMemberState(null)
        if (typeof window !== 'undefined') localStorage.removeItem(LS_MEMBER)
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [refresh, supabase])

  const value: MemberState = {
    member,
    prefs,
    session,
    loading,
    isAdmin: member?.role === 'admin',
    setMember,
    setPrefs,
    patchPrefs,
    refresh,
    signOut,
    applySession: setSession,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMember(): MemberState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMember 必须在 MemberProvider 内使用')
  return ctx
}