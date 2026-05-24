"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";

// Suite-role management moved into the standalone Gather app. This redirect
// preserves old bookmarks; the nav link in AppShell points straight there.
const CANONICAL_URL = "https://gathered-admin-neon.vercel.app/gather";

export default function StewardRolesRedirectPage() {
  useEffect(() => {
    window.location.replace(CANONICAL_URL);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-lg font-bold text-gray-900">Redirecting to Gather…</h1>
        <p className="text-sm text-gray-600">
          Suite role assignment now lives in the unified Gather page (per-user
          Edit panel) alongside app access and admin powers.
        </p>
        <a
          href={CANONICAL_URL}
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Open Gather ↗
        </a>
      </div>
    </div>
  );
}
