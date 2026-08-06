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
