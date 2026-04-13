'use client';

import { cn } from '@/lib/utils';

interface PassSelectorProps {
  currentPass: number;
  selectedPass: number;
  onSelectPass: (pass: number) => void;
}

const PASSES = [
  { number: 1, name: 'Style Seed' },
  { number: 2, name: 'Flooring' },
  { number: 3, name: 'Main Furniture' },
  { number: 4, name: 'Accent Pieces' },
  { number: 5, name: 'Lighting' },
  { number: 6, name: 'Decor' },
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function PassSelector({
  currentPass,
  selectedPass,
  onSelectPass,
}: PassSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Staging Pipeline</h3>
      <div className="flex flex-col gap-1.5">
        {PASSES.map((pass) => {
          const isCompleted = pass.number <= currentPass;
          const isNextPass = pass.number === currentPass + 1;
          const isSelected = pass.number === selectedPass;
          const isFuture = pass.number > currentPass + 1;

          return (
            <button
              key={pass.number}
              onClick={() => !isFuture && onSelectPass(pass.number)}
              disabled={isFuture}
              className={cn(
                'relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                'flex items-center justify-between min-h-[44px]',
                isSelected
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200',
                isCompleted && !isSelected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : '',
                isNextPass && !isSelected
                  ? 'ring-2 ring-amber-400 bg-amber-50 text-stone-800'
                  : '',
                isFuture ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <span>
                Pass {pass.number}: {pass.name}
              </span>
              {isCompleted && (
                <span className="text-emerald-600">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
        <p className="text-xs text-stone-600">
          <span className="font-semibold">Next:</span> Pass {currentPass + 1} —{' '}
          {PASSES[currentPass]?.name}
        </p>
      </div>
    </div>
  );
}
