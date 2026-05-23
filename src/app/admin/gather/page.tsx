'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'

// The Gather page is now hosted in Glean — one canonical place to manage
// user access across all five apps. This route stays as a redirect so old
// bookmarks and the previous in-app menu entry both still land somewhere
// useful. The menu link in AppShell now points to the canonical URL
// directly, so a click from inside Steward skips this hop.
const CANONICAL_URL = 'https://glean-blue.vercel.app/admin/gather'

export default function GatherRedirectPage() {
  useEffect(() => {
    window.location.replace(CANONICAL_URL)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-lg font-bold text-gray-900">Redirecting to Gather…</h1>
        <p className="text-sm text-gray-600">
          The Gather page now lives in Glean so there&rsquo;s one place to manage user
          access across every app.
        </p>
        <a
          href={CANONICAL_URL}
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Open Gather ↗
        </a>
      </div>
    </div>
  )
}
