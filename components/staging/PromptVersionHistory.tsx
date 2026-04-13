'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Draft {
  room_id: string;
  pass_number: number;
  prompt_text: string;
  updated_at: string;
}

interface PromptVersionHistoryProps {
  roomId: string;
  passNumber: number;
  onRestore: (promptText: string) => void;
}

export function PromptVersionHistory({
  roomId,
  passNumber,
  onRestore,
}: PromptVersionHistoryProps) {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);

  // Load drafts when expanded
  useEffect(() => {
    if (!expanded) return;

    setLoading(true);
    supabase
      .from('room_prompt_drafts')
      .select('room_id, pass_number, prompt_text, updated_at')
      .eq('room_id', roomId)
      .eq('pass_number', passNumber)
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) {
          setDrafts(data);
        }
        setLoading(false);
      });
  }, [expanded, roomId, passNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-[11px] font-medium hover:opacity-75 transition-opacity"
        style={{ color: 'var(--brand)' }}
      >
        History
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Saved Prompts
        </span>
        <button
          onClick={() => setExpanded(false)}
          className="text-[10px] hover:opacity-75 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[10px] text-stone-400 ml-2">Loading…</span>
        </div>
      ) : drafts.length === 0 ? (
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          No saved drafts for this pass
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {drafts.map((draft, index) => {
            const timestamp = new Date(draft.updated_at);
            const timeStr = timestamp.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = timestamp.toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            });
            const preview = draft.prompt_text.substring(0, 60).replace(/\n/g, ' ');

            return (
              <button
                key={index}
                onClick={() => {
                  onRestore(draft.prompt_text);
                  setExpanded(false);
                }}
                className="text-left p-2 rounded-lg border transition-colors hover:bg-white"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {preview}{draft.prompt_text.length > 60 ? '…' : ''}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {dateStr} {timeStr}
                    </p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 1 0 4 0M9 5a2 2 0 1 0 4 0m-6 9l4 4 4-4" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
