'use client'

interface MonthData {
  month: string
  delivered: number
  apiCostInr: number
}

export function MonthlyTrendChart({ data }: { data: MonthData[] }) {
  if (data.length === 0)
    return (
      <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
        No delivery data yet
      </p>
    )

  const maxDelivered = Math.max(...data.map((d) => d.delivered), 1)
  const maxCost = Math.max(...data.map((d) => d.apiCostInr), 1)

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Projects delivered
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#3B82F6' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            API cost (₹)
          </span>
        </div>
      </div>

      <div className="flex items-end gap-3 h-32">
        {data.map((d, i) => {
          const deliveredH = d.delivered > 0 ? Math.max((d.delivered / maxDelivered) * 120, 8) : 4
          const costH = d.apiCostInr > 0 ? Math.max((d.apiCostInr / maxCost) * 120, 8) : 4
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 120 }}>
                <div
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: deliveredH,
                    background: 'var(--brand)',
                    opacity: 0.85,
                    minWidth: 6,
                  }}
                  title={`${d.delivered} delivered`}
                />
                <div
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: costH,
                    background: '#3B82F6',
                    opacity: 0.7,
                    minWidth: 6,
                  }}
                  title={`₹${d.apiCostInr.toFixed(0)} API cost`}
                />
              </div>
              <span
                className="text-[9px] font-medium text-center leading-tight"
                style={{ color: 'var(--text-muted)' }}
              >
                {d.month}
              </span>
            </div>
          )
        })}
      </div>

      {data.length > 0 && (
        <div className="mt-4 flex items-center gap-6 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Latest month
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand)' }}>
              {data[data.length - 1].delivered}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              delivered
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              API spend
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: '#3B82F6' }}>
              ₹{data[data.length - 1].apiCostInr.toFixed(0)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              this month
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
