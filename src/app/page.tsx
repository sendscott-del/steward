'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Save } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useStewardData } from '@/lib/hooks/useStewardData'
import { getWeekStart, formatDate } from '@/lib/dates'
import { addWeeks, subWeeks, addMonths, subMonths, format } from 'date-fns'
import AppShell from '@/components/AppShell'
import type { TabId } from '@/components/AppShell'
import PeriodChecklist, { cycleValue } from '@/components/PeriodChecklist'
import NotesTab from '@/components/NotesTab'
import ReflectionLog from '@/components/ReflectionLog'
import CellDetailModal from '@/components/CellDetailModal'
import AddCategoryModal from '@/components/AddCategoryModal'
import AddBehaviorModal from '@/components/AddBehaviorModal'
import EditBehaviorModal from '@/components/EditBehaviorModal'
import EditCategoryModal from '@/components/EditCategoryModal'
import CallingPicker from '@/components/CallingPicker'
import SaveAsTemplateModal from '@/components/SaveAsTemplateModal'
import NewUserSetup from '@/components/NewUserSetup'
import PendingApproval from '@/components/PendingApproval'
import PickCalling from '@/components/PickCalling'
import type { EntryValue } from '@/lib/types'

export default function HomePage() {
  const { user, isAdmin, userStatus, statusLoading, needsTemplate, signOut, refreshStatus } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('work')
  const [showCallingPicker, setShowCallingPicker] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)

  const { categories, behaviors, archivedBehaviors, entries, comments, complianceMap, loading, refresh, upsertEntry, upsertComment } =
    useStewardData(user?.id)

  // Period navigation offsets
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [quarterOffset, setQuarterOffset] = useState(0)

  // Current period dates
  const now = useMemo(() => new Date(), [])

  const weekDate = useMemo(() => {
    const base = getWeekStart(now)
    return weekOffset === 0 ? base : addWeeks(base, weekOffset)
  }, [now, weekOffset])

  const monthDate = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth(), 1)
    return monthOffset === 0 ? base : addMonths(base, monthOffset)
  }, [now, monthOffset])

  const quarterDate = useMemo(() => {
    const currentQ = Math.floor(now.getMonth() / 3)
    const base = new Date(now.getFullYear(), currentQ * 3, 1)
    return quarterOffset === 0 ? base : addMonths(base, quarterOffset * 3)
  }, [now, quarterOffset])

  // Period labels
  const weekLabel = `Week of ${format(weekDate, 'MMM d, yyyy')}`
  const monthLabel = format(monthDate, 'MMMM yyyy')
  const qNum = Math.floor(monthDate.getMonth() / 3) + 1
  const quarterLabel = `Q${Math.floor(quarterDate.getMonth() / 3) + 1} ${format(quarterDate, 'yyyy')}`

  // Filter behaviors by frequency
  const weeklyBehaviors = useMemo(() => behaviors.filter(b => b.frequency === 'weekly'), [behaviors])
  const monthlyBehaviors = useMemo(() => behaviors.filter(b => b.frequency === 'monthly'), [behaviors])
  const quarterlyBehaviors = useMemo(() => behaviors.filter(b => b.frequency === 'quarterly'), [behaviors])

  // Categories that have any active behavior — used by PeriodChecklist to
  // suppress the "Add a behavior" placeholder for categories that are
  // actually populated in a different frequency section.
  const populatedCategoryIds = useMemo(
    () => new Set(behaviors.filter(b => !b.is_archived).map(b => b.category_id)),
    [behaviors]
  )

  // Modal state
  const [cellDetailModal, setCellDetailModal] = useState<{
    behaviorId: string; behaviorName: string; date: string
  } | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [addBehaviorCategoryId, setAddBehaviorCategoryId] = useState<string | null>(null)
  const [editBehaviorId, setEditBehaviorId] = useState<string | null>(null)
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)

  const handleToggle = useCallback(
    (behaviorId: string, date: string, currentValue: EntryValue | null) => {
      upsertEntry(behaviorId, date, cycleValue(currentValue))
    },
    [upsertEntry]
  )

  const handleComment = useCallback(
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

  const allBehaviors = useMemo(() => [...behaviors, ...archivedBehaviors], [behaviors, archivedBehaviors])
  const editBehavior = editBehaviorId ? allBehaviors.find(b => b.id === editBehaviorId) : null
  const editCategory = editCategoryId ? categories.find(c => c.id === editCategoryId) : null
  const addBehaviorCategory = addBehaviorCategoryId ? categories.find(c => c.id === addBehaviorCategoryId) : null

  // New user — needs to pick a calling and wait for approval
  if (!isAdmin && userStatus === 'new' && user) {
    return (
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        <NewUserSetup
          userId={user.id}
          userEmail={user.email ?? ''}
          onSubmitted={refreshStatus}
        />
      </AppShell>
    )
  }

  // Pending approval (legacy self-signup flow — Gather-granted users skip this
  // because the trigger sets status='approved' directly)
  if (!isAdmin && userStatus === 'pending') {
    return <PendingApproval onRefresh={refreshStatus} onSignOut={signOut} />
  }

  // Approved via Gather but no calling picked yet — self-serve picker
  if (needsTemplate && user) {
    return (
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        <PickCalling
          userId={user.id}
          userEmail={user.email ?? ''}
          defaultName={(user.user_metadata?.full_name as string | undefined) ?? null}
          onDone={refreshStatus}
        />
      </AppShell>
    )
  }

  // Rejected
  if (!isAdmin && userStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-4">Your access request was not approved. Please contact your stake president.</p>
          <button onClick={signOut} className="text-sm text-blue-600 hover:underline">Sign Out</button>
        </div>
      </div>
    )
  }

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'work' && (
        <div className="pb-4 max-w-7xl mx-auto lg:px-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              {/* Period sections: stacked on phone/tablet, side-by-side on desktop.
                  Quarterly interviews appear here in the Quarterly section as
                  personal behaviors from the Stake President / Counselor template.
                  Three columns on lg+ so Week | Month | Quarter sit together
                  instead of Quarter dropping to a second row with an empty gap. */}
              <div className="lg:grid lg:grid-cols-3 lg:gap-4 lg:mt-3 lg:items-start [&>*]:lg:bg-white [&>*]:lg:border [&>*]:lg:border-gray-200 [&>*]:lg:rounded-lg [&>*]:lg:overflow-hidden [&>*]:lg:mb-0">
                {/* Weekly section */}
                {weeklyBehaviors.length > 0 && (
                  <PeriodChecklist
                    title="This Week"
                    periodDate={weekDate}
                    periodLabel={weekLabel}
                    periodOffset={weekOffset}
                    frequency="weekly"
                    categories={categories}
                    behaviors={weeklyBehaviors}
                    entries={entries}
                    comments={comments}
                    complianceMap={complianceMap}
                    populatedCategoryIds={populatedCategoryIds}
                    onToggle={handleToggle}
                    onComment={handleComment}
                    onEditBehavior={behId => setEditBehaviorId(behId)}
                    onEditCategory={catId => setEditCategoryId(catId)}
                    onAddBehavior={catId => setAddBehaviorCategoryId(catId)}
                    onPrev={() => setWeekOffset(o => o - 1)}
                    onNext={() => setWeekOffset(o => o + 1)}
                    onToday={() => setWeekOffset(0)}
                  />
                )}

                {/* Monthly section */}
                {monthlyBehaviors.length > 0 && (
                  <PeriodChecklist
                    title="This Month"
                    periodDate={monthDate}
                    periodLabel={monthLabel}
                    periodOffset={monthOffset}
                    frequency="monthly"
                    categories={categories}
                    behaviors={monthlyBehaviors}
                    entries={entries}
                    comments={comments}
                    complianceMap={complianceMap}
                    populatedCategoryIds={populatedCategoryIds}
                    onToggle={handleToggle}
                    onComment={handleComment}
                    onEditBehavior={behId => setEditBehaviorId(behId)}
                    onEditCategory={catId => setEditCategoryId(catId)}
                    onAddBehavior={catId => setAddBehaviorCategoryId(catId)}
                    onPrev={() => setMonthOffset(o => o - 1)}
                    onNext={() => setMonthOffset(o => o + 1)}
                    onToday={() => setMonthOffset(0)}
                  />
                )}

                {/* Quarterly section */}
                {quarterlyBehaviors.length > 0 && (
                  <PeriodChecklist
                    title="This Quarter"
                    periodDate={quarterDate}
                    periodLabel={quarterLabel}
                    periodOffset={quarterOffset}
                    frequency="quarterly"
                    categories={categories}
                    behaviors={quarterlyBehaviors}
                    entries={entries}
                    comments={comments}
                    complianceMap={complianceMap}
                    populatedCategoryIds={populatedCategoryIds}
                    onToggle={handleToggle}
                    onComment={handleComment}
                    onEditBehavior={behId => setEditBehaviorId(behId)}
                    onEditCategory={catId => setEditCategoryId(catId)}
                    onAddBehavior={catId => setAddBehaviorCategoryId(catId)}
                    onPrev={() => setQuarterOffset(o => o - 1)}
                    onNext={() => setQuarterOffset(o => o + 1)}
                    onToday={() => setQuarterOffset(0)}
                  />
                )}
              </div>

              {/* Empty state — show calling picker */}
              {categories.length === 0 && !showCallingPicker && (
                <CallingPicker userId={user!.id} hasExistingData={false} onApplied={refresh} />
              )}

              {/* Show calling picker when changing */}
              {showCallingPicker && (
                <CallingPicker
                  userId={user!.id}
                  hasExistingData={categories.length > 0}
                  onApplied={() => { setShowCallingPicker(false); refresh() }}
                  onCancel={() => setShowCallingPicker(false)}
                />
              )}

              {categories.length > 0 && !showCallingPicker && (
                <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
                  >
                    <Plus size={16} />
                    Add Category
                  </button>
                  <button
                    onClick={() => setShowSaveTemplate(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-100"
                  >
                    <Save size={14} />
                    Save as Template
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'reflect' && user && (
        <div className="max-w-3xl mx-auto">
          <ReflectionLog userId={user.id} />
        </div>
      )}
      {activeTab === 'notes' && user && (
        <div className="max-w-3xl mx-auto">
          <NotesTab userId={user.id} />
        </div>
      )}

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
        <AddBehaviorModal userId={user.id} categoryId={addBehaviorCategory.id} categoryName={addBehaviorCategory.name} existingCount={behaviors.filter(b => b.category_id === addBehaviorCategory.id).length} onSuccess={refresh} onClose={() => setAddBehaviorCategoryId(null)} />
      )}
      {editBehavior && (
        <EditBehaviorModal behavior={editBehavior} onSuccess={refresh} onClose={() => setEditBehaviorId(null)} />
      )}
      {editCategory && (
        <EditCategoryModal category={editCategory} onSuccess={refresh} onClose={() => setEditCategoryId(null)} />
      )}
      {showSaveTemplate && user && (
        <SaveAsTemplateModal
          userId={user.id}
          categories={categories}
          behaviors={behaviors}
          onSaved={() => setShowSaveTemplate(false)}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
    </AppShell>
  )
}
