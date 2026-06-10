'use client'

import { useState, useEffect } from 'react'
import { Clock, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PendingApprovalProps {
  onRefresh: () => void
  onSignOut: () => void
}

// What we learned from the shared Gather queue (gather_access_requests).
// RLS lets a signed-in user SELECT their own rows, so we can show whether
// the request was denied. Any query error degrades to 'unknown' and we keep
// the generic pending copy — never block on the enrichment.
type QueueStatus = 'pending' | 'approved' | 'denied' | 'unknown'

export default function PendingApproval({ onRefresh, onSignOut }: PendingApprovalProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>('unknown')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('gather_access_requests')
      .select('status')
      .eq('app_name', 'steward')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data || data.length === 0) {
          setQueueStatus('unknown')
          return
        }
        const s = data[0].status as string
        setQueueStatus(s === 'denied' ? 'denied' : s === 'approved' ? 'approved' : 'pending')
      })
    return () => { cancelled = true }
  }, [])

  const denied = queueStatus === 'denied'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center max-w-sm">
        <div className={`w-16 h-16 ${denied ? 'bg-red-50' : 'bg-amber-50'} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {denied
            ? <XCircle size={28} className="text-red-500" />
            : <Clock size={28} className="text-amber-500" />}
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          {denied ? 'Access Not Approved' : 'Request Pending'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {denied
            ? 'Your access request was not approved. Please contact your stake president.'
            : 'Your access request is pending — a stake leader will approve it in Gather.'}
        </p>
        <div className="space-y-2">
          {!denied && (
            <button
              onClick={onRefresh}
              className="w-full py-2.5 bg-steward-primary text-white rounded-lg text-sm font-medium hover:bg-steward-primary-dark"
            >
              Check Status
            </button>
          )}
          <button
            onClick={onSignOut}
            className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
