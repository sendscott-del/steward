'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchTemplateSpec, applyTemplateToUser } from '@/lib/applyTemplate'

export function useTemplateSync(userId: string | undefined) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userId || hasRun.current) return
    hasRun.current = true

    async function sync() {
      // 1. Get groups the user belongs to
      const { data: memberships, error: memErr } = await supabase
        .from('steward_group_members')
        .select('group_id')
        .eq('user_id', userId)

      if (memErr) { console.error('[templateSync] memberships failed:', memErr.message); return }
      if (!memberships || memberships.length === 0) return
      const groupIds = memberships.map(m => m.group_id)

      // 2. Get template assignments for those groups
      const { data: assignments, error: asgErr } = await supabase
        .from('steward_template_assignments')
        .select('template_id')
        .in('group_id', groupIds)

      if (asgErr) { console.error('[templateSync] assignments failed:', asgErr.message); return }
      if (!assignments || assignments.length === 0) return
      const templateIds = [...new Set(assignments.map(a => a.template_id))]

      // 3. Check which templates have already been applied
      const { data: applied, error: appErr } = await supabase
        .from('steward_template_applied')
        .select('template_id')
        .eq('user_id', userId)

      if (appErr) { console.error('[templateSync] applied check failed:', appErr.message); return }
      const appliedIds = new Set((applied ?? []).map(a => a.template_id))
      const unapplied = templateIds.filter(id => !appliedIds.has(id))

      if (unapplied.length === 0) return

      // 4. For each unapplied template, copy categories + behaviors (appended
      //    after the user's existing categories). Only mark a template applied
      //    if the copy actually succeeded — otherwise it retries next session
      //    instead of leaving the user with a half-built workspace.
      for (const templateId of unapplied) {
        const { specs, error: specErr } = await fetchTemplateSpec(templateId)
        if (specErr) { console.error('[templateSync] fetch failed:', specErr.message); continue }

        if (specs.length === 0) {
          await supabase.from('steward_template_applied').insert({ template_id: templateId, user_id: userId })
          continue
        }

        const { data: existingCats } = await supabase
          .from('steward_categories')
          .select('sort_order')
          .eq('user_id', userId)
          .order('sort_order', { ascending: false })
          .limit(1)
        const catOffset = existingCats && existingCats.length > 0 ? existingCats[0].sort_order + 1 : 0

        const { error: applyErr } = await applyTemplateToUser(userId!, specs, catOffset)
        if (applyErr) { console.error('[templateSync] apply failed:', applyErr.message); continue }

        await supabase.from('steward_template_applied').insert({ template_id: templateId, user_id: userId })
      }
    }

    sync()
  }, [userId])
}
