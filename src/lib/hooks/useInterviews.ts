'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
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

/**
 * @param enabled  set false to skip the queries entirely — the Work tab only
 *                 loads interviews for leaders who can manage them.
 */
export function useInterviews(
  year: number,
  currentUserId: string | undefined,
  enabled = true,
): UseInterviewsResult {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [members, setMembers] = useState<PresidencyMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!enabled) {
      setInterviews([])
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [interviewsRes, membersRes] = await Promise.all([
      supabase
        .from('steward_interviews')
        .select('*')
        .eq('year', year)
        .order('interviewee_name', { ascending: true }),
      // RPC, not a table read: steward_user_profiles is readable self-or-admin
      // only, so a non-admin counselor used to get an empty roster and saw
      // "Unknown" for every assignee.
      supabase.rpc('steward_presidency_members'),
    ])

    if (!interviewsRes.error) setInterviews((interviewsRes.data ?? []) as Interview[])
    if (!membersRes.error) setMembers((membersRes.data ?? []) as PresidencyMember[])
    setLoading(false)
  }, [year, enabled])

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

/**
 * The date to stamp when a quarter cell is checked. Prefers today when today
 * actually falls in that quarter (the common case); otherwise uses the last day
 * of the quarter, so clicking a Q1 cell in May doesn't stamp a May date under
 * Q1. Shared by the Quarterly Interviews page and the Work tab.
 */
export function pickCompletionDate(year: number, quarterNum: 1 | 2 | 3 | 4, today: Date): string {
  const todayYear = today.getFullYear()
  const todayQuarter = Math.floor(today.getMonth() / 3) + 1
  if (todayYear === year && todayQuarter === quarterNum) {
    return format(today, 'yyyy-MM-dd')
  }
  const quarterEnd = new Date(year, quarterNum * 3, 0) // day 0 of next month = last day of this one
  return format(quarterEnd, 'yyyy-MM-dd')
}

export function currentQuarter(date: Date = new Date()): { year: number; quarter_num: 1 | 2 | 3 | 4 } {
  return {
    year: date.getFullYear(),
    quarter_num: (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  }
}

/**
 * Returns the count of interviews that are still overdue for the current year:
 * any interview from a past quarter (within this year) that has not been
 * completed. Used by AppShell to badge the More sheet / DesktopSidebar.
 *
 * Lightweight — only fetches the current year, only the columns needed.
 * Gated on `enabled` so we don't query for users who can't manage interviews.
 */
export function useInterviewsOverdue(enabled: boolean): number {
  const [interviews, setInterviews] = useState<Pick<Interview, 'year' | 'quarter_num' | 'completed_at'>[]>([])

  useEffect(() => {
    if (!enabled) {
      setInterviews([])
      return
    }
    const year = new Date().getFullYear()
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('steward_interviews')
        .select('year, quarter_num, completed_at')
        .eq('year', year)
      if (cancelled || error) return
      setInterviews((data ?? []) as Pick<Interview, 'year' | 'quarter_num' | 'completed_at'>[])
    })()
    return () => { cancelled = true }
  }, [enabled])

  return useMemo(() => {
    if (!enabled) return 0
    const { quarter_num: currentQ } = currentQuarter()
    return interviews.filter(iv => !iv.completed_at && iv.quarter_num < currentQ).length
  }, [interviews, enabled])
}
