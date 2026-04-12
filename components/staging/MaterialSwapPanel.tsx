'use client'

// ─── Sec 29: Material & Surface Swap Tool ─────────────────────────────────
// Available after Pass 3 (main furniture approved).
// Lets the designer swap a single surface material without touching furniture/layout.
//
// Surfaces: walls · floor · ceiling · countertops · upholstery
// Material categories: stone · wood · tile · concrete · fabric · wallpaper · metal
// Generates a new render with the specified swap — stored as pass_type = 'surface_swap'

import { useState, useCallback } from 'react'
import Image from 'next/image'

// ── Surface definitions ────────────────────────────────────────────────────

type SurfaceType = 'walls' | 'floor' | 'ceiling' | 'countertops' | 'upholstery' | 'cabinetry'

interface Surface {
  id: SurfaceType
  label: string
  emoji: string
  description: string
}

const SURFACES: Surface[] = [
  { id: 'walls',       label: 'Walls',        emoji: '🧱', description: 'All wall surfaces' },
  { id: 'floor',       label: 'Floor',        emoji: '🪵', description: 'Flooring material' },
  { id: 'ceiling',     label: 'Ceiling',      emoji: '⬜', description: 'Ceiling finish' },
  { id: 'countertops', label: 'Countertops',  emoji: '🪨', description: 'Kitchen/bath counters' },
  { id: 'upholstery',  label: 'Upholstery',   emoji: '🛋', description: 'Sofa & chair fabric' },
  { id: 'cabinetry',   label: 'Cabinetry',    emoji: '🗄',  description: 'Cabinet finish/colour' },
]

// ── Material library ───────────────────────────────────────────────────────

interface Material {
  id: string
  label: string
  category: string
  swatchColor: string
  promptPhrase: string
}

