'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Category, Behavior } from '@/lib/types'

interface SaveAsTemplateModalProps {
  userId: string
  categories: Category[]
  behaviors: Behavior[]
  onSuccess: () => void
  onClose: () => void
}

export default function SaveAsTemplateModal({
  userId, categories, behaviors, onSuccess, onClose,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    // Create the template
    const { data: template, error: tErr } = await supabase
      .from('lsw_templates')
      .insert({ name: name.trim(), created_by: userId })
      .select('id')
      .single()

    if (tErr || !template) {
      setError(tErr?.message ?? 'Failed to create template')
      setLoading(false)
      return
    }

    // Copy categories
    for (const cat of categories) {
      const { data: newCat } = await supabase
        .from('lsw_template_categories')
        .insert({ template_id: template.id, name: cat.name, sort_order: cat.sort_order })
        .select('id')
        .single()

      if (!newCat) continue

      // Copy behaviors for this category
      const catBehaviors = behaviors.filter(b => b.category_id === cat.id && !b.is_archived)
      if (catBehaviors.length > 0) {
        await supabase.from('lsw_template_behaviors').insert(
          catBehaviors.map(b => ({
            category_id: newCat.id,
            name: b.name,
            frequency: b.frequency,
            sort_order: b.sort_order,
          }))
        )
      }
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  const totalBehaviors = behaviors.filter(b => !b.is_archived).length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Save as Template</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          This will save a copy of your current LSW ({categories.length} categories, {totalBehaviors} behaviors) as a reusable template that you can share with user groups.
        </p>

        <div className="mb-4">
          <label htmlFor="tpl-name" className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            id="tpl-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            placeholder="e.g., Bishop LSW, EQ Presidency LSW"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  )
}
