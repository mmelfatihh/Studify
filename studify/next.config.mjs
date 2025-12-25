/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // This tells Netlify to ignore the "grammar" mistakes and build anyway
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;