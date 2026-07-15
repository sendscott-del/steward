# Steward — session log

Append-only, newest first. Every working session adds one entry at the TOP: date, what changed, any infra facts touched (database, domain, auth, secrets). Infra changes also go into `CLAUDE.md` immediately, not just here.

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
