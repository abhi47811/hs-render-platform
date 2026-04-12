'use client'

interface CostRow {
  projectId: string
  clientName: string
  city: string | null
  totalCost: number
  margin: number
  renderCount: number
}

const REVENUE = 4999

export function CostBreakdownTable({ rows }: { rows: CostRow[] }) {
  if (rows.length === 0)
    return (
      <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
        No cost data yet
      </p>
    )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Project', 'City', 'API Cost', 'Revenue', 'Margin', 'Renders'].map((h) => (
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
            const marginPct = Math.round((r.margin / REVENUE) * 100)
            return (
              <tr key={r.projectId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {r.clientName}
                </td>
                <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {r.city ?? '—'}
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  ₹{r.totalCost.toFixed(2)}
                </td>
                <td className="py-3 px-3 font-semibold tabular-nums" style={{ color: '#16A34A' }}>
                  ₹{REVENUE.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3">
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: r.margin >= 0 ? '#16A34A' : '#DC2626' }}
                  >
                    ₹{Math.abs(r.margin).toFixed(0)}
                  </span>
                  <span
                    className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background:
                        marginPct >= 80
                          ? '#F0FDF4'
                          : marginPct >= 50
                            ? '#FFFBEB'
                            : '#FEF2F2',
                      color:
                        marginPct >= 80
                          ? '#16A34A'
                          : marginPct >= 50
                            ? '#D97706'
                            : '#DC2626',
                    }}
                  >
                    {marginPct}%
                  </span>
                </td>
                <td className="py-3 px-3 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {r.renderCount}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
