import { supabase } from '@/lib/supabase'

// Shared template-application logic used by self-service onboarding
// (PickCalling), admin assignment (admin page), and the group-template
// background sync (useTemplateSync). Centralizing it removes three slightly
// divergent copies and gives every caller real error reporting instead of
// silently leaving a user with an empty workspace.

export interface TemplateCategorySpec {
  name: string
  sort_order: number
  behaviors: Array<{
    name: string
    frequency?: string | null
    interval?: number | null
    info_text?: string | null
    sort_order?: number | null
  }>
}

// Fetch a template's categories + behaviors in two queries (not one query
// per category). Returns specs ready to hand to applyTemplateToUser.
export async function fetchTemplateSpec(
  templateId: string
): Promise<{ specs: TemplateCategorySpec[]; error: Error | null }> {
  const { data: cats, error: catErr } = await supabase
    .from('steward_template_categories')
    .select('id, name, sort_order')
    .eq('template_id', templateId)
    .order('sort_order')
  if (catErr) return { specs: [], error: catErr }
  if (!cats || cats.length === 0) return { specs: [], error: null }

  const catIds = cats.map((c) => c.id)
  const { data: behs, error: behErr } = await supabase
    .from('steward_template_behaviors')
    .select('category_id, name, frequency, interval, info_text, sort_order')
    .in('category_id', catIds)
    .order('sort_order')
  if (behErr) return { specs: [], error: behErr }

  const byCat = new Map<string, TemplateCategorySpec['behaviors']>()
  for (const b of behs ?? []) {
    const arr = byCat.get(b.category_id) ?? []
    arr.push(b)
    byCat.set(b.category_id, arr)
  }

  const specs: TemplateCategorySpec[] = cats.map((c) => ({
    name: c.name,
    sort_order: c.sort_order,
    behaviors: byCat.get(c.id) ?? [],
  }))
  return { specs, error: null }
}

// Insert categories + their behaviors for a user. Categories are created in
// parallel; catOffset shifts sort_order when appending to a user that already
// has categories. Returns the first error encountered, or null on success.
export async function applyTemplateToUser(
  userId: string,
  specs: TemplateCategorySpec[],
  catOffset = 0
): Promise<{ error: Error | null }> {
  const results = await Promise.all(
    specs.map(async (cat, idx) => {
      const { data: newCat, error: catErr } = await supabase
        .from('steward_categories')
        .insert({ user_id: userId, name: cat.name, sort_order: catOffset + idx })
        .select('id')
        .single()
      if (catErr) return catErr
      if (!newCat) return new Error(`category insert returned no row for "${cat.name}"`)
      if (cat.behaviors.length === 0) return null

      const { error: behErr } = await supabase.from('steward_behaviors').insert(
        cat.behaviors.map((b, i) => ({
          user_id: userId,
          category_id: (newCat as { id: string }).id,
          name: b.name,
          frequency: b.frequency ?? 'weekly',
          interval: b.interval ?? 1,
          info_text: b.info_text || null,
          sort_order: b.sort_order ?? i,
        }))
      )
      return behErr ?? null
    })
  )

  const firstErr = results.find((r): r is Error => r != null)
  return { error: firstErr ?? null }
}
