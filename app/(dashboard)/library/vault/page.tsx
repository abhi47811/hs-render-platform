import { createClient } from '@/lib/supabase/server'
import VaultCard from '@/components/library/VaultCard'
import { RoomType, BudgetBracket, City } from '@/types/database'

interface SearchParams {
  room_type?: string
  budget_bracket?: string
  city?: string
}

export const metadata = {
  title: 'Style Vault | Houspire Staging',
}

export default async function StyleVaultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('style_vault')
    .select('*')
    .order('usage_count', { ascending: false })

  if (params.room_type) {
    query = query.eq('room_type', params.room_type)
  }
  if (params.budget_bracket) {
    query = query.eq('budget_bracket', params.budget_bracket)
  }
  if (params.city) {
    query = query.eq('city', params.city)
  }

  const { data: entries = [] } = await query

  const { data: allEntries = [] } = await supabase
    .from('style_vault')
    .select('room_type, budget_bracket, city')

  const roomTypes = Array.from(
    new Set((allEntries ?? []).map((e) => e.room_type).filter(Boolean))
  ) as RoomType[]
  const budgetBrackets = Array.from(
    new Set((allEntries ?? []).map((e) => e.budget_bracket).filter(Boolean))
  ) as BudgetBracket[]
  const cities = Array.from(
    new Set((allEntries ?? []).map((e) => e.city).filter(Boolean))
  ) as City[]

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto bg-stone-50 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">Style Vault</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Curated interior design references from completed projects
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Filters</p>
        <div className="flex gap-4 flex-wrap">
          {/* Room Type Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-stone-600">Room Type</label>
            <div className="relative">
              <select
                defaultValue={params.room_type || ''}
                onChange={(e) => {
                  const url = new URLSearchParams(window.location.search)
                  if (e.target.value) {
                    url.set('room_type', e.target.value)
                  } else {
                    url.delete('room_type')
                  }
                  if (params.budget_bracket) url.set('budget_bracket', params.budget_bracket)
                  if (params.city) url.set('city', params.city)
                  window.location.search = url.toString()
                }}
                className="appearance-none px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                <option value="">All Rooms</option>
                {roomTypes.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Budget Bracket Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-stone-600">Budget</label>
            <div className="relative">
              <select
                defaultValue={params.budget_bracket || ''}
                onChange={(e) => {
                  const url = new URLSearchParams(window.location.search)
                  if (e.target.value) {
                    url.set('budget_bracket', e.target.value)
                  } else {
                    url.delete('budget_bracket')
                  }
                  if (params.room_type) url.set('room_type', params.room_type)
                  if (params.city) url.set('city', params.city)
                  window.location.search = url.toString()
                }}
                className="appearance-none px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                <option value="">All Budgets</option>
                {budgetBrackets.map((bb) => (
                  <option key={bb} value={bb}>
                    {bb.charAt(0).toUpperCase() + bb.slice(1)}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* City Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-stone-600">City</label>
            <div className="relative">
              <select
                defaultValue={params.city || ''}
                onChange={(e) => {
                  const url = new URLSearchParams(window.location.search)
                  if (e.target.value) {
                    url.set('city', e.target.value)
                  } else {
                    url.delete('city')
                  }
                  if (params.room_type) url.set('room_type', params.room_type)
                  if (params.budget_bracket) url.set('budget_bracket', params.budget_bracket)
                  window.location.search = url.toString()
                }}
                className="appearance-none px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
              >
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {(entries ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <h2 className="text-base font-semibold text-stone-700 mb-1">
            No styles found
          </h2>
          <p className="text-stone-400 text-sm max-w-md">
            Try adjusting your filters to discover more design references
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(entries ?? []).map((entry) => (
            <VaultCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
