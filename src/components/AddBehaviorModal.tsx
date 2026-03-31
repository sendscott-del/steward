'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RepeatUnit, MonthlyPattern } from '@/lib/types'
import FrequencyPicker from './FrequencyPicker'

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
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>('day')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [monthlyPattern, setMonthlyPattern] = useState<MonthlyPattern | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await supabase.from('lsw_behaviors').insert({
      user_id: userId,
      category_id: categoryId,
      name: name.trim(),
      repeat_interval: repeatInterval,
      repeat_unit: repeatUnit,
      days_of_week: repeatUnit === 'week' && daysOfWeek.length > 0 ? daysOfWeek : null,
      monthly_pattern: repeatUnit === 'month' ? monthlyPattern : null,
      sort_order: existingCount,
    })

    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
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
              placeholder="e.g., Review daily goals"
            />
          </div>

          <FrequencyPicker
            repeatInterval={repeatInterval}
            repeatUnit={repeatUnit}
            daysOfWeek={daysOfWeek}
            monthlyPattern={monthlyPattern}
            onIntervalChange={setRepeatInterval}
            onUnitChange={setRepeatUnit}
            onDaysChange={setDaysOfWeek}
            onMonthlyPatternChange={setMonthlyPattern}
          />

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
