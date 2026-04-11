import Image from 'next/image'
import { StyleVaultEntry } from '@/types/database'
import { cn } from '@/lib/utils'

const BUDGET_BADGE_COLORS: Record<string, string> = {
  economy: 'bg-blue-100 text-blue-700',
  standard: 'bg-emerald-100 text-emerald-700',
  premium: 'bg-purple-100 text-purple-700',
  luxury: 'bg-amber-100 text-amber-700',
}

interface VaultCardProps {
  entry: StyleVaultEntry
}

export default function VaultCard({ entry }: VaultCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative w-full h-56 bg-stone-200">
        {entry.image_url ? (
          <Image
            src={entry.image_url}
            alt={entry.style_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <span className="text-4xl">🖼️</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-stone-900 mb-2 line-clamp-2">
          {entry.style_name}
        </h3>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap mb-3">
          {/* Room Type Badge */}
          <span className="inline-block px-2 py-1 bg-stone-100 text-stone-700 text-xs rounded-full font-medium">
            {entry.room_type}
          </span>

          {/* Budget Badge */}
          {entry.budget_bracket && (
            <span
              className={cn(
                'inline-block px-2 py-1 text-xs rounded-full font-medium',
                BUDGET_BADGE_COLORS[entry.budget_bracket]
              )}
            >
              {entry.budget_bracket.charAt(0).toUpperCase() +
                entry.budget_bracket.slice(1)}
            </span>
          )}

          {/* City Badge */}
          {entry.city && (
            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
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
                className="inline-block px-2 py-0.5 bg-stone-50 text-stone-600 text-xs rounded border border-stone-200"
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="inline-block px-2 py-0.5 text-stone-500 text-xs">
                +{entry.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Usage Count */}
        <p className="text-sm text-stone-600">
          Used <span className="font-semibold">{entry.usage_count}x</span>
        </p>
      </div>
    </div>
  )
}
