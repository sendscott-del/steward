'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Note } from '@/lib/types'
import { useDemoMode } from '@/lib/demoMode'

const DEMO_SEED_NOTE =
  'Welcome to Steward — Notes is your scratchpad for the week.\n\n' +
  '• Stake presidency agenda\n' +
  '• Bishopric training prep\n' +
  '• People to minister to: …\n\n' +
  'In demo mode this note lives only in memory — refresh to reset, your real notes are untouched.'

export function useNotes(userId: string | undefined) {
  const { demoMode } = useDemoMode()
  const [note, setNote] = useState<Note | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (demoMode) {
      // Demo: in-memory note seeded with a friendly placeholder. Mutations
      // update local state only — never touch steward_notes.
      setNote({
        id: 'demo-note',
        user_id: 'demo',
        content: DEMO_SEED_NOTE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Note)
      setLoading(false)
      return
    }

    if (!userId) return

    async function fetchNote() {
      const { data } = await supabase
        .from('steward_notes')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (data) {
        setNote(data)
      } else {
        // Create initial note
        const { data: newNote } = await supabase
          .from('steward_notes')
          .insert({ user_id: userId, content: '' })
          .select()
          .single()
        if (newNote) setNote(newNote)
      }
      setLoading(false)
    }

    fetchNote()
  }, [userId, demoMode])

  // Cancel any pending debounced save when the hook unmounts so we don't
  // try to setSaving on an unmounted component (and don't issue a write
  // for a user that's already signed out).
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  const updateContent = useCallback((content: string) => {
    if (!note) return

    setNote(prev => prev ? { ...prev, content } : null)

    if (demoMode) return // demo: in-memory only

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      setSaving(true)
      await supabase
        .from('steward_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', note.id)
      setSaving(false)
    }, 2000)
  }, [note, demoMode])

  return { note, loading, saving, updateContent }
}
