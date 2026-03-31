import { startOfWeek, addWeeks, subWeeks, addMonths, subMonths, format, isSameDay } from 'date-fns'
import type { Frequency } from '@/lib/types'

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// Get the Sunday that starts the week containing a date
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 })
}

// --- Period date generation ---

// Weekly: returns Sundays (week-start dates)
export function getWeeklyCells(startOffset: number, count: number): Date[] {
  const baseWeek = getWeekStart(new Date())
  const start = addWeeks(baseWeek, startOffset)
  return Array.from({ length: count }, (_, i) => addWeeks(start, i))
}

// Monthly: returns 1st of each month
export function getMonthlyCells(startOffset: number, count: number): Date[] {
  const now = new Date()
  const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = addMonths(baseMonth, startOffset)
  return Array.from({ length: count }, (_, i) => addMonths(start, i))
}

// Quarterly: returns 1st of quarter months (Jan, Apr, Jul, Oct)
export function getQuarterlyCells(startOffset: number, count: number): Date[] {
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const baseQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1)
  const start = addMonths(baseQuarter, startOffset * 3)
  return Array.from({ length: count }, (_, i) => addMonths(start, i * 3))
}

// Get period cells based on frequency
export function getPeriodCells(frequency: Frequency, offset: number, count: number): Date[] {
  if (frequency === 'weekly') return getWeeklyCells(offset, count)
  if (frequency === 'monthly') return getMonthlyCells(offset, count)
  return getQuarterlyCells(offset, count)
}

// Default visible count per frequency
export function getDefaultCount(frequency: Frequency): number {
  if (frequency === 'weekly') return 4
  if (frequency === 'monthly') return 12
  return 4
}

// --- Cell labels ---

export function getCellLabel(date: Date, frequency: Frequency): { top: string; bottom: string } {
  if (frequency === 'weekly') {
    return {
      top: format(date, 'MMM'),
      bottom: format(date, 'd'),
    }
  }
  if (frequency === 'monthly') {
    return {
      top: format(date, 'yyyy'),
      bottom: format(date, 'MMM'),
    }
  }
  // quarterly
  const q = Math.floor(date.getMonth() / 3) + 1
  return {
    top: format(date, 'yyyy'),
    bottom: `Q${q}`,
  }
}

// --- Compliance: last 12 occurrences ---

export function getLast12Dates(frequency: Frequency): Date[] {
  if (frequency === 'weekly') {
    const baseWeek = getWeekStart(new Date())
    return Array.from({ length: 12 }, (_, i) => subWeeks(baseWeek, i + 1))
  }
  if (frequency === 'monthly') {
    const now = new Date()
    const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return Array.from({ length: 12 }, (_, i) => subMonths(baseMonth, i + 1))
  }
  // quarterly
  const now = new Date()
  const currentQ = Math.floor(now.getMonth() / 3)
  const baseQ = new Date(now.getFullYear(), currentQ * 3, 1)
  return Array.from({ length: 12 }, (_, i) => subMonths(baseQ, (i + 1) * 3))
}
