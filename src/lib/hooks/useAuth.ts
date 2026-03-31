'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

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

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setAdminLoading(false)
      return
    }

    setAdminLoading(true)
    let cancelled = false

    supabase
      .from('lsw_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (cancelled) return
        console.log('[LSW Admin Check]', { userId: user.id, data, error, isAdmin: !error && (data ?? []).length > 0 })
        setIsAdmin(!error && (data ?? []).length > 0)
        setAdminLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, isAdmin, adminLoading, signOut }
}
