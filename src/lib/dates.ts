import { startOfWeek, addDays, addWeeks, subWeeks, format, isSameDay, getDate, getDay } from 'date-fns'
import type { MonthlyPattern } from '@/lib/types'

// Get the Sunday that starts the week containing a given date
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 })
}

// Get array of 7 dates for the week starting at weekStart
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

// Navigate weeks: move forward or backward by 1 week
export function nextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1)
}

export function prevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1)
}

// Get the month label for a given week (uses the Thursday of the week to determine the month)
export function getMonthForWeek(weekStart: Date): { month: string; year: number } {
  const thursday = addDays(weekStart, 4) // Thursday determines which month the week "belongs" to
  return {
    month: format(thursday, 'MMMM'),
    year: thursday.getFullYear(),
  }
}

// Get all weeks in a given month (weeks that overlap with the month)
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

// Get week number within the month (1-based)
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
  return {
    letter: letters[date.getDay()],
    number: format(date, 'd'),
  }
}

export function formatWeekRange(dates: Date[]): string {
  if (dates.length === 0) return ''
  const start = format(dates[0], 'MMM d')
  const end = format(dates[dates.length - 1], 'MMM d')
  return `${start} - ${end}`
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// Check if a specific date matches a recurrence pattern
export function matchesRecurrence(
  date: Date,
  frequency: string,
  daysOfWeek?: number[],
  monthlyPattern?: MonthlyPattern
): boolean {
  if (frequency === 'daily') return true

  if (frequency === 'weekly') {
    if (!daysOfWeek || daysOfWeek.length === 0) return true
    return daysOfWeek.includes(getDay(date))
  }

  if (frequency === 'monthly' && monthlyPattern) {
    if (monthlyPattern.type === 'day_of_month' && monthlyPattern.day != null) {
      return getDate(date) === monthlyPattern.day
    }
    if (monthlyPattern.type === 'nth_weekday' && monthlyPattern.nth != null && monthlyPattern.weekday != null) {
      if (getDay(date) !== monthlyPattern.weekday) return false
      const dayOfMonth = getDate(date)
      const nth = Math.ceil(dayOfMonth / 7)
      return nth === monthlyPattern.nth
    }
  }

  if (frequency === 'quarterly') {
    const month = date.getMonth()
    if (month % 3 !== 0) return false
    if (monthlyPattern) {
      if (monthlyPattern.type === 'day_of_month' && monthlyPattern.day != null) return getDate(date) === monthlyPattern.day
      if (monthlyPattern.type === 'nth_weekday' && monthlyPattern.nth != null && monthlyPattern.weekday != null) {
        if (getDay(date) !== monthlyPattern.weekday) return false
        return Math.ceil(getDate(date) / 7) === monthlyPattern.nth
      }
    }
    return getDate(date) === 1
  }

  return true
}

// Count applicable days in a week for a behavior (for completion % denominator)
export function countApplicableDays(
  weekDates: Date[],
  frequency: string,
  daysOfWeek?: number[],
  monthlyPattern?: MonthlyPattern
): number {
  return weekDates.filter(date => matchesRecurrence(date, frequency, daysOfWeek, monthlyPattern)).length
}
