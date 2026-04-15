'use client';

import { useState, useEffect, useRef } from 'react';
import { FailureRecoveryPanel, detectFailureType } from './FailureRecoveryPanel';
import type { FailureType } from './FailureRecoveryPanel';

interface GenerateButtonProps {
  roomId: string;
  projectId: string;
  passNumber: number;
  passType: string;
  prompt: string;
  referenceUrls: string[];
  resolutionTier: '1K' | '2K' | '4K';
  variationCount: 1 | 2 | 3;
  onComplete: () => void;
  // Sec 31: prompt suggestion from failure recovery
  onPromptSuggestionAccepted?: (newPrompt: string) => void;
  // Checkpoint gates — CP1 gates Pass 1, CP2 gates Passes 2-5
  cp1Status?: 'pending' | 'shared' | 'approved';
  cp2Status?: 'pending' | 'shared' | 'approved';
  // Bug Fix 3: pass renders from DB so button stays disabled across page reloads
  // if a render for this pass is already in-flight (status generating/pending)
  existingRenders?: { pass_number: number; status: string }[];
}

interface GenerateResponse {
  success: boolean;
  render_ids?: string[];
  total_cost?: number;
  queue_id?: string;
  error?: string;
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/**
 * Determine if this pass is gated by a checkpoint.
 * Returns null if generation is allowed, or a string message if blocked.
 */
function getCheckpointBlockReason(
  passNumber: number,
  cp1Status?: 'pending' | 'shared' | 'approved',
  cp2Status?: 'pending' | 'shared' | 'approved',
): string | null {
  // Pass 1 (style seed): gated on CP1 (shell approval)
  if (passNumber === 1 && cp1Status && cp1Status !== 'approved') {
    return 'Shell must be approved (CP1) before generating the style seed.'
  }
  // Passes 2+ (flooring, main furniture, etc.): gated on CP2 (style seed approval)
  if (passNumber >= 2 && cp2Status && cp2Status !== 'approved') {
    return 'Approve the style seed (CP2) before generating styling passes.'
  }
  return null
}

export function GenerateButton({
  roomId,
  projectId,
  passNumber,
  passType,
  prompt,
  referenceUrls,
  resolutionTier,
  variationCount,
  onComplete,
  onPromptSuggestionAccepted,
  cp1Status,
  cp2Status,
  existingRenders = [],
}: GenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Sec 32: queued state — when API returns queue_id instead of render_ids
  const [queued, setQueued] = useState(false);
  // Sec 31: failure recovery
  const [failureType, setFailureType] = useState<FailureType | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Bug Fix 3: check if this pass already has an in-flight render in the DB
  // (survives page reloads — relies on server data, not local state)
  const hasActiveRender = existingRenders.some(
    (r) => r.pass_number === passNumber && (r.status === 'generating' || r.status === 'pending')
  );

  // E3: Generation mutex — synchronous ref-based lock that prevents double-trigger.
  // React state (setIsLoading) is async; two rapid clicks can both pass the `isLoading`
  // check before the first state update commits. The ref guard is synchronous and blocks
  // re-entry at the top of handleGenerate before any await.
  const isGeneratingRef = useRef(false);

  // Bug Fix 2: when queued, poll every 5s by calling onComplete so the parent
  // re-fetches renders; stop polling once renders appear or after 90s
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (queued) {
      pollCountRef.current = 0;
      pollRef.current = setInterval(() => {
        pollCountRef.current += 1;
        onComplete(); // triggers parent to re-fetch renders
        // stop after 18 polls (~90s) to avoid runaway intervals
        if (pollCountRef.current >= 18) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setQueued(false);
        }
      }, 5000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [queued]); // eslint-disable-line react-hooks/exhaustive-deps

  // Checkpoint gate check
  const checkpointBlock = getCheckpointBlockReason(passNumber, cp1Status, cp2Status);

  const handleGenerate = async () => {
    // E3: Synchronous mutex — block re-entry if a generation is already in flight
    if (isGeneratingRef.current) return;
    if (checkpointBlock) return;

    if (!prompt.trim()) {
      setError('Please enter a prompt before generating');
      return;
    }

    isGeneratingRef.current = true;
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setFailureType(null);

    // Abort controller — cancel the request after 120s to avoid infinite loading
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 120_000);

    try {
      const response = await fetch('/api/staging/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          room_id: roomId,
          project_id: projectId,
          pass_number: passNumber,
          pass_type: passType,
          prompt: prompt.trim(),
          reference_urls: referenceUrls,
          resolution_tier: resolutionTier,
          variation_count: variationCount,
        }),
      });
      clearTimeout(timeoutId);

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Sec 32: queued response (API returned queue_id instead of render_ids)
      if (data.queue_id && !data.render_ids?.length) {
        setQueued(true);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      clearTimeout(timeoutId);
      // Distinguish AbortError (our 120s timeout) from other errors
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const errorMessage = isTimeout
        ? 'Request timed out after 120 seconds. The generation may still be processing — check the renders gallery or try again.'
        : err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      // Sec 31: detect and set failure type for recovery panel
      const detected = detectFailureType(isTimeout ? 'timeout' : errorMessage);
      setFailureType(detected);
      setRetryCount(c => c + 1);
      console.error('Generation error:', err);
    } finally {
      isGeneratingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Checkpoint gate — shown above the button when a CP is blocking generation */}
      {checkpointBlock && (
        <div className="p-3 bg-[var(--status-warn-bg)] border border-[var(--border)] rounded-md flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-[var(--status-warn)]">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <p className="text-xs text-[var(--status-warn)] font-medium">{checkpointBlock}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim() || success || queued || !!checkpointBlock || hasActiveRender}
        className={`w-full py-2.5 px-5 rounded-pill font-medium text-sm transition-all flex items-center justify-center gap-2 min-h-[44px] ${
          checkpointBlock
            ? 'bg-[var(--chrome-7)] text-[var(--chrome-4)] cursor-not-allowed'
            : success
              ? 'bg-[var(--status-ok)] text-white'
              : hasActiveRender
                ? 'bg-[var(--status-warn)] text-white cursor-not-allowed'
                : queued
                  ? 'bg-[var(--status-warn)] text-white cursor-not-allowed'
                  : isLoading
                    ? 'bg-[var(--chrome-1)] text-white cursor-not-allowed'
                    : prompt.trim()
                      ? 'bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer shadow-sm'
                      : 'bg-[var(--chrome-6)] text-[var(--chrome-4)] cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            Generating ({variationCount} variation{variationCount > 1 ? 's' : ''})…
          </>
        ) : success ? (
          <>
            <CheckIcon />
            Generated Successfully!
          </>
        ) : hasActiveRender ? (
          <>
            <SpinnerIcon />
            Rendering in progress…
          </>
        ) : queued ? (
          <>
            {/* Queue icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Queued — processing shortly
          </>
        ) : checkpointBlock ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Checkpoint Required
          </>
        ) : (
          <>
            <ZapIcon />
            Generate Pass {passNumber}
          </>
        )}
      </button>

      {/* Sec 31: Failure Recovery Panel (replaces basic error div) */}
      {error && failureType && (
        <FailureRecoveryPanel
          failureType={failureType}
          errorMessage={error}
          originalPrompt={prompt}
          onPromptSuggestionAccepted={onPromptSuggestionAccepted}
          onRetry={handleGenerate}
          onQueue={() => {
            setError(null)
            setFailureType(null)
            setQueued(true)
            fetch('/api/staging/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_id: roomId, project_id: projectId,
                pass_number: passNumber, pass_type: passType,
                prompt: prompt.trim(), reference_urls: referenceUrls,
                resolution_tier: resolutionTier, variation_count: variationCount,
              }),
            }).catch(err => console.error('[Queue] error:', err))
          }}
          onDismiss={() => { setError(null); setFailureType(null) }}
          retryCount={retryCount}
        />
      )}
      {error && !failureType && (
        <div className="p-3 bg-[var(--status-error-bg)] border border-[var(--border)] rounded-md">
          <p className="text-xs text-[var(--status-error)]">
            <span className="font-medium">Error:</span> {error}
          </p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-[var(--status-ok-bg)] border border-[var(--border)] rounded-md">
          <p className="text-xs text-[var(--status-ok)]">
            <span className="font-medium">Success!</span> Renders are being generated. Check the gallery below.
          </p>
        </div>
      )}

      {/* Sec 32: Queued state banner */}
      {queued && (
        <div className="p-3 bg-[var(--status-warn-bg)] border border-[var(--border)] rounded-md">
          <p className="text-xs text-[var(--status-warn)]">
            <span className="font-medium">Queued!</span> Another generation is in progress. Checking for results every 5s — renders will appear automatically when ready.
          </p>
        </div>
      )}

      <div className="p-3 bg-[var(--surface-2)] rounded-md border border-[var(--border)]">
        <p className="text-xs text-[var(--text-primary)] font-medium tabular-nums">
          Estimated cost: ₹{(getCostPerImage(resolutionTier) * variationCount).toFixed(2)}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {variationCount} variation{variationCount > 1 ? 's' : ''} · {resolutionTier} resolution
        </p>
      </div>
    </div>
  );
}

function getCostPerImage(tier: '1K' | '2K' | '4K'): number {
  const costs: Record<string, number> = {
    '1K': 2.5,
    '2K': 6.0,
    '4K': 15.0,
  };
  return costs[tier] || 6.0;
}
