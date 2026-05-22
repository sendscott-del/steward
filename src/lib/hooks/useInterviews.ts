'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Interview, StakeRole } from '@/lib/types'

export interface PresidencyMember {
  id: string
  full_name: string | null
  email: string | null
  stake_role: StakeRole
}

interface UseInterviewsResult {
  interviews: Interview[]
  members: PresidencyMember[]
  loading: boolean
  refresh: () => Promise<void>
  createInterview: (input: {
    interviewee_name: string
    interviewee_calling?: string | null
    assigned_to_user_id?: string | null
    year: number
    quarter_num: 1 | 2 | 3 | 4
  }) => Promise<Interview | null>
  updateInterview: (id: string, patch: Partial<Interview>) => Promise<void>
  toggleComplete: (interview: Interview, completedDate: string | null) => Promise<void>
  deleteInterview: (id: string) => Promise<void>
}

export function useInterviews(year: number, currentUserId: string | undefined): UseInterviewsResult {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [members, setMembers] = useState<PresidencyMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [interviewsRes, membersRes] = await Promise.all([
      supabase
        .from('steward_interviews')
        .select('*')
        .eq('year', year)
        .order('interviewee_name', { ascending: true }),
      supabase
        .from('steward_user_profiles')
        .select('id, full_name, email, stake_role')
        .eq('status', 'approved')
        .in('stake_role', [
          'stake_president',
          'first_counselor',
          'second_counselor',
          'exec_secretary',
          'stake_clerk',
        ]),
    ])

    if (!interviewsRes.error) setInterviews((interviewsRes.data ?? []) as Interview[])
    if (!membersRes.error) setMembers((membersRes.data ?? []) as PresidencyMember[])
    setLoading(false)
  }, [year])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const createInterview: UseInterviewsResult['createInterview'] = useCallback(
    async (input) => {
      if (!currentUserId) return null
      const { data, error } = await supabase
        .from('steward_interviews')
        .insert({
          ...input,
          last_updated_by: currentUserId,
        })
        .select('*')
        .single()
      if (error) {
        console.warn('[interviews] create error:', error.message)
        return null
      }
      const row = data as Interview
      setInterviews((prev) => [...prev, row].sort((a, b) =>
        a.interviewee_name.localeCompare(b.interviewee_name)
      ))
      return row
    },
    [currentUserId]
  )

  const updateInterview: UseInterviewsResult['updateInterview'] = useCallback(
    async (id, patch) => {
      if (!currentUserId) return
      // Optimistic update
      setInterviews((prev) =>
        prev.map((iv) => (iv.id === id ? { ...iv, ...patch } : iv))
      )
      const { error } = await supabase
        .from('steward_interviews')
        .update({ ...patch, last_updated_by: currentUserId })
        .eq('id', id)
      if (error) {
        console.warn('[interviews] update error:', error.message)
        // Reload to revert if mutation failed
        fetchAll()
      }
    },
    [currentUserId, fetchAll]
  )

  const toggleComplete: UseInterviewsResult['toggleComplete'] = useCallback(
    async (interview, completedDate) => {
      await updateInterview(interview.id, { completed_at: completedDate })
    },
    [updateInterview]
  )

  const deleteInterview: UseInterviewsResult['deleteInterview'] = useCallback(
    async (id) => {
      // Optimistic
      setInterviews((prev) => prev.filter((iv) => iv.id !== id))
      const { error } = await supabase.from('steward_interviews').delete().eq('id', id)
      if (error) {
        console.warn('[interviews] delete error:', error.message)
        fetchAll()
      }
    },
    [fetchAll]
  )

  return {
    interviews,
    members,
    loading,
    refresh: fetchAll,
    createInterview,
    updateInterview,
    toggleComplete,
    deleteInterview,
  }
}

export function currentQuarter(date: Date = new Date()): { year: number; quarter_num: 1 | 2 | 3 | 4 } {
  return {
    year: date.getFullYear(),
    quarter_num: (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  }
}
