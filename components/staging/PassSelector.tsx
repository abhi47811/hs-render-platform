'use client';

import { cn } from '@/lib/utils';

interface PassSelectorProps {
  currentPass: number;
  selectedPass: number;
  onSelectPass: (pass: number) => void;
}

const PASSES = [
  { number: 1, name: 'Style Seed', short: 'Seed' },
  { number: 2, name: 'Flooring', short: 'Floor' },
  { number: 3, name: 'Main Furniture', short: 'Furniture' },
  { number: 4, name: 'Accent Pieces', short: 'Accents' },
  { number: 5, name: 'Lighting', short: 'Lighting' },
  { number: 6, name: 'Decor', short: 'Decor' },
];

export function PassSelector({
  currentPass,
  selectedPass,
  onSelectPass,
}: PassSelectorProps) {
  const selectedPassName = PASSES.find(p => p.number === selectedPass)?.name ?? '';

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
          Staging Pipeline
        </span>
        <span className="text-[10px] text-stone-500">
          Pass {selectedPass} · {selectedPassName}
        </span>
      </div>

      {/* Horizontal scrollable pill row */}
      <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {PASSES.map((pass) => {
          const isCompleted = pass.number < currentPass;
          const isCurrent = pass.number === currentPass;
          const isNextPass = pass.number === currentPass + 1;
          const isSelected = pass.number === selectedPass;
          const isFuture = pass.number > currentPass + 1;

          return (
            <button
              key={pass.number}
              onClick={() => !isFuture && onSelectPass(pass.number)}
              disabled={isFuture}
              title={`Pass ${pass.number}: ${pass.name}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
                isSelected
                  ? 'bg-stone-900 text-white'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : isNextPass
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 ring-1 ring-amber-400 hover:bg-amber-100'
                  : isCurrent && !isSelected
                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  : 'bg-stone-50 text-stone-300 cursor-not-allowed border border-stone-100'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                isCompleted ? 'bg-emerald-500'
                  : isSelected ? 'bg-white'
                  : isCurrent ? 'bg-stone-600'
                  : isNextPass ? 'bg-amber-500'
                  : 'bg-stone-200'
              )} />
              {pass.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
