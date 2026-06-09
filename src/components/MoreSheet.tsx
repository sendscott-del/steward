'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Settings, ExternalLink, FlaskConical, Lightbulb,
  BookOpen, Sparkles, LogOut, ChevronRight,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useDemoMode } from '@/lib/demoMode'

interface Props {
  open: boolean
  onClose: () => void
  onSuggestEnhancement: () => void
  onSignOut: () => void
  isAdmin: boolean
  canManageInterviews: boolean
  overdueCount?: number
}

export default function MoreSheet({
  open, onClose, onSuggestEnhancement, onSignOut,
  isAdmin, canManageInterviews, overdueCount = 0,
}: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const { demoMode, setDemoMode } = useDemoMode()

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl px-3 pt-2"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto w-9 h-1 bg-gray-300 rounded-full mt-1 mb-2" aria-hidden />

        {canManageInterviews && (
          <Group title={t('more.stewardship')}>
            <Row
              icon={Users}
              name={t('menu.interviews')}
              meta={overdueCount > 0 ? `${overdueCount} ${t('more.overdue')}` : undefined}
              danger={overdueCount > 0}
              onClick={() => { onClose(); router.push('/interviews') }}
            />
          </Group>
        )}

        <Group title={t('more.workspace')}>
          {isAdmin && (
            <Row
              icon={Settings}
              name={t('menu.admin')}
              onClick={() => { onClose(); router.push('/admin') }}
            />
          )}
          {isAdmin && (
            <Row
              icon={ExternalLink}
              name={t('menu.gatherAccess')}
              meta={t('more.opensInNewTab')}
              onClick={() => {
                onClose()
                window.open('https://gather.gatheredin.app/gather', '_blank', 'noopener,noreferrer')
              }}
            />
          )}
          <Row
            icon={FlaskConical}
            name={t('menu.demoMode')}
            meta={demoMode ? 'On' : 'Off'}
            onClick={() => { setDemoMode(!demoMode); onClose() }}
          />
        </Group>

        <Group title={t('more.help')}>
          <Row
            icon={Lightbulb}
            name={t('more.suggest')}
            onClick={() => { onClose(); onSuggestEnhancement() }}
          />
          <Row
            icon={BookOpen}
            name={t('menu.userGuide')}
            onClick={() => { onClose(); router.push('/guide') }}
          />
          <Row
            icon={Sparkles}
            name={t('menu.releaseNotes')}
            onClick={() => { onClose(); router.push('/release-notes') }}
          />
        </Group>

        <Row
          muted
          icon={LogOut}
          name={t('menu.signOut')}
          onClick={() => { onClose(); onSignOut() }}
        />
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <h4 className="px-2 pt-2 pb-1 text-[11px] font-extrabold tracking-wider text-gray-500 uppercase">
        {title}
      </h4>
      <div>{children}</div>
    </div>
  )
}

interface RowProps {
  icon: React.ElementType
  name: string
  meta?: string
  danger?: boolean
  muted?: boolean
  onClick: () => void
}

function Row({ icon: Icon, name, meta, danger, muted, onClick }: RowProps) {
  const iconWrap = muted
    ? 'bg-gray-100 text-gray-500'
    : danger
      ? 'bg-red-50 text-red-600'
      : 'bg-blue-50 text-steward-primary-dark'
  const nameClr = muted ? 'text-gray-500' : 'text-gray-900'
  const metaClr = danger ? 'text-red-600 font-semibold' : 'text-gray-500'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 py-3 min-h-[48px] rounded-lg active:bg-gray-100 transition-colors text-left ${
        danger ? 'border-l-2 border-red-500' : ''
      }`}
    >
      <span
        className={`shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center ${iconWrap}`}
        aria-hidden
      >
        <Icon size={18} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold ${nameClr}`}>{name}</span>
        {meta && <span className={`block text-[11px] mt-0.5 ${metaClr}`}>{meta}</span>}
      </span>
      <ChevronRight size={16} className="text-gray-400 shrink-0" aria-hidden />
    </button>
  )
}
