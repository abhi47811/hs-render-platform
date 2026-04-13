'use client'

// ─── Sec 9: Shell Enhancement Pass ─────────────────────────────────────────
// Calls /api/shell/enhance → enhance-shell edge function (Gemini Imagen).
// Transforms a raw architecture photo into a photorealistic rendering base.
//
// States:
//   idle       — no shell uploaded yet or waiting to trigger
//   ready      — shell_url present, ready to enhance
//   enhancing  — API call in flight, progress spinner
//   done       — enhanced_shell_url available, before/after preview
//   error      — API returned error, retry available
//
// The component also handles shell upload to Supabase Storage (shells bucket)
// when the designer hasn't uploaded a raw shell yet.

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type EnhanceState = 'idle' | 'uploading' | 'ready' | 'enhancing' | 'done' | 'error'

interface ShellEnhancementProps {
  roomId: string
  projectId: string
  /** Current raw shell URL (original_shell_url from rooms table). Null if not uploaded yet. */
  shellUrl: string | null
  /** Current enhanced shell URL (enhanced_shell_url from rooms table). Null if never enhanced. */
  enhancedShellUrl: string | null
  /** Called when enhancement succeeds — parent should refresh room data */
  onEnhanced: (photorealisticUrl: string) => void
}

export function ShellEnhancement({
  roomId,
  projectId,
  shellUrl: initialShellUrl,
  enhancedShellUrl: initialEnhancedUrl,
  onEnhanced,
}: ShellEnhancementProps) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [shellUrl, setShellUrl] = useState<string | null>(initialShellUrl)
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(initialEnhancedUrl)
  const [state, setState] = useState<EnhanceState>(
    initialEnhancedUrl ? 'done' : initialShellUrl ? 'ready' : 'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const [showBefore, setShowBefore] = useState(false)

  // ── Upload raw shell to Storage ──────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setState('uploading')
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${roomId}/shell-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('shells')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('shells').getPublicUrl(path)
      // Persist to rooms table
      await supabase.from('rooms').update({ original_shell_url: pub.publicUrl }).eq('id', roomId)
      setShellUrl(pub.publicUrl)
      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('idle')
    }
    e.target.value = ''
  }

  // ── Trigger shell enhancement ─────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!shellUrl) return
    setState('enhancing')
    setError(null)
    try {
      const res = await fetch('/api/shell/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, project_id: projectId, shell_url: shellUrl }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `API ${res.status}`)
      }
      const data = await res.json()
      const photoUrl: string = data.photorealistic_url ?? data.staged_url
      if (!photoUrl) throw new Error('No enhanced URL returned from API')
      setEnhancedUrl(photoUrl)
      setState('done')
      onEnhanced(photoUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed')
      setState('error')
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
            Shell Enhancement
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Photorealistic base from raw architecture shot
          </p>
        </div>
        {state === 'done' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>
            ✓ Enhanced
          </span>
        )}
        {state === 'ready' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>
            Shell Ready
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">

        {/* ── No shell yet — show upload zone ── */}
        {(state === 'idle' || state === 'uploading') && !shellUrl && (
          <label
            className="flex flex-col items-center justify-center gap-2.5 rounded-xl py-8 cursor-pointer transition-colors"
            style={{
              border: '2px dashed var(--border)',
              background: state === 'uploading' ? 'var(--surface-2)' : 'var(--surface)',
            }}
          >
            {state === 'uploading' ? (
              <>
                <Spinner />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Uploading shell…</span>
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Upload Raw Shell Photo</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>JPG, PNG, WebP · max 10MB</p>
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
          </label>
        )}

        {/* ── Shell uploaded, ready to enhance ── */}
        {(state === 'ready' || state === 'error') && shellUrl && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden aspect-video bg-stone-100" style={{ border: '1px solid var(--border)' }}>
              <Image src={shellUrl} alt="Raw shell" fill className="object-cover" sizes="500px" />
              <div className="absolute bottom-2 left-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
                  Original Shell
                </span>
              </div>
            </div>
            <button
              onClick={handleEnhance}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-mid,#D4A84B) 100%)', color: 'white' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              Enhance Shell with AI
            </button>
          </div>
        )}

        {/* ── Enhancing — spinner ── */}
        {state === 'enhancing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size={28} />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Enhancing shell…</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Gemini is rendering the photorealistic base</p>
            </div>
          </div>
        )}

        {/* ── Done — before/after toggle ── */}
        {state === 'done' && enhancedUrl && (
          <div className="space-y-3">
            {/* Toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['After', 'Before'] as const).map(label => {
                const active = label === 'After' ? !showBefore : showBefore
                return (
                  <button
                    key={label}
                    onClick={() => setShowBefore(label === 'Before')}
                    className="flex-1 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background: active ? 'var(--text-primary)' : 'var(--surface-2)',
                      color: active ? 'var(--surface)' : 'var(--text-muted)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {/* Image */}
            <div className="relative rounded-lg overflow-hidden aspect-video bg-stone-100" style={{ border: '1px solid var(--border)' }}>
              <Image
                src={showBefore ? (shellUrl ?? enhancedUrl) : enhancedUrl}
                alt={showBefore ? 'Original shell' : 'Enhanced shell'}
                fill
                className="object-cover transition-opacity duration-300"
                sizes="500px"
              />
              <div className="absolute bottom-2 left-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.7)', color: 'white' }}>
                  {showBefore ? 'Original' : 'Enhanced'}
                </span>
              </div>
            </div>
            {/* Re-enhance option */}
            <button
              onClick={() => { setState('ready'); setEnhancedUrl(null) }}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Re-enhance shell
            </button>
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-lg px-4 py-3 flex items-start gap-2.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>
          </div>
        )}

        {/* ── Replace shell ── */}
        {shellUrl && state !== 'enhancing' && (
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:underline" style={{ color: 'var(--text-muted)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Replace shell photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>
    </div>
  )
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      style={{ width: size, height: size, color: 'var(--brand)' }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
