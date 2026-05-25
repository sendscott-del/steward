'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Save, Settings } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useStewardData } from '@/lib/hooks/useStewardData'
import { getWeekStart } from '@/lib/dates'
import { addWeeks, addMonths, format } from 'date-fns'
import AppShell from '@/components/AppShell'
import type { TabId } from '@/components/AppShell'
import PeriodChecklist, { cycleValue, AddOnHabits } from '@/components/PeriodChecklist'
import ComplianceStrip from '@/components/ComplianceStrip'
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
import type { Behavior, Category, EntryValue } from '@/lib/types'

// Categories whose name suggests "personal / family / add-on" habits. These
// get demoted from the calling-first default view into the collapsible
// "Add-on habits" disclosure at the bottom of the page. Matches the leader-
// standard-work model: the calling tasks are the marquee, personal practice
// is opt-in. Tested against EN + ES category names.
const ADD_ON_KEYWORDS = [
  'family', 'familia',
  'personal', 'personales', 'personal & family', 'personales y familia',
  'self', 'mí', 'mi mismo',
]
function isAddOnCategory(cat: Category): boolean {
  const n = cat.name.trim().toLowerCase()
  return ADD_ON_KEYWORDS.some(k => n === k || n.startsWith(`${k} `) || n.endsWith(` ${k}`))
}

