'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getLast12Dates, getWeekStart } from '@/lib/dates'
import { addWeeks, addMonths } from 'date-fns'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { useDemoMode } from '@/lib/demoMode'
import { buildDemoFixture, demoEntryKey } from '@/lib/demoFixtures'

interface StewardData {
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

export function useStewardData(userId: string | undefined): StewardData {
  const { demoMode, demoRole } = useDemoMode()
  const [categories, setCategories] = useState<Category[]>([])
  const [behaviors, setBehaviors] = useState<Behavior[]>([])
  const [archivedBehaviors, setArchivedBehaviors] = useState<Behavior[]>([])
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map())
  const [comments, setComments] = useState<Map<string, CellComment>>(new Map())
  const [loading, setLoading] = useState(true)

  // Demo mode: replace all Supabase reads with role-specific fixtures.
  // Mutations stay in local state — they don't hit the database, so demo
  // sessions don't pollute real ward data and don't survive a page reload.
  useEffect(() => {
    if (!demoMode) return
    const fixture = buildDemoFixture(demoRole)
    setCategories(fixture.categories)
    setBehaviors(fixture.behaviors)
    setArchivedBehaviors([])
    const em = new Map<string, Entry>()
    for (const e of fixture.entries) em.set(entryKey(e.behavior_id, e.entry_date), e)
    setEntries(em)
    const cm = new Map<string, CellComment>()
    for (const c of fixture.comments) cm.set(demoEntryKey(c.behavior_id, c.entry_date), c)
    setComments(cm)
    setLoading(false)
  }, [demoMode, demoRole])

