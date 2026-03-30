'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { ClipboardList, StickyNote, BookOpen, Menu, X } from 'lucide-react'

export type TabId = 'work' | 'reflect' | 'notes'

interface AppShellProps {
  children: React.ReactNode
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function AppShell({ children, activeTab, onTabChange }: AppShellProps) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Leader Standard Work</h1>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                <button
                  onClick={() => { router.push('/guide'); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  User Guide
                </button>
                <button
                  onClick={() => { router.push('/release-notes'); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Release Notes
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { signOut(); setShowMenu(false) }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  Sign Out
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
            activeTab === 'work' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <ClipboardList size={20} />
          <span className="mt-0.5">Work</span>
        </button>
        <button
          onClick={() => onTabChange('reflect')}
          className={`flex-1 flex flex-col items-center py-2 text-xs ${
            activeTab === 'reflect' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <BookOpen size={20} />
          <span className="mt-0.5">Reflect</span>
        </button>
        <button
          onClick={() => onTabChange('notes')}
          className={`flex-1 flex flex-col items-center py-2 text-xs ${
            activeTab === 'notes' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <StickyNote size={20} />
          <span className="mt-0.5">Notes</span>
        </button>
      </nav>
    </div>
  )
}
