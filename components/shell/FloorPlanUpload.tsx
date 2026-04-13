// components/shell/FloorPlanUpload.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FloorPlanData } from '@/lib/prompt/assembler'

interface FloorPlanUploadProps {
  roomId: string
  projectId: string
  existingUrl?: string | null
  existingData?: FloorPlanData | null
  onParsed?: (data: FloorPlanData) => void
}

export function FloorPlanUpload({
  roomId,
  projectId,
  existingUrl,
  existingData,
  onParsed,
}: FloorPlanUploadProps) {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl ?? null)
  const [parsedData, setParsedData] = useState<FloorPlanData | null>(existingData ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Floor plan image must be under 5MB. Try a lower-resolution export from your builder app.')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!validTypes.includes(file.type)) {
      setError('Upload a JPG, PNG, WEBP, or HEIC image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Delete previous floor plan file if replacing
      if (uploadedUrl) {
        try {
          const prevPath = uploadedUrl.split('/storage/v1/object/public/shells/')[1]
          if (prevPath) {
            await supabase.storage.from('shells').remove([decodeURIComponent(prevPath)])
          }
        } catch {
          // Silently ignore deletion errors
        }
      }

      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `floorplans/${projectId}/${roomId}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('shells')
        .upload(filePath, file, { contentType: file.type, upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('shells').getPublicUrl(filePath)
      setUploadedUrl(publicUrl)
      setIsUploading(false)

      await parseFloorPlan(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
    }
  }

  async function parseFloorPlan(url: string) {
    setIsParsing(true)
    setError(null)

    try {
      const res = await fetch('/api/shell/parse-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, floor_plan_url: url }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')

      setParsedData(data.floor_plan_data)
      onParsed?.(data.floor_plan_data)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setIsParsing(false)
    }
  }

  if (!uploadedUrl) {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-stone-200 rounded-lg px-4 py-6 text-center hover:border-stone-400 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isUploading ? (
            <p className="text-sm text-stone-500">Uploading…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-stone-700">Upload Floor Plan</p>
              <p className="text-xs text-stone-400 mt-1">
                JPG, PNG, WEBP · Builder plan, sketch, or annotated image
              </p>
            </>
          )}
        </button>

        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
        <img
          src={uploadedUrl}
          alt="Floor plan"
          className="w-full object-contain max-h-48"
        />
        <button
          type="button"
          onClick={() => { setUploadedUrl(null); setParsedData(null); fileInputRef.current?.click() }}
          className="absolute top-2 right-2 bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
        >
          Replace
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isParsing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <p className="text-xs font-medium text-amber-700">Gemini is reading your floor plan…</p>
          <p className="text-xs text-amber-600 mt-0.5">Extracting doors, windows, and spatial zones</p>
        </div>
      )}

      {parsedData && !isParsing && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-700">Floor Plan Parsed ✓</p>
            <button
              type="button"
              onClick={() => parseFloorPlan(uploadedUrl)}
              className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
            >
              Re-parse
            </button>
          </div>

          {parsedData.dimensions && (
            <p className="text-xs text-emerald-700">
              {[
                parsedData.dimensions.length_ft && parsedData.dimensions.width_ft
                  ? `${parsedData.dimensions.length_ft} × ${parsedData.dimensions.width_ft} ft`
                  : null,
                parsedData.dimensions.area_sqft ? `${parsedData.dimensions.area_sqft} sq ft` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {parsedData.tv_wall && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                📺 TV: {parsedData.tv_wall} wall
              </span>
            )}
            {parsedData.entry_wall && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                🚪 Entry: {parsedData.entry_wall} wall
              </span>
            )}
            {parsedData.doors?.length ? (
              <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                {parsedData.doors.length} door{parsedData.doors.length !== 1 ? 's' : ''}
              </span>
            ) : null}
            {parsedData.windows?.length ? (
              <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                {parsedData.windows.length} window{parsedData.windows.length !== 1 ? 's' : ''}
              </span>
            ) : null}
            {parsedData.furniture_zones?.length ? (
              <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                {parsedData.furniture_zones.length} zone{parsedData.furniture_zones.length !== 1 ? 's' : ''}
              </span>
            ) : null}
          </div>

          {parsedData.analyst_notes && (
            <p className="text-[10px] text-emerald-600 italic leading-snug">{parsedData.analyst_notes}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
