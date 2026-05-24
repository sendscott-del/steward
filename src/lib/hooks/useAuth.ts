'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { StakeRole } from '@/lib/types'

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'new' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)
  const [userStatus, setUserStatus] = useState<UserStatus>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [stakeRole, setStakeRole] = useState<StakeRole | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const checkedUserId = useRef<string | null>(null)

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
    const uid = user?.id ?? null

    if (!uid) {
      setIsAdmin(false)
      setAdminLoading(false)
      setUserStatus(null)
      setStatusLoading(false)
      setStakeRole(null)
      setSelectedTemplateId(null)
      checkedUserId.current = null
      return
    }

    if (checkedUserId.current === uid) return

    setAdminLoading(true)
    setStatusLoading(true)

    // Check admin status
    supabase
      .from('steward_admins')
      .select('user_id')
      .eq('user_id', uid)
      .then(({ data, error }) => {
        const result = !error && (data ?? []).length > 0
        setIsAdmin(result)
        setAdminLoading(false)
        // Admins are always approved
        if (result) {
          setUserStatus('approved')
          setStatusLoading(false)
          checkedUserId.current = uid
        }
      })

    // Check user profile status + stake role + template assignment
    supabase
      .from('steward_user_profiles')
      .select('status, stake_role, selected_template_id')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserStatus(data.status as UserStatus)
          setStakeRole((data.stake_role as StakeRole | null) ?? null)
          setSelectedTemplateId((data.selected_template_id as string | null) ?? null)
        } else {
          setUserStatus('new') // no profile yet — needs to pick a calling
          setStakeRole(null)
          setSelectedTemplateId(null)
        }
        setStatusLoading(false)
        checkedUserId.current = uid
      })
  }, [user?.id])

  const signOut = async () => {
    checkedUserId.current = null
    await supabase.auth.signOut()
  }

  const refreshStatus = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('steward_user_profiles')
      .select('status, stake_role, selected_template_id')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setUserStatus(data.status as UserStatus)
      setStakeRole((data.stake_role as StakeRole | null) ?? null)
      setSelectedTemplateId((data.selected_template_id as string | null) ?? null)
    }
  }

  const canManageInterviews =
    isAdmin ||
    stakeRole === 'stake_president' ||
    stakeRole === 'first_counselor' ||
    stakeRole === 'second_counselor' ||
    stakeRole === 'exec_secretary' ||
    stakeRole === 'stake_clerk'

  // Approved but no template yet — happens when Gather granted S access and the
  // user hasn't picked their calling yet. They get a self-serve picker.
  const needsTemplate =
    !isAdmin && userStatus === 'approved' && !selectedTemplateId

  return {
    user, loading, isAdmin, adminLoading, userStatus, statusLoading,
    stakeRole, selectedTemplateId, needsTemplate,
    canManageInterviews, signOut, refreshStatus,
  }
}
