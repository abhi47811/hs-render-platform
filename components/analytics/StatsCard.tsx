interface StatsCardProps {
  label: string
  value: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  accent?: 'default' | 'brand' | 'success' | 'danger' | 'warning'
}

const ACCENT_CONFIG = {
  default: { bg: 'var(--surface)',    border: 'var(--border)',    dot: 'var(--text-muted)',  value: 'var(--text-primary)' },
  brand:   { bg: 'var(--brand-light)', border: '#E8D5B3',         dot: 'var(--brand)',       value: 'var(--brand-dark)' },
  success: { bg: '#F0FDF4',            border: '#BBF7D0',         dot: '#16A34A',            value: '#14532D' },
  danger:  { bg: '#FEF2F2',            border: '#FECACA',         dot: '#DC2626',            value: '#7F1D1D' },
  warning: { bg: '#FFFBEB',            border: '#FDE68A',         dot: '#D97706',            value: '#92400E' },
}

const TREND_CONFIG = {
  up:      { color: '#16A34A', bg: '#F0FDF4', symbol: '↑' },
  down:    { color: '#DC2626', bg: '#FEF2F2', symbol: '↓' },
  neutral: { color: '#D97706', bg: '#FFFBEB', symbol: '→' },
}

export default function StatsCard({
  label,
  value,
  subtext,
  trend,
  trendLabel,
  accent = 'default',
}: StatsCardProps) {
  const a = ACCENT_CONFIG[accent]
  const t = trend ? TREND_CONFIG[trend] : null

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background:  a.bg,
        border:      `1px solid ${a.border}`,
        boxShadow:   'var(--shadow-sm)',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </p>
        {/* Accent dot */}
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: a.dot }}
        />
      </div>

      {/* Value */}
      <p
        className="text-3xl font-bold tabular-nums leading-none mb-3"
        style={{ color: a.value, letterSpacing: '-0.04em' }}
      >
        {value}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {subtext && (
          <p
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {subtext}
          </p>
        )}
        {t && trendLabel && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: t.bg, color: t.color }}
          >
            <span>{t.symbol}</span>
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}
