'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Template, TemplateCategory, TemplateBehavior, Frequency, StakeRole } from '@/lib/types'
import { STAKE_ROLE_LABELS, stakeRoleFromTemplateName } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAdmin, adminLoading } = useAuth()

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">Please log in first.</p>
        <button onClick={() => router.push('/login')} className="text-sm text-blue-600 hover:underline">Go to Login</button>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">You don&apos;t have admin access.</p>
        <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:underline">Back to Home</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/')} className="p-1 text-gray-500 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Admin — Templates</h1>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-8">
        <NeedsCallingSection />
        <AllUsersSection />
        <TemplatesSection userId={user.id} />
      </div>
    </div>
  )
}

// ─── Pending Users Section ───

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  status: string
  selected_template_id: string | null
  selected_template_name: string | null
  stake_role: StakeRole | null
  created_at: string
}

// Users who have Steward access (granted in Gather) but haven't been assigned
// a calling template yet. Admin picks one and it gets applied immediately —
// no separate approve/reject step (Gather owns that decision).
function NeedsCallingSection() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    const [usersRes, templatesRes] = await Promise.all([
      supabase
        .from('steward_user_profiles')
        .select('*')
        .eq('status', 'approved')
        .is('selected_template_id', null)
        .order('created_at'),
      supabase.from('steward_templates').select('*').order('name'),
    ])
    setUsers((usersRes.data ?? []) as UserProfile[])
    setTemplates((templatesRes.data ?? []) as Template[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleAssignCalling(userId: string, template: Template) {
    setAssigning(userId)

    // Defensive: clear any orphan categories/behaviors before applying
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

    // Update calling + derived stake_role. Status stays 'approved'.
    await supabase.from('steward_user_profiles').update({
      selected_template_id: template.id,
      selected_template_name: template.name,
      stake_role: stakeRoleFromTemplateName(template.name),
    }).eq('id', userId)

    setAssigning(null)
    fetchUsers()
  }

  if (loading) return null
  if (users.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-bold text-gray-700 mb-1">Needs calling assignment ({users.length})</h2>
      <p className="text-xs text-gray-500 mb-3">
        Access is granted in Gather. Pick the calling template each user should follow.
      </p>
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-amber-200 shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">{u.full_name || u.email || 'Unknown'}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </div>
              <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                No calling
              </div>
            </div>

            <div className="text-[10px] text-gray-500 font-medium mb-1">Assign calling:</div>
            <div className="space-y-1">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleAssignCalling(u.id, t)}
                  disabled={assigning === u.id}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition disabled:opacity-50"
                >
                  {t.name}
                </button>
              ))}
            </div>
            {assigning === u.id && (
              <p className="text-[10px] text-gray-400 mt-2">Applying template…</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── All Users Section ───

function AllUsersSection() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [changingTemplate, setChangingTemplate] = useState<string | null>(null)
  const [reassigning, setReassigning] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    const [usersRes, templatesRes] = await Promise.all([
      // Only show users with a calling assigned — the unassigned ones live in
      // NeedsCallingSection above so they don't double-render here.
      supabase
        .from('steward_user_profiles')
        .select('*')
        .eq('status', 'approved')
        .not('selected_template_id', 'is', null)
        .order('full_name'),
      supabase.from('steward_templates').select('*').order('name'),
    ])
    setUsers((usersRes.data ?? []) as UserProfile[])
    setTemplates((templatesRes.data ?? []) as Template[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleChangeCalling(userId: string, template: Template) {
    setReassigning(userId)

    // Clear existing data
    await supabase.from('steward_behaviors').delete().eq('user_id', userId)
    await supabase.from('steward_categories').delete().eq('user_id', userId)

    // Apply new template
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

    // Update profile — calling AND derived stake_role in a single write.
    // The "calling" picker is now the single source of truth for both fields.
    await supabase.from('steward_user_profiles').update({
      selected_template_id: template.id,
      selected_template_name: template.name,
      stake_role: stakeRoleFromTemplateName(template.name),
    }).eq('id', userId)

    setReassigning(null)
    setChangingTemplate(null)
    fetchUsers()
  }

  // Removing access is owned by Gather now — toggle the S tile off in
  // gathered-admin-neon.vercel.app/gather and the user_apps trigger will set
  // this user's steward_user_profiles.status to 'rejected'.

  if (loading) return null

  return (
    <div>
      <h2 className="text-sm font-bold text-gray-700 mb-3">Active Users ({users.length})</h2>
      {users.length === 0 && (
        <p className="text-xs text-gray-400 py-4">No approved users yet.</p>
      )}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-sm font-semibold text-gray-800">{u.full_name || 'Unknown'}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </div>
              <div className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                Active
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-gray-500">Calling:</span>
              <span className="text-xs font-medium text-gray-700">{u.selected_template_name || 'None'}</span>
              {u.stake_role && (
                <span
                  className="text-[10px] font-semibold text-steward-primary bg-blue-50 px-1.5 py-0.5 rounded"
                  title="Unlocks the Quarterly Interviews page"
                >
                  {STAKE_ROLE_LABELS[u.stake_role]}
                </span>
              )}
            </div>

            {changingTemplate === u.id && (
              <div className="mt-2 space-y-1">
                <div className="text-[10px] text-gray-500 font-medium mb-1">Reassign to:</div>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleChangeCalling(u.id, t)}
                    disabled={reassigning === u.id}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                      t.id === u.selected_template_id
                        ? 'bg-blue-50 border border-blue-200 text-blue-700 font-medium'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    } disabled:opacity-50`}
                  >
                    {t.name} {reassigning === u.id && t.id !== u.selected_template_id ? '' : ''}
                  </button>
                ))}
                {reassigning === u.id && (
                  <p className="text-[10px] text-gray-400">Reassigning...</p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setChangingTemplate(changingTemplate === u.id ? null : u.id)}
                className="flex-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                {changingTemplate === u.id ? 'Cancel' : 'Change Calling'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Templates Section ───

function TemplatesSection({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('steward_templates').select('*').order('created_at')
    setTemplates((data ?? []) as Template[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleDelete(template: Template) {
    if (!confirm(`Delete the template "${template.name}" and all its contents? This cannot be undone.`)) return
    await supabase.from('steward_templates').delete().eq('id', template.id)
    fetchTemplates()
  }

  async function handleEdit(template: Template) {
    // Load template into user's work tab categories/behaviors, then navigate there
    if (!confirm(`This will load "${template.name}" into your work tab for editing. Your current categories and behaviors will be replaced, but the original template will stay intact. Continue?`)) return

    // Clear existing user categories/behaviors
    await supabase.from('steward_behaviors').delete().eq('user_id', userId)
    await supabase.from('steward_categories').delete().eq('user_id', userId)

    // Fetch template structure
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

    // Original template stays intact — Save as Template creates a new one
    // Navigate to work tab
    router.push('/')
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 px-1">
        Templates are created from the Work tab using &quot;Save as Template&quot;. Edit or delete them here.
      </p>

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">
          No templates yet. Go to the Work tab, set up your categories and behaviors, then use &quot;Save as Template&quot;.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Created {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(t)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    aria-label={`Delete template ${t.name}`}
                    title={`Delete template ${t.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <TemplatePreview templateId={t.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Template Preview (read-only) ───

function TemplatePreview({ templateId }: { templateId: string }) {
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [behaviors, setBehaviors] = useState<TemplateBehavior[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('steward_template_categories').select('*').eq('template_id', templateId).order('sort_order'),
      supabase.from('steward_template_behaviors').select('*').order('sort_order'),
    ]).then(([catRes, behRes]) => {
      const cats = (catRes.data ?? []) as TemplateCategory[]
      setCategories(cats)
      const catIds = cats.map(c => c.id)
      setBehaviors(((behRes.data ?? []) as TemplateBehavior[]).filter(b => catIds.includes(b.category_id)))
    })
  }, [templateId])

  const freqLabel = (f: string, interval: number) => {
    if (interval > 1) return `Every ${interval} ${f === 'weekly' ? 'wks' : f === 'monthly' ? 'mo' : 'qtrs'}`
    return { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' }[f] ?? f
  }

  if (categories.length === 0) return null

  return (
    <div className="px-4 pb-3 border-t border-gray-50">
      {categories.map(cat => (
        <div key={cat.id} className="mt-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.name}</div>
          {behaviors.filter(b => b.category_id === cat.id).map(beh => (
            <div key={beh.id} className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-600">{beh.name}</span>
              <span className="text-[10px] text-gray-400">{freqLabel(beh.frequency ?? 'weekly', beh.interval ?? 1)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
