'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ShellUploadProps {
  roomId: string
  projectId: string
  roomType?: string | null
  onUploadComplete?: (url: string) => void
}

interface RoomAnalysis {
  detected_room_type: string
  is_indoor: boolean
  is_bare_shell: boolean
  has_furniture: boolean
  confidence: string
  key_features: string[]
  image_quality: string
  quality_issues: string[]
  mismatch_detected: boolean
  mismatch_reason: string | null
}

type UploadState = 'idle' | 'uploading' | 'analysing' | 'review' | 'saving' | 'success' | 'error'

export function ShellUpload({ roomId, projectId, roomType, onUploadComplete }: ShellUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const validate = (file: File): string | null => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      return 'Only JPEG, PNG, or WebP files are supported.'
    if (file.size > 20 * 1024 * 1024)
      return 'File must be under 20 MB.'
    return null
  }

  const saveToRoom = useCallback(async (url: string) => {
    setUploadState('saving')
    const { error: roomErr } = await supabase
      .from('rooms')
      .update({ original_shell_url: url, status: 'in_progress' })
      .eq('id', roomId)
    if (roomErr) throw new Error(roomErr.message)

    const { data: existingCp } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('room_id', roomId)
      .eq('checkpoint_number', 1)
      .single()
    if (!existingCp) {
      await supabase.from('checkpoints').insert([
        { room_id: roomId, checkpoint_number: 1, status: 'pending' },
        { room_id: roomId, checkpoint_number: 2, status: 'pending' },
        { room_id: roomId, checkpoint_number: 3, status: 'pending' },
      ])
    }

    await supabase.from('activity_log').insert({
      project_id: projectId,
      room_id: roomId,
      action_type: 'shell_uploaded',
      action_description: `Shell photo uploaded — detected: ${analysis?.detected_room_type ?? 'unknown'}`,
      metadata: { url, analysis },
    })

    setUploadState('success')
    onUploadComplete?.(url)
    router.refresh()
  }, [roomId, projectId, supabase, router, onUploadComplete, analysis])

  const upload = useCallback(async (file: File) => {
    const validationError = validate(file)
    if (validationError) {
      setErrorMsg(validationError)
      setUploadState('error')
      return
    }

    // Local preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploadState('uploading')
    setProgress(0)
    setErrorMsg(null)

    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const storagePath = `${projectId}/${roomId}/shell.${ext}`

      setProgress(30)
      const { error: uploadError } = await supabase.storage
        .from('shells')
        .upload(storagePath, file, { upsert: true })
      setProgress(80)

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from('shells').getPublicUrl(storagePath)
      const url = urlData.publicUrl
      setPublicUrl(url)
      setProgress(100)

      // Smart room detection
      setUploadState('analysing')
      const detectRes = await fetch('/api/shell/detect-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, declared_room_type: roomType ?? null }),
      })
      const detectData = await detectRes.json()

      if (detectData.success && detectData.analysis) {
        setAnalysis(detectData.analysis)
        setUploadState('review')
      } else {
        // Detection failed — skip to save
        await saveToRoom(url)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploadState('error')
    }
  }, [roomId, projectId, roomType, supabase, saveToRoom])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) upload(file)
    e.currentTarget.value = ''
  }

  const reset = () => {
    setUploadState('idle')
    setProgress(0)
    setErrorMsg(null)
    setPreview(null)
    setPublicUrl(null)
    setAnalysis(null)
  }

  // ── Review state — show analysis and let user confirm or cancel ──
  if (uploadState === 'review' && analysis && preview) {
    const hasMismatch = analysis.mismatch_detected
    const hasQualityIssues = analysis.quality_issues?.length > 0
    const isOutdoor = !analysis.is_indoor

    const isBlocked = isOutdoor || analysis.image_quality === 'poor'

    return (
      <div className="space-y-4">
        {/* Image preview */}
        <div className="relative rounded-xl overflow-hidden border border-stone-200">
          <img src={preview} alt="Shell preview" className="w-full h-52 object-cover" />
          <div className="absolute top-2 right-2">
            <span className={cn(
              'text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide',
              isBlocked
                ? 'bg-red-500 text-white'
                : hasMismatch
                ? 'bg-amber-400 text-amber-900'
                : 'bg-emerald-500 text-white'
            )}>
              {isBlocked ? 'Blocked' : hasMismatch ? 'Mismatch' : 'Looks good'}
            </span>
          </div>
        </div>

        {/* Analysis card */}
        <div className={cn(
          'rounded-xl border p-4 space-y-3',
          isBlocked
            ? 'border-red-200 bg-red-50'
            : hasMismatch
            ? 'border-amber-200 bg-amber-50'
            : 'border-emerald-200 bg-emerald-50'
        )}>
          {/* Detected type */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Detected Room</p>
              <p className="text-sm font-bold text-stone-900 capitalize mt-0.5">{analysis.detected_room_type}</p>
            </div>
            {roomType && (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Set As</p>
                <p className="text-sm font-medium text-stone-700 capitalize mt-0.5">{roomType}</p>
              </div>
            )}
          </div>

          {/* Mismatch warning */}
          {hasMismatch && analysis.mismatch_reason && (
            <div className={cn(
              'rounded-lg px-3 py-2.5 flex items-start gap-2',
              isBlocked ? 'bg-red-100' : 'bg-amber-100'
            )}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('flex-shrink-0 mt-0.5', isBlocked ? 'text-red-600' : 'text-amber-700')}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className={cn('text-xs font-medium', isBlocked ? 'text-red-800' : 'text-amber-800')}>
                {analysis.mismatch_reason}
              </p>
            </div>
          )}

          {/* Quality issues */}
          {hasQualityIssues && (
            <div className="rounded-lg bg-stone-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Quality Flags</p>
              <div className="flex flex-wrap gap-1">
                {analysis.quality_issues.map((issue) => (
                  <span key={issue} className="text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full capitalize">{issue}</span>
                ))}
              </div>
            </div>
          )}

          {/* Features detected */}
          {analysis.key_features?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">What I See</p>
              <div className="flex flex-wrap gap-1">
                {analysis.key_features.map((f) => (
                  <span key={f} className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full capitalize',
                    isBlocked ? 'bg-red-100 text-red-700' : hasMismatch ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  )}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Shell status */}
          <div className="flex items-center gap-3 pt-1 border-t border-stone-200/60">
            <div className="flex items-center gap-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', analysis.is_bare_shell ? 'bg-emerald-500' : 'bg-amber-400')} />
              <span className="text-[10px] text-stone-500">{analysis.is_bare_shell ? 'Bare shell' : 'Furniture present'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', analysis.is_indoor ? 'bg-emerald-500' : 'bg-red-500')} />
              <span className="text-[10px] text-stone-500">{analysis.is_indoor ? 'Indoor' : 'Outdoor / not a room'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full',
                analysis.image_quality === 'good' ? 'bg-emerald-500' :
                analysis.image_quality === 'acceptable' ? 'bg-amber-400' : 'bg-red-500'
              )} />
              <span className="text-[10px] text-stone-500">Quality: {analysis.image_quality}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isBlocked ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center">
              <p className="text-xs font-semibold text-red-800">This image cannot be used as a room shell.</p>
              <p className="text-[10px] text-red-600 mt-0.5">Please upload an indoor room photograph.</p>
            </div>
            <button onClick={reset} className="w-full min-h-[44px] rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
              Upload different image
            </button>
          </div>
        ) : hasMismatch ? (
          <div className="space-y-2">
            <button
              onClick={() => saveToRoom(publicUrl!)}
              className="w-full min-h-[44px] rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all cursor-pointer"
            >
              Use anyway — I know what I'm doing
            </button>
            <button onClick={reset} className="w-full py-2 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
              Upload correct image
            </button>
          </div>
        ) : (
          <button
            onClick={() => saveToRoom(publicUrl!)}
            className="w-full min-h-[48px] rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            Confirm — Use This Shell
          </button>
        )}
      </div>
    )
  }

  // ── Success ──
  if (uploadState === 'success' && preview) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
          <img src={preview} alt="Shell preview" className="w-full h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-stone-800">Shell uploaded</span>
            </div>
            <button onClick={reset} className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white transition-colors cursor-pointer">
              Replace
            </button>
          </div>
        </div>
        <p className="text-xs text-stone-400 text-center">Page is refreshing — the shell viewer will appear shortly.</p>
      </div>
    )
  }

  // ── Error ──
  if (uploadState === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 mb-0.5">Upload failed</p>
            <p className="text-xs text-red-600">{errorMsg}</p>
          </div>
        </div>
        <button onClick={reset} className="mt-4 w-full py-3 min-h-[44px] rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer">
          Try again
        </button>
      </div>
    )
  }

  // ── Uploading / Analysing ──
  if (uploadState === 'uploading' || uploadState === 'analysing' || uploadState === 'saving') {
    const steps = [
      { key: 'uploading', label: 'Uploading photo', done: uploadState === 'analysing' || uploadState === 'saving' },
      { key: 'analysing', label: 'Analysing room with AI', done: uploadState === 'saving', active: uploadState === 'analysing' },
      { key: 'saving', label: 'Saving to project', done: false, active: uploadState === 'saving' },
    ]
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
        {preview && (
          <div className="relative rounded-lg overflow-hidden border border-stone-200 mb-5 h-36">
            <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
          </div>
        )}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                step.done ? 'bg-emerald-500' : step.active ? 'bg-stone-900' : 'bg-stone-200'
              )}>
                {step.done ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : step.active ? (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-stone-400" />
                )}
              </div>
              <p className={cn(
                'text-sm transition-colors',
                step.done ? 'text-stone-400 line-through' : step.active ? 'text-stone-900 font-semibold' : 'text-stone-400'
              )}>{step.label}</p>
            </div>
          ))}
        </div>
        {uploadState === 'uploading' && (
          <div className="mt-4 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
            <div className="h-full bg-stone-900 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
        {uploadState === 'analysing' && (
          <p className="mt-4 text-[10px] text-stone-400 text-center">Gemini Vision is reading the room — takes ~5 seconds</p>
        )}
      </div>
    )
  }

  // ── Idle / drag-drop ──
  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all cursor-pointer group',
          isDragging ? 'border-stone-900 bg-stone-50 scale-[1.01]' : 'border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50'
        )}
      >
        <div className="p-10 flex flex-col items-center gap-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center transition-colors', isDragging ? 'bg-stone-900' : 'bg-stone-100 group-hover:bg-stone-200')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={isDragging ? 'text-white' : 'text-stone-500'}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-800 mb-0.5">{isDragging ? 'Drop to upload' : 'Drop your shell photo here'}</p>
            <p className="text-xs text-stone-400">or <span className="text-stone-600 underline underline-offset-2">browse files</span></p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-stone-300 mt-1">
            <span>JPEG · PNG · WebP</span><span>·</span><span>Up to 20 MB</span>
          </div>
        </div>
      </div>

      {roomType && (
        <div className="mt-3 flex items-center gap-2 px-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-[10px] text-stone-400">AI will verify the upload matches <span className="font-semibold text-stone-600 capitalize">{roomType}</span> before saving</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { tip: 'Good lighting', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> },
          { tip: 'Wide-angle', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> },
          { tip: 'Clear the room', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> },
        ].map(({ icon, tip }) => (
          <div key={tip} className="bg-stone-50 rounded-lg p-3 text-center border border-stone-100 flex flex-col items-center gap-1.5">
            {icon}
            <p className="text-[10px] text-stone-500 leading-tight">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
