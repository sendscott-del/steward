'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ClipboardList, StickyNote, BookOpen, Menu, X, Users } from 'lucide-react'
import AppSwitcher from './AppSwitcher'
import { StewardLogo } from './icons/StewardLogo'
import { DemoModeToggle } from './DemoModeBanner'

export type TabId = 'work' | 'reflect' | 'notes'

interface AppShellProps {
  children: React.ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function AppShell({ children, activeTab, onTabChange }: AppShellProps) {
  const { user, loading, isAdmin, canManageInterviews, signOut } = useAuth()
  const router = useRouter()
  const { t, lang, setLang } = useLanguage()
  const [showMenu, setShowMenu] = useState(false)

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

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <AppSwitcher />
      {/* Header. The 3px steward-primary stripe at the bottom is the
          per-app brand cue — it picks up the same blue used in the
          Gathered switcher's "S" chip so the brand identity follows
          you into the app instead of stopping at the chip. */}
      <header className="sticky top-0 z-30 bg-white border-b-[3px] border-steward-primary px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StewardLogo size={32} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{t('app.name')}</h1>
            <p className="text-[10px] italic text-gray-400 leading-tight truncate">&ldquo;{t('app.tagline')}&rdquo; <span className="not-italic">{t('app.taglineRef')}</span></p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label={showMenu ? t('common.close') : t('menu.language')}
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-56">
                {canManageInterviews && (
                  <>
                    <button
                      onClick={() => { router.push('/interviews'); setShowMenu(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-steward-primary font-medium hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Users size={14} /> Quarterly Interviews
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => { router.push('/admin'); setShowMenu(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-blue-600 font-medium hover:bg-blue-50"
                    >
                      {t('menu.admin')}
                    </button>
                    <button
                      onClick={() => { router.push('/admin/gather'); setShowMenu(false) }}
                      className="w-full px-4 py-2 text-left text-sm text-blue-600 font-medium hover:bg-blue-50"
                    >
                      Gather — User access
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <div onClick={() => setShowMenu(false)}>
                  <DemoModeToggle />
                </div>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { router.push('/guide'); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('menu.userGuide')}
                </button>
                <button
                  onClick={() => { router.push('/release-notes'); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('menu.releaseNotes')}
                </button>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-4 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">{t('menu.language')}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLang('en')}
                      className={`flex-1 py-1 text-xs rounded ${lang === 'en' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {t('menu.languageEnglish')}
                    </button>
                    <button
                      onClick={() => setLang('es')}
                      className={`flex-1 py-1 text-xs rounded ${lang === 'es' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {t('menu.languageSpanish')}
                    </button>
                  </div>
                </div>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { signOut(); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  {t('menu.signOut')}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
        <button
          onClick={() => onTabChange('work')}
          className={`flex-1 flex flex-col items-center py-2 text-xs ${
            activeTab === 'work' ? 'text-steward-primary' : 'text-gray-400'
          }`}
        >
          <ClipboardList size={20} />
          <span className="mt-0.5">{t('tab.work')}</span>
        </button>
        <button
          onClick={() => onTabChange('reflect')}
          className={`flex-1 flex flex-col items-center py-2 text-xs ${
            activeTab === 'reflect' ? 'text-steward-primary' : 'text-gray-400'
          }`}
        >
          <BookOpen size={20} />
          <span className="mt-0.5">{t('tab.reflect')}</span>
        </button>
        <button
          onClick={() => onTabChange('notes')}
          className={`flex-1 flex flex-col items-center py-2 text-xs ${
            activeTab === 'notes' ? 'text-steward-primary' : 'text-gray-400'
          }`}
        >
          <StickyNote size={20} />
          <span className="mt-0.5">{t('tab.notes')}</span>
        </button>
      </nav>
    </div>
  )
}
