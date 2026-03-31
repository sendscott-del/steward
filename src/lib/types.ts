export type EntryValue = 'y' | 'n'
export type RepeatUnit = 'day' | 'week' | 'month'

export interface MonthlyPattern {
  type: 'day_of_month' | 'nth_weekday'
  day?: number // for day_of_month: 1-31
  nth?: number // for nth_weekday: 1-5 (1st, 2nd, 3rd, 4th, 5th/Last)
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
  repeat_interval: number // e.g., 1, 2, 3
  repeat_unit: RepeatUnit // day, week, month
  days_of_week: number[] | null // for week: which days (0=Sun, 6=Sat)
  monthly_pattern: MonthlyPattern | null // for month
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

// Templates & Groups

export interface UserGroup {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
}

export interface Template {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TemplateCategory {
  id: string
  template_id: string
  name: string
  sort_order: number
}

export interface TemplateBehavior {
  id: string
  category_id: string
  name: string
  repeat_interval: number
  repeat_unit: RepeatUnit
  days_of_week: number[] | null
  monthly_pattern: MonthlyPattern | null
  sort_order: number
}

export interface TemplateAssignment {
  id: string
  template_id: string
  group_id: string
}

export interface TemplateApplied {
  id: string
  template_id: string
  user_id: string
  applied_at: string
}
