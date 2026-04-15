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
        <span className="text-[10px] font-semibold text-[var(--chrome-4)] uppercase tracking-wider">
          Staging Pipeline
        </span>
        <span className="text-[10px] text-[var(--chrome-4)]">
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
                'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-medium transition-all whitespace-nowrap border',
                isSelected
                  ? 'bg-[var(--chrome-0)] text-white border-transparent'
                  : isCompleted
                  ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok)] border-[var(--border)] hover:opacity-80'
                  : isNextPass
                  ? 'bg-[var(--status-warn-bg)] text-[var(--status-warn)] border-[var(--border)] hover:opacity-80'
                  : isCurrent && !isSelected
                  ? 'bg-[var(--surface-3)] text-[var(--chrome-3)] border-[var(--border)] hover:bg-[var(--chrome-6)]'
                  : 'bg-[var(--surface-2)] text-[var(--chrome-5)] cursor-not-allowed border-[var(--border)]'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                isCompleted ? 'bg-[var(--status-ok)]'
                  : isSelected ? 'bg-white'
                  : isCurrent ? 'bg-[var(--chrome-3)]'
                  : isNextPass ? 'bg-[var(--status-warn)]'
                  : 'bg-[var(--chrome-6)]'
              )} />
              {pass.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
