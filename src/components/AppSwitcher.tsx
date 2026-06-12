'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface AppInfo {
  name: string
  label: string
  url: string
  /** Brand-accent color used for the letter avatar in the switcher. */
  color: string
  /** What the app does (one-liner shown in the dropdown). */
  blurb: string
}

// Canonical Gather suite catalog. Keep in sync across all five apps.
const APP_CATALOG: AppInfo[] = [
  { name: 'magnify', label: 'Magnify', url: 'https://magnify.gatheredin.app', color: '#1B3A6B', blurb: 'Calling administration' },
  { name: 'steward', label: 'Steward', url: 'https://steward.gatheredin.app', color: '#2563EB', blurb: 'Leader standard work' },
  { name: 'glean',   label: 'Glean',   url: 'https://glean.gatheredin.app',   color: '#C9A84C', blurb: 'Welfare & self-reliance' },
  { name: 'tidings', label: 'Tidings', url: 'https://tidings.gatheredin.app', color: '#F59E0B', blurb: 'Two-way SMS' },
  { name: 'knit',    label: 'Knit',    url: 'https://knit.gatheredin.app',    color: '#E11D48', blurb: 'Fellowship matching' },
  { name: 'conduct', label: 'Conduct', url: 'https://conduct.gatheredin.app', color: '#0D9488', blurb: 'Meeting agendas' },
  { name: 'liken',   label: 'Liken',   url: 'https://liken.gatheredin.app',   color: '#6D5BA6', blurb: 'Gospel library & drafting' },
]

const CURRENT_APP = 'steward'

function AppMark({ app, size = 28 }: { app: AppInfo; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        backgroundColor: app.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {app.label[0]}
    </div>
  )
}

export default function AppSwitcher() {
  const { user } = useAuth()
  const [otherApps, setOtherApps] = useState<AppInfo[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_apps')
      .select('app_name')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return
        const appNames = data.map((r: { app_name: string }) => r.app_name)
        const others = APP_CATALOG.filter(a => a.name !== CURRENT_APP && appNames.includes(a.name))
        setOtherApps(others)
      })
  }, [user])

  if (otherApps.length === 0) return null

  const currentApp = APP_CATALOG.find(a => a.name === CURRENT_APP)!

  return (
    <div className="relative z-[100]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-1.5"
        style={{
          backgroundColor: 'var(--color-switcher-chrome)',
          // Topmost bar in the app — when installed as a native app it sits
          // under the iOS status bar / Dynamic Island. Inset by the safe area
          // (the navy background fills behind the status bar) while preserving
          // the existing py-1.5 (6px) top padding.
          paddingTop: 'calc(env(safe-area-inset-top) + 6px)',
        }}
        aria-haspopup="menu"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Gathered</span>
          <div className="w-px h-3 bg-white/20" />
          <AppMark app={currentApp} size={18} />
          <span className="text-sm font-bold text-white">{currentApp.label}</span>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-white/70" />
          : <ChevronDown size={14} className="text-white/70" />
        }
      </button>

      {expanded && (
        <div className="bg-white border-b border-gray-200 py-1 shadow-md">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-4 py-1">Switch to</p>
          {otherApps.map(app => (
            <a
              key={app.name}
              href={app.url}
              onClick={() => setExpanded(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
            >
              <AppMark app={app} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{app.label}</div>
                <div className="text-xs text-gray-500 truncate">{app.blurb}</div>
              </div>
              <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
