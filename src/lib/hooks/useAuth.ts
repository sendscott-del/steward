'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

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

  // Check admin status when user changes
  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setAdminChecked(true)
      return
    }
    setAdminChecked(false)
    supabase
      .from('lsw_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setIsAdmin((data ?? []).length > 0)
        setAdminChecked(true)
      })
  }, [user])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading: loading || !adminChecked, isAdmin, signOut }
}
