import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint runs in dev — skip during Vercel builds to ship fast
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors are caught in dev — skip during builds
    ignoreBuildErrors: true,
  },
  images: {
    // Whitelist the Supabase Storage host so next/image (<Image>) can load
    // renders, shells, style-vault, and furniture-ref URLs. Without this,
    // Next.js blocks the external host and shows a broken-image placeholder.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Don't block build if Sentry upload fails (no token in CI yet)
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
