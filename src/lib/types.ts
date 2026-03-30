export type EntryValue = 'y' | 'n'
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'

export interface MonthlyPattern {
  type: 'day_of_month' | 'nth_weekday'
  day?: number // for day_of_month: 1-31
  nth?: number // for nth_weekday: 1-5 (1st, 2nd, 3rd, 4th, 5th)
  weekday?: number // for nth_weekday: 0=Sun, 6=Sat
}

export interface Category {
  id: string
  user_id: string
  name: string
  sort_order: number
}

export interface Behavior {
  id: string
  user_id: string
  category_id: string
  name: string
  frequency: Frequency
  days_of_week: number[] | null // for weekly: which days (0=Sun, 6=Sat)
  monthly_pattern: MonthlyPattern | null // for monthly/quarterly
  is_new: boolean
  is_archived: boolean
  sort_order: number
}

export interface Entry {
  id: string
  behavior_id: string
  entry_date: string // YYYY-MM-DD
  value: EntryValue
}

export interface CellComment {
  id: string
  behavior_id: string
  entry_date: string // YYYY-MM-DD
  comment: string
}

export interface Note {
  id: string
  user_id: string
  content: string
  updated_at: string
}
