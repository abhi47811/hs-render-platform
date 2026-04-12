'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Room {
  id: string
  project_id: string
  room_name: string
  room_type: string
  design_style?: string | null
  colour_palette?: Record<string, unknown> | null
  dimensions_l?: number | null
  dimensions_w?: number | null
  dimensions_h?: number | null
}

interface StyleConfiguratorProps {
  room: Room
  projectStyle?: string | null
  projectStylePrefs?: string | null
  projectMaterialPrefs?: string | null
  projectExclusions?: string | null
}

const DESIGN_STYLES = [
  { id: 'Contemporary',       label: 'Contemporary' },
  { id: 'Modern Minimalist',  label: 'Minimalist' },
  { id: 'Traditional Indian', label: 'Traditional' },
  { id: 'Bohemian',           label: 'Bohemian' },
  { id: 'Scandinavian',       label: 'Scandi' },
  { id: 'Industrial',         label: 'Industrial' },
  { id: 'Mid-Century Modern', label: 'Mid-Century' },
  { id: 'Art Deco',           label: 'Art Deco' },
  { id: 'Japandi',            label: 'Japandi' },
  { id: 'Coastal',            label: 'Coastal' },
]

const COLOUR_PALETTES = [
  { id: 'warm_neutrals',   label: 'Warm Neutrals',   swatches: ['#F5F0E8', '#E8D5B7', '#C4A882', '#8B6B47'] },
  { id: 'cool_blues',      label: 'Cool Blues',      swatches: ['#EFF6FF', '#BFDBFE', '#60A5FA', '#1D4ED8'] },
  { id: 'earth_tones',     label: 'Earth Tones',     swatches: ['#FDF4E7', '#D4A853', '#8B5E3C', '#4A3728'] },
  { id: 'jewel_tones',     label: 'Jewel Tones',     swatches: ['#F5F0FF', '#C4B5FD', '#7C3AED', '#166534'] },
  { id: 'monochrome',      label: 'Monochrome',      swatches: ['#FAFAFA', '#D1D5DB', '#6B7280', '#111827'] },
  { id: 'sage_green',      label: 'Sage & Cream',    swatches: ['#F8FAF5', '#D1E0C8', '#8FAF7E', '#4A5E42'] },
  { id: 'terracotta',      label: 'Terracotta',      swatches: ['#FDF8F5', '#F2CAB5', '#C4703E', '#7A3B1E'] },
  { id: 'navy_gold',       label: 'Navy & Gold',     swatches: ['#F8F6F0', '#F0C860', '#1E3A5F', '#0F1F35'] },
]

const LIGHTING_MOODS = [
  { id: 'bright_airy',    label: 'Bright & Airy',   desc: 'Natural daylight, open feel' },
  { id: 'warm_cozy',      label: 'Warm & Cozy',     desc: 'Evening amber, intimate' },
  { id: 'dramatic',       label: 'Dramatic',         desc: 'High contrast, moody' },
  { id: 'neutral_studio', label: 'Studio',           desc: 'Even, clean, editorial' },
]

