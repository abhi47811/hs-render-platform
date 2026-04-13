'use client'

// Sec 36 — Admin/Senior upload widget for furniture references.
// Uploads to `furniture-refs` bucket, inserts a row in `furniture_references`.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['sofa', 'chair', 'table', 'bed', 'wardrobe', 'lighting', 'decor'] as const
const STYLES = [
  'Contemporary',
  'Modern Minimalist',
  'Traditional Indian',
  'Bohemian',
  'Scandinavian',
  'Industrial',
  'Mid-Century Modern',
  'Coastal',
  'Art Deco',
  'Japandi',
] as const
const ROOM_TYPES = ['Living', 'Master Bedroom', 'Bedroom 2', 'Kitchen', 'Dining', 'Study', 'Office', 'Bathroom', 'Balcony', 'Other'] as const
const BUDGETS = ['economy', 'standard', 'premium', 'luxury'] as const

export default function FurnitureUploader() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('sofa')
  const [style, setStyle] = useState<string>('')
  const [roomType, setRoomType] = useState<string>('')
  const [budget, setBudget] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null); setName(''); setCategory('sofa')
    setStyle(''); setRoomType(''); setBudget('')
    setError(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) return setError('Choose an image file')
    if (!name.trim()) return setError('Enter a name')
    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('furniture-refs')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('furniture-refs').getPublicUrl(path)

      const { error: insErr } = await supabase.from('furniture_references').insert({
        image_url: pub.publicUrl,
        name: name.trim(),
        category,
        sub_category: category,
        style: style || null,
        room_type: roomType || null,
        budget_bracket: budget || null,
        uploaded_by: user.id,
        added_by: user.id,
        is_active: true,
      })
      if (insErr) throw insErr

      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-stone-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
        Upload Reference
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-stone-800">New Furniture Reference</p>
        <button type="button" onClick={() => { setOpen(false); reset() }} className="text-xs text-stone-500 hover:text-stone-900">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-stone-600 mb-1">Image *</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-stone-600 file:mr-3 file:text-xs file:font-medium file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Walnut 3-Seater Sofa"
            className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg bg-white">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Style</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg bg-white">
            <option value="">— any —</option>
            {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Room Type</label>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg bg-white">
            <option value="">— any —</option>
            {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Budget</label>
          <select value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg bg-white">
            <option value="">— any —</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-700 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Save Reference'}
        </button>
      </div>
    </form>
  )
}
