'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@/lib/supabase/client'
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
})

const intakeSchema = z.object({
  // Client
  client_name: z.string().min(2, 'Name must be at least 2 characters'),
  client_whatsapp: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  client_email: z.string().email('Enter a valid email').optional().or(z.literal('')),

  // Project
  city: z.enum(CITIES, { required_error: 'Select a city' }),
  project_type: z.enum(PROJECT_TYPES, { required_error: 'Select project type' }),
  occupant_profile: z.enum(OCCUPANT_PROFILES, { required_error: 'Select occupant profile' }),
  budget_bracket: z.enum(BUDGET_BRACKETS, { required_error: 'Select a budget' }),
  primary_style: z.string().min(1, 'Select a primary style'),
  priority: z.enum(PRIORITIES).default('Normal'),
  assigned_to: z.string().uuid().optional(),

  // Vastu
  vastu_required: z.enum(VASTU_OPTIONS).default('No'),
  vastu_notes: z.string().max(500).optional(),

  // Preferences
  style_preferences: z.string().max(500).optional(),
  material_preferences: z.string().max(500).optional(),
  exclusions: z.string().max(500).optional(),

  // Rooms
  rooms: z.array(roomSchema).min(1, 'Add at least one room'),
})

type IntakeFormValues = z.infer<typeof intakeSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export function IntakeForm({ teamMembers }: IntakeFormProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
        })
        .select('id')
        .single()

      if (projectError) throw projectError
      if (!project) throw new Error('Project creation failed')

      // 2. Create rooms
      const roomInserts = values.rooms.map((room, idx) => ({
        project_id: project.id,
        room_name: room.room_name,
        room_type: room.room_type,
        status: 'not_started' as const,
        current_pass: 0,
      }))

      const { error: roomsError } = await supabase.from('rooms').insert(roomInserts)
      if (roomsError) throw roomsError

      // 3. Activity log
      await supabase.from('activity_log').insert({
        project_id: project.id,
        user_id: user.id,
        action_type: 'project_created',
        action_description: `Project created with ${values.rooms.length} room${values.rooms.length !== 1 ? 's' : ''}`,
        metadata: {
          rooms: values.rooms.length,
          city: values.city,
          priority: values.priority,
        },
      })

      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch (err) {
      console.error('Intake form error:', err)
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
      setSubmitting(false)
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  const fieldClass = (hasError?: boolean) =>
    `w-full text-sm px-3 py-2 rounded-md border ${
      hasError
        ? 'border-red-400 focus:ring-red-300'
        : 'border-stone-200 focus:ring-stone-300'
    } focus:outline-none focus:ring-2 transition-colors bg-white text-stone-800`

  const labelClass = 'block text-xs font-medium text-stone-600 mb-1'
  const errorClass = 'text-xs text-red-500 mt-1'
  const sectionClass = 'bg-white rounded-lg border border-stone-200 p-5'
  const sectionTitle = 'text-sm font-semibold text-stone-700 mb-4'

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ── Client Details ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Client Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Client Name *</label>
            <input
              {...register('client_name')}
              placeholder="e.g. Priya Sharma"
              className={fieldClass(!!errors.client_name)}
            />
            {errors.client_name && <p className={errorClass}>{errors.client_name.message}</p>}
          </div>
          <div>
            <label className={labelClass}>WhatsApp Number *</label>
            <input
              {...register('client_whatsapp')}
              placeholder="9876543210"
              maxLength={10}
              className={fieldClass(!!errors.client_whatsapp)}
            />
            {errors.client_whatsapp && (
              <p className={errorClass}>{errors.client_whatsapp.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Email (optional)</label>
            <input
              {...register('client_email')}
              type="email"
              placeholder="priya@example.com"
              className={fieldClass(!!errors.client_email)}
            />
            {errors.client_email && <p className={errorClass}>{errors.client_email.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Project Details ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Project Details</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City *</label>
            <select {...register('city')} className={fieldClass(!!errors.city)}>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.city && <p className={errorClass}>{errors.city.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Project Type *</label>
            <select
              {...register('project_type')}
              className={fieldClass(!!errors.project_type)}
            >
              <option value="">Select type</option>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.project_type && <p className={errorClass}>{errors.project_type.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Occupant Profile *</label>
            <select
              {...register('occupant_profile')}
              className={fieldClass(!!errors.occupant_profile)}
            >
              <option value="">Select profile</option>
              {OCCUPANT_PROFILES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {errors.occupant_profile && (
              <p className={errorClass}>{errors.occupant_profile.message}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Budget *</label>
            <select
              {...register('budget_bracket')}
              className={fieldClass(!!errors.budget_bracket)}
            >
              <option value="">Select budget</option>
              {BUDGET_BRACKETS.map((b) => (
                <option key={b} value={b}>{BUDGET_LABELS[b]}</option>
              ))}
            </select>
            {errors.budget_bracket && (
              <p className={errorClass}>{errors.budget_bracket.message}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Primary Style *</label>
            <select
              {...register('primary_style')}
              className={fieldClass(!!errors.primary_style)}
            >
              <option value="">Select style</option>
              {DESIGN_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.primary_style && (
              <p className={errorClass}>{errors.primary_style.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Assignment ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Assignment & Priority</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Priority</label>
            <select {...register('priority')} className={fieldClass()}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Assign To (optional)</label>
            <select {...register('assigned_to')} className={fieldClass()}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Preferences ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Client Preferences (optional)</p>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Style Preferences</label>
            <textarea
              {...register('style_preferences')}
              rows={2}
              placeholder="e.g. Loves brass accents, prefers warm tones, likes open shelving..."
              className={fieldClass()}
            />
          </div>
          <div>
            <label className={labelClass}>Material Preferences</label>
            <textarea
              {...register('material_preferences')}
              rows={2}
              placeholder="e.g. Prefers marble countertops, anti-scratch surfaces for kids..."
              className={fieldClass()}
            />
          </div>
          <div>
            <label className={labelClass}>Exclusions</label>
            <textarea
              {...register('exclusions')}
              rows={2}
              placeholder="e.g. No dark colours, avoid glass furniture, no open kitchen..."
              className={fieldClass()}
            />
          </div>
        </div>
      </div>

      {/* ── Vastu ── */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Vastu Requirements</p>
        <div className="flex gap-4">
          {VASTU_OPTIONS.map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={v}
                {...register('vastu_required')}
                className="accent-stone-700"
              />
              <span className="text-sm text-stone-700">{v}</span>
            </label>
          ))}
        </div>
        {(vastuRequired === 'Yes' || vastuRequired === 'Partial') && (
          <div className="mt-3">
            <label className={labelClass}>Vastu Notes</label>
            <textarea
              {...register('vastu_notes')}
              rows={2}
              placeholder="e.g. North-facing entrance, master bedroom in south-west..."
              className={fieldClass()}
            />
          </div>
        )}
      </div>

      {/* ── Rooms ── */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <p className={sectionTitle + ' mb-0'}>Rooms *</p>
          <button
            type="button"
            onClick={() => append({ room_name: '', room_type: undefined as never })}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-800 border border-stone-200 rounded px-2.5 py-1 hover:border-stone-300 transition-colors"
          >
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
            >
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
            Add Room
          </button>
        </div>

        {errors.rooms && !Array.isArray(errors.rooms) && (
          <p className={errorClass + ' mb-3'}>{errors.rooms.message}</p>
        )}

        <div className="space-y-2.5">
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="border border-stone-100 rounded-md p-3 bg-stone-50"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-stone-500">Room {idx + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Room Name *</label>
                  <input
                    {...register(`rooms.${idx}.room_name`)}
                    placeholder="e.g. Master Bedroom"
                    className={fieldClass(!!(errors.rooms?.[idx]?.room_name))}
                  />
                  {errors.rooms?.[idx]?.room_name && (
                    <p className={errorClass}>{errors.rooms[idx]?.room_name?.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Room Type *</label>
                  <select
                    {...register(`rooms.${idx}.room_type`)}
                    className={fieldClass(!!(errors.rooms?.[idx]?.room_type))}
                  >
                    <option value="">Select type</option>
                    {ROOM_TYPES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {errors.rooms?.[idx]?.room_type && (
                    <p className={errorClass}>{errors.rooms[idx]?.room_type?.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error + Submit ── */}
      {submitError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-stone-400">
          SLA clock starts immediately on submission (72 hours)
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-stone-800 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating…
            </>
          ) : (
            'Create Project →'
          )}
        </button>
      </div>
    </form>
  )
}
