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
          <p>Calling-first layout. Your calling name sits at the top; behaviors are grouped into three sections — <strong>This Week</strong>, <strong>This Month</strong>, <strong>This Quarter</strong>. Family / Personal categories collapse into an &ldquo;Add-on habits&rdquo; disclosure at the bottom.</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Tap the circle</strong> on the right of any row — Cycles through: empty → ✓ (done) → ✗ (missed) → — (skipped) → empty</li>
            <li><strong>Tap the row body</strong> — Opens a detail dialog where you can set the value and add a reflection note</li>
            <li><strong>Streak / context line</strong> under each name — e.g. &ldquo;7-week streak&rdquo;, &ldquo;Skipped last week&rdquo;, &ldquo;12% L12W&rdquo; — tells you why the row matters at a glance</li>
            <li><strong>Add-on habits</strong> — Family and Personal categories live in a collapsed section at the bottom; tap to expand</li>
            <li><strong>Manage</strong> — The button next to your calling header reveals category edit + add behavior controls</li>
          </ul>
        </Section>

        <Section title="Desktop layout">
          <p>On a tablet or larger screen you get a navy sidebar on the left with Work / Reflect / Notes / Quarterly Interviews up top and Admin / Guide / Release Notes / Sign Out at the bottom. The three frequency sections sit side-by-side, with a &ldquo;Recent weeks · last 14&rdquo; heatmap below — passive look-back, not the place to mark things done.</p>
        </Section>

        <Section title="Navigation">
          <p>Use the ‹ › arrows above each section to move between weeks, months, or quarters. Past / Future badges next to the period label tap back to today.</p>
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

        <Section title="Suggest an Enhancement">
          <p className="mb-2">
            On mobile, open the <strong>More</strong> tab (bottom-right) and tap <strong>Suggest an enhancement</strong>. On desktop, look for the small <strong>blue lightbulb</strong> in the bottom-right corner of every screen.
          </p>
          <p>
            Your name, email, and the page you were on are attached automatically. Suggestions go straight
            to Scott (one email per submission) and into a shared tracker so you can be told later when an
            idea was implemented.
          </p>
        </Section>

        <Section title="More tab + sidebar">
          <p>Everything that used to hide behind the 3-dot menu now sits in two predictable spots:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Mobile</strong> — tap <strong>More</strong> at the bottom-right of the tab bar. A sheet opens with three groups: <em>Stewardship</em> (Quarterly Interviews, if permitted, with a red overdue count), <em>Workspace</em> (Admin, Gather, Demo mode), and <em>Help</em> (Suggest, User Guide, Release Notes). Sign Out lives at the bottom.</li>
            <li><strong>Desktop</strong> — the same items live in the left sidebar. Primary nav (Work / Reflect / Notes / Interviews) sits up top; Admin / Guide / Release Notes / Sign Out at the bottom.</li>
          </ul>
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
