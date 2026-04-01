import { startOfWeek, addWeeks, subWeeks, addMonths, subMonths, differenceInWeeks, format, isSameDay } from 'date-fns'
import type { Frequency } from '@/lib/types'

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 0 })
}

// --- Period date generation (supports interval) ---

// Weekly: every N weeks from anchor. offset shifts the visible window.
function getWeeklyCells(offset: number, count: number, interval: number, anchorDate: Date | null): Date[] {
  if (interval <= 1 || !anchorDate) {
    // Simple: every week
    const baseWeek = getWeekStart(new Date())
    const start = addWeeks(baseWeek, offset * interval)
    return Array.from({ length: count }, (_, i) => addWeeks(start, i * interval))
  }

  // Every N weeks from anchor
  const anchor = getWeekStart(anchorDate)
  const now = getWeekStart(new Date())
  const weeksSinceAnchor = differenceInWeeks(now, anchor)
  // Find the nearest occurrence on or after now
  const remainder = ((weeksSinceAnchor % interval) + interval) % interval
  const nextOccurrence = remainder === 0 ? now : addWeeks(now, interval - remainder)
  const start = addWeeks(nextOccurrence, offset * count * interval)
  return Array.from({ length: count }, (_, i) => addWeeks(start, i * interval))
}

function getMonthlyCells(offset: number, count: number, interval: number): Date[] {
  const now = new Date()
  const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = addMonths(baseMonth, offset * count * interval)
  return Array.from({ length: count }, (_, i) => addMonths(start, i * interval))
}

function getQuarterlyCells(offset: number, count: number, interval: number): Date[] {
  const now = new Date()
  const currentQ = Math.floor(now.getMonth() / 3)
  const baseQ = new Date(now.getFullYear(), currentQ * 3, 1)
  const start = addMonths(baseQ, offset * count * 3 * interval)
  return Array.from({ length: count }, (_, i) => addMonths(start, i * 3 * interval))
}

export function getPeriodCells(
  frequency: Frequency, offset: number, count: number,
  interval: number = 1, anchorDate: string | null = null
): Date[] {
  const anchor = anchorDate ? new Date(anchorDate + 'T00:00:00') : null
  if (frequency === 'weekly') return getWeeklyCells(offset, count, interval, anchor)
  if (frequency === 'monthly') return getMonthlyCells(offset, count, interval)
  return getQuarterlyCells(offset, count, interval)
}

export function getDefaultCount(frequency: Frequency): number {
  if (frequency === 'weekly') return 4
  if (frequency === 'monthly') return 12
  return 4
}

// --- Cell labels ---

export function getCellLabel(date: Date, frequency: Frequency): { top: string; bottom: string } {
  if (frequency === 'weekly') {
    return { top: format(date, 'MMM'), bottom: format(date, 'd') }
  }
  if (frequency === 'monthly') {
    return { top: format(date, 'yyyy'), bottom: format(date, 'MMM') }
  }
  const q = Math.floor(date.getMonth() / 3) + 1
  return { top: format(date, 'yyyy'), bottom: `Q${q}` }
}

// --- Compliance: last 12 occurrences (supports interval) ---

export function getLast12Dates(
  frequency: Frequency, interval: number = 1, anchorDate: string | null = null
): Date[] {
  if (frequency === 'weekly') {
    if (interval <= 1 || !anchorDate) {
      const baseWeek = getWeekStart(new Date())
      return Array.from({ length: 12 }, (_, i) => subWeeks(baseWeek, i))
    }
    // Every N weeks from anchor, going backward
    const anchor = getWeekStart(new Date(anchorDate + 'T00:00:00'))
    const now = getWeekStart(new Date())
    const weeksSinceAnchor = differenceInWeeks(now, anchor)
    const remainder = ((weeksSinceAnchor % interval) + interval) % interval
    const latestOccurrence = remainder === 0 ? now : subWeeks(now, remainder)
    return Array.from({ length: 12 }, (_, i) => subWeeks(latestOccurrence, i * interval))
  }
  if (frequency === 'monthly') {
    const now = new Date()
    const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return Array.from({ length: 12 }, (_, i) => subMonths(baseMonth, i * interval))
  }
  // quarterly — last 4 quarters
  const now = new Date()
  const currentQ = Math.floor(now.getMonth() / 3)
  const baseQ = new Date(now.getFullYear(), currentQ * 3, 1)
  return Array.from({ length: 4 }, (_, i) => subMonths(baseQ, i * 3 * interval))
}
