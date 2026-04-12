'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ShellViewerProps {
  originalUrl: string | null
  enhancedUrl: string | null
  roomName: string
}

export function ShellViewer({ originalUrl, enhancedUrl, roomName }: ShellViewerProps) {
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced'>('original')

  if (!originalUrl && !enhancedUrl) {
    return (
      <div className="w-full rounded-xl border border-stone-200 bg-stone-50 p-12 text-center">
        {/* SVG camera icon — no emoji */}
        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-stone-600">No shell photo yet</p>
        <p className="text-xs text-stone-400 mt-1">Upload a photo to begin staging</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Tab selector — stone design system (no blue) */}
      {originalUrl && enhancedUrl && (
        <div className="flex gap-0 mb-4 border-b border-stone-200">
          {(['original', 'enhanced'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors capitalize min-h-[44px] cursor-pointer',
                activeTab === tab
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              )}
            >
              {tab}
            </button>
          ))}
          {/* Enhanced badge */}
          {activeTab === 'enhanced' && (
            <span className="ml-auto self-center mr-0.5 text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
              AI Enhanced
            </span>
          )}
        </div>
      )}

      {/* Image container — max-height so tall images don't push content off screen */}
      <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center">
        {activeTab === 'original' && originalUrl && (
          <img
            src={originalUrl}
            alt={`${roomName} — original shell`}
            className="w-full max-h-[420px] object-contain block"
            loading="lazy"
          />
        )}
        {activeTab === 'enhanced' && enhancedUrl && (
          <img
            src={enhancedUrl}
            alt={`${roomName} — enhanced shell`}
            className="w-full max-h-[420px] object-contain block"
            loading="lazy"
          />
        )}
        {activeTab === 'enhanced' && !enhancedUrl && (
          <div className="py-14 text-center">
            <div className="w-10 h-10 rounded-xl bg-stone-200 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-stone-600">Enhanced shell not ready</p>
            <p className="text-xs text-stone-400 mt-1">Available after shell approval</p>
          </div>
        )}
      </div>

      {/* Filename hint */}
      {originalUrl && (
        <p className="text-[10px] text-stone-300 mt-2 text-right truncate" title={originalUrl}>
          {activeTab === 'original' ? 'Original' : 'Enhanced'} · {roomName}
        </p>
      )}
    </div>
  )
}
