'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Archive, ArrowUpDown } from 'lucide-react'
import BehaviorRow from './BehaviorRow'
import { useScreenSize } from '@/lib/hooks/useScreenSize'
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

function getVisibleCount(frequency: string, isDesktop: boolean): number {
  if (frequency === 'weekly') return isDesktop ? 8 : 4
  if (frequency === 'monthly') return isDesktop ? 12 : 6
  return isDesktop ? 8 : 4 // quarterly
}

export default function CategorySection({
  category, behaviors, archivedBehaviors, entries, comments, complianceMap,
  onCellTap, onCellLongPress, onAddBehavior, onEditBehavior, onEditCategory, onRefresh,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [localOrder, setLocalOrder] = useState<Behavior[] | null>(null)
  const { isDesktop } = useScreenSize()

  // Use local order while reordering, otherwise use prop
  const displayBehaviors = localOrder ?? behaviors

  function handleStartReorder() {
    if (reorderMode) {
      // Exiting reorder mode — save to DB
      if (localOrder) {
        localOrder.forEach((beh, i) => {
          supabase.from('lsw_behaviors').update({ sort_order: i }).eq('id', beh.id)
        })
        onRefresh()
      }
      setLocalOrder(null)
      setReorderMode(false)
    } else {
      setLocalOrder([...behaviors])
      setReorderMode(true)
    }
  }

  function handleMove(index: number, direction: -1 | 1) {
    if (!localOrder) return
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= localOrder.length) return
    const next = [...localOrder]
    const temp = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = temp
    setLocalOrder(next)
  }

  return (
    <div className="mb-2">
      {/* Category header */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200 px-3 py-2 md:py-3">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1 flex-1 min-w-0">
          {collapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          <span className="text-sm md:text-base font-semibold text-gray-700 truncate">{category.name}</span>
          <span className="text-xs text-gray-400 ml-1">({behaviors.length})</span>
        </button>
        <button
          onClick={handleStartReorder}
          className={`p-1 mr-1 rounded ${reorderMode ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
          title={reorderMode ? 'Save order' : 'Reorder behaviors'}
        >
          {reorderMode ? <span className="text-[10px] font-bold">Done</span> : <ArrowUpDown size={14} />}
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
            <div className="sticky left-0 z-10 bg-white w-9 md:w-11 min-w-[2.25rem] md:min-w-[2.75rem] border-r border-gray-100" />
            <div className="sticky left-9 md:left-11 z-10 bg-white min-w-[100px] max-w-[100px] md:min-w-[200px] md:max-w-[200px] lg:min-w-[280px] lg:max-w-[280px] border-r border-gray-100 px-2 md:px-3 py-1">
              <span className="text-[9px] md:text-xs text-gray-400 font-medium">TASK</span>
            </div>
            <div className="sticky left-[136px] md:left-[244px] lg:left-[324px] z-10 bg-white w-16 md:w-20 min-w-[4rem] md:min-w-[5rem] border-r border-gray-100 px-1.5 md:px-2 py-1">
              <span className="text-[9px] md:text-xs text-gray-400 font-medium">FREQ</span>
            </div>
            <div className="sticky left-[200px] md:left-[324px] lg:left-[404px] z-10 bg-white w-10 md:w-14 min-w-[2.5rem] md:min-w-[3.5rem] border-r border-gray-100 flex items-center justify-center py-1">
              <span className="text-[9px] md:text-xs text-gray-400 font-medium">12W%</span>
            </div>
            <div className="px-1 md:px-2 py-1">
              <span className="text-[9px] md:text-xs text-gray-400 font-medium">OCCURRENCES</span>
            </div>
          </div>

          {/* Active behavior rows */}
          {displayBehaviors.map((behavior, index) => (
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
              isLast={index === displayBehaviors.length - 1}
              visibleCount={getVisibleCount(behavior.frequency, isDesktop)}
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
                      visibleCount={getVisibleCount(behavior.frequency, isDesktop)}
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
