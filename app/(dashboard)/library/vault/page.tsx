import { createClient } from '@/lib/supabase/server'
import { VaultPageClient } from '@/components/vault/VaultPageClient'
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

      {/* Search + Enhanced Filters (Client Component) */}
      <VaultPageClient entries={entries ?? []} />
    </div>
  )
}
