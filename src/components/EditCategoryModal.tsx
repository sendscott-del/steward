'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'

interface EditCategoryModalProps {
  category: Category
  onSuccess: () => void
  onClose: () => void
}

export default function EditCategoryModal({ category, onSuccess, onClose }: EditCategoryModalProps) {
  const [name, setName] = useState(category.name)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    await supabase
      .from('lsw_categories')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', category.id)

    setLoading(false)
    onSuccess()
    onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setLoading(true)
    // Deleting a category cascades to its behaviors (and their entries/comments)
    await supabase.from('lsw_categories').delete().eq('id', category.id)
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Edit Category</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="edit-cat-name" className="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <input
              id="edit-cat-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg border ${
              confirmDelete ? 'bg-red-600 text-white border-red-600' : 'text-red-600 hover:bg-red-50 border-gray-200'
            }`}
          >
            <Trash2 size={14} />
            {confirmDelete ? 'Delete category and all its behaviors?' : 'Delete Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
