'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, X, Trash2, Users, FileText, Link2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type {
  Template, TemplateCategory, TemplateBehavior,
  UserGroup, GroupMember, TemplateAssignment, Frequency,
} from '@/lib/types'

type AdminTab = 'templates' | 'groups' | 'assign'

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAdmin, adminLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('templates')

  // Show loading while auth or admin check in progress
  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">Please log in first.</p>
        <button onClick={() => router.push('/login')} className="text-sm text-blue-600 hover:underline">Go to Login</button>
      </div>
    )
  }

  // Not admin
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
        <h1 className="text-lg font-bold text-gray-900">Admin</h1>
      </header>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 bg-white">
        {([
          { id: 'templates' as AdminTab, label: 'Templates', icon: FileText },
          { id: 'groups' as AdminTab, label: 'Groups', icon: Users },
          { id: 'assign' as AdminTab, label: 'Assign', icon: Link2 },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4">
        {activeTab === 'templates' && <TemplatesSection userId={user.id} />}
        {activeTab === 'groups' && <GroupsSection userId={user.id} />}
        {activeTab === 'assign' && <AssignSection />}
      </div>
    </div>
  )
}

// ─── Templates Section ───

function TemplatesSection({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<string | null>(null) // template id
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('lsw_templates').select('*').order('created_at')
    setTemplates((data ?? []) as Template[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function handleCreate() {
    if (!newName.trim()) return
    await supabase.from('lsw_templates').insert({ name: newName.trim(), created_by: userId })
    setNewName('')
    fetch()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template and all its contents?')) return
    await supabase.from('lsw_templates').delete().eq('id', id)
    fetch()
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 px-1">
        Create templates from the main Work tab using &quot;Save as Template&quot;. Edit or delete them here.
      </p>

      {/* List */}
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">No templates yet.</div>
      ) : (
        templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">{t.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(editing === t.id ? null : t.id)}
                  className={`px-3 py-1 rounded text-xs font-medium ${editing === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  {editing === t.id ? 'Close' : 'Edit'}
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {editing === t.id && <TemplateEditor templateId={t.id} />}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Template Editor (categories + behaviors within a template) ───

function TemplateEditor({ templateId }: { templateId: string }) {
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [behaviors, setBehaviors] = useState<TemplateBehavior[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [addingBehavior, setAddingBehavior] = useState<string | null>(null) // category id
  const [newBehName, setNewBehName] = useState('')
  const [newBehFreq, setNewBehFreq] = useState<Frequency>('weekly')

  const fetch = useCallback(async () => {
    const [catRes, behRes] = await Promise.all([
      supabase.from('lsw_template_categories').select('*').eq('template_id', templateId).order('sort_order'),
      supabase.from('lsw_template_behaviors').select('*').order('sort_order'),
    ])
    const cats = (catRes.data ?? []) as TemplateCategory[]
    setCategories(cats)
    const catIds = cats.map(c => c.id)
    setBehaviors(((behRes.data ?? []) as TemplateBehavior[]).filter(b => catIds.includes(b.category_id)))
  }, [templateId])

  useEffect(() => { fetch() }, [fetch])

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    await supabase.from('lsw_template_categories').insert({
      template_id: templateId, name: newCatName.trim(), sort_order: categories.length,
    })
    setNewCatName('')
    fetch()
  }

  async function handleDeleteCategory(id: string) {
    await supabase.from('lsw_template_categories').delete().eq('id', id)
    fetch()
  }

  async function handleAddBehavior(categoryId: string) {
    if (!newBehName.trim()) return
    const count = behaviors.filter(b => b.category_id === categoryId).length
    await supabase.from('lsw_template_behaviors').insert({
      category_id: categoryId, name: newBehName.trim(), frequency: newBehFreq, sort_order: count,
    })
    setNewBehName('')
    setNewBehFreq('weekly')
    setAddingBehavior(null)
    fetch()
  }

  async function handleDeleteBehavior(id: string) {
    await supabase.from('lsw_template_behaviors').delete().eq('id', id)
    fetch()
  }

  const freqLabel = (f: string) => ({ weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' }[f] ?? f)

  return (
    <div className="p-4 space-y-3">
      {categories.map(cat => (
        <div key={cat.id} className="border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg">
            <span className="text-xs font-bold text-gray-600 uppercase">{cat.name}</span>
            <div className="flex gap-1">
              <button onClick={() => setAddingBehavior(addingBehavior === cat.id ? null : cat.id)} className="text-xs text-blue-600 hover:underline">
                + Behavior
              </button>
              <button onClick={() => handleDeleteCategory(cat.id)} className="p-0.5 text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="px-3 py-1">
            {behaviors.filter(b => b.category_id === cat.id).map(beh => (
              <div key={beh.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm text-gray-700">{beh.name}</span>
                  <span className="ml-2 text-[10px] text-gray-400">{freqLabel(beh.frequency ?? 'weekly')}</span>
                </div>
                <button onClick={() => handleDeleteBehavior(beh.id)} className="p-0.5 text-gray-300 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ))}
            {behaviors.filter(b => b.category_id === cat.id).length === 0 && (
              <p className="text-xs text-gray-400 py-2">No behaviors yet</p>
            )}
          </div>

          {addingBehavior === cat.id && (
            <div className="px-3 py-2 bg-blue-50 border-t border-blue-100 space-y-2">
              <input
                value={newBehName}
                onChange={e => setNewBehName(e.target.value)}
                placeholder="Behavior name"
                autoFocus
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleAddBehavior(cat.id)}
              />
              <div className="flex gap-2">
                <select value={newBehFreq} onChange={e => setNewBehFreq(e.target.value as Frequency)} className="px-2 py-1 border border-gray-300 rounded text-xs">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <button onClick={() => handleAddBehavior(cat.id)} disabled={!newBehName.trim()} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium disabled:opacity-50">
                  Add
                </button>
                <button onClick={() => setAddingBehavior(null)} className="px-3 py-1 text-gray-500 text-xs">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add category */}
      <div className="flex gap-2">
        <input
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          placeholder="New category name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
        />
        <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-200">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Groups Section ───

function GroupsSection({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [members, setMembers] = useState<(GroupMember & { email?: string })[]>([])
  const [newName, setNewName] = useState('')
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: groupData } = await supabase.from('lsw_user_groups').select('*').order('name')
    setGroups((groupData ?? []) as UserGroup[])
    const { data: memberData } = await supabase.from('lsw_group_members').select('*')
    setMembers((memberData ?? []) as GroupMember[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function handleCreate() {
    if (!newName.trim()) return
    await supabase.from('lsw_user_groups').insert({ name: newName.trim(), created_by: userId })
    setNewName('')
    fetch()
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('Delete this group?')) return
    await supabase.from('lsw_user_groups').delete().eq('id', id)
    fetch()
  }

  async function handleAddMember(groupId: string) {
    setError('')
    const email = newMemberEmail.trim().toLowerCase()
    if (!email) return

    // Look up user by email in auth — we need to query profiles or use a workaround
    // Since we share Supabase with Magnify, profiles table has emails
    // But LSW might not have a profiles table. Let's check auth.users via a function or
    // just store the email and resolve later. Simplest: try to find in auth metadata.
    // Actually, let's query the Supabase auth admin API... we can't do that from client.
    // Instead, let's look up by matching email in the lsw_group_members approach:
    // We'll store user_id. But we need to find the user_id from email.
    // The profiles table (from Magnify) has email -> id mapping.

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      setError(`No user found with email: ${email}`)
      return
    }

    const { error: insertError } = await supabase
      .from('lsw_group_members')
      .insert({ group_id: groupId, user_id: profile.id })

    if (insertError) {
      if (insertError.code === '23505') setError('User is already in this group')
      else setError(insertError.message)
      return
    }

    setNewMemberEmail('')
    fetch()
  }

  async function handleRemoveMember(memberId: string) {
    await supabase.from('lsw_group_members').delete().eq('id', memberId)
    fetch()
  }

  // Fetch emails for display
  const [emailMap, setEmailMap] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const userIds = [...new Set(members.map(m => m.user_id))]
    if (userIds.length === 0) return
    supabase.from('profiles').select('id, email').in('id', userIds).then(({ data }) => {
      const map = new Map<string, string>()
      for (const p of data ?? []) map.set(p.id, p.email)
      setEmailMap(map)
    })
  }, [members])

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Create Group</h3>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Group name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Create
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">No groups yet.</div>
      ) : (
        groups.map(g => {
          const groupMembers = members.filter(m => m.group_id === g.id)
          const isEditing = editingGroup === g.id
          return (
            <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{g.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{groupMembers.length} members</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingGroup(isEditing ? null : g.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${isEditing ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {isEditing ? 'Close' : 'Manage'}
                  </button>
                  <button onClick={() => handleDeleteGroup(g.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="p-4 space-y-3">
                  {/* Add member */}
                  <div className="flex gap-2">
                    <input
                      value={newMemberEmail}
                      onChange={e => { setNewMemberEmail(e.target.value); setError('') }}
                      placeholder="User email address"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={e => e.key === 'Enter' && handleAddMember(g.id)}
                    />
                    <button onClick={() => handleAddMember(g.id)} disabled={!newMemberEmail.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      Add
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}

                  {/* Members list */}
                  {groupMembers.length === 0 ? (
                    <p className="text-xs text-gray-400">No members yet.</p>
                  ) : (
                    groupMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-700">{emailMap.get(m.user_id) ?? m.user_id}</span>
                        <button onClick={() => handleRemoveMember(m.id)} className="p-1 text-gray-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Assign Section ───

function AssignSection() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [tRes, gRes, aRes] = await Promise.all([
      supabase.from('lsw_templates').select('*').order('name'),
      supabase.from('lsw_user_groups').select('*').order('name'),
      supabase.from('lsw_template_assignments').select('*'),
    ])
    setTemplates((tRes.data ?? []) as Template[])
    setGroups((gRes.data ?? []) as UserGroup[])
    setAssignments((aRes.data ?? []) as TemplateAssignment[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function handleAssign() {
    if (!selectedTemplate || !selectedGroup) return
    await supabase.from('lsw_template_assignments').insert({
      template_id: selectedTemplate,
      group_id: selectedGroup,
    })
    fetch()
  }

  async function handleRemove(id: string) {
    await supabase.from('lsw_template_assignments').delete().eq('id', id)
    fetch()
  }

  const templateName = (id: string) => templates.find(t => t.id === id)?.name ?? '?'
  const groupName = (id: string) => groups.find(g => g.id === id)?.name ?? '?'

  if (loading) return <div className="text-center text-sm text-gray-400 py-8">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Assign Template to Group</h3>
        <div className="space-y-3">
          <select
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Select template...</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Select group...</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedTemplate || !selectedGroup}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </div>

      {/* Current assignments */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-xs text-gray-400">No assignments yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-800">{templateName(a.template_id)}</span>
                  <span className="mx-2 text-gray-300">→</span>
                  <span className="text-sm text-gray-600">{groupName(a.group_id)}</span>
                </div>
                <button onClick={() => handleRemove(a.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
