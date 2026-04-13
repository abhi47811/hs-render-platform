'use client'

import { useEffect } from 'react'

// Import the client-side Sentry configuration
import '../sentry.client.config'

export function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Optional: perform any runtime initialization here
  }, [])

  return <>{children}</>
}