const MATERIALS: Material[] = [
  // Stone
  { id: 'marble_white',    label: 'White Marble',    category: 'Stone',     swatchColor: '#F5F5F0', promptPhrase: 'polished white Carrara marble with delicate grey veining' },
  { id: 'marble_black',    label: 'Black Marble',    category: 'Stone',     swatchColor: '#1A1A1A', promptPhrase: 'polished black Nero Marquina marble with white veining' },
  { id: 'marble_beige',    label: 'Beige Marble',    category: 'Stone',     swatchColor: '#E8DCC8', promptPhrase: 'polished beige Botticino marble with warm brown veining' },
  { id: 'granite_grey',    label: 'Grey Granite',    category: 'Stone',     swatchColor: '#8E8E8E', promptPhrase: 'honed grey granite with fine speckled texture' },
  { id: 'slate',           label: 'Slate',           category: 'Stone',     swatchColor: '#5A5F63', promptPhrase: 'natural cleft slate in charcoal-grey tones' },
  { id: 'travertine',      label: 'Travertine',      category: 'Stone',     swatchColor: '#C9B99A', promptPhrase: 'filled travertine in warm ivory with subtle linear veining' },
  // Wood
  { id: 'oak_natural',     label: 'Natural Oak',     category: 'Wood',      swatchColor: '#C8A96A', promptPhrase: 'natural light oak engineered wood with linear grain' },
  { id: 'walnut',          label: 'Walnut',          category: 'Wood',      swatchColor: '#5C3A1E', promptPhrase: 'rich dark walnut with prominent natural grain' },
  { id: 'teak',            label: 'Teak',            category: 'Wood',      swatchColor: '#A0722A', promptPhrase: 'teak hardwood in warm golden-brown with fine grain' },
  { id: 'white_oak',       label: 'White Oak',       category: 'Wood',      swatchColor: '#D9C4A0', promptPhrase: 'white oak with pale blonde finish and subtle grain' },
  { id: 'bamboo',          label: 'Bamboo',          category: 'Wood',      swatchColor: '#B5A055', promptPhrase: 'natural carbonised bamboo flooring with tight grain pattern' },
  // Tile
  { id: 'terracotta',      label: 'Terracotta',      category: 'Tile',      swatchColor: '#C4622D', promptPhrase: 'handmade terracotta tiles in warm earthy ochre-red' },
  { id: 'encaustic',       label: 'Encaustic',       category: 'Tile',      swatchColor: '#3A5A78', promptPhrase: 'encaustic cement tiles with geometric blue-and-white Moroccan pattern' },
  { id: 'zellige',         label: 'Zellige',         category: 'Tile',      swatchColor: '#2D7D6F', promptPhrase: 'hand-cut zellige ceramic tiles in jewel-tone teal with irregular glaze' },
  { id: 'metro_white',     label: 'Metro Tile',      category: 'Tile',      swatchColor: '#EAEAEA', promptPhrase: 'classic white subway metro tiles with thin grey grout lines' },
  { id: 'porcelain_grey',  label: 'Grey Porcelain',  category: 'Tile',      swatchColor: '#C0BEBE', promptPhrase: 'large-format light grey polished porcelain tiles' },
  // Concrete & Plaster
  { id: 'concrete',        label: 'Concrete',        category: 'Concrete',  swatchColor: '#9B9DA0', promptPhrase: 'smooth micro-cement in warm mid-grey with subtle aggregate texture' },
  { id: 'venetian_plaster',label: 'Venetian Plaster',category: 'Concrete',  swatchColor: '#D4C5A9', promptPhrase: 'Venetian polished plaster in warm ivory with depth and sheen' },
  { id: 'limewash',        label: 'Limewash',        category: 'Concrete',  swatchColor: '#DDD8CA', promptPhrase: 'aged limewash paint in chalky warm white with subtle mottled texture' },
  // Paint / Wallpaper
  { id: 'paint_white',     label: 'Crisp White',     category: 'Paint',     swatchColor: '#F8F8F5', promptPhrase: 'crisp modern white matte paint' },
  { id: 'paint_deep_teal', label: 'Deep Teal',       category: 'Paint',     swatchColor: '#1A5C5A', promptPhrase: 'deep jewel-tone teal matte paint' },
  { id: 'paint_terracotta',label: 'Terracotta Paint',category: 'Paint',     swatchColor: '#C96A3D', promptPhrase: 'warm terracotta matte paint in earthy burnt-orange' },
  { id: 'paint_sage',      label: 'Sage Green',      category: 'Paint',     swatchColor: '#8CAD8A', promptPhrase: 'sage green matte paint with warm grey undertone' },
  { id: 'wallpaper_botanical',label: 'Botanical',    category: 'Wallpaper', swatchColor: '#4A7856', promptPhrase: 'large-scale botanical leaf print wallpaper in green and cream' },
  { id: 'wallpaper_linen', label: 'Linen Texture',   category: 'Wallpaper', swatchColor: '#D6C9B5', promptPhrase: 'woven linen-texture wallpaper in warm sand' },
  // Fabric
  { id: 'fabric_linen',    label: 'Natural Linen',   category: 'Fabric',    swatchColor: '#D4C4A8', promptPhrase: 'natural undyed linen fabric with visible weave texture' },
  { id: 'fabric_velvet_navy',label: 'Navy Velvet',   category: 'Fabric',    swatchColor: '#1A2B4A', promptPhrase: 'deep navy crushed velvet fabric with rich sheen' },
  { id: 'fabric_boucle',   label: 'Boucle',          category: 'Fabric',    swatchColor: '#E8DFD0', promptPhrase: 'cream boucle fabric with loopy textured weave' },
  { id: 'fabric_leather',  label: 'Cognac Leather',  category: 'Fabric',    swatchColor: '#A0522D', promptPhrase: 'full-grain cognac leather with natural pebble texture' },
]

const MATERIAL_CATEGORIES = Array.from(new Set(MATERIALS.map(m => m.category)))

// ── Swap Result ────────────────────────────────────────────────────────────

interface SwapResult {
  id: string
  storage_url: string
  surface: SurfaceType
  material_id: string
  created_at: string
}

// ── Props ──────────────────────────────────────────────────────────────────

