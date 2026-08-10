'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/dates'
import { setBehaviorSharing } from '@/lib/hooks/useSharing'
import ShareWithPicker from '@/components/ShareWithPicker'
import type { Frequency } from '@/lib/types'

interface AddBehaviorModalProps {
  userId: string
  categoryId: string
  categoryName: string
  existingCount: number
  onSuccess: () => void
  onClose: () => void
}

export default function AddBehaviorModal({
  userId, categoryId, categoryName, existingCount, onSuccess, onClose,
}: AddBehaviorModalProps) {
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [interval, setInterval] = useState(1)
  const [anchorDate, setAnchorDate] = useState(formatDate(new Date()))
  const [shareIds, setShareIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const { data, error: insertErr } = await supabase.from('steward_behaviors').insert({
      user_id: userId,
      category_id: categoryId,
      name: name.trim(),
      frequency,
      interval,
      anchor_date: frequency === 'weekly' && interval > 1 ? anchorDate : null,
      sort_order: existingCount,
    }).select('id').single()

    if (insertErr || !data) {
      setError(insertErr?.message ?? 'Could not add the behavior.')
      setLoading(false)
      return
    }

    if (shareIds.length > 0) {
      const { error: shareErr } = await setBehaviorSharing(data.id as string, shareIds)
      if (shareErr) {
        setError(`Added the task, but sharing failed: ${shareErr}`)
        setLoading(false)
        onSuccess()
        return
      }
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Add Behavior</h3>
            <p className="text-xs text-gray-500">in {categoryName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="beh-name" className="block text-sm font-medium text-gray-700 mb-1">
              Behavior / Action
            </label>
            <input
              id="beh-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Review ward council agenda"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <div className="flex gap-2">
              <select
                value={frequency}
                onChange={e => { setFrequency(e.target.value as Frequency); setInterval(1) }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Every how many weeks?
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Every</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">{interval === 1 ? 'week' : 'weeks'}</span>
              </div>
            </div>
          )}

          {frequency === 'weekly' && interval > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting from week of
              </label>
              <input
                type="date"
                value={anchorDate}
                onChange={e => setAnchorDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Pick any date in the first week this task applies</p>
            </div>
          )}

          <ShareWithPicker selected={shareIds} onChange={setShareIds} disabled={loading} />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-steward-primary text-white rounded-lg text-sm font-medium hover:bg-steward-primary-dark disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Behavior'}
          </button>
        </form>
      </div>
    </div>
  )
}
