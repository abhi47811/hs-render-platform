'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

const ROOM_TYPE_ICONS: Record<string, string> = {
  'Living':         '🛋',
  'Master Bedroom': '🛏',
  'Bedroom 2':      '🛏',
  'Kitchen':        '🍳',
  'Dining':         '🍽',
  'Study':          '📚',
  'Office':         '💼',
  'Bathroom':       '🚿',
  'Balcony':        '🌿',
  'Other':          '📐',
}

interface AddRoomFormProps {
  projectId: string
  projectName: string
}

export function AddRoomForm({ projectId, projectName }: AddRoomFormProps) {
  const router = useRouter()

  const [roomName, setRoomName]     = useState('')
  const [roomType, setRoomType]     = useState<string>('')
  const [dimL, setDimL]             = useState('')
  const [dimW, setDimW]             = useState('')
  const [dimH, setDimH]             = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Auto-fill room name when type selected and name is still empty
  function handleTypeChange(type: string) {
    setRoomType(type)
    if (!roomName.trim()) {
      setRoomName(type)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!roomName.trim() || !roomType) {
      setError('Room name and type are required.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/rooms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          room_name:    roomName.trim(),
          room_type:    roomType,
          dimensions_l: dimL ? parseFloat(dimL) : null,
          dimensions_w: dimW ? parseFloat(dimW) : null,
          dimensions_h: dimH ? parseFloat(dimH) : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to add room')
      }

      // Navigate to the project page to see the new room card
      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  const inputBase =
    'w-full px-3.5 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition'

  const labelBase = 'block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Room Name */}
      <div>
        <label className={labelBase}>Room Name</label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g. Master Bedroom, Living Room 2"
          maxLength={60}
          className={inputBase}
          required
        />
        <p className="text-xs text-stone-400 mt-1">
          A clear name — visible in breadcrumbs and reports.
        </p>
      </div>

      {/* Room Type grid */}
      <div>
        <label className={labelBase}>Room Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROOM_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium text-left transition-all cursor-pointer ${
                roomType === type
                  ? 'border-stone-900 bg-stone-900 text-white shadow'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
              }`}
            >
              <span>{ROOM_TYPE_ICONS[type]}</span>
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions (optional) */}
      <div>
        <label className={labelBase}>
          Dimensions — optional{' '}
          <span className="normal-case font-normal text-stone-400">(in feet)</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Length', value: dimL, setter: setDimL },
            { label: 'Width',  value: dimW, setter: setDimW },
            { label: 'Height', value: dimH, setter: setDimH },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <p className="text-xs text-stone-500 mb-1">{label}</p>
              <input
                type="number"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder="0"
                min={0}
                max={999}
                step={0.5}
                className={inputBase}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Used in Spatial Analysis and prompt generation.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary + Submit */}
      {roomType && roomName.trim() && (
        <div className="bg-stone-50 rounded-lg border border-stone-200 px-4 py-3 text-sm text-stone-700">
          Adding <strong>{roomName.trim()}</strong> ({roomType}) to{' '}
          <strong>{projectName}</strong> — 3 checkpoints will be initialised automatically.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !roomName.trim() || !roomType}
        className="w-full bg-stone-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? 'Adding Room…' : 'Add Room to Project'}
      </button>
    </form>
  )
}
