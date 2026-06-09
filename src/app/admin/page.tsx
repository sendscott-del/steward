'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronUp, ChevronDown, ChevronRight,
  Plus, Minus, X, Search, Trash2, Copy, FileText, Folder, FolderOpen,
  CheckSquare, Users, UserPlus, Info, Book, RefreshCw,
  CheckCircle2, Key, ArrowLeftRight, ExternalLink, AlertTriangle,
  AlertCircle, HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Template, TemplateCategory, TemplateBehavior, Frequency, StakeRole } from '@/lib/types'
import { STAKE_ROLE_LABELS, stakeRoleFromTemplateName } from '@/lib/types'

// ─── Local types ────────────────────────────────────────────────────────────
interface FullTemplate {
  id: string
  name: string
  created_at: string
  updated_at: string | null
  categories: Array<TemplateCategory & { behaviors: TemplateBehavior[] }>
}

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  selected_template_id: string | null
  selected_template_name: string | null
  stake_role: StakeRole | null
  status: string
}

const FREQ_LONG: Record<string, string> = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' }
const STEWARD_PRIMARY = '#2563EB'
const STEWARD_PRIMARY_DARK = '#1D4ED8'
const STEWARD_PRIMARY_FADE = '#EFF6FF'

const initials = (name: string | null | undefined) => {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Auth gate ──────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAdmin, adminLoading } = useAuth()

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>
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

  return <AdminInner currentUserId={user.id} />
}

