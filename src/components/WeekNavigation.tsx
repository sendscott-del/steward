'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { formatWeekRange, getMonthForWeek, getWeekOfMonth } from '@/lib/dates'

interface WeekNavigationProps {
  weekStart: Date
  weekDates: Date[]
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
}

export default function WeekNavigation({
  weekStart,
  weekDates,
  onPrevWeek,
  onNextWeek,
  onToday,
}: WeekNavigationProps) {
  const { month, year } = getMonthForWeek(weekStart)
  const { weekNum, totalWeeks } = getWeekOfMonth(weekStart)

  return (
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
      {/* Month label */}
      <div className="text-center mb-1">
        <span className="text-xs font-medium text-gray-500">
          {month} {year}
        </span>
      </div>

      {/* Week row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevWeek}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center flex-1">
          <div className="text-sm font-semibold text-gray-800">
            Week {weekNum} of {totalWeeks}
          </div>
          <div className="text-xs text-gray-500">
            {formatWeekRange(weekDates)}
          </div>
        </div>

        <button
          onClick={onNextWeek}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <ChevronRight size={20} />
        </button>

        <button
          onClick={onToday}
          className="ml-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded"
          title="Go to today"
        >
          <CalendarDays size={18} />
        </button>
      </div>
    </div>
  )
}
