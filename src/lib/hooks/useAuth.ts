'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const lastCheckedId = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null

      if (!mounted) return
      setUser(currentUser)

      if (currentUser) {
        const { data } = await supabase
          .from('lsw_admins')
          .select('user_id')
          .eq('user_id', currentUser.id)

        if (!mounted) return
        setIsAdmin((data ?? []).length > 0)
        lastCheckedId.current = currentUser.id
      } else {
        setIsAdmin(false)
        lastCheckedId.current = null
      }

      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      if (!mounted) return
      setUser(currentUser)

      // Only re-check admin if user changed
      if (currentUser && currentUser.id !== lastCheckedId.current) {
        const { data } = await supabase
          .from('lsw_admins')
          .select('user_id')
          .eq('user_id', currentUser.id)

        if (!mounted) return
        setIsAdmin((data ?? []).length > 0)
        lastCheckedId.current = currentUser.id
      } else if (!currentUser) {
        setIsAdmin(false)
        lastCheckedId.current = null
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, isAdmin, signOut }
}
