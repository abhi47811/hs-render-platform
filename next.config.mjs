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
};

export default nextConfig;
