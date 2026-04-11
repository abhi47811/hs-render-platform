'use client';

import { useState } from 'react';
import { Render, Room } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { PassSelector } from '@/components/staging/PassSelector';
import { PromptBuilder } from '@/components/staging/PromptBuilder';
import { RenderGallery } from '@/components/staging/RenderGallery';
import { GenerateButton } from '@/components/staging/GenerateButton';
import { AlertCircle } from 'lucide-react';

interface StagingPageClientProps {
  room: Room & { projects: any };
  project: any;
  renders: Render[];
}

export function StagingPageClient({
  room,
  project,
  renders: initialRenders,
}: StagingPageClientProps) {
  const supabase = createClient();

  const [selectedPass, setSelectedPass] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [resolutionTier, setResolutionTier] = useState<'1K' | '2K' | '4K'>(
    '2K'
  );
  const [variationCount, setVariationCount] = useState<1 | 2 | 3>(1);
  const [renders, setRenders] = useState<Render[]>(initialRenders);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleApprove = async (renderId: string) => {
    try {
      const { error } = await supabase
        .from('renders')
        .update({ status: 'team_approved' })
        .eq('id', renderId);

      if (error) throw error;

      setRenders(
        renders.map((r) =>
          r.id === renderId ? { ...r, status: 'team_approved' } : r
        )
      );
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve render');
    }
  };

  const handleReject = async (renderId: string) => {
    try {
      const { error } = await supabase
        .from('renders')
        .update({ status: 'rejected' })
        .eq('id', renderId);

      if (error) throw error;

      setRenders(
        renders.map((r) =>
          r.id === renderId ? { ...r, status: 'rejected' } : r
        )
      );
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to reject render');
    }
  };

  const handleGenerateComplete = async () => {
    // Refresh renders from database
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('renders')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRenders(data);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPassType = (passNumber: number): string => {
    const passTypes: Record<number, string> = {
      1: 'flooring',
      2: 'main_furniture',
      3: 'accent_pieces',
      4: 'lighting',
      5: 'decor',
    };
    return passTypes[passNumber] || '';
  };

  const getReferenceUrls = (): string[] => {
    // Get approved renders from previous passes to use as references
    const previousRenders = renders.filter(
      (r) =>
        r.pass_number < selectedPass &&
        (r.status === 'team_approved' || r.status === 'client_approved')
    );

    return previousRenders
      .map((r) => r.storage_url)
      .filter((url): url is string => !!url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Controls */}
      <div className="lg:col-span-1 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{room.room_name}</h1>
          <p className="text-sm text-stone-600 mt-1">
            {room.room_type} • {project.primary_style}
          </p>
        </div>

        {/* Pass Selector */}
        <PassSelector
          currentPass={room.current_pass}
          selectedPass={selectedPass}
          onSelectPass={setSelectedPass}
        />

        {/* Prompt Builder */}
        <PromptBuilder
          roomType={room.room_type}
          primaryStyle={project.primary_style}
          budgetBracket={project.budget_bracket}
          passType={getPassType(selectedPass)}
          onPromptChange={setPrompt}
        />

        {/* Generation Settings */}
        <div className="space-y-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <h3 className="text-sm font-semibold text-stone-700">
            Generation Settings
          </h3>

          {/* Resolution Tier */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-700">
              Resolution
            </label>
            <select
              value={resolutionTier}
              onChange={(e) =>
                setResolutionTier(e.target.value as '1K' | '2K' | '4K')
              }
              className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1K">1K (Budget: ₹2.50)</option>
              <option value="2K">2K (Standard: ₹6.00)</option>
              <option value="4K">4K (Premium: ₹15.00)</option>
            </select>
          </div>

          {/* Variation Count */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-700">
              Variations
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  onClick={() => setVariationCount(count as 1 | 2 | 3)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    variationCount === count
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reference Info */}
        {getReferenceUrls().length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>References:</strong> {getReferenceUrls().length} previous
              render{getReferenceUrls().length !== 1 ? 's' : ''} will be used as
              input.
            </p>
          </div>
        )}

        {/* Generate Button */}
        <GenerateButton
          roomId={room.id}
          projectId={room.project_id}
          passNumber={selectedPass}
          passType={getPassType(selectedPass)}
          prompt={prompt}
          referenceUrls={getReferenceUrls()}
          resolutionTier={resolutionTier}
          variationCount={variationCount}
          onComplete={handleGenerateComplete}
        />

        {/* Info Box */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Each pass builds on the previous one. Approve renders before moving
            to the next stage.
          </p>
        </div>
      </div>

      {/* Right Panel - Render Gallery */}
      <div className="lg:col-span-2">
        <div className="sticky top-0 z-10 mb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Generated Renders
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Click renders to approve or reject
          </p>
        </div>

        {isRefreshing && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-700">Refreshing renders...</p>
          </div>
        )}

        <RenderGallery
          renders={renders}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}
