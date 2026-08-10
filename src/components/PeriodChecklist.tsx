'use client'

import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Check, X, Minus, MoreHorizontal, Users,
} from 'lucide-react'
import type { Behavior, Entry, CellComment, EntryValue, Frequency } from '@/lib/types'
import { formatDate, isDueThisPeriod, getLast12Dates } from '@/lib/dates'
import type { SharedTaskInfo } from '@/lib/hooks/useSharing'

/** Shared-task context passed down from the page. */
export interface SharingView {
  currentUserId: string | undefined
  sharedTasks: Map<string, SharedTaskInfo>
  memberNames: Map<string, string>
}

/**
 * "Done by Brother X" for a shared task, or null when the task isn't shared or
 * nobody has marked this period. Shared tasks fan out on write, so the entry a
 * leader sees may have been marked by one of the other participants.
 */
export function completedByLabel(
  behavior: Behavior,
  entry: Entry | undefined,
  sharing: SharingView | undefined,
): string | null {
  if (!behavior.shared_task_id || !sharing) return null
  if (!entry?.value || !entry.completed_by) return null
  if (entry.completed_by === sharing.currentUserId) return 'Done by you'
  const name = sharing.memberNames.get(entry.completed_by)
  return name ? `Done by ${name}` : 'Done by another leader'
}

