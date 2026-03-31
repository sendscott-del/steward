'use client'

import type { RepeatUnit, MonthlyPattern } from '@/lib/types'

interface FrequencyPickerProps {
  repeatInterval: number
  repeatUnit: RepeatUnit
  daysOfWeek: number[]
  monthlyPattern: MonthlyPattern | null
  onIntervalChange: (n: number) => void
  onUnitChange: (u: RepeatUnit) => void
  onDaysChange: (days: number[]) => void
  onMonthlyPatternChange: (p: MonthlyPattern) => void
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function FrequencyPicker({
  repeatInterval,
  repeatUnit,
  daysOfWeek,
  monthlyPattern,
  onIntervalChange,
  onUnitChange,
  onDaysChange,
  onMonthlyPatternChange,
}: FrequencyPickerProps) {
  function toggleDay(day: number) {
    if (daysOfWeek.includes(day)) {
      onDaysChange(daysOfWeek.filter(d => d !== day))
    } else {
      onDaysChange([...daysOfWeek, day].sort())
    }
  }

  const mp = monthlyPattern ?? { type: 'day_of_month' as const, day: 1 }

  return (
    <div className="space-y-3">
      {/* Repeats every [N] [unit] */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Repeats every</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={99}
            value={repeatInterval}
            onChange={e => onIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={repeatUnit}
            onChange={e => onUnitChange(e.target.value as RepeatUnit)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">{repeatInterval === 1 ? 'day' : 'days'}</option>
            <option value="week">{repeatInterval === 1 ? 'week' : 'weeks'}</option>
            <option value="month">{repeatInterval === 1 ? 'month' : 'months'}</option>
          </select>
        </div>
      </div>

      {/* Week: day picker */}
      {repeatUnit === 'week' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">On these days</label>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition ${
                  daysOfWeek.includes(i)
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

      {/* Month: day-of-month or nth weekday */}
      {repeatUnit === 'month' && (
        <div className="space-y-3">
          {/* Option 1: Day of month */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mp.type === 'day_of_month'}
              onChange={() => onMonthlyPatternChange({ type: 'day_of_month', day: mp.day ?? 1 })}
              className="text-blue-600"
            />
            <select
              value={mp.type === 'day_of_month' ? (mp.day ?? 1) : 1}
              onChange={e => onMonthlyPatternChange({ type: 'day_of_month', day: parseInt(e.target.value) })}
              disabled={mp.type !== 'day_of_month'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          </label>

          {/* Option 2: Nth weekday */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mp.type === 'nth_weekday'}
              onChange={() => onMonthlyPatternChange({ type: 'nth_weekday', nth: mp.nth ?? 1, weekday: mp.weekday ?? 0 })}
              className="text-blue-600"
            />
            <select
              value={mp.type === 'nth_weekday' ? (mp.nth ?? 1) : 1}
              onChange={e => onMonthlyPatternChange({ type: 'nth_weekday', nth: parseInt(e.target.value), weekday: mp.weekday ?? 0 })}
              disabled={mp.type !== 'nth_weekday'}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>First</option>
              <option value={2}>Second</option>
              <option value={3}>Third</option>
              <option value={4}>Fourth</option>
              <option value={5}>Last</option>
            </select>
            <select
              value={mp.type === 'nth_weekday' ? (mp.weekday ?? 0) : 0}
              onChange={e => onMonthlyPatternChange({ type: 'nth_weekday', nth: mp.nth ?? 1, weekday: parseInt(e.target.value) })}
              disabled={mp.type !== 'nth_weekday'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {WEEKDAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}
