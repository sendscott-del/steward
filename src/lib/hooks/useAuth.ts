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
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null)
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
      setSelectedTemplateName(null)
      checkedUserId.current = null
      return
    }

    if (checkedUserId.current === uid) return

    setAdminLoading(true)
    setStatusLoading(true)

    // Run both checks together so admin status wins over profile status
    Promise.all([
      supabase.from('steward_admins').select('user_id').eq('user_id', uid),
      supabase.from('steward_user_profiles')
        .select('status, stake_role, selected_template_id, selected_template_name')
        .eq('id', uid)
        .maybeSingle(),
    ]).then(([adminResult, profileResult]) => {
const adminFound = !adminResult.error && (adminResult.data ?? []).length > 0
      setIsAdmin(adminFound)
      setAdminLoading(false)

      if (adminFound) {
        // Admins are always approved regardless of profile status
        setUserStatus('approved')
      } else if (profileResult.data) {
        const d = profileResult.data
        setUserStatus(d.status as UserStatus)
        setStakeRole((d.stake_role as StakeRole | null) ?? null)
        setSelectedTemplateId((d.selected_template_id as string | null) ?? null)
        setSelectedTemplateName((d.selected_template_name as string | null) ?? null)
      } else {
        setUserStatus('new')
        setStakeRole(null)
        setSelectedTemplateId(null)
        setSelectedTemplateName(null)
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
      .select('status, stake_role, selected_template_id, selected_template_name')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setUserStatus(data.status as UserStatus)
      setStakeRole((data.stake_role as StakeRole | null) ?? null)
      setSelectedTemplateId((data.selected_template_id as string | null) ?? null)
      setSelectedTemplateName((data.selected_template_name as string | null) ?? null)
    }
  }

  const canManageInterviews =
    isAdmin ||
    stakeRole === 'stake_president' ||
    stakeRole === 'first_counselor' ||
    stakeRole === 'second_counselor' ||
    stakeRole === 'exec_secretary' ||
    stakeRole === 'stake_clerk'

  // Approved but neither a template nor a stake_role yet — happens when
  // Gather granted S access without a stake-level role and the user hasn't
  // picked their calling. They get a self-serve picker. Users who only need
  // admin access (Stake Clerk, Exec Secretary) don't have a template but DO
  // have a stake_role (auto-set from gather_user_roles) — they skip the picker.
  const needsTemplate =
    !isAdmin && userStatus === 'approved' && !selectedTemplateId && !stakeRole

  return {
    user, loading, isAdmin, adminLoading, userStatus, statusLoading,
    stakeRole, selectedTemplateId, selectedTemplateName, needsTemplate,
    canManageInterviews, signOut, refreshStatus,
  }
}
