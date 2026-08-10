# Steward — session log

Append-only, newest first. Every working session adds one entry at the TOP: date, what changed, any infra facts touched (database, domain, auth, secrets). Infra changes also go into `CLAUDE.md` immediately, not just here.

## 2026-08-02 — v2.37.2: safe-area spacer when the Gathered suite bar is hidden

- Suite-wide follow-up to the status-bar overlap Scott reported in Magnify/Conduct: when AppSwitcher had nothing to show (single-app users), it rendered nothing and the next element sat under the iPhone status bar / Dynamic Island.
- Fix: `src/components/AppSwitcher.tsx` — the empty case now returns a chrome-colored spacer padded by `env(safe-area-inset-top)` (zero-height where there is no inset). Same change shipped across Steward/Glean/Knit/Tidings/Conduct/Liken this session.
- Pushed to main (`fce4086`); Vercel deploys.

## 2026-07-19 — v2.37.1 responsive fixes (desktop max-width + demo banner wrap)

- Capped the AppShell `<main>` content column at `lg:max-w-3xl lg:mx-auto` (~48rem, centered) so ≥1024px viewports no longer stretch content edge-to-edge; below 1024px rendering is untouched. Suite bar, scripture bar, sidebar, and tab bar remain full-bleed chrome.
- Demo Mode banner (`DemoModeBanner.tsx`) now `flex-wrap`s (outer row + right control group, `min-w-0 max-w-full` on the select) so on 375px phones the Exit button no longer clips off-screen / causes horizontal page scroll.
- Also reconciled versions: 2.37.0 changelog entry existed (install page, 07-06) but package.json/APP_VERSION were never bumped past 2.36.0 — both now 2.37.1 with a new changelog entry.
- CSS/className-only changes; `npx tsc --noEmit` + `npm run build` clean. Pushed to main → Vercel. No infra changes.

## 2026-07-15 — Doc system initialized (history reconstructed from git)

- 2026-03-30: born as "Leader Standard Work" v1.0.0; a single day of v1.x iteration built recurring schedules, reflection log, templates, admin panel, compliance grids — plus a long tail of admin-check race-condition fixes.
- 2026-03-31: v2.0.0 rebrand to **Steward**, complete three-section checklist redesign, compliance labels (L12W/L12M/L12Q).
- 2026-04-02 → 04-05: calling picker + suggested templates, calendar integration, user-approval system on shared auth (auto sign-in for emails existing from other suite apps), D&C 104:57 header.
- 2026-04-12 → 05-04: Gathered app switcher, stake-suite design tokens, EN/ES i18n, navy-hero login, Gather admin waves.
- 2026-05-10 → 05-23: quarterly interviews + desktop layout (v2.18), bidirectional interview↔tracker sync, 19-role suite assignments (v2.22), access control deferred to Gather + first-run calling picker (v2.27), admin page redesign (v2.28).
- 2026-06-08 → 06-09: migrated to steward.gatheredin.app; Capacitor wrapper (cloned from the Homefront pipeline) + signed Android AAB + branded icon/splash; App Review account locked to demo data; Church disclaimer.
- 2026-06-10 → 06-15: Gather-centric access model (v2.33.0), deep-blue re-skin, security hardening (v2.34.2), "Try the demo" one-tap Demo Mode (v2.36.0).
- 2026-06-27: fixed the pending-screen race condition — admin status check now wins over profile status; debug logging added then removed.
- 2026-07-06: /install.html PWA install page + changelog-schema fix (last commits before doc init).
- State at initialization: v2.36.0, 120 commits, live at steward.gatheredin.app on shared Supabase (steward_ prefix), clean working tree.

## 2026-08-05 — exec-sec agent integration (external, no code change)

- Scott's chief-of-staff repo (`~/claude-cos`) now has an exec-sec agent that reads/writes `steward_interviews` directly via the Supabase MCP (service role, bypasses RLS). Conventions documented in `~/claude-cos/.claude/commands/exec-sec.md` §5: upsert on (interviewee_name, year, quarter_num), `last_updated_by` = Scott's user id, notes = logistics only.
- No Steward code or schema changed. Write path verified with a throwaway row (inserted + deleted same session). Table remains empty pending leadership roster seed.

## 2026-08-09 — v2.38.0: shared tasks (one checkbox for the whole presidency)

- **Why:** high council interviews need to happen; it does not matter which member of the presidency does each one. Scott wanted a task that appears on all three lists and is marked off for everyone when any one of them does it, while still recording who.
- **Model chosen: fan-out on write.** Every participant keeps their OWN `steward_behaviors` row (own category, own compliance, own streaks); the rows are linked by a new `steward_behaviors.shared_task_id` → new `steward_shared_tasks` table. Marking a period calls one RPC that writes the value to every participant's row for that date and stamps `steward_entries.completed_by`. Reads stay exactly as they were (`.eq('user_id', …)`), which is why compliance, streaks, the due cue, N/A and the demo fixtures all kept working untouched.
- Rejected the alternative (single shared entry row read by everyone) because every read path, the compliance calc and the exec-sec agent would have had to learn about it.
- **Migration:** `supabase-migration-v2.38.0-shared-tasks.sql`, applied to shared project `isogetmvnpimcmouakeg`. Adds `steward_shared_tasks` (RLS: members select only), `steward_behaviors.shared_task_id`, `steward_entries.completed_by`, and five SECURITY DEFINER RPCs: `steward_caller_is_approved`, `steward_shareable_users`, `steward_set_behavior_sharing`, `steward_set_shared_entry`, `steward_my_shared_tasks`. Definer functions are required because RLS on behaviors/categories/entries is strictly `auth.uid() = user_id` — a leader cannot write into another leader's account directly. EXECUTE revoked from PUBLIC, granted to `authenticated`.
- Sharing a task creates the other person's copy in a category with the SAME NAME as the owner's (creating that category if they lack one) and backfills the owner's existing history so the task reads the same for everyone from day one. Unsharing is non-destructive: everyone keeps their copy and their entries, the link is just removed.
- **UI:** new `ShareWithPicker` (in both Add and Edit Behavior dialogs), `Shared` pill + "Done by [name]" subtitle on rows, shared-task banner in the cell detail sheet. `useSharing.ts` holds the RPC calls; `useStewardData.upsertEntry` routes shared behaviors through `steward_set_shared_entry`.
- **Also fixed:** `EditBehaviorModal` was unreachable — nothing set `editBehaviorId`. The Manage tray on the Work tab now lists each category's behaviors with an Edit button, which is also where sharing is configured. The guide's claim about a "pencil icon on the behavior row" was wrong and is corrected.
- Cell comments stay private to their author; only the y/n/na value is shared. Noted in the guide.
- **Verified:** RPC behavior tested in rolled-back transactions against the live shared DB with fabricated users — sharing creates the member's copy + backfills history; either participant marking it flips both grids with correct `completed_by`; a non-member is refused; unsharing leaves both copies with their history and removes the shared-task row. Nothing persisted (confirmed 0 test rows afterward). `npx tsc --noEmit` and `npm run build` clean.
- **Surfaces:** Steward's native shells load the live site, so one Vercel deploy covers web + PWA + iOS + Android. No store resubmission needed (no native code changed).
- State left in: v2.38.0, pushed to main, migration applied.
