'use client'

import { useRef, useCallback } from 'react'
import type { EntryValue } from '@/lib/types'

interface DayCellProps {
  value: EntryValue | null
  hasComment: boolean
  isToday: boolean
  isApplicable: boolean
  onTap: () => void
  onLongPress: () => void
}

const VALUE_STYLES: Record<string, string> = {
  y: 'bg-green-500 text-white',
  n: 'bg-red-500 text-white',
  na: 'bg-gray-300 text-white',
}

const VALUE_LABELS: Record<string, string> = {
  y: 'Y',
  n: 'N',
  na: 'NA',
}

export default function DayCell({ value, hasComment, isToday, isApplicable, onTap, onLongPress }: DayCellProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  const isTouchDevice = useRef(false)

  // Touch handlers (mobile)
  const handleTouchStart = useCallback(() => {
    isTouchDevice.current = true
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, 500)
  }, [onLongPress])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isLongPress.current) {
      onTap()
    }
  }, [onTap])

  const handleTouchMove = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  // Mouse handlers (desktop) — long-press with mouse
  const handleMouseDown = useCallback(() => {
    if (isTouchDevice.current) return // skip if touch already handled
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, 500)
  }, [onLongPress])

  const handleMouseUp = useCallback(() => {
    if (isTouchDevice.current) {
      isTouchDevice.current = false
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isLongPress.current) {
      onTap()
    }
  }, [onTap])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  if (!isApplicable) {
    return (
      <div className="cell-tap flex items-center justify-center w-10 h-10 md:w-12 md:h-12 min-w-[2.5rem] md:min-w-[3rem] rounded text-xs md:text-sm text-gray-300 bg-gray-50/50">
        —
      </div>
    )
  }

  const bgStyle = value ? VALUE_STYLES[value] : isToday ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'

  return (
    <div
      className={`cell-tap relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 min-w-[2.5rem] md:min-w-[3rem] rounded border text-xs md:text-sm font-bold select-none cursor-pointer ${bgStyle}`}
      // Touch (mobile)
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      // Mouse (desktop) — click handled via mousedown/mouseup, long-press = hold 500ms
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      // Right-click also opens comment
      onContextMenu={e => { e.preventDefault(); onLongPress() }}
    >
      {value && VALUE_LABELS[value]}
      {hasComment && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
    </div>
  )
}
