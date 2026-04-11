'use client';

import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

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
}

interface GenerateResponse {
  success: boolean;
  render_ids?: string[];
  total_cost?: number;
  queue_id?: string;
  error?: string;
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
}: GenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt before generating');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/staging/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim() || success}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          success
            ? 'bg-emerald-600 text-white'
            : isLoading
              ? 'bg-blue-600 text-white'
              : prompt.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating ({variationCount} variations)...
          </>
        ) : success ? (
          <>
            <Zap className="w-4 h-4" />
            Generated Successfully!
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Generate Pass {passNumber}
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-700">
            <strong>Success!</strong> Renders are being generated. Check the
            gallery below.
          </p>
        </div>
      )}

      <div className="p-3 bg-stone-100 rounded-lg">
        <p className="text-xs text-stone-700 font-medium">
          Estimated Cost: ₹{(getCostPerImage(resolutionTier) * variationCount).toFixed(2)}
        </p>
        <p className="text-xs text-stone-600 mt-1">
          {variationCount} variation{variationCount > 1 ? 's' : ''} at {resolutionTier}
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
