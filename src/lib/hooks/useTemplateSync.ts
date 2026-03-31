'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { TemplateCategory, TemplateBehavior } from '@/lib/types'

export function useTemplateSync(userId: string | undefined) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userId || hasRun.current) return
    hasRun.current = true

    async function sync() {
      // 1. Get groups the user belongs to
      const { data: memberships } = await supabase
        .from('lsw_group_members')
        .select('group_id')
        .eq('user_id', userId)

      if (!memberships || memberships.length === 0) return
      const groupIds = memberships.map(m => m.group_id)

      // 2. Get template assignments for those groups
      const { data: assignments } = await supabase
        .from('lsw_template_assignments')
        .select('template_id')
        .in('group_id', groupIds)

      if (!assignments || assignments.length === 0) return
      const templateIds = [...new Set(assignments.map(a => a.template_id))]

      // 3. Check which templates have already been applied
      const { data: applied } = await supabase
        .from('lsw_template_applied')
        .select('template_id')
        .eq('user_id', userId)

      const appliedIds = new Set((applied ?? []).map(a => a.template_id))
      const unapplied = templateIds.filter(id => !appliedIds.has(id))

      if (unapplied.length === 0) return

      // 4. For each unapplied template, copy categories + behaviors
      for (const templateId of unapplied) {
        const { data: templateCats } = await supabase
          .from('lsw_template_categories')
          .select('*')
          .eq('template_id', templateId)
          .order('sort_order')

        if (!templateCats || templateCats.length === 0) {
          // Mark as applied even if empty
          await supabase.from('lsw_template_applied').insert({
            template_id: templateId,
            user_id: userId,
          })
          continue
        }

        // Get existing user categories to set sort_order
        const { data: existingCats } = await supabase
          .from('lsw_categories')
          .select('sort_order')
          .eq('user_id', userId)
          .order('sort_order', { ascending: false })
          .limit(1)

        let catOffset = (existingCats && existingCats.length > 0 ? existingCats[0].sort_order + 1 : 0)

        for (const tCat of templateCats as TemplateCategory[]) {
          // Create user category
          const { data: newCat } = await supabase
            .from('lsw_categories')
            .insert({
              user_id: userId,
              name: tCat.name,
              sort_order: catOffset++,
            })
            .select('id')
            .single()

          if (!newCat) continue

          // Get behaviors for this template category
          const { data: tBehaviors } = await supabase
            .from('lsw_template_behaviors')
            .select('*')
            .eq('category_id', tCat.id)
            .order('sort_order')

          if (tBehaviors && tBehaviors.length > 0) {
            const behaviorInserts = (tBehaviors as TemplateBehavior[]).map((b, i) => ({
              user_id: userId,
              category_id: newCat.id,
              name: b.name,
              frequency: b.frequency ?? 'weekly',
              sort_order: i,
            }))
            await supabase.from('lsw_behaviors').insert(behaviorInserts)
          }
        }

        // Mark template as applied
        await supabase.from('lsw_template_applied').insert({
          template_id: templateId,
          user_id: userId,
        })
      }
    }

    sync()
  }, [userId])
}
