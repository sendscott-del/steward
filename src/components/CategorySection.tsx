'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Archive } from 'lucide-react'
import BehaviorRow from './BehaviorRow'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { formatDayHeader, isToday as checkIsToday } from '@/lib/dates'

interface CategorySectionProps {
  category: Category
  behaviors: Behavior[]
  archivedBehaviors: Behavior[]
  weekDates: Date[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  complianceMap: Map<string, number | null> // behaviorId -> 4-week %
  onCellTap: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onCellLongPress: (behaviorId: string, date: string) => void
  onAddBehavior: (categoryId: string) => void
  onEditBehavior: (behaviorId: string) => void
  onEditCategory: (categoryId: string) => void
}

export default function CategorySection({
  category, behaviors, archivedBehaviors, weekDates, entries, comments, complianceMap,
  onCellTap, onCellLongPress, onAddBehavior, onEditBehavior, onEditCategory,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  return (
    <div className="mb-2">
      {/* Category header */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200 px-3 py-2">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1 flex-1 min-w-0">
          {collapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700 truncate">{category.name}</span>
          <span className="text-xs text-gray-400 ml-1">({behaviors.length})</span>
        </button>
        <button onClick={() => onEditCategory(category.id)} className="p-1 text-gray-400 hover:text-gray-600 mr-1" title="Edit category">
          <Pencil size={14} />
        </button>
        <button onClick={() => onAddBehavior(category.id)} className="p-1 text-gray-400 hover:text-blue-600" title="Add behavior">
          <Plus size={16} />
        </button>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div className="flex items-stretch">
            {/* Edit col */}
            <div className="sticky left-0 z-10 bg-white w-9 min-w-[2.25rem] border-r border-gray-100" />
            {/* Task col */}
            <div className="sticky left-9 z-10 bg-white min-w-[100px] max-w-[100px] border-r border-gray-100 px-2 py-1">
              <span className="text-[9px] text-gray-400 font-medium">TASK</span>
            </div>
            {/* Freq col */}
            <div className="sticky left-[136px] z-10 bg-white w-24 min-w-[6rem] border-r border-gray-100 px-1.5 py-1">
              <span className="text-[9px] text-gray-400 font-medium">FREQUENCY</span>
            </div>
            {/* % col */}
            <div className="sticky left-[232px] z-10 bg-white w-10 min-w-[2.5rem] border-r border-gray-100 flex items-center justify-center py-1">
              <span className="text-[9px] text-gray-400 font-medium">4W%</span>
            </div>
            {/* Day headers */}
            <div className="flex items-center gap-1 px-1 py-1">
              {weekDates.map(date => {
                const { letter, number } = formatDayHeader(date)
                const today = checkIsToday(date)
                return (
                  <div
                    key={date.toISOString()}
                    className={`flex flex-col items-center justify-center w-10 min-w-[2.5rem] text-[10px] ${
                      today ? 'text-blue-600 font-bold' : 'text-gray-400'
                    }`}
                  >
                    <span>{letter}</span>
                    <span>{number}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Active behavior rows */}
          {behaviors.map(behavior => (
            <BehaviorRow
              key={behavior.id}
              behavior={behavior}
              weekDates={weekDates}
              entries={entries}
              comments={comments}
              compliancePercent={complianceMap.get(behavior.id) ?? null}
              onCellTap={onCellTap}
              onCellLongPress={onCellLongPress}
              onEditBehavior={onEditBehavior}
            />
          ))}

          {behaviors.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No behaviors yet.{' '}
              <button onClick={() => onAddBehavior(category.id)} className="text-blue-600 hover:underline">Add one</button>
            </div>
          )}

          {/* Archived toggle */}
          {archivedBehaviors.length > 0 && (
            <div className="px-3 py-2">
              <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <Archive size={12} />
                {showArchived ? 'Hide' : 'Show'} {archivedBehaviors.length} archived
              </button>
              {showArchived && (
                <div className="mt-1 opacity-60">
                  {archivedBehaviors.map(behavior => (
                    <BehaviorRow
                      key={behavior.id}
                      behavior={behavior}
                      weekDates={weekDates}
                      entries={entries}
                      comments={comments}
                      compliancePercent={null}
                      onCellTap={onCellTap}
                      onCellLongPress={onCellLongPress}
                      onEditBehavior={onEditBehavior}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
