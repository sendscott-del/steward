'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, Plus, Pencil, MessageSquare, Check, X, Minus, CalendarPlus, Info } from 'lucide-react'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { formatDate, isDueThisPeriod } from '@/lib/dates'
import CalendarMenu from '@/components/CalendarMenu'
import InfoModal from '@/components/InfoModal'

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
  // Categories that have at least one behavior in *any* frequency. Used to
  // avoid showing the "Add a behavior to this category" placeholder in the
  // weekly section when the category is actually populated elsewhere (e.g.
  // a Stake President's INTERVIEWS category has 14 quarterly interviews;
  // showing it as empty in the weekly section is misleading).
  populatedCategoryIds: Set<string>
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
  populatedCategoryIds,
  onToggle, onComment, onEditBehavior, onEditCategory, onAddBehavior,
  onPrev, onNext, onToday,
}: PeriodChecklistProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [calendarMenuId, setCalendarMenuId] = useState<string | null>(null)
  const [infoModal, setInfoModal] = useState<{ name: string; text: string } | null>(null)
  const dateStr = formatDate(periodDate)

  const isCurrentPeriod = periodOffset === 0
  const isPast = periodOffset < 0
  const isFuture = periodOffset > 0

  // Filter to only behaviors due this period (respects interval)
  const dueBehaviors = behaviors.filter(b =>
    !b.is_archived && isDueThisPeriod(periodDate, frequency, b.interval ?? 1, b.anchor_date ?? null)
  )

  // Count completion
  const applicable = dueBehaviors
  const done = applicable.filter(b => {
    const entry = entries.get(`${b.id}_${dateStr}`)
    return entry?.value === 'y' || entry?.value === 'na'
  }).length
  const total = applicable.length

  // Group behaviors by category
  const behaviorsByCategory = new Map<string, Behavior[]>()
  for (const cat of categories) behaviorsByCategory.set(cat.id, [])
  for (const beh of dueBehaviors) {
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
          {done} of {total} done
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
            // Hide a category entirely from this section if it has no behaviors
            // for this frequency AND it's populated elsewhere — otherwise we
            // show "Add a behavior" under a category that's actually full of
            // behaviors in another section, which is confusing.
            if (catBehaviors.length === 0) {
              if (frequency !== 'weekly') return null
              if (populatedCategoryIds.has(cat.id)) return null
            }

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

                {/* Empty category hint */}
                {catBehaviors.length === 0 && (
                  <button
                    onClick={() => onAddBehavior(cat.id)}
                    className="w-full px-4 py-3 text-xs text-gray-400 bg-white border-b border-gray-100 hover:text-blue-500 hover:bg-blue-50 text-left"
                  >
                    + Add a behavior to this category
                  </button>
                )}

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

                      {/* Calendar button */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setCalendarMenuId(calendarMenuId === beh.id ? null : beh.id)}
                          className="p-1.5 text-gray-300 hover:text-blue-500"
                        >
                          <CalendarPlus size={15} />
                        </button>
                        {calendarMenuId === beh.id && (
                          <CalendarMenu
                            title={beh.name}
                            date={periodDate}
                            frequency={frequency}
                            onClose={() => setCalendarMenuId(null)}
                          />
                        )}
                      </div>

                      {/* Info button — only if info_text exists */}
                      {beh.info_text && (
                        <button
                          onClick={() => setInfoModal({ name: beh.name, text: beh.info_text! })}
                          className="p-1.5 text-gray-300 hover:text-blue-500 shrink-0"
                        >
                          <Info size={15} />
                        </button>
                      )}

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

      {infoModal && (
        <InfoModal
          title={infoModal.name}
          infoText={infoModal.text}
          onClose={() => setInfoModal(null)}
        />
      )}
    </div>
  )
}

export { cycleValue }
