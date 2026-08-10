'use client'

import { Users } from 'lucide-react'
import { useShareableUsers, displayName } from '@/lib/hooks/useSharing'
import { STAKE_ROLE_LABELS } from '@/lib/types'

interface ShareWithPickerProps {
  /** Currently selected user ids (not including the signed-in leader). */
  selected: string[]
  onChange: (userIds: string[]) => void
  disabled?: boolean
}

/**
 * Multi-select for "who else does this task count for". Used by the Add and
 * Edit Behavior modals. Selecting people makes the task shared: whoever marks
 * it done marks it done for everyone on the list.
 */
export default function ShareWithPicker({ selected, onChange, disabled }: ShareWithPickerProps) {
  const { users, loading, error } = useShareableUsers(true)

  function toggle(id: string) {
    if (disabled) return
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} className="text-gray-400" />
          Shared with <span className="text-gray-400 font-normal">(optional)</span>
        </span>
      </label>

      {loading && <p className="text-xs text-gray-400 py-2">Loading people…</p>}

      {error && (
        <p className="text-xs text-red-600 py-2">Could not load people to share with: {error}</p>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="text-xs text-gray-400 py-2">
          No one else has a Steward account yet, so there is no one to share with.
        </p>
      )}

      {users.length > 0 && (
        <>
          <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {users.map(u => {
              const checked = selected.includes(u.id)
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer ${
                    checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(u.id)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-800 truncate">{displayName(u)}</span>
                    {u.stake_role && (
                      <span className="block text-[11px] text-gray-500">
                        {STAKE_ROLE_LABELS[u.stake_role]}
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {selected.length === 0
              ? 'Just you. Pick people to share this task — whoever does it marks it done for everyone.'
              : `Shared with ${selected.length} ${selected.length === 1 ? 'person' : 'people'}. Whoever does it marks it done for everyone, and the grid shows who.`}
          </p>
        </>
      )}
    </div>
  )
}
