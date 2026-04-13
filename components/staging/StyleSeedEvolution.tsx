'use client';

import { useState, useMemo } from 'react';

interface Render {
  id: string;
  storage_url: string;
  thumbnail_url: string | null;
  pass_type: string;
  pass_number: number;
  status: string;
  created_at: string;
}

interface StyleSeedEvolutionProps {
  renders: Render[];
}

export function StyleSeedEvolution({ renders }: StyleSeedEvolutionProps) {
  const [expanded, setExpanded] = useState(false);

  // Filter to style_seed renders and sort by created_at
  const seedRenders = useMemo(() => {
    return renders
      .filter(r => r.pass_type === 'style_seed')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [renders]);

  if (seedRenders.length === 0) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const isApproved = (status: string) => {
    return status === 'team_approved' || status === 'client_approved' || status === 'approved';
  };

  return (
    <div className="mt-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-50 transition-colors"
        style={{ backgroundColor: 'var(--surface-2)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Style Evolution · {seedRenders.length} seed{seedRenders.length !== 1 ? 's' : ''}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded timeline */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="p-3 overflow-x-auto">
            <div className="flex gap-2" style={{ minWidth: 'fit-content' }}>
              {seedRenders.map((render, index) => {
                const approved = isApproved(render.status);
                return (
                  <div
                    key={render.id}
                    className="flex-shrink-0 flex flex-col items-center gap-1"
                    style={{ opacity: approved ? 1 : 0.4 }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative rounded-lg overflow-hidden"
                      style={{
                        width: '80px',
                        height: '80px',
                        border: approved ? `2px solid var(--brand)` : `1px solid var(--border)`,
                        backgroundColor: 'var(--surface)',
                      }}
                    >
                      {render.thumbnail_url || render.storage_url ? (
                        <img
                          src={render.thumbnail_url || render.storage_url}
                          alt={`Style seed ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--surface-2)' }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}

                      {/* Status badge (top-right corner) */}
                      {approved && (
                        <div
                          className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--brand)' }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Pass number */}
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      #{render.pass_number}
                    </span>

                    {/* Date */}
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(render.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
