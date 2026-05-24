'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { stakeRoleFromTemplateName } from '@/lib/types'
import type { Template, TemplateCategory, TemplateBehavior, StakeRole } from '@/lib/types'

interface PickCallingProps {
  userId: string
  userEmail: string
  defaultName?: string | null
  onDone: () => void
}

// Admin-only callings — no behaviors to track, just unlocks the Quarterly
// Interviews page and admin functions. Shown as a fallback when a Stake Clerk
// or Executive Secretary lands here without their gather_user_roles having
// been set yet (the normal path is the trigger auto-sets their stake_role).
const ADMIN_ONLY_CALLINGS: Array<{ stake_role: StakeRole; label: string }> = [
  { stake_role: 'stake_clerk',    label: 'Stake Clerk' },
  { stake_role: 'exec_secretary', label: 'Executive Secretary' },
]

// Self-serve calling picker shown when the user has Steward access (granted in
// Gather) but no calling template yet. Applies the chosen template inline —
// creates the user's steward_categories + steward_behaviors from the template
// definition and sets selected_template_id / selected_template_name /
// stake_role on their profile. Status is already 'approved' (set by the
// user_apps → steward_user_profiles trigger), so there's no admin step.
export default function PickCalling({ userId, userEmail, defaultName, onDone }: PickCallingProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fullName, setFullName] = useState(defaultName ?? '')

  useEffect(() => {
    supabase
      .from('steward_templates')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setTemplates((data ?? []) as Template[])
        setLoading(false)
      })
  }, [])

  async function handleSelectAdminOnly(stakeRole: StakeRole, label: string) {
    if (!fullName.trim()) {
      alert('Please enter your name first.')
      return
    }
    setSubmitting(true)

    // No template to apply — just set the profile so they skip the picker
    // next time. stake_role unlocks Quarterly Interviews + admin.
    await supabase
      .from('steward_user_profiles')
      .update({
        full_name: fullName.trim(),
        email: userEmail,
        selected_template_id: null,
        selected_template_name: label,
        stake_role: stakeRole,
      })
      .eq('id', userId)

    setSubmitting(false)
    onDone()
  }

  async function handleSelect(template: Template) {
    if (!fullName.trim()) {
      alert('Please enter your name first.')
      return
    }
    setSubmitting(true)

    // Apply the template — same logic the admin page used to run on approval.
    // Clear any orphan rows first (defensive; the trigger preserves a row
    // across S-toggle cycles but a user shouldn't have behaviors before this).
    await supabase.from('steward_behaviors').delete().eq('user_id', userId)
    await supabase.from('steward_categories').delete().eq('user_id', userId)

    const { data: tCats } = await supabase
      .from('steward_template_categories')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order')

    if (tCats) {
      for (const tCat of tCats as TemplateCategory[]) {
        const { data: newCat } = await supabase
          .from('steward_categories')
          .insert({ user_id: userId, name: tCat.name, sort_order: tCat.sort_order })
          .select('id')
          .single()
        if (!newCat) continue

        const { data: tBehs } = await supabase
          .from('steward_template_behaviors')
          .select('*')
          .eq('category_id', tCat.id)
          .order('sort_order')

        if (tBehs && tBehs.length > 0) {
          await supabase.from('steward_behaviors').insert(
            (tBehs as TemplateBehavior[]).map(b => ({
              user_id: userId,
              category_id: newCat.id,
              name: b.name,
              frequency: b.frequency ?? 'weekly',
              interval: b.interval ?? 1,
              info_text: b.info_text || null,
              sort_order: b.sort_order,
            }))
          )
        }
      }
    }

    // Update the profile. Status stays 'approved' (set by the trigger).
    await supabase
      .from('steward_user_profiles')
      .update({
        full_name: fullName.trim(),
        email: userEmail,
        selected_template_id: template.id,
        selected_template_name: template.name,
        stake_role: stakeRoleFromTemplateName(template.name),
      })
      .eq('id', userId)

    setSubmitting(false)
    onDone()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading…</div>
  }

  return (
    <div className="px-4 py-8">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-800">Pick your calling</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
          You have access to Steward. Select your calling to load the right
          behaviors and reflection structure — you can change it later from
          Settings.
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select your calling</label>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">No callings available yet. Ask the admin to create one.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  disabled={submitting || !fullName.trim()}
                  className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Admin-only (no behaviors to track)
          </div>
          <div className="space-y-2">
            {ADMIN_ONLY_CALLINGS.map(c => (
              <button
                key={c.stake_role}
                onClick={() => handleSelectAdminOnly(c.stake_role, c.label)}
                disabled={submitting || !fullName.trim()}
                className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  Quarterly Interviews + user admin only
                </span>
              </button>
            ))}
          </div>
        </div>

        {submitting && (
          <p className="text-center text-sm text-gray-400">Loading your calling…</p>
        )}
      </div>
    </div>
  )
}
