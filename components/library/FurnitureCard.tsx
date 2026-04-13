'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import FurnitureSimilaritySearch from './FurnitureSimilaritySearch'

interface FurnitureCardProps {
  entry: {
    id: string
    image_url: string
    name: string | null
    category: string
    style: string | null
    room_type: string | null
    budget_bracket: string | null
    is_active: boolean
    usage_count: number | null
  }
  canEdit: boolean
}

export default function FurnitureCard({ entry, canEdit }: FurnitureCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localActive, setLocalActive] = useState(entry.is_active)
  const [showSimilar, setShowSimilar] = useState(false)
  const supabase = createClient()

  const toggleActive = () => {
    startTransition(async () => {
      const newActive = !localActive
      const { error } = await supabase
        .from('furniture_references')
        .update({ is_active: newActive })
        .eq('id', entry.id)
      if (!error) {
        setLocalActive(newActive)
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className={`group relative rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-md transition-shadow ${!localActive ? 'opacity-60' : ''}`}>
        <div className="aspect-square relative bg-stone-100">
          <Image
            src={entry.image_url}
            alt={entry.name || entry.category}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {!localActive && (
            <div className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Hidden
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-stone-800 truncate">
            {entry.name || entry.category}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
              {entry.category}
            </span>
            {entry.style && (
              <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                {entry.style}
              </span>
            )}
            {entry.budget_bracket && (
              <span className="text-[10px] font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                {entry.budget_bracket}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-stone-400">
              Used {entry.usage_count ?? 0}x
            </span>
            <div className="flex items-center gap-1">
              {localActive && (
                <button
                  type="button"
                  onClick={() => setShowSimilar(true)}
                  className="text-[10px] font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  title="Find similar items"
                >
                  ⟳
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={toggleActive}
                  disabled={isPending}
                  className="text-[10px] font-medium text-stone-500 hover:text-stone-900 disabled:opacity-50"
                >
                  {localActive ? 'Hide' : 'Restore'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSimilar && (
        <FurnitureSimilaritySearch
          sourceItem={{
            id: entry.id,
            name: entry.name || entry.category,
            category: entry.category,
            style: entry.style,
            budget: entry.budget_bracket,
            room_type: entry.room_type,
          }}
          onClose={() => setShowSimilar(false)}
        />
      )}
    </>
  )
}
