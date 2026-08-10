export type EntryValue = 'y' | 'n' | 'na'
export type Frequency = 'weekly' | 'monthly' | 'quarterly'

export type StakeRole =
  | 'stake_president'
  | 'first_counselor'
  | 'second_counselor'
  | 'exec_secretary'
  | 'stake_clerk'

export const STAKE_ROLE_LABELS: Record<StakeRole, string> = {
  stake_president: 'Stake President',
  first_counselor: 'First Counselor',
  second_counselor: 'Second Counselor',
  exec_secretary: 'Executive Secretary',
  stake_clerk: 'Stake Clerk',
}

// Map a calling/template name to the corresponding stake role.
// Returns null when the calling has no presidency/exec-sec role
// (e.g. High Councilor, Admin, custom templates).
//
// This is the single source of truth for the "calling = role" merge:
// admins pick a calling/template in the UI, and stake_role is derived
// from this mapping. To grant exec_secretary or stake_clerk without a
// behavior set, create or rename a template to "Executive Secretary"
// or "Stake Clerk".
export function stakeRoleFromTemplateName(name: string | null | undefined): StakeRole | null {
  switch (name) {
    case 'Stake President':     return 'stake_president'
    case 'First Counselor':     return 'first_counselor'
    case 'Second Counselor':    return 'second_counselor'
    case 'Executive Secretary': return 'exec_secretary'
    case 'Stake Clerk':         return 'stake_clerk'
    default:                    return null
  }
}

export interface Interview {
  id: string
  interviewee_name: string
  interviewee_calling: string | null
  assigned_to_user_id: string | null
  year: number
  quarter_num: 1 | 2 | 3 | 4
  scheduled_for: string | null  // YYYY-MM-DD
  completed_at: string | null   // YYYY-MM-DD
  notes: string | null
  last_updated_by: string | null
  created_at: string
  updated_at: string
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
  interval: number // every N weeks/months/quarters (default 1)
  anchor_date: string | null // YYYY-MM-DD, used for "every N weeks" to know which weeks
  is_archived: boolean
  sort_order: number
  info_text: string | null // handbook/scripture reference for info button
  /**
   * Set when this task is shared with other leaders. Every participant keeps
   * their own behavior row; rows in the same group carry the same id. Marking
   * the task done in any one account marks it done in all of them.
   */
  shared_task_id: string | null
}

export interface Entry {
  id: string
  behavior_id: string
  entry_date: string // YYYY-MM-DD
  value: EntryValue
  /** Who marked this period. Only set for shared tasks. */
  completed_by: string | null
}

/** One participant in a shared task (from the steward_my_shared_tasks RPC). */
export interface SharedTaskMember {
  shared_task_id: string
  member_id: string
  member_name: string
  is_owner: boolean
}

/** A person a task can be shared with (from the steward_shareable_users RPC). */
export interface ShareableUser {
  id: string
  full_name: string | null
  email: string | null
  stake_role: StakeRole | null
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
  interval: number // every N periods (default 1); e.g., 2 for "every 2 weeks"
  sort_order: number
  info_text: string | null // handbook/scripture reference for info button
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
