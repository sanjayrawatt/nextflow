/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for Sharp (image processing) - Next.js 14 syntax
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
