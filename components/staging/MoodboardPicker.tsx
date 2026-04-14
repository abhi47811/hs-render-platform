'use client';

// MoodboardPicker — lets designers select up to 5 style vault images as
// moodboard references. Selected images fill Gemini slots 4–8.
// Falls back to URL-paste mode when vault has no matching entries.

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface MoodboardPickerProps {
  roomType: string;
  primaryStyle: string;
  selectedUrls: string[];
  maxSelections?: number; // default 5 (slots 4–8)
  onChange: (urls: string[]) => void;
}

interface VaultEntry {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  style_name: string;
  room_type: string | null;
}

export function MoodboardPicker({
  roomType,
  primaryStyle,
  selectedUrls,
  maxSelections = 5,
  onChange,
}: MoodboardPickerProps) {
  const supabase = createClient();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteUrl, setPasteUrl] = useState('');
  const [open, setOpen] = useState(false);

  // Fetch matching vault entries on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchEntries() {
      setLoading(true);
      try {
        // Primary: match room_type + style; fallback: all active entries
        const { data } = await supabase
          .from('style_vault')
          .select('id, image_url, thumbnail_url, style_name, room_type')
          .eq('is_active', true)
          .order('usage_count', { ascending: false })
          .limit(40);

        if (!cancelled && data) {
          // Sort: matching room_type first, then matching style
          const sorted = [...data].sort((a, b) => {
            const aRoom = a.room_type === roomType ? 2 : 0;
            const bRoom = b.room_type === roomType ? 2 : 0;
            const aStyle = a.style_name?.toLowerCase().includes(primaryStyle.toLowerCase()) ? 1 : 0;
            const bStyle = b.style_name?.toLowerCase().includes(primaryStyle.toLowerCase()) ? 1 : 0;
            return (bRoom + bStyle) - (aRoom + aStyle);
          });
          setEntries(sorted as VaultEntry[]);
        }
      } catch {
        // silent — vault may be empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEntries();
    return () => { cancelled = true; };
  }, [roomType, primaryStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (url: string) => {
    if (selectedUrls.includes(url)) {
      onChange(selectedUrls.filter(u => u !== url));
    } else if (selectedUrls.length < maxSelections) {
      onChange([...selectedUrls, url]);
    }
  };

  const handlePaste = () => {
    const url = pasteUrl.trim();
    if (!url || selectedUrls.includes(url)) return;
    if (selectedUrls.length >= maxSelections) return;
    onChange([...selectedUrls, url]);
    setPasteUrl('');
  };

  const removeUrl = (url: string) => onChange(selectedUrls.filter(u => u !== url));

  return (
    <div className="space-y-2">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-[11px] font-semibold text-stone-600 hover:text-stone-900 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Moodboard
        </span>
        <span className="flex items-center gap-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${selectedUrls.length > 0 ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'}`}>
            {selectedUrls.length}/{maxSelections}
          </span>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </button>

      {/* Selected thumbnails strip (always visible when items selected) */}
      {selectedUrls.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {selectedUrls.map((url, i) => (
            <div key={url} className="relative group">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-200">
                <Image src={url} alt={`Moodboard ${i + 1}`} width={40} height={40} className="object-cover w-full h-full" />
              </div>
              <button
                onClick={() => removeUrl(url)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Expanded picker */}
      {open && (
        <div className="border border-stone-200 rounded-xl bg-white overflow-hidden">
          {/* Vault grid */}
          {loading ? (
            <div className="p-4 text-center text-[11px] text-stone-400">Loading vault…</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center text-[11px] text-stone-400">No vault entries yet — paste a URL below</div>
          ) : (
            <div className="grid grid-cols-4 gap-0.5 p-1.5 max-h-44 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {entries.map(entry => {
                const imgUrl = entry.thumbnail_url ?? entry.image_url;
                const selected = selectedUrls.includes(imgUrl);
                const atMax = selectedUrls.length >= maxSelections && !selected;
                return (
                  <button
                    key={entry.id}
                    onClick={() => toggle(imgUrl)}
                    disabled={atMax}
                    title={entry.style_name}
                    className={`relative rounded-lg overflow-hidden aspect-square transition-all ${
                      selected
                        ? 'ring-2 ring-stone-900 ring-offset-1'
                        : atMax
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:ring-2 hover:ring-stone-400 hover:ring-offset-1'
                    }`}
                  >
                    <Image src={imgUrl} alt={entry.style_name} fill className="object-cover" sizes="60px" />
                    {selected && (
                      <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* URL paste row */}
          <div className="flex gap-1.5 p-1.5 border-t border-stone-100 bg-stone-50">
            <input
              type="url"
              value={pasteUrl}
              onChange={e => setPasteUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePaste()}
              placeholder="Or paste an image URL…"
              className="flex-1 px-2 py-1 text-[11px] rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
            <button
              onClick={handlePaste}
              disabled={!pasteUrl.trim() || selectedUrls.length >= maxSelections}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
