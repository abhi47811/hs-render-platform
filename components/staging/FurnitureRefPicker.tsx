'use client'

// ─── Sec 36: Furniture Reference Library ─────────────────────────────────────
// Dropdown picker inside PromptBuilder that lets designers select furniture
// reference images from the library. Selected images fill Gemini slots 9–14.
//
// furniture_references table columns:
//   id, image_url, name, category, style, room_type (nullable),
//   budget_bracket (nullable), uploaded_by, created_at, is_active
//
// 7 categories: sofa / chair / table / bed / wardrobe / lighting / decor
// Filtered by room_type + style. Smart-sorted by match score.
// Admin/Senior can upload new references via the same panel.

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────

export type FurnitureCategory = 'sofa' | 'chair' | 'table' | 'bed' | 'wardrobe' | 'lighting' | 'decor' | 'all'

interface FurnitureRef {
  id: string
  image_url: string
  name: string
  category: FurnitureCategory
  style: string | null
  room_type: string | null
  budget_bracket: string | null
  uploaded_by: string | null
  is_active: boolean
}

interface FurnitureRefPickerProps {
  roomType: string
  primaryStyle: string
  budgetBracket: string
  /** Currently selected reference image URLs */
  selectedUrls: string[]
  /** Max selections (fills Gemini slots 9–14, so max 6) */
  maxSelections?: number
  onChange: (urls: string[]) => void
}

const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  all:      'All',
  sofa:     'Sofa',
  chair:    'Chair',
  table:    'Table',
  bed:      'Bed',
  wardrobe: 'Wardrobe',
  lighting: 'Lighting',
  decor:    'Decor',
}

const CATEGORY_ICONS: Record<FurnitureCategory, string> = {
  all:      '⊞',
  sofa:     '🛋',
  chair:    '💺',
  table:    '🪑',
  bed:      '🛏',
  wardrobe: '🚪',
  lighting: '💡',
  decor:    '🪴',
}

