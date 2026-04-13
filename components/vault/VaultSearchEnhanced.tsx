'use client';

import { useState, useMemo } from 'react';
import { StyleVaultEntry, RoomType, BudgetBracket, City } from '@/types/database';

interface VaultSearchEnhancedProps {
  entries: StyleVaultEntry[];
  children: (filtered: StyleVaultEntry[]) => React.ReactNode;
}

export function VaultSearchEnhanced({
  entries,
  children,
}: VaultSearchEnhancedProps) {
  // ── Search and filter state ─────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<string>('');

  // ── Extract unique filter options ────────────────────────────
  const filterOptions = useMemo(() => {
    const roomTypes = Array.from(
      new Set(entries.map(e => e.room_type).filter(Boolean))
    ) as RoomType[];

    const cities = Array.from(
      new Set(entries.map(e => e.city).filter(Boolean))
    ) as City[];

    const budgets = Array.from(
      new Set(entries.map(e => e.budget_bracket).filter(Boolean))
    ) as BudgetBracket[];

    return { roomTypes, cities, budgets };
  }, [entries]);

  // ── Filter entries ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return entries.filter(entry => {
      // Text search (style_name)
      if (
        searchQuery &&
        !entry.style_name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Room type filter
      if (
        selectedRoomTypes.size > 0 &&
        (!entry.room_type || !selectedRoomTypes.has(entry.room_type))
      ) {
        return false;
      }

      // City filter
      if (selectedCity && entry.city !== selectedCity) {
        return false;
      }

      // Budget filter
      if (selectedBudget && entry.budget_bracket !== selectedBudget) {
        return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedRoomTypes, selectedCity, selectedBudget]);

  // ── Toggle room type ────────────────────────────────────────
  const toggleRoomType = (roomType: string) => {
    const newSet = new Set(selectedRoomTypes);
    if (newSet.has(roomType)) {
      newSet.delete(roomType);
    } else {
      newSet.add(roomType);
    }
    setSelectedRoomTypes(newSet);
  };

  // ── Clear all filters ────────────────────────────────────────
  const hasActiveFilters =
    searchQuery || selectedRoomTypes.size > 0 || selectedCity || selectedBudget;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRoomTypes(new Set());
    setSelectedCity('');
    setSelectedBudget('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5Z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search styles…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--brand)',
          } as React.CSSProperties}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
        {/* Room Type Pills */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Room Type
          </label>
          <div className="flex flex-wrap gap-2">
            {filterOptions.roomTypes.map(roomType => (
              <button
                key={roomType}
                onClick={() => toggleRoomType(roomType)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                style={{
                  backgroundColor: selectedRoomTypes.has(roomType)
                    ? 'var(--brand)'
                    : 'var(--surface)',
                  borderColor: selectedRoomTypes.has(roomType)
                    ? 'var(--brand)'
                    : 'var(--border)',
                  color: selectedRoomTypes.has(roomType)
                    ? 'white'
                    : 'var(--text-primary)',
                }}
              >
                {roomType}
              </button>
            ))}
          </div>
        </div>

        {/* City Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            City
          </label>
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--brand)',
            } as React.CSSProperties}
          >
            <option value="">All Cities</option>
            {filterOptions.cities.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Budget Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Budget
          </label>
          <select
            value={selectedBudget}
            onChange={e => setSelectedBudget(e.target.value)}
            className="px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--brand)',
            } as React.CSSProperties}
          >
            <option value="">All Budgets</option>
            {filterOptions.budgets.map(budget => (
              <option key={budget} value={budget}>
                {budget.charAt(0).toUpperCase() + budget.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Active filters + Clear button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} of {entries.length} styles
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-medium hover:opacity-75 transition-opacity"
              style={{ color: 'var(--brand)' }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Render children with filtered entries */}
      {children(filtered)}
    </div>
  );
}
