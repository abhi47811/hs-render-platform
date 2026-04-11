'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface PassSelectorProps {
  currentPass: number;
  selectedPass: number;
  onSelectPass: (pass: number) => void;
}

const PASSES = [
  { number: 1, name: 'Flooring' },
  { number: 2, name: 'Main Furniture' },
  { number: 3, name: 'Accent Pieces' },
  { number: 4, name: 'Lighting' },
  { number: 5, name: 'Decor' },
];

export function PassSelector({
  currentPass,
  selectedPass,
  onSelectPass,
}: PassSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-700">Staging Pipeline</h3>
      <div className="flex flex-col gap-2">
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
                'relative px-4 py-3 rounded-lg text-sm font-medium transition-all',
                'flex items-center justify-between',
                isSelected
                  ? 'bg-stone-800 text-white shadow-md'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200',
                isCompleted && !isSelected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : '',
                isNextPass && !isSelected
                  ? 'ring-2 ring-amber-400 bg-amber-50 text-stone-800'
                  : '',
                isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <span>
                Pass {pass.number}: {pass.name}
              </span>
              {isCompleted && (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          <strong>Next:</strong> Pass {currentPass + 1} -{' '}
          {PASSES[currentPass]?.name}
        </p>
      </div>
    </div>
  );
}
