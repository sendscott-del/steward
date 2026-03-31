'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await supabase.from('lsw_behaviors').insert({
      user_id: userId,
      category_id: categoryId,
      name: name.trim(),
      frequency,
      sort_order: existingCount,
    })

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
            <label htmlFor="beh-freq" className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              id="beh-freq"
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Behavior'}
          </button>
        </form>
      </div>
    </div>
  )
}
