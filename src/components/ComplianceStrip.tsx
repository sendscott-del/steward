'use client'

import { useMemo } from 'react'
import type { Behavior, Entry } from '@/lib/types'
import { formatDate, getLast12Dates } from '@/lib/dates'

/**
 * Desktop-only "Recent weeks · last 14" heatmap. One row per behavior,
 * 14 small cells (or the natural last-12 for monthly/quarterly). Pure
 * read-only visualization — leaders see compliance patterns without
 * leaving the page. Not rendered on mobile (the spec keeps mobile lean
 * and reserves heatmap learning for the bigger screen).
 */
interface Props {
  behaviors: Behavior[]
  entries: Map<string, Entry>
  frequency: 'weekly' | 'monthly' | 'quarterly'
  cellCount?: number
}

export default function ComplianceStrip({
  behaviors,
  entries,
  frequency,
  cellCount = frequency === 'weekly' ? 14 : frequency === 'monthly' ? 12 : 4,
}: Props) {
  const today = useMemo(() => formatDate(new Date()), [])

  if (behaviors.length === 0) return null

  return (
    <section className="hidden md:block mt-6">
      <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 px-1">
        Recent {frequency === 'weekly' ? 'weeks · last 14' : frequency === 'monthly' ? 'months · last 12' : 'quarters · last 4'}
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {behaviors.map((beh, idx) => {
          const dates = getLast12Dates(frequency, beh.interval ?? 1, beh.anchor_date).slice(0, cellCount)
          // Oldest → newest, left to right.
          const ordered = [...dates].reverse()
          return (
            <div
              key={beh.id}
              className={`flex items-center gap-2 px-3 py-1.5 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="flex-1 min-w-0 text-[11px] font-semibold text-gray-700 truncate pr-2">
                {beh.name}
              </div>
              <div className="flex items-center gap-[3px]">
                {ordered.map((d) => {
                  const ds = formatDate(d)
                  const e = entries.get(`${beh.id}_${ds}`)
                  const v = e?.value
                  const isFuture = ds > today
                  const cls = isFuture
                    ? 'bg-gray-50'
                    : v === 'y'
                      ? 'bg-steward-primary'
                      : v === 'n'
                        ? 'bg-red-200'
                        : v === 'na'
                          ? 'bg-gray-200'
                          : 'bg-gray-100'
                  return (
                    <span
                      key={ds}
                      title={`${beh.name} · ${ds} · ${v ?? '—'}`}
                      className={`w-3 h-3 rounded ${cls}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
