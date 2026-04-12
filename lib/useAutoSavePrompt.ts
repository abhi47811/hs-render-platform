// ─── A6: Auto-Save Prompt Edits ──────────────────────────────────────────
// Debounced auto-save of the staging prompt to Supabase `room_prompt_drafts`.
// Saves after 800ms of inactivity.
// On mount, loads the saved draft for the current room+pass combination.
//
// Storage table: room_prompt_drafts
//   room_id    TEXT
//   pass_number INT
//   prompt_text TEXT
//   updated_at  TIMESTAMPTZ
//   user_id     UUID (FK to auth.users)
//
// Falls back gracefully if the table doesn't exist (no error thrown).

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: Date | null
}

export function useAutoSavePrompt(
  roomId: string,
  passNumber: number,
  prompt: string,
  /** Delay in ms before saving. Default: 800 */
  debounceMs = 800,
) {
  const supabase = createClient()
  const [saveState, setSaveState] = useState<AutoSaveState>({ status: 'idle', lastSavedAt: null })
  const [loadedDraft, setLoadedDraft] = useState<string | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedPromptRef = useRef<string>('')

  // Load draft on mount / when room+pass changes
  useEffect(() => {
    setIsLoadingDraft(true)
    setLoadedDraft(null)

    supabase
      .from('room_prompt_drafts')
      .select('prompt_text, updated_at')
      .eq('room_id', roomId)
      .eq('pass_number', passNumber)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setLoadedDraft(data.prompt_text)
          lastSavedPromptRef.current = data.prompt_text
          setSaveState({ status: 'saved', lastSavedAt: new Date(data.updated_at) })
        }
        setIsLoadingDraft(false)
      })
  }, [roomId, passNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  useEffect(() => {
    // Don't save empty prompts or unchanged prompts
    if (!prompt.trim() || prompt === lastSavedPromptRef.current) return

    setSaveState(s => ({ ...s, status: 'saving' }))

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
          .from('room_prompt_drafts')
          .upsert(
            {
              room_id:     roomId,
              pass_number: passNumber,
              prompt_text: prompt,
              user_id:     user.id,
              updated_at:  new Date().toISOString(),
            },
            { onConflict: 'room_id,pass_number' }
          )

        if (error) throw error

        lastSavedPromptRef.current = prompt
        setSaveState({ status: 'saved', lastSavedAt: new Date() })
      } catch (err) {
        console.warn('[useAutoSavePrompt] save failed:', err)
        setSaveState(s => ({ ...s, status: 'error' }))
        // Auto-reset to idle after 3 seconds
        setTimeout(() => setSaveState(s => ({ ...s, status: 'idle' })), 3000)
      }
    }, debounceMs)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [prompt, roomId, passNumber, debounceMs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear draft
  const clearDraft = useCallback(async () => {
    await supabase
      .from('room_prompt_drafts')
      .delete()
      .eq('room_id', roomId)
      .eq('pass_number', passNumber)
      .then(() => {})

    lastSavedPromptRef.current = ''
    setLoadedDraft(null)
    setSaveState({ status: 'idle', lastSavedAt: null })
  }, [supabase, roomId, passNumber])

  return {
    saveState,
    loadedDraft,
    isLoadingDraft,
    clearDraft,
  }
}

// AutoSaveIndicator JSX component lives in AutoSaveIndicator.tsx
// (cannot use JSX in a .ts file — use .tsx for components)
