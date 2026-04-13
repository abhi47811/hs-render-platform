import { createClient } from '@/lib/supabase/server'
import TemplateCard from '@/components/library/TemplateCard'
import TemplatesFilter from '@/components/library/TemplatesFilter'
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
  const supabase = await createClient()

  let query = supabase
    .from('prompt_templates')
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false })

  if (params.room_type) {
    query = query.eq('room_type', params.room_type)
  }
  if (params.pass_number) {
    query = query.eq('pass_number', parseInt(params.pass_number))
  }

  const { data: templates = [] } = await query

  const { data: allTemplates = [] } = await supabase
    .from('prompt_templates')
    .select('room_type, pass_number')
    .eq('is_active', true)

  const roomTypes = Array.from(new Set((allTemplates ?? []).map((t) => t.room_type)))
  const passNumbers = Array.from(
    new Set((allTemplates ?? []).map((t) => t.pass_number))
  ).sort() as number[]

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto bg-stone-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Prompt Templates</h1>
          <p className="text-xs text-stone-500 mt-0.5">
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

      {/* Filters — client component (handles onChange) */}
      <TemplatesFilter
        roomTypes={roomTypes}
        passNumbers={passNumbers}
        currentRoomType={params.room_type}
        currentPassNumber={params.pass_number}
      />

      {/* Results */}
      {(templates ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h2 className="text-base font-semibold text-stone-700 mb-1">
            No templates found
          </h2>
          <p className="text-stone-400 text-sm max-w-md mb-5">
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
        <div className="space-y-3">
          {(templates ?? []).map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}
