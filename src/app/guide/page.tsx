'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { APP_VERSION } from '@/constants/changelog'

export default function GuidePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/')} className="p-1 text-gray-500 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">User Guide</h1>
        <span className="text-xs text-gray-400 ml-auto">v{APP_VERSION}</span>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Section title="What is Steward?">
          <p>
            Steward helps leaders define, track, and reflect on the key behaviors
            and tasks that drive effective stewardship. Instead of being reactive,
            Steward makes your service deliberate and accountable.
          </p>
        </Section>

        <Section title="Getting Started">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Create categories</strong> — Group your behaviors (e.g., &quot;Daily Routines&quot;, &quot;Coaching&quot;, &quot;Strategic Review&quot;)</li>
            <li><strong>Add behaviors</strong> — Tap the + button on any category to add a behavior/action</li>
            <li><strong>Set frequency</strong> — Choose daily, weekly (pick specific days), monthly (e.g., 1st Wednesday), or quarterly</li>
            <li><strong>Track daily</strong> — Tap cells to mark Y (yes, completed) or N (no, not completed)</li>
          </ol>
        </Section>

        <Section title="The Work Tab">
          <p>The main tracking grid shows your behaviors organized by category with 7 day columns (Sun-Sat).</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Tap a cell</strong> — Cycles through: empty, Y (green), N (red), back to empty</li>
            <li><strong>Long-press a cell</strong> (or right-click on desktop) — Opens the comment dialog to add a reflection note</li>
            <li><strong>Dimmed cells (—)</strong> — Days that don&apos;t apply based on your frequency setting</li>
            <li><strong>Blue dot</strong> — Indicates a cell has a comment attached</li>
            <li><strong>Completion bar</strong> — Shows your completion % for the week (only counts applicable days)</li>
          </ul>
        </Section>

        <Section title="View Modes">
          <p>Switch between three views using the Day/Week/Month buttons at the top:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Day view</strong> — Shows a single day with all behaviors listed vertically. Each behavior has a large Y/N toggle and shows any comment. Great for days with many tasks (like Sunday)</li>
            <li><strong>Week view</strong> — The default 7-day grid. Behaviors as rows, days as columns. Best for overall weekly tracking</li>
            <li><strong>Month view</strong> — Compact heat-map grid showing the entire month. Color-coded cells (green=Y, red=N) let you spot patterns at a glance</li>
          </ul>
          <p className="mt-2">Dates stay synced when switching views — if you&apos;re looking at Wednesday in Day view, switching to Week view shows that week.</p>
        </Section>

        <Section title="Navigation">
          <p>Use the left/right arrows to move between days, weeks, or months depending on your current view. Navigation is seamless — going past the last week of a month automatically moves to the next month.</p>
          <p className="mt-1">Tap the calendar icon to jump back to today.</p>
        </Section>

        <Section title="Frequency Options">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Daily</strong> — Every day of the week (7 applicable days)</li>
            <li><strong>Weekly</strong> — Pick specific days (e.g., Mon, Wed, Fri = 3 applicable days)</li>
            <li><strong>Monthly</strong> — Choose a specific day of month (e.g., Day 15) or a pattern (e.g., 1st Wednesday)</li>
            <li><strong>Quarterly</strong> — Same as monthly but only in quarter-start months (Jan, Apr, Jul, Oct)</li>
          </ul>
        </Section>

        <Section title="The Reflect Tab">
          <p>
            The Reflection Log collects all your cell comments and groups them by
            category and behavior. This helps you see patterns — what&apos;s going well,
            what keeps getting missed, and why.
          </p>
          <p className="mt-1">
            To add a reflection, long-press any cell in the Work tab and type your thoughts.
          </p>
        </Section>

        <Section title="The Notes Tab">
          <p>
            A free-form text area for strategy notes, agendas, action items, or
            anything else. Notes auto-save after you stop typing.
          </p>
        </Section>

        <Section title="Managing Categories &amp; Behaviors">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Edit a category</strong> — Tap the pencil icon next to the category name</li>
            <li><strong>Edit a behavior</strong> — Tap the pencil icon on the behavior row</li>
            <li><strong>Archive a behavior</strong> — In the edit dialog, tap Archive. Data is preserved but hidden from the grid</li>
            <li><strong>Show archived</strong> — Each category has a toggle to reveal archived behaviors</li>
            <li><strong>Delete</strong> — Permanently removes the item and all associated data</li>
          </ul>
        </Section>

        <Section title="Quarterly Interview Summary (Stake Presidency)">
          <p>
            Members of the stake presidency and the executive secretary see a
            <strong> Quarterly Interviews</strong> link in the menu. It opens a single
            page that tracks every quarterly interview the presidency owes —
            bishops, high council, etc.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Add an interviewee</strong> — One click creates rows for all four quarters of the year</li>
            <li><strong>Click a cell</strong> — Marks the interview done (today&apos;s date), or unmarks it</li>
            <li><strong>Right-click / long-press</strong> — Opens the cell detail dialog: scheduled date, completion date, notes</li>
            <li><strong>Year stepper</strong> — Navigate to past or future years with the ‹ › buttons</li>
            <li><strong>Filter</strong> — Show only interviews assigned to a specific presidency member</li>
            <li><strong>Edit row</strong> — The pencil icon edits name, calling, and assigned-to for all four quarters at once</li>
          </ul>
          <p className="mt-2">
            On the Work tab, each presidency member also sees a
            <strong> &quot;My Interviews — Q[n]&quot;</strong> card listing the
            interviews assigned to them for the current quarter. Toggling a row
            there is the same action as toggling on the summary page — both views
            stay in sync because they read and write the same data.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            To grant access: an admin assigns the user a <strong>Stake role</strong> in
            Admin → Active Users (Stake President, First Counselor, Second
            Counselor, or Executive Secretary).
          </p>
        </Section>

        <Section title="Templates &amp; Groups (Admin)">
          <p>Admins can create reusable Steward templates and share them with user groups.</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Templates</strong> — A saved set of categories and behaviors. Create them in Admin &gt; Templates</li>
            <li><strong>User Groups</strong> — Named groups of users (e.g., &quot;Bishopric&quot;, &quot;EQ Presidency&quot;). Add members by email</li>
            <li><strong>Assignments</strong> — Assign a template to a group. When group members log in, the template&apos;s categories and behaviors auto-populate into their Work tab</li>
            <li><strong>Customization</strong> — Once a template is applied, users own their copy and can freely modify, add, or remove items</li>
            <li><strong>One-time apply</strong> — Each template is only applied once per user. Re-assigning the same template won&apos;t duplicate items</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">To become an admin, add your user ID to the steward_admins table in Supabase.</p>
        </Section>

        <Section title="Tips for Effective Steward">
          <ul className="list-disc list-inside space-y-1">
            <li>Review your Steward first thing each day — plan which behaviors to focus on</li>
            <li>Add comments when you miss a task — the &quot;why&quot; is more valuable than the checkmark</li>
            <li>Check the Reflection Log weekly to spot patterns</li>
            <li>Update your behaviors as your role evolves — Steward is a living document</li>
            <li>Start with 5-7 behaviors and add more as the habit develops</li>
          </ul>
        </Section>

        <p className="text-center text-xs text-gray-400 py-4">
          Steward v{APP_VERSION}
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-sm font-bold text-gray-900 mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}
