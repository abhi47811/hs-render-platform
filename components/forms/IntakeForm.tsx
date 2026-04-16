'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { calculateSlaDeadline } from '@/lib/sla'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  full_name: string
  role: string
}

interface IntakeFormProps {
  teamMembers: TeamMember[]
}

// ─── Constants (must match DB check constraints) ──────────────────────────────

const CITIES = ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Chennai'] as const
const PROJECT_TYPES = ['New Flat', 'Renovation', 'Builder Unit', 'Office'] as const
const OCCUPANT_PROFILES = [
  'Single Professional',
  'Young Couple',
  'Family with Children',
  'Multi-Generational',
  'Elderly',
  'Corporate',
] as const
const BUDGET_BRACKETS = ['economy', 'standard', 'premium', 'luxury'] as const
const BUDGET_LABELS: Record<string, string> = {
  economy: 'Economy (< ₹5L)',
  standard: 'Standard (₹5–12L)',
  premium: 'Premium (₹12–25L)',
  luxury: 'Luxury (₹25L+)',
}
const VASTU_OPTIONS = ['No', 'Yes', 'Partial'] as const
const PRIORITIES = ['Normal', 'High', 'Urgent'] as const
const ROOM_TYPES = [
  'Living',
  'Master Bedroom',
  'Bedroom 2',
  'Kitchen',
  'Dining',
  'Study',
  'Office',
  'Bathroom',
  'Balcony',
  'Other',
] as const
const DESIGN_STYLES = [
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

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const roomSchema = z.object({
  room_name: z.string().min(1, 'Enter a room name'),
  room_type: z.enum(ROOM_TYPES, { required_error: 'Select room type' }),
  dimensions_l: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive('Must be > 0').optional()
  ),
  dimensions_w: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive('Must be > 0').optional()
  ),
  dimensions_h: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive('Must be > 0').optional()
  ),
})

const intakeSchema = z.object({
  client_name: z.string().min(2, 'Name must be at least 2 characters'),
  client_whatsapp: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  client_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  city: z.enum(CITIES, { required_error: 'Select a city' }),
  project_type: z.enum(PROJECT_TYPES, { required_error: 'Select project type' }),
  occupant_profile: z.enum(OCCUPANT_PROFILES, { required_error: 'Select occupant profile' }),
  budget_bracket: z.enum(BUDGET_BRACKETS, { required_error: 'Select a budget' }),
  primary_style: z.string().min(1, 'Select a primary style'),
  priority: z.enum(PRIORITIES).default('Normal'),
  assigned_to: z.string().uuid().optional(),
  vastu_required: z.enum(VASTU_OPTIONS).default('No'),
  vastu_notes: z.string().max(500).optional(),
  style_preferences: z.string().max(500).optional(),
  material_preferences: z.string().max(500).optional(),
  exclusions: z.string().max(500).optional(),
  rooms: z.array(roomSchema).min(1, 'Add at least one room'),
})

type IntakeFormValues = z.infer<typeof intakeSchema>

// ─── Select wrapper — adds custom arrow, prevents transparent bg ──────────────