// ─── Main admin ─────────────────────────────────────────────────────────────
function AdminInner({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'templates' | 'people'>('templates')

  // Data
  const [templates, setTemplates] = useState<FullTemplate[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // UI
  const [tplSearch, setTplSearch] = useState('')
  const [peopleSearch, setPeopleSearch] = useState('')
  const [peopleFilter, setPeopleFilter] = useState<string>('all')
  const [pickerFor, setPickerFor] = useState<UserRow | null>(null)
  const [confirm, setConfirm] = useState<null | { title: string; sub: string; danger?: boolean; onOk: () => void }>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [savingPulse, setSavingPulse] = useState(false)

  const pulseSave = useCallback(() => {
    setSavingPulse(true)
    setTimeout(() => setSavingPulse(false), 700)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const [tplsRes, catsRes, behsRes, usersRes] = await Promise.all([
      supabase.from('steward_templates').select('*').order('name'),
      supabase.from('steward_template_categories').select('*').order('sort_order'),
      supabase.from('steward_template_behaviors').select('*').order('sort_order'),
      supabase.from('steward_user_profiles').select('*').eq('status', 'approved').order('full_name'),
    ])
    const cats = (catsRes.data ?? []) as TemplateCategory[]
    const behs = (behsRes.data ?? []) as TemplateBehavior[]
    const built: FullTemplate[] = ((tplsRes.data ?? []) as Template[]).map(t => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      updated_at: (t as Template & { updated_at?: string }).updated_at ?? null,
      categories: cats
        .filter(c => c.template_id === t.id)
        .map(c => ({
          ...c,
          behaviors: behs
            .filter(b => b.category_id === c.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        })),
    }))
    setTemplates(built)
    setUsers((usersRes.data ?? []) as UserRow[])
    if (built.length > 0 && !built.find(t => t.id === selectedId)) setSelectedId(built[0].id)
    setLoading(false)
  }, [selectedId])

  useEffect(() => { void refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTpl = templates.find(t => t.id === selectedId) || templates[0] || null
  const usersByTemplate = useMemo(() => {
    const m = new Map<string, UserRow[]>()
    users.forEach(u => {
      if (!u.selected_template_id) return
      if (!m.has(u.selected_template_id)) m.set(u.selected_template_id, [])
      m.get(u.selected_template_id)!.push(u)
    })
    return m
  }, [users])
  const needsAssignment = users.filter(u => !u.selected_template_id && !u.stake_role)

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const newTemplate = async () => {
    const { data, error } = await supabase
      .from('steward_templates')
      .insert({ name: 'Untitled Template', created_by: currentUserId })
      .select('*')
      .single()
    if (error || !data) { showToast(`Create failed: ${error?.message}`); return }
    await refresh()
    setSelectedId((data as Template).id)
    showToast('Template created')
  }

  const renameTemplate = async (id: string, name: string) => {
    setTemplates(ts => ts.map(t => t.id === id ? { ...t, name, updated_at: new Date().toISOString() } : t))
    pulseSave()
    await supabase.from('steward_templates').update({ name, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const duplicateTemplate = async (id: string) => {
    const src = templates.find(t => t.id === id); if (!src) return
    const { data: newTpl, error } = await supabase
      .from('steward_templates')
      .insert({ name: `${src.name} (copy)`, created_by: currentUserId })
      .select('*')
      .single()
    if (error || !newTpl) { showToast(`Duplicate failed: ${error?.message}`); return }
    for (const c of src.categories) {
      const { data: newCat } = await supabase
        .from('steward_template_categories')
        .insert({ template_id: (newTpl as Template).id, name: c.name, sort_order: c.sort_order })
        .select('id')
        .single()
      if (!newCat) continue
      if (c.behaviors.length > 0) {
        await supabase.from('steward_template_behaviors').insert(c.behaviors.map(b => ({
          category_id: (newCat as { id: string }).id,
          name: b.name,
          frequency: b.frequency,
          interval: b.interval ?? 1,
          info_text: b.info_text,
          sort_order: b.sort_order,
        })))
      }
    }
    await refresh()
    setSelectedId((newTpl as Template).id)
    showToast('Template duplicated')
  }

  const deleteTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id); if (!tpl) return
    const used = usersByTemplate.get(id)?.length || 0
    setConfirm({
      title: `Delete "${tpl.name}"?`,
      sub: used
        ? `${used} ${used === 1 ? 'person is' : 'people are'} currently on this calling. They'll need a new template.`
        : 'This cannot be undone.',
      danger: true,
      onOk: async () => {
        // Clear from users first
        await supabase
          .from('steward_user_profiles')
          .update({ selected_template_id: null, selected_template_name: null })
          .eq('selected_template_id', id)
        // Then delete cascade: behaviors → categories → template
        const catIds = tpl.categories.map(c => c.id)
        if (catIds.length > 0) {
          await supabase.from('steward_template_behaviors').delete().in('category_id', catIds)
          await supabase.from('steward_template_categories').delete().eq('template_id', id)
        }
        await supabase.from('steward_templates').delete().eq('id', id)
        await refresh()
        setConfirm(null)
        showToast('Template deleted')
      },
    })
  }

  // ── Category mutations ────────────────────────────────────────────────────
  const addCategory = async () => {
    if (!selectedTpl) return
    const nextSort = (selectedTpl.categories[selectedTpl.categories.length - 1]?.sort_order ?? 0) + 10
    const { error } = await supabase
      .from('steward_template_categories')
      .insert({ template_id: selectedTpl.id, name: 'New Category', sort_order: nextSort })
    if (error) { showToast(`Add failed: ${error.message}`); return }
    await refresh()
  }

  const renameCategory = async (cid: string, name: string) => {
    setTemplates(ts => ts.map(t => ({
      ...t,
      categories: t.categories.map(c => c.id === cid ? { ...c, name } : c),
    })))
    pulseSave()
    await supabase.from('steward_template_categories').update({ name }).eq('id', cid)
  }

  const moveCategory = async (cid: string, dir: -1 | 1) => {
    if (!selectedTpl) return
    const i = selectedTpl.categories.findIndex(c => c.id === cid)
    const j = i + dir
    if (i < 0 || j < 0 || j >= selectedTpl.categories.length) return
    const a = selectedTpl.categories[i], b = selectedTpl.categories[j]
    await Promise.all([
      supabase.from('steward_template_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('steward_template_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await refresh()
  }

  const deleteCategory = (cid: string) => {
    if (!selectedTpl) return
    const cat = selectedTpl.categories.find(c => c.id === cid); if (!cat) return
    const beh = cat.behaviors.length
    setConfirm({
      title: `Delete "${cat.name}"?`,
      sub: beh ? `${beh} behavior${beh === 1 ? '' : 's'} will also be removed.` : 'This category is empty.',
      danger: true,
      onOk: async () => {
        if (beh > 0) await supabase.from('steward_template_behaviors').delete().eq('category_id', cid)
        await supabase.from('steward_template_categories').delete().eq('id', cid)
        await refresh()
        setConfirm(null)
      },
    })
  }

  // ── Behavior mutations ────────────────────────────────────────────────────
  const addBehavior = async (cid: string) => {
    if (!selectedTpl) return
    const cat = selectedTpl.categories.find(c => c.id === cid); if (!cat) return
    const nextSort = (cat.behaviors[cat.behaviors.length - 1]?.sort_order ?? 0) + 10
    const { error } = await supabase
      .from('steward_template_behaviors')
      .insert({ category_id: cid, name: 'New behavior', frequency: 'weekly', interval: 1, info_text: '', sort_order: nextSort })
    if (error) { showToast(`Add failed: ${error.message}`); return }
    await refresh()
  }

  const updateBehavior = (cid: string, bid: string, patch: Partial<TemplateBehavior>) => {
    setTemplates(ts => ts.map(t => ({
      ...t,
      categories: t.categories.map(c => c.id !== cid ? c : {
        ...c,
        behaviors: c.behaviors.map(b => b.id === bid ? { ...b, ...patch } : b),
      }),
    })))
    pulseSave()
    void supabase.from('steward_template_behaviors').update(patch as Record<string, unknown>).eq('id', bid)
  }

  const deleteBehavior = async (cid: string, bid: string) => {
    await supabase.from('steward_template_behaviors').delete().eq('id', bid)
    await refresh()
  }

  const moveBehavior = async (cid: string, bid: string, dir: -1 | 1) => {
    const cat = selectedTpl?.categories.find(c => c.id === cid); if (!cat) return
    const i = cat.behaviors.findIndex(b => b.id === bid)
    const j = i + dir
    if (i < 0 || j < 0 || j >= cat.behaviors.length) return
    const a = cat.behaviors[i], b = cat.behaviors[j]
    await Promise.all([
      supabase.from('steward_template_behaviors').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('steward_template_behaviors').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await refresh()
  }

  // ── User assignment ───────────────────────────────────────────────────────
  // Applies a template to a user — clears existing categories/behaviors,
  // copies template content over, sets selected_template_id / stake_role.
  const assignTemplate = async (userId: string, template: FullTemplate) => {
    await supabase.from('steward_behaviors').delete().eq('user_id', userId)
    await supabase.from('steward_categories').delete().eq('user_id', userId)
    for (const tCat of template.categories) {
      const { data: newCat } = await supabase
        .from('steward_categories')
        .insert({ user_id: userId, name: tCat.name, sort_order: tCat.sort_order })
        .select('id')
        .single()
      if (!newCat) continue
      if (tCat.behaviors.length > 0) {
        await supabase.from('steward_behaviors').insert(tCat.behaviors.map(b => ({
          user_id: userId,
          category_id: (newCat as { id: string }).id,
          name: b.name,
          frequency: b.frequency ?? 'weekly',
          interval: b.interval ?? 1,
          info_text: b.info_text || null,
          sort_order: b.sort_order,
        })))
      }
    }
    await supabase.from('steward_user_profiles').update({
      selected_template_id: template.id,
      selected_template_name: template.name,
      stake_role: stakeRoleFromTemplateName(template.name),
    }).eq('id', userId)
    await refresh()
    const u = users.find(x => x.id === userId)
    showToast(`${u?.full_name || u?.email || 'User'} → ${template.name}`)
    setPickerFor(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Appbar onBack={() => router.push('/')} />

      {/* Sub-bar: tabs */}
      <div className="bg-white border-b border-gray-200 px-5 flex items-end">
        <div className="py-3.5 pr-4 text-xs font-bold uppercase tracking-wider text-gray-500">Admin</div>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={<FileText size={14} />} count={templates.length}>Templates</TabBtn>
        <TabBtn active={tab === 'people'} onClick={() => setTab('people')} icon={<Users size={14} />} count={users.length}>People</TabBtn>
        <div className="flex-1" />
        <a
          href="https://gather.gatheredin.app/gather"
          target="_blank"
          rel="noreferrer"
          className="mb-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <ExternalLink size={13} />
          Manage access in Gather
        </a>
      </div>

      {needsAssignment.length > 0 && (
        <NeedsBanner
          users={needsAssignment}
          onResolveOne={u => setPickerFor(u)}
          onSeeAll={() => { setTab('people'); setPeopleFilter('needs') }}
        />
      )}

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-400">Loading…</div>
      ) : tab === 'templates' ? (
        <TemplatesView
          templates={templates}
          selectedTpl={selectedTpl}
          setSelectedId={setSelectedId}
          tplSearch={tplSearch}
          setTplSearch={setTplSearch}
          newTemplate={newTemplate}
          duplicateTemplate={duplicateTemplate}
          deleteTemplate={deleteTemplate}
          renameTemplate={renameTemplate}
          addCategory={addCategory}
          renameCategory={renameCategory}
          moveCategory={moveCategory}
          deleteCategory={deleteCategory}
          addBehavior={addBehavior}
          updateBehavior={updateBehavior}
          deleteBehavior={deleteBehavior}
          moveBehavior={moveBehavior}
          usersByTemplate={usersByTemplate}
          setPickerFor={setPickerFor}
          savingPulse={savingPulse}
        />
      ) : (
        <PeopleView
          users={users}
          templates={templates}
          search={peopleSearch}
          setSearch={setPeopleSearch}
          filter={peopleFilter}
          setFilter={setPeopleFilter}
          onChange={u => setPickerFor(u)}
        />
      )}

      {pickerFor && (
        <TemplatePickerModal
          user={pickerFor}
          templates={templates}
          onPick={tplId => {
            const tpl = templates.find(t => t.id === tplId); if (tpl) void assignTemplate(pickerFor.id, tpl)
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-2xl flex items-center gap-2 animate-[fadein_0.15s_ease]">
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Appbar ─────────────────────────────────────────────────────────────────
function Appbar({ onBack }: { onBack: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 bg-white px-5 py-2.5 flex items-center justify-between gap-4"
      style={{ borderBottom: `3px solid ${STEWARD_PRIMARY}` }}
    >
      <div className="flex items-center gap-2.5">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Back">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-extrabold text-[15px]"
             style={{ background: `linear-gradient(135deg, #1E3A5F 0%, ${STEWARD_PRIMARY} 100%)` }}>S</div>
        <div>
          <div className="font-bold text-[17px] text-gray-900 leading-tight">Steward</div>
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
            <button onClick={onBack} className="font-semibold hover:underline" style={{ color: STEWARD_PRIMARY }}>Work</button>
            <ChevronRight size={10} className="text-gray-300" />
            <span>Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function TabBtn({ active, onClick, icon, count, children }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; count: number; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-selected={active}
      className={`py-3.5 px-4 -mb-px text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
        active ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
      style={active ? { color: STEWARD_PRIMARY, borderColor: STEWARD_PRIMARY } : undefined}
    >
      {icon}
      {children}
      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
        active ? '' : 'bg-gray-100 text-gray-600'
      }`}
      style={active ? { background: STEWARD_PRIMARY_FADE, color: STEWARD_PRIMARY } : undefined}>{count}</span>
    </button>
  )
}

// ─── Needs-assignment banner ────────────────────────────────────────────────
function NeedsBanner({ users, onResolveOne, onSeeAll }: {
  users: UserRow[]; onResolveOne: (u: UserRow) => void; onSeeAll: () => void
}) {
  return (
    <div className="mx-5 mt-4 flex items-center gap-3.5 px-4 py-3.5 rounded-lg shadow-sm" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: '#F59E0B' }}>
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: '#78350F' }}>
          {users.length} {users.length === 1 ? 'person needs' : 'people need'} a calling template
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#92400E' }}>
          Access granted in Gather. Pick which calling each follows in Steward.
        </div>
      </div>
      <div className="flex items-center">
        {users.slice(0, 4).map((u, i) => (
          <span key={u.id}
                className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                style={{ background: '#F59E0B', border: '2px solid #FFFBEB', marginLeft: i === 0 ? 0 : -6 }}
                title={u.full_name || u.email || ''}>
            {initials(u.full_name || u.email)}
          </span>
        ))}
        {users.length > 4 && (
          <span className="w-7 h-7 rounded-full bg-gray-400 text-white text-[11px] font-bold flex items-center justify-center" style={{ marginLeft: -6, border: '2px solid #FFFBEB' }}>
            +{users.length - 4}
          </span>
        )}
      </div>
      <div className="flex-shrink-0">
        {users.length === 1 ? (
          <button onClick={() => onResolveOne(users[0])} className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: STEWARD_PRIMARY }}>
            Assign calling
          </button>
        ) : (
          <button onClick={onSeeAll} className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: STEWARD_PRIMARY }}>
            Resolve
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Templates view (3-pane) ────────────────────────────────────────────────
function TemplatesView(props: {
  templates: FullTemplate[]
  selectedTpl: FullTemplate | null
  setSelectedId: (id: string) => void
  tplSearch: string
  setTplSearch: (v: string) => void
  newTemplate: () => void
  duplicateTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
  renameTemplate: (id: string, name: string) => void
  addCategory: () => void
  renameCategory: (cid: string, name: string) => void
  moveCategory: (cid: string, dir: -1 | 1) => void
  deleteCategory: (cid: string) => void
  addBehavior: (cid: string) => void
  updateBehavior: (cid: string, bid: string, patch: Partial<TemplateBehavior>) => void
  deleteBehavior: (cid: string, bid: string) => void
  moveBehavior: (cid: string, bid: string, dir: -1 | 1) => void
  usersByTemplate: Map<string, UserRow[]>
  setPickerFor: (u: UserRow) => void
  savingPulse: boolean
}) {
  const { templates, selectedTpl, setSelectedId, tplSearch, setTplSearch, newTemplate,
          duplicateTemplate, deleteTemplate, renameTemplate, usersByTemplate, savingPulse } = props
  const filtered = templates.filter(t => t.name.toLowerCase().includes(tplSearch.toLowerCase()))
  const assignedUsers = selectedTpl ? (usersByTemplate.get(selectedTpl.id) || []) : []

  return (
    <div className="grid gap-4 p-4 px-5" style={{ gridTemplateColumns: 'minmax(0,280px) minmax(0,1fr) minmax(0,320px)' }}>
      {/* Left rail */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md flex flex-col overflow-hidden min-h-0">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between gap-2.5 flex-shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Templates</div>
          <button onClick={newTemplate} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold" style={{ background: STEWARD_PRIMARY_FADE, color: STEWARD_PRIMARY }}>
            <Plus size={12} /> New
          </button>
        </div>
        <div className="relative m-3">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={tplSearch}
            onChange={e => setTplSearch(e.target.value)}
            placeholder="Search templates"
            className="w-full pl-8 pr-2.5 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {filtered.map(t => {
            const count = usersByTemplate.get(t.id)?.length || 0
            const behCount = t.categories.reduce((s, c) => s + c.behaviors.length, 0)
            const isActive = t.id === selectedTpl?.id
            return (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="flex items-center gap-2.5 px-2.5 py-2.5 mb-0.5 rounded-md cursor-pointer border transition-colors"
                style={isActive
                  ? { background: STEWARD_PRIMARY_FADE, borderColor: '#BFDBFE' }
                  : { background: 'transparent', borderColor: 'transparent' }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                     style={isActive ? { background: STEWARD_PRIMARY, color: 'white' } : { background: '#F3F4F6', color: '#6B7280' }}>
                  <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold leading-tight truncate" style={isActive ? { color: STEWARD_PRIMARY_DARK } : { color: '#1F2937' }}>{t.name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <Users size={11} />{count}<span className="text-gray-300">·</span>
                    <CheckSquare size={11} />{behCount}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-400">No templates match &ldquo;{tplSearch}&rdquo;.</div>
          )}
        </div>
      </div>

      {/* Center editor */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md flex flex-col overflow-hidden min-h-0">
        {selectedTpl ? (
          <TemplateEditor
            tpl={selectedTpl}
            assignedCount={assignedUsers.length}
            onRename={n => renameTemplate(selectedTpl.id, n)}
            onDuplicate={() => duplicateTemplate(selectedTpl.id)}
            onDelete={() => deleteTemplate(selectedTpl.id)}
            addCategory={props.addCategory}
            renameCategory={props.renameCategory}
            moveCategory={props.moveCategory}
            deleteCategory={props.deleteCategory}
            addBehavior={props.addBehavior}
            updateBehavior={props.updateBehavior}
            deleteBehavior={props.deleteBehavior}
            moveBehavior={props.moveBehavior}
            savingPulse={savingPulse}
          />
        ) : (
          <div className="p-16 text-center text-sm text-gray-400">
            No template selected. <button onClick={newTemplate} className="font-semibold underline" style={{ color: STEWARD_PRIMARY }}>Create one</button>?
          </div>
        )}
      </div>

      {/* Right rail */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-md flex flex-col overflow-hidden min-h-0">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-start justify-between gap-2.5 flex-shrink-0">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Assigned to</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {assignedUsers.length} {assignedUsers.length === 1 ? 'person on' : 'people on'} {selectedTpl?.name || ''}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {assignedUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400 leading-relaxed">
              Nobody is on this calling yet.<br />
              <span className="text-gray-500">Open the People tab to assign someone.</span>
            </div>
          ) : assignedUsers.map(u => (
            <div key={u.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gray-50 group hover:bg-gray-50">
              <span className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: STEWARD_PRIMARY }}>
                {initials(u.full_name || u.email)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800 truncate">{u.full_name || u.email || 'Unknown'}</div>
                <div className="text-[11px] text-gray-400 truncate">{u.email || ''}</div>
                {u.stake_role && (
                  <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: STEWARD_PRIMARY_FADE, color: STEWARD_PRIMARY_DARK }}>
                    <Key size={9} />{STAKE_ROLE_LABELS[u.stake_role]}
                  </span>
                )}
              </div>
              <button onClick={() => props.setPickerFor(u)} className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded hover:bg-gray-200 text-gray-600" title="Change calling">
                <ArrowLeftRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Template editor (center pane) ──────────────────────────────────────────
function TemplateEditor({ tpl, assignedCount, onRename, onDuplicate, onDelete,
                          addCategory, renameCategory, moveCategory, deleteCategory,
                          addBehavior, updateBehavior, deleteBehavior, moveBehavior,
                          savingPulse }: {
  tpl: FullTemplate
  assignedCount: number
  onRename: (name: string) => void
  onDuplicate: () => void
  onDelete: () => void
  addCategory: () => void
  renameCategory: (cid: string, name: string) => void
  moveCategory: (cid: string, dir: -1 | 1) => void
  deleteCategory: (cid: string) => void
  addBehavior: (cid: string) => void
  updateBehavior: (cid: string, bid: string, patch: Partial<TemplateBehavior>) => void
  deleteBehavior: (cid: string, bid: string) => void
  moveBehavior: (cid: string, bid: string, dir: -1 | 1) => void
  savingPulse: boolean
}) {
  const [openInfoIds, setOpenInfoIds] = useState<Set<string>>(new Set())
  const totalBeh = tpl.categories.reduce((s, c) => s + c.behaviors.length, 0)
  const toggleInfo = (bid: string) => {
    setOpenInfoIds(set => {
      const next = new Set(set); next.has(bid) ? next.delete(bid) : next.add(bid); return next
    })
  }

  return (
    <>
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <input
            value={tpl.name}
            onChange={e => onRename(e.target.value)}
            className="text-[22px] font-bold text-gray-900 bg-transparent w-full px-1 -mx-1 rounded hover:bg-gray-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Template name"
            spellCheck={false}
          />
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span><Users size={11} className="inline -mt-0.5 mr-1" /><b className="text-gray-700 font-semibold">{assignedCount}</b> assigned</span>
            <span className="text-gray-300">·</span>
            <span><b className="text-gray-700 font-semibold">{tpl.categories.length}</b> categories, <b className="text-gray-700 font-semibold">{totalBeh}</b> behaviors</span>
            {tpl.updated_at && <><span className="text-gray-300">·</span><span>Edited {formatDate(tpl.updated_at)}</span></>}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${savingPulse ? 'text-gray-500 bg-gray-100' : 'text-emerald-700 bg-emerald-50'}`}>
              {savingPulse ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {savingPulse ? 'Saving' : 'Saved'}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onDuplicate} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            <Copy size={13} /> Duplicate
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold border border-gray-200 text-red-600 hover:bg-red-50">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 pb-8">
          {tpl.categories.length === 0 ? (
            <div className="py-12 px-5 text-center text-gray-400">
              <FolderOpen size={38} className="mx-auto text-gray-300" />
              <div className="mt-2 text-[13px]">No categories yet.</div>
              <div className="text-xs mt-0.5">Start by grouping related behaviors — e.g. <i>Meetings</i> or <i>Interviews</i>.</div>
              <button onClick={addCategory} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-white mt-3.5" style={{ background: STEWARD_PRIMARY }}>
                <Plus size={13} /> Add first category
              </button>
            </div>
          ) : tpl.categories.map((cat, ci) => (
            <CategoryBlock
              key={cat.id}
              cat={cat}
              isFirst={ci === 0}
              isLast={ci === tpl.categories.length - 1}
              onRename={n => renameCategory(cat.id, n)}
              onMoveUp={() => moveCategory(cat.id, -1)}
              onMoveDown={() => moveCategory(cat.id, +1)}
              onDelete={() => deleteCategory(cat.id)}
              onAddBehavior={() => addBehavior(cat.id)}
              onUpdateBehavior={(bid, patch) => updateBehavior(cat.id, bid, patch)}
              onDeleteBehavior={bid => deleteBehavior(cat.id, bid)}
              onMoveBehavior={(bid, dir) => moveBehavior(cat.id, bid, dir)}
              openInfoIds={openInfoIds}
              toggleInfo={toggleInfo}
            />
          ))}
          {tpl.categories.length > 0 && (
            <button onClick={addCategory} className="w-full flex items-center justify-center gap-2 px-3.5 py-3.5 rounded-md text-[13px] font-semibold text-gray-500 border border-dashed border-gray-300 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50 mt-2 transition-colors" style={{ color: '#6B7280' }}>
              <Plus size={14} /> Add category
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function CategoryBlock({ cat, isFirst, isLast, onRename, onMoveUp, onMoveDown,
                         onDelete, onAddBehavior, onUpdateBehavior, onDeleteBehavior,
                         onMoveBehavior, openInfoIds, toggleInfo }: {
  cat: TemplateCategory & { behaviors: TemplateBehavior[] }
  isFirst: boolean
  isLast: boolean
  onRename: (name: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onAddBehavior: () => void
  onUpdateBehavior: (bid: string, patch: Partial<TemplateBehavior>) => void
  onDeleteBehavior: (bid: string) => void
  onMoveBehavior: (bid: string, dir: -1 | 1) => void
  openInfoIds: Set<string>
  toggleInfo: (bid: string) => void
}) {
  return (
    <div className="mb-4 border border-gray-200 rounded-md bg-white overflow-hidden">
      <div className="px-2 py-2.5 flex items-center gap-2 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col items-center text-gray-300 flex-shrink-0 px-0.5">
          <button onClick={onMoveUp} disabled={isFirst} className="block leading-none p-px hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-300" aria-label="Move up">
            <ChevronUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="block leading-none p-px hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-300" aria-label="Move down">
            <ChevronDown size={12} />
          </button>
        </div>
        <input
          value={cat.name}
          onChange={e => onRename(e.target.value)}
          className="flex-1 text-[15px] font-bold text-gray-800 bg-transparent px-1 -mx-1 rounded hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          aria-label="Category name"
        />
        <span className="text-[11px] text-gray-500 font-semibold">{cat.behaviors.length} behavior{cat.behaviors.length === 1 ? '' : 's'}</span>
        <button onClick={onDelete} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Delete category">
          <Trash2 size={14} />
        </button>
      </div>
      {cat.behaviors.map((b, bi) => (
        <BehaviorRow
          key={b.id}
          beh={b}
          isFirst={bi === 0}
          isLast={bi === cat.behaviors.length - 1}
          onChange={patch => onUpdateBehavior(b.id, patch)}
          onDelete={() => onDeleteBehavior(b.id)}
          onMoveUp={() => onMoveBehavior(b.id, -1)}
          onMoveDown={() => onMoveBehavior(b.id, +1)}
          infoOpen={openInfoIds.has(b.id)}
          onToggleInfo={() => toggleInfo(b.id)}
        />
      ))}
      <button onClick={onAddBehavior} className="w-full flex items-center gap-2 pl-7 pr-3 py-2.5 text-xs font-semibold text-gray-500 border-t border-dashed border-gray-200 hover:text-blue-600 hover:bg-blue-50 transition-colors">
        <Plus size={14} /> Add behavior
      </button>
    </div>
  )
}

function BehaviorRow({ beh, isFirst, isLast, onChange, onDelete, onMoveUp, onMoveDown, infoOpen, onToggleInfo }: {
  beh: TemplateBehavior
  isFirst: boolean
  isLast: boolean
  onChange: (patch: Partial<TemplateBehavior>) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  infoOpen: boolean
  onToggleInfo: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = taRef.current; if (!el) return
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'
  }, [beh.name])

  return (
    <>
      <div className="flex items-start gap-2 px-2 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
        <div className="flex flex-col items-center text-gray-300 pt-1.5 flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="block leading-none p-px hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-300" aria-label="Move up">
            <ChevronUp size={11} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="block leading-none p-px hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-300" aria-label="Move down">
            <ChevronDown size={11} />
          </button>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-start gap-1.5">
            <textarea
              ref={taRef}
              value={beh.name}
              rows={1}
              spellCheck={false}
              placeholder="Describe the behavior — e.g. Interview HC (W1, Mission)"
              onChange={e => onChange({ name: e.target.value })}
              className="flex-1 text-[13px] text-gray-800 bg-transparent px-2 py-1.5 rounded leading-relaxed resize-none overflow-hidden font-sans focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white hover:ring-1 hover:ring-gray-200"
            />
            <button
              onClick={onToggleInfo}
              className={`p-1.5 rounded inline-flex flex-shrink-0 ${infoOpen || beh.info_text ? '' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`}
              style={(infoOpen || beh.info_text) ? { color: STEWARD_PRIMARY, background: STEWARD_PRIMARY_FADE } : undefined}
              title={beh.info_text || 'Add handbook reference'}
            >
              <Info size={16} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0" title="Delete">
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap pl-2">
            <div className="inline-flex bg-gray-100 rounded-md p-0.5 gap-0.5" role="tablist" aria-label="Frequency">
              {(['weekly', 'monthly', 'quarterly'] as Frequency[]).map(f => {
                const on = beh.frequency === f
                return (
                  <button
                    key={f}
                    aria-pressed={on}
                    onClick={() => onChange({ frequency: f, interval: 1 })}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded ${on ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    style={on ? { color: STEWARD_PRIMARY } : undefined}
                  >
                    {FREQ_LONG[f]}
                  </button>
                )
              })}
            </div>
            <div className="inline-flex items-center gap-1 bg-gray-100 rounded-md px-2 py-0.5" title="Every N periods">
              <span className="text-[10px] text-gray-400 font-semibold">every</span>
              <button
                disabled={(beh.interval ?? 1) <= 1}
                onClick={() => onChange({ interval: Math.max(1, (beh.interval ?? 1) - 1) })}
                className="w-4 h-4 rounded bg-white text-gray-600 hover:text-blue-600 disabled:opacity-40 flex items-center justify-center"
                aria-label="Decrease interval"
              >
                <Minus size={10} />
              </button>
              <span className="min-w-[16px] text-center font-bold text-gray-700 text-[11px]">{beh.interval ?? 1}</span>
              <button
                onClick={() => onChange({ interval: (beh.interval ?? 1) + 1 })}
                className="w-4 h-4 rounded bg-white text-gray-600 hover:text-blue-600 flex items-center justify-center"
                aria-label="Increase interval"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {infoOpen && (
        <div className="px-3 pb-2.5 pl-9">
          <div className="flex items-start gap-2 px-2.5 py-2 rounded-md" style={{ background: STEWARD_PRIMARY_FADE, border: '1px solid #BFDBFE' }}>
            <Book size={13} className="flex-shrink-0 mt-0.5" style={{ color: STEWARD_PRIMARY_DARK }} />
            <textarea
              rows={3}
              placeholder="Handbook reference or note — shown to users via the info icon. e.g. 'Held twice monthly if feasible. (Handbook 6.2.1.2)'"
              value={beh.info_text || ''}
              onChange={e => onChange({ info_text: e.target.value })}
              className="flex-1 bg-transparent text-[11px] leading-relaxed resize-y min-h-[36px] w-full font-sans focus:outline-none"
              style={{ color: STEWARD_PRIMARY_DARK }}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ─── People view ────────────────────────────────────────────────────────────
function PeopleView({ users, templates, search, setSearch, filter, setFilter, onChange }: {
  users: UserRow[]
  templates: FullTemplate[]
  search: string
  setSearch: (v: string) => void
  filter: string
  setFilter: (v: string) => void
  onChange: (u: UserRow) => void
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (q) {
        const hay = `${u.full_name || ''} ${u.email || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filter === 'needs') return !u.selected_template_id && !u.stake_role
      if (filter.startsWith('tpl:')) return u.selected_template_id === filter.slice(4)
      return true
    })
  }, [users, search, filter])

  const needs = filtered.filter(u => !u.selected_template_id && !u.stake_role)
  const assigned = filtered.filter(u => u.selected_template_id || u.stake_role)
  const tplName = (id: string | null) => id ? (templates.find(t => t.id === id)?.name ?? 'Unknown') : null

  return (
    <div className="p-4 px-5 grid gap-3.5 max-w-[1240px] mx-auto w-full">
      {/* Toolbar */}
      <div className="flex gap-2.5 items-center flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
          />
        </div>
        <ChipBtn active={filter === 'all'} onClick={() => setFilter('all')}>
          All <span className="ml-1.5 text-[10px] font-extrabold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{users.length}</span>
        </ChipBtn>
        <ChipBtn active={filter === 'needs'} onClick={() => setFilter('needs')}>
          <AlertCircle size={13} className="text-amber-500 mr-1" />
          Needs calling <span className="ml-1.5 text-[10px] font-extrabold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{users.filter(u => !u.selected_template_id && !u.stake_role).length}</span>
        </ChipBtn>
        {templates.map(t => {
          const n = users.filter(u => u.selected_template_id === t.id).length
          if (n === 0) return null
          return (
            <ChipBtn key={t.id} active={filter === `tpl:${t.id}`} onClick={() => setFilter(filter === `tpl:${t.id}` ? 'all' : `tpl:${t.id}`)}>
              {t.name} <span className="ml-1.5 text-[10px] font-extrabold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{n}</span>
            </ChipBtn>
          )
        })}
      </div>

      {needs.length > 0 && (
        <div className="bg-white border rounded-md overflow-hidden shadow-sm" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div className="px-4 py-3.5 flex items-center justify-between border-b" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
            <div className="text-[13px] font-bold flex items-center gap-2" style={{ color: '#78350F' }}>
              <AlertTriangle size={14} className="text-amber-500" />
              Needs calling assignment
              <span className="text-[11px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: '#F59E0B' }}>{needs.length}</span>
            </div>
            <div className="text-[11px] text-gray-500">Pick a template to apply their calling&apos;s standard work.</div>
          </div>
          {needs.map(u => <PRow key={u.id} u={u} tplName={null} onChange={() => onChange(u)} alert />)}
        </div>
      )}

      {filter === 'all' ? (
        templates.map(t => {
          const list = assigned.filter(u => u.selected_template_id === t.id)
          if (list.length === 0) return null
          return (
            <div key={t.id} className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
              <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100">
                <div className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={14} style={{ color: STEWARD_PRIMARY }} />
                  {t.name}
                  <span className="text-[11px] font-extrabold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{list.length}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {t.categories.reduce((s, c) => s + c.behaviors.length, 0)} behaviors across {t.categories.length} categories
                </div>
              </div>
              {list.map(u => <PRow key={u.id} u={u} tplName={t.name} onChange={() => onChange(u)} />)}
            </div>
          )
        }).concat(
          // Admin-only users (stake_role but no template) get their own section
          (() => {
            const adminOnly = assigned.filter(u => !u.selected_template_id && u.stake_role)
            if (adminOnly.length === 0) return []
            return [(
              <div key="admin-only" className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100">
                  <div className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
                    <Key size={14} style={{ color: STEWARD_PRIMARY }} />
                    Admin-only (no calling template)
                    <span className="text-[11px] font-extrabold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{adminOnly.length}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">Quarterly Interviews + admin access only</div>
                </div>
                {adminOnly.map(u => <PRow key={u.id} u={u} tplName={null} onChange={() => onChange(u)} />)}
              </div>
            )]
          })()
        )
      ) : assigned.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100">
            <div className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
              <Users size={14} style={{ color: STEWARD_PRIMARY }} />
              {filter === 'needs' ? 'Filtered users' : (tplName(filter.slice(4)) ?? 'Filtered users')}
              <span className="text-[11px] font-extrabold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{assigned.length}</span>
            </div>
          </div>
          {assigned.map(u => <PRow key={u.id} u={u} tplName={tplName(u.selected_template_id)} onChange={() => onChange(u)} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-[13px] text-gray-400">No people match these filters.</div>
      )}
    </div>
  )
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
        active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
      }`}
      style={active ? { background: STEWARD_PRIMARY, borderColor: STEWARD_PRIMARY } : undefined}
    >
      {children}
    </button>
  )
}

function PRow({ u, tplName, onChange, alert }: { u: UserRow; tplName: string | null; onChange: () => void; alert?: boolean }) {
  return (
    <div className="grid items-center gap-3.5 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50" style={{ gridTemplateColumns: '36px minmax(160px,1.5fr) 1fr auto' }}>
      <span className={`w-9 h-9 rounded-full text-white text-[13px] font-bold flex items-center justify-center ${alert ? '' : ''}`} style={{ background: alert ? '#F59E0B' : STEWARD_PRIMARY }}>
        {initials(u.full_name || u.email)}
      </span>
      <div>
        <div className="text-[13px] font-semibold text-gray-800 leading-tight">{u.full_name || u.email || 'Unknown'}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">{u.email}</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-700">
        {tplName ? (
          <>
            <FileText size={13} style={{ color: STEWARD_PRIMARY }} />
            <span><b className="font-semibold text-gray-900">{tplName}</b></span>
            {u.stake_role && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: STEWARD_PRIMARY_FADE, color: STEWARD_PRIMARY_DARK }}>
                <Key size={9} />{STAKE_ROLE_LABELS[u.stake_role]}
              </span>
            )}
          </>
        ) : u.stake_role ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: STEWARD_PRIMARY_FADE, color: STEWARD_PRIMARY_DARK }}>
            <Key size={9} />{STAKE_ROLE_LABELS[u.stake_role]}
          </span>
        ) : (
          <span className="text-xs font-semibold italic" style={{ color: '#92400E' }}>No calling template</span>
        )}
      </div>
      <div className="flex gap-1.5 justify-end">
        {alert ? (
          <button onClick={onChange} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ background: STEWARD_PRIMARY }}>
            <Plus size={13} /> Assign calling
          </button>
        ) : (
          <button onClick={onChange} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            <ArrowLeftRight size={13} /> Change
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Modal: pick template ───────────────────────────────────────────────────
function TemplatePickerModal({ user, templates, onPick, onClose }: {
  user: UserRow
  templates: FullTemplate[]
  onPick: (tplId: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = templates.filter(t => t.name.toLowerCase().includes(q.toLowerCase()))
  const title = user.selected_template_id
    ? `Change calling — ${user.full_name || user.email}`
    : `Assign calling — ${user.full_name || user.email}`

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-gray-900/55 pt-16 pb-6 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3.5">
          <div>
            <div className="text-base font-bold text-gray-900">{title}</div>
            <div className="text-xs text-gray-500 mt-0.5">Pick the template this person should follow. Their checklist will be rebuilt from it.</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-gray-500 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="px-5 pt-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates" className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-white border border-gray-200 rounded-md focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">
          {list.map(t => {
            const beh = t.categories.reduce((s, c) => s + c.behaviors.length, 0)
            const isCurrent = user.selected_template_id === t.id
            return (
              <div
                key={t.id}
                onClick={() => !isCurrent && onPick(t.id)}
                className="flex items-center gap-3 px-3.5 py-3 mb-2 rounded-md cursor-pointer border-[1.5px] bg-white transition-colors hover:border-blue-500"
                style={isCurrent ? { borderColor: STEWARD_PRIMARY, background: STEWARD_PRIMARY_FADE } : { borderColor: '#E5E7EB' }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={isCurrent ? { background: STEWARD_PRIMARY, color: 'white' } : { background: '#F3F4F6', color: '#6B7280' }}>
                  <FileText size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{t.name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1"><Folder size={11} />{t.categories.length} categories</span>
                    <span className="inline-flex items-center gap-1"><CheckSquare size={11} />{beh} behaviors</span>
                  </div>
                </div>
                {isCurrent && <span className="text-[10px] font-extrabold tracking-wider text-white px-2 py-1 rounded-full" style={{ background: STEWARD_PRIMARY }}>CURRENT</span>}
              </div>
            )
          })}
          {list.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-gray-400">No templates match &ldquo;{q}&rdquo;.</div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({ title, sub, danger, onOk, onCancel }: {
  title: string; sub: string; danger?: boolean; onOk: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-gray-900/55 pt-16 pb-6 px-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={danger ? { background: '#FEF2F2', color: '#EF4444' } : { background: STEWARD_PRIMARY_FADE, color: STEWARD_PRIMARY }}>
              {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-gray-900">{title}</div>
              <div className="text-[13px] text-gray-500 mt-1 leading-relaxed">{sub}</div>
            </div>
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={onOk} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={danger ? { background: '#EF4444' } : { background: STEWARD_PRIMARY }}>
            {danger ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
