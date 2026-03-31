'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, countApplicableDays, getWeekDates, prevWeek, matchesRecurrence } from '@/lib/dates'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'

interface LswData {
  categories: Category[]
  behaviors: Behavior[]
  archivedBehaviors: Behavior[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  complianceMap: Map<string, number | null> // behaviorId -> 4-week rolling %
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
  const [complianceMap, setComplianceMap] = useState<Map<string, number | null>>(new Map())
  const [loading, setLoading] = useState(true)

  const dateStrings = weekDates.map(formatDate)
  const dateKey = dateStrings.join(',')

  // Get 4-week date range for compliance calculation
  const fourWeekDates = useCallback(() => {
    if (weekDates.length === 0) return []
    const weekStart = weekDates[0]
    const dates: Date[] = []
    let ws = weekStart
    for (let i = 0; i < 4; i++) {
      dates.push(...getWeekDates(ws))
      ws = prevWeek(ws)
    }
    return dates
  }, [weekDates])

  const fetchData = useCallback(async () => {
    if (!userId || weekDates.length === 0) return
    setLoading(true)

    // Get 4-week date range for compliance
    const allDates = fourWeekDates()
    const allDateStrings = allDates.map(formatDate)

    const [catRes, activeBehRes, archivedBehRes, entRes, comRes, complianceEntRes] = await Promise.all([
      supabase.from('lsw_categories').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('lsw_behaviors').select('*').eq('user_id', userId).eq('is_archived', false).order('sort_order'),
      supabase.from('lsw_behaviors').select('*').eq('user_id', userId).eq('is_archived', true).order('sort_order'),
      supabase.from('lsw_entries').select('*').eq('user_id', userId).in('entry_date', dateStrings),
      supabase.from('lsw_cell_comments').select('*').eq('user_id', userId).in('entry_date', dateStrings),
      supabase.from('lsw_entries').select('*').eq('user_id', userId).in('entry_date', allDateStrings),
    ])

    setCategories(catRes.data ?? [])
    const activeBehaviors = (activeBehRes.data ?? []) as Behavior[]
    setBehaviors(activeBehaviors)
    setArchivedBehaviors(archivedBehRes.data ?? [])

    const entryMap = new Map<string, Entry>()
    for (const e of entRes.data ?? []) entryMap.set(entryKey(e.behavior_id, e.entry_date), e)
    setEntries(entryMap)

    const commentMap = new Map<string, CellComment>()
    for (const c of comRes.data ?? []) commentMap.set(entryKey(c.behavior_id, c.entry_date), c)
    setComments(commentMap)

    // Calculate 4-week compliance per behavior
    const compEntries = new Map<string, Entry>()
    for (const e of complianceEntRes.data ?? []) compEntries.set(entryKey(e.behavior_id, e.entry_date), e)

    const cMap = new Map<string, number | null>()
    for (const beh of activeBehaviors) {
      const applicable = allDates.filter(d =>
        matchesRecurrence(d, beh.repeat_unit ?? 'day', beh.repeat_interval ?? 1, beh.days_of_week ?? undefined, beh.monthly_pattern ?? undefined)
      )
      if (applicable.length === 0) {
        cMap.set(beh.id, null)
        continue
      }
      let completed = 0
      for (const d of applicable) {
        const key = entryKey(beh.id, formatDate(d))
        if (compEntries.get(key)?.value === 'y') completed++
      }
      cMap.set(beh.id, (completed / applicable.length) * 100)
    }
    setComplianceMap(cMap)

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateKey])

  useEffect(() => { fetchData() }, [fetchData])

  const upsertEntry = useCallback(async (behaviorId: string, date: string, value: EntryValue | null) => {
    if (!userId) return
    const key = entryKey(behaviorId, date)
    if (value === null) {
      setEntries(prev => { const next = new Map(prev); next.delete(key); return next })
      await supabase.from('lsw_entries').delete().eq('behavior_id', behaviorId).eq('entry_date', date).eq('user_id', userId)
    } else {
      setEntries(prev => new Map(prev).set(key, { id: key, behavior_id: behaviorId, entry_date: date, value }))
      await supabase.from('lsw_entries').upsert(
        { user_id: userId, behavior_id: behaviorId, entry_date: date, value, updated_at: new Date().toISOString() },
        { onConflict: 'behavior_id,entry_date' }
      )
    }
  }, [userId])

  const upsertComment = useCallback(async (behaviorId: string, date: string, comment: string) => {
    if (!userId) return
    const key = entryKey(behaviorId, date)
    if (comment.trim() === '') {
      setComments(prev => { const next = new Map(prev); next.delete(key); return next })
      await supabase.from('lsw_cell_comments').delete().eq('behavior_id', behaviorId).eq('entry_date', date).eq('user_id', userId)
    } else {
      setComments(prev => new Map(prev).set(key, { id: key, behavior_id: behaviorId, entry_date: date, comment }))
      await supabase.from('lsw_cell_comments').upsert(
        { user_id: userId, behavior_id: behaviorId, entry_date: date, comment, updated_at: new Date().toISOString() },
        { onConflict: 'behavior_id,entry_date' }
      )
    }
  }, [userId])

  return { categories, behaviors, archivedBehaviors, entries, comments, complianceMap, loading, refresh: fetchData, upsertEntry, upsertComment }
}

// Weekly completion % for the top bar
export function calculateCompletion(
  behaviors: Behavior[],
  entries: Map<string, Entry>,
  weekDates: Date[]
): number {
  if (behaviors.length === 0 || weekDates.length === 0) return 0
  let completed = 0
  let total = 0
  for (const beh of behaviors) {
    const applicable = countApplicableDays(weekDates, beh.repeat_unit ?? 'day', beh.repeat_interval ?? 1, beh.days_of_week ?? undefined, beh.monthly_pattern ?? undefined)
    total += applicable
    for (const date of weekDates) {
      const key = `${beh.id}_${formatDate(date)}`
      if (entries.get(key)?.value === 'y') completed++
    }
  }
  return total === 0 ? 0 : (completed / total) * 100
}
