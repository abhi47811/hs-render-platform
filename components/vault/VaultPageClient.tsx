'use client';

import VaultCard from '@/components/library/VaultCard';
import { VaultSearchEnhanced } from '@/components/vault/VaultSearchEnhanced';
import { StyleVaultEntry } from '@/types/database';

interface VaultPageClientProps {
  entries: StyleVaultEntry[];
}

export function VaultPageClient({ entries }: VaultPageClientProps) {
  return (
    <VaultSearchEnhanced entries={entries} children={(filtered) => (
      <>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="w-12 h-12 text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <h2 className="text-base font-semibold text-stone-700 mb-1">
              No styles found
            </h2>
            <p className="text-stone-400 text-sm max-w-md">
              Try adjusting your filters to discover more design references
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((entry) => (
              <VaultCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </>
    )} />
  );
}
