'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { CHANGELOG } from '@/constants/changelog'

export default function ReleaseNotesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/')} className="p-1 text-gray-500 hover:text-gray-700">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Release Notes</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {CHANGELOG.map(entry => (
          <div key={entry.version} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-900">v{entry.version}</span>
              <span className="text-xs text-gray-400">{entry.date}</span>
            </div>

            {entry.enhancements.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Enhancements
                </p>
                {entry.enhancements.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <span className="text-green-500 text-sm leading-5 shrink-0">+</span>
                    <span className="text-sm text-gray-700 leading-5">{item}</span>
                  </div>
                ))}
              </>
            )}

            {entry.bugFixes.length > 0 && (
              <div className={entry.enhancements.length > 0 ? 'mt-3' : ''}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  Bug Fixes
                </p>
                {entry.bugFixes.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <span className="text-red-500 text-sm leading-5 shrink-0">&bull;</span>
                    <span className="text-sm text-gray-700 leading-5">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <p className="text-center text-xs text-gray-400 py-4">
          Release notes are updated with each deployment.
        </p>
      </div>
    </div>
  )
}
