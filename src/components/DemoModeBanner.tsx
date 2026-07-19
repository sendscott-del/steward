'use client'

import { DEMO_ROLE_LABELS, useDemoMode, type StewardDemoRole } from '@/lib/demoMode'

/**
 * Banner shown at the top of every Steward screen when demo mode is on.
 * Lets the demoer switch between leader and member roles to walk through
 * each role's experience without exposing real ward data.
 */
export default function DemoModeBanner() {
  const { demoMode, demoRole, setDemoRole, setDemoMode } = useDemoMode()
  if (!demoMode) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-white text-xs"
      style={{ background: 'repeating-linear-gradient(45deg, #b45309, #b45309 12px, #92400e 12px, #92400e 24px)' }}
    >
      <span className="font-bold uppercase tracking-wider">Demo mode</span>
      <span className="hidden sm:inline opacity-80">No real ward data is shown. Use this to train new leaders.</span>
      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        <label className="font-medium opacity-80">Viewing as</label>
        <select
          value={demoRole}
          onChange={e => setDemoRole(e.target.value as StewardDemoRole)}
          className="bg-white/10 border border-white/40 rounded px-2 py-0.5 text-white min-w-0 max-w-full"
        >
          {Object.entries(DEMO_ROLE_LABELS).map(([k, label]) => (
            <option key={k} value={k} className="text-black">{label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDemoMode(false)}
          className="ml-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border border-white/50 hover:bg-white/15 rounded"
        >
          Exit
        </button>
      </div>
    </div>
  )
}

/** Standalone toggle for use in a settings menu. */
export function DemoModeToggle() {
  const { demoMode, setDemoMode } = useDemoMode()
  return (
    <button
      type="button"
      onClick={() => setDemoMode(!demoMode)}
      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
    >
      <span>Demo mode</span>
      <span className={`text-xs font-bold uppercase ${demoMode ? 'text-amber-700' : 'text-gray-400'}`}>
        {demoMode ? 'On' : 'Off'}
      </span>
    </button>
  )
}
