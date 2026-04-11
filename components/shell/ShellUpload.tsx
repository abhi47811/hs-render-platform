'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ShellUploadProps {
  roomId: string
  projectId: string
  onUploadComplete: (url: string) => void
}

export function ShellUpload({ roomId, projectId, onUploadComplete }: ShellUploadProps) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG or PNG.')
      return false
    }

    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 10MB.')
      return false
    }

    return true
  }

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return

    try {
      setError(null)
      setProgress(0)

      // Create thumbnail preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setThumbnail(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase
      const storagePath = `${projectId}/${roomId}/original.jpg`

      const { data, error: uploadError } = await supabase.storage
        .from('shells')
        .upload(storagePath, file, {
          upsert: true,
          onUploadProgress: (progress) => {
            const percentComplete = Math.round((progress.loaded / progress.total) * 100)
            setProgress(percentComplete)
          },
        })

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setProgress(null)
        return
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('shells').getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl

      // Update rooms table
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          original_shell_url: publicUrl,
          status: 'in_progress',
        })
        .eq('id', roomId)

      if (updateError) {
        setError(`Failed to update room: ${updateError.message}`)
        setProgress(null)
        return
      }

      // Get room_name for activity log
      const { data: roomData } = await supabase
        .from('rooms')
        .select('room_name')
        .eq('id', roomId)
        .single()

      // Log activity
      const { error: logError } = await supabase.from('activity_log').insert({
        project_id: projectId,
        room_id: roomId,
        action_type: 'shell_uploaded',
        action_description: `Shell photo uploaded for ${roomData?.room_name || 'room'}`,
        metadata: { storage_path: storagePath, file_size: file.size },
      })

      if (logError) {
        console.warn('Activity log failed:', logError)
        // Don't fail the upload for logging issues
      }

      setProgress(null)
      setSuccess(true)
      onUploadComplete(publicUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setProgress(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  if (success && thumbnail) {
    return (
      <div className="w-full">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
          <div className="mb-4">
            <img
              src={thumbnail}
              alt="Shell thumbnail"
              className="mx-auto max-h-48 rounded-lg object-cover shadow-sm"
            />
          </div>
          <p className="text-sm font-medium text-stone-700">Shell uploaded successfully</p>
          <button
            onClick={() => {
              setSuccess(false)
              setThumbnail(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="mt-4 text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Upload another
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-600 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          progress !== null
            ? 'border-blue-300 bg-blue-50'
            : 'border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          className="hidden"
        />

        {progress !== null ? (
          <div>
            <div className="mb-3 text-sm font-medium text-stone-600">Uploading...</div>
            <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-stone-500">{progress}%</div>
          </div>
        ) : (
          <div>
            <div className="mb-3 text-3xl">📸</div>
            <p className="text-sm font-medium text-stone-700 mb-1">Drop your shell photo here</p>
            <p className="text-xs text-stone-500 mb-3">or click to browse</p>
            <p className="text-xs text-stone-400">JPEG or PNG, up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  )
}
