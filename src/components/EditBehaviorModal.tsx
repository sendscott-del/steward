'use client'

import { useState } from 'react'
import { X, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/dates'
import { setBehaviorSharing } from '@/lib/hooks/useSharing'
import ShareWithPicker from '@/components/ShareWithPicker'
import type { Behavior, Frequency } from '@/lib/types'

interface EditBehaviorModalProps {
  behavior: Behavior
  /** Everyone this task is currently shared with, excluding the signed-in leader. */
  sharedWith?: string[]
  onSuccess: () => void
  onClose: () => void
}

export default function EditBehaviorModal({ behavior, sharedWith = [], onSuccess, onClose }: EditBehaviorModalProps) {
  const [name, setName] = useState(behavior.name)
  const [frequency, setFrequency] = useState<Frequency>(behavior.frequency ?? 'weekly')
  const [interval, setInterval] = useState(behavior.interval ?? 1)
  const [anchorDate, setAnchorDate] = useState(behavior.anchor_date ?? formatDate(new Date()))
  const [infoText, setInfoText] = useState(behavior.info_text ?? '')
  const [shareIds, setShareIds] = useState<string[]>(sharedWith)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sharingChanged =
    shareIds.length !== sharedWith.length ||
    shareIds.some(id => !sharedWith.includes(id))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    await supabase.from('steward_behaviors').update({
      name: name.trim(),
      frequency,
      interval,
      anchor_date: frequency === 'weekly' && interval > 1 ? anchorDate : null,
      info_text: infoText.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', behavior.id)

    // Sharing runs after the update so everyone's copy picks up the new name,
    // frequency and notes.
    if (sharingChanged || behavior.shared_task_id) {
      const { error: shareErr } = await setBehaviorSharing(behavior.id, shareIds)
      if (shareErr) {
        setError(`Saved the task, but sharing failed: ${shareErr}`)
        setLoading(false)
        onSuccess()
        return
      }
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleArchive() {
    setLoading(true)
    await supabase.from('steward_behaviors').update({
      is_archived: !behavior.is_archived, updated_at: new Date().toISOString(),
    }).eq('id', behavior.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    await supabase.from('steward_behaviors').delete().eq('id', behavior.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Edit Behavior</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              Behavior / Action
            </label>
            <input
              id="edit-name" type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={e => { setFrequency(e.target.value as Frequency); setInterval(1) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Every how many weeks?</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Every</span>
                <input
                  type="number" min={1} max={52} value={interval}
                  onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">{interval === 1 ? 'week' : 'weeks'}</span>
              </div>
            </div>
          )}

          {frequency === 'weekly' && interval > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting from week of</label>
              <input
                type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Pick any date in the first week this task applies</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Info / Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={infoText}
              onChange={e => setInfoText(e.target.value)}
              placeholder="Add notes, references, or instructions for this behavior..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">This shows when tapping the ℹ️ icon on the work tab.</p>
          </div>

          <ShareWithPicker selected={shareIds} onChange={setShareIds} disabled={loading} />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button type="submit" disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-steward-primary text-white rounded-lg text-sm font-medium hover:bg-steward-primary-dark disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
          <button onClick={handleArchive} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
            {behavior.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
            {behavior.is_archived ? 'Unarchive' : 'Archive'}
          </button>
          <button onClick={handleDelete} disabled={loading} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg border ${confirmDelete ? 'bg-red-600 text-white border-red-600' : 'text-red-600 hover:bg-red-50 border-gray-200'}`}>
            <Trash2 size={14} />
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>

        {behavior.shared_task_id && (
          <p className="text-[11px] text-gray-500 mt-2">
            This is a shared task. Archiving or deleting it here removes it from your list only —
            the others keep theirs. To end the sharing for everyone, clear the list above and save.
          </p>
        )}
      </div>
    </div>
  )
}
