export const APP_VERSION = '1.1.0'

export interface ChangelogEntry {
  version: string
  date: string
  enhancements: string[]
  bugFixes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-03-30',
    enhancements: [
      'Recurring schedule support: set specific days of week, monthly patterns (1st Wednesday, day 15, etc.), and quarterly recurrence',
      'Frequency-based completion percentages — only applicable days count in the denominator',
      'Non-applicable days shown as dimmed cells in the grid',
      'Reflection Log tab — all cell comments grouped by category and behavior for easy review',
      'Edit and delete categories',
      'Edit, delete, and archive behaviors with schedule options',
      'Show/hide archived behaviors per category',
      'Seamless week navigation — arrows cross month boundaries automatically',
      'Unlimited backward/forward navigation through weeks',
      'Release notes page (accessible from menu)',
      'User guide (accessible from menu)',
      'Header menu with settings, guide, and release notes',
    ],
    bugFixes: [
      'Removed K (kind of) value — cells now cycle Y/N/empty only',
      'Fixed month navigation not going past current month',
      'Fixed week and month navigation not being linked',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-30',
    enhancements: [
      'Initial release of Leader Standard Work app',
      'User authentication (email/password)',
      'Category and behavior management',
      '7-day weekly tracking grid with y/n values',
      'Week navigation with period view',
      'Cell-level comments via long-press',
      'Notes tab with auto-save',
      'Mobile-optimized responsive design',
    ],
    bugFixes: [],
  },
]
