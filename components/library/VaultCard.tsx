import Image from 'next/image'
import { StyleVaultEntry } from '@/types/database'
import { cn } from '@/lib/utils'

const BUDGET_BADGE_COLORS: Record<string, string> = {
  economy: 'bg-stone-200 text-stone-700',
  standard: 'bg-emerald-100 text-emerald-700',
  premium: 'bg-purple-100 text-purple-700',
  luxury: 'bg-amber-100 text-amber-700',
}

interface VaultCardProps {
  entry: StyleVaultEntry
}

function ImagePlaceholderIcon() {
  return (
    <svg className="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

export default function VaultCard({ entry }: VaultCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative w-full h-56 bg-stone-100">
        {entry.image_url ? (
          <Image
            src={entry.image_url}
            alt={entry.style_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImagePlaceholderIcon />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-stone-900 text-sm mb-2 line-clamp-2">
          {entry.style_name}
        </h3>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap mb-3">
          {/* Room Type Badge */}
          <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full font-medium">
            {entry.room_type}
          </span>

          {/* Budget Badge */}
          {entry.budget_bracket && (
            <span
              className={cn(
                'inline-block px-2 py-0.5 text-xs rounded-full font-medium',
                BUDGET_BADGE_COLORS[entry.budget_bracket] ?? 'bg-stone-100 text-stone-600'
              )}
            >
              {entry.budget_bracket.charAt(0).toUpperCase() +
                entry.budget_bracket.slice(1)}
            </span>
          )}

          {/* City Badge */}
          {entry.city && (
            <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full font-medium">
              {entry.city}
            </span>
          )}
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 bg-stone-50 text-stone-500 text-xs rounded border border-stone-200"
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="inline-block px-2 py-0.5 text-stone-400 text-xs">
                +{entry.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Usage Count */}
        <p className="text-xs text-stone-400 tabular-nums">
          Used <span className="font-semibold text-stone-600">{entry.usage_count}×</span>
        </p>
      </div>
    </div>
  )
}
