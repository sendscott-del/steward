'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, Plus, Pencil, MessageSquare, Check, X, Minus } from 'lucide-react'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { formatDate } from '@/lib/dates'

interface PeriodChecklistProps {
  title: string
  periodDate: Date
  periodLabel: string
  periodOffset: number // negative=past, 0=current, positive=future
  frequency: 'weekly' | 'monthly' | 'quarterly'
  categories: Category[]
  behaviors: Behavior[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  complianceMap: Map<string, number | null>
  onToggle: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onComment: (behaviorId: string, date: string) => void
  onEditBehavior: (behaviorId: string) => void
  onEditCategory: (categoryId: string) => void
  onAddBehavior: (categoryId: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function cycleValue(current: EntryValue | null): EntryValue | null {
  if (!current) return 'y'
  if (current === 'y') return 'n'
  if (current === 'n') return 'na'
  return null
}

const COMPLIANCE_LABELS: Record<string, string> = {
  weekly: 'L12W',
  monthly: 'L12M',
  quarterly: 'L4Q',
}

export default function PeriodChecklist({
  title, periodDate, periodLabel, periodOffset, frequency,
  categories, behaviors, entries, comments, complianceMap,
  onToggle, onComment, onEditBehavior, onEditCategory, onAddBehavior,
  onPrev, onNext, onToday,
}: PeriodChecklistProps) {
  const [collapsed, setCollapsed] = useState(false)
  const dateStr = formatDate(periodDate)

  const isCurrentPeriod = periodOffset === 0
  const isPast = periodOffset < 0
  const isFuture = periodOffset > 0

  // Count completion
  const applicable = behaviors.filter(b => !b.is_archived)
  const done = applicable.filter(b => {
    const entry = entries.get(`${b.id}_${dateStr}`)
    return entry?.value === 'y' || entry?.value === 'na'
  }).length
  const total = applicable.length

  // Group behaviors by category
  const behaviorsByCategory = new Map<string, Behavior[]>()
  for (const cat of categories) behaviorsByCategory.set(cat.id, [])
  for (const beh of behaviors) {
    if (beh.is_archived) continue
    const list = behaviorsByCategory.get(beh.category_id)
    if (list) list.push(beh)
  }

  return (
    <div className="mb-3">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          <h2 className="text-sm md:text-base font-bold text-gray-800">{title}</h2>
        </div>
        <span className={`text-xs md:text-sm font-bold ${done === total && total > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          {done}/{total}
        </span>
      </button>

      {/* Period navigation */}
      {!collapsed && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
          <button onClick={onPrev} className="p-1 text-gray-400 hover:text-gray-700">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center flex items-center gap-2">
            <span className="text-xs md:text-sm font-medium text-gray-600">{periodLabel}</span>
            {isCurrentPeriod ? (
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Current</span>
            ) : isPast ? (
              <button onClick={onToday} className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-200">
                Past ↩
              </button>
            ) : (
              <button onClick={onToday} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100">
                Future ↩
              </button>
            )}
          </div>
          <button onClick={onNext} className="p-1 text-gray-400 hover:text-gray-700">
            <ChevronRightIcon size={18} />
          </button>
        </div>
      )}

      {/* Checklist */}
      {!collapsed && (
        <div>
          {categories.map(cat => {
            const catBehaviors = behaviorsByCategory.get(cat.id) ?? []
            if (catBehaviors.length === 0) return null

            return (
              <div key={cat.id}>
                {/* Category label */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide">{cat.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onEditCategory(cat.id)} className="p-0.5 text-gray-300 hover:text-gray-500">
                      <Pencil size={10} />
                    </button>
                    <button onClick={() => onAddBehavior(cat.id)} className="p-0.5 text-gray-300 hover:text-blue-500">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Behavior items */}
                {catBehaviors.map(beh => {
                  const key = `${beh.id}_${dateStr}`
                  const entry = entries.get(key)
                  const comment = comments.get(key)
                  const hasComment = !!comment
                  const value = entry?.value ?? null
                  const pct = complianceMap.get(beh.id)
                  const pctRounded = pct != null ? Math.round(pct) : null
                  const compLabel = COMPLIANCE_LABELS[frequency]

                  return (
                    <div key={beh.id} className="flex items-center gap-3 px-4 py-3 md:py-3.5 border-b border-gray-100 bg-white">
                      {/* Status button */}
                      <button
                        onClick={() => onToggle(beh.id, dateStr, value)}
                        className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-sm transition ${
                          value === 'y' ? 'bg-green-500 text-white' :
                          value === 'n' ? 'bg-red-500 text-white' :
                          value === 'na' ? 'bg-gray-300 text-white' :
                          'bg-gray-100 border-2 border-gray-200 text-gray-300'
                        }`}
                      >
                        {value === 'y' && <Check size={18} />}
                        {value === 'n' && <X size={18} />}
                        {value === 'na' && <Minus size={18} />}
                      </button>

                      {/* Task name + compliance */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm md:text-base leading-snug ${value === 'y' ? 'text-gray-400 line-through' : value === 'na' ? 'text-gray-400' : 'text-gray-800'}`}>
                          {beh.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {pctRounded != null && (
                            <span className={`text-[10px] font-medium ${pctRounded >= 80 ? 'text-green-600' : pctRounded >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {pctRounded}% {compLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comment button — filled when has comment */}
                      <button
                        onClick={() => onComment(beh.id, dateStr)}
                        className={`p-1.5 shrink-0 ${hasComment ? 'text-blue-500' : 'text-gray-300 hover:text-blue-400'}`}
                      >
                        {hasComment ? (
                          <MessageSquare size={16} fill="currentColor" />
                        ) : (
                          <MessageSquare size={16} />
                        )}
                      </button>

                      {/* Edit button */}
                      <button
                        onClick={() => onEditBehavior(beh.id)}
                        className="p-1.5 text-gray-300 hover:text-gray-500 shrink-0"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { cycleValue }
