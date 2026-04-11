'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { RoomType } from '@/types/database'

const ROOM_TYPES: RoomType[] = [
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
]

const PASS_NUMBERS = [1, 2, 3, 4, 5]

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  room_type: z.enum([...ROOM_TYPES] as const),
  style: z.string().min(3, 'Style must be at least 3 characters'),
  pass_number: z.coerce
    .number()
    .min(1)
    .max(5, 'Pass number must be between 1 and 5'),
  instruction: z.string().min(10, 'Instruction must be at least 10 characters'),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

export default function NewTemplatePage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: true,
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('prompt_templates')
        .insert({
          name: data.name,
          room_type: data.room_type,
          style: data.style,
          pass_number: data.pass_number,
          instruction: data.instruction,
          is_active: data.is_active,
          usage_count: 0,
          zero_revision_count: 0,
          success_rate: 0,
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        throw insertError
      }

      // Success
      reset()
      router.push('/library/templates')
      router.refresh()
    } catch (err) {
      console.error('Error creating template:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create template. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          Create New Template
        </h1>
        <p className="text-stone-600">
          Add a reusable prompt for generating high-quality renders
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g., Modern Living Room - Emerald Accent"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 placeholder-stone-500"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Room Type
            </label>
            <select
              {...register('room_type')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900"
            >
              <option value="">Select room type</option>
              {ROOM_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
            {errors.room_type && (
              <p className="text-xs text-red-600 mt-1">
                {errors.room_type.message}
              </p>
            )}
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Style
            </label>
            <input
              type="text"
              {...register('style')}
              placeholder="e.g., Modern Indian, Scandinavian, Minimalist"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 placeholder-stone-500"
            />
            {errors.style && (
              <p className="text-xs text-red-600 mt-1">{errors.style.message}</p>
            )}
          </div>

          {/* Pass Number */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Pass Number
            </label>
            <select
              {...register('pass_number')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900"
            >
              <option value="">Select pass number</option>
              {PASS_NUMBERS.map((pn) => (
                <option key={pn} value={pn}>
                  Pass {pn}
                </option>
              ))}
            </select>
            {errors.pass_number && (
              <p className="text-xs text-red-600 mt-1">
                {errors.pass_number.message}
              </p>
            )}
          </div>

          {/* Instruction */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Prompt Instruction
            </label>
            <textarea
              {...register('instruction')}
              placeholder="Write the detailed prompt instruction here..."
              rows={8}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 placeholder-stone-500"
            />
            {errors.instruction && (
              <p className="text-xs text-red-600 mt-1">
                {errors.instruction.message}
              </p>
            )}
          </div>

          {/* Active Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('is_active')}
              id="is_active"
              className="w-4 h-4 rounded border-stone-300 focus:ring-2 focus:ring-stone-500"
            />
            <label
              htmlFor="is_active"
              className="ml-2 text-sm text-stone-700 font-medium"
            >
              Active (make this template available for use)
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:bg-stone-400 transition-colors font-medium text-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-stone-200 text-stone-900 rounded-lg hover:bg-stone-300 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
