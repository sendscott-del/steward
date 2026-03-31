import { startOfWeek, addDays, addWeeks, subWeeks, format, isSameDay, getDate, getDay } from 'date-fns'
import type { MonthlyPattern, RepeatUnit } from '@/lib/types'

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 })
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function nextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1)
}

export function prevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1)
}

export function getMonthForWeek(weekStart: Date): { month: string; year: number } {
  const thursday = addDays(weekStart, 4)
  return { month: format(thursday, 'MMMM'), year: thursday.getFullYear() }
}

export function getMonthWeeks(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const firstWeekStart = getWeekStart(firstOfMonth)
  const lastWeekStart = getWeekStart(lastOfMonth)
  const weeks: Date[] = []
  let current = firstWeekStart
  while (current <= lastWeekStart) {
    weeks.push(current)
    current = addWeeks(current, 1)
  }
  return weeks
}

export function getWeekOfMonth(weekStart: Date): { weekNum: number; totalWeeks: number } {
  const { year } = getMonthForWeek(weekStart)
  const thursday = addDays(weekStart, 4)
  const monthIndex = thursday.getMonth()
  const weeks = getMonthWeeks(year, monthIndex)
  const weekNum = weeks.findIndex(w => w.getTime() === weekStart.getTime()) + 1
  return { weekNum: weekNum || 1, totalWeeks: weeks.length }
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDayHeader(date: Date): { letter: string; number: string } {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return { letter: letters[date.getDay()], number: format(date, 'd') }
}

export function formatWeekRange(dates: Date[]): string {
  if (dates.length === 0) return ''
  return `${format(dates[0], 'MMM d')} - ${format(dates[dates.length - 1], 'MMM d')}`
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// Check if a date matches a recurrence pattern
export function matchesRecurrence(
  date: Date,
  repeatUnit: RepeatUnit,
  repeatInterval: number,
  daysOfWeek?: number[],
  monthlyPattern?: MonthlyPattern
): boolean {
  if (repeatUnit === 'day') {
    // Every N days — for the grid, we show it on all days (interval tracking is informational)
    return repeatInterval === 1 ? true : true // show on all days, user decides when to mark
  }

  if (repeatUnit === 'week') {
    if (!daysOfWeek || daysOfWeek.length === 0) return true
    return daysOfWeek.includes(getDay(date))
  }

  if (repeatUnit === 'month') {
    if (!monthlyPattern) return false
    if (monthlyPattern.type === 'day_of_month' && monthlyPattern.day != null) {
      return getDate(date) === monthlyPattern.day
    }
    if (monthlyPattern.type === 'nth_weekday' && monthlyPattern.nth != null && monthlyPattern.weekday != null) {
      if (getDay(date) !== monthlyPattern.weekday) return false
      const nth = Math.ceil(getDate(date) / 7)
      return nth === monthlyPattern.nth
    }
  }

  return true
}

// Count applicable days in a date range
export function countApplicableDays(
  dates: Date[],
  repeatUnit: RepeatUnit,
  repeatInterval: number,
  daysOfWeek?: number[],
  monthlyPattern?: MonthlyPattern
): number {
  return dates.filter(d => matchesRecurrence(d, repeatUnit, repeatInterval, daysOfWeek, monthlyPattern)).length
}

// Format frequency for display in the grid
export function formatFrequency(
  repeatInterval: number,
  repeatUnit: RepeatUnit,
  daysOfWeek?: number[] | null,
  monthlyPattern?: MonthlyPattern | null
): string {
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const ordinals = ['', '1st', '2nd', '3rd', '4th', 'Last']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (repeatUnit === 'day') {
    return repeatInterval === 1 ? 'Daily' : `Every ${repeatInterval} days`
  }

  if (repeatUnit === 'week') {
    const days = daysOfWeek && daysOfWeek.length > 0
      ? daysOfWeek.map(d => dayLetters[d]).join('')
      : 'All'
    if (repeatInterval === 1) return days
    return `Every ${repeatInterval} wks · ${days}`
  }

  if (repeatUnit === 'month') {
    let pattern = ''
    if (monthlyPattern?.type === 'day_of_month' && monthlyPattern.day != null) {
      pattern = `Day ${monthlyPattern.day}`
    } else if (monthlyPattern?.type === 'nth_weekday' && monthlyPattern.nth != null && monthlyPattern.weekday != null) {
      pattern = `${ordinals[monthlyPattern.nth]} ${dayNames[monthlyPattern.weekday]}`
    }
    if (repeatInterval === 1) return pattern || 'Monthly'
    return `Every ${repeatInterval} mo · ${pattern}`
  }

  return ''
}
