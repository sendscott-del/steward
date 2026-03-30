'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { EntryValue } from '@/lib/types'

interface CellDetailModalProps {
  behaviorName: string
  date: string
  currentValue: EntryValue | null
  currentComment: string
  onSave: (value: EntryValue | null, comment: string) => void
  onClose: () => void
}

const VALUE_OPTIONS: { value: EntryValue | null; label: string; style: string }[] = [
  { value: null, label: 'Empty', style: 'bg-gray-100 text-gray-600' },
  { value: 'y', label: 'Yes', style: 'bg-green-500 text-white' },
  { value: 'n', label: 'No', style: 'bg-red-500 text-white' },
]

export default function CellDetailModal({
  behaviorName,
  date,
  currentValue,
  currentComment,
  onSave,
  onClose,
}: CellDetailModalProps) {
  const [value, setValue] = useState<EntryValue | null>(currentValue)
  const [comment, setComment] = useState(currentComment)

  useEffect(() => {
    setValue(currentValue)
    setComment(currentComment)
  }, [currentValue, currentComment])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{behaviorName}</h3>
            <p className="text-sm text-gray-500">{date}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Value selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">Status</label>
          <div className="flex gap-2">
            {VALUE_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => setValue(opt.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  value === opt.value
                    ? `${opt.style} ring-2 ring-offset-1 ring-blue-500`
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">Comment</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="What went well? What could improve? Why was this missed?"
          />
        </div>

        <button
          onClick={() => onSave(value, comment)}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  )
}
