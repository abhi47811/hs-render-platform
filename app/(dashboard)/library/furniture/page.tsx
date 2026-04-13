import { createClient } from '@/lib/supabase/server'
import FurnitureCard from '@/components/library/FurnitureCard'
import FurnitureUploader from '@/components/library/FurnitureUploader'

interface SearchParams {
  category?: string
  style?: string
  room_type?: string
  budget?: string
  show_inactive?: string
}

export const metadata = {
  title: 'Furniture Reference Library | Houspire Staging',
}

const CATEGORIES = ['sofa', 'chair', 'table', 'bed', 'wardrobe', 'lighting', 'decor'] as const
const STYLES = [
  'Contemporary', 'Modern Minimalist', 'Traditional Indian', 'Bohemian',
  'Scandinavian', 'Industrial', 'Mid-Century Modern', 'Coastal', 'Art Deco', 'Japandi',
] as const
const ROOM_TYPES = [
  'Living', 'Master Bedroom', 'Bedroom 2', 'Kitchen', 'Dining',
  'Study', 'Office', 'Bathroom', 'Balcony', 'Other',
] as const
const BUDGETS = ['economy', 'standard', 'premium', 'luxury'] as const

export default async function FurnitureLibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let canEdit = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    canEdit = profile?.role === 'admin' || profile?.role === 'senior_designer'
  }

  let query = supabase
    .from('furniture_references')
    .select('id, image_url, name, category, style, room_type, budget_bracket, is_active, usage_count')
    .order('usage_count', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (params.show_inactive !== '1') query = query.eq('is_active', true)
  if (params.category) query = query.eq('category', params.category)
  if (params.style) query = query.eq('style', params.style)
  if (params.room_type) query = query.eq('room_type', params.room_type)
  if (params.budget) query = query.eq('budget_bracket', params.budget)

  const { data: entries = [] } = await query

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto bg-stone-50 min-h-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Furniture Reference Library</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Curated furniture images that feed Gemini slots 9–14 during staging. {entries?.length ?? 0} references.
          </p>
        </div>
      </div>

      {canEdit && <FurnitureUploader />}

      {/* Filters (server-side via <form> GET) */}
      <form method="get" className="bg-white border border-stone-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-600">Category</label>
          <select name="category" defaultValue={params.category || ''} className="px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-sm min-w-[140px]">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-600">Style</label>
          <select name="style" defaultValue={params.style || ''} className="px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-sm min-w-[160px]">
            <option value="">All Styles</option>
            {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-600">Room Type</label>
          <select name="room_type" defaultValue={params.room_type || ''} className="px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-sm min-w-[140px]">
            <option value="">All Rooms</option>
            {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-600">Budget</label>
          <select name="budget" defaultValue={params.budget || ''} className="px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-sm min-w-[130px]">
            <option value="">All Budgets</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {canEdit && (
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input type="checkbox" name="show_inactive" value="1" defaultChecked={params.show_inactive === '1'} />
            Show hidden
          </label>
        )}
        <button type="submit" className="bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-700">
          Apply
        </button>
        {(params.category || params.style || params.room_type || params.budget || params.show_inactive) && (
          <a href="/library/furniture" className="text-xs text-stone-500 hover:text-stone-900 underline">
            Clear
          </a>
        )}
      </form>

      {(entries ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <h2 className="text-base font-semibold text-stone-700 mb-1">No furniture references</h2>
          <p className="text-stone-400 text-sm max-w-md">
            {canEdit
              ? 'Upload your first furniture reference to start building the library.'
              : 'No references match your filters. Ask an admin to upload new references.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {(entries ?? []).map((entry) => (
            <FurnitureCard
              key={entry.id}
              entry={entry as Parameters<typeof FurnitureCard>[0]['entry']}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
