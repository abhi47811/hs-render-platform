interface StatsCardProps {
  label: string
  value: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}

export default function StatsCard({
  label,
  value,
  subtext,
  trend,
  trendLabel,
}: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-amber-600',
  }

  const trendArrows = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      {/* Label */}
      <p className="text-xs font-medium text-stone-600 mb-2">{label}</p>

      {/* Value */}
      <p className="text-3xl font-bold text-stone-900 mb-3">{value}</p>

      {/* Subtext and Trend */}
      <div className="flex items-center justify-between">
        {subtext && <p className="text-xs text-stone-500">{subtext}</p>}
        {trend && trendLabel && (
          <p className={`text-xs font-medium ${trendColors[trend]}`}>
            {trendArrows[trend]} {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}
