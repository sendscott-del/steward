'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  ClipboardList, StickyNote, BookOpen, Users, Settings, Sparkles, LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useInterviewsOverdue } from '@/lib/hooks/useInterviews'
import AppSwitcher from './AppSwitcher'
import { StewardLogo } from './icons/StewardLogo'
import MobileTabBar from './MobileTabBar'
import MoreSheet from './MoreSheet'
import SuggestionFAB from './SuggestionFAB'

export type TabId = 'work' | 'reflect' | 'notes'

interface AppShellProps {
  children: React.ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function AppShell({ children, activeTab, onTabChange }: AppShellProps) {
  const { user, loading, isAdmin, canManageInterviews, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { t, lang, setLang } = useLanguage()
  const [moreOpen, setMoreOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const overdueCount = useInterviewsOverdue(canManageInterviews)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">{t('app.loading')}</div>
      </div>
    )
  }

  if (!user) return null

  const onInterviewsRoute = pathname?.startsWith('/interviews') ?? false

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppSwitcher />

      {/* Scripture top bar — shared chrome at every size. The 3px steward-primary
          stripe at the bottom is the per-app brand cue that follows you into
          the app from the Gathered switcher chip. Sticky on mobile (where the
          body scrolls), static on desktop (sidebar is the stable anchor). */}
      <header className="sticky md:static top-0 z-30 bg-white border-b-[3px] border-steward-primary px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StewardLogo size={32} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{t('app.name')}</h1>
            <p className="text-[10px] italic text-gray-400 leading-tight truncate">
              &ldquo;{t('app.tagline')}&rdquo;{' '}
              <span className="not-italic">{t('app.taglineRef')}</span>
            </p>
          </div>
        </div>
        {/* EN/ES toggle stays in the scripture top bar across the suite — one-tap
            language switch is always one tap away, never behind a menu. */}
        <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wide select-none">
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
            aria-label="English"
            className={lang === 'en' ? 'text-steward-primary' : 'text-gray-400 hover:text-gray-600'}
          >
            EN
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setLang('es')}
            aria-pressed={lang === 'es'}
            aria-label="Español"
            className={lang === 'es' ? 'text-steward-primary' : 'text-gray-400 hover:text-gray-600'}
          >
            ES
          </button>
        </div>
      </header>

      <div className="flex-1 md:flex">
        {/* Desktop sidebar (md+) — replaces the kebab menu. */}
        <DesktopSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isAdmin={isAdmin}
          canManageInterviews={canManageInterviews}
          overdueCount={overdueCount}
          onInterviewsRoute={onInterviewsRoute}
          onSignOut={() => void signOut()}
        />

        <main className="flex-1 min-w-0 safe-pb-tabbar md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile-only chrome */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={(t) => { setMoreOpen(false); onTabChange(t) }}
        onMoreClick={() => setMoreOpen(true)}
        moreActive={moreOpen}
      />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onSuggestEnhancement={() => setSuggestOpen(true)}
        isAdmin={isAdmin}
        canManageInterviews={canManageInterviews}
        overdueCount={overdueCount}
        onSignOut={() => void signOut()}
      />
      <SuggestionFAB
        controlledOpen={suggestOpen || undefined}
        onControlledClose={() => setSuggestOpen(false)}
      />
    </div>
  )
}

interface DesktopSidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isAdmin: boolean
  canManageInterviews: boolean
  overdueCount: number
  onInterviewsRoute: boolean
  onSignOut: () => void
}

function DesktopSidebar({
  activeTab, onTabChange, isAdmin, canManageInterviews,
  overdueCount, onInterviewsRoute, onSignOut,
}: DesktopSidebarProps) {
  const { t } = useLanguage()
  const router = useRouter()

  return (
    <aside
      className="hidden md:flex md:flex-col md:flex-shrink-0 md:sticky md:top-0 md:h-screen text-white"
      style={{ width: 180, background: 'var(--color-steward-chrome)' }}
      aria-label="Sidebar"
    >
      <div className="px-4 pt-5 pb-5 flex items-center gap-2.5">
        <StewardLogo size={28} />
        <div className="text-lg font-bold tracking-tight leading-none">Steward</div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto" aria-label="Primary">
        <SideButton
          icon={ClipboardList}
          label={t('tab.work')}
          active={activeTab === 'work' && !onInterviewsRoute}
          onClick={() => { if (onInterviewsRoute) router.push('/'); onTabChange('work') }}
        />
        <SideButton
          icon={BookOpen}
          label={t('tab.reflect')}
          active={activeTab === 'reflect' && !onInterviewsRoute}
          onClick={() => { if (onInterviewsRoute) router.push('/'); onTabChange('reflect') }}
        />
        <SideButton
          icon={StickyNote}
          label={t('tab.notes')}
          active={activeTab === 'notes' && !onInterviewsRoute}
          onClick={() => { if (onInterviewsRoute) router.push('/'); onTabChange('notes') }}
        />
        {canManageInterviews && (
          <SideButton
            icon={Users}
            label={t('menu.interviews')}
            active={onInterviewsRoute}
            badge={overdueCount > 0 ? overdueCount : undefined}
            badgeVariant="danger"
            onClick={() => router.push('/interviews')}
          />
        )}
      </nav>

      <div className="px-2 pb-4 mt-2 space-y-0.5 border-t border-white/10 pt-3">
        {isAdmin && (
          <SideButton
            icon={Settings}
            label={t('menu.admin')}
            onClick={() => router.push('/admin')}
          />
        )}
        <SideButton
          icon={BookOpen}
          label={t('menu.userGuide')}
          onClick={() => router.push('/guide')}
        />
        <SideButton
          icon={Sparkles}
          label={t('menu.releaseNotes')}
          onClick={() => router.push('/release-notes')}
        />
        <SideButton
          icon={LogOut}
          label={t('menu.signOut')}
          onClick={onSignOut}
        />
      </div>
    </aside>
  )
}

interface SideButtonProps {
  icon: React.ElementType
  label: string
  active?: boolean
  badge?: number
  badgeVariant?: 'danger' | 'default'
  onClick: () => void
}

function SideButton({ icon: Icon, label, active, badge, badgeVariant = 'default', onClick }: SideButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 text-[12px] font-semibold px-2.5 py-2 rounded-md text-left transition-colors ${
        active
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full ${
            badgeVariant === 'danger'
              ? 'bg-red-500 text-white'
              : 'bg-white/20 text-white'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
