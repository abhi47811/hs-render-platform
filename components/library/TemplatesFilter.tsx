'use client'

interface TemplatesFilterProps {
  roomTypes: string[]
  passNumbers: number[]
  currentRoomType?: string
  currentPassNumber?: string
}

export default function TemplatesFilter({
  roomTypes,
  passNumbers,
  currentRoomType,
  currentPassNumber,
}: TemplatesFilterProps) {
  function handleRoomTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URLSearchParams(window.location.search)
    if (e.target.value) {
      url.set('room_type', e.target.value)
    } else {
      url.delete('room_type')
    }
    if (currentPassNumber) url.set('pass_number', currentPassNumber)
    window.location.search = url.toString()
  }

  function handlePassNumberChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URLSearchParams(window.location.search)
    if (e.target.value) {
      url.set('pass_number', e.target.value)
    } else {
      url.delete('pass_number')
    }
    if (currentRoomType) url.set('room_type', currentRoomType)
    window.location.search = url.toString()
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Filters</p>
      <div className="flex gap-4 flex-wrap">
        {/* Room Type Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-stone-600">Room Type</label>
          <div className="relative">
            <select
              defaultValue={currentRoomType || ''}
              onChange={handleRoomTypeChange}
              className="appearance-none px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
            >
              <option value="">All Rooms</option>
              {roomTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Pass Number Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-stone-600">Pass</label>
          <div className="relative">
            <select
              defaultValue={currentPassNumber || ''}
              onChange={handlePassNumberChange}
              className="appearance-none px-3 py-2 pr-8 border border-stone-300 rounded-lg bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer"
            >
              <option value="">All Passes</option>
              {passNumbers.map((pn) => (
                <option key={pn} value={pn}>
                  Pass {pn}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
