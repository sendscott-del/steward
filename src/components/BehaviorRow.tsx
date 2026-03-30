'use client'

import DayCell from './DayCell'
import { Pencil } from 'lucide-react'
import type { Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { formatDate, isToday as checkIsToday, matchesRecurrence } from '@/lib/dates'

interface BehaviorRowProps {
  behavior: Behavior
  weekDates: Date[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  onCellTap: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onCellLongPress: (behaviorId: string, date: string) => void
  onEditBehavior: (behaviorId: string) => void
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'D',
  weekly: 'W',
  monthly: 'M',
  quarterly: 'Q',
}

function cycleValue(current: EntryValue | null): EntryValue | null {
  if (!current) return 'y'
  if (current === 'y') return 'n'
  return null
}

export default function BehaviorRow({
  behavior,
  weekDates,
  entries,
  comments,
  onCellTap,
  onCellLongPress,
  onEditBehavior,
}: BehaviorRowProps) {
  return (
    <div className="flex items-stretch border-b border-gray-100">
      {/* Sticky behavior name column */}
      <div className="sticky left-0 z-10 bg-white flex items-center min-w-[140px] max-w-[140px] px-2 py-2 border-r border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800 truncate" title={behavior.name}>
            {behavior.is_new && (
              <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-medium px-1 rounded mr-1">
                NEW
              </span>
            )}
            {behavior.name}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {FREQ_LABELS[behavior.frequency]}
            {behavior.frequency === 'weekly' && behavior.days_of_week && behavior.days_of_week.length > 0 && (
              <span className="ml-1">
                {behavior.days_of_week.map(d => ['S','M','T','W','T','F','S'][d]).join('')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onEditBehavior(behavior.id)}
          className="p-1 text-gray-300 hover:text-gray-500 shrink-0"
        >
          <Pencil size={12} />
        </button>
      </div>

      {/* Day cells */}
      <div className="flex items-center gap-1 px-1 py-1.5">
        {weekDates.map(date => {
          const dateStr = formatDate(date)
          const key = `${behavior.id}_${dateStr}`
          const entry = entries.get(key)
          const comment = comments.get(key)
          const isApplicable = matchesRecurrence(
            date,
            behavior.frequency,
            behavior.days_of_week ?? undefined,
            behavior.monthly_pattern ?? undefined
          )

          return (
            <DayCell
              key={dateStr}
              value={entry?.value ?? null}
              hasComment={!!comment}
              isToday={checkIsToday(date)}
              isApplicable={isApplicable}
              onTap={() => isApplicable && onCellTap(behavior.id, dateStr, entry?.value ?? null)}
              onLongPress={() => onCellLongPress(behavior.id, dateStr)}
            />
          )
        })}
      </div>
    </div>
  )
}

export { cycleValue }
