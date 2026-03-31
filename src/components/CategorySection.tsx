'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Archive, ArrowUpDown } from 'lucide-react'
import BehaviorRow from './BehaviorRow'
import type { Category, Behavior, Entry, CellComment, EntryValue } from '@/lib/types'
import { supabase } from '@/lib/supabase'

interface CategorySectionProps {
  category: Category
  behaviors: Behavior[]
  archivedBehaviors: Behavior[]
  entries: Map<string, Entry>
  comments: Map<string, CellComment>
  complianceMap: Map<string, number | null>
  onCellTap: (behaviorId: string, date: string, currentValue: EntryValue | null) => void
  onCellLongPress: (behaviorId: string, date: string) => void
  onAddBehavior: (categoryId: string) => void
  onEditBehavior: (behaviorId: string) => void
  onEditCategory: (categoryId: string) => void
  onRefresh: () => void
}

export default function CategorySection({
  category, behaviors, archivedBehaviors, entries, comments, complianceMap,
  onCellTap, onCellLongPress, onAddBehavior, onEditBehavior, onEditCategory, onRefresh,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)

  async function handleMove(index: number, direction: -1 | 1) {
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= behaviors.length) return

    const a = behaviors[index]
    const b = behaviors[swapIndex]

    await Promise.all([
      supabase.from('lsw_behaviors').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('lsw_behaviors').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    onRefresh()
  }

  return (
    <div className="mb-2">
      {/* Category header */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200 px-3 py-2">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1 flex-1 min-w-0">
          {collapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700 truncate">{category.name}</span>
          <span className="text-xs text-gray-400 ml-1">({behaviors.length})</span>
        </button>
        <button
          onClick={() => setReorderMode(!reorderMode)}
          className={`p-1 mr-1 rounded ${reorderMode ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
          title="Reorder behaviors"
        >
          <ArrowUpDown size={14} />
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
            <div className="sticky left-0 z-10 bg-white w-9 min-w-[2.25rem] border-r border-gray-100" />
            <div className="sticky left-9 z-10 bg-white min-w-[100px] max-w-[100px] border-r border-gray-100 px-2 py-1">
              <span className="text-[9px] text-gray-400 font-medium">TASK</span>
            </div>
            <div className="sticky left-[136px] z-10 bg-white w-16 min-w-[4rem] border-r border-gray-100 px-1.5 py-1">
              <span className="text-[9px] text-gray-400 font-medium">FREQ</span>
            </div>
            <div className="sticky left-[200px] z-10 bg-white w-10 min-w-[2.5rem] border-r border-gray-100 flex items-center justify-center py-1">
              <span className="text-[9px] text-gray-400 font-medium">12%</span>
            </div>
            <div className="px-1 py-1">
              <span className="text-[9px] text-gray-400 font-medium">OCCURRENCES</span>
            </div>
          </div>

          {/* Active behavior rows */}
          {behaviors.map((behavior, index) => (
            <BehaviorRow
              key={behavior.id}
              behavior={behavior}
              entries={entries}
              comments={comments}
              compliancePercent={complianceMap.get(behavior.id) ?? null}
              onCellTap={onCellTap}
              onCellLongPress={onCellLongPress}
              onEditBehavior={onEditBehavior}
              reorderMode={reorderMode}
              onMoveUp={() => handleMove(index, -1)}
              onMoveDown={() => handleMove(index, 1)}
              isFirst={index === 0}
              isLast={index === behaviors.length - 1}
            />
          ))}

          {behaviors.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No behaviors yet.{' '}
              <button onClick={() => onAddBehavior(category.id)} className="text-blue-600 hover:underline">Add one</button>
            </div>
          )}

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
                      entries={entries}
                      comments={comments}
                      compliancePercent={null}
                      onCellTap={onCellTap}
                      onCellLongPress={onCellLongPress}
                      onEditBehavior={onEditBehavior}
                      reorderMode={false}
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
