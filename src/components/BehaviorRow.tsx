'use client'

import { useState, useMemo } from 'react'
import DayCell from './DayCell'
import { Pencil, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { formatDate, isToday as checkIsToday, getPeriodCells, getCellLabel } from '@/lib/dates'

interface BehaviorRowProps {
  behavior: Behavior
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  compliancePercent: number | null
  onCellTap: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onCellLongPress: (behaviorId: string, date: string) => void
  onEditBehavior: (behaviorId: string) => void
  reorderMode: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  visibleCount: number
}

function cycleValue(current: EntryValue | null): EntryValue | null {
  if (!current) return 'y'
  if (current === 'y') return 'n'
  if (current === 'n') return 'na'
  return null
}

function freqLabel(frequency: string, interval: number): string {
  if (frequency === 'weekly') return interval > 1 ? `Every ${interval} wks` : 'Weekly'
  if (frequency === 'monthly') return interval > 1 ? `Every ${interval} mo` : 'Monthly'
  return interval > 1 ? `Every ${interval} qtrs` : 'Quarterly'
}

export default function BehaviorRow({
  behavior, entries, comments, compliancePercent,
  onCellTap, onCellLongPress, onEditBehavior,
  reorderMode, onMoveUp, onMoveDown, isFirst, isLast,
  visibleCount,
}: BehaviorRowProps) {
  const [offset, setOffset] = useState(0)

  const cells = useMemo(
    () => getPeriodCells(behavior.frequency, offset, visibleCount, behavior.interval ?? 1, behavior.anchor_date ?? null),
    [behavior.frequency, behavior.interval, behavior.anchor_date, offset, visibleCount]
  )

  const pct = compliancePercent != null ? Math.round(compliancePercent) : null
  const pctColor = pct == null ? 'text-gray-300' : pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex items-stretch border-b border-gray-100">
      {/* Col 1: Edit or Reorder */}
      <div className="sticky left-0 z-10 bg-white flex flex-col items-center justify-center w-9 md:w-11 min-w-[2.25rem] md:min-w-[2.75rem] border-r border-gray-100 py-1">
        {reorderMode ? (
          <>
            <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20">
              <ChevronUp size={14} className="md:hidden" /><ChevronUp size={18} className="hidden md:block" />
            </button>
            <button onClick={onMoveDown} disabled={isLast} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20">
              <ChevronDown size={14} className="md:hidden" /><ChevronDown size={18} className="hidden md:block" />
            </button>
          </>
        ) : (
          <button onClick={() => onEditBehavior(behavior.id)} className="p-0.5 text-gray-300 hover:text-blue-500">
            <Pencil size={12} className="md:hidden" /><Pencil size={16} className="hidden md:block" />
          </button>
        )}
      </div>

      {/* Col 2: Task description */}
      <div className="sticky left-9 md:left-11 z-10 bg-white flex items-center min-w-[100px] max-w-[100px] md:min-w-[200px] md:max-w-[200px] lg:min-w-[280px] lg:max-w-[280px] px-2 md:px-3 py-1.5 md:py-2 border-r border-gray-100">
        <p className="text-xs md:text-sm leading-tight text-gray-800 break-words min-w-0">{behavior.name}</p>
      </div>

      {/* Col 3: Frequency label */}
      <div className="sticky left-[136px] md:left-[244px] lg:left-[324px] z-10 bg-white flex items-center w-16 md:w-20 min-w-[4rem] md:min-w-[5rem] px-1.5 md:px-2 py-1 border-r border-gray-100">
        <span className="text-[10px] md:text-xs text-gray-500 font-medium">{freqLabel(behavior.frequency, behavior.interval ?? 1)}</span>
      </div>

      {/* Col 4: 12-occurrence compliance % */}
      <div className="sticky left-[200px] md:left-[324px] lg:left-[404px] z-10 bg-white flex items-center justify-center w-10 md:w-14 min-w-[2.5rem] md:min-w-[3.5rem] border-r border-gray-100">
        <span className={`text-[10px] md:text-sm font-bold ${pctColor}`}>
          {pct != null ? `${pct}%` : '—'}
        </span>
      </div>

      {/* Col 5: Period cells with scroll arrows */}
      <div className="flex items-center">
        <button
          onClick={() => setOffset(o => o - visibleCount)}
          className="p-0.5 md:p-1 text-gray-300 hover:text-gray-600 shrink-0"
        >
          <ChevronLeft size={14} className="md:hidden" /><ChevronLeft size={18} className="hidden md:block" />
        </button>

        <div className="flex items-stretch gap-0 md:gap-1">
          {cells.map(date => {
            const dateStr = formatDate(date)
            const key = `${behavior.id}_${dateStr}`
            const entry = entries.get(key)
            const comment = comments.get(key)
            const { top, bottom } = getCellLabel(date, behavior.frequency)

            return (
              <div key={dateStr} className="flex flex-col items-center px-0.5 md:px-1 py-1">
                <span className={`text-[7px] md:text-[9px] leading-none ${checkIsToday(date) ? 'text-blue-600' : 'text-gray-400'}`}>
                  {top}
                </span>
                <span className={`text-[9px] md:text-xs font-medium leading-none mb-0.5 ${checkIsToday(date) ? 'text-blue-600' : 'text-gray-500'}`}>
                  {bottom}
                </span>
                <DayCell
                  value={entry?.value ?? null}
                  hasComment={!!comment}
                  isToday={checkIsToday(date)}
                  isApplicable={true}
                  onTap={() => onCellTap(behavior.id, dateStr, entry?.value ?? null)}
                  onLongPress={() => onCellLongPress(behavior.id, dateStr)}
                />
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setOffset(o => o + visibleCount)}
          className="p-0.5 md:p-1 text-gray-300 hover:text-gray-600 shrink-0"
        >
          <ChevronRight size={14} className="md:hidden" /><ChevronRight size={18} className="hidden md:block" />
        </button>
      </div>
    </div>
  )
}

export { cycleValue }
