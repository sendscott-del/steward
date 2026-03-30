'use client'

import { useState } from 'react'
import { X, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Behavior, Frequency, MonthlyPattern } from '@/lib/types'

interface EditBehaviorModalProps {
  behavior: Behavior
  onSuccess: () => void
  onClose: () => void
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function EditBehaviorModal({ behavior, onSuccess, onClose }: EditBehaviorModalProps) {
  const [name, setName] = useState(behavior.name)
  const [frequency, setFrequency] = useState<Frequency>(behavior.frequency)
  const [selectedDays, setSelectedDays] = useState<number[]>(behavior.days_of_week ?? [])
  const [isNew, setIsNew] = useState(behavior.is_new)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const mp = behavior.monthly_pattern
  const [monthlyType, setMonthlyType] = useState<'day_of_month' | 'nth_weekday'>(mp?.type ?? 'nth_weekday')
  const [monthlyDay, setMonthlyDay] = useState(mp?.type === 'day_of_month' ? (mp.day ?? 1) : 1)
  const [monthlyNth, setMonthlyNth] = useState(mp?.type === 'nth_weekday' ? (mp.nth ?? 1) : 1)
  const [monthlyWeekday, setMonthlyWeekday] = useState(mp?.type === 'nth_weekday' ? (mp.weekday ?? 0) : 0)

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    let daysOfWeek: number[] | null = null
    let monthlyPattern: MonthlyPattern | null = null

    if (frequency === 'weekly') {
      daysOfWeek = selectedDays.length > 0 ? selectedDays : null
    }

    if (frequency === 'monthly' || frequency === 'quarterly') {
      if (monthlyType === 'day_of_month') {
        monthlyPattern = { type: 'day_of_month', day: monthlyDay }
      } else {
        monthlyPattern = { type: 'nth_weekday', nth: monthlyNth, weekday: monthlyWeekday }
      }
    }

    await supabase
      .from('lsw_behaviors')
      .update({
        name: name.trim(),
        frequency,
        days_of_week: daysOfWeek,
        monthly_pattern: monthlyPattern,
        is_new: isNew,
        updated_at: new Date().toISOString(),
      })
      .eq('id', behavior.id)

    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleArchive() {
    setLoading(true)
    await supabase
      .from('lsw_behaviors')
      .update({ is_archived: !behavior.is_archived, updated_at: new Date().toISOString() })
      .eq('id', behavior.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setLoading(true)
    await supabase.from('lsw_behaviors').delete().eq('id', behavior.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
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
              id="edit-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="edit-freq" className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              id="edit-freq"
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">Daily (every day)</option>
              <option value="weekly">Weekly (specific days)</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Which days?</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition ${
                      selectedDays.includes(i)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(frequency === 'monthly' || frequency === 'quarterly') && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {frequency === 'quarterly' ? 'On which day of the quarter?' : 'On which day?'}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMonthlyType('nth_weekday')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    monthlyType === 'nth_weekday' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Day of week
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyType('day_of_month')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    monthlyType === 'day_of_month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Day of month
                </button>
              </div>
              {monthlyType === 'nth_weekday' ? (
                <div className="flex gap-2">
                  <select value={monthlyNth} onChange={e => setMonthlyNth(Number(e.target.value))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value={1}>1st</option>
                    <option value={2}>2nd</option>
                    <option value={3}>3rd</option>
                    <option value={4}>4th</option>
                    <option value={5}>Last</option>
                  </select>
                  <select value={monthlyWeekday} onChange={e => setMonthlyWeekday(Number(e.target.value))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {WEEKDAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                  </select>
                </div>
              ) : (
                <select value={monthlyDay} onChange={e => setMonthlyDay(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Day {i + 1}</option>)}
                </select>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">Show &quot;NEW&quot; badge</span>
          </label>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={handleArchive}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            {behavior.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
            {behavior.is_archived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg border ${
              confirmDelete ? 'bg-red-600 text-white border-red-600' : 'text-red-600 hover:bg-red-50 border-gray-200'
            }`}
          >
            <Trash2 size={14} />
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
