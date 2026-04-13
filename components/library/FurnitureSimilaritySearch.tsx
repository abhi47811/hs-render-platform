'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface FurnitureSimilaritySearchProps {
  sourceItem: {
    id: string
    name: string
    category: string | null
    style: string | null
    budget: string | null
    room_type: string | null
  }
  onClose: () => void
}

interface SimilarItem {
  id: string
  name: string | null
  category: string
  style: string | null
  budget_bracket: string | null
  room_type: string | null
  image_url: string
  usage_count: number | null
  similarityScore: number
}

export default function FurnitureSimilaritySearch({
  sourceItem,
  onClose,
}: FurnitureSimilaritySearchProps) {
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    style: true,
    budget: true,
    roomType: true,
  })

  useEffect(() => {
    const fetchSimilarItems = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('furniture_references')
        .select('id, name, category, style, budget_bracket, room_type, image_url, usage_count')
        .eq('is_active', true)
        .neq('id', sourceItem.id)
        .eq('category', sourceItem.category)
        .limit(20)

      if (data) {
        const itemsWithScores = data.map((item) => {
          let score = 0
          if (filters.style && item.style === sourceItem.style) score += 1
          if (filters.budget && item.budget_bracket === sourceItem.budget) score += 1
          if (filters.roomType && item.room_type === sourceItem.room_type) score += 1
          return {
            ...item,
            similarityScore: score,
          }
        })

        itemsWithScores.sort((a, b) => b.similarityScore - a.similarityScore)
        setSimilarItems(itemsWithScores)
      }

      setLoading(false)
    }

    fetchSimilarItems()
  }, [sourceItem, filters])

  const handleFilterChange = (filter: keyof typeof filters) => {
    setFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }))
  }

  const maxScore = 3

  return (
    <div
      className="fixed right-0 top-0 h-screen z-50 shadow-lg flex flex-col"
      style={{
        width: 360,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Similar to {sourceItem.name}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition-colors"
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-2)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Source item chip */}
      <div className="flex-shrink-0 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ background: 'var(--surface-2)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {sourceItem.name || sourceItem.category}
          </span>
          {sourceItem.category && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)',
              }}
            >
              {sourceItem.category}
            </span>
          )}
        </div>
      </div>

      {/* Similarity filters */}
      <div className="flex-shrink-0 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Match filters
        </p>
        <div className="flex flex-wrap gap-2">
          {(['style', 'budget', 'roomType'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => handleFilterChange(filterKey)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
              style={{
                background: filters[filterKey] ? 'var(--brand)' : 'var(--surface-2)',
                color: filters[filterKey] ? 'white' : 'var(--text-secondary)',
                border: filters[filterKey] ? 'none' : '1px solid var(--border)',
              }}
            >
              {filterKey === 'style' && 'Style'}
              {filterKey === 'budget' && 'Budget'}
              {filterKey === 'roomType' && 'Room Type'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of similar items */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading && (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </p>
        )}

        {!loading && similarItems.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-10 h-10 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No similar items found
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {similarItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg overflow-hidden border"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="aspect-square relative bg-stone-100 overflow-hidden group">
                <Image
                  src={item.image_url}
                  alt={item.name || item.category}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="160px"
                />
              </div>
              <div className="p-2">
                <p
                  className="text-xs font-semibold truncate mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.name || item.category}
                </p>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {item.style && (
                    <span
                      className="text-[8px] font-medium px-1 py-0.5 rounded"
                      style={{
                        background: 'var(--surface-3)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.style}
                    </span>
                  )}
                  {item.budget_bracket && (
                    <span
                      className="text-[8px] font-medium px-1 py-0.5 rounded"
                      style={{
                        background: 'var(--surface-3)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {item.budget_bracket}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[9px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.usage_count ?? 0}x used
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: 'var(--brand)',
                      color: 'white',
                    }}
                  >
                    {item.similarityScore}/{maxScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
