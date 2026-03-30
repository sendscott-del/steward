'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, countApplicableDays } from '@/lib/dates'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'

interface LswData {
  categories: Category[]
  behaviors: Behavior[] // active only
  archivedBehaviors: Behavior[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  loading: boolean
  refresh: () => Promise<void>
  upsertEntry: (behaviorId: string, date: string, value: EntryValue | null) => Promise<void>
  upsertComment: (behaviorId: string, date: string, comment: string) => Promise<void>
}

function entryKey(behaviorId: string, date: string): string {
  return `${behaviorId}_${date}`
}

export function useLswData(userId: string | undefined, weekDates: Date[]): LswData {
  const [categories, setCategories] = useState<Category[]>([])
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [archivedBehaviors, setArchivedBehaviors] = useState<Behavior[]>([])
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map())
  const [comments, setComments] = useState<Map<string, CellComment>>(new Map())
  const [loading, setLoading] = useState(true)

  const dateStrings = weekDates.map(formatDate)
  const dateKey = dateStrings.join(',')

  const fetchData = useCallback(async () => {
    if (!userId || weekDates.length === 0) return
    setLoading(true)

    const [catRes, activeBehRes, archivedBehRes, entRes, comRes] = await Promise.all([
      supabase
        .from('lsw_categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order'),
      supabase
        .from('lsw_behaviors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('sort_order'),
      supabase
        .from('lsw_behaviors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', true)
        .order('sort_order'),
      supabase
        .from('lsw_entries')
        .select('*')
        .eq('user_id', userId)
        .in('entry_date', dateStrings),
      supabase
        .from('lsw_cell_comments')
        .select('*')
        .eq('user_id', userId)
        .in('entry_date', dateStrings),
    ])

    setCategories(catRes.data ?? [])
    setBehaviors(activeBehRes.data ?? [])
    setArchivedBehaviors(archivedBehRes.data ?? [])

    const entryMap = new Map<string, Entry>()
    for (const e of entRes.data ?? []) {
      entryMap.set(entryKey(e.behavior_id, e.entry_date), e)
    }
    setEntries(entryMap)

    const commentMap = new Map<string, CellComment>()
    for (const c of comRes.data ?? []) {
      commentMap.set(entryKey(c.behavior_id, c.entry_date), c)
    }
    setComments(commentMap)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const upsertEntry = useCallback(async (behaviorId: string, date: string, value: EntryValue | null) => {
    if (!userId) return
    const key = entryKey(behaviorId, date)

    if (value === null) {
      setEntries(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      await supabase
        .from('lsw_entries')
        .delete()
        .eq('behavior_id', behaviorId)
        .eq('entry_date', date)
        .eq('user_id', userId)
    } else {
      const optimistic: Entry = { id: key, behavior_id: behaviorId, entry_date: date, value }
      setEntries(prev => new Map(prev).set(key, optimistic))
      await supabase
        .from('lsw_entries')
        .upsert(
          { user_id: userId, behavior_id: behaviorId, entry_date: date, value, updated_at: new Date().toISOString() },
          { onConflict: 'behavior_id,entry_date' }
        )
    }
  }, [userId])

  const upsertComment = useCallback(async (behaviorId: string, date: string, comment: string) => {
    if (!userId) return
    const key = entryKey(behaviorId, date)

    if (comment.trim() === '') {
      setComments(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      await supabase
        .from('lsw_cell_comments')
        .delete()
        .eq('behavior_id', behaviorId)
        .eq('entry_date', date)
        .eq('user_id', userId)
    } else {
      const optimistic: CellComment = { id: key, behavior_id: behaviorId, entry_date: date, comment }
      setComments(prev => new Map(prev).set(key, optimistic))
      await supabase
        .from('lsw_cell_comments')
        .upsert(
          { user_id: userId, behavior_id: behaviorId, entry_date: date, comment, updated_at: new Date().toISOString() },
          { onConflict: 'behavior_id,entry_date' }
        )
    }
  }, [userId])

  return { categories, behaviors, archivedBehaviors, entries, comments, loading, refresh: fetchData, upsertEntry, upsertComment }
}

// Calculate completion % using frequency-based denominator
export function calculateCompletion(
  behaviors: Behavior[],
  entries: Map<string, Entry>,
  weekDates: Date[]
): number {
  if (behaviors.length === 0 || weekDates.length === 0) return 0

  let completed = 0
  let total = 0

  for (const behavior of behaviors) {
    const applicableDays = countApplicableDays(
      weekDates,
      behavior.frequency,
      behavior.days_of_week ?? undefined,
      behavior.monthly_pattern ?? undefined
    )
    total += applicableDays

    for (const date of weekDates) {
      const key = `${behavior.id}_${formatDate(date)}`
      const entry = entries.get(key)
      if (entry?.value === 'y') {
        completed++
      }
    }
  }

  return total === 0 ? 0 : (completed / total) * 100
}
