'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShareableUser, SharedTaskMember } from '@/lib/types'

/**
 * Everyone the signed-in leader can share a task with — every other approved
 * Steward user. Comes from the steward_shareable_users RPC because
 * steward_user_profiles is readable self-or-admin only.
 */
export function useShareableUsers(enabled: boolean) {
  const [users, setUsers] = useState<ShareableUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    supabase.rpc('steward_shareable_users').then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setUsers((data ?? []) as ShareableUser[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [enabled])

  return { users, loading, error }
}

export function displayName(u: ShareableUser): string {
  return u.full_name?.trim() || u.email || 'Unnamed'
}

export interface SharedTaskInfo {
  /** Participants, in the order the RPC returned them. */
  members: SharedTaskMember[]
  /** Everyone except the signed-in user, as display names. */
  otherNames: string[]
}

/**
 * Membership of every shared task the signed-in leader participates in, keyed
 * by shared_task_id, plus a user-id → name map used to render "Done by …".
 */
export function useSharedTasks(userId: string | undefined, enabled: boolean) {
  const [rows, setRows] = useState<SharedTaskMember[]>([])

  const load = useCallback(async () => {
    if (!enabled || !userId) { setRows([]); return }
    const { data, error } = await supabase.rpc('steward_my_shared_tasks')
    if (error) {
      console.warn('[sharing] steward_my_shared_tasks:', error.message)
      return
    }
    setRows((data ?? []) as SharedTaskMember[])
  }, [enabled, userId])

  useEffect(() => { load() }, [load])

  const sharedTasks = useMemo(() => {
    const map = new Map<string, SharedTaskInfo>()
    for (const r of rows) {
      const info = map.get(r.shared_task_id) ?? { members: [], otherNames: [] }
      info.members.push(r)
      if (r.member_id !== userId) info.otherNames.push(r.member_name)
      map.set(r.shared_task_id, info)
    }
    return map
  }, [rows, userId])

  const memberNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) map.set(r.member_id, r.member_name)
    return map
  }, [rows])

  return { sharedTasks, memberNames, refreshSharing: load }
}

/**
 * Set the exact list of people a task is shared with. An empty list unshares
 * it — every participant keeps their own copy and their own history.
 * Returns the shared_task_id, or null when unshared.
 */
export async function setBehaviorSharing(
  behaviorId: string,
  userIds: string[],
): Promise<{ sharedTaskId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('steward_set_behavior_sharing', {
    p_behavior_id: behaviorId,
    p_user_ids: userIds,
  })
  if (error) return { sharedTaskId: null, error: error.message }
  return { sharedTaskId: (data as string | null) ?? null, error: null }
}
