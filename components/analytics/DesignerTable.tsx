'use client'

interface DesignerRow {
  id: string
  full_name: string | null
  role: string | null
  total: number
  delivered: number
  lateDeliveries: number
  avgHours: number | null
}

export function DesignerTable({ rows }: { rows: DesignerRow[] }) {
  if (rows.length === 0)
    return (
      <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
        No data yet
      </p>
    )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Designer', 'Total', 'Delivered', 'On Time', 'Avg Hours'].map((h) => (
              <th
                key={h}
                className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const onTime = r.delivered - r.lateDeliveries
            const onTimePct = r.delivered > 0 ? Math.round((onTime / r.delivered) * 100) : null
            const initials = (r.full_name ?? '')
              .trim()
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || '?'

            return (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)' }}
                    >
                      {initials}
                    </span>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {r.full_name ?? 'Unnamed'}
                      </p>
                      <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                        {r.role ?? 'No role'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {r.total}
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {r.delivered}
                </td>
                <td className="py-3 px-3">
                  {onTimePct !== null ? (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: onTimePct >= 80 ? '#F0FDF4' : '#FEF2F2',
                        color: onTimePct >= 80 ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {onTimePct}%
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {r.avgHours !== null ? `${Math.round(r.avgHours)}h` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
