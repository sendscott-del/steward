'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Users, Check, ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useInterviews, currentQuarter } from '@/lib/hooks/useInterviews'

interface Props {
  userId: string
}

// Compact card on the home/work tab. Shows the signed-in user's assigned
// interviews for the current quarter, with click-to-toggle that writes to
// the same steward_interviews table the /interviews page uses.
export default function MyInterviewsCard({ userId }: Props) {
  const today = new Date()
  const { year, quarter_num } = currentQuarter(today)
  const { interviews, loading, toggleComplete } = useInterviews(year, userId)

  const mine = useMemo(
    () =>
      interviews
        .filter((iv) => iv.assigned_to_user_id === userId && iv.quarter_num === quarter_num)
        .sort((a, b) => a.interviewee_name.localeCompare(b.interviewee_name)),
    [interviews, userId, quarter_num]
  )

  if (loading || mine.length === 0) return null

  const done = mine.filter((iv) => iv.completed_at).length

  return (
    <div className="px-4 pt-3">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={14} className="text-steward-primary shrink-0" />
            <h3 className="text-sm font-semibold text-gray-800 truncate">
              My Interviews — Q{quarter_num} {year}
            </h3>
          </div>
          <div className="text-xs text-gray-500 shrink-0">
            <span className="font-semibold text-gray-700">{done}</span>/{mine.length}
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {mine.map((iv) => {
            const isDone = !!iv.completed_at
            return (
              <li key={iv.id} className="flex items-center gap-3 px-3 py-2.5">
                <button
                  onClick={() =>
                    toggleComplete(iv, isDone ? null : format(today, 'yyyy-MM-dd'))
                  }
                  className={`w-7 h-7 rounded-md border flex items-center justify-center transition shrink-0 ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 text-gray-300 hover:border-steward-primary hover:text-steward-primary'
                  }`}
                  aria-label={isDone ? 'Mark not done' : 'Mark done'}
                >
                  {isDone && <Check size={14} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {iv.interviewee_name}
                  </div>
                  {iv.interviewee_calling && (
                    <div className="text-[11px] text-gray-500 truncate">{iv.interviewee_calling}</div>
                  )}
                </div>
                {iv.completed_at ? (
                  <div className="text-[11px] text-gray-500 shrink-0">
                    {format(parseISO(iv.completed_at), 'MMM d')}
                  </div>
                ) : iv.scheduled_for ? (
                  <div className="text-[11px] text-amber-600 shrink-0">
                    → {format(parseISO(iv.scheduled_for), 'MMM d')}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        <Link
          href="/interviews"
          className="flex items-center justify-between px-3 py-2 text-xs text-steward-primary hover:bg-blue-50 border-t border-gray-100"
        >
          <span>Open full Interview Summary</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