export default function HomePage() {
  const {
    user, isAdmin, userStatus,
    needsTemplate, signOut, refreshStatus,
    selectedTemplateName, stakeRole,
  } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('work')
  const [showCallingPicker, setShowCallingPicker] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showManageBehaviors, setShowManageBehaviors] = useState(false)

  const {
    categories, behaviors, archivedBehaviors, entries, comments, complianceMap,
    loading, refresh, upsertEntry, upsertComment,
  } = useStewardData(user?.id)

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
  const quarterLabel = `Q${Math.floor(quarterDate.getMonth() / 3) + 1} ${format(quarterDate, 'yyyy')}`

  // Split categories into calling vs add-on. Behaviors inherit their category's
  // bucket. If the user has no add-on categories at all, every behavior is
  // treated as calling and the add-on disclosure stays hidden.
  const addOnCategoryIds = useMemo(
    () => new Set(categories.filter(isAddOnCategory).map(c => c.id)),
    [categories],
  )

  const callingBehaviors = useMemo(
    () => behaviors.filter(b => !addOnCategoryIds.has(b.category_id)),
    [behaviors, addOnCategoryIds],
  )
  const addOnBehaviors = useMemo(
    () => behaviors.filter(b => addOnCategoryIds.has(b.category_id)),
    [behaviors, addOnCategoryIds],
  )

  // Filter calling behaviors by frequency
  const weeklyCalling = useMemo(() => callingBehaviors.filter(b => b.frequency === 'weekly'), [callingBehaviors])
  const monthlyCalling = useMemo(() => callingBehaviors.filter(b => b.frequency === 'monthly'), [callingBehaviors])
  const quarterlyCalling = useMemo(() => callingBehaviors.filter(b => b.frequency === 'quarterly'), [callingBehaviors])

  // Filter add-on behaviors by frequency
  const weeklyAddOn = useMemo(() => addOnBehaviors.filter(b => b.frequency === 'weekly'), [addOnBehaviors])
  const monthlyAddOn = useMemo(() => addOnBehaviors.filter(b => b.frequency === 'monthly'), [addOnBehaviors])
  const quarterlyAddOn = useMemo(() => addOnBehaviors.filter(b => b.frequency === 'quarterly'), [addOnBehaviors])

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
    [upsertEntry],
  )

  const handleRowOpen = useCallback(
    (behaviorId: string, date: string) => {
      const allBeh = [...behaviors, ...archivedBehaviors]
      const behavior = allBeh.find(b => b.id === behaviorId)
      if (behavior) setCellDetailModal({ behaviorId, behaviorName: behavior.name, date })
    },
    [behaviors, archivedBehaviors],
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
    [cellDetailModal, entries, upsertEntry, upsertComment],
  )

  const allBehaviors = useMemo(() => [...behaviors, ...archivedBehaviors], [behaviors, archivedBehaviors])
  const editBehavior = editBehaviorId ? allBehaviors.find(b => b.id === editBehaviorId) : null
  const editCategory = editCategoryId ? categories.find(c => c.id === editCategoryId) : null
  const addBehaviorCategory = addBehaviorCategoryId ? categories.find(c => c.id === addBehaviorCategoryId) : null

  // Calling label for the YOUR CALLING header.
  const callingLabel = useMemo(() => {
    if (selectedTemplateName) return selectedTemplateName
    if (stakeRole === 'stake_president') return 'Stake President'
    if (stakeRole === 'first_counselor') return 'First Counselor'
    if (stakeRole === 'second_counselor') return 'Second Counselor'
    if (stakeRole === 'exec_secretary') return 'Executive Secretary'
    if (stakeRole === 'stake_clerk') return 'Stake Clerk'
    return null
  }, [selectedTemplateName, stakeRole])

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

  const periodDates = { weekly: weekDate, monthly: monthDate, quarterly: quarterDate }

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'work' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-5 md:px-6 py-4 md:py-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              {/* YOUR CALLING header — calling-first hierarchy. Drops on the
                  page once per render; replaces the per-frequency category
                  headers that used to fragment the leader's check-in. */}
              {callingLabel && callingBehaviors.length > 0 && (
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                      Your calling
                    </div>
                    <div className="text-[17px] md:text-lg font-extrabold text-gray-900 tracking-tight leading-tight mt-0.5">
                      {callingLabel}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {format(now, 'EEEE, MMM d')}
                    </div>
                  </div>
                  {categories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowManageBehaviors(!showManageBehaviors)}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 self-center"
                      aria-label="Manage behaviors"
                    >
                      <Settings size={14} />
                      {showManageBehaviors ? 'Done' : 'Manage'}
                    </button>
                  )}
                </div>
              )}

              {/* Three frequency sections. On lg+ they sit side-by-side; on
                  mobile they stack. The bottom-spaced layout matches the
                  spec's "calling-first, frequency-grouped" recipe. */}
              <div className="lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start">
                <PeriodChecklist
                  title="This Week"
                  periodDate={weekDate}
                  periodLabel={weekLabel}
                  periodOffset={weekOffset}
                  frequency="weekly"
                  behaviors={weeklyCalling}
                  entries={entries}
                  comments={comments}
                  complianceMap={complianceMap}
                  onToggle={handleToggle}
                  onRowOpen={handleRowOpen}
                  onPrev={() => setWeekOffset(o => o - 1)}
                  onNext={() => setWeekOffset(o => o + 1)}
                  onToday={() => setWeekOffset(0)}
                />
                <PeriodChecklist
                  title="This Month"
                  periodDate={monthDate}
                  periodLabel={monthLabel}
                  periodOffset={monthOffset}
                  frequency="monthly"
                  behaviors={monthlyCalling}
                  entries={entries}
                  comments={comments}
                  complianceMap={complianceMap}
                  onToggle={handleToggle}
                  onRowOpen={handleRowOpen}
                  onPrev={() => setMonthOffset(o => o - 1)}
                  onNext={() => setMonthOffset(o => o + 1)}
                  onToday={() => setMonthOffset(0)}
                />
                <PeriodChecklist
                  title="This Quarter"
                  periodDate={quarterDate}
                  periodLabel={quarterLabel}
                  periodOffset={quarterOffset}
                  frequency="quarterly"
                  behaviors={quarterlyCalling}
                  entries={entries}
                  comments={comments}
                  complianceMap={complianceMap}
                  onToggle={handleToggle}
                  onRowOpen={handleRowOpen}
                  onPrev={() => setQuarterOffset(o => o - 1)}
                  onNext={() => setQuarterOffset(o => o + 1)}
                  onToday={() => setQuarterOffset(0)}
                />
              </div>

              {/* Desktop compliance strip — last 14 weeks per calling
                  behavior. Mobile keeps the layout lean. */}
              <ComplianceStrip
                behaviors={weeklyCalling}
                entries={entries}
                frequency="weekly"
                cellCount={14}
              />

              {/* Add-on habits (Family / Personal / Self) — collapsed by default.
                  Leaders who add personal habits opt in by tapping the
                  disclosure. The default view stays focused on the calling. */}
              <AddOnHabits
                behaviors={{
                  weekly: weeklyAddOn,
                  monthly: monthlyAddOn,
                  quarterly: quarterlyAddOn,
                }}
                entries={entries}
                complianceMap={complianceMap}
                periodDates={periodDates}
                onToggle={handleToggle}
                onRowOpen={handleRowOpen}
              />

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

              {/* Manage tray — categories list shows only when toggled
                  ("Manage" button next to YOUR CALLING on mobile; always
                  available on desktop via the same button). The Add/Save
                  CTAs at the bottom of the page stay visible. */}
              {categories.length > 0 && !showCallingPicker && (
                <div className="mt-6 space-y-4 max-w-2xl mx-auto">
                  {showManageBehaviors && (
                    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-2 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">{cat.name}</div>
                            <div className="text-[10px] text-gray-500">
                              {behaviors.filter(b => b.category_id === cat.id).length} behaviors
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditCategoryId(cat.id)}
                            className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddBehaviorCategoryId(cat.id)}
                            className="text-[11px] font-semibold text-steward-primary px-2 py-1 inline-flex items-center gap-1"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 min-h-[44px]"
                    >
                      <Plus size={16} />
                      Add Category
                    </button>
                    <button
                      onClick={() => setShowSaveTemplate(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-100 min-h-[44px]"
                    >
                      <Save size={14} />
                      Save as Template
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'reflect' && user && (
        <div className="max-w-6xl mx-auto px-4 sm:px-5 md:px-6 py-4 md:py-6">
          <ReflectionLog userId={user.id} />
        </div>
      )}
      {activeTab === 'notes' && user && (
        <div className="max-w-6xl mx-auto px-4 sm:px-5 md:px-6 py-4 md:py-6">
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
        <AddBehaviorModal
          userId={user.id}
          categoryId={addBehaviorCategory.id}
          categoryName={addBehaviorCategory.name}
          existingCount={behaviors.filter(b => b.category_id === addBehaviorCategory.id).length}
          onSuccess={refresh}
          onClose={() => setAddBehaviorCategoryId(null)}
        />
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
          behaviors={behaviors as Behavior[]}
          onSaved={() => setShowSaveTemplate(false)}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
    </AppShell>
  )
}