export function StyleConfigurator({
  room,
  projectStyle,
  projectStylePrefs,
  projectMaterialPrefs,
  projectExclusions,
}: StyleConfiguratorProps) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedStyle, setSelectedStyle] = useState<string>(room.design_style || projectStyle || '')
  const [selectedPalette, setSelectedPalette] = useState<string>(
    (room.colour_palette as any)?.palette_id || ''
  )
  const [selectedLighting, setSelectedLighting] = useState<string>(
    (room.colour_palette as any)?.lighting || ''
  )
  const [dimL, setDimL] = useState<string>(room.dimensions_l?.toString() || '')
  const [dimW, setDimW] = useState<string>(room.dimensions_w?.toString() || '')
  const [dimH, setDimH] = useState<string>(room.dimensions_h?.toString() || '')
  const [additionalNotes, setAdditionalNotes] = useState<string>(
    (room.colour_palette as any)?.notes || ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          design_style: selectedStyle || null,
          colour_palette: {
            palette_id: selectedPalette,
            lighting: selectedLighting,
            notes: additionalNotes,
          },
          dimensions_l: dimL ? parseFloat(dimL) : null,
          dimensions_w: dimW ? parseFloat(dimW) : null,
          dimensions_h: dimH ? parseFloat(dimH) : null,
        })
        .eq('id', room.id)

      if (error) throw error
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Style save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    selectedStyle !== (room.design_style || projectStyle || '') ||
    selectedPalette !== ((room.colour_palette as any)?.palette_id || '') ||
    selectedLighting !== ((room.colour_palette as any)?.lighting || '')

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-800">Style Configuration</h2>
          <p className="text-xs text-stone-400 mt-0.5">Design direction for AI staging</p>
        </div>
        {room.design_style && !isDirty && (
          <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            Configured
          </span>
        )}
      </div>

      <div className="p-5 space-y-6">

        {/* Project-level context */}
        {(projectStylePrefs || projectMaterialPrefs || projectExclusions) && (
          <div className="bg-stone-50 rounded-lg border border-stone-200 p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Project Brief</p>
            {projectStylePrefs && (
              <p className="text-xs text-stone-600"><span className="font-medium text-stone-700">Style:</span> {projectStylePrefs}</p>
            )}
            {projectMaterialPrefs && (
              <p className="text-xs text-stone-600"><span className="font-medium text-stone-700">Materials:</span> {projectMaterialPrefs}</p>
            )}
            {projectExclusions && (
              <p className="text-xs text-stone-600"><span className="font-medium text-stone-700">Exclude:</span> {projectExclusions}</p>
            )}
          </div>
        )}

        {/* Design Style */}
        <div>
          <p className="text-xs font-semibold text-stone-700 mb-2.5">Design Style</p>
          <div className="flex flex-wrap gap-1.5">
            {DESIGN_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={cn(
                  'px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium transition-all border cursor-pointer',
                  selectedStyle === style.id
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-800'
                )}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colour Palette */}
        <div>
          <p className="text-xs font-semibold text-stone-700 mb-2.5">Colour Palette</p>
          <div className="space-y-1.5">
            {COLOUR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPalette(palette.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left',
                  selectedPalette === palette.id
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                )}
              >
                {/* Swatches */}
                <div className="flex gap-0.5 flex-shrink-0">
                  {palette.swatches.map((color) => (
                    <div
                      key={color}
                      className="w-5 h-5 rounded-sm border border-stone-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className={cn(
                  'text-xs font-medium',
                  selectedPalette === palette.id ? 'text-stone-900' : 'text-stone-600'
                )}>
                  {palette.label}
                </span>
                {selectedPalette === palette.id && (
                  <span className="ml-auto text-stone-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lighting Mood */}
        <div>
          <p className="text-xs font-semibold text-stone-700 mb-2.5">Lighting Mood</p>
          <div className="grid grid-cols-2 gap-1.5">
            {LIGHTING_MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedLighting(mood.id)}
                className={cn(
                  'px-3 py-3 min-h-[56px] rounded-lg border text-left transition-all cursor-pointer',
                  selectedLighting === mood.id
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                )}
              >
                <p className={cn(
                  'text-xs font-medium',
                  selectedLighting === mood.id ? 'text-stone-900' : 'text-stone-700'
                )}>
                  {mood.label}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">{mood.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <p className="text-xs font-semibold text-stone-700 mb-2.5">Room Dimensions (ft)</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Length', value: dimL, set: setDimL },
              { label: 'Width',  value: dimW, set: setDimW },
              { label: 'Height', value: dimH, set: setDimH },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-[10px] text-stone-400 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1.5 text-xs border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-stone-400 text-stone-800"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Additional notes */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-2">Additional Notes</label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Specific instructions for this room — e.g. 'keep existing sofa', 'add partition wall', 'no curtains'..."
            rows={3}
            className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-stone-400 text-stone-800 placeholder:text-stone-300"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || (!selectedStyle && !selectedPalette)}
          className={cn(
            'w-full py-3 px-4 rounded-lg text-xs font-semibold transition-all min-h-[44px] cursor-pointer',
            saved
              ? 'bg-green-600 text-white'
              : saving
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : (!selectedStyle && !selectedPalette)
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : 'bg-stone-900 text-white hover:bg-stone-700'
          )}
        >
          {saved ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Saved
            </span>
          ) : saving ? 'Saving…' : 'Save Style Config'}
        </button>

        {!selectedStyle && (
          <p className="text-[10px] text-stone-400 text-center -mt-3">Select a design style to enable save</p>
        )}
      </div>
    </div>
  )
}