function SelectField({ children, hasError }: { children: React.ReactNode; hasError?: boolean }) {
  return (
    <div className="relative">
      {children}
      {/* Custom dropdown arrow — always visible, never transparent */}
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={hasError ? 'text-red-400' : 'text-stone-400'}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IntakeForm({ teamMembers }: IntakeFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      priority: 'Normal',
      vastu_required: 'No',
      rooms: [{ room_name: '', room_type: undefined }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'rooms' })
  const vastuRequired = watch('vastu_required')

  // ─── Submit ────────────────────────────────────────────────────────────

  const onSubmit = async (values: IntakeFormValues) => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const slaDeadline = calculateSlaDeadline()

      // 0. Upload client reference images (if any) to client-refs bucket
      let clientReferenceUrls: string[] = []
      if (referenceFiles.length > 0) {
        setUploading(true)
        const uploads = await Promise.all(
          referenceFiles.map(async (file) => {
            const ext = file.name.split('.').pop() || 'jpg'
            const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('client-refs')
              .upload(path, file, { cacheControl: '3600', upsert: false })
            if (upErr) throw upErr
            const { data: pub } = supabase.storage.from('client-refs').getPublicUrl(path)
            return pub.publicUrl
          })
        )
        clientReferenceUrls = uploads
        setUploading(false)
      }

      // 1. Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_name: values.client_name,
          client_whatsapp: values.client_whatsapp,
          client_email: values.client_email || null,
          city: values.city,
          project_type: values.project_type,
          occupant_profile: values.occupant_profile,
          budget_bracket: values.budget_bracket,
          primary_style: values.primary_style,
          vastu_required: values.vastu_required,
          vastu_notes: values.vastu_notes || null,
          style_preferences: values.style_preferences || null,
          material_preferences: values.material_preferences || null,
          exclusions: values.exclusions || null,
          priority: values.priority,
          assigned_to: values.assigned_to || null,
          status: 'intake',
          sla_deadline: slaDeadline,
          total_api_cost: 0,
          client_reference_images: clientReferenceUrls,
        })
        .select('id')
        .single()

      if (projectError) throw projectError
      if (!project) throw new Error('Project creation failed')

      // 2. Create rooms
      const roomInserts = values.rooms.map((room) => ({
        project_id: project.id,
        room_name: room.room_name,
        room_type: room.room_type,
        status: 'not_started' as const,
        current_pass: 0,
        dimensions_l: room.dimensions_l ?? null,
        dimensions_w: room.dimensions_w ?? null,
        dimensions_h: room.dimensions_h ?? null,
      }))

      const { error: roomsError } = await supabase.from('rooms').insert(roomInserts)
      if (roomsError) throw roomsError

      // 3. Activity log (fire-and-forget)
      supabase.from('activity_log').insert({
        project_id: project.id,
        user_id: user.id,
        action_type: 'project_created',
        action_description: `Project created with ${values.rooms.length} room${values.rooms.length !== 1 ? 's' : ''}`,
        metadata: { rooms: values.rooms.length, city: values.city, priority: values.priority },
      }).then(() => {})

      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch (err) {
      console.error('Intake form error:', err)
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ─── Style helpers ─────────────────────────────────────────────────────

  // All inputs/selects: solid white bg, consistent border, min-h 44px for touch
  const inputClass = (hasError?: boolean) =>
    `w-full text-sm px-3 py-2.5 min-h-[44px] rounded-lg border bg-white text-stone-800 placeholder-stone-300 transition-colors focus:outline-none focus:ring-2 ${
      hasError
        ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
        : 'border-stone-200 focus:ring-stone-200 focus:border-stone-400'
    }`

  // Selects: same as inputs + appearance-none to remove OS arrow (we add our own)
  const selectClass = (hasError?: boolean) =>
    inputClass(hasError) + ' appearance-none cursor-pointer pr-8'

  const labelClass = 'block text-xs font-medium text-stone-600 mb-1.5'
  const errorClass = 'text-xs text-red-500 mt-1.5 flex items-center gap-1'
  const sectionClass = 'bg-white rounded-xl border border-stone-200 p-5'
  const sectionTitle = 'text-sm font-semibold text-stone-800 mb-4'

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

      {/* ══════════════════════════════════════════════
          LEFT COLUMN — core intake fields
      ══════════════════════════════════════════════ */}
      <div className="space-y-4">

      {/* ── Client Details ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Client Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Client Name *</label>
            <input
              {...register('client_name')}
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              className={inputClass(!!errors.client_name)}
            />
            {errors.client_name && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.client_name.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>WhatsApp Number *</label>
            <input
              {...register('client_whatsapp')}
              placeholder="9876543210"
              maxLength={10}
              inputMode="tel"
              autoComplete="tel"
              className={inputClass(!!errors.client_whatsapp)}
            />
            {errors.client_whatsapp && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.client_whatsapp.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Email <span className="text-stone-400 font-normal">(optional)</span></label>
            <input
              {...register('client_email')}
              type="email"
              placeholder="priya@example.com"
              autoComplete="email"
              inputMode="email"
              className={inputClass(!!errors.client_email)}
            />
            {errors.client_email && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.client_email.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Project Details ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Project Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City *</label>
            <SelectField hasError={!!errors.city}>
              <select {...register('city')} className={selectClass(!!errors.city)}>
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </SelectField>
            {errors.city && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.city.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Project Type *</label>
            <SelectField hasError={!!errors.project_type}>
              <select {...register('project_type')} className={selectClass(!!errors.project_type)}>
                <option value="">Select type</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </SelectField>
            {errors.project_type && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.project_type.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Occupant Profile *</label>
            <SelectField hasError={!!errors.occupant_profile}>
              <select {...register('occupant_profile')} className={selectClass(!!errors.occupant_profile)}>
                <option value="">Select profile</option>
                {OCCUPANT_PROFILES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </SelectField>
            {errors.occupant_profile && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.occupant_profile.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Budget Bracket *</label>
            <SelectField hasError={!!errors.budget_bracket}>
              <select {...register('budget_bracket')} className={selectClass(!!errors.budget_bracket)}>
                <option value="">Select budget</option>
                {BUDGET_BRACKETS.map((b) => <option key={b} value={b}>{BUDGET_LABELS[b]}</option>)}
              </select>
            </SelectField>
            {errors.budget_bracket && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.budget_bracket.message}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Primary Style *</label>
            <SelectField hasError={!!errors.primary_style}>
              <select {...register('primary_style')} className={selectClass(!!errors.primary_style)}>
                <option value="">Select design style</option>
                {DESIGN_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </SelectField>
            {errors.primary_style && (
              <p className={errorClass}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors.primary_style.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Assignment & Priority ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Assignment & Priority</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Priority</label>
            <SelectField>
              <select {...register('priority')} className={selectClass()}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </SelectField>
          </div>
          <div>
            <label className={labelClass}>Assign To <span className="text-stone-400 font-normal">(optional)</span></label>
            <SelectField>
              <select {...register('assigned_to')} className={selectClass()}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </SelectField>
          </div>
        </div>
      </div>

      {/* ── Rooms ── */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-stone-800">Rooms *</p>
          <button
            type="button"
            onClick={() => append({ room_name: '', room_type: undefined as never })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-400 rounded-lg px-3 py-2 min-h-[36px] transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            Add Room
          </button>
        </div>

        {errors.rooms && !Array.isArray(errors.rooms) && (
          <p className={errorClass + ' mb-4'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errors.rooms.message}
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Room {idx + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium min-h-[32px] px-2 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Room Name *</label>
                  <input
                    {...register(`rooms.${idx}.room_name`)}
                    placeholder="e.g. Master Bedroom"
                    className={inputClass(!!(errors.rooms?.[idx]?.room_name))}
                  />
                  {errors.rooms?.[idx]?.room_name && (
                    <p className={errorClass}>{errors.rooms[idx]?.room_name?.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Room Type *</label>
                  <SelectField hasError={!!(errors.rooms?.[idx]?.room_type)}>
                    <select
                      {...register(`rooms.${idx}.room_type`)}
                      className={selectClass(!!(errors.rooms?.[idx]?.room_type))}
                    >
                      <option value="">Select type</option>
                      {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </SelectField>
                  {errors.rooms?.[idx]?.room_type && (
                    <p className={errorClass}>{errors.rooms[idx]?.room_type?.message}</p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <label className={labelClass}>
                  Dimensions <span className="text-stone-400 font-normal">(optional · in feet)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dimensions_l', 'dimensions_w', 'dimensions_h'] as const).map((dim, di) => (
                    <div key={dim} className="relative">
                      <input
                        {...register(`rooms.${idx}.${dim}`)}
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={['L', 'W', 'H'][di]}
                        inputMode="decimal"
                        className={inputClass(!!(errors.rooms?.[idx]?.[dim]))}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] text-stone-300 font-medium">
                        {['L', 'W', 'H'][di]}
                      </span>
                    </div>
                  ))}
                </div>
                {(['dimensions_l', 'dimensions_w', 'dimensions_h'] as const).some(
                  (dim) => errors.rooms?.[idx]?.[dim]
                ) && (
                  <p className={errorClass}>All dimensions must be positive numbers</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>{/* end left column */}

      {/* ══════════════════════════════════════════════
          RIGHT COLUMN — preferences, refs, vastu, submit
      ══════════════════════════════════════════════ */}
      <div className="space-y-4">

      {/* ── Client Preferences ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>
          Client Preferences
          <span className="text-stone-400 font-normal ml-1.5 text-xs">(optional)</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Style Preferences</label>
            <textarea
              {...register('style_preferences')}
              rows={2}
              placeholder="e.g. Loves brass accents, prefers warm tones, likes open shelving…"
              className={inputClass() + ' resize-none min-h-0'}
            />
          </div>
          <div>
            <label className={labelClass}>Material Preferences</label>
            <textarea
              {...register('material_preferences')}
              rows={2}
              placeholder="e.g. Prefers marble countertops, anti-scratch for kids…"
              className={inputClass() + ' resize-none min-h-0'}
            />
          </div>
          <div>
            <label className={labelClass}>Exclusions</label>
            <textarea
              {...register('exclusions')}
              rows={2}
              placeholder="e.g. No dark colours, avoid glass furniture, no open kitchen…"
              className={inputClass() + ' resize-none min-h-0'}
            />
          </div>
        </div>
      </div>

      {/* ── Client Reference Images ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>
          Client Reference Images
          <span className="text-stone-400 font-normal ml-1.5 text-xs">(optional · inspiration shots, floorplans, existing photos)</span>
        </p>
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 hover:border-stone-400 bg-stone-50 py-6 px-4 cursor-pointer transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-xs font-medium text-stone-600">Click to upload — JPG, PNG, WebP</span>
          <span className="text-[10px] text-stone-400">Max 10 images, 5MB each</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              const valid = files.filter((f) => f.size <= 5 * 1024 * 1024)
              setReferenceFiles((prev) => [...prev, ...valid].slice(0, 10))
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
        {referenceFiles.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
            {referenceFiles.map((file, idx) => (
              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setReferenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Vastu ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Vastu Requirements</p>
        <div className="flex gap-5">
          {VASTU_OPTIONS.map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                type="radio"
                value={v}
                {...register('vastu_required')}
                className="w-4 h-4 accent-stone-800 cursor-pointer"
              />
              <span className="text-sm text-stone-700 select-none">{v}</span>
            </label>
          ))}
        </div>
        {(vastuRequired === 'Yes' || vastuRequired === 'Partial') && (
          <div className="mt-4">
            <label className={labelClass}>Vastu Notes</label>
            <textarea
              {...register('vastu_notes')}
              rows={2}
              placeholder="e.g. North-facing entrance, master bedroom in south-west…"
              className={inputClass() + ' resize-none min-h-0'}
            />
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {submitError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 flex items-center justify-between">
        <p className="text-xs text-stone-400">
          SLA clock starts immediately —<br />72-hour delivery window
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-stone-900 text-white text-sm font-semibold px-6 py-2.5 rounded-lg min-h-[44px] hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating project…
            </>
          ) : (
            <>
              Create Project
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </>
          )}
        </button>
      </div>

      </div>{/* end right column */}
      </div>{/* end grid */}
    </form>
  )
}
