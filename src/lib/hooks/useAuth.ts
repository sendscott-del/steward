'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

async function checkAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('lsw_admins')
      .select('user_id')
      .eq('user_id', userId)
    if (error) return false
    return (data ?? []).length > 0
  } catch {
    return false
  }
}

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
        const admin = await checkAdmin(currentUser.id)
        if (mounted) {
          setIsAdmin(admin)
          lastCheckedId.current = currentUser.id
        }
      }

      if (mounted) setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      if (!mounted) return
      setUser(currentUser)

      if (currentUser && currentUser.id !== lastCheckedId.current) {
        const admin = await checkAdmin(currentUser.id)
        if (mounted) {
          setIsAdmin(admin)
          lastCheckedId.current = currentUser.id
        }
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
