'use client'

import { useState } from 'react'
import { X, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Behavior, Frequency } from '@/lib/types'

interface EditBehaviorModalProps {
  behavior: Behavior
  onSuccess: () => void
  onClose: () => void
}

export default function EditBehaviorModal({ behavior, onSuccess, onClose }: EditBehaviorModalProps) {
  const [name, setName] = useState(behavior.name)
  const [frequency, setFrequency] = useState<Frequency>(behavior.frequency ?? 'weekly')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await supabase.from('lsw_behaviors').update({
      name: name.trim(), frequency, updated_at: new Date().toISOString(),
    }).eq('id', behavior.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleArchive() {
    setLoading(true)
    await supabase.from('lsw_behaviors').update({
      is_archived: !behavior.is_archived, updated_at: new Date().toISOString(),
    }).eq('id', behavior.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    await supabase.from('lsw_behaviors').delete().eq('id', behavior.id)
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
            <label htmlFor="edit-freq" className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              id="edit-freq" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <button type="submit" disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
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
      </div>
    </div>
  )
}
