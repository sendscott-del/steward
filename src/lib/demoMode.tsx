'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

// App Store / Play review accounts ALWAYS render demo (fake) data — never real
// member data. The flag is OR'd into demoMode so every existing demo branch in
// the data hooks applies. Keep in sync with the approved reviewer account.
export const REVIEW_DEMO_EMAILS = ['applereview@gatheredin.app']
export function isReviewDemoUser(email?: string | null): boolean {
  return !!email && REVIEW_DEMO_EMAILS.includes(email.toLowerCase())
}

export type StewardDemoRole =
  | 'stake_president'
  | 'stake_clerk'
  | 'high_councilor'
  | 'bishop'
  | 'elders_quorum_president'
  | 'relief_society_president'
  | 'member'

export const DEMO_ROLE_LABELS: Record<StewardDemoRole, string> = {
  stake_president: 'Stake President',
  stake_clerk: 'Stake Clerk',
  high_councilor: 'High Councilor',
  bishop: 'Bishop',
  elders_quorum_president: 'Elders Quorum President',
  relief_society_president: 'Relief Society President',
  member: 'Member',
}

interface DemoMode {
  /** True when the app is rendering demo data instead of real production data. */
  demoMode: boolean
  /** When demoMode is true, the role the viewer is "logged in as". */
  demoRole: StewardDemoRole
  setDemoMode: (on: boolean) => void
  setDemoRole: (role: StewardDemoRole) => void
}

const Ctx = createContext<DemoMode | null>(null)

const KEY_MODE = 'steward.demoMode'
const KEY_ROLE = 'steward.demoRole'

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoModeState] = useState(false)
  const [demoRole, setDemoRoleState] = useState<StewardDemoRole>('stake_president')
  const [reviewerForced, setReviewerForced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDemoModeState(window.localStorage.getItem(KEY_MODE) === 'on')
    const r = window.localStorage.getItem(KEY_ROLE) as StewardDemoRole | null
    if (r && r in DEMO_ROLE_LABELS) setDemoRoleState(r)
  }, [])

  // Force demo on for App Review reviewer accounts — they never see real data.
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active && isReviewDemoUser(data.session?.user?.email)) setReviewerForced(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (isReviewDemoUser(session?.user?.email)) setReviewerForced(true)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const setDemoMode = useCallback((on: boolean) => {
    setDemoModeState(on)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY_MODE, on ? 'on' : 'off')
    }
  }, [])

  const setDemoRole = useCallback((role: StewardDemoRole) => {
    setDemoRoleState(role)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY_ROLE, role)
    }
  }, [])

  return (
    <Ctx.Provider value={{ demoMode: demoMode || reviewerForced, demoRole, setDemoMode, setDemoRole }}>{children}</Ctx.Provider>
  )
}

export function useDemoMode(): DemoMode {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDemoMode must be used inside <DemoModeProvider>')
  return ctx
}
