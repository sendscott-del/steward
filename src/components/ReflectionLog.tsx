'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, Behavior, CellComment } from '@/lib/types'

interface ReflectionLogProps {
  userId: string
}

interface CommentWithContext extends CellComment {
  behavior_name: string
  category_name: string
  category_id: string
}

export default function ReflectionLog({ userId }: ReflectionLogProps) {
  const [comments, setComments] = useState<CommentWithContext[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReflections() {
      setLoading(true)

      const [catRes, behRes, comRes] = await Promise.all([
        supabase.from('lsw_categories').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('lsw_behaviors').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('lsw_cell_comments').select('*').eq('user_id', userId).order('entry_date', { ascending: false }),
      ])

      const categories = (catRes.data ?? []) as Category[]
      const behaviors = (behRes.data ?? []) as Behavior[]
      const rawComments = (comRes.data ?? []) as CellComment[]

      const catMap = new Map(categories.map(c => [c.id, c]))
      const behMap = new Map(behaviors.map(b => [b.id, b]))

      const enriched: CommentWithContext[] = rawComments
        .filter(c => c.comment.trim() !== '')
        .map(c => {
          const behavior = behMap.get(c.behavior_id)
          const category = behavior ? catMap.get(behavior.category_id) : undefined
          return {
            ...c,
            behavior_name: behavior?.name ?? 'Unknown',
            category_name: category?.name ?? 'Unknown',
            category_id: category?.id ?? '',
          }
        })

      setComments(enriched)
      setLoading(false)
    }

    fetchReflections()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Loading reflections...
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-500 text-sm">
          No reflections yet. Long-press any cell in the Work tab to add a comment.
        </p>
      </div>
    )
  }

  // Group by category, then by behavior
  const grouped = new Map<string, Map<string, CommentWithContext[]>>()
  for (const c of comments) {
    if (!grouped.has(c.category_id)) grouped.set(c.category_id, new Map())
    const catGroup = grouped.get(c.category_id)!
    if (!catGroup.has(c.behavior_id)) catGroup.set(c.behavior_id, [])
    catGroup.get(c.behavior_id)!.push(c)
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-sm font-semibold text-gray-700">Reflection Log</h2>

      {Array.from(grouped.entries()).map(([catId, behaviorMap]) => {
        const catName = comments.find(c => c.category_id === catId)?.category_name ?? ''
        return (
          <div key={catId}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              {catName}
            </h3>

            {Array.from(behaviorMap.entries()).map(([behId, behComments]) => (
              <div key={behId} className="mb-4 ml-2">
                <h4 className="text-sm font-medium text-gray-800 mb-2">
                  {behComments[0].behavior_name}
                </h4>
                <div className="space-y-2 ml-3 border-l-2 border-gray-200 pl-3">
                  {behComments.map(c => (
                    <div key={c.id} className="text-sm">
                      <span className="text-xs text-gray-400 mr-2">{c.entry_date}</span>
                      <span className="text-gray-700">{c.comment}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
