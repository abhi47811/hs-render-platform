'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  assemblePrompt,
  getDefaultPassInstruction,
  type PromptAssemblyInput,
  type PassType,
  type AssembledPrompt,
  type FloorPlanData,
} from '@/lib/prompt/assembler'
import { PromptBlockPreview } from './PromptBlockPreview'
import { FurnitureRefPicker } from './FurnitureRefPicker'
import { createClient } from '@/lib/supabase/client'

interface PromptBuilderProps {
  // Room context
  roomType: string
  roomName: string

  // Project context
  primaryStyle: string
  budgetBracket: string
  city: string
  occupantProfile: string
  vastuRequired: 'Yes' | 'No' | 'Partial'
  vastuNotes: string | null
  stylePreferences: string | null
  materialPreferences: string | null
  exclusions: string | null

  // Pass context
  passType: string
  passNumber: number

  // Locked room data
  spatialAnalysis: Record<string, unknown> | null
  colourPalette: Record<string, unknown> | null
  floorPlanData?: FloorPlanData | null

  // Reference counts (for moodboard/furniture blocks)
  moodboardCount?: number
  furnitureRefCount?: number

  // Sec 36: furniture ref URLs selected by picker
  furnitureRefUrls?: string[]
  onFurnitureRefsChange?: (urls: string[]) => void

  // Output callback
  onPromptChange: (prompt: string) => void

  // ── Tab-split support ────────────────────────────────────────────────────
  // 'instruction' → renders only the Pass Instruction block (textarea + pickers)
  // 'blocks'      → renders only header, block pills, context, locked-blocks, full prompt
  // 'all'         → renders everything (default, backward-compat)
  section?: 'all' | 'instruction' | 'blocks'

  // Controlled instruction value — when provided, overrides internal state
  instructionValue?: string
  onInstructionChange?: (val: string) => void
}

interface PromptTemplate {
  id: string
  name: string
  pass_type: string
  room_type: string | null
  instruction: string
  usage_count: number
  created_at: string
}

interface VaultEntry {
  id: string
  style_name: string
  image_url: string
  room_type: string | null
  budget_bracket: string | null
  city: string | null
  usage_count: number
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.99"/>
    </svg>
  )
}

function VaultIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <circle cx="12" cy="11" r="1" fill="currentColor"/>
    </svg>
  )
}

function TemplateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  )
}

const BLOCK_DOT_COLOURS: Record<number, string> = {
  1: 'bg-red-400',
  2: 'bg-stone-900',
  3: 'bg-amber-400',
  4: 'bg-blue-400',
  5: 'bg-purple-400',
  6: 'bg-pink-400',
  7: 'bg-teal-400',
  8: 'bg-emerald-400',
  9: 'bg-orange-400',
}

