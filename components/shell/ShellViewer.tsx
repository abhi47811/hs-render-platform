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
      <div className="w-full rounded-lg border border-stone-200 bg-stone-50 p-12 text-center">
        <div className="mb-3 text-4xl text-stone-300">📷</div>
        <p className="text-sm font-medium text-stone-600">No shell photo yet</p>
        <p className="text-xs text-stone-500 mt-1">Upload a shell photo to begin</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Tab selector */}
      {originalUrl && enhancedUrl && (
        <div className="flex gap-2 mb-4 border-b border-stone-200">
          <button
            onClick={() => setActiveTab('original')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'original'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            )}
          >
            Original
          </button>
          <button
            onClick={() => setActiveTab('enhanced')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'enhanced'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            )}
          >
            Enhanced
          </button>
        </div>
      )}

      {/* Image display */}
      <div className="rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
        {activeTab === 'original' && originalUrl && (
          <img
            src={originalUrl}
            alt={`${roomName} - Original Shell`}
            className="w-full h-auto object-cover"
          />
        )}
        {activeTab === 'enhanced' && enhancedUrl && (
          <img
            src={enhancedUrl}
            alt={`${roomName} - Enhanced Shell`}
            className="w-full h-auto object-cover"
          />
        )}
        {activeTab === 'enhanced' && !enhancedUrl && (
          <div className="p-12 text-center text-stone-500">
            <p className="text-sm">Enhanced shell coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}
