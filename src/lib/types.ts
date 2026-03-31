export type EntryValue = 'y' | 'n' | 'na'
export type Frequency = 'weekly' | 'monthly' | 'quarterly'

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
  interval: number // every N weeks/months/quarters (default 1)
  anchor_date: string | null // YYYY-MM-DD, used for "every N weeks" to know which weeks
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
  frequency: Frequency
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
