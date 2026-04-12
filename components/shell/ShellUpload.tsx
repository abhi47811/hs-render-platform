'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ShellUploadProps {
  roomId: string
  projectId: string
  onUploadComplete?: (url: string) => void
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export function ShellUpload({ roomId, projectId, onUploadComplete }: ShellUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
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

  const upload = useCallback(async (file: File) => {
    const validationError = validate(file)
    if (validationError) {
      setErrorMsg(validationError)
      setUploadState('error')
      return
    }

    // Preview
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
        .upload(storagePath, file, {
          upsert: true,
        })
      setProgress(90)

      if (uploadError) throw new Error(uploadError.message)

      setUploadState('processing')

      const { data: urlData } = supabase.storage.from('shells').getPublicUrl(storagePath)
      const publicUrl = urlData.publicUrl

      // Update room: set shell URL + status
      const { error: roomErr } = await supabase
        .from('rooms')
        .update({
          original_shell_url: publicUrl,
          status: 'in_progress',
        })
        .eq('id', roomId)

      if (roomErr) throw new Error(roomErr.message)

      // Ensure CP1 checkpoint exists (backfill if trigger didn't fire)
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

      // Activity log
      await supabase.from('activity_log').insert({
        project_id: projectId,
        room_id: roomId,
        action_type: 'shell_uploaded',
        action_description: 'Shell photo uploaded',
        metadata: { storage_path: storagePath, file_size: file.size },
      }).then(() => {}) // fire-and-forget, don't block

      setUploadState('success')
      onUploadComplete?.(publicUrl)
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploadState('error')
    }
  }, [roomId, projectId, supabase, router, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) upload(file)
    // Reset input so same file can be re-uploaded
    e.currentTarget.value = ''
  }

  const reset = () => {
    setUploadState('idle')
    setProgress(0)
    setErrorMsg(null)
    setPreview(null)
  }

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
            <button
              onClick={reset}
              className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-white transition-colors"
            >
              Replace
            </button>
          </div>
        </div>
        <p className="text-xs text-stone-400 text-center">
          Page is refreshing — the shell viewer will appear shortly.
        </p>
      </div>
    )
  }

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
        <button
          onClick={reset}
          className="mt-4 w-full py-3 min-h-[44px] rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  if (uploadState === 'uploading' || uploadState === 'processing') {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-8">
        {preview && (
          <div className="relative rounded-lg overflow-hidden border border-stone-200 mb-5 h-40">
            <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
          </div>
        )}
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-stone-700">
            {uploadState === 'uploading' ? 'Uploading shell photo...' : 'Processing...'}
          </p>
          {uploadState === 'uploading' && (
            <>
              <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-stone-900 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-stone-400">{progress}%</p>
            </>
          )}
          {uploadState === 'processing' && (
            <div className="flex justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all cursor-pointer group',
          isDragging
            ? 'border-stone-900 bg-stone-50 scale-[1.01]'
            : 'border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50'
        )}
      >
        <div className="p-10 flex flex-col items-center gap-3">
          {/* Upload icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            isDragging ? 'bg-stone-900' : 'bg-stone-100 group-hover:bg-stone-200'
          )}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={isDragging ? 'text-white' : 'text-stone-500'}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-stone-800 mb-0.5">
              {isDragging ? 'Drop to upload' : 'Drop your shell photo here'}
            </p>
            <p className="text-xs text-stone-400">or <span className="text-stone-600 underline underline-offset-2">browse files</span></p>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-stone-300 mt-1">
            <span>JPEG · PNG · WebP</span>
            <span>·</span>
            <span>Up to 20 MB</span>
          </div>
        </div>
      </div>

      {/* Tips — SVG icons, no emoji */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          {
            tip: 'Good lighting',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            ),
          },
          {
            tip: 'Wide-angle',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            ),
          },
          {
            tip: 'Clear the room',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            ),
          },
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
