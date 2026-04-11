'use client';

import { Render } from '@/types/database';
import { Check, Trash2, XCircle } from 'lucide-react';
import Image from 'next/image';

interface RenderGalleryProps {
  renders: Render[];
  onApprove: (renderId: string) => void;
  onReject: (renderId: string) => void;
}

const PASS_NAMES: Record<number, string> = {
  1: 'Flooring',
  2: 'Main Furniture',
  3: 'Accent Pieces',
  4: 'Lighting',
  5: 'Decor',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  generated: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Generated' },
  team_approved: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Team Approved',
  },
  client_approved: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Client Approved',
  },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  not_selected: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    label: 'Not Selected',
  },
};

export function RenderGallery({
  renders,
  onApprove,
  onReject,
}: RenderGalleryProps) {
  if (renders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-50 rounded-lg border-2 border-dashed border-stone-300">
        <div className="text-center">
          <p className="text-stone-600 font-medium">No renders yet</p>
          <p className="text-stone-500 text-sm">
            Generate passes to see results here
          </p>
        </div>
      </div>
    );
  }

  // Group renders by pass_number
  const rendersByPass = renders.reduce(
    (acc, render) => {
      if (!acc[render.pass_number]) {
        acc[render.pass_number] = [];
      }
      acc[render.pass_number].push(render);
      return acc;
    },
    {} as Record<number, Render[]>
  );

  const sortedPasses = Object.keys(rendersByPass)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {sortedPasses.map((passNumber) => (
        <div key={passNumber} className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">
            Pass {passNumber}: {PASS_NAMES[passNumber]}
          </h3>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 overflow-x-auto pb-2">
            {rendersByPass[passNumber].map((render) => {
              const statusConfig = STATUS_COLORS[render.status];
              const isEditable = render.status === 'generated';

              return (
                <div
                  key={render.id}
                  className="group relative bg-white rounded-lg border border-stone-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image Container */}
                  <div className="relative w-full h-48 bg-stone-100">
                    {render.storage_url ? (
                      <Image
                        src={render.storage_url}
                        alt={`Pass ${passNumber} - Variation ${render.variation_label}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-stone-400 text-sm">
                        Image loading...
                      </div>
                    )}

                    {/* Overlay - Variation & Status Badges */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex flex-col items-start justify-between p-2">
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-stone-800 text-white text-xs font-medium rounded">
                          {render.variation_label}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Action Buttons - Show on Hover */}
                      {isEditable && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onApprove(render.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => onReject(render.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-3 border-t border-stone-200 bg-stone-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-600">
                        {render.resolution_tier}
                      </span>
                      <span className="text-xs font-medium text-stone-700">
                        ₹{render.api_cost.toFixed(2)}
                      </span>
                    </div>
                    {render.created_at && (
                      <p className="text-xs text-stone-500 mt-1">
                        {new Date(render.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
