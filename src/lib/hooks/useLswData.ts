'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getPeriodCells, getDefaultCount, getLast12Dates } from '@/lib/dates'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'

interface LswData {
  categories: Category[]
  behaviors: Behavior[]
  archivedBehaviors: Behavior[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  complianceMap: Map<string, number | null>
  loading: boolean
  refresh: () => Promise<void>
  upsertEntry: (behaviorId: string, date: string, value: EntryValue | null) => Promise<void>
  upsertComment: (behaviorId: string, date: string, comment: string) => Promise<void>
}

function entryKey(behaviorId: string, date: string): string {
  return `${behaviorId}_${date}`
}

export function useLswData(userId: string | undefined): LswData {
  const [categories, setCategories] = useState<Category[]>([])
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [archivedBehaviors, setArchivedBehaviors] = useState<Behavior[]>([])
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map())
  const [comments, setComments] = useState<Map<string, CellComment>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const [catRes, activeBehRes, archivedBehRes] = await Promise.all([
      supabase.from('lsw_categories').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('lsw_behaviors').select('*').eq('user_id', userId).eq('is_archived', false).order('sort_order'),
      supabase.from('lsw_behaviors').select('*').eq('user_id', userId).eq('is_archived', true).order('sort_order'),
    ])

    const cats = (catRes.data ?? []) as Category[]
    const activeBehaviors = (activeBehRes.data ?? []) as Behavior[]
    const archived = (archivedBehRes.data ?? []) as Behavior[]

    setCategories(cats)
    setBehaviors(activeBehaviors)
    setArchivedBehaviors(archived)

    // Collect all dates we need
    const allDatesSet = new Set<string>()
    for (const beh of activeBehaviors) {
      const cells = getPeriodCells(beh.frequency, 0, getDefaultCount(beh.frequency), beh.interval ?? 1, beh.anchor_date)
      for (const d of cells) allDatesSet.add(formatDate(d))
      const past = getLast12Dates(beh.frequency, beh.interval ?? 1, beh.anchor_date)
      for (const d of past) allDatesSet.add(formatDate(d))
    }

    const allDateStrings = [...allDatesSet]

    const [entRes, comRes] = await Promise.all([
      allDateStrings.length > 0
        ? supabase.from('lsw_entries').select('*').eq('user_id', userId).in('entry_date', allDateStrings)
        : Promise.resolve({ data: [] }),
      allDateStrings.length > 0
        ? supabase.from('lsw_cell_comments').select('*').eq('user_id', userId).in('entry_date', allDateStrings)
        : Promise.resolve({ data: [] }),
    ])

    const entryMap = new Map<string, Entry>()
    for (const e of (entRes.data ?? []) as Entry[]) entryMap.set(entryKey(e.behavior_id, e.entry_date), e)
    setEntries(entryMap)

    const commentMap = new Map<string, CellComment>()
    for (const c of (comRes.data ?? []) as CellComment[]) commentMap.set(entryKey(c.behavior_id, c.entry_date), c)
    setComments(commentMap)

    setLoading(false)
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  // Compliance: reactively computed from entries so it updates on every cell tap
  const complianceMap = useMemo(() => {
    const compMap = new Map<string, number | null>()
    for (const beh of behaviors) {
      const pastDates = getLast12Dates(beh.frequency, beh.interval ?? 1, beh.anchor_date)
      if (pastDates.length === 0) { compMap.set(beh.id, null); continue }
      let completed = 0
      let applicable = 0
      for (const d of pastDates) {
        const entry = entries.get(entryKey(beh.id, formatDate(d)))
        if (entry?.value === 'na') continue // NA doesn't count in denominator
        applicable++
        if (entry?.value === 'y') completed++
      }
      compMap.set(beh.id, applicable > 0 ? (completed / applicable) * 100 : null)
    }
    return compMap
  }, [behaviors, entries])

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
