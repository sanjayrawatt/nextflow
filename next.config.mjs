/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for Sharp (image processing) - Next.js 14 syntax
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
