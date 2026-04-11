'use client';

import { useEffect, useState } from 'react';

interface PromptBuilderProps {
  roomType: string;
  primaryStyle: string;
  budgetBracket: string;
  passType: string;
  onPromptChange: (prompt: string) => void;
}

const PASS_TYPE_INSTRUCTIONS: Record<string, string> = {
  flooring:
    'Focus on floor material placement — marble/tile/hardwood as appropriate for style and budget. Show floor layout, material texture, and light reflection.',
  main_furniture:
    'Add primary furniture pieces — sofa, coffee table, bed frame etc. appropriate for room type. Ensure proportions match the room and maintain previous styling.',
  accent_pieces:
    'Layer accent furniture — side tables, rugs, cushions, decorative items. Add visual interest through textural variety and placement balance.',
  lighting:
    'Add lighting fixtures — ceiling light, floor lamps, accent lighting. Create warm ambiance and highlight architectural features and furnishings.',
  decor:
    'Final decor layer — artwork, plants, books, vases, personal touches. Complete the space with curated accessories that reflect style and personality.',
};

const BUDGET_DESCRIPTORS: Record<string, string> = {
  economy: 'budget-conscious, practical',
  standard: 'mid-range quality, balanced finishes',
  premium: 'high-end materials, sophisticated details',
  luxury: 'ultra-premium finishes, bespoke details, opulent',
};

export function PromptBuilder({
  roomType,
  primaryStyle,
  budgetBracket,
  passType,
  onPromptChange,
}: PromptBuilderProps) {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const passInstruction = PASS_TYPE_INSTRUCTIONS[passType] || '';
    const budgetDescriptor = BUDGET_DESCRIPTORS[budgetBracket] || 'quality';

    const basePrompt = `Interior design staging photograph. ${roomType} in ${primaryStyle} style. ${budgetDescriptor} tier. ${passInstruction} Photorealistic, professional interior photography, warm natural lighting, bright and inviting ambiance, 8K quality, studio-grade composition.`;

    setPrompt(basePrompt);
    onPromptChange(basePrompt);
  }, [roomType, primaryStyle, budgetBracket, passType, onPromptChange]);

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    onPromptChange(newPrompt);
  };

  const characterCount = prompt.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">
          Generation Prompt
        </h3>
        <span className="text-xs text-stone-500">
          {characterCount} characters
        </span>
      </div>

      <div className="space-y-2">
        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
          <p className="text-xs text-stone-600 leading-relaxed">
            <strong>Room:</strong> {roomType} • <strong>Style:</strong>{' '}
            {primaryStyle} • <strong>Budget:</strong> {budgetBracket}
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="w-full px-3 py-3 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
          placeholder="Enter your custom prompt..."
        />
      </div>

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-700">
          <strong>Tip:</strong> Edit the prompt to refine the generation. Include
          specific materials, colors, or design elements for better results.
        </p>
      </div>
    </div>
  );
}
