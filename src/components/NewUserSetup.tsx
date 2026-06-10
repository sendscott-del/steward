'use client'

// RETIRED (v2.33.0, 2026-06-10): this self-serve request flow wrote
// steward_user_profiles with status='pending' but no approval UI existed
// anywhere — a dead end. User access is now requested automatically at signup
// (handle_new_user trigger -> gather_access_requests) and approved in Gather
// (https://gather.gatheredin.app/gather). No route renders this component;
// the file is kept for reference only.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Template } from '@/lib/types'

interface NewUserSetupProps {
  userId: string
  userEmail: string
  onSubmitted: () => void
}

export default function NewUserSetup({ userId, userEmail, onSubmitted }: NewUserSetupProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    supabase.from('steward_templates').select('*').order('name').then(({ data }) => {
      setTemplates((data ?? []) as Template[])
      setLoading(false)
    })
  }, [])

  async function handleSelect(template: Template) {
    if (!fullName.trim()) {
      alert('Please enter your name first.')
      return
    }
    setSubmitting(true)

    await supabase.from('steward_user_profiles').upsert({
      id: userId,
      full_name: fullName.trim(),
      email: userEmail,
      status: 'pending',
      selected_template_id: template.id,
      selected_template_name: template.name,
    }, { onConflict: 'id' })

    setSubmitting(false)
    onSubmitted()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading...</div>
  }

  return (
    <div className="px-4 py-8">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-gray-800">Welcome to Steward</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your name and select your calling. An admin will review and approve your access.
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Your Calling</label>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">No callings available yet. Please check back later.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  disabled={submitting || !fullName.trim()}
                  className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {submitting && (
          <p className="text-center text-sm text-gray-400">Submitting your request...</p>
        )}
      </div>
    </div>
  )
}
