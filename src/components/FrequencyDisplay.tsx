'use client'

import { Repeat } from 'lucide-react'
import type { RepeatUnit, MonthlyPattern } from '@/lib/types'

interface FrequencyDisplayProps {
  repeatInterval: number
  repeatUnit: RepeatUnit
  daysOfWeek?: number[] | null
  monthlyPattern?: MonthlyPattern | null
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', 'Last']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function FrequencyDisplay({ repeatInterval, repeatUnit, daysOfWeek, monthlyPattern }: FrequencyDisplayProps) {
  const unitLabel = repeatUnit === 'day' ? 'D' : repeatUnit === 'week' ? 'W' : 'M'
  const shortLabel = `${repeatInterval}${unitLabel}`

  return (
    <div className="flex items-center gap-1.5">
      {/* Left: interval badge */}
      <div className="flex flex-col items-center shrink-0">
        <Repeat size={10} className="text-blue-600 mb-0.5" />
        <span className="text-[9px] font-bold text-blue-600 leading-none">{shortLabel}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Right: details */}
      <div className="min-w-0">
        {repeatUnit === 'day' && (
          <span className="text-[9px] text-gray-400">Daily</span>
        )}

        {repeatUnit === 'week' && (
          <div className="flex gap-0.5 flex-wrap">
            {DAY_LETTERS.map((letter, i) => {
              // Skip Sunday for weekly display (show M-S only like the screenshot)
              const active = daysOfWeek?.includes(i)
              return (
                <span
                  key={i}
                  className={`w-4 h-4 flex items-center justify-center rounded-full text-[7px] font-bold ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300'
                  }`}
                >
                  {letter}
                </span>
              )
            })}
          </div>
        )}

        {repeatUnit === 'month' && monthlyPattern && (
          <div className="text-[9px] text-gray-500 leading-tight">
            {monthlyPattern.type === 'day_of_month' && monthlyPattern.day != null && (
              <>on Day {monthlyPattern.day}</>
            )}
            {monthlyPattern.type === 'nth_weekday' && monthlyPattern.nth != null && monthlyPattern.weekday != null && (
              <>
                on{' '}
                <span className="font-semibold">{ORDINALS[monthlyPattern.nth]}</span>
                {' '}{DAY_NAMES[monthlyPattern.weekday]}
              </>
            )}
          </div>
        )}

        {repeatUnit === 'month' && !monthlyPattern && (
          <span className="text-[9px] text-gray-400">Monthly</span>
        )}
      </div>
    </div>
  )
}
