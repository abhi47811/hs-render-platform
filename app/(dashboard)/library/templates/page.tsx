import { createClient } from '@/lib/supabase/server'
import TemplateCard from '@/components/library/TemplateCard'
import Link from 'next/link'

interface SearchParams {
  room_type?: string
  pass_number?: string
}

export const metadata = {
  title: 'Prompt Templates | Houspire Staging',
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = createClient()

  // Build query with filters
  let query = supabase
    .from('prompt_templates')
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false })

  // Apply filters if provided
  if (params.room_type) {
    query = query.eq('room_type', params.room_type)
  }
  if (params.pass_number) {
    query = query.eq('pass_number', parseInt(params.pass_number))
  }

  const { data: templates = [] } = await query

  // Get unique filter options
  const { data: allTemplates = [] } = await supabase
    .from('prompt_templates')
    .select('room_type, pass_number')
    .eq('is_active', true)

  const roomTypes = Array.from(
    new Set(allTemplates.map((t) => t.room_type))
  )
  const passNumbers = Array.from(
    new Set(allTemplates.map((t) => t.pass_number))
  ).sort() as number[]

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Prompt Templates
          </h1>
          <p className="text-stone-600">
            Reusable prompts for generating high-quality renders
          </p>
        </div>
        <Link
          href="/library/templates/new"
          className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
        >
          + Add Template
        </Link>
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
                if (params.pass_number) url.set('pass_number', params.pass_number)
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

          {/* Pass Number Filter */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-stone-700 mb-2">
              Pass Number
            </label>
            <select
              defaultValue={params.pass_number || ''}
              onChange={(e) => {
                const url = new URLSearchParams(window.location.search)
                if (e.target.value) {
                  url.set('pass_number', e.target.value)
                } else {
                  url.delete('pass_number')
                }
                if (params.room_type) url.set('room_type', params.room_type)
                window.location.search = url.toString()
              }}
              className="px-3 py-2 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="">All Passes</option>
              {passNumbers.map((pn) => (
                <option key={pn} value={pn}>
                  Pass {pn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            No templates found
          </h2>
          <p className="text-stone-600 max-w-md mb-4">
            Try adjusting your filters or create a new template to get started
          </p>
          <Link
            href="/library/templates/new"
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
          >
            Create Template
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}
