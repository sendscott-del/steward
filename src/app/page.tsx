'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTemplateSync } from '@/lib/hooks/useTemplateSync'
import { useLswData, calculateCompletion } from '@/lib/hooks/useLswData'
import { getWeekStart, getWeekDates, nextWeek, prevWeek, formatDate } from '@/lib/dates'
import AppShell from '@/components/AppShell'
import type { TabId } from '@/components/AppShell'
import WeekNavigation from '@/components/WeekNavigation'
import CompletionBar from '@/components/CompletionBar'
import CategorySection from '@/components/CategorySection'
import NotesTab from '@/components/NotesTab'
import ReflectionLog from '@/components/ReflectionLog'
import CellDetailModal from '@/components/CellDetailModal'
import AddCategoryModal from '@/components/AddCategoryModal'
import AddBehaviorModal from '@/components/AddBehaviorModal'
import EditBehaviorModal from '@/components/EditBehaviorModal'
import EditCategoryModal from '@/components/EditCategoryModal'
import { cycleValue } from '@/components/BehaviorRow'
import type { EntryValue } from '@/lib/types'

export default function HomePage() {
  const { user } = useAuth()
  useTemplateSync(user?.id)
  const [activeTab, setActiveTab] = useState<TabId>('work')

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  // Data
  const { categories, behaviors, archivedBehaviors, entries, comments, complianceMap, loading, refresh, upsertEntry, upsertComment } =
    useLswData(user?.id, weekDates)

  // Modal state
  const [cellDetailModal, setCellDetailModal] = useState<{
    behaviorId: string; behaviorName: string; date: string
  } | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [addBehaviorCategoryId, setAddBehaviorCategoryId] = useState<string | null>(null)
  const [editBehaviorId, setEditBehaviorId] = useState<string | null>(null)
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)

  // Weekly completion %
  const completionPercentage = useMemo(
    () => calculateCompletion(behaviors, entries, weekDates),
    [behaviors, entries, weekDates]
  )

  const handleCellTap = useCallback(
    (behaviorId: string, date: string, currentValue: EntryValue | null) => {
      upsertEntry(behaviorId, date, cycleValue(currentValue))
    },
    [upsertEntry]
  )

  const handleCellLongPress = useCallback(
    (behaviorId: string, date: string) => {
      const allBeh = [...behaviors, ...archivedBehaviors]
      const behavior = allBeh.find(b => b.id === behaviorId)
      if (behavior) setCellDetailModal({ behaviorId, behaviorName: behavior.name, date })
    },
    [behaviors, archivedBehaviors]
  )

  const handleCellDetailSave = useCallback(
    async (value: EntryValue | null, comment: string) => {
      if (!cellDetailModal) return
      const { behaviorId, date } = cellDetailModal
      const key = `${behaviorId}_${date}`
      const currentEntry = entries.get(key)
      if (value !== (currentEntry?.value ?? null)) await upsertEntry(behaviorId, date, value)
      await upsertComment(behaviorId, date, comment)
      setCellDetailModal(null)
    },
    [cellDetailModal, entries, upsertEntry, upsertComment]
  )

  // Group behaviors by category
  const behaviorsByCategory = useMemo(() => {
    const map = new Map<string, typeof behaviors>()
    for (const cat of categories) map.set(cat.id, [])
    for (const beh of behaviors) { const list = map.get(beh.category_id); if (list) list.push(beh) }
    return map
  }, [categories, behaviors])

  const archivedByCategory = useMemo(() => {
    const map = new Map<string, typeof archivedBehaviors>()
    for (const cat of categories) map.set(cat.id, [])
    for (const beh of archivedBehaviors) { const list = map.get(beh.category_id); if (list) list.push(beh) }
    return map
  }, [categories, archivedBehaviors])

  const allBehaviors = useMemo(() => [...behaviors, ...archivedBehaviors], [behaviors, archivedBehaviors])
  const editBehavior = editBehaviorId ? allBehaviors.find(b => b.id === editBehaviorId) : null
  const editCategory = editCategoryId ? categories.find(c => c.id === editCategoryId) : null
  const addBehaviorCategory = addBehaviorCategoryId ? categories.find(c => c.id === addBehaviorCategoryId) : null

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'work' && (
        <div>
          <WeekNavigation
            weekStart={weekStart}
            weekDates={weekDates}
            onPrevWeek={() => setWeekStart(prev => prevWeek(prev))}
            onNextWeek={() => setWeekStart(prev => nextWeek(prev))}
            onToday={() => setWeekStart(getWeekStart(new Date()))}
          />

          <CompletionBar percentage={completionPercentage} />

          {loading ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              {categories.map(category => (
                <CategorySection
                  key={category.id}
                  category={category}
                  behaviors={behaviorsByCategory.get(category.id) ?? []}
                  archivedBehaviors={archivedByCategory.get(category.id) ?? []}
                  weekDates={weekDates}
                  entries={entries}
                  comments={comments}
                  complianceMap={complianceMap}
                  onCellTap={handleCellTap}
                  onCellLongPress={handleCellLongPress}
                  onAddBehavior={catId => setAddBehaviorCategoryId(catId)}
                  onEditBehavior={behId => setEditBehaviorId(behId)}
                  onEditCategory={catId => setEditCategoryId(catId)}
                />
              ))}

              {categories.length === 0 && (
                <div className="text-center py-16 px-4">
                  <p className="text-gray-500 text-sm mb-4">No categories yet. Add your first category to start tracking.</p>
                </div>
              )}

              <div className="px-4 py-4">
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                  <Plus size={16} />
                  Add Category
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'reflect' && user && <ReflectionLog userId={user.id} />}
      {activeTab === 'notes' && user && <NotesTab userId={user.id} />}

      {/* Modals */}
      {cellDetailModal && (
        <CellDetailModal
          behaviorName={cellDetailModal.behaviorName}
          date={cellDetailModal.date}
          currentValue={entries.get(`${cellDetailModal.behaviorId}_${cellDetailModal.date}`)?.value ?? null}
          currentComment={comments.get(`${cellDetailModal.behaviorId}_${cellDetailModal.date}`)?.comment ?? ''}
          onSave={handleCellDetailSave}
          onClose={() => setCellDetailModal(null)}
        />
      )}
      {showAddCategory && user && (
        <AddCategoryModal userId={user.id} existingCount={categories.length} onSuccess={refresh} onClose={() => setShowAddCategory(false)} />
      )}
      {addBehaviorCategory && user && (
        <AddBehaviorModal userId={user.id} categoryId={addBehaviorCategory.id} categoryName={addBehaviorCategory.name} existingCount={behaviorsByCategory.get(addBehaviorCategory.id)?.length ?? 0} onSuccess={refresh} onClose={() => setAddBehaviorCategoryId(null)} />
      )}
      {editBehavior && (
        <EditBehaviorModal behavior={editBehavior} onSuccess={refresh} onClose={() => setEditBehaviorId(null)} />
      )}
      {editCategory && (
        <EditCategoryModal category={editCategory} onSuccess={refresh} onClose={() => setEditCategoryId(null)} />
      )}
    </AppShell>
  )
}
