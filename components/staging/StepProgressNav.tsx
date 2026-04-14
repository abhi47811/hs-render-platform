'use client';

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface StepProgressNavProps {
  projectId: string;
  roomId: string;
  localCurrentPass: number;
  cpStatuses: { cp1: 'pending' | 'shared' | 'approved'; cp2: 'pending' | 'shared' | 'approved'; cp3: 'pending' | 'shared' | 'approved' };
}

const STEPS = [
  { key: 'setup',    label: 'Setup',     short: 'Setup',  path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/setup` },
  { key: 'pass-1',   label: 'Style Seed', short: '1',      path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/pass/1` },
  { key: 'pass-2',   label: 'Flooring',  short: '2',      path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/pass/2` },
  { key: 'pass-3',   label: 'Furniture', short: '3',      path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/pass/3` },
  { key: 'pass-4',   label: 'Accents',   short: '4',      path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/pass/4` },
  { key: 'pass-5',   label: 'Lighting',  short: '5',      path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/pass/5` },
  { key: 'pass-6',   label: 'Decor',     short: '6',      path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/pass/6` },
  { key: 'review',   label: 'Review',    short: 'Rev',    path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/review` },
  { key: 'deliver',  label: 'Deliver',   short: 'Del',    path: (p: string, r: string) => `/projects/${p}/rooms/${r}/staging/deliver` },
];

function getStepIndex(pathname: string): number {
  if (pathname.includes('/staging/deliver'))    return 8;
  if (pathname.includes('/staging/review'))     return 7;
  const passMatch = pathname.match(/\/staging\/pass\/(\d)/);
  if (passMatch) return parseInt(passMatch[1]); // pass/1 → index 1, pass/6 → index 6
  if (pathname.includes('/staging/setup'))      return 0;
  return -1;
}

function isStepAccessible(
  stepIndex: number,
  localCurrentPass: number,
  cpStatuses: StepProgressNavProps['cpStatuses'],
): boolean {
  if (stepIndex === 0) return true; // setup always accessible
  if (stepIndex >= 1 && stepIndex <= 6) {
    // pass pages: accessible if current_pass >= passNum OR cp1 approved
    const passNum = stepIndex;
    return localCurrentPass >= passNum || cpStatuses.cp1 === 'approved';
  }
  if (stepIndex === 7) return localCurrentPass >= 1; // review: at least one generate
  if (stepIndex === 8) return cpStatuses.cp3 === 'approved'; // deliver: cp3 approved
  return false;
}

function isStepComplete(
  stepIndex: number,
  localCurrentPass: number,
  cpStatuses: StepProgressNavProps['cpStatuses'],
): boolean {
  if (stepIndex === 0) return localCurrentPass >= 1; // setup complete when first pass started
  if (stepIndex >= 1 && stepIndex <= 6) return localCurrentPass > stepIndex; // pass complete when next pass started
  if (stepIndex === 7) return cpStatuses.cp3 === 'approved'; // review complete when cp3 approved
  if (stepIndex === 8) return false; // deliver never "complete"
  return false;
}

export function StepProgressNav({
  projectId,
  roomId,
  localCurrentPass,
  cpStatuses,
}: StepProgressNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeIndex = getStepIndex(pathname);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
      {STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = isStepComplete(index, localCurrentPass, cpStatuses);
        const isAccessible = isStepAccessible(index, localCurrentPass, cpStatuses);
        const isPassStep = index >= 1 && index <= 6;

        return (
          <button
            key={step.key}
            onClick={() => isAccessible && router.push(step.path(projectId, roomId))}
            disabled={!isAccessible}
            title={step.label}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
              isActive
                ? 'bg-stone-900 text-white'
                : isComplete
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : isAccessible
                ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                : 'bg-stone-50 text-stone-300 cursor-not-allowed border border-stone-100'
            )}
          >
            {isComplete && !isActive && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {isPassStep && (
              <span className={cn(
                'w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0',
                isActive ? 'bg-white text-stone-900'
                  : isComplete ? 'bg-emerald-500 text-white'
                  : isAccessible ? 'bg-stone-400 text-white'
                  : 'bg-stone-200 text-stone-400'
              )}>
                {index}
              </span>
            )}
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{step.short}</span>
          </button>
        );
      })}
    </div>
  );
}
