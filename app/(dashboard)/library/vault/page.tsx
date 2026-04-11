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
  const supabase = createClient()

  // Build query with filters
  let query = supabase
    .from('style_vault')
    .select('*')
    .order('usage_count', { ascending: false })

  // Apply filters if provided
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

  // Get unique filter options for UI
  const { data: allEntries = [] } = await supabase
    .from('style_vault')
    .select('room_type, budget_bracket, city')

  const roomTypes = Array.from(
    new Set(allEntries.map((e) => e.room_type).filter(Boolean))
  ) as RoomType[]
  const budgetBrackets = Array.from(
    new Set(allEntries.map((e) => e.budget_bracket).filter(Boolean))
  ) as BudgetBracket[]
  const cities = Array.from(
    new Set(allEntries.map((e) => e.city).filter(Boolean))
  ) as City[]

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Style Vault</h1>
        <p className="text-stone-600">
          Curated interior design references from completed projects
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-lg p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          {/* Room Type Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-stone-700 mb-2">
              Room Type
            </label>
            <select
              defaultValue={params.room_type || ''}
              onChange={(e) => {
                const url = new URLSearchParams(window.location.search)
                if (e.target.value) {
                  url.set('room_type', e.target.value)
                } else {
                  url.delete('room_type')
                }
                if (params.budget_bracket)
                  url.set('budget_bracket', params.budget_bracket)
                if (params.city) url.set('city', params.city)
                window.location.search = url.toString()
              }}
              className="px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="">All Rooms</option>
              {roomTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Bracket Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-stone-700 mb-2">
              Budget
            </label>
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
              className="px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="">All Budgets</option>
              {budgetBrackets.map((bb) => (
                <option key={bb} value={bb}>
                  {bb.charAt(0).toUpperCase() + bb.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-stone-700 mb-2">
              City
            </label>
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
                if (params.budget_bracket)
                  url.set('budget_bracket', params.budget_bracket)
                window.location.search = url.toString()
              }}
              className="px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            No styles found
          </h2>
          <p className="text-stone-600 max-w-md">
            Try adjusting your filters to discover more design references
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.map((entry) => (
            <VaultCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
