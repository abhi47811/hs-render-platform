import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Only send errors in production — don't spam with dev noise
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  // Capture unhandled promise rejections + uncaught exceptions automatically
  integrations: [],
})
