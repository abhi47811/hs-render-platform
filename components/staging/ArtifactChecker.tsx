'use client';

import { useState } from 'react';
import { ArtifactFlag } from '@/types/database';

// ─── Props ───────────────────────────────────────────────────────────────────
interface ArtifactCheckerProps {
  renderId: string;
  renderUrl: string;
  existingFlags: ArtifactFlag[] | null;
  /** Called when a scan completes so the parent can update its render list state */
  onFlagsUpdated: (renderId: string, flags: ArtifactFlag[], overallQuality: QualityResult) => void;
}

type CheckState = 'idle' | 'checking' | 'done' | 'error';
type QualityResult = 'pass' | 'warning' | 'fail';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function qualityFromFlags(flags: ArtifactFlag[]): QualityResult {
  if (flags.some(f => f.severity === 'Critical')) return 'fail';
  if (flags.some(f => f.severity === 'Major')) return 'warning';
  return 'pass';
}

const SEVERITY_CONFIG = {
  Critical: { pill: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' },
  Major:    { pill: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  Minor:    { pill: 'bg-stone-100 text-stone-600 border border-stone-200', dot: 'bg-stone-400' },
};

const QUALITY_CONFIG: Record<QualityResult, { label: string; bg: string; text: string; border: string }> = {
  pass:    { label: '✓ Clean', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  warning: { label: '⚠ Issues Found', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  fail:    { label: '✗ Critical Issues', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// ─── Icons ───────────────────────────────────────────────────────────────────
function ScanIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <circle cx="12" cy="12" r="3"/><path d="M12 5v2"/><path d="M12 17v2"/>
      <path d="M5 12H3"/><path d="M21 12h-2"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ArtifactChecker({
  renderId,
  renderUrl,
  existingFlags,
  onFlagsUpdated,
}: ArtifactCheckerProps) {
  const initialQuality = existingFlags ? qualityFromFlags(existingFlags) : null;

  const [state, setState] = useState<CheckState>(existingFlags !== null ? 'done' : 'idle');
  const [flags, setFlags] = useState<ArtifactFlag[]>(existingFlags ?? []);
  const [quality, setQuality] = useState<QualityResult | null>(initialQuality);
  const [error, setError] = useState<string | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleScan = async () => {
    setState('checking');
    setError(null);
    try {
      const res = await fetch('/api/renders/detect-artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ render_id: renderId, render_url: renderUrl }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const newFlags: ArtifactFlag[] = data.flags ?? [];
      const newQuality: QualityResult = data.overall_quality ?? 'pass';

      setFlags(newFlags);
      setQuality(newQuality);
      setAnalysisNotes(data.analysis_notes ?? '');
      setState('done');
      onFlagsUpdated(renderId, newFlags, newQuality);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setState('error');
    }
  };

  const handleRescan = () => {
    setState('idle');
    setFlags([]);
    setQuality(null);
    setOverrideEnabled(false);
    setExpanded(false);
  };

  // ─── Idle: show scan trigger ──────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="px-3 py-2 flex items-center justify-between bg-stone-50 border-t border-stone-100">
        <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">QC Check</span>
        <button
          onClick={handleScan}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-700 transition-colors min-h-[32px]"
        >
          <ScanIcon />
          Scan for Issues
        </button>
      </div>
    );
  }

  // ─── Checking ────────────────────────────────────────────────────────────
  if (state === 'checking') {
    return (
      <div className="px-3 py-2 flex items-center gap-2 bg-stone-50 border-t border-stone-100">
        <SpinnerIcon />
        <span className="text-[10px] text-stone-500">AI scanning for artifacts…</span>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="px-3 py-2 flex items-center justify-between bg-red-50 border-t border-red-100">
        <span className="text-[10px] text-red-600">{error ?? 'Scan failed'}</span>
        <button
          onClick={handleScan}
          className="text-[10px] font-semibold text-red-700 hover:text-red-900 min-h-[28px] px-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Done: show result ───────────────────────────────────────────────────
  const qConfig = quality ? QUALITY_CONFIG[quality] : QUALITY_CONFIG.pass;
  const hasCritical = flags.some(f => f.severity === 'Critical');

  return (
    <div className={`border-t ${qConfig.border}`}>
      {/* Quality badge row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-3 py-2 flex items-center justify-between ${qConfig.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold ${qConfig.text}`}>{qConfig.label}</span>
          {flags.length > 0 && (
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${qConfig.bg} ${qConfig.text} border ${qConfig.border}`}>
              {flags.length} flag{flags.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleRescan(); }}
            className={`text-[9px] font-medium ${qConfig.text} opacity-60 hover:opacity-100 min-h-[24px] px-1`}
          >
            Re-scan
          </button>
          <svg
            className={`transition-transform ${expanded ? 'rotate-180' : ''} ${qConfig.text}`}
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {/* Expanded flag detail */}
      {expanded && (
        <div className={`${qConfig.bg} border-t ${qConfig.border} px-3 py-2 space-y-2`}>
          {/* Flag list */}
          {flags.length === 0 ? (
            <p className="text-[10px] text-emerald-600">No issues detected. This render is clean.</p>
          ) : (
            <div className="space-y-1.5">
              {flags.map((flag, i) => {
                const sConfig = SEVERITY_CONFIG[flag.severity];
                return (
                  <div key={i} className="flex gap-2 items-start">
                    <div className={`w-1.5 h-1.5 rounded-full ${sConfig.dot} flex-shrink-0 mt-1`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold text-stone-700 capitalize">
                          {flag.issue.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${sConfig.pill}`}>
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-snug">{flag.location}</p>
                      <p className="text-[10px] text-stone-600 leading-snug mt-0.5">{flag.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analysis notes */}
          {analysisNotes && (
            <p className="text-[9px] text-stone-400 italic border-t border-stone-100 pt-1.5 mt-1.5">
              {analysisNotes}
            </p>
          )}

          {/* Critical override for senior team only */}
          {hasCritical && (
            <div className="border-t border-red-200 pt-2 mt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideEnabled}
                  onChange={e => setOverrideEnabled(e.target.checked)}
                  className="mt-0.5 accent-red-600"
                />
                <span className="text-[10px] text-red-600 font-medium leading-snug">
                  Override — I confirm these critical issues are acceptable and approve anyway
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exported helper for parent (RenderGallery) ───────────────────────────────
/**
 * Returns true if approve should be enabled.
 * Approve is blocked when there are Critical flags AND override is NOT set.
 * Minor/Major flags never block approve.
 */
export function isApproveBlocked(flags: ArtifactFlag[] | null): boolean {
  if (!flags || flags.length === 0) return false;
  return flags.some(f => f.severity === 'Critical');
}
