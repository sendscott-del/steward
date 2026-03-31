'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Auth session — this controls the loading state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Admin check — runs in background, never blocks loading
  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }

    let cancelled = false

    supabase
      .from('lsw_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setIsAdmin(false)
        } else {
          setIsAdmin((data ?? []).length > 0)
        }
      })

    return () => { cancelled = true }
  }, [user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, isAdmin, signOut }
}
