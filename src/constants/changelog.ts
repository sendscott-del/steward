export const APP_VERSION = '2.33.0'

export interface ChangelogEntry {
  version: string
  date: string
  enhancements: string[]
  bugFixes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.33.0',
    date: '2026-06-10',
    enhancements: [
      'User access is now managed in one place — the Gather hub. The old self-serve request flow (which had no approval screen) is retired; new sign-ups see their request status from the shared Gather queue.',
    ],
    bugFixes: [],
  },
  {
    version: '2.32.1',
    date: '2026-06-09',
    enhancements: [],
    bugFixes: [
      'Security: updated dependencies to patched versions (Next.js advisories: denial-of-service and cache-poisoning fixes). No feature changes.',
    ],
  },
  {
    version: '2.32.0',
    date: '2026-06-09',
    enhancements: [
      'Added the required disclaimer that Steward is not an official product of, and is not endorsed by, The Church of Jesus Christ of Latter-day Saints, to the sign-in screen.',
    ],
    bugFixes: [],
  },
  {
    version: '2.31.0',
    date: '2026-06-08',
    enhancements: [
      'Domain migration: Steward now lives at https://steward.gatheredin.app — the new Gathered suite domain. The old stewards-indeed.vercel.app URL keeps working and 301-redirects here (root and every path), so existing links and shortcuts are not broken. The App Switcher now points at the *.gatheredin.app addresses for all five Gathered apps.',
    ],
    bugFixes: [],
  },
  {
    version: '2.30.0',
    date: '2026-05-31',
    enhancements: [
      "Signup now passes `data: { app: 'steward' }` to supabase.auth.signUp(). Companion to the shared handle_new_user trigger rewrite on 2026-05-30: the trigger only writes to per-app user tables that match the tag, and Steward's own onboarding (steward_user_profiles row) still happens through Gathered admin's gather_grant_app_access path. Prevents Steward signups from leaving a stale pending row in Magnify's `profiles` or Squarecana's `sq_users`.",
    ],
    bugFixes: [],
  },
  {
    version: '2.29.1',
    date: '2026-05-25',
    enhancements: [
      "Sidebar drops from 200px to 180px — matches the spec mockup and the rest of the suite's sidebar width pixel-for-pixel. Open Magnify / Knit / Glean / Tidings / Steward side by side and the sidebars line up.",
      "Frequency-section grid (Weekly / Monthly / Quarterly columns) now flips to three-column at md+ (768px) instead of waiting until lg+ (1024px). Same breakpoint as the desktop sidebar, so the layout transitions from one-column to three-column at the same width the chrome flips.",
      "PeriodChecklist gains the 'Due this week' amber-outlined CheckCircle state. Monthly behaviors in the last 7 days of the month and quarterly behaviors in the last 14 days of the quarter render with an amber border instead of the neutral empty state. streakOrContext also emits 'Due this {month/quarter}' as the meta-line text so leaders see the cue even before noticing the color.",
    ],
    bugFixes: [],
  },
  {
    version: '2.29.0',
    date: '2026-05-24',
    enhancements: [
      "Mobile + web optimization (Phase 6). Suite-wide chrome refresh matching Knit, Glean, and Tidings: 4-tab bottom nav on mobile (Work / Reflect / Notes / More), full-width MoreSheet that retires the 3-dot kebab menu, and a 200-px navy DesktopSidebar at md:+ with Work / Reflect / Notes / Quarterly Interviews up top and Admin / Guide / Release Notes / Sign Out at the bottom. The kebab dropdown is gone — everything that used to hide behind 3 dots now sits in a labeled, grouped sheet on mobile and a permanent sidebar on desktop.",
      "Calling-first Work tab. The page now leads with a 'YOUR CALLING' eyebrow + your calling name in bold; three frequency sections (This Week / This Month / This Quarter) replace the per-category headers. Each behavior row is a 56-px tappable card with a 44-px circular check on the right and a streak / 'Skipped last week' / compliance line under the name. Tap the row to open the cell modal (value + comment); tap the circle to mark done. Family / Personal categories collapse into an opt-in 'Add-on habits' disclosure at the bottom.",
      "Quarterly Interviews overdue badge. New useInterviewsOverdue hook fetches the current year's interviews once and counts past-quarter incompletes. The number renders as a red badge next to the Interviews link in the DesktopSidebar and as a red 'N overdue' meta line + left red rail in the MoreSheet — so the urgency is visible before opening the page. Gated on canManageInterviews; users without that permission never see it.",
      "Desktop layout, properly. Content widens to max-w-6xl with three side-by-side frequency columns on lg+, plus a new 'Recent weeks · last 14' compliance strip below the columns — a passive heatmap showing each calling behavior's last 14 weeks (blue done / red wash missed / gray skip). The SuggestionFAB hides on mobile (it used to cover checklist rows at bottom-20 right-4) and lives as a 40-px corner button at bottom-6 right-6 on desktop only.",
      "Safe-area + iOS polish. All mobile form inputs (textareas, text fields, selects) now render at 16-px to stop iOS Safari from auto-zooming on focus. New .safe-pb-tabbar utility pads the bottom of main by 64px + env(safe-area-inset-bottom) so the iPhone home indicator never sits on top of tab labels.",
      "Bilingual More tab. New EN + ES keys for nav.more, more.stewardship, more.workspace, more.help, more.suggest, more.overdue, menu.interviews, menu.demoMode, menu.gatherAccess. Spanish tab labels: Trabajo / Reflexionar / Notas / Más; sheet groups: Mayordomía / Espacio de trabajo / Ayuda.",
    ],
    bugFixes: [
      "FAB no longer covers the last checklist row on mobile. It's now desktop-only; on mobile the 'Suggest an enhancement' row in the MoreSheet opens the same modal.",
      "Quarterly Interviews is no longer buried behind a 3-dot kebab next to a language toggle. It's a top-of-MoreSheet 'Stewardship' row on mobile and a primary sidebar link on desktop, both surfacing the overdue count.",
    ],
  },
  {
    version: '2.28.0',
    date: '2026-05-23',
    enhancements: [
      "Admin page redesign. Two tabs (Templates / People) replace the old single-scroll layout. Templates tab is a 3-pane editor: left rail lists every template with per-template assigned-count + behavior-count; center pane is an inline editor (rename in place, drag-style up/down reorder, freq segmented control, every-N stepper, expandable handbook-reference note per behavior); right rail shows who's currently on the selected template. People tab is search + filter chips (All / Needs calling / per-template) over a sectioned list grouped by calling, with an Admin-only section for users who have stake_role but no template.",
      "Inline auto-save. Renames, behavior edits, freq changes all persist immediately to Supabase; a 'Saving / Saved' pill in the editor header surfaces what's happening.",
      "Pinned 'Needs assignment' banner across both tabs surfaces approved users who don't have a calling yet (one click → assign for a single user, or jump to People tab filtered for the queue).",
      "New template-picker modal replaces the inline calling list. Search, see categories+behaviors counts per template, current calling badge.",
      "Cross-page link: 'Manage access in Gather ↗' button in the tab bar so it's obvious where access lives (Gather) vs where calling assignment lives (Steward).",
    ],
    bugFixes: [],
  },
  {
    version: '2.27.2',
    date: '2026-05-23',
    enhancements: [],
    bugFixes: [
      "Admin page: Stake Clerk / Executive Secretary no longer show up in 'Needs calling assignment' once their stake_role is set. The user-side needsTemplate check already skipped them (set in v2.27.1), but the admin section was only filtering on selected_template_id being null. Now filters on both — and AllUsersSection widens to include users who have stake_role even without a template, so admin-only users appear under 'Active Users' instead of vanishing.",
    ],
  },
  {
    version: '2.27.1',
    date: '2026-05-23',
    enhancements: [
      "Stake Clerk + Executive Secretary now flow through cleanly. Three changes: (1) new trigger on gather_user_roles also syncs the Steward stake_role — anyone with stake_clerk or stake_exec_secretary in Gather AND Steward access auto-gets stake_role set, skipping the calling picker on first sign-in (Jeff and Blake retroactively backfilled). (2) needsTemplate gate widened from 'no template' to 'no template AND no stake_role' so admin-only users aren't trapped in the picker loop. (3) Picker now has an 'Admin-only (no behaviors to track)' section with Stake Clerk + Executive Secretary as fallback options for anyone who lands there without their gather_user_roles being set.",
    ],
    bugFixes: [],
  },
  {
    version: '2.27.0',
    date: '2026-05-23',
    enhancements: [
      "Access control deferred to Gather. A new Postgres trigger on user_apps watches the S toggle: granting Steward access auto-creates a steward_user_profiles row with status='approved'; revoking it sets status='rejected' (data preserved). Steward admins no longer need to approve/reject signups — that decision lives in Gather.",
      "First-run calling picker. When a user has Steward access but no calling template yet (e.g. just granted in Gather), they see a 'Pick your calling' screen on sign-in. Picking a calling applies the template inline (creates their categories + behaviors) — no admin step required.",
      "Admin page reframe. 'Pending Approvals' renamed to 'Needs calling assignment' — now lists approved users who haven't picked a calling. Single 'Assign calling' tap applies the template; the separate Approve / Reject buttons are gone. 'Remove' button on each Active User row is also gone — toggle S off in Gather to revoke access (the trigger handles the rest, and data is preserved).",
    ],
    bugFixes: [],
  },
  {
    version: '2.26.1',
    date: '2026-05-23',
    enhancements: [],
    bugFixes: [
      "Admin menu: 'Gather — User access ↗' was still pointing at the old glean-blue.vercel.app URL — now correctly opens https://gathered-admin-neon.vercel.app/gather. Also dropped the duplicate 'Suite roles' menu item; it went to /admin/roles which redirects to the same Gather page, so it was just an extra hop. One entry now does what two used to.",
    ],
  },
  {
    version: '2.26.0',
    date: '2026-05-23',
    enhancements: [
      "Gather has its own home now: https://gathered-admin-neon.vercel.app/gather. The standalone deployment supersedes the consolidated-into-Glean home from last release. Steward's /admin/gather and /admin/roles routes are redirects, and the admin menu links straight to the new host in a new tab. Same shared tables underneath (gather_user_roles, user_apps, gather_super_admins) — only the UI moved.",
    ],
    bugFixes: [],
  },
  {
    version: '2.25.0',
    date: '2026-05-22',
    enhancements: [
      "Gather is consolidated into Glean. The Steward copy of /admin/gather (which had the Suggestions section added in v2.24.0 hours ago) is now a redirect to https://glean-blue.vercel.app/admin/gather — that's the canonical Gather page from now on. The 'Gather — User access' entry in the admin menu links straight there in a new tab so super admins skip the redirect hop. Bookmarks and the previous in-app path still land somewhere useful via the redirect page. Why: Scott wanted exactly one place to manage user access across all five apps instead of three near-identical copies (Steward, Glean, Knit). Glean wins because it has the most-evolved code — the suite-app filter, the Remove-from-suite control, and today's Suggestions section.",
    ],
    bugFixes: [],
  },
  {
    version: '2.24.0',
    date: '2026-05-22',
    enhancements: [
      "Gather page (/admin/gather) gained a Suggestions section. It pulls from the shared `app_suggestions` table (where the 💡 button on every app posts) and shows a per-app summary table — Open / Backlog / Total — with a green New badge on any app that has unprocessed suggestions. Below the table, each open or backlog suggestion lists in full with submitter, date, and source page URL. Three buttons per item: Add to backlog, Mark complete, Decline. Acting on a suggestion removes it from the view (anything completed or declined is filtered out). Backed by a new `gather_set_suggestion_status` RPC that's locked to super admins via the `gather_super_admins` table.",
    ],
    bugFixes: [],
  },
  {
    version: '2.23.0',
    date: '2026-05-22',
    enhancements: [
      "Quarterly interviews page has a new per-assignee summary table above the main grid. For the current quarter, it shows each presidency member with their assigned count, completed count, and a progress bar. The order surfaces who has the most outstanding interviews first (lowest completion % at top), so the stake president can see at a glance who needs a nudge. Unassigned interviewees collapse into a final row labeled 'Unassigned' so they don't disappear. The summary always reflects the full picture — it isn't affected by the 'filter by presidency member' selector above, so you can drill into one person's grid without losing the overall view.",
    ],
    bugFixes: [],
  },
  {
    version: '2.22.0',
    date: '2026-05-22',
    enhancements: [
      "New /admin/roles page (linked from the menu as 'Suite roles', super-admins only) lets you assign any of the 19 Gathered suite roles to any signed-in user — Stake President through Ward Member. One person can hold multiple roles; ward-scoped roles take a ward picker. Writes to the shared `gather_user_roles` table — same source of truth Glean, Knit, Magnify read from and Tidings syncs into.",
      "Quarterly-interview access now also recognizes the 19-role catalog. `steward_caller_can_manage_interviews()` was extended to accept gather_user_roles membership in stake_president / sp_1st_counselor / sp_2nd_counselor / stake_exec_secretary / stake_clerk / high_councilor — same five logical roles as before, just also via the suite table. The spreadsheet flags Stake Executive Secretary specifically for interview editing, and a new `steward_is_stake_exec_secretary()` helper is available for future UI/RLS that wants to recognize that role specifically.",
      "Existing `steward_admins` and `steward_user_profiles.stake_role` checks stay intact — no regression for anyone already provisioned via the legacy paths.",
    ],
    bugFixes: [],
  },
  {
    version: '2.21.0',
    date: '2026-05-22',
    enhancements: [
      'Stake Clerk added as a recognized stake_role. The four existing roles (Stake President, First Counselor, Second Counselor, Executive Secretary) now stand alongside Stake Clerk, and a stake clerk has the same RLS access to the /interviews report and home-page card as the other four. Surfaced in the StakeRole type, STAKE_ROLE_LABELS, stakeRoleFromTemplateName, useAuth.canManageInterviews, and the useInterviews member fetch. DB side: steward_user_profiles.stake_role CHECK constraint expanded and steward_caller_can_manage_interviews() helper updated (migration v2.21.0).',
      'Pre-provisioned four presidency-circle profiles ahead of rollout: Celso Alvarez (First Counselor, First Counselor template selected), Walter Vielman (Second Counselor, Second Counselor template selected), Blake Bartolomei (Executive Secretary, no template), Jeff Tingey (Stake Clerk, no template). Each got a steward_user_profiles row with status=approved and a matching user_apps row so Steward shows up in their Gathered switcher. Sign-in works immediately with their existing Magnify credentials since the four church apps share one auth project.',
    ],
    bugFixes: [],
  },
  {
    version: '2.20.1',
    date: '2026-05-20',
    enhancements: [
      'Suggestion FAB copy trimmed — removed the "Goes straight to Scott." line under the prompt so the modal stays focused on the question itself.',
    ],
    bugFixes: [],
  },
  {
    version: '2.20.0',
    date: '2026-05-20',
    enhancements: [
      'Suggestion FAB added — a small blue lightbulb in the bottom-right corner of every screen (just above the bottom tab bar). Tap it to send a free-form idea or friction note. Submissions land in the shared `app_suggestions` table on the Gathered Supabase project and trigger an email to Scott via Resend, so all of the suite (Steward, Glean, Knit, Tidings, Magnify) now feeds one inbox you can triage and mark `in_progress` / `implemented` / `declined`. The submitter\'s name, email, user id, and current page URL are captured automatically when signed in.',
    ],
    bugFixes: [],
  },
  {
    version: '2.19.3',
    date: '2026-05-19',
    enhancements: [
      'Favicon (browser tab + Chrome bookmark bar) regenerated to match the home-screen icon. public/favicon.ico is actually a 32x32 PNG (despite the .ico extension) and still held the old design, so Chrome\'s bookmark bar kept showing the wrong glyph. Re-rendered from the current bright-blue + white-checkmark icon master.',
    ],
    bugFixes: [],
  },
  {
    version: '2.19.2',
    date: '2026-05-19',
    enhancements: [
      'Steward glyph recolored from gold to white. The bright blue background is unchanged; the checkmark on the home-screen icon and the in-app StewardLogo are now white instead of gold. Aligns with the suite-wide rule that default icons are brand color + white glyph; iOS Tinted (sleep) mode then renders white-on-color as the gold-on-black look the user wants there.',
    ],
    bugFixes: [],
  },
  {
    version: '2.19.1',
    date: '2026-05-19',
    enhancements: [
      'Home-screen / PWA icon redesigned: bright blue background (matching the Gathered "S" chip) with a large gold checkmark replacing the white-"S" letter. icon-192.png, icon-512.png, apple-touch-icon.png, and favicon.png regenerated from a single public/icon.svg.',
      'In-app StewardLogo updated to match: the rounded square is now Steward brand blue (#2563EB) and the "S" letterform is gone, replaced by a large gold checkmark — the same treatment now used on every Gathered app\'s home-screen icon. The "Steward" wordmark continues to appear as adjacent text wherever the logo is used.',
    ],
    bugFixes: [],
  },
  {
    version: '2.19.0',
    date: '2026-05-18',
    enhancements: [
      'Suite consistency pass (2/5): EN/ES toggle promoted out of the hamburger menu and into the top app bar. One tap to switch language from any screen — matching the pattern across the Gathered suite.',
      'PWA theme color tuned to match the Gathered chip: home-screen browser chrome and PWA install background now use Steward\'s brand blue (#2563EB), the same blue used by the "S" chip in the Gathered switcher. Removes the dark-navy mismatch between the suite chrome and the per-app brand.',
    ],
    bugFixes: [],
  },
  {
    version: '2.18.6',
    date: '2026-05-10',
    enhancements: [
      'Quarterly Interviews: cleaned up the interviewee names and callings. Names are now just the person (e.g. "Himebaugh", "Ravi Malli", "Jon Moss") and the calling subtitle describes their actual role and ward (e.g. "Bishop, HP1 Ward", "High Council, W1 Ward + Mission", "Stake Young Men President"). Previously the name was a long descriptor like "Bishop (HP1) - Himebaugh" and the calling was a generic "Stake President interview", so the two lines duplicated each other.',
      'Stake President / First Counselor / Second Counselor templates: the underlying behavior names were renamed in lockstep so future template applications get the clean names from the start. Each user\'s existing per-user behaviors were also renamed via a one-time SQL pass so they stay aligned with the interview rows (the sync triggers match on behavior name).',
    ],
    bugFixes: [
      'Removed the "Unsupported metadata themeColor" warning that appeared on every page build. Next 16 expects themeColor in the viewport export, not the metadata export. Same color, just the right place.',
    ],
  },
  {
    version: '2.18.5',
    date: '2026-05-10',
    enhancements: [],
    bugFixes: [
      'Desktop Work tab: This Week / This Month / This Quarter now sit side-by-side in three columns on lg+ screens instead of dropping Quarterly to a second row with an empty right column. Mobile remains a single stack.',
      'Header menu: bumped width from w-44 to w-56 so "Quarterly Interviews" no longer wraps onto two lines.',
      'Quarterly Interviews: clicking a Q1 / Q3 / Q4 cell when today is in Q2 used to stamp today\'s date (e.g. "May 17") under the wrong quarter — which read as "this interview was done May 17 in Q1," nonsense. Now an off-quarter click uses the last day of the clicked quarter (Mar 31 / Sep 30 / Dec 31) and the displayed badge matches the column. Clicks inside the current quarter still use today.',
      'Work tab: a category that had no behaviors at a given frequency (e.g. INTERVIEWS for a Stake President, which only has quarterly behaviors) used to show an empty "Add a behavior to this category" placeholder in the Weekly section, making it look like the category was empty even when it had 14 quarterly entries. The placeholder is now hidden for categories that are populated in any other frequency.',
      'Notes tab: pending debounced save now cancels on unmount, fixing a small memory leak / "setSaving on unmounted component" warning when navigating away mid-typing.',
    ],
  },
  {
    version: '2.18.4',
    date: '2026-05-10',
    enhancements: [],
    bugFixes: [
      'Quarterly Interviews → Assigned to picker no longer shows rejected or pending users. The dropdown was querying steward_user_profiles by stake_role only, so a duplicate Stake President account that had been rejected (left over from earlier signup churn) was leaking into the picker as a second "Stake President" option. Added a status=approved filter to the members query, and cleared the stale role on the rejected scottdshurtliff@gmail.com profile so only the real sendscott@gmail.com account remains.',
    ],
  },
  {
    version: '2.18.3',
    date: '2026-05-10',
    enhancements: [
      'Quarterly interviews now sync automatically between the personal Work tab and the Quarterly Interviews report. Mark a bishop interview done from your tracker and the cell on /interviews flips to green in the same instant; mark it done on /interviews and your tracker shows the green checkmark on the next page load. Works in both directions, including unmarking. Implemented as two AFTER triggers in Postgres (steward_sync_entry_to_interview and steward_sync_interview_to_entry), with pg_trigger_depth() guards to prevent recursion. The match key is the behavior name minus the "Interview " prefix plus year + quarter. End-to-end round-trip tested in both directions before shipping.',
    ],
    bugFixes: [],
  },
  {
    version: '2.18.2',
    date: '2026-05-10',
    enhancements: [],
    bugFixes: [
      'Removed the duplicate "My Interviews" card from the Work tab. Presidency members and the executive secretary already see their quarterly interviews in the regular "This Quarter" section (because the Stake President / Counselor templates seed each interview as a personal quarterly behavior). The summary card was duplicating that list. The dedicated Quarterly Interviews page (Menu → Quarterly Interviews) remains the single cross-presidency report; the home/Work tab is back to the regular tracker view.',
    ],
  },
  {
    version: '2.18.1',
    date: '2026-05-10',
    enhancements: [
      'Calling and stake role are now one field. The Admin → Active Users page no longer shows two separate dropdowns. Pick a calling/template and the stake_role is derived automatically from the template name (Stake President → stake_president, First Counselor → first_counselor, Second Counselor → second_counselor, Executive Secretary → exec_secretary, anything else → none). The current role appears as a small blue badge next to the calling so admins can see at a glance who has access to the Quarterly Interviews page. Both DB columns (selected_template_id/name and stake_role) are still written so nothing downstream breaks — the UI is just collapsed into one picker.',
      'Approving a pending user now also sets their stake_role from the calling they picked at signup, so newly approved presidency members get Quarterly Interviews access immediately without an extra step.',
      'To grant exec_secretary without a behavior set: create or rename a template to "Executive Secretary" and assign it. The role mapping picks it up automatically.',
    ],
    bugFixes: [
      'Quarterly Interviews import: backfilled stake_role from existing selected_template_name for all approved users, so any presidency member who was set up before v2.18.0 now sees the new menu item without needing to be re-edited.',
    ],
  },
  {
    version: '2.18.0',
    date: '2026-05-10',
    enhancements: [
      'Quarterly Interview Summary: a new page (Menu → Quarterly Interviews) where the stake presidency and the executive secretary can track every quarterly interview the presidency owes — bishops, high council, etc. The page is a grid: one row per interviewee, four columns (Q1–Q4). Click a cell to mark done; right-click (or long-press) to set a scheduled date, completion date, and notes. Add an interviewee with one click and rows are created for all four quarters of the year. Year stepper lets you navigate past/future. Filter by assigned presidency member. Live "X of Y done this quarter" stat at the top.',
      'Sync to personal trackers: presidency members and the executive secretary now see a "My Interviews — Q[n]" card at the top of their Work tab listing the interviews assigned to them for the current quarter. Toggling a row writes to the same steward_interviews table the summary page uses — both views always agree. The card is hidden if the user has no assigned interviews this quarter.',
      'Stake roles: a new optional `stake_role` field on the user profile (Stake President, First/Second Counselor, Executive Secretary). Admins set this in Admin → Active Users with a one-click dropdown. The Quarterly Interviews page and the My Interviews card are gated on this role; admins also get access.',
      'Desktop layout: the Work tab no longer renders as a narrow phone-width column on a wide browser. The page is wrapped in a centered container that expands on tablet and desktop. On large screens (≥1024px) the Weekly / Monthly / Quarterly sections sit side-by-side as cards instead of stacked, so the desktop view actually uses the horizontal space. Mobile experience is unchanged.',
      'Wider Guide, Release Notes, and Admin pages on desktop (max-w-3xl) so the long-form content is easier to scan in a browser.',
    ],
    bugFixes: [],
  },
  {
    version: '2.17.0',
    date: '2026-05-10',
    enhancements: [
      'Gather → Delete user: every row in Admin → Gather now has a delete button. Confirms with a dialog, then fully removes the user from auth and from every shared-project app profile (Magnify, Steward, Glean, Knit) via the new gather_delete_user RPC. Tidings is on a separate Supabase project and is not affected — manage Tidings users in the Tidings users panel further down the page or in Tidings itself. Super admins cannot delete themselves.',
    ],
    bugFixes: [
      'Gather → grant Steward access: the gather_grant_app_access RPC was inserting into steward_user_profiles using a non-existent "user_id" column instead of the table\'s actual PK column "id". Toggling Steward access on for any user surfaced the error "column user_id of relation steward_user_profiles does not exist". Fixed by switching the insert to use "id" with ON CONFLICT (id).',
    ],
  },
  {
    version: '2.16.1',
    date: '2026-05-04',
    enhancements: [],
    bugFixes: [
      'Gathered switcher: Tidings URL corrected from tidings.vercel.app (someone else\'s project) to glad-tidings.vercel.app (the actual Tidings deployment).',
    ],
  },
  {
    version: '2.16.0',
    date: '2026-05-04',
    enhancements: [
      'Per-app brand stripe: a 3px steward-primary blue strip now sits at the bottom of the app header, picking up the same blue used in the Gathered switcher\'s "S" chip. The brand identity now follows you into the app instead of stopping at the chip in the top bar. Suite navy chrome is preserved so the family feel stays intact.',
    ],
    bugFixes: [],
  },
  {
    version: '2.15.4',
    date: '2026-05-04',
    enhancements: [],
    bugFixes: [
      'Gathered switcher: use the canonical short Magnify and Tidings URLs (magnify-eta.vercel.app and tidings.vercel.app) instead of the longer team-scoped URLs. Same destinations, cleaner links.',
    ],
  },
  {
    version: '2.15.3',
    date: '2026-05-04',
    enhancements: [
      'Gather admin: Tidings users section upgraded from read-only to full CRUD. Super-admins can now add users (email, name, role, ward) via an inline modal, change role and ward inline per row, and remove users — all backed by the new gather_tidings_grant/update/revoke_user RPCs on the Tidings Supabase project. List refreshes after every mutation.',
    ],
    bugFixes: [
      'Admin/gather page marked force-dynamic to prevent Next.js from attempting static prerender without Supabase env vars.',
    ],
  },
  {
    version: '2.15.2',
    date: '2026-05-04',
    enhancements: [
      'Visual consistency (Wave 6): all login/forgot/reset inputs now use 1.5px borders and min-h-[44px] tap targets. Auth cards and primary buttons use the canonical 10px radius (rounded-md). Glean status and category tokens added to tokens.css for cross-app parity. AppSwitcher chrome color moved to --color-switcher-chrome token.',
    ],
    bugFixes: [],
  },
  {
    version: '2.15.1',
    date: '2026-05-03',
    enhancements: [],
    bugFixes: [
      'Gathered switcher: tapping another app in the dropdown now navigates the current tab instead of opening a new browser tab. Previously each switch left a tab behind, so hopping between Magnify → Steward → Glean → Knit accumulated tabs. Now it replaces the page in place — much cleaner. (Also fixed an RLS infinite-recursion bug on the shared user_apps + gather_super_admins tables that was silently breaking the switcher\'s read query — the bar wasn\'t showing any apps even when access was correctly granted.)',
    ],
  },
  {
    version: '2.15.0',
    date: '2026-05-03',
    enhancements: [
      'Tidings users now surface on /admin/gather. The screen pulls them from a new gather_tidings_users SECURITY DEFINER RPC on the Tidings Supabase project (Tidings runs on a separate project from the other four apps), so super admins can finally see who has Tidings access without hopping apps. Add / edit / remove still happens inside Tidings via a "Manage in Tidings ↗" link — cross-project writes would need additional plumbing. Requires NEXT_PUBLIC_GATHER_TIDINGS_SUPABASE_ANON_KEY in Vercel; falls back to a "not configured" notice if missing.',
    ],
    bugFixes: [],
  },
  {
    version: '2.14.0',
    date: '2026-05-03',
    enhancements: [
      'i18n: forgot-password and reset-password pages are now wired through the existing translations.ts t() lookup with full English and Spanish coverage. Spanish-locale users get fully translated pages instead of inline English fallbacks.',
      'A11y: every input and primary button on the new auth pages now meets the 44×44 minimum tap target the design system requires. Form fields and buttons get min-h-[44px] for non-tech-savvy users on mobile.',
    ],
    bugFixes: [],
  },
  {
    version: '2.13.0',
    date: '2026-05-03',
    enhancements: [
      'Cross-app grant via RPC: /admin/gather chip toggles now call gather_grant_app_access / gather_revoke_app_access SECURITY DEFINER RPCs instead of writing to user_apps directly. The RPC creates the per-app profile row (steward_user_profiles, profiles, glean_leaders, knit_admin_users) with sane defaults so a newly-granted user lands in a usable state inside the target app instead of hitting a "pending approval" / "no profile yet" gate. Tidings is on a separate Supabase project so the RPC sets the user_apps row but leaves the Tidings users table untouched (must still be added inside Tidings).',
    ],
    bugFixes: [],
  },
  {
    version: '2.12.0',
    date: '2026-05-03',
    enhancements: [
      'Demo mode now covers Reflect and Notes too: the Reflect log shows per-role reflection notes from the same fixture the Work tab uses, plus a couple of pre-seeded sample entries so the log has content to scan. The Notes tab seeds a friendly placeholder note and writes demo edits to in-memory state only — your real steward_notes row is never touched.',
    ],
    bugFixes: [],
  },
  {
    version: '2.11.0',
    date: '2026-05-03',
    enhancements: [
      'Demo mode now actually shows demo data: turning the banner on swaps every steward_categories / steward_behaviors / steward_entries / steward_cell_comments read for a per-role fixture, so the demoer sees a realistic week of leader checklist data without ever touching real ward records. Fixtures cover Stake President, Stake Clerk, High Councilor, Bishop, EQ President, RS President, and member — pick the role from the banner. Toggling cells (Y / N / K / blank) and writing notes still works in demo, but only against in-memory state — nothing is persisted, and a refresh resets to the seeded fixture. This means Real and Demo modes coexist on the same device without the demo polluting the real database.',
    ],
    bugFixes: [],
  },
  {
    version: '2.10.0',
    date: '2026-05-03',
    enhancements: [
      'Cross-app user admin: a new /admin/gather screen lets the Stake President or Stake Clerk see every user in one table and toggle which of the five Gather apps each one can use. Toggling a chip flips a row in the shared user_apps table — that same table powers the Gathered switcher in every app, so granting access here lights up the right apps everywhere. The Stake President can also promote / demote a Stake Clerk into the super-admin role from this screen.',
      'Demo mode: a striped amber banner now sits at the top of every Steward screen when demo mode is on. The banner lets the demoer pick a role (Stake President, Stake Clerk, Bishop, EQ President, RS President, member) so they can talk through what each role experiences without exposing real ward data. Toggle from the hamburger menu under "Demo mode". Demo flag is stored in localStorage, so it persists per-device and lives alongside real-mode use.',
      'Hamburger menu: added a new "Gather — User access" entry (admins only) and the Demo-mode toggle. Layout otherwise unchanged.',
    ],
    bugFixes: [],
  },
  {
    version: '2.9.0',
    date: '2026-05-03',
    enhancements: [
      'Gather suite unification: the "Gathered" cross-app jump bar now lists all five sibling apps — Magnify, Steward, Glean, Tidings, and Knit — with brand-colored letter avatars and one-line descriptions. The dropdown still only shows apps you actually have access to (read from the shared user_apps table).',
      'Forgot password: a dedicated /forgot-password page now sends a Supabase password-reset email; the email links into a /reset-password page where you choose a new password. Login page links to it inline. Both pages are bilingual EN/ES.',
      'Sign up was already on the login page — kept the existing toggle, just added the forgot-password link beside it.',
    ],
    bugFixes: [],
  },
  {
    version: '2.8.2',
    date: '2026-05-01',
    enhancements: [],
    bugFixes: [
      'Login page layout was collapsed into a tiny vertical column where every word wrapped on its own line. Caused by named spacing tokens (--spacing-sm/md/lg/…) added in the design-token rollout colliding with Tailwind v4\'s sizing scale, so max-w-sm resolved to 8px instead of 24rem. Removed the unused named spacing tokens; the form card now lays out at its intended width and the navy hero band reads correctly',
    ],
  },
  {
    version: '2.8.1',
    date: '2026-04-29',
    enhancements: [
      'Magnify icon in the Gathered AppSwitcher (the cross-app jump bar at the top) now uses the new Magnify mark — clean white M with a gold magnifying lens — instead of the old photographic logo',
    ],
    bugFixes: [],
  },
  {
    version: '2.8.0',
    date: '2026-04-29',
    enhancements: [
      'New Steward logo — flowing white "S" letterform with a gold checkmark in the upper-right counter (the "done" detail), rendered as a crisp SVG. Replaces the old photographic logo on the Login screen and adds the mark to the AppShell header next to the title',
      'Home-screen icon, favicon, apple-touch-icon, and PWA install icons (192px / 512px) all updated to the new mark — clean S+check on the deep navy brand background',
    ],
    bugFixes: [],
  },
  {
    version: '2.7.0',
    date: '2026-04-29',
    enhancements: [
      'Login page redesigned to match the Stake Suite auth pattern: deep navy hero band at the top with the Steward logo + name + screen heading in white, with the white form card overlapping the bottom of the hero. Replaces the previous plain-white treatment',
      'Login page now has an English / Español language toggle directly below the form so users can switch language before signing in',
    ],
    bugFixes: [],
  },
  {
    version: '2.6.5',
    date: '2026-04-29',
    enhancements: [
      'Primary action buttons (Save, Sign In, Add, Continue) and the active bottom-tab indicator now route through the Steward primary token (bg-steward-primary / text-steward-primary) instead of bare blue-600 utilities — same color, but the codebase now expresses brand intent so the design system can shift the accent in one place',
    ],
    bugFixes: [],
  },
  {
    version: '2.6.4',
    date: '2026-04-29',
    enhancements: [
      'Section completion counters now read "12 of 18 done" instead of "12/18" so the unit is always visible',
      'Admin: rejecting a user spells out the email address in the confirm prompt; deleting a template spells out the template name and warns it cannot be undone',
      'Admin: template trash icon now has a screen-reader label ("Delete template <name>") instead of being icon-only',
    ],
    bugFixes: [],
  },
  {
    version: '2.6.3',
    date: '2026-04-29',
    enhancements: [
      'Spanish language support — toggle EN / Español from the header menu. The chrome (header tagline, bottom tabs, sign-out menu) and the entire login screen are translated; preference persists in localStorage and auto-detects from the browser on first load',
    ],
    bugFixes: [],
  },
  {
    version: '2.6.1',
    date: '2026-04-29',
    enhancements: [
      'Adopted the shared Stake Suite design tokens — Tailwind v4 now generates utilities for brand-primary, steward-primary, stage-*, type-*, plus the canonical radii / shadow / type-scale / spacing scale shared across Magnify, Steward, and Tidings',
    ],
    bugFixes: [],
  },
  {
    version: '2.6.0',
    date: '2026-04-12',
    enhancements: [
      'Left Field Labs app switcher — users with access to multiple apps (Magnify, Steward, Duty) see a toggle bar at the top to switch between them',
    ],
    bugFixes: [],
  },
  {
    version: '2.5.0',
    date: '2026-04-05',
    enhancements: [
      'Save as Template — save your current work tab setup as a reusable template from the Work tab',
      'Editable info notes — add or edit notes/references on any behavior via the edit modal (shows on the ℹ️ icon)',
      'Admin: template list — view all saved templates with a preview of categories and behaviors',
      'Admin: edit template — loads template into the work tab for editing, then save back as template',
      'Admin: delete template — remove templates you no longer need',
      'Removed: "Create Suggested Templates" seed button (create your own templates instead)',
      'Removed: "Change Calling" button (replaced with "Save as Template")',
    ],
    bugFixes: [],
  },
  {
    version: '2.4.0',
    date: '2026-04-02',
    enhancements: [
      'Choose your Calling — new users see a calling picker (Stake President, First Counselor, Second Counselor, High Councilor) that sets up their stewardship items automatically',
      'Change Calling — existing users can switch to a different template from the Work tab',
      'Simplified admin page — just template editing, removed groups and assignments',
    ],
    bugFixes: [],
  },
  {
    version: '2.3.0',
    date: '2026-04-02',
    enhancements: [
      'Suggested templates — one-click creation of Handbook Ch. 6 templates for Stake President, First Counselor, Second Counselor, and High Councilor',
      'Info buttons — tap the (i) icon on any behavior to see handbook references, scriptures, and guidance',
      'Templates now support interval (e.g., every 2 weeks) and info text fields',
    ],
    bugFixes: [],
  },
  {
    version: '2.2.0',
    date: '2026-04-02',
    enhancements: [
      'Add to Calendar — tap the calendar icon on any task row to add it to Google Calendar, Outlook, or download an .ics file',
    ],
    bugFixes: [],
  },
  {
    version: '2.1.0',
    date: '2026-03-31',
    enhancements: [
      'Complete UI redesign: three-section checklist (This Week / This Month / This Quarter)',
      'Large tap targets — no more accidental marking when scrolling',
      'Behaviors grouped by category within each time period',
      'Completion counter (done/total) per section with period navigation',
      'Completed items show strikethrough, N/A items dimmed',
      'Inline compliance %, comment indicator, and edit buttons per row',
    ],
    bugFixes: [
      'Fixed accidental cell marking when scrolling on mobile',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-03-31',
    enhancements: [
      'Renamed app from "Leader Standard Work" to "Steward"',
      'All database tables renamed from lsw_ to steward_ prefix',
      'Updated all UI text, page titles, guide, and login screen',
      'Save as Template from the main Work tab (admin only)',
      'Simplified admin panel — templates created from main page, admin manages groups and assignments',
    ],
    bugFixes: [
      'Fixed admin page redirect loop',
      'Fixed quarterly/monthly scroll jumping too far',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-03-30',
    enhancements: [
      'N/A cell status — tap through Y → N → NA → empty to mark a cell as not applicable (e.g., holiday, skip week)',
      'N/A cells shown in gray and excluded from compliance % denominator',
      'N/A option available in the cell detail modal (long-press/right-click)',
    ],
    bugFixes: [],
  },
  {
    version: '1.8.0',
    date: '2026-03-30',
    enhancements: [
      'Every N weeks scheduling — set a task to repeat every 2, 3, 4+ weeks with a start date anchor',
      'Frequency label shows interval (e.g., "Every 2 wks")',
      'Responsive desktop layout — wider columns, larger cells, more visible occurrences on bigger screens',
    ],
    bugFixes: [],
  },
  {
    version: '1.7.0',
    date: '2026-03-30',
    enhancements: [
      'Simplified frequency: just Weekly, Monthly, or Quarterly',
      'Weekly shows next 4 Sundays as cells, Monthly shows 12 months, Quarterly shows 4 quarters',
      'Per-row scroll arrows to navigate forward/backward through occurrences',
      'Compliance % based on last 12 occurrences (12% column)',
      'Reorder mode stays open until toggled off — move items multiple positions without re-clicking',
      'Removed NEW badge, complex recurrence settings, and frequency display widget',
    ],
    bugFixes: [],
  },
  {
    version: '1.6.0',
    date: '2026-03-30',
    enhancements: [
      'Next-4-occurrences grid — each behavior row shows its own next 4 applicable dates with day letter + date headers, adapting to frequency',
      'Behavior reorder — tap the reorder icon on a category header to enable up/down arrows for rearranging behaviors',
      'Removed fixed 7-day weekly grid — the grid is now frequency-aware per row',
    ],
    bugFixes: [],
  },
  {
    version: '1.5.0',
    date: '2026-03-30',
    enhancements: [
      'Google Tasks-style frequency picker: "Repeats every [N] days/weeks/months" with day-of-week and monthly pattern options',
      'Redesigned grid layout: Edit | Task (wrapping text) | Frequency | 4-week compliance % | Day cells',
      '4-week rolling compliance percentage per behavior',
      'Frequency displayed inline in compact format (e.g., "MTW", "1st Sun", "Every 2 wks")',
      'Simplified to single weekly view — removed daily/monthly view toggle',
    ],
    bugFixes: [
      'Fixed admin page loading race condition',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-30',
    enhancements: [
      'Templates — admins can create reusable sets of categories and behaviors, then share them with user groups',
      'User Groups — create named groups and add users by email for template distribution',
      'Template Assignments — assign templates to groups; they auto-populate into each member\'s Work tab on login',
      'Admin panel accessible from the header menu (admin users only)',
      'Admin designation via steward_admins table',
    ],
    bugFixes: [],
  },
  {
    version: '1.3.0',
    date: '2026-03-30',
    enhancements: [
      'Cell comments now work on desktop — hold click for 500ms or right-click to open the comment dialog',
    ],
    bugFixes: [
      'Fixed long-press not working with mouse/keyboard (only worked on touchscreens)',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-30',
    enhancements: [
      'Daily view — single-day focus with large Y/N toggles and comment previews, ideal for heavy days like Sunday',
      'Monthly view — compact heat-map grid showing the entire month at a glance with color-coded cells',
      'View switcher (Day/Week/Month) at top of navigation — dates sync when switching between views',
      'Updated user guide with new view mode documentation',
    ],
    bugFixes: [],
  },
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
      'Initial release of Steward app',
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
