'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Plus, Pencil, Trash2, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

import { useAuth } from '@/lib/hooks/useAuth'
import {
  useInterviews, currentQuarter, pickCompletionDate, type PresidencyMember,
} from '@/lib/hooks/useInterviews'
import { STAKE_ROLE_LABELS, type Interview } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const QUARTERS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4]

interface IntervieweeGroup {
  name: string
  calling: string | null
  assigned_to_user_id: string | null
  byQuarter: Map<1 | 2 | 3 | 4, Interview>
}

function groupByInterviewee(interviews: Interview[]): IntervieweeGroup[] {
  const map = new Map<string, IntervieweeGroup>()
  for (const iv of interviews) {
    const key = iv.interviewee_name
    let group = map.get(key)
    if (!group) {
      group = {
        name: iv.interviewee_name,
        calling: iv.interviewee_calling,
        assigned_to_user_id: iv.assigned_to_user_id,
        byQuarter: new Map(),
      }
      map.set(key, group)
    }
    group.byQuarter.set(iv.quarter_num, iv)
    // Use the most-recently assigned/calling for header display
    if (iv.assigned_to_user_id) group.assigned_to_user_id = iv.assigned_to_user_id
    if (iv.interviewee_calling) group.calling = iv.interviewee_calling
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function memberLabel(members: PresidencyMember[], userId: string | null): string {
  if (!userId) return 'Unassigned'
  const m = members.find((x) => x.id === userId)
  if (!m) return 'Unknown'
  return m.full_name || m.email || 'Unnamed'
}

export default function InterviewsPage() {
  const router = useRouter()
  const { user, loading, canManageInterviews, statusLoading } = useAuth()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const { quarter_num: currentQ } = currentQuarter(today)

  const { interviews, members, loading: dataLoading, createInterview, updateInterview, toggleComplete, deleteInterview, refresh } =
    useInterviews(year, user?.id)

  const [filterUserId, setFilterUserId] = useState<string | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editingGroup, setEditingGroup] = useState<IntervieweeGroup | null>(null)
  const [openCell, setOpenCell] = useState<Interview | null>(null)

  const groups = useMemo(() => groupByInterviewee(interviews), [interviews])
  const visibleGroups = useMemo(() => {
    if (filterUserId === 'all') return groups
    return groups.filter((g) => g.assigned_to_user_id === filterUserId)
  }, [groups, filterUserId])

  // Stats: count completed across all visible groups for the current quarter
  const stats = useMemo(() => {
    let total = 0
    let done = 0
    for (const g of visibleGroups) {
      for (const q of QUARTERS) {
        const iv = g.byQuarter.get(q)
        if (iv) {
          total++
          if (iv.completed_at) done++
        }
      }
    }
    const currentTotal = visibleGroups.length
    const currentDone = visibleGroups.filter((g) => g.byQuarter.get(currentQ)?.completed_at).length
    return { total, done, currentTotal, currentDone }
  }, [visibleGroups, currentQ])

  // Per-assignee summary for the current quarter — assigned vs. completed.
  // Uses the unfiltered `groups` (not visibleGroups) so the summary always
  // reflects the full picture even when the user has filtered the grid.
  // Sorted: unassigned last; then by % done ascending so the people with the
  // most outstanding interviews surface first.
  const quarterSummary = useMemo(() => {
    type Row = { userId: string | null; assigned: number; done: number }
    const map = new Map<string, Row>()
    for (const g of groups) {
      const iv = g.byQuarter.get(currentQ)
      if (!iv) continue
      const key = iv.assigned_to_user_id ?? '__unassigned__'
      const row = map.get(key) ?? { userId: iv.assigned_to_user_id, assigned: 0, done: 0 }
      row.assigned += 1
      if (iv.completed_at) row.done += 1
      map.set(key, row)
    }
    const rows = Array.from(map.values())
    rows.sort((a, b) => {
      if (a.userId === null) return 1
      if (b.userId === null) return -1
      const aPct = a.assigned === 0 ? 1 : a.done / a.assigned
      const bPct = b.assigned === 0 ? 1 : b.done / b.assigned
      if (aPct !== bPct) return aPct - bPct
      return b.assigned - a.assigned
    })
    return rows
  }, [groups, currentQ])

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>
    )
  }

  if (!user) {
    if (typeof window !== 'undefined') router.push('/login')
    return null
  }

  if (!canManageInterviews) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Not available</h2>
          <p className="text-sm text-gray-500 mb-4">
            The Quarterly Interview Summary is only visible to the stake presidency and the executive secretary.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Steward
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b-[3px] border-steward-primary px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="p-1 text-gray-500 hover:text-gray-700"
          aria-label="Back to Steward"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Quarterly Interviews</h1>
          <p className="text-[11px] text-gray-500 leading-tight">
            Stake presidency interview tracker — {year}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-l-md"
              aria-label="Previous year"
            >
              ‹
            </button>
            <div className="px-2 py-1 text-sm font-semibold text-gray-700 min-w-[3.5rem] text-center">
              {year}
            </div>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-r-md"
              aria-label="Next year"
            >
              ›
            </button>
          </div>

          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value as string)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="all">All presidency members</option>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email} — {STAKE_ROLE_LABELS[m.stake_role]}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="text-xs text-gray-500 hidden sm:block">
            <span className="font-semibold text-gray-700">{stats.currentDone}</span> of{' '}
            <span className="font-semibold text-gray-700">{stats.currentTotal}</span> done this
            quarter · <span className="font-semibold text-gray-700">{stats.done}</span>/{stats.total} for the year
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-steward-primary text-white text-sm rounded-md hover:opacity-90"
          >
            <Plus size={14} /> Add interviewee
          </button>
        </div>

        {/* Mobile stats */}
        <div className="text-xs text-gray-500 sm:hidden">
          <span className="font-semibold text-gray-700">{stats.currentDone}</span>/
          <span className="font-semibold text-gray-700">{stats.currentTotal}</span> done this
          quarter · <span className="font-semibold text-gray-700">{stats.done}</span>/{stats.total} this year
        </div>

        {/* Per-assignee summary for the current quarter */}
        {quarterSummary.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Q{currentQ} {year} — by assignee
              </h2>
              <span className="text-[11px] text-gray-500">
                Counts every interviewee with a row in Q{currentQ} of {year}.
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Assignee</th>
                    <th className="text-right px-3 py-2 font-semibold">Assigned</th>
                    <th className="text-right px-3 py-2 font-semibold">Completed</th>
                    <th className="text-left px-3 py-2 font-semibold w-[40%]">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterSummary.map((row) => {
                    const pct = row.assigned === 0 ? 0 : Math.round((row.done / row.assigned) * 100)
                    const label = row.userId === null
                      ? 'Unassigned'
                      : memberLabel(members, row.userId)
                    return (
                      <tr key={row.userId ?? '__unassigned__'} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-2 text-gray-900 font-medium">
                          {label}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{row.assigned}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {row.done}
                          {row.done > 0 && row.done === row.assigned && (
                            <span className="ml-1 text-emerald-600">✓</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 tabular-nums w-9 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {dataLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading interviews…</div>
          ) : visibleGroups.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No interviewees yet. Click <span className="font-semibold">Add interviewee</span> to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                      Interviewee
                    </th>
                    <th className="text-left px-3 py-2 font-semibold min-w-[140px] hidden md:table-cell">
                      Assigned to
                    </th>
                    {QUARTERS.map((q) => (
                      <th
                        key={q}
                        className={`text-center px-2 py-2 font-semibold min-w-[88px] ${
                          q === currentQ && year === today.getFullYear() ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        Q{q}
                      </th>
                    ))}
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map((g) => (
                    <tr key={g.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-2 sticky left-0 bg-white z-10 align-top">
                        <div className="font-medium text-gray-900">{g.name}</div>
                        {g.calling && <div className="text-[11px] text-gray-500">{g.calling}</div>}
                        <div className="text-[11px] text-gray-500 md:hidden mt-0.5">
                          {memberLabel(members, g.assigned_to_user_id)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700 hidden md:table-cell align-top">
                        {memberLabel(members, g.assigned_to_user_id)}
                      </td>
                      {QUARTERS.map((q) => {
                        const iv = g.byQuarter.get(q)
                        if (!iv) {
                          return (
                            <td key={q} className="px-2 py-2 text-center text-gray-300">
                              —
                            </td>
                          )
                        }
                        const isDone = !!iv.completed_at
                        return (
                          <td key={q} className="px-2 py-2 text-center align-top">
                            <button
                              onClick={() =>
                                toggleComplete(
                                  iv,
                                  isDone ? null : pickCompletionDate(iv.year, iv.quarter_num, today)
                                )
                              }
                              onContextMenu={(e) => {
                                e.preventDefault()
                                setOpenCell(iv)
                              }}
                              className={`mx-auto w-9 h-9 rounded-md border flex items-center justify-center transition ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                                  : iv.scheduled_for
                                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                  : 'border-gray-300 text-gray-400 hover:border-steward-primary hover:text-steward-primary'
                              }`}
                              title={
                                isDone
                                  ? `Done ${format(parseISO(iv.completed_at!), 'MMM d')} — right-click for details`
                                  : iv.scheduled_for
                                  ? `Scheduled ${format(parseISO(iv.scheduled_for), 'MMM d')} — click to mark done`
                                  : 'Click to mark done · right-click for details'
                              }
                            >
                              {isDone ? <Check size={16} /> : iv.scheduled_for ? '·' : ''}
                            </button>
                            {(iv.completed_at || iv.scheduled_for) && (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {iv.completed_at
                                  ? format(parseISO(iv.completed_at), 'MMM d')
                                  : `→ ${format(parseISO(iv.scheduled_for!), 'MMM d')}`}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 align-top">
                        <button
                          onClick={() => setEditingGroup(g)}
                          className="p-1.5 text-gray-400 hover:text-gray-700"
                          aria-label={`Edit ${g.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400">
          Tip: click a quarter cell to toggle done / not done. Right-click (or long-press on mobile)
          for details — schedule date, notes, completion date.
        </p>
      </div>

      {showAdd && user && (
        <AddIntervieweeModal
          year={year}
          members={members}
          onClose={() => setShowAdd(false)}
          onCreate={async (input) => {
            // Insert one row per quarter
            for (const q of QUARTERS) {
              await createInterview({
                interviewee_name: input.interviewee_name,
                interviewee_calling: input.interviewee_calling,
                assigned_to_user_id: input.assigned_to_user_id,
                year,
                quarter_num: q,
              })
            }
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      {editingGroup && user && (
        <EditIntervieweeModal
          group={editingGroup}
          year={year}
          members={members}
          currentUserId={user.id}
          onClose={() => setEditingGroup(null)}
          onSaved={async () => {
            setEditingGroup(null)
            refresh()
          }}
          onDelete={async () => {
            // Delete all 4 quarter rows for this interviewee/year
            for (const q of QUARTERS) {
              const iv = editingGroup.byQuarter.get(q)
              if (iv) await deleteInterview(iv.id)
            }
            setEditingGroup(null)
          }}
        />
      )}

      {openCell && (
        <CellDetailModal
          interview={openCell}
          onClose={() => setOpenCell(null)}
          onSave={async (patch) => {
            await updateInterview(openCell.id, patch)
            setOpenCell(null)
          }}
        />
      )}
    </div>
  )
}

// ───────── Modals ─────────

function AddIntervieweeModal({
  year,
  members,
  onClose,
  onCreate,
}: {
  year: number
  members: PresidencyMember[]
  onClose: () => void
  onCreate: (input: {
    interviewee_name: string
    interviewee_calling: string | null
    assigned_to_user_id: string | null
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [calling, setCalling] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Add interviewee — {year}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm focus:outline-none focus:border-steward-primary"
            placeholder="e.g. John Smith"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Calling (optional)</label>
          <input
            type="text"
            value={calling}
            onChange={(e) => setCalling(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm focus:outline-none focus:border-steward-primary"
            placeholder="e.g. Bishop, Wilmette Ward"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned to</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm bg-white"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email} — {STAKE_ROLE_LABELS[m.stake_role]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-gray-500">
          Adds rows for all four quarters of {year}. Each can be marked complete independently.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true)
              await onCreate({
                interviewee_name: name.trim(),
                interviewee_calling: calling.trim() || null,
                assigned_to_user_id: assignedTo || null,
              })
              setSaving(false)
            }}
            className="px-3 py-2 text-sm bg-steward-primary text-white rounded-md disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditIntervieweeModal({
  group,
  year,
  members,
  currentUserId,
  onClose,
  onSaved,
  onDelete,
}: {
  group: IntervieweeGroup
  year: number
  members: PresidencyMember[]
  currentUserId: string
  onClose: () => void
  onSaved: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(group.name)
  const [calling, setCalling] = useState(group.calling ?? '')
  const [assignedTo, setAssignedTo] = useState<string>(group.assigned_to_user_id ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    // Apply the same name/calling/assigned_to to all 4 quarter rows
    const rows = Array.from(group.byQuarter.values())
    await Promise.all(
      rows.map((iv) =>
        supabase
          .from('steward_interviews')
          .update({
            interviewee_name: name.trim(),
            interviewee_calling: calling.trim() || null,
            assigned_to_user_id: assignedTo || null,
            last_updated_by: currentUserId,
          })
          .eq('id', iv.id)
      )
    )
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit interviewee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm focus:outline-none focus:border-steward-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Calling</label>
          <input
            type="text"
            value={calling}
            onChange={(e) => setCalling(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm focus:outline-none focus:border-steward-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned to</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm bg-white"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email} — {STAKE_ROLE_LABELS[m.stake_role]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-gray-500">
          Changes apply to all four quarters of {year} for this interviewee.
        </p>
        <div className="flex items-center justify-between pt-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">Delete all 4 quarters?</span>
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded-md"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs text-gray-600"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-red-600 hover:underline"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md">
              Cancel
            </button>
            <button
              disabled={!name.trim() || saving}
              onClick={save}
              className="px-3 py-2 text-sm bg-steward-primary text-white rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CellDetailModal({
  interview,
  onClose,
  onSave,
}: {
  interview: Interview
  onClose: () => void
  onSave: (patch: Partial<Interview>) => Promise<void>
}) {
  const [scheduledFor, setScheduledFor] = useState(interview.scheduled_for ?? '')
  const [completedAt, setCompletedAt] = useState(interview.completed_at ?? '')
  const [notes, setNotes] = useState(interview.notes ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            {interview.interviewee_name} — Q{interview.quarter_num} {interview.year}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled for</label>
          <input
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Completed on</label>
          <input
            type="date"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 min-h-[44px] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border-[1.5px] border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-steward-primary"
            placeholder="Anything to remember from this interview…"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onSave({
                scheduled_for: scheduledFor || null,
                completed_at: completedAt || null,
                notes: notes.trim() || null,
              })
              setSaving(false)
            }}
            className="px-3 py-2 text-sm bg-steward-primary text-white rounded-md disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
