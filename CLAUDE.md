# Steward — current state

> Read this before touching the app. Update it the MOMENT an infra fact changes (database, domain, auth) — don't wait for session end. Append an entry to docs/SESSIONS.md at the end of every working session. (This system exists because on 2026-07-14 a session wrote hours of content to the wrong Supabase project — the move was documented nowhere.)

## What this is

Steward (formerly "Leader Standard Work") is a stewardship behavior-tracking app for callings in The Church of Jesus Christ of Latter-day Saints — leaders track recurring behaviors on weekly/monthly/quarterly grids with compliance views, templates by calling, reflection notes, and quarterly interviews. Reflection-first by design, not just checkboxes. Part of the Gathered suite. Lane: Church — member names, interview notes, and pastoral details are confidential and must never appear in code, docs, commits, or logs.

## Infrastructure — VERIFY BEFORE ANY DB WRITE

- **Supabase:** SHARED project `isogetmvnpimcmouakeg` (verified in `.env.local`). SHARED project — schema/auth changes affect Magnify/Glean/Knit/Liken/Conduct/Duty and more. Confirm the ref before every DB write. Also: the shared project's secret namespace is project-wide — grep other app dirs for `Deno.env.get('NAME')` before `supabase secrets set`.
- **Table prefix:** `steward_` (e.g. `steward_behaviors`, `steward_categories`, `steward_templates`, `steward_entries`, `steward_interviews`, `steward_user_profiles`, `steward_admins`). Shared unprefixed tables it also touches: `user_apps`, `gather_access_requests`.
- **Auth:** shared Supabase Auth; Magnify owns the Site URL — Steward's URL lives in the Redirect URLs allow-list. Access control is deferred to the Gather hub (gather.gatheredin.app) since v2.27.0.
- **Vercel / domain:** steward.gatheredin.app (old stewards-indeed.vercel.app). Deploys on push to main.
- **GitHub:** https://github.com/sendscott-del/steward (origin, push to main).
- **Native:** Capacitor wrapper (`ios/`, `android/`) + fastlane (pipeline cloned from Homefront).
- **Secrets:** env var NAMES only — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (never committed).

## Architecture snapshot

- Next.js 16 (App Router) + React 19, Tailwind CSS v4, lucide-react; Capacitor for native shells.
- Key dirs: `src/` (app code), `src/constants/changelog.ts`, `fastlane/`, plus **migrations as loose `supabase-migration-*.sql` files at the repo ROOT** (the `supabase/` dir exists but is empty of SQL) — keep new migrations consistent with wherever you standardize, and say so here if you move them.
- Core model: behaviors grouped in categories, scheduled weekly/monthly/quarterly (incl. "every N weeks" with anchor date), compliance over the last 12 periods, N/A cell status, cell comments, templates by calling with template-apply, quarterly interviews synced bidirectionally with tracker entries.
- Admin: `steward_admins` + first-run calling picker; user approval flows through Gather.

## Rules for this repo

- Version in `package.json` (2.36.x line); every user-facing change bumps it and appends `src/constants/changelog.ts`.
- Deploy = push to GitHub main → Vercel builds. Scott tests on Vercel, not local — push after every change.
- Session docs: append `docs/SESSIONS.md` every session; update this file the moment an infra fact changes.
- No secrets in committed files. No member names in fixtures or docs.

## Gotchas

- **Auth/admin race condition:** the pending-approval screen had a race where profile status beat the admin check; fixed 2026-06-27 so the admin check wins. The 2026-03-30 history is littered with admin-check loop fixes — be careful refactoring `useAuth`/admin gating.
- Migrations at repo root are numbered by app version (v1.1 … v2.21.0), not sequentially — check which have actually been applied before assuming schema state.
- Signup tags `app=steward` on the shared auth flow; shared-auth signup auto-signs-in emails that already exist from another suite app (2026-04-05) — keep that path intact.
- App Review reviewer account auto-sees demo data only (2026-06-09); "Try the demo" (v2.36.0) is fixture-only. Don't loosen demo scoping.
- README.md is still create-next-app boilerplate — this file is the real doc.
- **External writer:** Scott's exec-sec agent (`~/claude-cos/.claude/commands/exec-sec.md`) upserts rows in `steward_interviews` via the Supabase MCP service role (since 2026-08-05). If you change that table's schema or constraints, update the agent's conventions too.