interface MaterialSwapPanelProps {
  roomId: string
  projectId: string
  baseRenderUrl: string
  onSwapGenerated?: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function MaterialSwapPanel({
  roomId,
  projectId,
  baseRenderUrl,
  onSwapGenerated,
}: MaterialSwapPanelProps) {
  const [selectedSurface, setSelectedSurface] = useState<SurfaceType>('walls')
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('Stone')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [swapResults, setSwapResults] = useState<SwapResult[]>([])
  const [customNote, setCustomNote] = useState('')

  const surfaceObj = SURFACES.find(s => s.id === selectedSurface)!
  const filteredMaterials = MATERIALS.filter(m => m.category === filterCategory)

  const buildSwapPrompt = useCallback((): string => {
    if (!selectedMaterial) return ''
    const parts = [
      `SURFACE MATERIAL SWAP: Replace the ${surfaceObj.label.toLowerCase()} with ${selectedMaterial.promptPhrase}.`,
      `Affected surface: ${selectedSurface} only — do NOT modify any other surface, furniture, lighting, layout, or objects.`,
      'GEOMETRY LOCK: Do NOT change any furniture arrangement, object placement, layout, or room configuration.',
      'Maintain identical camera angle, focal length, and composition as the reference render.',
      customNote ? `Additional note: ${customNote}` : '',
    ].filter(Boolean).join('\n\n')
    return parts
  }, [selectedSurface, selectedMaterial, surfaceObj, customNote])

  const handleGenerate = async () => {
    if (!selectedMaterial) return
    setIsGenerating(true)
    setError(null)

    try {
      const prompt = buildSwapPrompt()
      const response = await fetch('/api/staging/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id:          roomId,
          project_id:       projectId,
          pass_number:      8,   // Pass 8 = surface_swap
          pass_type:        'surface_swap',
          prompt,
          reference_urls:   [baseRenderUrl],
          resolution_tier:  '2K',
          variation_count:  1,
          metadata: {
            surface:       selectedSurface,
            material_id:   selectedMaterial.id,
            material_label: selectedMaterial.label,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Generation failed')
      }

      // Optimistically append result placeholder — real render will load after gallery refresh
      const mockResult: SwapResult = {
        id: data.render_ids?.[0] ?? `temp-${Date.now()}`,
        storage_url: '',
        surface: selectedSurface,
        material_id: selectedMaterial.id,
        created_at: new Date().toISOString(),
      }
      setSwapResults(prev => [mockResult, ...prev])
      onSwapGenerated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
        <span className="text-xl">🎨</span>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Material & Surface Swap</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Change one surface material · Geometry locked · Uses base render as anchor
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Base render preview */}
        <div className="relative rounded-xl overflow-hidden aspect-video bg-stone-100">
          <Image src={baseRenderUrl} alt="Base render" fill className="object-cover" sizes="600px" />
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] font-semibold rounded-full">
              Base render — locked geometry
            </span>
          </div>
        </div>

        {/* Surface selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">1. Select surface to swap</p>
          <div className="grid grid-cols-3 gap-2">
            {SURFACES.map(surface => (
              <button
                key={surface.id}
                onClick={() => setSelectedSurface(surface.id)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-medium transition-all ${
                  selectedSurface === surface.id
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
              >
                <span className="text-lg">{surface.emoji}</span>
                <span>{surface.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Material selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-700">2. Choose replacement material</p>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {MATERIAL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                  filterCategory === cat
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Material swatches */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {filteredMaterials.map(material => (
              <button
                key={material.id}
                onClick={() => setSelectedMaterial(material)}
                title={material.label}
                className={`group flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                  selectedMaterial?.id === material.id
                    ? 'border-stone-900 ring-2 ring-stone-900 ring-offset-1'
                    : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-md shadow-sm border border-stone-200"
                  style={{ backgroundColor: material.swatchColor }}
                />
                <span className="text-[9px] text-stone-600 text-center leading-tight line-clamp-2 w-full">
                  {material.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-700">3. Additional instructions (optional)</label>
          <input
            type="text"
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder="e.g. matte finish, aged patina, handmade texture…"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        {/* Prompt preview */}
        {selectedMaterial && (
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Swap prompt preview</p>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-800">{surfaceObj.label}:</span>{' '}
              {selectedMaterial.promptPhrase}
              {customNote && <span className="text-stone-500"> · {customNote}</span>}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700"><span className="font-semibold">Error:</span> {error}</p>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedMaterial || isGenerating}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[48px] ${
            isGenerating
              ? 'bg-stone-700 text-white cursor-not-allowed'
              : !selectedMaterial
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : 'bg-stone-900 text-white hover:bg-stone-800 cursor-pointer'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating swap…
            </>
          ) : selectedMaterial ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Swap {surfaceObj.label} → {selectedMaterial.label}
            </>
          ) : (
            'Select a material to generate'
          )}
        </button>

        {/* Recent swaps */}
        {swapResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Generated swaps this session
            </p>
            {swapResults.map(result => (
              <div key={result.id} className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center flex-shrink-0">
                  {result.storage_url ? (
                    <Image src={result.storage_url} alt="swap" width={40} height={40} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <svg className="animate-spin w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-700 capitalize">{result.surface} swap</p>
                  <p className="text-[10px] text-stone-400">
                    {MATERIALS.find(m => m.id === result.material_id)?.label ?? result.material_id}
                    {' · '}
                    {new Date(result.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-[9px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    In gallery
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
