'use client'

import { ClipboardList, BookOpen, StickyNote, MoreHorizontal } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { TabId } from './AppShell'

interface Props {
  activeTab: TabId
  onTabChange: (t: TabId) => void
  onMoreClick: () => void
  moreActive?: boolean
}

export default function MobileTabBar({ activeTab, onTabChange, onMoreClick, moreActive }: Props) {
  const { t } = useLanguage()
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 grid grid-cols-4 shadow-[0_-2px_12px_rgba(15,23,42,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <Tab
        icon={ClipboardList}
        label={t('tab.work')}
        active={activeTab === 'work' && !moreActive}
        onClick={() => onTabChange('work')}
      />
      <Tab
        icon={BookOpen}
        label={t('tab.reflect')}
        active={activeTab === 'reflect' && !moreActive}
        onClick={() => onTabChange('reflect')}
      />
      <Tab
        icon={StickyNote}
        label={t('tab.notes')}
        active={activeTab === 'notes' && !moreActive}
        onClick={() => onTabChange('notes')}
      />
      <Tab
        icon={MoreHorizontal}
        label={t('nav.more')}
        active={!!moreActive}
        onClick={onMoreClick}
      />
    </nav>
  )
}

interface TabProps {
  icon: React.ElementType
  label: string
  active?: boolean
  onClick: () => void
}

function Tab({ icon: Icon, label, active, onClick }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[10px] font-semibold ${
        active ? 'text-steward-primary-dark' : 'text-gray-400'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
      <span>{label}</span>
    </button>
  )
}
