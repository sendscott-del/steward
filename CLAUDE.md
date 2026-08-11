# Steward — current state

> Read this before touching the app. Update it the MOMENT an infra fact changes (database, domain, auth) — don't wait for session end. Append an entry to docs/SESSIONS.md at the end of every working session. (This system exists because on 2026-07-14 a session wrote hours of content to the wrong Supabase project — the move was documented nowhere.)

## What this is

Steward (formerly "Leader Standard Work") is a stewardship behavior-tracking app for callings in The Church of Jesus Christ of Latter-day Saints — leaders track recurring behaviors on weekly/monthly/quarterly grids with compliance views, templates by calling, reflection notes, and quarterly interviews. Reflection-first by design, not just checkboxes. Part of the Gathered suite. Lane: Church — member names, interview notes, and pastoral details are confidential and must never appear in code, docs, commits, or logs.

## Infrastructure — VERIFY BEFORE ANY DB WRITE

- **Supabase:** SHARED project `isogetmvnpimcmouakeg` (verified in `.env.local`). SHARED project — schema/auth changes affect Magnify/Glean/Knit/Liken/Conduct/Duty and more. Confirm the ref before every DB write. Also: the shared project's secret namespace is project-wide — grep other app dirs for `Deno.env.get('NAME')` before `supabase secrets set`.
- **Table prefix:** `steward_` (e.g. `steward_behaviors`, `steward_categories`, `steward_templates`, `steward_entries`, `steward_interviews`, `steward_shared_tasks`, `steward_user_profiles`, `steward_admins`). Shared unprefixed tables it also touches: `user_apps`, `gather_access_requests`.
- **Auth:** shared Supabase Auth; Magnify owns the Site URL — Steward's URL lives in the Redirect URLs allow-list. Access control is deferred to the Gather hub (gather.gatheredin.app) since v2.27.0.
- **Vercel / domain:** steward.gatheredin.app (old stewards-indeed.vercel.app). Deploys on push to main.
- **GitHub:** https://github.com/sendscott-del/steward (origin, push to main).
- **Native:** Capacitor wrapper (`ios/`, `android/`) + fastlane (pipeline cloned from Homefront).
- **Secrets:** env var NAMES only — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (never committed).

## Architecture snapshot

- Next.js 16 (App Router) + React 19, Tailwind CSS v4, lucide-react; Capacitor for native shells.
- Key dirs: `src/` (app code), `src/constants/changelog.ts`, `fastlane/`, plus **migrations as loose `supabase-migration-*.sql` files at the repo ROOT** (the `supabase/` dir exists but is empty of SQL) — keep new migrations consistent with wherever you standardize, and say so here if you move them.
- Core model: behaviors grouped in categories, scheduled weekly/monthly/quarterly (incl. "every N weeks" with anchor date), compliance over the last 12 periods, N/A cell status, cell comments, templates by calling with template-apply.
- **Interviews are NOT behaviors.** `steward_interviews` (one row per interviewee per quarter, with `assigned_to_user_id`) is a separate model from `steward_behaviors`/`steward_entries`. There is no sync between the two tables and never was — the "bidirectional sync" this file used to claim was a `MyInterviewsCard` that read the interviews table directly, deleted in v2.18.2. Since **v2.39.0** the Work tab's "This Quarter" section again renders the caller's assigned interviews as `VirtualRow`s straight out of `steward_interviews` (see `PeriodChecklist.VirtualRow` + `myInterviewRows` in `src/app/page.tsx`), so both views are one record. The calling templates' generic `Interview HC (…)` quarterly behaviors are placeholders that were never connected to it; the Work tab offers to archive them.
- Admin: `steward_admins` + first-run calling picker; user approval flows through Gather.
- **Shared tasks (v2.38.0):** a behavior can be shared with other leaders. Every participant keeps their OWN `steward_behaviors` row (own category, own compliance); rows are linked by `steward_behaviors.shared_task_id` → `steward_shared_tasks`. Marking a period **fans out on write** to every participant's row, stamped in `steward_entries.completed_by`. Reads are unchanged (`.eq('user_id', …)`), which is why compliance/streaks/N-A all kept working. All cross-user writes go through SECURITY DEFINER RPCs — `steward_set_behavior_sharing`, `steward_set_shared_entry`, `steward_my_shared_tasks`, `steward_shareable_users` — because RLS on behaviors/categories/entries is strictly `auth.uid() = user_id`. Cell comments are NOT shared, only the y/n/na value.

## Rules for this repo

- Version in `package.json` (2.36.x line); every user-facing change bumps it and appends `src/constants/changelog.ts`.
- Deploy = push to GitHub main → Vercel builds. Scott tests on Vercel, not local — push after every change.
- Session docs: append `docs/SESSIONS.md` every session; update this file the moment an infra fact changes.
- No secrets in committed files. No member names in fixtures or docs.

## Delivery surfaces (verify EVERY one per release — see global tech-stack.md rule)

| Surface | How it updates | Timeline | Verify by |
|---|---|---|---|
| Web (steward.gatheredin.app) | Vercel on git push | ~2 min | load site |
| Installed PWA | same Vercel deploy; SW refresh on next open | minutes | reload twice |
| iOS/Android (Capacitor shells) | load the LIVE SITE via `server.url` | same Vercel deploy, next app open | open the store app after deploy |

The native shells render the deployed website — **one Vercel deploy updates every surface.** A store re-submission is only needed when native shell code/plugins change. This is the OPPOSITE of Magnify (embedded Expo bundle + OTA publish, where store users can silently go stale) — never conflate the two models.

## Gotchas

- **Auth/admin race condition:** the pending-approval screen had a race where profile status beat the admin check; fixed 2026-06-27 so the admin check wins. The 2026-03-30 history is littered with admin-check loop fixes — be careful refactoring `useAuth`/admin gating.
- Migrations at repo root are numbered by app version (v1.1 … v2.21.0), not sequentially — check which have actually been applied before assuming schema state.
- Signup tags `app=steward` on the shared auth flow; shared-auth signup auto-signs-in emails that already exist from another suite app (2026-04-05) — keep that path intact.
- App Review reviewer account auto-sees demo data only (2026-06-09); "Try the demo" (v2.36.0) is fixture-only. Don't loosen demo scoping.
- README.md is still create-next-app boilerplate — this file is the real doc.
- **`steward_user_profiles` is readable self-or-admin only.** Any feature that needs to show other leaders' names must go through a SECURITY DEFINER RPC (`steward_presidency_members`, `steward_shareable_users`) — a direct table read silently returns just the caller's own row for non-admins, which is how the interviews grid showed "Unknown" for every assignee until v2.39.0.
- **External writer:** Scott's exec-sec agent (`~/claude-cos/.claude/commands/exec-sec.md`) upserts rows in `steward_interviews` via the Supabase MCP service role (since 2026-08-05). If you change that table's schema or constraints, update the agent's conventions too.