  const fetchData = useCallback(async () => {
    if (demoMode) return // fixtures already loaded above
    if (!userId) return
    setLoading(true)

    const [catRes, activeBehRes, archivedBehRes] = await Promise.all([
      supabase.from('steward_categories').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('steward_behaviors').select('*').eq('user_id', userId).eq('is_archived', false).order('sort_order'),
      supabase.from('steward_behaviors').select('*').eq('user_id', userId).eq('is_archived', true).order('sort_order'),
    ])

    const cats = (catRes.data ?? []) as Category[]
    const activeBehaviors = (activeBehRes.data ?? []) as Behavior[]
    const archived = (archivedBehRes.data ?? []) as Behavior[]

    setCategories(cats)
    setBehaviors(activeBehaviors)
    setArchivedBehaviors(archived)

    // Collect all dates: current periods + navigation range + compliance history
    const allDatesSet = new Set<string>()
    const now = new Date()

    // Weekly: 12 back + 4 forward
    const baseWeek = getWeekStart(now)
    for (let i = -12; i <= 4; i++) allDatesSet.add(formatDate(addWeeks(baseWeek, i)))

    // Monthly: 12 back + 6 forward
    const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    for (let i = -12; i <= 6; i++) allDatesSet.add(formatDate(addMonths(baseMonth, i)))

    // Quarterly: 12 back + 4 forward
    const currentQ = Math.floor(now.getMonth() / 3)
    const baseQ = new Date(now.getFullYear(), currentQ * 3, 1)
    for (let i = -12; i <= 4; i++) allDatesSet.add(formatDate(addMonths(baseQ, i * 3)))

    const allDateStrings = [...allDatesSet]

    const [entRes, comRes] = await Promise.all([
      supabase.from('steward_entries').select('*').eq('user_id', userId).in('entry_date', allDateStrings),
      supabase.from('steward_cell_comments').select('*').eq('user_id', userId).in('entry_date', allDateStrings),
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

  // Compliance: reactively computed
  const complianceMap = useMemo(() => {
    const compMap = new Map<string, number | null>()
    for (const beh of behaviors) {
      const pastDates = getLast12Dates(beh.frequency, beh.interval ?? 1, beh.anchor_date)
      if (pastDates.length === 0) { compMap.set(beh.id, null); continue }
      let completed = 0
      let applicable = 0
      for (const d of pastDates) {
        const entry = entries.get(entryKey(beh.id, formatDate(d)))
        if (entry?.value === 'na') continue
        applicable++
        if (entry?.value === 'y') completed++
      }
      compMap.set(beh.id, applicable > 0 ? (completed / applicable) * 100 : null)
    }
    return compMap
  }, [behaviors, entries])

  const upsertEntry = useCallback(async (behaviorId: string, date: string, value: EntryValue | null) => {
    const key = entryKey(behaviorId, date)
    if (demoMode) {
      // Demo: update local state only — never persist.
      setEntries(prev => {
        const next = new Map(prev)
        if (value === null) next.delete(key)
        else next.set(key, { id: key, behavior_id: behaviorId, entry_date: date, value } as unknown as Entry)
        return next
      })
      return
    }
    if (!userId) return

    // Shared task: one RPC fans the value out to every participant's row for
    // this period and stamps who did it, so marking it done here marks it done
    // in their grids too. Only this user's copy is updated locally — the others
    // pick it up on their next load.
    const sharedTaskId = behaviors.find(b => b.id === behaviorId)?.shared_task_id
      ?? archivedBehaviors.find(b => b.id === behaviorId)?.shared_task_id
      ?? null

    if (sharedTaskId) {
      setEntries(prev => {
        const next = new Map(prev)
        if (value === null) next.delete(key)
        else next.set(key, {
          id: key, behavior_id: behaviorId, entry_date: date, value, completed_by: userId,
        } as unknown as Entry)
        return next
      })
      const { error } = await supabase.rpc('steward_set_shared_entry', {
        p_shared_task_id: sharedTaskId,
        p_entry_date: date,
        p_value: value,
      })
      if (error) {
        console.warn('[sharing] steward_set_shared_entry:', error.message)
        fetchData() // revert to server truth
      }
      return
    }

    if (value === null) {
      setEntries(prev => { const next = new Map(prev); next.delete(key); return next })
      await supabase.from('steward_entries').delete().eq('behavior_id', behaviorId).eq('entry_date', date).eq('user_id', userId)
    } else {
      setEntries(prev => new Map(prev).set(key, { id: key, behavior_id: behaviorId, entry_date: date, value } as unknown as Entry))
      await supabase.from('steward_entries').upsert(
        { user_id: userId, behavior_id: behaviorId, entry_date: date, value, updated_at: new Date().toISOString() },
        { onConflict: 'behavior_id,entry_date' }
      )
    }
  }, [userId, demoMode, behaviors, archivedBehaviors, fetchData])

  const upsertComment = useCallback(async (behaviorId: string, date: string, comment: string) => {
    const key = entryKey(behaviorId, date)
    if (demoMode) {
      setComments(prev => {
        const next = new Map(prev)
        if (comment.trim() === '') next.delete(key)
        else next.set(key, { id: key, behavior_id: behaviorId, entry_date: date, comment } as unknown as CellComment)
        return next
      })
      return
    }
    if (!userId) return
    if (comment.trim() === '') {
      setComments(prev => { const next = new Map(prev); next.delete(key); return next })
      await supabase.from('steward_cell_comments').delete().eq('behavior_id', behaviorId).eq('entry_date', date).eq('user_id', userId)
    } else {
      setComments(prev => new Map(prev).set(key, { id: key, behavior_id: behaviorId, entry_date: date, comment } as unknown as CellComment))
      await supabase.from('steward_cell_comments').upsert(
        { user_id: userId, behavior_id: behaviorId, entry_date: date, comment, updated_at: new Date().toISOString() },
        { onConflict: 'behavior_id,entry_date' }
      )
    }
  }, [userId, demoMode])

  return { categories, behaviors, archivedBehaviors, entries, comments, complianceMap, loading, refresh: fetchData, upsertEntry, upsertComment }
}
