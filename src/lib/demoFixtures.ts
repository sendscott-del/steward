// Demo fixtures for Steward — fake ward leader checklist data so trainers
// can walk through the app without exposing real ward members' answers.
//
// The data shape mirrors the real Supabase tables (steward_categories,
// steward_behaviors, steward_entries, steward_cell_comments) so the rest
// of the app can render fixtures without any branching logic.

import type { Category, Behavior, Entry, CellComment, EntryValue } from './types'
import type { StewardDemoRole } from './demoMode'
import { addWeeks, addMonths, format } from 'date-fns'
import { formatDate, getWeekStart } from './dates'

const DEMO_USER_ID = 'demo-00000000-0000-0000-0000-000000000001'

interface DemoFixture {
  categories: Category[]
  behaviors: Behavior[]
  entries: Entry[]
  comments: CellComment[]
}

function isoNow(): string {
  return new Date().toISOString()
}

/** Recurring leader-stewardship behaviors shaped for each demo role. */
const ROLE_TEMPLATES: Record<StewardDemoRole, { categoryName: string; behaviors: Array<{ name: string; frequency: 'weekly' | 'monthly' | 'quarterly'; expectation: number }> }[]> = {
  stake_president: [
    {
      categoryName: 'Spiritual leadership',
      behaviors: [
        { name: 'Met with each counselor 1:1', frequency: 'weekly', expectation: 1 },
        { name: 'Attended a ward sacrament meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Visited each ward in the stake', frequency: 'quarterly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Stake operations',
      behaviors: [
        { name: 'Reviewed temple recommend list with clerks', frequency: 'monthly', expectation: 1 },
        { name: 'Held stake presidency meeting', frequency: 'weekly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
        { name: 'Family home evening with my family', frequency: 'weekly', expectation: 1 },
      ],
    },
  ],
  stake_clerk: [
    {
      categoryName: 'Records',
      behaviors: [
        { name: 'Posted ward tithing settlements', frequency: 'monthly', expectation: 1 },
        { name: 'Reviewed ward financial statements with bishops', frequency: 'quarterly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Stake support',
      behaviors: [
        { name: 'Attended stake presidency meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Updated calling roster', frequency: 'weekly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
      ],
    },
  ],
  high_councilor: [
    {
      categoryName: 'Assigned ward',
      behaviors: [
        { name: 'Attended assigned ward sacrament meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Met with the bishop', frequency: 'monthly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Stake assignment',
      behaviors: [
        { name: 'High Council meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Spoke in an assigned ward', frequency: 'quarterly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
      ],
    },
  ],
  bishop: [
    {
      categoryName: 'Ministering to ward',
      behaviors: [
        { name: 'Attended sacrament meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Held bishopric meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Visited a less-active member', frequency: 'monthly', expectation: 2 },
      ],
    },
    {
      categoryName: 'Counsel',
      behaviors: [
        { name: 'Held a counseling appointment', frequency: 'weekly', expectation: 1 },
        { name: 'Reviewed temple recommends', frequency: 'monthly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
        { name: 'Family home evening', frequency: 'weekly', expectation: 1 },
      ],
    },
  ],
  elders_quorum_president: [
    {
      categoryName: 'Quorum',
      behaviors: [
        { name: 'Held quorum presidency meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Coordinated ministering interviews', frequency: 'quarterly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Ministering',
      behaviors: [
        { name: 'Visited an assigned brother', frequency: 'weekly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
      ],
    },
  ],
  relief_society_president: [
    {
      categoryName: 'Sisters',
      behaviors: [
        { name: 'Held RS presidency meeting', frequency: 'weekly', expectation: 1 },
        { name: 'Ministering interviews completed', frequency: 'quarterly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Ministering',
      behaviors: [
        { name: 'Visited an assigned sister', frequency: 'weekly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
      ],
    },
  ],
  member: [
    {
      categoryName: 'Personal',
      behaviors: [
        { name: 'Daily scripture study', frequency: 'weekly', expectation: 7 },
        { name: 'Family home evening', frequency: 'weekly', expectation: 1 },
        { name: 'Attended sacrament meeting', frequency: 'weekly', expectation: 1 },
      ],
    },
    {
      categoryName: 'Service',
      behaviors: [
        { name: 'Visited an assigned ministering family', frequency: 'monthly', expectation: 2 },
      ],
    },
  ],
}

const VALUES: Array<EntryValue> = ['y', 'y', 'y', 'na', 'n', 'y', 'y']

export function buildDemoFixture(role: StewardDemoRole): DemoFixture {
  const template = ROLE_TEMPLATES[role]
  const categories: Category[] = template.map((c, i) => ({
    id: `demo-cat-${role}-${i}`,
    user_id: DEMO_USER_ID,
    name: c.categoryName,
    sort_order: i,
    created_at: isoNow(),
    archived: false,
  }))

  const behaviors: Behavior[] = []
  const entries: Entry[] = []
  const comments: CellComment[] = []

  let bSort = 0
  template.forEach((c, ci) => {
    c.behaviors.forEach((b, bi) => {
      const id = `demo-beh-${role}-${ci}-${bi}`
      behaviors.push({
        id,
        user_id: DEMO_USER_ID,
        category_id: categories[ci].id,
        name: b.name,
        frequency: b.frequency,
        expectation_count: b.expectation,
        sort_order: bSort++,
        is_archived: false,
        created_at: isoNow(),
      } as unknown as Behavior)

      // Generate fake entries: last 8 weekly periods (or monthly/quarterly).
      const now = new Date()
      const periods = b.frequency === 'weekly' ? 8 : b.frequency === 'monthly' ? 6 : 4
      for (let i = 0; i < periods; i++) {
        const date =
          b.frequency === 'weekly'
            ? addWeeks(getWeekStart(now), -i)
            : b.frequency === 'monthly'
              ? addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -i)
              : addMonths(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), -i * 3)
        const value = VALUES[(i + bi) % VALUES.length]
        entries.push({
          id: `demo-ent-${id}-${i}`,
          user_id: DEMO_USER_ID,
          behavior_id: id,
          entry_date: formatDate(date),
          value,
          created_at: isoNow(),
          updated_at: isoNow(),
        } as unknown as Entry)
      }
    })
  })

  // A couple of cell comments to show the "tap a cell to write a note" UX.
  if (behaviors.length > 0) {
    const firstBeh = behaviors[0]
    comments.push({
      id: `demo-com-${firstBeh.id}-0`,
      user_id: DEMO_USER_ID,
      behavior_id: firstBeh.id,
      entry_date: formatDate(getWeekStart(new Date())),
      comment: 'Demo note: ' + format(new Date(), 'MMM d') + ' — felt the Spirit during the meeting.',
      created_at: isoNow(),
      updated_at: isoNow(),
    } as unknown as CellComment)
  }

  return { categories, behaviors, entries, comments }
}

export function demoEntryKey(behaviorId: string, date: string): string {
  return `${behaviorId}_${date}`
}