// ── Upload mini-panel ─────────────────────────────────────────────────────────
function UploadPanel({ onUploaded }: { onUploaded: (ref: FurnitureRef) => void }) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '', category: 'sofa' as FurnitureCategory,
    style: '', room_type: '', budget_bracket: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !formData.name) {
      setUploadError('Name and image are required')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // Upload image to Supabase Storage
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: storageError } = await supabase.storage
        .from('furniture-refs')
        .upload(path, file, { upsert: false })
      if (storageError) throw new Error(storageError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('furniture-refs')
        .getPublicUrl(path)

      // Insert record
      const { data: { user } } = await supabase.auth.getUser()
      const { data: inserted, error: dbError } = await supabase
        .from('furniture_references')
        .insert({
          image_url: publicUrl,
          name: formData.name,
          category: formData.category,
          style: formData.style || null,
          room_type: formData.room_type || null,
          budget_bracket: formData.budget_bracket || null,
          uploaded_by: user?.id ?? null,
          is_active: true,
        })
        .select('*')
        .single()

      if (dbError) throw new Error(dbError.message)
      onUploaded(inserted as FurnitureRef)
      setFormData({ name: '', category: 'sofa', style: '', room_type: '', budget_bracket: '' })
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Upload New Reference</p>
      <input
        type="text"
        placeholder="Reference name"
        value={formData.name}
        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
        className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={formData.category}
          onChange={e => setFormData(p => ({ ...p, category: e.target.value as FurnitureCategory }))}
          className="px-2 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none"
        >
          {(['sofa','chair','table','bed','wardrobe','lighting','decor'] as FurnitureCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={formData.budget_bracket}
          onChange={e => setFormData(p => ({ ...p, budget_bracket: e.target.value }))}
          className="px-2 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none"
        >
          <option value="">Any budget</option>
          <option value="economy">Economy</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
          <option value="luxury">Luxury</option>
        </select>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="text-xs text-stone-500 w-full" />
      {uploadError && <p className="text-[10px] text-red-600">{uploadError}</p>}
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload Reference'}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FurnitureRefPicker({
  roomType,
  primaryStyle,
  budgetBracket,
  selectedUrls,
  maxSelections = 6,
  onChange,
}: FurnitureRefPickerProps) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [refs, setRefs] = useState<FurnitureRef[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [canUpload, setCanUpload] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Check if current user can upload (admin or senior — matches DB role values)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data }) => {
          setCanUpload(data?.role === 'admin' || data?.role === 'senior')
        })
    })
  }, [supabase])

  const fetchRefs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('furniture_references')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(60)

    if (activeCategory !== 'all') {
      query = query.eq('category', activeCategory)
    }

    const { data } = await query
    const all = (data ?? []) as FurnitureRef[]

    // Smart sort: exact room_type + style match first, then partial, then rest
    const sorted = all.sort((a, b) => {
      const scoreA =
        (a.room_type === roomType ? 2 : 0) +
        (a.style?.toLowerCase().includes(primaryStyle.toLowerCase()) ? 2 : 0) +
        (a.budget_bracket === budgetBracket ? 1 : 0)
      const scoreB =
        (b.room_type === roomType ? 2 : 0) +
        (b.style?.toLowerCase().includes(primaryStyle.toLowerCase()) ? 2 : 0) +
        (b.budget_bracket === budgetBracket ? 1 : 0)
      return scoreB - scoreA
    })

    setRefs(sorted)
    setLoading(false)
  }, [supabase, activeCategory, roomType, primaryStyle, budgetBracket])

  useEffect(() => { if (open) fetchRefs() }, [open, fetchRefs])

  // Click-outside close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleRef = (ref: FurnitureRef) => {
    const isSelected = selectedUrls.includes(ref.image_url)
    if (isSelected) {
      onChange(selectedUrls.filter(u => u !== ref.image_url))
    } else if (selectedUrls.length < maxSelections) {
      onChange([...selectedUrls, ref.image_url])
    }
  }

  const filteredRefs = searchQuery.trim()
    ? refs.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : refs

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          selectedUrls.length > 0
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        Furniture Refs
        {selectedUrls.length > 0 && (
          <span className="bg-violet-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
            {selectedUrls.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-40 overflow-hidden"
          style={{ maxHeight: '480px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-stone-800">
                Furniture References
                <span className="ml-1.5 text-stone-400 font-normal">{selectedUrls.length}/{maxSelections} selected</span>
              </p>
              {selectedUrls.length > 0 && (
                <button onClick={() => onChange([])} className="text-[10px] text-red-500 hover:text-red-700">Clear all</button>
              )}
            </div>
            <input
              type="text"
              placeholder="Search name, style, category…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          {/* Category filter tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-stone-100 overflow-x-auto">
            {(['all','sofa','chair','table','bed','wardrobe','lighting','decor'] as FurnitureCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <svg className="animate-spin w-4 h-4 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : filteredRefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-center px-4">
                <p className="text-xs text-stone-400">No furniture references found</p>
                {canUpload && (
                  <button
                    onClick={() => setShowUpload(v => !v)}
                    className="mt-2 text-xs text-stone-600 underline"
                  >
                    Upload the first one
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 p-3">
                {filteredRefs.map(ref => {
                  const isSelected = selectedUrls.includes(ref.image_url)
                  const isDisabled = !isSelected && selectedUrls.length >= maxSelections
                  return (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => !isDisabled && toggleRef(ref)}
                      disabled={isDisabled}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-violet-600 ring-2 ring-violet-200'
                          : isDisabled
                            ? 'border-stone-100 opacity-40 cursor-not-allowed'
                            : 'border-stone-200 hover:border-stone-400 cursor-pointer'
                      }`}
                      title={ref.name}
                    >
                      {ref.image_url ? (
                        <Image
                          src={ref.image_url}
                          alt={ref.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                          <span className="text-lg">{CATEGORY_ICONS[ref.category]}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                          <div className="w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                        <p className="text-[8px] text-white font-medium truncate leading-tight">{ref.name}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upload toggle (Admin/Senior only) */}
          {canUpload && (
            <div className="border-t border-stone-100">
              <button
                onClick={() => setShowUpload(v => !v)}
                className="w-full px-4 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 flex items-center gap-1.5 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                Upload new reference
              </button>
              {showUpload && (
                <UploadPanel
                  onUploaded={ref => {
                    setRefs(prev => [ref, ...prev])
                    setShowUpload(false)
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
