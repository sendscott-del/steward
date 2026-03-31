'use client'

import DayCell from './DayCell'
import { Pencil, Archive } from 'lucide-react'
import type { Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { formatDate, isToday as checkIsToday, matchesRecurrence, formatFrequency } from '@/lib/dates'

interface BehaviorRowProps {
  behavior: Behavior
  weekDates: Date[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  compliancePercent: number | null // 4-week rolling %, null if no applicable days
  onCellTap: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onCellLongPress: (behaviorId: string, date: string) => void
  onEditBehavior: (behaviorId: string) => void
}

function cycleValue(current: EntryValue | null): EntryValue | null {
  if (!current) return 'y'
  if (current === 'y') return 'n'
  return null
}

export default function BehaviorRow({
  behavior, weekDates, entries, comments, compliancePercent,
  onCellTap, onCellLongPress, onEditBehavior,
}: BehaviorRowProps) {
  const freqDisplay = formatFrequency(
    behavior.repeat_interval ?? 1,
    behavior.repeat_unit ?? 'day',
    behavior.days_of_week,
    behavior.monthly_pattern
  )

  const pct = compliancePercent != null ? Math.round(compliancePercent) : null
  const pctColor = pct == null ? 'text-gray-300' : pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex items-stretch border-b border-gray-100">
      {/* Col 1: Edit + Archive */}
      <div className="sticky left-0 z-10 bg-white flex flex-col items-center justify-center w-9 min-w-[2.25rem] border-r border-gray-100 gap-1 py-1">
        <button onClick={() => onEditBehavior(behavior.id)} className="p-0.5 text-gray-300 hover:text-blue-500">
          <Pencil size={12} />
        </button>
      </div>

      {/* Col 2: Task description (wrapping) */}
      <div className="sticky left-9 z-10 bg-white flex items-center min-w-[100px] max-w-[100px] px-2 py-1.5 border-r border-gray-100">
        <div className="min-w-0">
          <p className="text-xs leading-tight text-gray-800 break-words">
            {behavior.is_new && (
              <span className="inline-block bg-blue-100 text-blue-700 text-[8px] font-medium px-0.5 rounded mr-0.5">
                NEW
              </span>
            )}
            {behavior.name}
          </p>
        </div>
      </div>

      {/* Col 3: Frequency */}
      <div className="sticky left-[136px] z-10 bg-white flex items-center w-14 min-w-[3.5rem] px-1 border-r border-gray-100">
        <span className="text-[9px] leading-tight text-gray-400 break-words">{freqDisplay}</span>
      </div>

      {/* Col 4: 4-week compliance % */}
      <div className="sticky left-[192px] z-10 bg-white flex items-center justify-center w-10 min-w-[2.5rem] border-r border-gray-100">
        <span className={`text-[10px] font-bold ${pctColor}`}>
          {pct != null ? `${pct}%` : '—'}
        </span>
      </div>

      {/* Col 5: Day cells */}
      <div className="flex items-center gap-1 px-1 py-1.5">
        {weekDates.map(date => {
          const dateStr = formatDate(date)
          const key = `${behavior.id}_${dateStr}`
          const entry = entries.get(key)
          const comment = comments.get(key)
          const isApplicable = matchesRecurrence(
            date,
            behavior.repeat_unit ?? 'day',
            behavior.repeat_interval ?? 1,
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