export function PromptBuilder({
  roomType,
  roomName,
  primaryStyle,
  budgetBracket,
  city,
  occupantProfile,
  vastuRequired,
  vastuNotes,
  stylePreferences,
  materialPreferences,
  exclusions,
  passType,
  passNumber,
  spatialAnalysis,
  colourPalette,
  floorPlanData,
  moodboardCount = 0,
  furnitureRefCount = 0,
  furnitureRefUrls: furnitureRefUrlsProp = [],
  onFurnitureRefsChange,
  onPromptChange,
  section,
  instructionValue,
  onInstructionChange,
}: PromptBuilderProps) {
  // Sec 36: local furniture ref state (controlled by prop if provided)
  const [selectedFurnitureRefs, setSelectedFurnitureRefs] = useState<string[]>(furnitureRefUrlsProp)
  const handleFurnitureRefsChange = useCallback((urls: string[]) => {
    setSelectedFurnitureRefs(urls)
    onFurnitureRefsChange?.(urls)
  }, [onFurnitureRefsChange])
  const supabase = createClient()
  const defaultInstruction = getDefaultPassInstruction(passType)
  const [passInstruction, setPassInstruction] = useState(defaultInstruction)

  // ── Tab-split: controlled instruction + section visibility ──────────────
  const effectiveInstruction = instructionValue !== undefined ? instructionValue : passInstruction
  const showInstruction = !section || section === 'all' || section === 'instruction'
  const showBlocks = !section || section === 'all' || section === 'blocks'

  const [assembled, setAssembled] = useState<AssembledPrompt | null>(null)
  const [showPreview, setShowPreview] = useState(false)

// ─── Template picker state ───────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const templateDropdownRef = useRef<HTMLDivElement>(null)

  // ─── Vault picker state (Sec 35) ─────────────────────────────
  const [showVault, setShowVault] = useState(false)
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([])
  const [loadingVault, setLoadingVault] = useState(false)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const vaultDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showTemplates) return
    const handler = (e: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTemplates])

  // Fetch templates when dropdown opens
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    setTemplateError(null)
    try {
      // Match on pass_type + (room_type matches or room_type is null = global templates)
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('id, name, pass_type, room_type, instruction, usage_count, created_at')
        .eq('pass_type', passType)
        .or(`room_type.eq.${roomType},room_type.is.null`)
        .order('usage_count', { ascending: false })
        .limit(20)

      if (error) throw error
      setTemplates(data ?? [])
    } catch (err) {
      console.error('[PromptBuilder] fetchTemplates error:', err)
      setTemplateError('Could not load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }, [supabase, passType, roomType])

  const handleOpenTemplates = () => {
    setShowTemplates(v => {
      if (!v) fetchTemplates()
      return !v
    })
  }

  const handleSelectTemplate = async (template: PromptTemplate) => {
    setPassInstruction(template.instruction)
    onInstructionChange?.(template.instruction)
    setShowTemplates(false)

    // Increment usage_count (fire-and-forget)
    supabase
      .from('prompt_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id)
      .then(({ error }) => {
        if (error) console.warn('[PromptBuilder] usage_count update failed:', error.message)
      })
  }

  // ─── Vault picker handlers (Sec 35) ──────────────────────────

  // Close vault dropdown on outside click
  useEffect(() => {
    if (!showVault) return
    const handler = (e: MouseEvent) => {
      if (vaultDropdownRef.current && !vaultDropdownRef.current.contains(e.target as Node)) {
        setShowVault(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showVault])

  const fetchVaultEntries = useCallback(async () => {
    setLoadingVault(true)
    setVaultError(null)
    try {
      const { data, error } = await supabase
        .from('style_vault')
        .select('id, style_name, image_url, room_type, budget_bracket, city, usage_count')
        .or(`room_type.eq.${roomType},room_type.is.null`)
        .order('usage_count', { ascending: false })
        .limit(24)
      if (error) throw error
      setVaultEntries(data ?? [])
    } catch (err) {
      console.error('[PromptBuilder] fetchVaultEntries error:', err)
      setVaultError('Could not load vault entries')
    } finally {
      setLoadingVault(false)
    }
  }, [supabase, roomType])

  const handleOpenVault = () => {
    setShowVault(v => {
      if (!v) fetchVaultEntries()
      return !v
    })
  }

  const handleSelectVaultEntry = (entry: VaultEntry) => {
    // Append style reference to the current instruction
    const refLine = `\n\nVault Reference: "${entry.style_name}" — ${entry.image_url}`
    const newVal = effectiveInstruction.trimEnd() + refLine
    setPassInstruction(newVal)
    onInstructionChange?.(newVal)
    setShowVault(false)
    // Increment usage_count (fire-and-forget)
    supabase
      .from('style_vault')
      .update({ usage_count: entry.usage_count + 1 })
      .eq('id', entry.id)
      .then(({ error }) => {
        if (error) console.warn('[PromptBuilder] vault usage_count update failed:', error.message)
      })
  }

  // Reset vault on pass type change
  useEffect(() => {
    setShowVault(false)
  }, [passType])

  // ─── Prompt assembly ─────────────────────────────────────────
  const buildInput = useCallback((): PromptAssemblyInput => ({
    room_type: roomType,
    room_name: roomName,
    primary_style: primaryStyle,
    budget_bracket: budgetBracket,
    city,
    occupant_profile: occupantProfile,
    vastu_required: vastuRequired,
    vastu_notes: vastuNotes,
    style_preferences: stylePreferences,
    material_preferences: materialPreferences,
    exclusions,
    pass_type: passType as PassType,
    pass_number: passNumber,
    pass_instruction: effectiveInstruction,
    spatial_analysis: spatialAnalysis as any,
    colour_palette: colourPalette as any,
    floor_plan_data: (floorPlanData as FloorPlanData) ?? null,
  }), [
    roomType, roomName, primaryStyle, budgetBracket, city,
    occupantProfile, vastuRequired, vastuNotes, stylePreferences,
    materialPreferences, exclusions, passType, passNumber, effectiveInstruction,
    spatialAnalysis, colourPalette, floorPlanData,
  ])

  // Re-assemble whenever any input changes
  useEffect(() => {
    const input = buildInput()
    const result = assemblePrompt(input, moodboardCount, furnitureRefCount)
    setAssembled(result)
    onPromptChange(result.final_prompt)
  }, [buildInput, moodboardCount, furnitureRefCount, onPromptChange])

  // Reset pass instruction when pass changes
  useEffect(() => {
    const newDefault = getDefaultPassInstruction(passType)
    setPassInstruction(newDefault)
    onInstructionChange?.(newDefault)
    setShowTemplates(false)
  }, [passType]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstructionChange = (val: string) => {
    setPassInstruction(val)
    onInstructionChange?.(val)
  }

  const handleReset = () => {
    setPassInstruction(defaultInstruction)
    onInstructionChange?.(defaultInstruction)
  }

  if (!assembled) return null

  const activeBlocks = assembled.blocks.filter(b => b.is_active)
  const hasLockedBlocks = activeBlocks.filter(b => !b.is_editable).length > 0

  return (
    <div className="space-y-4">
      {/* ── BLOCKS section: header, pills, context bar ── */}
      {showBlocks && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Generation Prompt</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 tabular-nums">{assembled.char_count.toLocaleString()} chars</span>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <EyeIcon />
                Preview blocks
              </button>
            </div>
          </div>

          {/* Block indicator strip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeBlocks.map((block) => (
              <div
                key={block.block_number}
                className="flex items-center gap-1 bg-white border border-stone-100 rounded-full px-2 py-0.5"
                title={`Block ${block.block_number}: ${block.label}${block.is_editable ? ' (Editable)' : ' (Auto)'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${BLOCK_DOT_COLOURS[block.block_number] ?? 'bg-stone-400'}`} />
                <span className="text-[9px] font-medium text-stone-500 leading-none">
                  B{block.block_number}
                </span>
                {block.is_editable && (
                  <span className="text-[8px] text-stone-900 font-bold leading-none">✎</span>
                )}
              </div>
            ))}
          </div>

          {/* Context bar */}
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-700">{roomType}</span>
              <span className="text-stone-300 mx-1">·</span>
              <span className="font-semibold text-stone-700">{primaryStyle}</span>
              <span className="text-stone-300 mx-1">·</span>
              <span className="text-stone-500">{budgetBracket}</span>
              <span className="text-stone-300 mx-1">·</span>
              <span className="text-stone-500">{city}</span>
              {vastuRequired !== 'No' && (
                <><span className="text-stone-300 mx-1">·</span><span className="text-orange-600 font-medium">Vastu {vastuRequired}</span></>
              )}
              {spatialAnalysis && (
                <><span className="text-stone-300 mx-1">·</span><span className="text-emerald-600 font-medium">Spatial locked</span></>
              )}
              {colourPalette && passNumber > 1 && (
                <><span className="text-stone-300 mx-1">·</span><span className="text-emerald-600 font-medium">Palette locked</span></>
              )}
            </p>
          </div>
        </>
      )}

      {/* ── INSTRUCTION section: Block 2 (Pass Instruction) ── */}
      {showInstruction && (
      <>{/* Block 2: Pass Instruction — ONLY EDITABLE BLOCK */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-stone-900" />
            Pass Instruction
            <span className="text-[9px] font-bold bg-stone-900 text-white px-1.5 py-0.5 rounded-full">BLOCK 2</span>
          </label>
          <div className="flex items-center gap-2">
            {/* Template picker button */}
            <div className="relative" ref={templateDropdownRef}>
              <button
                onClick={handleOpenTemplates}
                className={`flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg border ${
                  showTemplates
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700 bg-white'
                }`}
                title="Load a saved prompt template"
              >
                <TemplateIcon />
                Templates
              </button>

              {/* Template dropdown */}
              {showTemplates && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-stone-200 shadow-lg z-20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                      Templates · {passType} · {roomType}
                    </span>
                    {loadingTemplates && <SpinnerIcon />}
                  </div>

                  {templateError && (
                    <div className="px-3 py-3 text-xs text-red-600">{templateError}</div>
                  )}

                  {!loadingTemplates && !templateError && templates.length === 0 && (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-stone-400">No templates for this pass + room type yet.</p>
                      <p className="text-[10px] text-stone-300 mt-1">Templates are saved from the prompt_templates table.</p>
                    </div>
                  )}

                  {!loadingTemplates && templates.length > 0 && (
                    <div className="max-h-64 overflow-y-auto divide-y divide-stone-50">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-stone-800 truncate group-hover:text-stone-900">
                                {tpl.name}
                              </p>
                              <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {tpl.instruction.slice(0, 120)}{tpl.instruction.length > 120 ? '…' : ''}
                              </p>
                            </div>
                            <span className="flex-shrink-0 text-[9px] text-stone-300 tabular-nums mt-0.5">
                              ×{tpl.usage_count}
                            </span>
                          </div>
                          {tpl.room_type === null && (
                            <span className="mt-1 inline-block text-[8px] bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded-full">
                              Global
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vault picker button (Sec 35) */}
            <div className="relative" ref={vaultDropdownRef}>
              <button
                onClick={handleOpenVault}
                className={`flex items-center gap-1 text-[10px] font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg border ${
                  showVault
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700 bg-white'
                }`}
                title="Pick a style from the vault as reference"
              >
                <VaultIcon />
                Vault
              </button>

              {/* Vault dropdown */}
              {showVault && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-stone-200 shadow-lg z-20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                      Style Vault · {roomType}
                    </span>
                    {loadingVault && <SpinnerIcon />}
                  </div>

                  {vaultError && (
                    <div className="px-3 py-3 text-xs text-red-600">{vaultError}</div>
                  )}

                  {!loadingVault && !vaultError && vaultEntries.length === 0 && (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-stone-400">No vault entries yet for this room type.</p>
                      <p className="text-[10px] text-stone-300 mt-1">Entries are auto-saved when CP2 is approved.</p>
                    </div>
                  )}

                  {!loadingVault && vaultEntries.length > 0 && (
                    <div className="max-h-64 overflow-y-auto divide-y divide-stone-50">
                      {vaultEntries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => handleSelectVaultEntry(entry)}
                          className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors group flex items-center gap-2.5"
                        >
                          {/* Thumbnail */}
                          <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={entry.image_url}
                              alt={entry.style_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-stone-800 truncate group-hover:text-stone-900">
                              {entry.style_name}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {[entry.budget_bracket, entry.city].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-[9px] text-stone-300 tabular-nums">
                            ×{entry.usage_count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sec 36: Furniture Ref Picker */}
            <FurnitureRefPicker
              roomType={roomType}
              primaryStyle={primaryStyle}
              budgetBracket={budgetBracket}
              selectedUrls={selectedFurnitureRefs}
              maxSelections={6}
              onChange={handleFurnitureRefsChange}
            />

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              title="Reset to default instruction"
            >
              <ResetIcon />
              Reset
            </button>
          </div>
        </div>
        <textarea
          value={effectiveInstruction}
          onChange={(e) => handleInstructionChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-stone-900 bg-white text-stone-800 text-sm placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none leading-relaxed"
          placeholder="Describe what this pass should achieve…"
        />
        <p className="text-[10px] text-stone-400">
          This is the only editable block. All other blocks are auto-assembled and locked.
        </p>
      </div>
      </> /* end showInstruction */
      )}

      {/* ── BLOCKS section: locked blocks + full prompt ── */}
      {showBlocks && (
        <>
          {/* Locked blocks summary */}
          {hasLockedBlocks && (
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                <LockIcon />
                Auto-assembled blocks
              </div>
              <div className="grid grid-cols-2 gap-1">
                {activeBlocks.filter(b => !b.is_editable).map(block => (
                  <div key={block.block_number} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${BLOCK_DOT_COLOURS[block.block_number] ?? 'bg-stone-300'}`} />
                    <span className="text-[10px] text-stone-500">{block.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full prompt preview (collapsed) */}
          <details className="group">
            <summary className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer select-none flex items-center gap-1.5 py-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
                <path d="M9 18l6-6-6-6"/>
              </svg>
              Full assembled prompt
            </summary>
            <div className="mt-2 p-3 bg-white border border-stone-200 rounded-xl text-[10px] text-stone-500 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {assembled.final_prompt}
            </div>
          </details>
        </>
      )}

      {/* Block preview modal — always available */}
      {showPreview && assembled && (
        <PromptBlockPreview
          assembledPrompt={assembled}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