/** "Shared with A and B" for the info line in the cell detail sheet. */
export function sharedWithLabel(
  behavior: Behavior,
  sharing: SharingView | undefined,
): string | null {
  if (!behavior.shared_task_id || !sharing) return null
  const names = sharing.sharedTasks.get(behavior.shared_task_id)?.otherNames ?? []
  if (names.length === 0) return 'Shared task'
  if (names.length === 1) return `Shared with ${names[0]}`
  return `Shared with ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function SharedPill() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider text-steward-primary-dark bg-blue-50 border border-blue-100 rounded px-1 py-0.5 align-middle shrink-0">
      <Users size={9} strokeWidth={2.8} />
      Shared
    </span>
  )
}

interface PeriodChecklistProps {
  title: string
  periodDate: Date
  periodLabel: string
  periodOffset: number // negative=past, 0=current, positive=future
  frequency: Frequency
  behaviors: Behavior[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  complianceMap: Map<string, number | null>
  sharing?: SharingView
  onToggle: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onRowOpen: (behaviorId: string, date: string) => void
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

/**
 * True when the period is approaching its window and the behavior hasn't been
 * marked yet — drives the amber "Due this week" cue. Weekly behaviors are
 * always "due" the current week so we don't surface a separate amber state
 * for them; monthly + quarterly behaviors get an amber border when the period
 * is the current one (offset 0) and the calendar is in the last week of the
 * month / last 2 weeks of the quarter.
 */
function isDueSoon(
  behavior: Behavior,
  entries: Map<string, Entry>,
  frequency: Frequency,
  periodDate: Date,
): boolean {
  const key = `${behavior.id}_${formatDate(periodDate)}`
  const value = entries.get(key)?.value
  if (value) return false
  if (frequency === 'weekly') return false

  const now = new Date()
  if (frequency === 'monthly') {
    // Same month as periodDate, and we're in the final 7 days.
    if (now.getFullYear() !== periodDate.getFullYear() || now.getMonth() !== periodDate.getMonth()) {
      return false
    }
    const monthEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
    return (monthEnd.getTime() - now.getTime()) / 86400000 <= 7
  }
  // quarterly: periodDate is the quarter start; quarter end is +3 months minus a day
  const qStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
  const qEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 3, 0)
  if (now < qStart || now > qEnd) return false
  return (qEnd.getTime() - now.getTime()) / 86400000 <= 14
}

/**
 * Compute a short streak / context line for a behavior.
 * Examples: "7-week streak", "Skipped last week", "Due this week",
 * "12% L12W". The point is a single, motivating phrase a leader can read in
 * <0.5s — not a precise stat. Falls back to compliance % when nothing else
 * fires.
 */
function streakOrContext(
  behavior: Behavior,
  entries: Map<string, Entry>,
  compliancePct: number | null,
  frequency: Frequency,
  periodDate: Date,
): string | null {
  const periodKey = `${behavior.id}_${formatDate(periodDate)}`
  const currentEntry = entries.get(periodKey)

  // Past occurrences in order: most recent first.
  const past = getLast12Dates(frequency, behavior.interval ?? 1, behavior.anchor_date)
  // Drop the current period from "past" if included.
  const today = formatDate(new Date())
  const trimmed = past.filter((d) => formatDate(d) <= today)

  // Compute current streak — consecutive 'y' (with 'na' counted as skip-not-break)
  // starting from the most recent past occurrence. Stops at first 'n' or empty.
  let streak = 0
  for (const d of trimmed) {
    const e = entries.get(`${behavior.id}_${formatDate(d)}`)
    if (e?.value === 'y') streak++
    else if (e?.value === 'na') continue
    else break
  }
  // If user already marked this period done, add 1.
  if (currentEntry?.value === 'y') streak++

  const noun = frequency === 'weekly' ? 'week' : frequency === 'monthly' ? 'month' : 'quarter'

  if (streak >= 3) return `${streak}-${noun} streak`

  // Skipped-last context: latest past occurrence was missed or untouched.
  if (trimmed.length > 0) {
    const lastKey = `${behavior.id}_${formatDate(trimmed[0])}`
    const lastEntry = entries.get(lastKey)
    if (lastEntry?.value === 'n') return `Missed last ${noun}`
    if (!lastEntry?.value && currentEntry?.value !== 'y') return `Skipped last ${noun}`
  }

  // Due-this-period cue — wins over the compliance % so leaders see the cue
  // before a number. Matches the amber CheckCircle visual.
  if (isDueSoon(behavior, entries, frequency, periodDate)) {
    return `Due this ${noun}`
  }

  if (compliancePct != null) {
    const rounded = Math.round(compliancePct)
    const label = frequency === 'weekly' ? 'L12W' : frequency === 'monthly' ? 'L12M' : 'L4Q'
    return `${rounded}% ${label}`
  }

  return null
}

function CheckCircle({
  value,
  size = 44,
  dueSoon,
}: {
  value: EntryValue | null
  size?: number
  /** When true and the period is unmarked, the circle renders with a warning
   *  amber border — the "due this week" cue from PeriodChecklist §6. Only
   *  applies to the empty state; values y/n/na win because they reflect an
   *  explicit user action. */
  dueSoon?: boolean
}) {
  const px = size
  const iconSize = Math.round(size * 0.45)
  if (value === 'y') {
    return (
      <span
        className="rounded-full bg-steward-primary text-white inline-flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(37,99,235,0.35)]"
        style={{ width: px, height: px }}
      >
        <Check size={iconSize} strokeWidth={2.8} />
      </span>
    )
  }
  if (value === 'n') {
    return (
      <span
        className="rounded-full bg-red-500 text-white inline-flex items-center justify-center shrink-0"
        style={{ width: px, height: px }}
      >
        <X size={iconSize} strokeWidth={2.8} />
      </span>
    )
  }
  if (value === 'na') {
    return (
      <span
        className="rounded-full bg-gray-300 text-white inline-flex items-center justify-center shrink-0"
        style={{ width: px, height: px }}
      >
        <Minus size={iconSize} strokeWidth={2.8} />
      </span>
    )
  }
  if (dueSoon) {
    return (
      <span
        className="rounded-full bg-white text-amber-500 border-[1.5px] border-amber-500 inline-flex items-center justify-center shrink-0"
        style={{ width: px, height: px }}
      />
    )
  }
  return (
    <span
      className="rounded-full bg-white text-gray-400 border-[1.5px] border-gray-200 inline-flex items-center justify-center shrink-0"
      style={{ width: px, height: px }}
    />
  )
}

export default function PeriodChecklist({
  title, periodDate, periodLabel, periodOffset, frequency,
  behaviors, entries, comments, complianceMap, sharing,
  onToggle, onRowOpen,
  onPrev, onNext, onToday,
}: PeriodChecklistProps) {
  const dateStr = formatDate(periodDate)
  const isCurrentPeriod = periodOffset === 0
  const isPast = periodOffset < 0
  const isFuture = periodOffset > 0

  // Filter to only behaviors due this period (respects interval)
  const dueBehaviors = behaviors.filter(b =>
    !b.is_archived && isDueThisPeriod(periodDate, frequency, b.interval ?? 1, b.anchor_date ?? null)
  )

  // Count completion
  const done = dueBehaviors.filter(b => {
    const entry = entries.get(`${b.id}_${dateStr}`)
    return entry?.value === 'y' || entry?.value === 'na'
  }).length
  const total = dueBehaviors.length

  if (total === 0) return null

  return (
    <section className="mb-4">
      {/* Section header — steward-blue title + completion count */}
      <div className="flex items-baseline justify-between px-1 mb-1.5">
        <h2 className="text-[13px] md:text-sm font-extrabold text-steward-primary-dark uppercase tracking-wide">
          {title}
        </h2>
        <span className="text-[11px] font-semibold text-gray-500">
          {done} of {total} done
        </span>
      </div>

      {/* Period navigation row */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={onPrev}
          className="w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-600 inline-flex items-center justify-center hover:bg-gray-50"
          aria-label="Previous period"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center text-[12px] font-semibold text-gray-700 flex items-center justify-center gap-1.5">
          <span>{periodLabel}</span>
          {isCurrentPeriod ? (
            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Now</span>
          ) : isPast ? (
            <button
              type="button"
              onClick={onToday}
              className="text-[9px] font-extrabold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider hover:bg-gray-200"
            >
              Past ↩
            </button>
          ) : isFuture ? (
            <button
              type="button"
              onClick={onToday}
              className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider hover:bg-blue-100"
            >
              Future ↩
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-600 inline-flex items-center justify-center hover:bg-gray-50"
          aria-label="Next period"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Behavior rows — flat list, calling-first */}
      <div className="space-y-1.5">
        {dueBehaviors.map(beh => {
          const key = `${beh.id}_${dateStr}`
          const entry = entries.get(key)
          const comment = comments.get(key)
          const value = entry?.value ?? null
          const pct = complianceMap.get(beh.id) ?? null
          const context = streakOrContext(beh, entries, pct, frequency, periodDate)
          const dueSoon = isDueSoon(beh, entries, frequency, periodDate)
          // Who marked a shared task wins the subtitle — it's the thing the
          // other participants need to know at a glance.
          const doneBy = completedByLabel(beh, entry, sharing)

          return (
            <div
              key={beh.id}
              className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg px-3 py-2.5 md:py-2 min-h-[56px] md:min-h-[40px]"
            >
              <button
                type="button"
                onClick={() => onRowOpen(beh.id, dateStr)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-[14px] md:text-[13px] font-bold text-gray-900 leading-snug flex items-center gap-1.5">
                  <span className="min-w-0 truncate">{beh.name}</span>
                  {beh.shared_task_id && <SharedPill />}
                </div>
                {(doneBy || context || comment) && (
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {doneBy ? (
                      <span className="text-steward-primary-dark font-semibold">{doneBy}</span>
                    ) : comment ? (
                      <span className="text-steward-primary-dark font-medium">“{comment.comment}”</span>
                    ) : context}
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => onRowOpen(beh.id, dateStr)}
                className="text-gray-300 hover:text-gray-500 p-1.5 shrink-0"
                aria-label="More options"
              >
                <MoreHorizontal size={16} />
              </button>

              <button
                type="button"
                onClick={() => onToggle(beh.id, dateStr, value)}
                className="shrink-0 active:scale-95 transition-transform md:hidden"
                aria-label={`Mark ${beh.name} done`}
              >
                <CheckCircle value={value} size={44} dueSoon={dueSoon} />
              </button>
              <button
                type="button"
                onClick={() => onToggle(beh.id, dateStr, value)}
                className="shrink-0 active:scale-95 transition-transform hidden md:inline-flex"
                aria-label={`Mark ${beh.name} done`}
              >
                <CheckCircle value={value} size={28} dueSoon={dueSoon} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export { cycleValue }

/**
 * Add-on (Family/Personal) habits disclosure — opens collapsed. Same row
 * styling as the main list, just behind a click. Lives at the bottom of the
 * page below the three frequency sections.
 */
export function AddOnHabits({
  behaviors, entries, complianceMap, sharing,
  periodDates,
  onToggle, onRowOpen,
}: {
  behaviors: { weekly: Behavior[]; monthly: Behavior[]; quarterly: Behavior[] }
  entries: Map<string, Entry>
  complianceMap: Map<string, number | null>
  sharing?: SharingView
  periodDates: { weekly: Date; monthly: Date; quarterly: Date }
  onToggle: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onRowOpen: (behaviorId: string, date: string) => void
}) {
  const [open, setOpen] = useState(false)
  const total =
    behaviors.weekly.length + behaviors.monthly.length + behaviors.quarterly.length
  if (total === 0) return null

  function Row({ beh, freq, date }: { beh: Behavior; freq: Frequency; date: Date }) {
    const dStr = formatDate(date)
    const key = `${beh.id}_${dStr}`
    const entry = entries.get(key)
    const value = entry?.value ?? null
    const pct = complianceMap.get(beh.id) ?? null
    const context = streakOrContext(beh, entries, pct, freq, date)
    const dueSoon = isDueSoon(beh, entries, freq, date)
    const doneBy = completedByLabel(beh, entry, sharing)
    return (
      <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg px-3 py-2 min-h-[48px]">
        <button
          type="button"
          onClick={() => onRowOpen(beh.id, dStr)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-[13px] font-semibold text-gray-800 leading-snug flex items-center gap-1.5">
            <span className="min-w-0 truncate">{beh.name}</span>
            {beh.shared_task_id && <SharedPill />}
          </div>
          {(doneBy || context) && (
            <div className="text-[10px] text-gray-500 mt-0.5">
              {doneBy ? (
                <span className="text-steward-primary-dark font-semibold">{doneBy}</span>
              ) : context}
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => onToggle(beh.id, dStr, value)}
          className="shrink-0 active:scale-95 transition-transform"
          aria-label={`Mark ${beh.name} done`}
        >
          <CheckCircle value={value} size={36} dueSoon={dueSoon} />
        </button>
      </div>
    )
  }

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>Add-on habits</span>
        <span className="text-xs text-gray-500">{total} {open ? '· hide' : '· show'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {behaviors.weekly.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 px-1">This week</div>
              <div className="space-y-1.5">
                {behaviors.weekly.map(b => <Row key={b.id} beh={b} freq="weekly" date={periodDates.weekly} />)}
              </div>
            </div>
          )}
          {behaviors.monthly.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 px-1">This month</div>
              <div className="space-y-1.5">
                {behaviors.monthly.map(b => <Row key={b.id} beh={b} freq="monthly" date={periodDates.monthly} />)}
              </div>
            </div>
          )}
          {behaviors.quarterly.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 px-1">This quarter</div>
              <div className="space-y-1.5">
                {behaviors.quarterly.map(b => <Row key={b.id} beh={b} freq="quarterly" date={periodDates.quarterly} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
