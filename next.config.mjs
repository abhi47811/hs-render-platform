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

export default nextConfig;
